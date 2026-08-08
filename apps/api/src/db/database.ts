/**
 * Persistence.
 *
 * ============================================================================
 * DEFERRAL — recorded per 16 §1 ("Do not reduce scope without recording a
 * decision"). See DECISION_LOG_ADDENDUM.md, ADR-013.
 *
 * 12 §1 specifies PostgreSQL with a typed ORM, Redis/BullMQ and private
 * S3-compatible object storage. None of those are installed on the target
 * machine, so this build uses Node's built-in SQLite driver and a local private
 * folder for artifacts.
 *
 * The schema below is written PostgreSQL-first — the entity set is 12 §5 verbatim,
 * money is integer cents and identifiers are TEXT (12 §6), and every write goes
 * through the repository layer so immutability (12 §7) is enforced in one place.
 * Moving to Postgres replaces this file and `migrate.ts`; nothing above the
 * repository interface changes.
 * ============================================================================
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = DatabaseSync;

/**
 * Typed query helpers.
 *
 * `node:sqlite` types a row as `Record<string, SQLOutputValue>`, which does not
 * overlap with a declared row interface, so `stmt.get(...) as CaseRow` is a
 * conversion TypeScript may reject outright. Whether it does depends on the
 * resolved @types/node version — a build that passes locally can fail in CI on
 * a different one, which is exactly what happened on the first deploy.
 *
 * These helpers perform the widening through `unknown` ONCE, in one documented
 * place, so no call site carries a fragile double cast and the behaviour is the
 * same under every @types/node version.
 *
 * The conversion is sound because every row type in `repository.ts` mirrors a
 * table declared in `SCHEMA_SQL` below, and SQLite columns only ever produce
 * null, number, bigint, string or Uint8Array. It is NOT validated at runtime:
 * a schema change without a matching interface change is a silent mismatch, so
 * the two are kept adjacent and changed together.
 */
/**
 * Values SQLite can bind to a statement parameter.
 *
 * Declared here rather than imported from `node:sqlite` so the helper signatures
 * do not themselves depend on the @types/node version — which is the whole point
 * of this module. It is the same set the driver accepts.
 */
export type SqlParam = null | number | bigint | string | Uint8Array;

