/**
 * Demo seed.
 *
 * 05 §18 (no-blank-state rule) and 16 §1 ("Use realistic non-PHI demo fixtures";
 * "Do not create blank routes or placeholder-only pages") require every route to
 * have populated content. This seeds one case per meaningful state so Records,
 * Review Queue, Carrier Master, Templates and System are all non-empty.
 *
 * All data is synthetic. No real patient information is used.
 */

import { randomUUID } from 'node:crypto';
import { FIELD_REGISTRY } from '@us24/domain';
import {
  COMPLETED_FORM_VALUES,
  loadGoldenFixture,
  makeCandidate,
  validValueFor,
} from '@us24/testing';
import { buildApp } from '../app.js';
import { queryAll, queryOne } from '../db/database.js';

const now = (): string => new Date().toISOString();
const id = (prefix: string): string => `${prefix}_${randomUUID()}`;

const { app, repo, cases, db, config } = await buildApp();

/**
 * Clear previously seeded demo data so re-seeding is deterministic.
 *
 * The E2E suite asserts on the golden case, and tests legitimately create
 * revisions against it. Without a reset, a second run would inherit the first
 * run's edits and quietly disarm those assertions — 15 §8 requires the fixture
 * to stay immutable between runs.
 *
 * This truncates the whole demo database. It is a development seed script and
 * is never wired into the API or any deployed process.
 */
function resetDemoData(): void {
  db.exec('PRAGMA foreign_keys = OFF');
  const tables = queryAll<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  for (const table of tables) db.exec(`DELETE FROM ${table.name}`);
  db.exec('PRAGMA foreign_keys = ON');
}

function seedCarriers(): void {
  const carriers = [
    { name: 'Cigna ASH', payerId: 'ASHP1', phone: '800-972-4226' },
    { name: 'UnitedHealthcare', payerId: '87726', phone: '877-842-3210' },
    { name: 'Aetna', payerId: '60054', phone: '888-632-3862' },
    { name: 'Blue Cross Blue Shield of Texas', payerId: '84980', phone: '800-451-0287' },
  ];

  for (const carrier of carriers) {
    const carrierId = id('carrier');
    db.prepare(
      'INSERT OR IGNORE INTO insurance_carrier (id, canonical_name, aliases, created_at) VALUES (?, ?, ?, ?)',
    ).run(carrierId, carrier.name, JSON.stringify([]), now());

    const row = queryOne<{ id: string }>(
      db,
      'SELECT id FROM insurance_carrier WHERE canonical_name = ?',
      carrier.name,
    )!;

    // 10 §13: a master must carry its scope, and 10 §15 says only ACTIVE
    // versions auto-fill. One carrier is deliberately left with a PROPOSED
    // version so the proposal-versus-active comparison screen has content.
    db.prepare(
      `INSERT INTO carrier_master_version
       (id, carrier_id, version_number, state, scope_json, values_json, effective_from,
        effective_through, change_reason, created_at, activated_at)
       VALUES (?, ?, 1, 'ACTIVE', ?, ?, '2026-01-01', NULL, ?, ?, ?)`,
    ).run(
      id('master'),
      row.id,
      JSON.stringify({
        carrier: carrier.name,
        lineOfBusiness: 'COMMERCIAL',
        stateOrMarket: 'TX',
        network: 'IN_NETWORK',
      }),
      JSON.stringify({
        'primary.payerId': carrier.payerId,
        'primary.insurancePhone': carrier.phone,
        'claims.payerId': carrier.payerId,
        'claims.mailingAddress': 'PO Box 981652, El Paso, TX 79998',
        'claims.originalTflValue': '180',
        'claims.originalTflUnit': 'Days',
      }),
      'Initial import from payer provider manual.',
      now(),
      now(),
    );

    if (carrier.name === 'Cigna ASH') {
      db.prepare(
        `INSERT INTO carrier_master_version
         (id, carrier_id, version_number, state, scope_json, values_json, effective_from,
          effective_through, change_reason, created_at, activated_at)
         VALUES (?, ?, 2, 'PROPOSED', ?, ?, '2026-09-01', NULL, ?, ?, NULL)`,
      ).run(
        id('master'),
        row.id,
        JSON.stringify({
          carrier: carrier.name,
          lineOfBusiness: 'COMMERCIAL',
          stateOrMarket: 'TX',
          network: 'IN_NETWORK',
        }),
        JSON.stringify({
          'primary.payerId': carrier.payerId,
          'primary.insurancePhone': carrier.phone,
          'claims.originalTflValue': '90',
        }),
        // 10 §16: a single call contradicting the master creates a proposal,
        // never an automatic update.
        'Proposed from a call contradiction on case CIGNA-ASH. Requires review before activation.',
        now(),
      );
    }
  }
}

