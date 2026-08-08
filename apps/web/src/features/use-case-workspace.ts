/**
 * Workspace state and mutations.
 *
 * 11 §6: TanStack Query owns server state; a small local reducer owns pane
 * selection and view preferences. 11 §15: a draft save does NOT refresh the
 * comparison — only a deliberate Verify creates a new comparison snapshot.
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FieldAction } from '@us24/ui';
import { api, queryKeys, ApiError, type CaseSnapshotDto, type RegistryFieldDto } from '../lib/api.js';
import { useAnnouncer } from '../app/announcer.js';
import type { EvidenceTab } from './workspace-panes.js';

export function useCaseWorkspace(caseId: string) {
  const queryClient = useQueryClient();
  const { announce } = useAnnouncer();

  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [evidenceTab, setEvidenceTab] = useState<EvidenceTab>('EVIDENCE');
  const [bypassField, setBypassField] = useState<RegistryFieldDto | null>(null);
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const registry = useQuery({ queryKey: queryKeys.registry, queryFn: api.registry, staleTime: 300_000 });
  const snapshot = useQuery({ queryKey: queryKeys.case(caseId), queryFn: () => api.getCase(caseId) });
  const transcript = useQuery({
    queryKey: queryKeys.transcript(caseId),
    queryFn: () => api.transcript(caseId),
    // 11 §7: transcript segments are immutable for a given artifact set.
    staleTime: 600_000,
  });
  const revisions = useQuery({
    queryKey: queryKeys.revisions(caseId),
    queryFn: () => api.listRevisions(caseId),
  });
  const documents = useQuery({
    queryKey: queryKeys.documents(caseId),
    queryFn: () => api.listDocuments(caseId),
  });

  const invalidateCase = useCallback(() => {
    // 11 §7: invalidate narrowly.
    void queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.revisions(caseId) });
  }, [queryClient, caseId]);

  const saveEdit = useMutation({
    mutationFn: (input: { fieldKey: string; value: string | null; reason: 'MANUAL_EDIT' | 'APPLY_SUPPORTED_VALUE' }) => {
      const revisionId = snapshot.data?.revisionId;
      if (!revisionId) throw new Error('This case has no revision to edit.');
      return api.createRevision(caseId, {
        baseRevisionId: revisionId,
        changes: { [input.fieldKey]: input.value },
        reason: input.reason,
      });
    },
    onSuccess: (_result, input) => {
      invalidateCase();
      setActionError(null);
      announce(
        input.reason === 'APPLY_SUPPORTED_VALUE'
          ? 'Supported value applied. Changes are not verified until you run Verify.'
          : 'Saved. Changes are not verified until you run Verify.',
      );
    },
    onError: (error) => setActionError(describeError(error)),
  });

  const verify = useMutation({
    mutationFn: () => {
      const revisionId = snapshot.data?.revisionId;
      if (!revisionId) throw new Error('This case has no revision to verify.');
      return api.verify(caseId, revisionId);
    },
    onSuccess: (result) => {
      invalidateCase();
      setActionError(null);
      // 09 §18: announce the overall result and the issue count.
      const unresolved = result.status?.counts.unresolved ?? 0;
      announce(
        `Verification complete. Result ${result.status?.status.replace('_', ' ').toLowerCase() ?? 'unknown'}, ${unresolved} item${unresolved === 1 ? '' : 's'} to resolve.`,
      );
    },
    onError: (error) => setActionError(describeError(error)),
  });

  const bypass = useMutation({
    mutationFn: (input: { fieldKey: string; reason: string; note: string | null }) => {
      const revisionId = snapshot.data?.revisionId;
      if (!revisionId) throw new Error('This case has no revision.');
      return api.bypass(caseId, input.fieldKey, {
        revisionId,
        reason: input.reason,
        note: input.note,
      });
    },
    onSuccess: () => {
      invalidateCase();
      setBypassField(null);
      setActionError(null);
      announce('Bypass recorded with its reason and consequence.');
    },
    onError: (error) => setActionError(describeError(error)),
  });

  const generate = useMutation({
    mutationFn: (documentType: string) => {
      const revisionId = snapshot.data?.revisionId;
      const comparisonRunId = snapshot.data?.case.latest_comparison_run_id;
      if (!revisionId || !comparisonRunId) throw new Error('Verify this revision first.');
      return api.finalize(caseId, {
        revisionId,
        comparisonRunId,
        documentType,
        templateVersionId: 'tpl_interim_v1',
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents(caseId) });
      setActionError(null);
      announce(`Document generated: ${result.filename}`);
    },
    onError: (error) => setActionError(describeError(error)),
  });

  const findField = useCallback(
    (fieldKey: string): RegistryFieldDto | null =>
      registry.data?.sections
        .flatMap((s) => s.groups.flatMap((g) => g.fields))
        .find((f) => f.key === fieldKey) ?? null,
    [registry.data],
  );

  /** 11 §10: FieldBlock emits typed actions; this is where they are executed. */
  const handleAction = useCallback(
    (action: FieldAction) => {
      setSelectedFieldKey(action.fieldKey);
      switch (action.type) {
        case 'EDIT':
          saveEdit.mutate({ fieldKey: action.fieldKey, value: action.value, reason: 'MANUAL_EDIT' });
          break;
        case 'APPLY_SUPPORTED_VALUE':
          saveEdit.mutate({
            fieldKey: action.fieldKey,
            value: action.value,
            reason: 'APPLY_SUPPORTED_VALUE',
          });
          break;
        case 'BYPASS_WITH_REASON':
          setBypassField(findField(action.fieldKey));
          break;
        case 'VIEW_EVIDENCE':
          // 03 §9: "View evidence opens the right pane and highlights the source."
          setEvidenceTab('EVIDENCE');
          break;
        case 'REVIEW_CONFLICT':
          setEvidenceTab('EVIDENCE');
          break;
        case 'REVERT':
          saveEdit.mutate({ fieldKey: action.fieldKey, value: null, reason: 'MANUAL_EDIT' });
          break;
        default:
          break;
      }
    },
    [saveEdit, findField],
  );

  /**
   * 03 §9 / 09 §18: keyboard users move to the next unresolved field, and focus
   * lands on the input itself rather than a detached issue card.
   */
  const focusIssue = useCallback(
    (direction: 'first' | 'next') => {
      const data = snapshot.data;
      if (!data) return;
      const unresolved = data.comparisons.filter(
        (c) => c.isVisible && (c.severity === 'FAILURE' || c.severity === 'REVIEW'),
      );
      if (unresolved.length === 0) return;

      const currentIndex = unresolved.findIndex((c) => c.fieldKey === selectedFieldKey);
      const target =
        direction === 'first' || currentIndex === -1
          ? unresolved[0]
          : unresolved[(currentIndex + 1) % unresolved.length];
      if (!target) return;

      setSelectedFieldKey(target.fieldKey);
      const id = `field-${target.fieldKey.replace(/\./g, '-')}`;
      const element = document.getElementById(id);
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (element as HTMLElement | null)?.focus?.();
    },
    [snapshot.data, selectedFieldKey],
  );

  return {
    registry,
    snapshot,
    transcript,
    revisions,
    documents,
    selectedFieldKey,
    setSelectedFieldKey,
    evidenceTab,
    setEvidenceTab,
    bypassField,
    setBypassField,
    highlightSegmentId,
    setHighlightSegmentId,
    actionError,
    handleAction,
    focusIssue,
    verify,
    bypass,
    generate,
    saveEdit,
  };
}

export type CaseWorkspace = ReturnType<typeof useCaseWorkspace>;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.correlationId !== 'unknown'
      ? `${error.message} (reference ${error.correlationId})`
      : error.message;
  }
  return error instanceof Error ? error.message : 'The action could not be completed.';
}

export type { CaseSnapshotDto };
