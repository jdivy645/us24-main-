/**
 * Deterministic status precedence — 08 §20 and 09 §3.
 *
 *   "If any configured failure condition exists, case status is FAILED.
 *    Else if any configured review condition exists, case status is NEEDS REVIEW.
 *    Else if all required conditions are satisfied, case status is PASSED.
 *    Else the case remains DRAFT or incomplete.
 *    Aggregate percentages never override this precedence."
 *
 * 09 §3 adds: "A single critical mismatch can fail a case even when every other
 * field matches" and "A high completion or match percentage cannot override
 * criticality." Match and completion percentages are therefore computed for
 * display only and are never consulted by `calculateCaseStatus`.
 */

import { CaseStatus, ComparisonOutcome, Severity, SEVERITY_RANK } from '../types/enums.js';
import type { VobFieldKey } from '../types/field-keys.js';
import type { FieldComparison } from '../compare/pipeline.js';

export interface StatusCounts {
  readonly total: number;
  readonly visible: number;
  readonly match: number;
  /** True contradictions only. Kept distinct from `notFoundInSource` — 10 §9 lists
   *  "Mismatch count" as its own column, and a value the call never mentioned is
   *  not the same finding as one the call contradicts. */
  readonly mismatch: number;
  readonly notFoundInSource: number;
  readonly missing: number;
  readonly conflict: number;
  readonly lowConfidence: number;
  readonly bypassed: number;
  readonly derived: number;
  readonly masterSupported: number;
  readonly notApplicable: number;
  readonly unresolved: number;
  /** Display only. 09 §3 forbids these from influencing the outcome. */
  readonly completionPercent: number;
  readonly matchPercent: number;
}

export interface StatusReason {
  readonly fieldKey: VobFieldKey;
  readonly outcome: ComparisonOutcome;
  readonly severity: Severity;
  readonly isCritical: boolean;
  readonly message: string;
  readonly ruleCode: string;
}

export interface CaseStatusResult {
  readonly status: CaseStatus;
  /** True when no comparison has run or required work is incomplete. */
  readonly incomplete: boolean;
  readonly counts: StatusCounts;
  /** Ordered most severe first — drives "why is this FAILED?" in 05 §10. */
  readonly reasons: readonly StatusReason[];
  readonly ruleSetVersion: string;
  readonly dictionaryVersion: string;
  readonly revisionId: string;
  readonly evaluatedAt: string;
}

export interface StatusInput {
  readonly comparisons: readonly FieldComparison[];
  readonly ruleSetVersion: string;
  readonly dictionaryVersion: string;
  readonly revisionId: string;
  /** Supplied by the caller so the domain stays free of clock access. */
  readonly evaluatedAt: string;
}

function countOutcomes(comparisons: readonly FieldComparison[]): StatusCounts {
  const visible = comparisons.filter((c) => c.isVisible);
  let match = 0, mismatch = 0, notFoundInSource = 0, missing = 0, conflict = 0, lowConfidence = 0;
  let bypassed = 0, derived = 0, masterSupported = 0, notApplicable = 0;
  let answered = 0;

  for (const c of visible) {
    switch (c.outcome) {
      case ComparisonOutcome.MATCH: match++; answered++; break;
      case ComparisonOutcome.MISMATCH: mismatch++; answered++; break;
      case ComparisonOutcome.MISSING_IN_FORM: missing++; break;
      case ComparisonOutcome.NOT_FOUND_IN_SOURCE: notFoundInSource++; answered++; break;
      case ComparisonOutcome.CONFLICT_IN_SOURCE: conflict++; break;
      case ComparisonOutcome.LOW_CONFIDENCE: lowConfidence++; break;
      case ComparisonOutcome.PAYER_UNABLE_TO_VERIFY: lowConfidence++; break;
      case ComparisonOutcome.OUT_OF_SCOPE_SOURCE: lowConfidence++; break;
      case ComparisonOutcome.BYPASSED: bypassed++; answered++; break;
      case ComparisonOutcome.DERIVED_SUPPORTED: derived++; answered++; break;
      case ComparisonOutcome.MASTER_DATA_SUPPORTED: masterSupported++; answered++; break;
      case ComparisonOutcome.MANUALLY_APPROVED: answered++; break;
      case ComparisonOutcome.NOT_APPLICABLE: notApplicable++; break;
      case ComparisonOutcome.UNKNOWN:
      case ComparisonOutcome.NOT_EVALUATED:
        if (c.formCanonical !== null) answered++;
        break;
    }
  }

  const unresolved = visible.filter(
    (c) => SEVERITY_RANK[c.severity] >= SEVERITY_RANK[Severity.REVIEW],
  ).length;

  const comparable = match + mismatch;
  const denominator = visible.length - notApplicable;

  return {
    total: comparisons.length,
    visible: visible.length,
    match,
    mismatch,
    notFoundInSource,
    missing,
    conflict,
    lowConfidence,
    bypassed,
    derived,
    masterSupported,
    notApplicable,
    unresolved,
    completionPercent: denominator > 0 ? Math.round((answered / denominator) * 100) : 0,
    matchPercent: comparable > 0 ? Math.round((match / comparable) * 100) : 0,
  };
}

