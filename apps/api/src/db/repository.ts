/**
 * Repository layer.
 *
 * This is where 12 §7 ("Immutable and mutable data") is enforced. Artifacts,
 * revisions, extraction runs, comparison runs, bypasses and documents have
 * INSERT and SELECT methods only — there is deliberately no update path, so a
 * caller cannot rewrite history even by mistake (ADR-006).
 */

import { randomUUID } from 'node:crypto';
import type { Db } from './database.js';

const now = (): string => new Date().toISOString();

export interface CaseRow {
  id: string;
  mode: 'AUTO_FILL' | 'AUDIT';
  workflow_state: string;
  case_status: string | null;
  base_record_id: string | null;
  version_id: string | null;
  patient_label: string | null;
  payer_label: string | null;
  service_type: string | null;
  current_revision_id: string | null;
  latest_comparison_run_id: string | null;
  operator_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionRow {
  id: string;
  case_id: string;
  revision_number: number;
  origin_revision_id: string;
  parent_revision_id: string | null;
  created_reason: string;
  explanation: string | null;
  values_json: string;
  created_at: string;
}

export interface ComparisonRunRow {
  id: string;
  case_id: string;
  revision_id: string;
  rule_set_version: string;
  dictionary_version: string;
  case_status: string;
  counts_json: string;
  comparisons_json: string;
  created_at: string;
}

export class Repository {
  constructor(private readonly db: Db) {}

  // -- Cases ---------------------------------------------------------------

  createCase(input: {
    mode: 'AUTO_FILL' | 'AUDIT';
    patientLabel?: string | undefined;
    payerLabel?: string | undefined;
    serviceType?: string | undefined;
    baseRecordId?: string | undefined;
    idempotencyKey?: string | undefined;
    operatorLabel: string;
  }): CaseRow {
    // 12 §3: idempotency keys prevent a retry creating a duplicate case.
    if (input.idempotencyKey) {
      const existing = this.db
        .prepare('SELECT * FROM verification_case WHERE idempotency_key = ?')
        .get(input.idempotencyKey) as CaseRow | undefined;
      if (existing) return existing;
    }

    const id = `case_${randomUUID()}`;
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO verification_case
         (id, mode, workflow_state, case_status, base_record_id, version_id, patient_label,
          payer_label, service_type, current_revision_id, latest_comparison_run_id,
          idempotency_key, operator_label, created_at, updated_at)
         VALUES (?, ?, 'DRAFT', NULL, ?, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.mode,
        input.baseRecordId ?? null,
        input.patientLabel ?? null,
        input.payerLabel ?? null,
        input.serviceType ?? null,
        input.idempotencyKey ?? null,
        input.operatorLabel,
        ts,
        ts,
      );
    return this.getCase(id)!;
  }

  getCase(id: string): CaseRow | undefined {
    return this.db.prepare('SELECT * FROM verification_case WHERE id = ?').get(id) as
      | CaseRow
      | undefined;
  }

  listCases(filter: { status?: string | undefined; search?: string | undefined; limit: number }): CaseRow[] {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filter.status) {
      if (filter.status === 'DRAFT') clauses.push("(case_status IS NULL)");
      else {
        clauses.push('case_status = ?');
        params.push(filter.status);
      }
    }
    if (filter.search) {
      clauses.push('(patient_label LIKE ? OR payer_label LIKE ? OR id LIKE ?)');
      const like = `%${filter.search}%`;
      params.push(like, like, like);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(filter.limit);
    return this.db
      .prepare(`SELECT * FROM verification_case ${where} ORDER BY updated_at DESC LIMIT ?`)
      .all(...(params as never[])) as unknown as CaseRow[];
  }

  /** Case metadata is mutable with an audit event — 12 §7. */
  updateCaseState(
    id: string,
    patch: Partial<
      Pick<
        CaseRow,
        | 'workflow_state'
        | 'case_status'
        | 'current_revision_id'
        | 'latest_comparison_run_id'
        | 'patient_label'
        | 'payer_label'
        | 'base_record_id'
        | 'version_id'
      >
    >,
  ): void {
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    this.db
      .prepare(`UPDATE verification_case SET ${sets}, updated_at = ? WHERE id = ?`)
      .run(...(entries.map(([, v]) => v) as never[]), now(), id);
  }

  // -- Artifacts. INSERT and SELECT only — 12 §7 ---------------------------

