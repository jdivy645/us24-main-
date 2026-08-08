/**
 * @us24/schemas — runtime validation at every boundary.
 *
 * Spec authority:
 *  - 11 §1 "Zod for shared runtime validation at client boundaries"
 *  - 12 §3 "Use JSON Schema to validate requests and serialize responses",
 *          "Return stable machine-readable error codes"
 *  - 08 §21 "Use a strict structured output schema; Reject unknown canonical
 *          field keys. Validate model output before persistence."
 *
 * The extraction schema is the security boundary for ADR-005. A model can only
 * ever produce candidates with evidence; there is no field in this contract that
 * could carry a field state or a case status.
 */

import { z } from 'zod';
import { FIELD_REGISTRY } from '@us24/domain';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * 08 §21: "Reject unknown canonical field keys." Built from the registry so a
 * model cannot invent a field, and so adding a field needs no schema edit.
 */
export const vobFieldKeySchema = z
  .string()
  .refine((k) => FIELD_REGISTRY.find(k) !== undefined, {
    message: 'Unknown canonical field key',
  });

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date');
export const isoDateTimeSchema = z.string().datetime({ message: 'Expected an ISO timestamp' });

export const speakerRoleSchema = z.enum([
  'PAYER_REPRESENTATIVE',
  'PAYER_SUPERVISOR',
  'CALLER',
  'IVR',
  'UNKNOWN',
]);

export const speechActSchema = z.enum([
  'ANSWER',
  'QUESTION',
  'CORRECTION',
  'NEGATION',
  'UNCERTAINTY',
  'UNAVAILABLE',
  'RESTATEMENT',
]);

export const sourceTypeSchema = z.enum([
  'TRANSCRIPT_REP_CONFIRMED',
  'TRANSCRIPT_CALLER_STATED',
  'TRANSCRIPT_IVR',
  'IMPORTED_COMPLETED_FORM',
  'PREFILLED_PATIENT_RECORD',
  'PREVIOUS_VOB',
  'CARRIER_MASTER',
  'DERIVED_CALCULATION',
  'MANUAL_ENTRY',
  'MANUAL_CORRECTION',
  'BYPASSED',
  'NOT_FOUND',
  'UNKNOWN',
]);

export const caseStatusSchema = z.enum(['PASSED', 'FAILED', 'NEEDS_REVIEW']);

export const workflowStateSchema = z.enum([
  'DRAFT',
  'UPLOADING',
  'PROCESSING',
  'READY',
  'FINALIZED',
  'ARCHIVED',
  'PROCESSING_FAILED',
]);

export const bypassReasonSchema = z.enum([
  'NOT_APPLICABLE',
  'PAYER_UNABLE_TO_VERIFY',
  'NOT_DISCLOSED_DURING_CALL',
  'DATA_UNAVAILABLE',
  'USE_APPROVED_CARRIER_MASTER',
  'TRANSCRIPT_QUALITY_INSUFFICIENT',
  'CLIENT_APPROVED_EXCEPTION',
  'SOURCE_SYSTEM_VALUE_ACCEPTED',
  'OTHER_WITH_REQUIRED_NOTE',
]);

export const caseModeSchema = z.enum(['AUTO_FILL', 'AUDIT']);

// ---------------------------------------------------------------------------
// Evidence and extraction — 08 §2, §3
// ---------------------------------------------------------------------------

export const evidenceRefSchema = z.object({
  evidenceId: z.string().min(1),
  artifactId: z.string().min(1),
  artifactLabel: z.string().min(1),
  segmentId: z.string().optional(),
  timestampStart: z.number().nonnegative().optional(),
  timestampEnd: z.number().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  sheet: z.string().optional(),
  cell: z.string().optional(),
  excerpt: z.string().min(1),
  speakerRole: speakerRoleSchema.optional(),
  rawSpeakerLabel: z.string().optional(),
  evidenceDeleted: z.boolean().optional(),
});

