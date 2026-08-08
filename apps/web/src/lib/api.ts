/**
 * Typed API client — 11 §8.
 *
 *   "Centralize base URL, credentials mode, headers, timeout, correlation ID,
 *    and error decoding. Represent domain errors with stable machine codes and
 *    user-safe messages. Do not scatter raw `fetch` calls through components."
 */

import type {
  CaseStatus,
  ComparisonOutcome,
  Severity,
} from '@us24/domain';

const BASE = '/v1';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    override readonly message: string,
    readonly correlationId: string,
    readonly status: number,
    readonly details?: readonly { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let payload: {
      code?: string;
      message?: string;
      correlationId?: string;
      details?: { path: string; message: string }[];
    } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // A non-JSON error body is still surfaced with a safe message.
    }
    throw new ApiError(
      payload.code ?? 'INTERNAL_ERROR',
      payload.message ?? 'The request could not be completed.',
      payload.correlationId ?? 'unknown',
      response.status,
      payload.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ---------------------------------------------------------------- Types

export interface FieldComparisonDto {
  fieldKey: string;
  outcome: ComparisonOutcome;
  severity: Severity;
  isVisible: boolean;
  isRequired: boolean;
  isCritical: boolean;
  formRaw: string | null;
  formDisplay: string | null;
  formCanonical: unknown;
  supportedDisplay: string | null;
  supportedCanonical: unknown;
  supportedSourceType: string | null;
  competingCandidates: {
    candidateId: string;
    rawValue: string;
    confidence: number;
    evidence: { excerpt: string; timestampStart?: number; artifactLabel: string };
  }[];
  supersededCandidates: {
    candidateId: string;
    rawValue: string;
    evidence: { excerpt: string; timestampStart?: number };
  }[];
  evidence: {
    excerpt: string;
    timestampStart?: number;
    page?: number;
    artifactLabel: string;
    speakerRole?: string;
  } | null;
  confidence: number | null;
  derivation: { formula: string; ruleId: string; operands: string[] } | null;
  message: string;
  ruleCode: string;
  actions: string[];
  notes: string[];
  formSteps: string[];
  supportedSteps: string[];
}

export interface CaseSnapshotDto {
  case: {
    id: string;
    mode: 'AUTO_FILL' | 'AUDIT';
    workflow_state: string;
    case_status: CaseStatus | null;
    patient_label: string | null;
    payer_label: string | null;
    service_type: string | null;
    current_revision_id: string | null;
    latest_comparison_run_id: string | null;
    operator_label: string | null;
    base_record_id: string | null;
    created_at: string;
    updated_at: string;
  };
  comparisons: FieldComparisonDto[];
  status: {
    status: CaseStatus;
    incomplete: boolean;
    counts: {
      total: number;
      visible: number;
      match: number;
      mismatch: number;
      notFoundInSource: number;
      missing: number;
      conflict: number;
      lowConfidence: number;
      bypassed: number;
      derived: number;
      masterSupported: number;
      notApplicable: number;
      unresolved: number;
      completionPercent: number;
      matchPercent: number;
    };
    reasons: {
      fieldKey: string;
      outcome: ComparisonOutcome;
      severity: Severity;
      isCritical: boolean;
      message: string;
      ruleCode: string;
    }[];
    ruleSetVersion: string;
    dictionaryVersion: string;
    evaluatedAt: string;
  } | null;
  freshness: { isStale: boolean; label: string | null; reason: string | null };
  documentGate: {
    allowed: string[];
    blocked: { type: string; reason: string }[];
  } | null;
  revisionId: string | null;
  originValues: Record<string, string | null>;
  currentValues: Record<string, string | null>;
}

export interface RegistryFieldDto {
  key: string;
  label: string;
  documentLabel: string | null;
  dataType: string;
  control: string;
  options: { value: string; label: string; isUnknownFamily?: boolean }[] | null;
  helpText: string;
  examples: string[];
  temporalClass: string;
  requiredKind: string;
  requiredPendingClient: boolean;
  criticalPendingClient: boolean;
  bypassAllowed: boolean;
  bypassReasons: string[];
  bypassReasonsRequiringNote: string[];
  hasDerivation: boolean;
  traceIds: string[];
}

export interface RegistryDto {
  matrixVersion: string;
  matrixPendingClient: boolean;
  dictionaryVersion: string;
  sections: {
    key: string;
    label: string;
    groups: { subgroup: string; label: string; fields: RegistryFieldDto[] }[];
  }[];
}

export interface TranscriptSegmentDto {
  id: string;
  ordinal: number;
  speaker_role: string;
  raw_speaker_label: string | null;
  timestamp_start: number | null;
  text: string;
  relevant: number;
}

export interface CaseRowDto {
  id: string;
  mode: string;
  workflow_state: string;
  case_status: CaseStatus | null;
  patient_label: string | null;
  payer_label: string | null;
  service_type: string | null;
  updated_at: string;
}

// -------------------------------------------------------------- Methods

export const api = {
  registry: () => request<RegistryDto>('/registry'),
  systemHealth: () => request<Record<string, never>>('/system/health'),

  listCases: (params: { status?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return request<{ items: CaseRowDto[] }>(`/cases?${query.toString()}`);
  },

  getCase: (caseId: string) => request<CaseSnapshotDto>(`/cases/${caseId}`),

  createCase: (body: { mode: 'AUTO_FILL' | 'AUDIT'; patientLabel?: string; payerLabel?: string }) =>
    request<{ id: string }>('/cases', { method: 'POST', body: JSON.stringify(body) }),

  attachTranscriptText: (caseId: string, text: string, label?: string) =>
    request<{ artifactId: string }>(`/cases/${caseId}/sources/transcript-text`, {
      method: 'POST',
      body: JSON.stringify({ text, label }),
    }),

  listSources: (caseId: string) =>
    request<{ items: Record<string, unknown>[] }>(`/cases/${caseId}/sources`),

  startProcessing: (caseId: string) =>
    request<CaseSnapshotDto>(`/cases/${caseId}/process`, { method: 'POST' }),

  cancelProcessing: (caseId: string) =>
    request<{ cancelled: boolean }>(`/cases/${caseId}/process/cancel`, { method: 'POST' }),

  retryStage: (caseId: string, stage: string) =>
    request<CaseSnapshotDto>(`/cases/${caseId}/process/retry`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    }),

  transcript: (caseId: string) =>
    request<{ segments: TranscriptSegmentDto[] }>(`/cases/${caseId}/transcript`),

  createRevision: (
    caseId: string,
    body: {
      baseRevisionId: string;
      changes: Record<string, string | null>;
      reason: 'MANUAL_EDIT' | 'APPLY_SUPPORTED_VALUE' | 'REVERT';
      explanation?: string;
    },
  ) =>
    request<{ revisionId: string; snapshot: CaseSnapshotDto }>(`/cases/${caseId}/revisions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listRevisions: (caseId: string) =>
    request<{ items: Record<string, unknown>[] }>(`/cases/${caseId}/revisions`),

  verify: (caseId: string, revisionId: string) =>
    request<CaseSnapshotDto>(`/cases/${caseId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ revisionId }),
    }),

  bypass: (
    caseId: string,
    fieldKey: string,
    body: { revisionId: string; reason: string; note?: string | null },
  ) =>
    request<{ bypassId: string; snapshot: CaseSnapshotDto }>(
      `/cases/${caseId}/fields/${encodeURIComponent(fieldKey)}/bypass`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  finalize: (
    caseId: string,
    body: {
      revisionId: string;
      comparisonRunId: string;
      documentType: string;
      templateVersionId: string;
    },
  ) =>
    request<{ documentId: string; filename: string; pageCount: number }>(
      `/cases/${caseId}/finalize`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  listDocuments: (caseId: string) =>
    request<{ items: Record<string, unknown>[] }>(`/cases/${caseId}/documents`),

  audit: (caseId: string) => request<{ items: Record<string, unknown>[] }>(`/cases/${caseId}/audit`),

  records: () =>
    request<{ baseRecords: Record<string, unknown>[]; cases: CaseRowDto[] }>('/records'),

  record: (recordId: string) =>
    request<{ record: Record<string, unknown>; versions: Record<string, unknown>[] }>(
      `/records/${recordId}`,
    ),

  carriers: () => request<{ items: Record<string, unknown>[] }>('/carriers'),

  carrier: (carrierId: string) =>
    request<{ versions: Record<string, unknown>[] }>(`/carriers/${carrierId}`),

  templates: () => request<{ items: Record<string, unknown>[]; note: string }>('/templates'),
};

/** Query keys — 11 §7 structured keys with narrow invalidation. */
export const queryKeys = {
  registry: ['registry'] as const,
  systemHealth: ['system', 'health'] as const,
  cases: (filter: string) => ['cases', filter] as const,
  case: (caseId: string) => ['case', caseId, 'summary'] as const,
  transcript: (caseId: string) => ['case', caseId, 'transcript'] as const,
  sources: (caseId: string) => ['case', caseId, 'sources'] as const,
  revisions: (caseId: string) => ['case', caseId, 'revisions'] as const,
  documents: (caseId: string) => ['case', caseId, 'documents'] as const,
  audit: (caseId: string) => ['case', caseId, 'audit'] as const,
  records: ['records'] as const,
  record: (id: string) => ['records', id] as const,
  carriers: ['carriers'] as const,
  carrier: (id: string) => ['carriers', id] as const,
  templates: ['templates'] as const,
};