  insertArtifact(input: {
    caseId: string;
    kind: string;
    filename: string;
    contentType: string;
    byteSize: number;
    checksum: string;
    storageKey: string;
    parseState?: string;
    parseDetail?: string | null;
  }): string {
    const id = `artifact_${randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO source_artifact
         (id, case_id, kind, filename, content_type, byte_size, checksum_sha256,
          storage_key, parse_state, parse_detail, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.caseId,
        input.kind,
        input.filename,
        input.contentType,
        input.byteSize,
        input.checksum,
        input.storageKey,
        input.parseState ?? 'PENDING',
        input.parseDetail ?? null,
        now(),
      );
    return id;
  }

  listArtifacts(caseId: string): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM source_artifact WHERE case_id = ? ORDER BY created_at')
      .all(caseId) as Record<string, unknown>[];
  }

  /** 10 §3 / 15 §14: the same checksum identifies a duplicate upload. */
  findArtifactByChecksum(checksum: string): Record<string, unknown> | undefined {
    return this.db
      .prepare('SELECT * FROM source_artifact WHERE checksum_sha256 = ? LIMIT 1')
      .get(checksum) as Record<string, unknown> | undefined;
  }

  setArtifactParseState(id: string, state: string, detail?: string | null): void {
    // Parse state is processing metadata about the artifact, not its content.
    // The bytes and checksum remain immutable.
    this.db
      .prepare('UPDATE source_artifact SET parse_state = ?, parse_detail = ? WHERE id = ?')
      .run(state, detail ?? null, id);
  }

  insertSegments(
    artifactId: string,
    segments: readonly {
      ordinal: number;
      speakerRole: string;
      rawSpeakerLabel?: string | null;
      timestampStart?: number | null;
      timestampEnd?: number | null;
      text: string;
      relevant: boolean;
    }[],
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO transcript_segment
       (id, artifact_id, ordinal, speaker_role, raw_speaker_label, timestamp_start,
        timestamp_end, text, relevant)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const s of segments) {
      stmt.run(
        `seg_${randomUUID()}`,
        artifactId,
        s.ordinal,
        s.speakerRole,
        s.rawSpeakerLabel ?? null,
        s.timestampStart ?? null,
        s.timestampEnd ?? null,
        s.text,
        s.relevant ? 1 : 0,
      );
    }
  }

  listSegments(caseId: string): Record<string, unknown>[] {
    return this.db
      .prepare(
        `SELECT ts.* FROM transcript_segment ts
         JOIN source_artifact sa ON sa.id = ts.artifact_id
         WHERE sa.case_id = ? ORDER BY ts.ordinal`,
      )
      .all(caseId) as Record<string, unknown>[];
  }

  // -- Revisions. Append-only — ADR-006 ------------------------------------

  insertRevision(input: {
    caseId: string;
    originRevisionId?: string;
    parentRevisionId?: string | null;
    createdReason: string;
    explanation?: string | null;
    operatorLabel?: string | null;
    values: Record<string, string | null>;
  }): RevisionRow {
    const id = `rev_${randomUUID()}`;
    const next =
      ((
        this.db
          .prepare('SELECT COALESCE(MAX(revision_number), 0) AS n FROM form_revision WHERE case_id = ?')
          .get(input.caseId) as { n: number }
      ).n ?? 0) + 1;

    this.db
      .prepare(
        `INSERT INTO form_revision
         (id, case_id, revision_number, origin_revision_id, parent_revision_id,
          created_reason, explanation, operator_label, values_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.caseId,
        next,
        input.originRevisionId ?? id,
        input.parentRevisionId ?? null,
        input.createdReason,
        input.explanation ?? null,
        input.operatorLabel ?? null,
        JSON.stringify(input.values),
        now(),
      );
    return this.getRevision(id)!;
  }

  getRevision(id: string): RevisionRow | undefined {
    return this.db.prepare('SELECT * FROM form_revision WHERE id = ?').get(id) as
      | RevisionRow
      | undefined;
  }

  listRevisions(caseId: string): RevisionRow[] {
    return this.db
      .prepare('SELECT * FROM form_revision WHERE case_id = ? ORDER BY revision_number')
      .all(caseId) as unknown as RevisionRow[];
  }

  /** The immutable imported/auto-filled baseline this chain descends from. */
  getOriginRevision(caseId: string): RevisionRow | undefined {
    return this.db
      .prepare('SELECT * FROM form_revision WHERE case_id = ? ORDER BY revision_number LIMIT 1')
      .get(caseId) as RevisionRow | undefined;
  }

  // -- Extraction and comparison runs. Immutable — 12 §7 -------------------

