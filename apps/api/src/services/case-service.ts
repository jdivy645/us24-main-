/**
 * Case service and processing orchestrator — 12 §2, §10.
 *
 * 12 §10 ends with the rule this module exists to honour:
 *   "Never mark the case PASSED inside the orchestration job."
 *
 * Status comes from `calculateCaseStatus` in @us24/domain and nowhere else.
 */

import { createHash } from 'node:crypto';
import type { ExtractedCandidate, FieldComparison, RuleContext } from '@us24/domain';
import {
  FIELD_REGISTRY,
  bypassConsequence,
  buildAutoFillValues,
  documentGate,
  evaluateFreshness,
  runComparison,
  validateBypass,
} from '@us24/domain';
import type { ProcessingStage, StageStatus } from '@us24/schemas';
import { ErrorCode } from '@us24/schemas';
import type { AppConfig } from '../config.js';
import { badRequest, conflict, notFound, unprocessable } from '../errors.js';
import type { Repository } from '../db/repository.js';
import type {
  ExtractionAdapter,
  StorageAdapter,
  TranscriptSegmentDto,
} from '../adapters/index.js';
import { TextTranscriptParser } from '../adapters/index.js';
import { QueueName } from '../jobs/queue.js';
import type { JobRunner } from '../jobs/queue.js';

/** The seven stages from 03 §6 and 05 §5. */
export const STAGES: readonly ProcessingStage[] = [
  'UPLOAD',
  'VALIDATE',
  'PARSE_OR_TRANSCRIBE',
  'IDENTIFY_SPEAKERS',
  'EXTRACT_FACTS',
  'COMPARE',
  'PREPARE_WORKSPACE',
];

export interface CaseSnapshot {
  readonly case: Record<string, unknown>;
  readonly comparisons: readonly FieldComparison[];
  readonly status: ReturnType<typeof runComparison>['status'] | null;
  readonly freshness: ReturnType<typeof evaluateFreshness>;
  readonly documentGate: ReturnType<typeof documentGate> | null;
  readonly revisionId: string | null;
  readonly originValues: Record<string, string | null>;
  readonly currentValues: Record<string, string | null>;
}

export class CaseService {
  private readonly parser = new TextTranscriptParser();

  constructor(
    private readonly repo: Repository,
    private readonly config: AppConfig,
    private readonly extraction: ExtractionAdapter,
    private readonly jobs: JobRunner,
    private readonly storage: StorageAdapter,
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Each stage is its own job so a single failure retries in isolation
    // without discarding successful work — 12 §9.
    this.jobs.register(QueueName.DOCUMENT_PARSE, async (payload: unknown) => {
      const { caseId } = payload as { caseId: string };
      await this.parseTranscripts(caseId);
    });
    this.jobs.register(QueueName.FACT_EXTRACT, async (payload: unknown) => {
      const { caseId } = payload as { caseId: string };
      await this.extractFacts(caseId);
    });
    this.jobs.register(QueueName.FIELD_COMPARE, async (payload: unknown) => {
      const { caseId } = payload as { caseId: string };
      this.verify(caseId);
    });
  }

  // -- Events — 12 §17 -----------------------------------------------------

  emit(
    caseId: string,
    stage: ProcessingStage,
    status: StageStatus,
    messageCode: string,
    units?: { done: number; total: number },
    terminal = false,
  ): void {
    // 12 §17: "Persist processing state before broadcasting."
    this.repo.insertEvent({
      caseId,
      sequence: this.repo.nextEventSequence(caseId),
      stage,
      status,
      messageCode,
      unitsDone: units?.done ?? null,
      unitsTotal: units?.total ?? null,
      terminal,
    });
  }

  // -- Sources -------------------------------------------------------------

  async attachPastedTranscript(caseId: string, text: string, label: string): Promise<string> {
    const caseRow = this.requireCase(caseId);
    const bytes = Buffer.from(text, 'utf8');
    const checksum = createHash('sha256').update(bytes).digest('hex');

    // 10 §3 / 15 §14: the same bytes in a different case is a duplicate signal,
    // surfaced rather than silently accepted.
    const duplicate = this.repo.findArtifactByChecksum(checksum);

    // The artifact bytes go to private storage, never into the relational row —
    // 12 §6 "Large files belong in object storage rather than database blobs".
    const storageKey = `cases/${caseRow.id}/${checksum}.txt`;
    await this.storage.put(storageKey, bytes);

    const artifactId = this.repo.insertArtifact({
      caseId: caseRow.id,
      kind: 'TRANSCRIPT',
      filename: label,
      contentType: 'text/plain',
      byteSize: bytes.byteLength,
      checksum,
      storageKey,
      parseState: 'PENDING',
      parseDetail: duplicate ? `Duplicate of artifact ${String(duplicate['id'])}` : null,
    });

    this.repo.audit({
      caseId,
      eventType: 'SOURCE_ATTACHED',
      entityRef: artifactId,
      operatorLabel: this.config.operatorLabel,
      metadata: { kind: 'TRANSCRIPT', bytes: bytes.byteLength },
    });
    this.emit(caseId, 'UPLOAD', 'COMPLETE', 'SOURCE_ATTACHED');
    return artifactId;
  }

