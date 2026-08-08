/**
 * API contract, immutability and document-gating tests.
 *
 * Spec authority: 15 §16 (API and queue tests), 15 §14 (records and history),
 * 15 §17 (PDF gating), 15 §20 (security), 09 §16, 12 §3, 12 §7.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COMPLETED_FORM_VALUES, loadGoldenFixture } from '@us24/testing';
import { FIELD_REGISTRY } from '@us24/domain';
import { buildApp, type BuiltApp } from '../src/app.js';

let built: BuiltApp;
let caseId: string;
let originRevisionId: string;

beforeAll(async () => {
  built = await buildApp({
    databasePath: ':memory:',
    storageRoot: `${process.cwd()}/.private-storage/test-${Date.now()}`,
  });

  const fixture = loadGoldenFixture();
  const created = built.repo.createCase({
    mode: 'AUDIT',
    patientLabel: 'Rivera, Dominic',
    payerLabel: 'Cigna ASH',
    serviceType: 'PT',
    operatorLabel: 'test',
  });
  caseId = created.id;

  const origin = built.repo.insertRevision({
    caseId,
    createdReason: 'IMPORTED_ORIGINAL',
    values: { ...COMPLETED_FORM_VALUES },
  });
  originRevisionId = origin.id;
  built.repo.updateCaseState(caseId, { current_revision_id: origin.id });
  built.repo.insertExtractionRun({
    caseId,
    provider: 'fixture',
    modelVersion: 'none',
    promptVersion: 'fixture-v1',
    candidates: fixture.allCandidates,
  });
  built.cases.verify(caseId);
});

afterAll(async () => {
  await built.app.close();
  built.db.close();
});

describe('request validation (12 §3)', () => {
  it('rejects an invalid body with a stable machine code and field details', async () => {
    const res = await built.app.inject({
      method: 'POST',
      url: '/v1/cases',
      payload: { mode: 'NOT_A_MODE' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.correlationId).toBeTruthy();
    expect(body.details?.length).toBeGreaterThan(0);
  });

  it('rejects a revision that names an unknown canonical field', async () => {
    const res = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/revisions`,
      payload: {
        baseRevisionId: originRevisionId,
        changes: { 'primary.invented': 'x' },
        reason: 'MANUAL_EDIT',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns a safe 404 for an unknown case', async () => {
    const res = await built.app.inject({ method: 'GET', url: '/v1/cases/case_nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('CASE_NOT_FOUND');
  });

  it('never leaks internals in an error body (11 §16)', async () => {
    const res = await built.app.inject({ method: 'GET', url: '/v1/cases/case_nope' });
    const raw = res.body;
    expect(raw).not.toMatch(/SELECT|INSERT|sqlite|node_modules|at Object\./i);
    expect(Object.keys(res.json()).sort()).toEqual(['code', 'correlationId', 'message']);
  });
});

describe('idempotency and concurrency (12 §3, 15 §16)', () => {
  it('does not create a duplicate case for a repeated idempotency key', async () => {
    const payload = { mode: 'AUDIT', idempotencyKey: 'idem-test-0001', payerLabel: 'Aetna' };
    const first = await built.app.inject({ method: 'POST', url: '/v1/cases', payload });
    const second = await built.app.inject({ method: 'POST', url: '/v1/cases', payload });
    expect(first.json().id).toBe(second.json().id);
  });

  it('detects a stale revision base and refuses the write', async () => {
    const fresh = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/revisions`,
      payload: {
        baseRevisionId: originRevisionId,
        changes: { 'primary.planName': 'Open Access Plus' },
        reason: 'MANUAL_EDIT',
      },
    });
    expect(fresh.statusCode).toBe(201);

    // The second write still names the original revision, which has moved on.
    const stale = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/revisions`,
      payload: {
        baseRevisionId: originRevisionId,
        changes: { 'primary.planName': 'Something else' },
        reason: 'MANUAL_EDIT',
      },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().code).toBe('REVISION_CONFLICT');
  });
});

describe('immutability (ADR-006, 12 §7)', () => {
  it('keeps the original imported values readable after an edit', async () => {
    const snapshot = built.cases.snapshot(caseId);
    // The imported form asserted the fifth visit; edits never rewrite that.
    expect(snapshot.originValues['authorization.requiredAfterVisitNumber']).toBe('5');
  });

  it('creates a new revision rather than mutating the previous one', async () => {
    const before = built.repo.listRevisions(caseId).length;
    const current = built.repo.getCase(caseId)!.current_revision_id!;

    await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/revisions`,
      payload: {
        baseRevisionId: current,
        changes: { 'authorization.requiredAfterVisitNumber': '8' },
        reason: 'APPLY_SUPPORTED_VALUE',
      },
    });

    const after = built.repo.listRevisions(caseId);
    expect(after.length).toBe(before + 1);
    // The earlier revision still holds what it always held.
    const previous = built.repo.getRevision(current)!;
    expect(JSON.parse(previous.values_json)['authorization.requiredAfterVisitNumber']).toBe('5');
  });

  it('exposes no update method for immutable entities', () => {
    const repoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(built.repo));
    for (const forbidden of [
      'updateRevision',
      'updateComparisonRun',
      'updateExtractionRun',
      'updateBypass',
      'updateDocument',
      'deleteRevision',
    ]) {
      expect(repoMethods, `repository exposes ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe('verification and freshness (09 §15)', () => {
  it('marks the result stale after an edit and fresh again after Verify', async () => {
    const current = built.repo.getCase(caseId)!.current_revision_id!;
    await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/revisions`,
      payload: {
        baseRevisionId: current,
        changes: { 'primary.planName': 'Edited plan' },
        reason: 'MANUAL_EDIT',
      },
    });

    let snapshot = built.cases.snapshot(caseId);
    expect(snapshot.freshness.isStale).toBe(true);
    expect(snapshot.freshness.label).toBe('Changes not verified');

    const revisionId = built.repo.getCase(caseId)!.current_revision_id!;
    await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/verify`,
      payload: { revisionId },
    });

    snapshot = built.cases.snapshot(caseId);
    expect(snapshot.freshness.isStale).toBe(false);
  });

  it('records the rule-set version with every comparison run (08 §20)', () => {
    const runs = built.repo.listComparisonRuns(caseId);
    expect(runs.length).toBeGreaterThan(1);
    for (const run of runs) {
      expect(run.rule_set_version).toBe(FIELD_REGISTRY.matrixVersion);
    }
  });
});

describe('bypass governance (09 §10, §12)', () => {
  it('rejects a bypass reason that needs a note when none is given', async () => {
    const revisionId = built.repo.getCase(caseId)!.current_revision_id!;
    const res = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/fields/financial.copayAmount/bypass`,
      payload: { revisionId, reason: 'OTHER_WITH_REQUIRED_NOTE' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('NOTE_REQUIRED');
  });

  it('rejects a bypass on a field that forbids it', async () => {
    const revisionId = built.repo.getCase(caseId)!.current_revision_id!;
    const res = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/fields/verification.caseId/bypass`,
      payload: { revisionId, reason: 'NOT_APPLICABLE' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('BYPASS_NOT_PERMITTED');
  });

  it('records an accepted bypass and recomputes the case result', async () => {
    const revisionId = built.repo.getCase(caseId)!.current_revision_id!;
    const res = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/fields/financial.copayAmount/bypass`,
      payload: { revisionId, reason: 'NOT_DISCLOSED_DURING_CALL', note: 'Not covered on the call.' },
    });
    expect(res.statusCode).toBe(201);
    const stored = built.repo.listBypasses(caseId);
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.at(-1)?.['reason']).toBe('NOT_DISCLOSED_DURING_CALL');
  });
});

describe('document gating (09 §16, 13 §11, 15 §22)', () => {
  it('refuses to generate a clean final PDF for a FAILED case', async () => {
    const snapshot = built.cases.snapshot(caseId);
    expect(snapshot.status?.status).toBe('FAILED');

    const res = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${caseId}/finalize`,
      payload: {
        revisionId: snapshot.revisionId,
        comparisonRunId: built.repo.getCase(caseId)!.latest_comparison_run_id,
        documentType: 'FINAL',
        templateVersionId: 'tpl_interim_v1',
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe('DOCUMENT_NOT_PERMITTED');
    expect(res.json().message).toContain('cannot be generated');
  });

  it('does allow the QA report and the failed draft', async () => {
    const snapshot = built.cases.snapshot(caseId);
    for (const documentType of ['QA_REPORT', 'QA_FAILED_DRAFT']) {
      const res = await built.app.inject({
        method: 'POST',
        url: `/v1/cases/${caseId}/finalize`,
        payload: {
          revisionId: snapshot.revisionId,
          comparisonRunId: built.repo.getCase(caseId)!.latest_comparison_run_id,
          documentType,
          templateVersionId: 'tpl_interim_v1',
        },
      });
      expect(res.statusCode, `${documentType} was rejected`).toBe(201);
      expect(res.json().pageCount).toBeGreaterThan(0);
    }
  });

  it('produces no logo-only trailing page (13 §13, 02 §5)', async () => {
    const documents = built.repo.listDocuments(caseId);
    expect(documents.length).toBeGreaterThan(0);
    for (const doc of documents) {
      expect(Number(doc['page_count'])).toBe(1);
    }
  });

  it('stores a checksum and generation metadata with every document (12 §16)', () => {
    for (const doc of built.repo.listDocuments(caseId)) {
      expect(String(doc['checksum_sha256'])).toMatch(/^[a-f0-9]{64}$/);
      expect(doc['template_version_id']).toBeTruthy();
      expect(doc['comparison_run_id']).toBeTruthy();
    }
  });
});

describe('registry endpoint drives the form (11 §9)', () => {
  it('publishes every canonical field with its pending-matrix flags', async () => {
    const res = await built.app.inject({ method: 'GET', url: '/v1/registry' });
    const body = res.json();
    const fieldCount = body.sections.flatMap((s: { groups: { fields: unknown[] }[] }) =>
      s.groups.flatMap((g) => g.fields),
    ).length;
    expect(fieldCount).toBe(FIELD_REGISTRY.fields.length);
    expect(body.matrixPendingClient).toBe(true);
  });
});

describe('system health does not leak secrets (05 §16)', () => {
  it('reports provider status without exposing keys or transcript content', async () => {
    const res = await built.app.inject({ method: 'GET', url: '/v1/system/health' });
    const raw = res.body;
    expect(res.statusCode).toBe(200);
    expect(raw).not.toMatch(/api[_-]?key|secret|password|bearer/i);
    expect(res.json().services.ringCentralAdapter.status).toBe('NOT_CONFIGURED');
  });
});

describe('RingCentral is explicitly unavailable, not silently broken (12 §13)', () => {
  it('returns 501 with the reason and names manual upload as the fallback', async () => {
    const res = await built.app.inject({
      method: 'POST',
      url: '/v1/integrations/ringcentral/import',
      payload: {},
    });
    expect(res.statusCode).toBe(501);
    expect(res.json().code).toBe('INTEGRATION_NOT_CONFIGURED');
    expect(res.json().message).toContain('Manual upload remains available');
  });
});

describe('transcript sources', () => {
  it('accepts pasted text, parses speakers and keeps IVR content flagged', async () => {
    const created = built.repo.createCase({ mode: 'AUTO_FILL', operatorLabel: 'test' });
    const res = await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${created.id}/sources/transcript-text`,
      payload: {
        text: [
          '[00:04] IVR: Thank you for calling. For eligibility and benefits, press one.',
          '[01:36] ASH: The individual deductible is three thousand dollars.',
          '[01:44] US24: And the coinsurance?',
        ].join('\n'),
        label: 'pasted.txt',
      },
    });
    expect(res.statusCode).toBe(201);

    await built.app.inject({ method: 'POST', url: `/v1/cases/${created.id}/process` });

    const segments = built.repo.listSegments(created.id);
    expect(segments.length).toBe(3);
    expect(segments[0]?.['speaker_role']).toBe('IVR');
    expect(segments[1]?.['speaker_role']).toBe('PAYER_REPRESENTATIVE');
    expect(segments[2]?.['speaker_role']).toBe('CALLER');
    // 00 §4: irrelevant talk is excluded from extraction context but retained.
    expect(Number(segments[0]?.['relevant'])).toBe(0);
    expect(segments[0]?.['text']).toContain('press one');
  });

  it('emits sequenced processing events a client can resume from (12 §17)', async () => {
    const created = built.repo.createCase({ mode: 'AUTO_FILL', operatorLabel: 'test' });
    await built.app.inject({
      method: 'POST',
      url: `/v1/cases/${created.id}/sources/transcript-text`,
      payload: { text: 'ASH: Deductible is three thousand dollars.' },
    });
    await built.app.inject({ method: 'POST', url: `/v1/cases/${created.id}/process` });

    const events = built.repo.listEvents(created.id);
    expect(events.length).toBeGreaterThan(0);
    const sequences = events.map((e) => Number(e['sequence']));
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(events.at(-1)?.['terminal']).toBe(1);
  });
});

describe('audit trail (10 §19)', () => {
  it('records case creation, revisions, comparison runs and documents', async () => {
    const res = await built.app.inject({ method: 'GET', url: `/v1/cases/${caseId}/audit` });
    const types = new Set(res.json().items.map((e: { event_type: string }) => e.event_type));
    expect(types.has('FORM_REVISION_CREATED')).toBe(true);
    expect(types.has('COMPARISON_RUN')).toBe(true);
    expect(types.has('DOCUMENT_GENERATED')).toBe(true);
    expect(types.has('BYPASS_RECORDED')).toBe(true);
  });
});