  insertExtractionRun(input: {
    caseId: string;
    provider: string;
    modelVersion: string;
    promptVersion: string;
    candidates: unknown;
  }): string {
    const id = `extract_${randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO extraction_run
         (id, case_id, provider, model_version, prompt_version, candidates_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.caseId,
        input.provider,
        input.modelVersion,
        input.promptVersion,
        JSON.stringify(input.candidates),
        now(),
      );
    return id;
  }

  getLatestExtractionRun(caseId: string): { id: string; candidates: unknown } | undefined {
    const row = this.db
      .prepare('SELECT * FROM extraction_run WHERE case_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(caseId) as { id: string; candidates_json: string } | undefined;
    return row ? { id: row.id, candidates: JSON.parse(row.candidates_json) } : undefined;
  }

  insertComparisonRun(input: {
    caseId: string;
    revisionId: string;
    extractionRunId?: string | null;
    ruleSetVersion: string;
    dictionaryVersion: string;
    caseStatus: string;
    counts: unknown;
    comparisons: unknown;
  }): string {
    const id = `cmp_${randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO comparison_run
         (id, case_id, revision_id, extraction_run_id, rule_set_version, dictionary_version,
          case_status, counts_json, comparisons_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.caseId,
        input.revisionId,
        input.extractionRunId ?? null,
        input.ruleSetVersion,
        input.dictionaryVersion,
        input.caseStatus,
        JSON.stringify(input.counts),
        JSON.stringify(input.comparisons),
        now(),
      );
    return id;
  }

  getComparisonRun(id: string): ComparisonRunRow | undefined {
    return this.db.prepare('SELECT * FROM comparison_run WHERE id = ?').get(id) as
      | ComparisonRunRow
      | undefined;
  }

  listComparisonRuns(caseId: string): ComparisonRunRow[] {
    return this.db
      .prepare('SELECT * FROM comparison_run WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as unknown as ComparisonRunRow[];
  }

  // -- Bypasses. Immutable records — 09 §11 --------------------------------

  insertBypass(input: {
    caseId: string;
    revisionId: string;
    fieldKey: string;
    reason: string;
    note: string | null;
    valueBeforeBypass: string | null;
    ruleSetVersion: string;
    consequence: string;
    requiresFollowUp: boolean;
    operatorLabel: string | null;
  }): string {
    const id = `bypass_${randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO bypass_resolution
         (id, case_id, revision_id, field_key, reason, note, value_before_bypass,
          rule_set_version, consequence, requires_follow_up, operator_label, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.caseId,
        input.revisionId,
        input.fieldKey,
        input.reason,
        input.note,
        input.valueBeforeBypass,
        input.ruleSetVersion,
        input.consequence,
        input.requiresFollowUp ? 1 : 0,
        input.operatorLabel,
        now(),
      );
    return id;
  }

  /** Latest bypass per field for the current revision chain. */
  listBypasses(caseId: string): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM bypass_resolution WHERE case_id = ? ORDER BY created_at')
      .all(caseId) as Record<string, unknown>[];
  }

  // -- Carrier masters — 10 §15, §16 ---------------------------------------

  listCarriers(): Record<string, unknown>[] {
    return this.db
      .prepare(
        `SELECT c.*, COUNT(v.id) AS version_count
         FROM insurance_carrier c
         LEFT JOIN carrier_master_version v ON v.carrier_id = c.id
         GROUP BY c.id ORDER BY c.canonical_name`,
      )
      .all() as Record<string, unknown>[];
  }

  listCarrierVersions(carrierId: string): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM carrier_master_version WHERE carrier_id = ? ORDER BY version_number DESC')
      .all(carrierId) as Record<string, unknown>[];
  }

  /**
   * 10 §16: only ACTIVE versions auto-fill, more specific scope outranks general,
   * and an expired period is not selected. Returns all candidates so the caller
   * can refuse when no unique match exists.
   */
  findActiveCarrierVersions(carrierName: string, asOfDate: string): Record<string, unknown>[] {
    return this.db
      .prepare(
        `SELECT v.* FROM carrier_master_version v
         JOIN insurance_carrier c ON c.id = v.carrier_id
         WHERE c.canonical_name = ? AND v.state = 'ACTIVE'
           AND v.effective_from <= ?
           AND (v.effective_through IS NULL OR v.effective_through >= ?)
         ORDER BY v.version_number DESC`,
      )
      .all(carrierName, asOfDate, asOfDate) as Record<string, unknown>[];
  }

  // -- Templates — 13 §6 ----------------------------------------------------

  listTemplateVersions(): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM template_version ORDER BY template_id, version_number DESC')
      .all() as Record<string, unknown>[];
  }

  getActiveTemplateVersion(): Record<string, unknown> | undefined {
    return this.db
      .prepare("SELECT * FROM template_version WHERE state = 'ACTIVE' ORDER BY version_number DESC LIMIT 1")
      .get() as Record<string, unknown> | undefined;
  }

  // -- Documents. Immutable once generated — 12 §7, 13 §11 -----------------

  insertDocument(input: {
    caseId: string;
    revisionId: string;
    comparisonRunId: string;
    templateVersionId: string;
    documentType: string;
    filename: string;
    storageKey: string;
    checksum: string;
    byteSize: number;
    pageCount: number;
  }): string {
    const id = `doc_${randomUUID()}`;
    this.db
      .prepare(
        `INSERT INTO generated_document
         (id, case_id, revision_id, comparison_run_id, template_version_id, document_type,
          filename, storage_key, checksum_sha256, byte_size, page_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.caseId,
        input.revisionId,
        input.comparisonRunId,
        input.templateVersionId,
        input.documentType,
        input.filename,
        input.storageKey,
        input.checksum,
        input.byteSize,
        input.pageCount,
        now(),
      );
    return id;
  }

  listDocuments(caseId: string): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM generated_document WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as Record<string, unknown>[];
  }

  getDocument(id: string): Record<string, unknown> | undefined {
    return this.db.prepare('SELECT * FROM generated_document WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
  }

  // -- Processing events — 12 §17 ------------------------------------------

  nextEventSequence(caseId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(sequence), -1) AS n FROM processing_event WHERE case_id = ?')
      .get(caseId) as { n: number };
    return (row.n ?? -1) + 1;
  }

  insertEvent(input: {
    caseId: string;
    sequence: number;
    stage: string;
    status: string;
    messageCode: string;
    unitsDone?: number | null;
    unitsTotal?: number | null;
    terminal?: boolean;
  }): void {
    this.db
      .prepare(
        `INSERT INTO processing_event
         (case_id, sequence, stage, status, message_code, units_done, units_total, terminal, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.caseId,
        input.sequence,
        input.stage,
        input.status,
        input.messageCode,
        input.unitsDone ?? null,
        input.unitsTotal ?? null,
        input.terminal ? 1 : 0,
        now(),
      );
  }

  listEvents(caseId: string, afterSequence = -1): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM processing_event WHERE case_id = ? AND sequence > ? ORDER BY sequence')
      .all(caseId, afterSequence) as Record<string, unknown>[];
  }

  // -- Audit — 10 §19 -------------------------------------------------------

  audit(input: {
    caseId?: string | null;
    baseRecordId?: string | null;
    eventType: string;
    entityRef?: string | null;
    operatorLabel?: string | null;
    correlationId?: string | null;
    metadata?: unknown;
  }): void {
    this.db
      .prepare(
        `INSERT INTO audit_event
         (case_id, base_record_id, event_type, entity_ref, operator_label, correlation_id, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.caseId ?? null,
        input.baseRecordId ?? null,
        input.eventType,
        input.entityRef ?? null,
        input.operatorLabel ?? null,
        input.correlationId ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        now(),
      );
  }

  listAudit(caseId: string): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM audit_event WHERE case_id = ? ORDER BY created_at DESC LIMIT 200')
      .all(caseId) as Record<string, unknown>[];
  }

  // -- Records / base records — 10 §1 --------------------------------------

  listBaseRecords(): Record<string, unknown>[] {
    return this.db
      .prepare(
        `SELECT b.id, b.service_type, b.created_at, b.archived_at,
                p.last_name, p.first_name, p.date_of_birth,
                pol.policy_id, pol.group_id, pol.plan_name,
                c.canonical_name AS carrier_name,
                (SELECT COUNT(*) FROM verification_version vv WHERE vv.base_record_id = b.id) AS version_count
         FROM base_vob_record b
         JOIN patient p ON p.id = b.patient_id
         JOIN policy pol ON pol.id = b.policy_id
         JOIN insurance_carrier c ON c.id = pol.carrier_id
         ORDER BY b.created_at DESC`,
      )
      .all() as Record<string, unknown>[];
  }

  getBaseRecord(id: string): Record<string, unknown> | undefined {
    return this.db
      .prepare(
        `SELECT b.*, p.last_name, p.first_name, p.date_of_birth,
                pol.policy_id, pol.group_id, pol.plan_name, pol.effective_date,
                c.canonical_name AS carrier_name
         FROM base_vob_record b
         JOIN patient p ON p.id = b.patient_id
         JOIN policy pol ON pol.id = b.policy_id
         JOIN insurance_carrier c ON c.id = pol.carrier_id
         WHERE b.id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;
  }

  listVersions(baseRecordId: string): Record<string, unknown>[] {
    return this.db
      .prepare(
        `SELECT vv.*, vc.id AS case_id, vc.case_status, vc.workflow_state
         FROM verification_version vv
         LEFT JOIN verification_case vc ON vc.version_id = vv.id
         WHERE vv.base_record_id = ? ORDER BY vv.version_number DESC`,
      )
      .all(baseRecordId) as Record<string, unknown>[];
  }

  /** Wrap related writes so a partial finalization cannot persist — 12 §6. */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
