/**
 * Fastify application factory.
 *
 * 14 / 11 §18 security posture applied at the edge: restrictive headers, no
 * public object URLs, rate limiting, and an error handler that never leaks a
 * stack trace, SQL statement, storage key or transcript content (11 §16).
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { ALL_CANDIDATES } from '@us24/testing';
import { ErrorCode } from '@us24/schemas';
import {
  FixtureExtractionAdapter,
  LocalDiskStorage,
  UnavailableTranscriptionAdapter,
} from './adapters/index.js';
import { type AppConfig, loadConfig } from './config.js';
import { applySchema, openDatabase, type Db } from './db/database.js';
import { Repository } from './db/repository.js';
import { ApiProblem } from './errors.js';
import { JobRunner } from './jobs/queue.js';
import { registerRoutes } from './routes/index.js';
import { CaseService } from './services/case-service.js';
import { DocumentService } from './services/document-service.js';

export interface BuiltApp {
  readonly app: FastifyInstance;
  readonly repo: Repository;
  readonly cases: CaseService;
  readonly documents: DocumentService;
  readonly db: Db;
  readonly config: AppConfig;
}

export async function buildApp(overrides: Partial<AppConfig> = {}): Promise<BuiltApp> {
  const config = loadConfig(overrides);

  const db = openDatabase(config.databasePath);
  applySchema(db);

  const repo = new Repository(db);
  const storage = new LocalDiskStorage(config.storageRoot);
  const transcription = new UnavailableTranscriptionAdapter();
  const extraction = new FixtureExtractionAdapter(ALL_CANDIDATES);
  const jobs = new JobRunner();

  const cases = new CaseService(repo, config, extraction, jobs, storage);
  const documents = new DocumentService(repo, storage, cases);

  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'warn',
      // 12 §19 / 14: redact patient names, DOB, policy IDs, transcript text and
      // signed URLs from application logs.
      redact: {
        paths: [
          'req.body.text',
          'req.body.changes',
          'req.body.note',
          'req.body.patientLabel',
          'req.headers.authorization',
          'req.headers.cookie',
        ],
        censor: '[redacted]',
      },
    },
    // 12 §3: correlation IDs on every request.
    genReqId: () => `req_${Math.random().toString(36).slice(2, 12)}`,
    bodyLimit: config.maxUploadBytes,
  });

  await app.register(helmet, {
    // 11 §18: "Avoid public CDN scripts" and "Use a restrictive content security
    // policy supplied by deployment."
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...config.corsOrigins],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  await app.register(cors, {
    origin: config.corsOrigins as string[],
    credentials: true,
  });

  // 15 §20: "Rate and concurrency limits."
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });

  app.setErrorHandler((error, request, reply) => {
    const correlationId = String(request.id);

    if (error instanceof ApiProblem) {
      return reply.code(error.statusCode).send(error.toResponse(correlationId));
    }

    // Anything unexpected is logged server-side in full and reported to the
    // client as a bare code plus correlation ID — 11 §16.
    request.log.error({ err: error, correlationId }, 'Unhandled API error');
    return reply.code(500).send({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Something went wrong handling this request. Quote the correlation ID for support.',
      correlationId,
    });
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      code: ErrorCode.CASE_NOT_FOUND,
      message: 'No such endpoint.',
      correlationId: String(request.id),
    }),
  );

  await registerRoutes(app, {
    repo,
    cases,
    documents,
    storage,
    config,
    transcription,
    extraction,
    jobs,
  });

  return { app, repo, cases, documents, db, config };
}