function seedTemplates(): void {
  db.prepare(
    `INSERT INTO template_version
     (id, template_id, version_number, client_label, file_type, state, effective_from,
      mapping_completeness, is_client_supplied, created_at)
     VALUES (?, 'us24-interim', 1, ?, 'HTML', 'ACTIVE', '2026-08-07', ?, 0, ?)`,
  ).run(
    'tpl_interim_v1',
    'US24 interim layout (not the client template)',
    FIELD_REGISTRY.fields.length,
    now(),
  );

  db.prepare(
    `INSERT INTO template_version
     (id, template_id, version_number, client_label, file_type, state, effective_from,
      mapping_completeness, is_client_supplied, created_at)
     VALUES (?, 'us24-official', 1, ?, 'DOCX', 'DRAFT', NULL, 0, 1, ?)`,
  ).run(
    'tpl_official_pending',
    'Official US24 VOB template — awaiting client file',
    now(),
  );
}

async function seedGoldenCase(): Promise<string> {
  const fixture = loadGoldenFixture();

  const created = repo.createCase({
    mode: 'AUDIT',
    patientLabel: 'Rivera, Dominic',
    payerLabel: 'Cigna ASH',
    serviceType: 'PT',
    operatorLabel: config.operatorLabel,
  });

  // The imported completed form becomes the immutable origin revision (ADR-006).
  const origin = repo.insertRevision({
    caseId: created.id,
    createdReason: 'IMPORTED_ORIGINAL',
    operatorLabel: config.operatorLabel,
    values: { ...COMPLETED_FORM_VALUES },
  });
  repo.updateCaseState(created.id, { current_revision_id: origin.id });

  repo.insertArtifact({
    caseId: created.id,
    kind: 'COMPLETED_FORM',
    filename: fixture.completedFormArtifact.label,
    contentType: 'application/pdf',
    byteSize: 184_320,
    checksum: 'a'.repeat(64),
    storageKey: `cases/${created.id}/completed-form.pdf`,
    parseState: 'PARSED',
    parseDetail: '1 page, text layer present',
  });

  const transcriptArtifactId = repo.insertArtifact({
    caseId: created.id,
    kind: 'TRANSCRIPT',
    filename: fixture.transcriptArtifact.label,
    contentType: 'text/plain',
    byteSize: 42_118,
    checksum: 'b'.repeat(64),
    storageKey: `cases/${created.id}/transcript.txt`,
    parseState: 'PARSED',
    parseDetail: 'segments reconstructed from fixture evidence',
  });

  // Transcript segments derived from the fixture's evidence excerpts, so the
  // workspace transcript pane and the evidence links refer to the same text.
  const segments = fixture.allCandidates
    .map((candidate, index) => ({
      ordinal: index,
      speakerRole: candidate.speakerRole,
      rawSpeakerLabel: candidate.evidence.rawSpeakerLabel ?? null,
      timestampStart: candidate.evidence.timestampStart ?? null,
      timestampEnd: candidate.evidence.timestampEnd ?? null,
      text: candidate.evidence.excerpt,
      relevant: candidate.speakerRole !== 'IVR',
    }))
    .sort((a, b) => (a.timestampStart ?? 0) - (b.timestampStart ?? 0))
    .map((s, i) => ({ ...s, ordinal: i }));

  repo.insertSegments(transcriptArtifactId, segments);

  repo.insertExtractionRun({
    caseId: created.id,
    provider: 'fixture',
    modelVersion: 'none',
    promptVersion: 'fixture-v1',
    candidates: fixture.allCandidates,
  });

  // The deterministic engine decides the outcome — not this seed.
  cases.verify(created.id);
  repo.updateCaseState(created.id, { workflow_state: 'READY' });

  for (const stage of [
    'UPLOAD',
    'VALIDATE',
    'PARSE_OR_TRANSCRIBE',
    'IDENTIFY_SPEAKERS',
    'EXTRACT_FACTS',
    'COMPARE',
    'PREPARE_WORKSPACE',
  ] as const) {
    cases.emit(created.id, stage, 'COMPLETE', `${stage}_COMPLETE`, undefined, stage === 'PREPARE_WORKSPACE');
  }

  return created.id;
}