export const candidateScopeSchema = z.object({
  service: z.string().nullable().optional(),
  network: z.enum(['IN_NETWORK', 'OUT_OF_NETWORK', 'UNKNOWN', 'NOT_APPLICABLE']).nullable().optional(),
  benefitScope: z.enum(['INDIVIDUAL', 'FAMILY', 'COMBINED', 'UNKNOWN']).nullable().optional(),
  asOfDate: z.string().nullable().optional(),
  benefitPeriod: z.string().nullable().optional(),
  claimContext: z
    .enum(['ORIGINAL', 'CORRECTED_PRACTITIONER', 'CORRECTED_PAYER'])
    .nullable()
    .optional(),
  authorizationContext: z
    .enum(['INITIAL_EVALUATION', 'TREATMENT', 'MEDICAL_NECESSITY'])
    .nullable()
    .optional(),
});

/**
 * The extraction contract — 08 §2, §3.
 *
 * `.strict()` is deliberate: an extraction adapter that returns an unexpected
 * property is rejected rather than having it silently dropped. There is no
 * `outcome`, `status`, `severity` or `passed` field anywhere in this object,
 * and the test suite asserts that (ADR-005).
 */
export const extractedCandidateSchema = z
  .object({
    candidateId: z.string().min(1),
    fieldKey: vobFieldKeySchema,
    rawValue: z.string(),
    parsedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    sourceType: sourceTypeSchema,
    speakerRole: speakerRoleSchema,
    speechAct: speechActSchema,
    scope: candidateScopeSchema,
    evidence: evidenceRefSchema,
    confidence: z.number().min(0).max(1),
    confidenceRationale: z.string().optional(),
    supersedesCandidateId: z.string().optional(),
    supportsCandidateIds: z.array(z.string()).optional(),
  })
  .strict();

/** What an extraction adapter returns for one field — 08 §2. */
export const extractionFieldResultSchema = z
  .object({
    fieldKey: vobFieldKeySchema,
    candidates: z.array(extractedCandidateSchema),
    /** 08 §2: "Return notFound only after reviewing all relevant segments." */
    notFound: z.boolean().optional(),
  })
  .strict();

export const extractionRunResultSchema = z
  .object({
    runId: z.string().min(1),
    /** 12 §11: "Record provider and model version on every run." */
    provider: z.string().min(1),
    modelVersion: z.string().min(1),
    promptVersion: z.string().min(1),
    results: z.array(extractionFieldResultSchema),
  })
  .strict();

// ---------------------------------------------------------------------------
// API request bodies — 12 §4
// ---------------------------------------------------------------------------

export const createCaseRequestSchema = z.object({
  mode: caseModeSchema,
  patientLabel: z.string().max(120).optional(),
  payerLabel: z.string().max(120).optional(),
  serviceType: z.string().max(40).optional(),
  /** 12 §3: "Use idempotency keys for case creation." */
  idempotencyKey: z.string().min(8).max(128).optional(),
  baseRecordId: z.string().optional(),
});

export const createUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  byteSize: z.number().int().positive(),
  kind: z.enum(['TRANSCRIPT', 'AUDIO', 'COMPLETED_FORM', 'PREVIOUS_VOB']),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
});

export const pasteTranscriptRequestSchema = z.object({
  text: z.string().min(1).max(2_000_000),
  label: z.string().max(255).optional(),
});

/**
 * A revision patch. 12 §3: "Use optimistic concurrency tokens for editable
 * revisions." ADR-006: edits create a new revision; they never mutate one.
 */
export const createRevisionRequestSchema = z.object({
  baseRevisionId: z.string().min(1),
  changes: z.record(vobFieldKeySchema, z.string().nullable()),
  reason: z.enum(['MANUAL_EDIT', 'APPLY_SUPPORTED_VALUE', 'REVERT']),
  /** Required when overriding a clearly supported value — 09 §13. */
  explanation: z.string().max(2000).optional(),
});

export const bypassRequestSchema = z.object({
  revisionId: z.string().min(1),
  reason: bypassReasonSchema,
  note: z.string().max(2000).nullable().optional(),
});

export const verifyRequestSchema = z.object({
  revisionId: z.string().min(1),
});

export const finalizeRequestSchema = z.object({
  revisionId: z.string().min(1),
  comparisonRunId: z.string().min(1),
  documentType: z.enum(['FINAL', 'NEEDS_REVIEW_DRAFT', 'QA_FAILED_DRAFT', 'QA_REPORT']),
  templateVersionId: z.string().min(1),
  confirmUnresolved: z.boolean().optional(),
});