export function queryOne<T>(db: Db, sql: string, ...params: readonly SqlParam[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined;
}

export function queryAll<T>(db: Db, sql: string, ...params: readonly SqlParam[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}

/** Statement execution for writes. Kept alongside the readers for symmetry. */
export function execute(db: Db, sql: string, ...params: readonly SqlParam[]): void {
  db.prepare(sql).run(...params);
}

let instance: Db | null = null;

export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // Foreign keys are off by default in SQLite; the entity graph depends on them.
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  return db;
}

export function getDatabase(path: string): Db {
  instance ??= openDatabase(path);
  return instance;
}

export function closeDatabase(): void {
  instance?.close();
  instance = null;
}

/**
 * Entities from 12 §5. Names match the spec's list so the mapping is auditable.
 *
 * Immutability is expressed structurally: `source_artifact`, `form_revision`,
 * `extraction_run`, `comparison_run`, `field_comparison`, `bypass_resolution`,
 * `finalization` and `generated_document` have no UPDATE path in the repository,
 * and revisions are append-only chains linked by `origin_revision_id` (ADR-006).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS patient (
  id TEXT PRIMARY KEY,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  date_of_birth TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS insurance_carrier (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  aliases TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policy (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  carrier_id TEXT NOT NULL REFERENCES insurance_carrier(id),
  policy_id TEXT NOT NULL,
  group_id TEXT,
  plan_name TEXT,
  effective_date TEXT,
  termination_date TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_policy_lookup ON policy(policy_id, group_id);

CREATE TABLE IF NOT EXISTS base_vob_record (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  policy_id TEXT NOT NULL REFERENCES policy(id),
  service_type TEXT,
  created_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS verification_version (
  id TEXT PRIMARY KEY,
  base_record_id TEXT NOT NULL REFERENCES base_vob_record(id),
  version_number INTEGER NOT NULL,
  verification_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (base_record_id, version_number)
);

CREATE TABLE IF NOT EXISTS verification_case (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  workflow_state TEXT NOT NULL,
  case_status TEXT,
  base_record_id TEXT REFERENCES base_vob_record(id),
  version_id TEXT REFERENCES verification_version(id),
  patient_label TEXT,
  payer_label TEXT,
  service_type TEXT,
  current_revision_id TEXT,
  latest_comparison_run_id TEXT,
  idempotency_key TEXT UNIQUE,
  operator_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_case_status ON verification_case(case_status, workflow_state);

-- Immutable. No UPDATE path exists in the repository (12 §7).
CREATE TABLE IF NOT EXISTS source_artifact (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  parse_state TEXT NOT NULL DEFAULT 'PENDING',
  parse_detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_artifact_checksum ON source_artifact(checksum_sha256);

CREATE TABLE IF NOT EXISTS transcript_segment (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES source_artifact(id),
  ordinal INTEGER NOT NULL,
  speaker_role TEXT NOT NULL,
  raw_speaker_label TEXT,
  timestamp_start REAL,
  timestamp_end REAL,
  text TEXT NOT NULL,
  relevant INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_segment_artifact ON transcript_segment(artifact_id, ordinal);

-- Append-only chain. ADR-006.
CREATE TABLE IF NOT EXISTS form_revision (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  revision_number INTEGER NOT NULL,
  origin_revision_id TEXT NOT NULL,
  parent_revision_id TEXT,
  created_reason TEXT NOT NULL,
  explanation TEXT,
  operator_label TEXT,
  values_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (case_id, revision_number)
);

CREATE TABLE IF NOT EXISTS extraction_run (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  provider TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  candidates_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comparison_run (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  revision_id TEXT NOT NULL REFERENCES form_revision(id),
  extraction_run_id TEXT REFERENCES extraction_run(id),
  rule_set_version TEXT NOT NULL,
  dictionary_version TEXT NOT NULL,
  case_status TEXT NOT NULL,
  counts_json TEXT NOT NULL,
  comparisons_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comparison_case ON comparison_run(case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bypass_resolution (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  revision_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  value_before_bypass TEXT,
  rule_set_version TEXT NOT NULL,
  consequence TEXT NOT NULL,
  requires_follow_up INTEGER NOT NULL DEFAULT 0,
  operator_label TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bypass_case ON bypass_resolution(case_id, field_key);

CREATE TABLE IF NOT EXISTS carrier_master_version (
  id TEXT PRIMARY KEY,
  carrier_id TEXT NOT NULL REFERENCES insurance_carrier(id),
  version_number INTEGER NOT NULL,
  state TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  values_json TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_through TEXT,
  change_reason TEXT,
  created_at TEXT NOT NULL,
  activated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_master_active ON carrier_master_version(carrier_id, state);

CREATE TABLE IF NOT EXISTS template_version (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  client_label TEXT NOT NULL,
  file_type TEXT NOT NULL,
  state TEXT NOT NULL,
  effective_from TEXT,
  mapping_completeness INTEGER NOT NULL DEFAULT 0,
  is_client_supplied INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_document (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  revision_id TEXT NOT NULL,
  comparison_run_id TEXT NOT NULL,
  template_version_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  page_count INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_job (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT,
  error_code TEXT,
  started_at TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS processing_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL REFERENCES verification_case(id),
  sequence INTEGER NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  message_code TEXT NOT NULL,
  units_done INTEGER,
  units_total INTEGER,
  terminal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (case_id, sequence)
);

-- 10 §19. Every material action is recorded with whatever actor context exists.
-- 09 §14 forbids presenting that context as strong identity.
CREATE TABLE IF NOT EXISTS audit_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT,
  base_record_id TEXT,
  event_type TEXT NOT NULL,
  entity_ref TEXT,
  operator_label TEXT,
  correlation_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_event(case_id, created_at DESC);
`;

export function applySchema(db: Db): void {
  db.exec(SCHEMA_SQL);
}