function seedSupportingCases(): void {
  // A clean PASSED case: every completed field is corroborated by the call, so
  // nothing is left unresolved. Built by filling each field and giving it a
  // matching representative-confirmed candidate — the engine still decides the
  // outcome, this only supplies agreeing inputs.
  const passing = repo.createCase({
    mode: 'AUDIT',
    patientLabel: 'Okafor, Adaeze',
    payerLabel: 'Aetna',
    serviceType: 'OT',
    operatorLabel: config.operatorLabel,
  });

  // Readable identity values. Applied inside the loop so the form value and its
  // candidate are always the same string — two different values for one field
  // would be a genuine source conflict, which is exactly what the engine reports.
  const identity: Record<string, string> = {
    'patient.lastName': 'Okafor',
    'patient.firstName': 'Adaeze',
    'primary.insuranceName': 'Aetna',
    'primary.serviceType': 'OT',
  };

  const passingValues: Record<string, string | null> = {};
  const passingCandidates = [];
  for (const field of FIELD_REGISTRY.fields) {
    if (field.control === 'readOnly' || field.comparison === 'NOT_COMPARED') {
      passingValues[field.key] = null;
      continue;
    }
    const value = identity[field.key] ?? validValueFor(field);
    passingValues[field.key] = value;
    passingCandidates.push(makeCandidate(field.key, { rawValue: value, confidence: 0.94 }));
  }

  const passingRevision = repo.insertRevision({
    caseId: passing.id,
    createdReason: 'IMPORTED_ORIGINAL',
    values: passingValues,
  });
  repo.updateCaseState(passing.id, { current_revision_id: passingRevision.id });
  repo.insertExtractionRun({
    caseId: passing.id,
    provider: 'fixture',
    modelVersion: 'none',
    promptVersion: 'fixture-v1',
    candidates: passingCandidates,
  });
  cases.verify(passing.id);

  // A NEEDS REVIEW case: the form is complete and corroborated except for one
  // field the payer could not see, which blocks PASSED without failing the case.
  const review = repo.createCase({
    mode: 'AUDIT',
    patientLabel: 'Haddad, Yusra',
    payerLabel: 'UnitedHealthcare',
    serviceType: 'PT',
    operatorLabel: config.operatorLabel,
  });
  const reviewValues = { ...passingValues };
  reviewValues['coordination.secondaryStatus'] = 'Unknown';
  const reviewCandidates = passingCandidates.filter(
    (c) => c.fieldKey !== 'coordination.secondaryStatus',
  );
  const reviewRevision = repo.insertRevision({
    caseId: review.id,
    createdReason: 'IMPORTED_ORIGINAL',
    values: reviewValues,
  });
  repo.updateCaseState(review.id, { current_revision_id: reviewRevision.id });
  repo.insertExtractionRun({
    caseId: review.id,
    provider: 'fixture',
    modelVersion: 'none',
    promptVersion: 'fixture-v1',
    candidates: reviewCandidates,
  });
  cases.verify(review.id);

  // A DRAFT case with sources attached but not yet processed — 05 §2 recent drafts.
  const draft = repo.createCase({
    mode: 'AUTO_FILL',
    patientLabel: 'Nakamura, Kenji',
    payerLabel: 'UnitedHealthcare',
    serviceType: 'PT',
    operatorLabel: config.operatorLabel,
  });
  repo.insertArtifact({
    caseId: draft.id,
    kind: 'TRANSCRIPT',
    filename: 'UHC_call_2026-08-06.txt',
    contentType: 'text/plain',
    byteSize: 18_004,
    checksum: 'c'.repeat(64),
    storageKey: `cases/${draft.id}/transcript.txt`,
    parseState: 'PENDING',
  });

  // A case whose processing failed — 05 §18 requires this to be visible and
  // recoverable, not hidden.
  const failedProcessing = repo.createCase({
    mode: 'AUDIT',
    patientLabel: 'Whitfield, Mara',
    payerLabel: 'Blue Cross Blue Shield of Texas',
    serviceType: 'ST',
    operatorLabel: config.operatorLabel,
  });
  repo.updateCaseState(failedProcessing.id, { workflow_state: 'PROCESSING_FAILED' });
  repo.insertArtifact({
    caseId: failedProcessing.id,
    kind: 'COMPLETED_FORM',
    filename: 'VOB_scan_2026-08-05.pdf',
    contentType: 'application/pdf',
    byteSize: 2_201_984,
    checksum: 'd'.repeat(64),
    storageKey: `cases/${failedProcessing.id}/scan.pdf`,
    parseState: 'FAILED',
    // 13 §3: image-only PDFs get an explicit state, never a silent blank form.
    parseDetail: 'Image-only PDF — no text layer. OCR is not approved (13 §3).',
  });
  cases.emit(failedProcessing.id, 'PARSE_OR_TRANSCRIBE', 'FAILED', 'IMAGE_ONLY_PDF', undefined, true);
}

