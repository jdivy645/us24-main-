/**
 * Repository layer.
 *
 * This is where 12 §7 ("Immutable and mutable data") is enforced. Artifacts,
 * revisions, extraction runs, comparison runs, bypasses and documents have
 * INSERT and SELECT methods only — there is deliberately no update path, so a
 * caller cannot rewrite history even by mistake (ADR-006).
 *
 * Every query goes through the private `one`/`many`/`run` helpers rather than
 * casting a `node:sqlite` row inline. Inline casts compiled locally and were
 * rejected by CI on a different resolved @types/node version — see ADR-018 in
 * DECISION_LOG_ADDENDUM.md. Routing the widening through one documented place
 * makes the behaviour identical under every version.
 */

import { randomUUID } from 'node:crypto';
import type { Db, SqlParam } from './database.js';
import { execute, queryAll, queryOne } from './database.js';

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

/** Rows read from queries whose shape is consumed dynamically by the API layer. */
export type Row = Record<string, unknown>;

export class Repository {
  constructor(private readonly db: Db) {}

  // -- Query helpers -------------------------------------------------------
  //
  // Thin delegates so call sites read as `this.one<CaseRow>(sql, id)`. The
  // widening itself lives in database.ts and is documented there — it exists in
  // exactly one place so no version of @types/node can change its behaviour.

  private one<T>(sql: string, ...params: readonly SqlParam[]): T | undefined {
    return queryOne<T>(this.db, sql, ...params);
  }

  private many<T>(sql: string, ...params: readonly SqlParam[]): T[] {
    return queryAll<T>(this.db, sql, ...params);
  }