  private async parseTranscripts(caseId: string): Promise<void> {
    this.emit(caseId, 'PARSE_OR_TRANSCRIBE', 'ACTIVE', 'PARSING_TRANSCRIPT');
    const artifacts = this.repo.listArtifacts(caseId);
    let total = 0;

    for (const artifact of artifacts) {
      if (artifact['kind'] !== 'TRANSCRIPT') continue;
      if (artifact['parse_state'] === 'PARSED') continue;

      const id = String(artifact['id']);
      try {
        const bytes = await this.storage.get(String(artifact['storage_key']));
        const segments = this.parser.parse(bytes.toString('utf8'));
        if (segments.length > 0) this.repo.insertSegments(id, segments);
        this.repo.setArtifactParseState(id, 'PARSED', `${segments.length} segments`);
        total += segments.length;
      } catch {
        // 03 §6: explain whether the failure is recoverable rather than hiding it.
        // Other artifacts keep processing — one bad file must not hide good ones.
        this.repo.setArtifactParseState(id, 'FAILED', 'Source could not be read from storage.');
        this.emit(caseId, 'PARSE_OR_TRANSCRIBE', 'WARNING', 'ARTIFACT_PARSE_FAILED');
      }
    }

    this.emit(caseId, 'PARSE_OR_TRANSCRIBE', 'COMPLETE', 'TRANSCRIPT_PARSED', {
      done: total,
      total,
    });
    this.emit(caseId, 'IDENTIFY_SPEAKERS', 'COMPLETE', 'SPEAKERS_CLASSIFIED');
  }

  private async extractFacts(caseId: string): Promise<void> {
    this.emit(caseId, 'EXTRACT_FACTS', 'ACTIVE', 'EXTRACTION_STARTED');

    const segments = this.repo.listSegments(caseId).map(
      (s): TranscriptSegmentDto => ({
        ordinal: Number(s['ordinal']),
        speakerRole: String(s['speaker_role']) as TranscriptSegmentDto['speakerRole'],
        rawSpeakerLabel: (s['raw_speaker_label'] as string | null) ?? null,
        timestampStart: (s['timestamp_start'] as number | null) ?? null,
        timestampEnd: (s['timestamp_end'] as number | null) ?? null,
        text: String(s['text']),
        relevant: Number(s['relevant']) === 1,
      }),
    );

    // 00 §4 / 12 §10: irrelevant talk is excluded from extraction context while
    // the original transcript and timestamps remain intact for audit.
    const relevant = segments.filter((s) => s.relevant);
    const candidates = await this.extraction.extract({ caseId, segments: relevant });

    this.repo.insertExtractionRun({
      caseId,
      provider: this.extraction.name,
      modelVersion: this.extraction.modelVersion,
      promptVersion: this.extraction.promptVersion,
      candidates,
    });

    this.emit(caseId, 'EXTRACT_FACTS', this.extraction.available ? 'COMPLETE' : 'WARNING',
      this.extraction.available ? 'EXTRACTION_COMPLETE' : 'EXTRACTION_PROVIDER_UNAVAILABLE',
      { done: candidates.length, total: candidates.length });
  }

  // -- Processing ----------------------------------------------------------