/**
 * The one function permitted to decide a business outcome.
 *
 * ADR-005: no model output reaches this code path. Its inputs are field
 * comparisons produced by deterministic rules and a versioned rule set.
 */
export function calculateCaseStatus(input: StatusInput): CaseStatusResult {
  const { comparisons } = input;
  const visible = comparisons.filter((c) => c.isVisible);
  const counts = countOutcomes(comparisons);

  const reasons: StatusReason[] = visible
    .filter((c) => SEVERITY_RANK[c.severity] >= SEVERITY_RANK[Severity.REVIEW])
    .map((c) => ({
      fieldKey: c.fieldKey,
      outcome: c.outcome,
      severity: c.severity,
      isCritical: c.isCritical,
      message: c.message,
      ruleCode: c.ruleCode,
    }))
    .sort((a, b) => {
      const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (bySeverity !== 0) return bySeverity;
      return Number(b.isCritical) - Number(a.isCritical);
    });

  const hasFailure = visible.some((c) => c.severity === Severity.FAILURE);
  const hasReview = visible.some((c) => c.severity === Severity.REVIEW);

  // Nothing has been compared yet — the case is a draft, not a pass.
  const anyEvaluated = visible.some((c) => c.outcome !== ComparisonOutcome.NOT_EVALUATED);

  const base = {
    counts,
    reasons,
    ruleSetVersion: input.ruleSetVersion,
    dictionaryVersion: input.dictionaryVersion,
    revisionId: input.revisionId,
    evaluatedAt: input.evaluatedAt,
  };

  if (hasFailure) return { ...base, status: CaseStatus.FAILED, incomplete: false };
  if (hasReview) return { ...base, status: CaseStatus.NEEDS_REVIEW, incomplete: false };
  if (!anyEvaluated) {
    // 08 §20: "Else the case remains DRAFT or incomplete." Reported as
    // NEEDS_REVIEW with `incomplete` set, because DRAFT is a workflow state
    // (09 §1) and must not be returned as an audit outcome.
    return { ...base, status: CaseStatus.NEEDS_REVIEW, incomplete: true };
  }
  return { ...base, status: CaseStatus.PASSED, incomplete: false };
}

// ---------------------------------------------------------------------------
// Freshness — 09 §15
// ---------------------------------------------------------------------------

export interface FreshnessInput {
  /** Revision the last comparison ran against. */
  readonly comparedRevisionId: string | null;
  /** Revision currently being edited. */
  readonly currentRevisionId: string;
  readonly comparedRuleSetVersion: string | null;
  readonly currentRuleSetVersion: string;
  /** Set when a source artifact was replaced after the comparison. */
  readonly sourcesChangedAfterComparison?: boolean;
}