  private run(sql: string, ...params: readonly SqlParam[]): void {
    execute(this.db, sql, ...params);
  }

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
      const existing = this.one<CaseRow>(
        'SELECT * FROM verification_case WHERE idempotency_key = ?',
        input.idempotencyKey,
      );
      if (existing) return existing;
    }

    const id = `case_${randomUUID()}`;
    const ts = now();
    this.run(
      `INSERT INTO verification_case
         (id, mode, workflow_state, case_status, base_record_id, version_id, patient_label,
          payer_label, service_type, current_revision_id, latest_comparison_run_id,
          idempotency_key, operator_label, created_at, updated_at)
       VALUES (?, ?, 'DRAFT', NULL, ?, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
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
    return this.one<CaseRow>('SELECT * FROM verification_case WHERE id = ?', id);
  }

  listCases(filter: {
    status?: string | undefined;
    search?: string | undefined;
    limit: number;
  }): CaseRow[] {
    const clauses: string[] = [];
    const params: SqlParam[] = [];

    if (filter.status) {
      if (filter.status === 'DRAFT') clauses.push('(case_status IS NULL)');
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

    return this.many<CaseRow>(
      `SELECT * FROM verification_case ${where} ORDER BY updated_at DESC LIMIT ?`,
      ...params,
    );
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
    // Every field in the Pick above is `string | null`, so the guard narrows the
    // values to bindable parameters without a cast.
    const entries = Object.entries(patch).filter(
      (entry): entry is [string, string | null] => entry[1] !== undefined,
    );
    if (entries.length === 0) return;
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    this.run(
      `UPDATE verification_case SET ${sets}, updated_at = ? WHERE id = ?`,
      ...entries.map(([, v]) => v),
      now(),
      id,
    );
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
    this.run(
      `INSERT INTO source_artifact
         (id, case_id, kind, filename, content_type, byte_size, checksum_sha256,
          storage_key, parse_state, parse_detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  listArtifacts(caseId: string): Row[] {
    return this.many<Row>(
      'SELECT * FROM source_artifact WHERE case_id = ? ORDER BY created_at',
      caseId,
    );
  }

  /** 10 §3 / 15 §14: the same checksum identifies a duplicate upload. */
  findArtifactByChecksum(checksum: string): Row | undefined {
    return this.one<Row>(
      'SELECT * FROM source_artifact WHERE checksum_sha256 = ? LIMIT 1',
      checksum,
    );
  }

  setArtifactParseState(id: string, state: string, detail?: string | null): void {
    // Parse state is processing metadata about the artifact, not its content.
    // The bytes and checksum remain immutable.
    this.run(
      'UPDATE source_artifact SET parse_state = ?, parse_detail = ? WHERE id = ?',
      state,
      detail ?? null,
      id,
    );
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
    // Prepared once and reused — a long call can produce thousands of segments.
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

  listSegments(caseId: string): Row[] {
    return this.many<Row>(
      `SELECT ts.* FROM transcript_segment ts
       JOIN source_artifact sa ON sa.id = ts.artifact_id
       WHERE sa.case_id = ? ORDER BY ts.ordinal`,
      caseId,
    );
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
    const highest = this.one<{ n: number }>(
      'SELECT COALESCE(MAX(revision_number), 0) AS n FROM form_revision WHERE case_id = ?',
      input.caseId,
    );
    const next = (highest?.n ?? 0) + 1;

    this.run(
      `INSERT INTO form_revision
         (id, case_id, revision_number, origin_revision_id, parent_revision_id,
          created_reason, explanation, operator_label, values_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    return this.one<RevisionRow>('SELECT * FROM form_revision WHERE id = ?', id);
  }

  listRevisions(caseId: string): RevisionRow[] {
    return this.many<RevisionRow>(
      'SELECT * FROM form_revision WHERE case_id = ? ORDER BY revision_number',
      caseId,
    );
  }

  /** The immutable imported/auto-filled baseline this chain descends from. */
  getOriginRevision(caseId: string): RevisionRow | undefined {
    return this.one<RevisionRow>(
      'SELECT * FROM form_revision WHERE case_id = ? ORDER BY revision_number LIMIT 1',
      caseId,
    );
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
    this.run(
      `INSERT INTO extraction_run
         (id, case_id, provider, model_version, prompt_version, candidates_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    const row = this.one<{ id: string; candidates_json: string }>(
      'SELECT * FROM extraction_run WHERE case_id = ? ORDER BY created_at DESC LIMIT 1',
      caseId,
    );
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
    this.run(
      `INSERT INTO comparison_run
         (id, case_id, revision_id, extraction_run_id, rule_set_version, dictionary_version,
          case_status, counts_json, comparisons_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    return this.one<ComparisonRunRow>('SELECT * FROM comparison_run WHERE id = ?', id);
  }

  listComparisonRuns(caseId: string): ComparisonRunRow[] {
    return this.many<ComparisonRunRow>(
      'SELECT * FROM comparison_run WHERE case_id = ? ORDER BY created_at DESC',
      caseId,
    );
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
    this.run(
      `INSERT INTO bypass_resolution
         (id, case_id, revision_id, field_key, reason, note, value_before_bypass,
          rule_set_version, consequence, requires_follow_up, operator_label, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  listBypasses(caseId: string): Row[] {
    return this.many<Row>(
      'SELECT * FROM bypass_resolution WHERE case_id = ? ORDER BY created_at',
      caseId,
    );
  }

  // -- Carrier masters — 10 §15, §16 ---------------------------------------

  listCarriers(): Row[] {
    return this.many<Row>(
      `SELECT c.*, COUNT(v.id) AS version_count
       FROM insurance_carrier c
       LEFT JOIN carrier_master_version v ON v.carrier_id = c.id
       GROUP BY c.id ORDER BY c.canonical_name`,
    );
  }

  listCarrierVersions(carrierId: string): Row[] {
    return this.many<Row>(
      'SELECT * FROM carrier_master_version WHERE carrier_id = ? ORDER BY version_number DESC',
      carrierId,
    );
  }

  /**
   * 10 §16: only ACTIVE versions auto-fill, more specific scope outranks general,
   * and an expired period is not selected. Returns all candidates so the caller
   * can refuse when no unique match exists.
   */
  findActiveCarrierVersions(carrierName: string, asOfDate: string): Row[] {
    return this.many<Row>(
      `SELECT v.* FROM carrier_master_version v
       JOIN insurance_carrier c ON c.id = v.carrier_id
       WHERE c.canonical_name = ? AND v.state = 'ACTIVE'
         AND v.effective_from <= ?
         AND (v.effective_through IS NULL OR v.effective_through >= ?)
       ORDER BY v.version_number DESC`,
      carrierName,
      asOfDate,
      asOfDate,
    );
  }

  // -- Templates — 13 §6 ----------------------------------------------------

  listTemplateVersions(): Row[] {
    return this.many<Row>(
      'SELECT * FROM template_version ORDER BY template_id, version_number DESC',
    );
  }

  getActiveTemplateVersion(): Row | undefined {
    return this.one<Row>(
      "SELECT * FROM template_version WHERE state = 'ACTIVE' ORDER BY version_number DESC LIMIT 1",
    );
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
    this.run(
      `INSERT INTO generated_document
         (id, case_id, revision_id, comparison_run_id, template_version_id, document_type,
          filename, storage_key, checksum_sha256, byte_size, page_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  listDocuments(caseId: string): Row[] {
    return this.many<Row>(
      'SELECT * FROM generated_document WHERE case_id = ? ORDER BY created_at DESC',
      caseId,
    );
  }

  getDocument(id: string): Row | undefined {
    return this.one<Row>('SELECT * FROM generated_document WHERE id = ?', id);
  }

  // -- Processing events — 12 §17 ------------------------------------------

  nextEventSequence(caseId: string): number {
    const row = this.one<{ n: number }>(
      'SELECT COALESCE(MAX(sequence), -1) AS n FROM processing_event WHERE case_id = ?',
      caseId,
    );
    return (row?.n ?? -1) + 1;
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
    this.run(
      `INSERT INTO processing_event
         (case_id, sequence, stage, status, message_code, units_done, units_total, terminal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  listEvents(caseId: string, afterSequence = -1): Row[] {
    return this.many<Row>(
      'SELECT * FROM processing_event WHERE case_id = ? AND sequence > ? ORDER BY sequence',
      caseId,
      afterSequence,
    );
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
    this.run(
      `INSERT INTO audit_event
         (case_id, base_record_id, event_type, entity_ref, operator_label, correlation_id, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

  listAudit(caseId: string): Row[] {
    return this.many<Row>(
      'SELECT * FROM audit_event WHERE case_id = ? ORDER BY created_at DESC LIMIT 200',
      caseId,
    );
  }

  // -- Records / base records — 10 §1 --------------------------------------

  listBaseRecords(): Row[] {
    return this.many<Row>(
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
    );
  }

  getBaseRecord(id: string): Row | undefined {
    return this.one<Row>(
      `SELECT b.*, p.last_name, p.first_name, p.date_of_birth,
              pol.policy_id, pol.group_id, pol.plan_name, pol.effective_date,
              c.canonical_name AS carrier_name
       FROM base_vob_record b
       JOIN patient p ON p.id = b.patient_id
       JOIN policy pol ON pol.id = b.policy_id
       JOIN insurance_carrier c ON c.id = pol.carrier_id
       WHERE b.id = ?`,
      id,
    );
  }

  listVersions(baseRecordId: string): Row[] {
    return this.many<Row>(
      `SELECT vv.*, vc.id AS case_id, vc.case_status, vc.workflow_state
       FROM verification_version vv
       LEFT JOIN verification_case vc ON vc.version_id = vv.id
       WHERE vv.base_record_id = ? ORDER BY vv.version_number DESC`,
      baseRecordId,
    );
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