  async startProcessing(caseId: string): Promise<void> {
    const caseRow = this.requireCase(caseId);
    this.jobs.resetGroup(caseId);
    this.repo.updateCaseState(caseId, { workflow_state: 'PROCESSING' });
    this.emit(caseId, 'VALIDATE', 'COMPLETE', 'SOURCES_VALIDATED');

    await this.jobs.run(
      QueueName.DOCUMENT_PARSE,
      { caseId },
      { idempotencyKey: `${caseId}:parse`, groupId: caseId },
    );
    if (this.jobs.isCancelled(caseId)) return this.markCancelled(caseId);

    await this.jobs.run(
      QueueName.FACT_EXTRACT,
      { caseId },
      { idempotencyKey: `${caseId}:extract`, groupId: caseId },
    );
    if (this.jobs.isCancelled(caseId)) return this.markCancelled(caseId);

    // Auto-fill mode builds the first revision from supported candidates only.
    if (caseRow.mode === 'AUTO_FILL' && !caseRow.current_revision_id) {
      const extraction = this.repo.getLatestExtractionRun(caseId);
      const byField = groupCandidates((extraction?.candidates ?? []) as ExtractedCandidate[]);
      const values = buildAutoFillValues(FIELD_REGISTRY, byField, this.ruleContext(caseRow));
      const revision = this.repo.insertRevision({
        caseId,
        createdReason: 'AUTO_FILLED',
        operatorLabel: this.config.operatorLabel,
        values,
      });
      this.repo.updateCaseState(caseId, { current_revision_id: revision.id });
    }

    await this.jobs.run(
      QueueName.FIELD_COMPARE,
      { caseId },
      { idempotencyKey: `${caseId}:compare:${this.repo.getCase(caseId)?.current_revision_id}`, groupId: caseId },
    );

    this.repo.updateCaseState(caseId, { workflow_state: 'READY' });
    this.emit(caseId, 'PREPARE_WORKSPACE', 'COMPLETE', 'WORKSPACE_READY', undefined, true);
  }

  cancelProcessing(caseId: string): void {
    this.jobs.cancelGroup(caseId);
    this.markCancelled(caseId);
  }

  private markCancelled(caseId: string): void {
    this.repo.updateCaseState(caseId, { workflow_state: 'DRAFT' });
    // 05 §17: the cancel dialog explains which completed artifacts are retained.
    this.emit(caseId, 'PREPARE_WORKSPACE', 'SKIPPED', 'PROCESSING_CANCELLED', undefined, true);
    this.repo.audit({
      caseId,
      eventType: 'PROCESSING_CANCELLED',
      operatorLabel: this.config.operatorLabel,
    });
  }

  /** 12 §9: retry only the failed stage; successful stages are not re-run. */
  async retryStage(caseId: string, stage: ProcessingStage): Promise<void> {
    this.jobs.resetGroup(caseId);
    if (stage === 'PARSE_OR_TRANSCRIBE') this.jobs.clearCompleted(`${caseId}:parse`);
    if (stage === 'EXTRACT_FACTS') this.jobs.clearCompleted(`${caseId}:extract`);
    if (stage === 'COMPARE') this.jobs.clearCompleted(`${caseId}:compare`);
    await this.startProcessing(caseId);
  }

  // -- Verification — the deterministic core -------------------------------

  ruleContext(caseRow: { mode: string; service_type: string | null }): RuleContext {
    return {
      mode: caseRow.mode === 'AUTO_FILL' ? 'AUTO_FILL' : 'AUDIT',
      serviceType: caseRow.service_type,
      isRepeatVerification: false,
      hasTranscriptSource: true,
      hasCompletedFormSource: caseRow.mode === 'AUDIT',
    };
  }

  /**
   * Run the deterministic comparison and persist it.
   *
   * 12 §10 forbids the orchestrator marking a case PASSED. It does not: the
   * status written below is whatever `runComparison` returned.
   */
  verify(caseId: string): { comparisonRunId: string; status: string } {
    const caseRow = this.requireCase(caseId);
    const revisionId = caseRow.current_revision_id;
    if (!revisionId) {
      throw unprocessable(ErrorCode.REVISION_NOT_FOUND, 'This case has no form revision to verify.');
    }
    const revision = this.repo.getRevision(revisionId);
    if (!revision) throw notFound(ErrorCode.REVISION_NOT_FOUND, 'Revision not found.');

    const extraction = this.repo.getLatestExtractionRun(caseId);
    const candidatesByField = groupCandidates(
      (extraction?.candidates ?? []) as ExtractedCandidate[],
    );

    const bypasses = this.currentBypasses(caseId);

    const run = runComparison({
      registry: FIELD_REGISTRY,
      formValues: JSON.parse(revision.values_json) as Record<string, string | null>,
      candidatesByField,
      bypasses,
      context: this.ruleContext(caseRow),
      revisionId,
      evaluatedAt: new Date().toISOString(),
      hasConfiguredExceptionAuthority: this.config.hasConfiguredExceptionAuthority,
    });

    const comparisonRunId = this.repo.transaction(() => {
      const id = this.repo.insertComparisonRun({
        caseId,
        revisionId,
        extractionRunId: extraction?.id ?? null,
        ruleSetVersion: run.ruleSetVersion,
        dictionaryVersion: run.dictionaryVersion,
        caseStatus: run.status.status,
        counts: run.status.counts,
        comparisons: run.comparisons,
      });
      this.repo.updateCaseState(caseId, {
        latest_comparison_run_id: id,
        case_status: run.status.status,
        workflow_state: 'READY',
      });
      return id;
    });

    this.repo.audit({
      caseId,
      eventType: 'COMPARISON_RUN',
      entityRef: comparisonRunId,
      operatorLabel: this.config.operatorLabel,
      metadata: { status: run.status.status, ruleSetVersion: run.ruleSetVersion },
    });
    this.emit(caseId, 'COMPARE', 'COMPLETE', 'COMPARISON_COMPLETE');

    return { comparisonRunId, status: run.status.status };
  }