export const recordsQuerySchema = z.object({
  status: z.union([caseStatusSchema, z.literal('DRAFT')]).optional(),
  search: z.string().max(120).optional(),
  payer: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const carrierVersionRequestSchema = z.object({
  scope: z.object({
    carrier: z.string().min(1),
    planName: z.string().optional(),
    lineOfBusiness: z.string().optional(),
    stateOrMarket: z.string().optional(),
    network: z.string().optional(),
    serviceType: z.string().optional(),
  }),
  effectiveFrom: isoDateSchema,
  effectiveThrough: isoDateSchema.optional(),
  values: z.record(vobFieldKeySchema, z.string().nullable()),
  changeReason: z.string().min(1).max(1000),
});

// ---------------------------------------------------------------------------
// Error envelope — 12 §3
// ---------------------------------------------------------------------------

/**
 * 12 §3: "Return stable machine-readable error codes" and "Include correlation
 * IDs". 11 §16: "Do not expose stack traces, SQL, object keys, provider secrets,
 * or transcript content in generic errors."
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/** Stable machine codes. Adding one is a contract change. */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CASE_NOT_FOUND: 'CASE_NOT_FOUND',
  REVISION_NOT_FOUND: 'REVISION_NOT_FOUND',
  REVISION_CONFLICT: 'REVISION_CONFLICT',
  UNKNOWN_FIELD: 'UNKNOWN_FIELD',
  BYPASS_NOT_PERMITTED: 'BYPASS_NOT_PERMITTED',
  NOTE_REQUIRED: 'NOTE_REQUIRED',
  DOCUMENT_NOT_PERMITTED: 'DOCUMENT_NOT_PERMITTED',
  STALE_COMPARISON: 'STALE_COMPARISON',
  UPLOAD_REJECTED: 'UPLOAD_REJECTED',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  IMAGE_ONLY_PDF: 'IMAGE_ONLY_PDF',
  DUPLICATE_ARTIFACT: 'DUPLICATE_ARTIFACT',
  INTEGRATION_NOT_CONFIGURED: 'INTEGRATION_NOT_CONFIGURED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// Processing events — 12 §17
// ---------------------------------------------------------------------------

export const processingStageSchema = z.enum([
  'UPLOAD',
  'VALIDATE',
  'PARSE_OR_TRANSCRIBE',
  'IDENTIFY_SPEAKERS',
  'EXTRACT_FACTS',
  'COMPARE',
  'PREPARE_WORKSPACE',
]);

export const stageStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'COMPLETE',
  'WARNING',
  'FAILED',
  'SKIPPED',
]);

/**
 * 12 §17: "Use monotonically increasing event sequence numbers", "Keep event
 * payloads compact and non-sensitive", "Do not display sensitive payloads".
 * Note there is no free-text field carrying transcript content.
 */
export const processingEventSchema = z.object({
  sequence: z.number().int().nonnegative(),
  caseId: z.string(),
  stage: processingStageSchema,
  status: stageStatusSchema,
  /** A message CODE, resolved to wording client-side — keeps PHI out of the stream. */
  messageCode: z.string(),
  units: z.object({ done: z.number(), total: z.number() }).optional(),
  at: isoDateTimeSchema,
  terminal: z.boolean().optional(),
});

export type ProcessingEvent = z.infer<typeof processingEventSchema>;
export type ProcessingStage = z.infer<typeof processingStageSchema>;
export type StageStatus = z.infer<typeof stageStatusSchema>;

export type CreateCaseRequest = z.infer<typeof createCaseRequestSchema>;
export type CreateRevisionRequest = z.infer<typeof createRevisionRequestSchema>;
export type BypassRequest = z.infer<typeof bypassRequestSchema>;
export type FinalizeRequest = z.infer<typeof finalizeRequestSchema>;
export type ExtractedCandidateDto = z.infer<typeof extractedCandidateSchema>;
export type ExtractionRunResult = z.infer<typeof extractionRunResultSchema>;
export type CaseMode = z.infer<typeof caseModeSchema>;