function seedRecords(goldenCaseId: string): void {
  // 10 §1: patient -> policy -> base record -> dated verification versions.
  const patientId = id('patient');
  db.prepare(
    'INSERT INTO patient (id, last_name, first_name, date_of_birth, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(patientId, 'Rivera', 'Dominic', '2010-10-07', now());

  const carrier = queryOne<{ id: string }>(
    db,
    "SELECT id FROM insurance_carrier WHERE canonical_name = 'Cigna ASH'",
  )!;

  const policyId = id('policy');
  db.prepare(
    `INSERT INTO policy (id, patient_id, carrier_id, policy_id, group_id, plan_name, effective_date, termination_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  ).run(policyId, patientId, carrier.id, '106723434-01', '00633434', 'Open Access Plus', '2025-10-01', now());

  const baseRecordId = id('base');
  db.prepare(
    'INSERT INTO base_vob_record (id, patient_id, policy_id, service_type, created_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL)',
  ).run(baseRecordId, patientId, policyId, 'PT', now());

  // MTG-012/013/014: the first VOB is the base record; later calls create dated
  // versions that never overwrite the earlier ones.
  const v1 = id('version');
  db.prepare(
    'INSERT INTO verification_version (id, base_record_id, version_number, verification_date, created_at) VALUES (?, ?, 1, ?, ?)',
  ).run(v1, baseRecordId, '2026-05-12', now());

  const v2 = id('version');
  db.prepare(
    'INSERT INTO verification_version (id, base_record_id, version_number, verification_date, created_at) VALUES (?, ?, 2, ?, ?)',
  ).run(v2, baseRecordId, '2026-08-04', now());

  repo.updateCaseState(goldenCaseId, { base_record_id: baseRecordId, version_id: v2 });
  repo.audit({
    caseId: goldenCaseId,
    baseRecordId,
    eventType: 'BASE_RECORD_CREATED',
    operatorLabel: config.operatorLabel,
  });
}

resetDemoData();
seedCarriers();
seedTemplates();
const goldenCaseId = await seedGoldenCase();
seedSupportingCases();
seedRecords(goldenCaseId);

const summary = repo.listCases({ limit: 50 });
 
console.log(`Seeded ${summary.length} cases.`);
for (const row of summary) {
   
  console.log(`  ${row.id}  ${row.case_status ?? row.workflow_state}  ${row.payer_label ?? ''}`);
}
 
console.log(`Golden case: ${goldenCaseId}`);

await app.close();
db.close();