  /** Latest bypass per field, shaped for the comparison engine. */
  private currentBypasses(caseId: string): Record<string, never> {
    const rows = this.repo.listBypasses(caseId);
    const byField: Record<string, unknown> = {};
    for (const row of rows) {
      byField[String(row['field_key'])] = {
        bypassId: String(row['id']),
        caseId,
        versionId: '',
        revisionId: String(row['revision_id']),
        fieldKey: String(row['field_key']),
        reason: String(row['reason']),
        note: (row['note'] as string | null) ?? null,
        createdAt: String(row['created_at']),
        operatorLabel: (row['operator_label'] as string | null) ?? null,
        valueBeforeBypass: (row['value_before_bypass'] as string | null) ?? null,
        evidence: null,
        ruleSetVersion: String(row['rule_set_version']),
        consequence: String(row['consequence']),
        requiresFollowUp: Number(row['requires_follow_up']) === 1,
      };
    }
    return byField as Record<string, never>;
  }

  // -- Revisions — ADR-006 -------------------------------------------------

  createRevision(
    caseId: string,
    input: {
      baseRevisionId: string;
      changes: Record<string, string | null>;
      reason: string;
      explanation?: string | undefined;
    },
  ): { revisionId: string } {
    const caseRow = this.requireCase(caseId);
    const base = this.repo.getRevision(input.baseRevisionId);
    if (!base) throw notFound(ErrorCode.REVISION_NOT_FOUND, 'Base revision not found.');

    // 12 §3: optimistic concurrency. Editing anything other than the current
    // revision means someone else moved first.
    if (caseRow.current_revision_id !== input.baseRevisionId) {
      throw conflict(
        ErrorCode.REVISION_CONFLICT,
        'This form changed since you loaded it. Reload to see the latest values before saving.',
      );
    }

    for (const key of Object.keys(input.changes)) {
      if (!FIELD_REGISTRY.find(key)) {
        throw badRequest(ErrorCode.UNKNOWN_FIELD, `Unknown canonical field: ${key}`);
      }
    }

    const values = {
      ...(JSON.parse(base.values_json) as Record<string, string | null>),
      ...input.changes,
    };

    const revision = this.repo.insertRevision({
      caseId,
      originRevisionId: base.origin_revision_id,
      parentRevisionId: base.id,
      createdReason: input.reason,
      explanation: input.explanation ?? null,
      operatorLabel: this.config.operatorLabel,
      values,
    });

    this.repo.updateCaseState(caseId, { current_revision_id: revision.id });
    this.repo.audit({
      caseId,
      eventType: 'FORM_REVISION_CREATED',
      entityRef: revision.id,
      operatorLabel: this.config.operatorLabel,
      metadata: { reason: input.reason, fields: Object.keys(input.changes) },
    });

    // 09 §15 / 11 §15: a draft save does not refresh the comparison. The result
    // stays attached to the revision it was computed against, so the header can
    // show "Changes not verified" until Verify runs again.
    return { revisionId: revision.id };
  }

  // -- Bypass — 09 §10, §11 ------------------------------------------------

