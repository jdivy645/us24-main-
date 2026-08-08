/**
 * Three-pane review workspace — 03 §7, 05 §6–§9.
 *
 * Left: source navigation and transcript. Centre: the canonical form, the
 * primary editing surface. Right: evidence, comparison, history and preview.
 */

import { useParams } from 'react-router';
import { Banner } from '@us24/ui';
import { RouteSkeleton } from '../app/shell.js';
import { CaseHeader } from '../features/case-header.js';
import { BypassDialog } from '../features/bypass-dialog.js';
import { EvidencePane, FormPane, TranscriptPane } from '../features/workspace-panes.js';
import { useCaseWorkspace } from '../features/use-case-workspace.js';

export function WorkspaceRoute(): React.JSX.Element {
  const { caseId = '' } = useParams();
  const workspace = useCaseWorkspace(caseId);
  const { registry, snapshot, transcript, revisions, documents } = workspace;

  if (registry.isLoading || snapshot.isLoading) return <RouteSkeleton title="Review workspace" />;
  if (snapshot.isError) throw snapshot.error;
  if (registry.isError) throw registry.error;

  const data = snapshot.data!;
  const registryData = registry.data!;

  return (
    <div className="page page--wide">
      <CaseHeader
        snapshot={data}
        onVerify={() => workspace.verify.mutate()}
        onGenerate={(type) => workspace.generate.mutate(type)}
        verifying={workspace.verify.isPending}
        generating={workspace.generate.isPending}
      />

      {workspace.actionError && (
        <Banner tone="danger" title="That action did not complete.">
          {workspace.actionError}
        </Banner>
      )}

      {registryData.matrixPendingClient && (
        <Banner tone="info" title="Field rules are provisional.">
          Requiredness and criticality use rule set{' '}
          <strong className="tnum">{registryData.matrixVersion}</strong>, which is awaiting client
          approval. Results are reproducible and versioned, but the matrix itself may change.
        </Banner>
      )}

      <div className="workspace">
        <TranscriptPane
          segments={transcript.data?.segments ?? []}
          highlightSegmentId={workspace.highlightSegmentId}
          onSelectSegment={(segment) => workspace.setHighlightSegmentId(segment.id)}
        />

        <FormPane
          registry={registryData}
          snapshot={data}
          onAction={workspace.handleAction}
        />

        <EvidencePane
          snapshot={data}
          registry={registryData}
          selectedFieldKey={workspace.selectedFieldKey}
          tab={workspace.evidenceTab}
          onTabChange={workspace.setEvidenceTab}
          revisions={revisions.data?.items ?? []}
          documents={documents.data?.items ?? []}
        />
      </div>

      <BypassDialog
        open={workspace.bypassField !== null}
        field={workspace.bypassField}
        currentValue={
          workspace.bypassField ? (data.currentValues[workspace.bypassField.key] ?? null) : null
        }
        onClose={() => workspace.setBypassField(null)}
        onSubmit={(reason, note) =>
          workspace.bypassField &&
          workspace.bypass.mutate({ fieldKey: workspace.bypassField.key, reason, note })
        }
        error={workspace.bypass.isError ? workspace.actionError : null}
        pending={workspace.bypass.isPending}
      />
    </div>
  );
}