export interface FreshnessResult {
  readonly isStale: boolean;
  /** Shown in the case header — 09 §15: "Changes not verified". */
  readonly label: string | null;
  readonly reason: string | null;
}

/**
 * 09 §15: "Every form change marks the last comparison stale" and
 * "Finalization is disabled when the current revision has no fresh result."
 */
export function evaluateFreshness(input: FreshnessInput): FreshnessResult {
  if (input.comparedRevisionId === null) {
    return {
      isStale: true,
      label: 'Not verified',
      reason: 'This revision has not been verified yet.',
    };
  }
  if (input.sourcesChangedAfterComparison) {
    return {
      isStale: true,
      label: 'Sources changed',
      reason: 'A source was replaced after the last verification, so extraction and comparison are out of date.',
    };
  }
  if (input.comparedRevisionId !== input.currentRevisionId) {
    return {
      isStale: true,
      label: 'Changes not verified',
      reason: 'The form has changed since the last verification.',
    };
  }
  if (
    input.comparedRuleSetVersion !== null &&
    input.comparedRuleSetVersion !== input.currentRuleSetVersion
  ) {
    return {
      isStale: true,
      label: 'Rules updated',
      reason: 'The field rules changed after this result was produced.',
    };
  }
  return { isStale: false, label: null, reason: null };
}

// ---------------------------------------------------------------------------
// Document gating — 09 §16 and 13 §11
// ---------------------------------------------------------------------------

export const DocumentType = {
  FINAL: 'FINAL',
  NEEDS_REVIEW_DRAFT: 'NEEDS_REVIEW_DRAFT',
  QA_FAILED_DRAFT: 'QA_FAILED_DRAFT',
  QA_REPORT: 'QA_REPORT',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export interface DocumentGate {
  readonly allowed: readonly DocumentType[];
  readonly blocked: readonly { type: DocumentType; reason: string }[];
}

/**
 * 13 §11:
 *   PASSED permits a clean final VOB.
 *   FAILED permits an internal QA report and optionally a red QA FAILED draft.
 *   NEEDS REVIEW permits a QA report and an amber NEEDS REVIEW draft.
 *   DRAFT and PROCESSING do not permit a clean final VOB.
 *
 * 15 §22 release gate: "No accidental clean PDF for FAILED or unresolved NEEDS REVIEW."
 */
export function documentGate(status: CaseStatusResult, isStale: boolean): DocumentGate {
  if (isStale) {
    return {
      allowed: [DocumentType.QA_REPORT],
      blocked: [
        {
          type: DocumentType.FINAL,
          reason: 'The current revision has not been verified. Run Verify before finalizing.',
        },
        {
          type: DocumentType.NEEDS_REVIEW_DRAFT,
          reason: 'The current revision has not been verified.',
        },
        {
          type: DocumentType.QA_FAILED_DRAFT,
          reason: 'The current revision has not been verified.',
        },
      ],
    };
  }

  switch (status.status) {
    case CaseStatus.PASSED:
      return { allowed: [DocumentType.FINAL, DocumentType.QA_REPORT], blocked: [] };

    case CaseStatus.FAILED: {
      const failing = status.reasons.filter((r) => r.severity === Severity.FAILURE).length;
      return {
        allowed: [DocumentType.QA_FAILED_DRAFT, DocumentType.QA_REPORT],
        blocked: [
          {
            type: DocumentType.FINAL,
            reason: `This verification failed on ${failing} field${failing === 1 ? '' : 's'}. A clean final VOB cannot be generated until every failure is resolved and re-verified.`,
          },
        ],
      };
    }

    case CaseStatus.NEEDS_REVIEW:
      return {
        allowed: [DocumentType.NEEDS_REVIEW_DRAFT, DocumentType.QA_REPORT],
        blocked: [
          {
            type: DocumentType.FINAL,
            reason: `${status.counts.unresolved} item${
              status.counts.unresolved === 1 ? '' : 's'
            } still need review. Only a marked draft or internal QA report can be produced until they are resolved.`,
          },
        ],
      };
  }
}