  recordBypass(
    caseId: string,
    fieldKey: string,
    input: { revisionId: string; reason: string; note?: string | null },
  ): { bypassId: string } {
    const caseRow = this.requireCase(caseId);
    const definition = FIELD_REGISTRY.find(fieldKey);
    if (!definition) throw badRequest(ErrorCode.UNKNOWN_FIELD, `Unknown canonical field: ${fieldKey}`);

    const validation = validateBypass(
      definition.bypassPolicy,
      input.reason as never,
      input.note ?? null,
    );
    if (!validation.valid) {
      const first = validation.errors[0]!;
      throw badRequest(
        first.code === 'NOTE_REQUIRED' ? ErrorCode.NOTE_REQUIRED : ErrorCode.BYPASS_NOT_PERMITTED,
        first.message,
        validation.errors.map((e) => ({ path: fieldKey, message: e.message })),
      );
    }

    const revision = this.repo.getRevision(input.revisionId);
    const values = revision
      ? (JSON.parse(revision.values_json) as Record<string, string | null>)
      : {};

    const consequence = bypassConsequence(input.reason as never, {
      isCritical: true,
      isMasterEligible: definition.allowedSources.includes('CARRIER_MASTER'),
      hasMatchingMasterScope: false,
      isSourceSystemEligible: definition.allowedSources.includes('PREFILLED_PATIENT_RECORD'),
      hasConfiguredExceptionAuthority: this.config.hasConfiguredExceptionAuthority,
    });

    const bypassId = this.repo.insertBypass({
      caseId,
      revisionId: input.revisionId,
      fieldKey,
      reason: input.reason,
      note: input.note ?? null,
      valueBeforeBypass: values[fieldKey] ?? null,
      ruleSetVersion: FIELD_REGISTRY.matrixVersion,
      consequence: consequence.severity,
      requiresFollowUp: consequence.requiresFollowUp,
      operatorLabel: this.config.operatorLabel,
    });

    this.repo.audit({
      caseId,
      eventType: 'BYPASS_RECORDED',
      entityRef: bypassId,
      operatorLabel: this.config.operatorLabel,
      metadata: { fieldKey, reason: input.reason, consequence: consequence.severity },
    });

    void caseRow;
    return { bypassId };
  }

  // -- Snapshot for the workspace ------------------------------------------

  snapshot(caseId: string): CaseSnapshot {
    const caseRow = this.requireCase(caseId);
    const latest = caseRow.latest_comparison_run_id
      ? this.repo.getComparisonRun(caseRow.latest_comparison_run_id)
      : undefined;

    const current = caseRow.current_revision_id
      ? this.repo.getRevision(caseRow.current_revision_id)
      : undefined;
    const origin = this.repo.getOriginRevision(caseId);

    const comparisons = latest
      ? (JSON.parse(latest.comparisons_json) as FieldComparison[])
      : [];

    const freshness = evaluateFreshness({
      comparedRevisionId: latest?.revision_id ?? null,
      currentRevisionId: caseRow.current_revision_id ?? 'none',
      comparedRuleSetVersion: latest?.rule_set_version ?? null,
      currentRuleSetVersion: FIELD_REGISTRY.matrixVersion,
    });

    const status = latest
      ? {
          status: latest.case_status as never,
          incomplete: false,
          counts: JSON.parse(latest.counts_json) as never,
          reasons: comparisons
            .filter((c) => c.severity === 'FAILURE' || c.severity === 'REVIEW')
            .map((c) => ({
              fieldKey: c.fieldKey,
              outcome: c.outcome,
              severity: c.severity,
              isCritical: c.isCritical,
              message: c.message,
              ruleCode: c.ruleCode,
            })) as never,
          ruleSetVersion: latest.rule_set_version,
          dictionaryVersion: latest.dictionary_version,
          revisionId: latest.revision_id,
          evaluatedAt: latest.created_at,
        }
      : null;

    return {
      case: caseRow as unknown as Record<string, unknown>,
      comparisons,
      status,
      freshness,
      documentGate: status ? documentGate(status, freshness.isStale) : null,
      revisionId: caseRow.current_revision_id,
      originValues: origin ? (JSON.parse(origin.values_json) as Record<string, string | null>) : {},
      currentValues: current ? (JSON.parse(current.values_json) as Record<string, string | null>) : {},
    };
  }

  requireCase(caseId: string) {
    const caseRow = this.repo.getCase(caseId);
    if (!caseRow) throw notFound(ErrorCode.CASE_NOT_FOUND, 'That verification case does not exist.');
    return caseRow;
  }
}

function groupCandidates(
  candidates: readonly ExtractedCandidate[],
): Record<string, readonly ExtractedCandidate[]> {
  const byField: Record<string, ExtractedCandidate[]> = {};
  for (const candidate of candidates) {
    (byField[candidate.fieldKey] ??= []).push(candidate);
  }
  return byField;
}

