/**
 * Background job runner.
 *
 * ============================================================================
 * DEFERRAL — DECISION_LOG_ADDENDUM.md ADR-013.
 *
 * 12 §1 specifies Redis with BullMQ. Redis is not installed on the target
 * machine, so this is an in-process runner behind the interface BullMQ would
 * implement. It keeps the properties 12 §9 requires — idempotency keys, bounded
 * attempts, backoff, unrecoverable-error classification, cooperative
 * cancellation, and per-stage retry that resumes rather than restarting.
 *
 * Swapping in BullMQ replaces this file. Stage names below are 12 §8 verbatim.
 * ============================================================================
 */

export const QueueName = {
  ARTIFACT_VALIDATE: 'artifact-validate',
  DOCUMENT_PARSE: 'document-parse',
  AUDIO_PROBE: 'audio-probe',
  AUDIO_TRANSCODE: 'audio-transcode',
  AUDIO_CHUNK: 'audio-chunk',
  AUDIO_TRANSCRIBE: 'audio-transcribe',
  TRANSCRIPT_STITCH: 'transcript-stitch',
  SPEAKER_CLASSIFY: 'speaker-classify',
  RELEVANCE_CLASSIFY: 'relevance-classify',
  FACT_EXTRACT: 'fact-extract',
  FIELD_COMPARE: 'field-compare',
  PDF_GENERATE: 'pdf-generate',
  DOCUMENT_CONVERT: 'document-convert',
  RETENTION_CLEANUP: 'retention-cleanup',
  RINGCENTRAL_IMPORT: 'ringcentral-import',
} as const;
export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export interface JobContext {
  readonly signal: AbortSignal;
  readonly attempt: number;
}

export type JobHandler<T> = (payload: T, ctx: JobContext) => Promise<void>;

/** 12 §9: "Classify unrecoverable errors and stop retrying them." */
export class UnrecoverableJobError extends Error {
  constructor(
    override readonly message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'UnrecoverableJobError';
  }
}

export interface JobRecord {
  readonly id: string;
  readonly queue: QueueName;
  readonly idempotencyKey: string;
  status: 'QUEUED' | 'ACTIVE' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
  attempts: number;
  errorCode?: string;
}

export interface EnqueueOptions {
  /** 12 §9: "Every job has an idempotency key." */
  readonly idempotencyKey: string;
  readonly maxAttempts?: number;
  /** Grouping key so a whole case can be cancelled cooperatively. */
  readonly groupId: string;
}

export class JobRunner {
  private readonly handlers = new Map<QueueName, JobHandler<unknown>>();
  private readonly jobs = new Map<string, JobRecord>();
  private readonly completedKeys = new Set<string>();
  private readonly controllers = new Map<string, AbortController>();

  register<T>(queue: QueueName, handler: JobHandler<T>): void {
    this.handlers.set(queue, handler as JobHandler<unknown>);
  }

  /** Cancel every in-flight job for a case — 12 §9 cooperative cancellation. */
  cancelGroup(groupId: string): void {
    this.controllers.get(groupId)?.abort();
  }

  isCancelled(groupId: string): boolean {
    return this.controllers.get(groupId)?.signal.aborted ?? false;
  }

  resetGroup(groupId: string): void {
    this.controllers.set(groupId, new AbortController());
  }

  async run<T>(queue: QueueName, payload: T, options: EnqueueOptions): Promise<JobRecord> {
    // Idempotency: a repeated key is a no-op, so a retried request cannot
    // double-process a case (12 §9, 15 §16).
    if (this.completedKeys.has(options.idempotencyKey)) {
      return {
        id: options.idempotencyKey,
        queue,
        idempotencyKey: options.idempotencyKey,
        status: 'COMPLETE',
        attempts: 0,
      };
    }

    const handler = this.handlers.get(queue);
    if (!handler) throw new Error(`No handler registered for queue ${queue}`);

    if (!this.controllers.has(options.groupId)) this.resetGroup(options.groupId);
    const controller = this.controllers.get(options.groupId)!;

    const record: JobRecord = {
      id: options.idempotencyKey,
      queue,
      idempotencyKey: options.idempotencyKey,
      status: 'QUEUED',
      attempts: 0,
    };
    this.jobs.set(record.id, record);

    const maxAttempts = options.maxAttempts ?? 3;

    while (record.attempts < maxAttempts) {
      if (controller.signal.aborted) {
        record.status = 'CANCELLED';
        return record;
      }
      record.attempts += 1;
      record.status = 'ACTIVE';
      try {
        await handler(payload, { signal: controller.signal, attempt: record.attempts });
        record.status = 'COMPLETE';
        this.completedKeys.add(options.idempotencyKey);
        return record;
      } catch (error) {
        if (error instanceof UnrecoverableJobError) {
          record.status = 'FAILED';
          record.errorCode = error.code;
          return record;
        }
        if (record.attempts >= maxAttempts) {
          record.status = 'FAILED';
          record.errorCode = 'MAX_ATTEMPTS_EXCEEDED';
          return record;
        }
        // Exponential backoff — 12 §9. Short in-process so tests stay fast.
        await new Promise((r) => setTimeout(r, 2 ** record.attempts));
      }
    }
    return record;
  }

  listJobs(): readonly JobRecord[] {
    return [...this.jobs.values()];
  }

  /** 12 §9: successful stages are not re-run when a later stage is retried. */
  hasCompleted(idempotencyKey: string): boolean {
    return this.completedKeys.has(idempotencyKey);
  }

  clearCompleted(prefix: string): void {
    for (const key of this.completedKeys) {
      if (key.startsWith(prefix)) this.completedKeys.delete(key);
    }
  }
}
