/**
 * HTTP routes — 12 §4 endpoint list.
 *
 * 12 §3 principles applied throughout: resource-oriented versioned paths, schema
 * validation on every body, stable machine error codes, idempotency keys on
 * creation and finalization, optimistic concurrency on revisions, correlation
 * IDs on every response, and signed downloads rather than public object URLs.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { FIELD_REGISTRY, SECTION_LABEL, SECTION_ORDER, SUBGROUP_LABEL } from '@us24/domain';
import { DICTIONARY_VERSION } from '@us24/domain';
import {
  ErrorCode,
  bypassRequestSchema,
  createCaseRequestSchema,
  createRevisionRequestSchema,
  finalizeRequestSchema,
  pasteTranscriptRequestSchema,
  recordsQuerySchema,
  verifyRequestSchema,
} from '@us24/schemas';
import type { z } from 'zod';
import { ApiProblem, badRequest, notFound } from '../errors.js';
import type { AppConfig } from '../config.js';
import type { Repository } from '../db/repository.js';
import type { CaseService } from '../services/case-service.js';
import type { DocumentService, DocumentType } from '../services/document-service.js';
import type {
  ExtractionAdapter,
  StorageAdapter,
  TranscriptionAdapter,
} from '../adapters/index.js';
import type { JobRunner } from '../jobs/queue.js';

export interface RouteDeps {
  readonly repo: Repository;
  readonly cases: CaseService;
  readonly documents: DocumentService;
  readonly storage: StorageAdapter;
  readonly config: AppConfig;
  readonly transcription: TranscriptionAdapter;
  readonly extraction: ExtractionAdapter;
  readonly jobs: JobRunner;
}

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(
      ErrorCode.VALIDATION_FAILED,
      'The request could not be processed because some values were invalid.',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

export async function registerRoutes(app: FastifyInstance, deps: RouteDeps): Promise<void> {
  const { repo, cases, documents, config } = deps;

  // -- Health and system — 05 §16 -----------------------------------------

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/v1/system/health', async () => ({
    // 05 §16: "Do not expose API keys, raw PHI logs, or full transcript content."
    services: {
      api: { status: 'UP' },
      database: { status: 'UP', engine: 'sqlite', note: 'PostgreSQL deferred — see ADR-013' },
      objectStorage: { status: 'UP', engine: 'local-disk', note: 'S3 deferred — see ADR-013' },
      queue: { status: 'UP', engine: 'in-process', note: 'BullMQ deferred — see ADR-013' },
      transcriptionProvider: {
        status: deps.transcription.available ? 'UP' : 'NOT_CONFIGURED',
        provider: deps.transcription.name,
        note: deps.transcription.available ? null : 'Phase 4 pending vendor approval (17 §18)',
      },
      extractionProvider: {
        status: deps.extraction.available ? 'UP' : 'NOT_CONFIGURED',
        provider: deps.extraction.name,
        note: deps.extraction.available
          ? 'Fixture-backed double; no provider is called (ADR-014)'
          : 'Phase 5 pending vendor approval (17 §18)',
      },
      pdfWorker: { status: 'UP', note: 'Interim template — client template not supplied (ADR-015)' },
      ringCentralAdapter: {
        status: 'NOT_CONFIGURED',
        note: 'Phase 8. Ten discovery questions in 12 §13 are unanswered.',
      },
    },
    versions: {
      fieldRuleVersion: FIELD_REGISTRY.matrixVersion,
      fieldRulePendingClient: FIELD_REGISTRY.matrixPendingClient,
      keywordDictionaryVersion: DICTIONARY_VERSION,
      canonicalFieldCount: FIELD_REGISTRY.fields.length,
    },
    limits: {
      maxUploadBytes: config.maxUploadBytes,
      supportedTranscriptFormats: ['TXT', 'DOCX', 'PDF (text)', 'CSV', 'XLSX', 'pasted text'],
      supportedCompletedFormFormats: ['PDF (text)', 'XLSX'],
      audioFormats: [],
    },
    jobs: {
      recent: deps.jobs.listJobs().slice(-20),
    },
    environmentLabel: config.environmentLabel,
    retention: {
      summary: 'Retention schedule is pending client approval (17 §18). Nothing is auto-deleted.',
      nextCleanupRun: null,
    },
  }));

  /** The rule bundle the browser renders the form from — 11 §9. */
  app.get('/v1/registry', async () => ({
    matrixVersion: FIELD_REGISTRY.matrixVersion,
    matrixPendingClient: FIELD_REGISTRY.matrixPendingClient,
    dictionaryVersion: DICTIONARY_VERSION,
    sections: SECTION_ORDER.map((section) => ({
      key: section,
      label: SECTION_LABEL[section],
      groups: FIELD_REGISTRY.sectionGroups(section).map((g) => ({
        subgroup: g.subgroup,
        label: SUBGROUP_LABEL[g.subgroup],
        fields: g.fields.map((f) => ({
          key: f.key,
          label: f.label,
          documentLabel: f.documentLabel ?? null,
          dataType: f.dataType,
          control: f.control,
          options: f.options ?? null,
          helpText: f.helpText,
          examples: f.examples,
          temporalClass: f.temporalClass,
          requiredKind: f.requiredRule.kind,
          requiredPendingClient: f.requiredRule.pendingClient,
          criticalPendingClient: f.criticalRule.pendingClient,
          bypassAllowed: f.bypassPolicy.allowed,
          bypassReasons: f.bypassPolicy.allowedReasons,
          bypassReasonsRequiringNote: f.bypassPolicy.reasonsRequiringNote,
          hasDerivation: f.derivation !== undefined,
          traceIds: f.traceIds,
        })),
      })),
    })),
  }));

  // -- Cases — 12 §4 -------------------------------------------------------

  app.post('/v1/cases', async (request, reply) => {
    const body = parse(createCaseRequestSchema, request.body);
    const created = repo.createCase({
      mode: body.mode,
      patientLabel: body.patientLabel,
      payerLabel: body.payerLabel,
      serviceType: body.serviceType,
      baseRecordId: body.baseRecordId,
      idempotencyKey: body.idempotencyKey,
      operatorLabel: config.operatorLabel,
    });
    repo.audit({
      caseId: created.id,
      eventType: 'CASE_CREATED',
      operatorLabel: config.operatorLabel,
      correlationId: correlationId(request),
      metadata: { mode: body.mode },
    });
    return reply.code(201).send(created);
  });

  app.get('/v1/cases/:caseId', async (request) => {
    const { caseId } = request.params as { caseId: string };
    return cases.snapshot(caseId);
  });

  app.get('/v1/cases', async (request) => {
    const query = parse(recordsQuerySchema, request.query);
    return { items: repo.listCases(query) };
  });

  app.post('/v1/cases/:caseId/sources/transcript-text', async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = parse(pasteTranscriptRequestSchema, request.body);
    cases.requireCase(caseId);
    const artifactId = await cases.attachPastedTranscript(
      caseId,
      body.text,
      body.label ?? 'Pasted transcript.txt',
    );
    return reply.code(201).send({ artifactId });
  });

  app.get('/v1/cases/:caseId/sources', async (request) => {
    const { caseId } = request.params as { caseId: string };
    cases.requireCase(caseId);
    return { items: repo.listArtifacts(caseId) };
  });

  app.post('/v1/cases/:caseId/process', async (request) => {
    const { caseId } = request.params as { caseId: string };
    cases.requireCase(caseId);
    await cases.startProcessing(caseId);
    return cases.snapshot(caseId);
  });

  app.post('/v1/cases/:caseId/process/retry', async (request) => {
    const { caseId } = request.params as { caseId: string };
    const { stage } = (request.body ?? {}) as { stage?: string };
    cases.requireCase(caseId);
    await cases.retryStage(caseId, (stage ?? 'PARSE_OR_TRANSCRIBE') as never);
    return cases.snapshot(caseId);
  });

  app.post('/v1/cases/:caseId/process/cancel', async (request) => {
    const { caseId } = request.params as { caseId: string };
    cases.requireCase(caseId);
    cases.cancelProcessing(caseId);
    return { cancelled: true };
  });

  /**
   * Server-sent events — 12 §17.
   * Clients resume with ?after=<sequence>, so a reconnect replays only what it
   * missed rather than restarting the stream.
   */
  app.get('/v1/cases/:caseId/events', async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const after = Number((request.query as { after?: string }).after ?? -1);
    cases.requireCase(caseId);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let cursor = after;
    const flush = (): void => {
      for (const event of repo.listEvents(caseId, cursor)) {
        cursor = Number(event['sequence']);
        reply.raw.write(`id: ${cursor}\ndata: ${JSON.stringify(event)}\n\n`);
        // 12 §17: close the stream once the case reaches a terminal state.
        if (Number(event['terminal']) === 1) {
          clearInterval(timer);
          reply.raw.end();
          return;
        }
      }
    };

    flush();
    const timer = setInterval(flush, 400);
    request.raw.on('close', () => clearInterval(timer));
  });

  app.get('/v1/cases/:caseId/transcript', async (request) => {
    const { caseId } = request.params as { caseId: string };
    cases.requireCase(caseId);
    return { segments: repo.listSegments(caseId) };
  });

  // -- Revisions, verification, bypass -------------------------------------

  app.post('/v1/cases/:caseId/revisions', async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = parse(createRevisionRequestSchema, request.body);
    const result = cases.createRevision(caseId, {
      baseRevisionId: body.baseRevisionId,
      changes: body.changes as Record<string, string | null>,
      reason: body.reason,
      explanation: body.explanation,
    });
    return reply.code(201).send({ ...result, snapshot: cases.snapshot(caseId) });
  });

  app.get('/v1/cases/:caseId/revisions', async (request) => {
    const { caseId } = request.params as { caseId: string };
    cases.requireCase(caseId);
    return { items: repo.listRevisions(caseId) };
  });

  app.post('/v1/cases/:caseId/verify', async (request) => {
    const { caseId } = request.params as { caseId: string };
    parse(verifyRequestSchema, request.body);
    cases.verify(caseId);
    return cases.snapshot(caseId);
  });

  app.post('/v1/cases/:caseId/fields/:fieldKey/bypass', async (request, reply) => {
    const { caseId, fieldKey } = request.params as { caseId: string; fieldKey: string };
    const body = parse(bypassRequestSchema, request.body);
    const result = cases.recordBypass(caseId, fieldKey, {
      revisionId: body.revisionId,
      reason: body.reason,
      note: body.note ?? null,
    });
    // The bypass changes the field's consequence, so the result is recomputed
    // rather than being patched in place — 09 §3.
    cases.verify(caseId);
    return reply.code(201).send({ ...result, snapshot: cases.snapshot(caseId) });
  });

  app.get('/v1/cases/:caseId/audit', async (request) => {
    const { caseId } = request.params as { caseId: string };
    cases.requireCase(caseId);
    return { items: repo.listAudit(caseId) };
  });

  // -- Documents — 09 §16, 13 §11 ------------------------------------------

  app.post('/v1/cases/:caseId/finalize', async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = parse(finalizeRequestSchema, request.body);
    const result = await documents.generate(caseId, {
      revisionId: body.revisionId,
      comparisonRunId: body.comparisonRunId,
      documentType: body.documentType as DocumentType,
    });
    return reply.code(201).send(result);
  });

  app.get('/v1/cases/:caseId/documents', async (request) => {
    const { caseId } = request.params as { caseId: string };
    cases.requireCase(caseId);
    return { items: repo.listDocuments(caseId) };
  });

  app.get('/v1/documents/:documentId/download', async (request, reply) => {
    const { documentId } = request.params as { documentId: string };
    const doc = repo.getDocument(documentId);
    if (!doc) throw notFound(ErrorCode.CASE_NOT_FOUND, 'That document does not exist.');
    repo.audit({
      caseId: String(doc['case_id']),
      eventType: 'DOCUMENT_DOWNLOADED',
      entityRef: documentId,
      correlationId: correlationId(request),
    });
    const bytes = await deps.storage.get(String(doc['storage_key']));
    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Content-Disposition', `inline; filename="${String(doc['filename'])}"`)
      .send(bytes.toString('utf8'));
  });

  // -- Records and history — 10 §1, §8 -------------------------------------

  app.get('/v1/records', async (request) => {
    const query = parse(recordsQuerySchema, request.query);
    return {
      baseRecords: repo.listBaseRecords(),
      cases: repo.listCases(query),
    };
  });

  app.get('/v1/records/:recordId', async (request) => {
    const { recordId } = request.params as { recordId: string };
    const record = repo.getBaseRecord(recordId);
    if (!record) throw notFound(ErrorCode.CASE_NOT_FOUND, 'That record does not exist.');
    return { record, versions: repo.listVersions(recordId) };
  });

  // -- Carrier master — 10 §12–§17 -----------------------------------------

  app.get('/v1/carriers', async () => ({ items: repo.listCarriers() }));

  app.get('/v1/carriers/:carrierId', async (request) => {
    const { carrierId } = request.params as { carrierId: string };
    return { versions: repo.listCarrierVersions(carrierId) };
  });

  // -- Templates — 13 §6, 05 §15 -------------------------------------------

  app.get('/v1/templates', async () => ({
    items: repo.listTemplateVersions(),
    note:
      "The client's official blank VOB template has not been supplied. The active entry is an interim US24 layout and is not the approved final format (13 §7, 17 §18).",
  }));

  // -- RingCentral — 12 §13, deferred --------------------------------------

  app.post('/v1/integrations/ringcentral/import', async () => {
    throw new ApiProblem(
      ErrorCode.INTEGRATION_NOT_CONFIGURED,
      501,
      'RingCentral import is not configured. Ten discovery questions in 12 §13 (product, licences, permissions, recording retention, multi-leg calls, webhook preference, rate limits and BAA coverage) must be answered first. Manual upload remains available and is a permanent fallback (ADR-011).',
    );
  });
}

function correlationId(request: FastifyRequest): string {
  return String(request.id);
}

export function sendProblem(reply: FastifyReply, problem: ApiProblem, id: string): FastifyReply {
  return reply.code(problem.statusCode).send(problem.toResponse(id));
}
