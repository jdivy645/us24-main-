/**
 * Canonical domain enumerations.
 *
 * Spec authority:
 *  - 06_VOB_FORM_FIELD_ENGINE.md §5 (source types), §16 (requiredness), §15 (temporal class)
 *  - 08_EXTRACTION_NORMALIZATION_COMPARISON.md §17 (comparison outcomes)
 *  - 09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md §1 (workflow vs outcome), §2 (field states), §10 (bypass)
 *
 * Every enum here is a `const` object plus a derived union type rather than a TS `enum`,
 * so the values are plain serializable strings that cross the API boundary unchanged.
 */

// ---------------------------------------------------------------------------
// Business outcome vs workflow state — 09 §1
// "Do not mix PROCESSING with FAILED; processing failure is an operational state."
// ---------------------------------------------------------------------------

/** The three business audit outcomes. Nothing else may be reported as a result. */
export const CaseStatus = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

/** Workflow states. Deliberately disjoint from CaseStatus — 09 §1. */
export const WorkflowState = {
  DRAFT: 'DRAFT',
  UPLOADING: 'UPLOADING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FINALIZED: 'FINALIZED',
  ARCHIVED: 'ARCHIVED',
  /** Operational failure with its own reason — NOT the FAILED audit outcome. */
  PROCESSING_FAILED: 'PROCESSING_FAILED',
} as const;
export type WorkflowState = (typeof WorkflowState)[keyof typeof WorkflowState];

// ---------------------------------------------------------------------------
// Source types — 06 §5
// ---------------------------------------------------------------------------

export const SourceType = {
  TRANSCRIPT_REP_CONFIRMED: 'TRANSCRIPT_REP_CONFIRMED',
  TRANSCRIPT_CALLER_STATED: 'TRANSCRIPT_CALLER_STATED',
  TRANSCRIPT_IVR: 'TRANSCRIPT_IVR',
  IMPORTED_COMPLETED_FORM: 'IMPORTED_COMPLETED_FORM',
  PREFILLED_PATIENT_RECORD: 'PREFILLED_PATIENT_RECORD',
  PREVIOUS_VOB: 'PREVIOUS_VOB',
  CARRIER_MASTER: 'CARRIER_MASTER',
  DERIVED_CALCULATION: 'DERIVED_CALCULATION',
  MANUAL_ENTRY: 'MANUAL_ENTRY',
  MANUAL_CORRECTION: 'MANUAL_CORRECTION',
  BYPASSED: 'BYPASSED',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
} as const;
export type SourceType = (typeof SourceType)[keyof typeof SourceType];

/**
 * Human-readable source wording — 06 §5 ("does not expose internal enum text to
 * normal users") and 04 §14 (provenance wording standards).
 */
export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  TRANSCRIPT_REP_CONFIRMED: 'Representative confirmed',
  TRANSCRIPT_CALLER_STATED: 'Caller stated',
  TRANSCRIPT_IVR: 'Automated phone system',
  IMPORTED_COMPLETED_FORM: 'Imported form',
  PREFILLED_PATIENT_RECORD: 'Patient record',
  PREVIOUS_VOB: 'Previous VOB',
  CARRIER_MASTER: 'Carrier master',
  DERIVED_CALCULATION: 'Derived calculation',
  MANUAL_ENTRY: 'Entered manually',
  MANUAL_CORRECTION: 'Corrected manually',
  BYPASSED: 'Bypassed',
  NOT_FOUND: 'Not found in sources',
  UNKNOWN: 'Unknown',
};

// ---------------------------------------------------------------------------
// Comparison outcome / field state — union of 08 §17 and 09 §2
// ---------------------------------------------------------------------------

export const ComparisonOutcome = {
  MATCH: 'MATCH',
  MISMATCH: 'MISMATCH',
  MISSING_IN_FORM: 'MISSING_IN_FORM',
  NOT_FOUND_IN_SOURCE: 'NOT_FOUND_IN_SOURCE',
  CONFLICT_IN_SOURCE: 'CONFLICT_IN_SOURCE',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  MASTER_DATA_SUPPORTED: 'MASTER_DATA_SUPPORTED',
  DERIVED_SUPPORTED: 'DERIVED_SUPPORTED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  BYPASSED: 'BYPASSED',
  MANUALLY_APPROVED: 'MANUALLY_APPROVED',
  UNKNOWN: 'UNKNOWN',
  PAYER_UNABLE_TO_VERIFY: 'PAYER_UNABLE_TO_VERIFY',
  OUT_OF_SCOPE_SOURCE: 'OUT_OF_SCOPE_SOURCE',
  /** Field has not been compared yet — neutral default, 09 §6. */
  NOT_EVALUATED: 'NOT_EVALUATED',
} as const;
export type ComparisonOutcome = (typeof ComparisonOutcome)[keyof typeof ComparisonOutcome];

/**
 * Presentation band per 09 §4-§6. Never the sole carrier of meaning — every
 * band is always accompanied by icon + text (04 §2 "Never use color alone").
 */
export const OutcomeBand = {
  NEUTRAL: 'NEUTRAL',
  SUCCESS: 'SUCCESS',
  DANGER: 'DANGER',
  REVIEW: 'REVIEW',
  INFO: 'INFO',
  MUTED: 'MUTED',
} as const;
export type OutcomeBand = (typeof OutcomeBand)[keyof typeof OutcomeBand];

export const OUTCOME_BAND: Record<ComparisonOutcome, OutcomeBand> = {
  MATCH: OutcomeBand.SUCCESS,
  MISMATCH: OutcomeBand.DANGER,
  MISSING_IN_FORM: OutcomeBand.DANGER,
  NOT_FOUND_IN_SOURCE: OutcomeBand.DANGER,
  CONFLICT_IN_SOURCE: OutcomeBand.REVIEW,
  LOW_CONFIDENCE: OutcomeBand.REVIEW,
  MASTER_DATA_SUPPORTED: OutcomeBand.INFO,
  DERIVED_SUPPORTED: OutcomeBand.INFO,
  NOT_APPLICABLE: OutcomeBand.MUTED,
  BYPASSED: OutcomeBand.MUTED,
  MANUALLY_APPROVED: OutcomeBand.INFO,
  UNKNOWN: OutcomeBand.REVIEW,
  PAYER_UNABLE_TO_VERIFY: OutcomeBand.REVIEW,
  OUT_OF_SCOPE_SOURCE: OutcomeBand.REVIEW,
  NOT_EVALUATED: OutcomeBand.NEUTRAL,
};

/** User-facing outcome wording — 04 §14 ("Needs review", not "AI uncertain"). */
export const OUTCOME_LABEL: Record<ComparisonOutcome, string> = {
  MATCH: 'Match',
  MISMATCH: 'Mismatch',
  MISSING_IN_FORM: 'Missing required value',
  NOT_FOUND_IN_SOURCE: 'Not found in sources',
  CONFLICT_IN_SOURCE: 'Needs review — conflicting values',
  LOW_CONFIDENCE: 'Needs review — unclear source',
  MASTER_DATA_SUPPORTED: 'From carrier master',
  DERIVED_SUPPORTED: 'Derived calculation',
  NOT_APPLICABLE: 'Not applicable',
  BYPASSED: 'Bypassed',
  MANUALLY_APPROVED: 'Manually approved',
  UNKNOWN: 'Unknown',
  PAYER_UNABLE_TO_VERIFY: 'Payer unable to verify',
  OUT_OF_SCOPE_SOURCE: 'Needs review — different scope',
  NOT_EVALUATED: 'Not verified yet',
};

// ---------------------------------------------------------------------------
// Severity — drives status precedence, 08 §20 / 09 §3
// ---------------------------------------------------------------------------

export const Severity = {
  NONE: 'NONE',
  INFO: 'INFO',
  REVIEW: 'REVIEW',
  FAILURE: 'FAILURE',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const SEVERITY_RANK: Record<Severity, number> = {
  NONE: 0,
  INFO: 1,
  REVIEW: 2,
  FAILURE: 3,
};

// ---------------------------------------------------------------------------
// Requiredness — 06 §16. The matrix is DATA, never hard-coded JSX.
// ---------------------------------------------------------------------------

export const RequirednessKind = {
  ALWAYS_REQUIRED: 'ALWAYS_REQUIRED',
  REQUIRED_WHEN: 'REQUIRED_WHEN',
  OPTIONAL: 'OPTIONAL',
  REVIEW_IF_MISSING: 'REVIEW_IF_MISSING',
  FAIL_IF_MISSING: 'FAIL_IF_MISSING',
  MASTER_OR_TRANSCRIPT_REQUIRED: 'MASTER_OR_TRANSCRIPT_REQUIRED',
  SYSTEM_GENERATED: 'SYSTEM_GENERATED',
} as const;
export type RequirednessKind = (typeof RequirednessKind)[keyof typeof RequirednessKind];

// ---------------------------------------------------------------------------
// Temporal class — 06 §15. Controls prefill warnings and repeat-VOB behavior.
// ---------------------------------------------------------------------------

export const TemporalClass = {
  STABLE: 'stable',
  DYNAMIC: 'dynamic',
  DERIVED: 'derived',
  SYSTEM: 'system',
} as const;
export type TemporalClass = (typeof TemporalClass)[keyof typeof TemporalClass];

// ---------------------------------------------------------------------------
// Bypass reasons — 09 §10. A generic "Ignore" reason is PROHIBITED.
// ---------------------------------------------------------------------------

export const BypassReason = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  PAYER_UNABLE_TO_VERIFY: 'PAYER_UNABLE_TO_VERIFY',
  NOT_DISCLOSED_DURING_CALL: 'NOT_DISCLOSED_DURING_CALL',
  DATA_UNAVAILABLE: 'DATA_UNAVAILABLE',
  USE_APPROVED_CARRIER_MASTER: 'USE_APPROVED_CARRIER_MASTER',
  TRANSCRIPT_QUALITY_INSUFFICIENT: 'TRANSCRIPT_QUALITY_INSUFFICIENT',
  CLIENT_APPROVED_EXCEPTION: 'CLIENT_APPROVED_EXCEPTION',
  SOURCE_SYSTEM_VALUE_ACCEPTED: 'SOURCE_SYSTEM_VALUE_ACCEPTED',
  OTHER_WITH_REQUIRED_NOTE: 'OTHER_WITH_REQUIRED_NOTE',
} as const;
export type BypassReason = (typeof BypassReason)[keyof typeof BypassReason];

/** Friendly wording; the enum stays stable — 09 §10. */
export const BYPASS_REASON_LABEL: Record<BypassReason, string> = {
  NOT_APPLICABLE: 'Not applicable to this case',
  PAYER_UNABLE_TO_VERIFY: 'Payer could not verify this',
  NOT_DISCLOSED_DURING_CALL: 'Not disclosed during the call',
  DATA_UNAVAILABLE: 'Data unavailable',
  USE_APPROVED_CARRIER_MASTER: 'Use approved carrier master value',
  TRANSCRIPT_QUALITY_INSUFFICIENT: 'Transcript or audio quality insufficient',
  CLIENT_APPROVED_EXCEPTION: 'Client-approved exception',
  SOURCE_SYSTEM_VALUE_ACCEPTED: 'Source-system value accepted',
  OTHER_WITH_REQUIRED_NOTE: 'Other (note required)',
};

// ---------------------------------------------------------------------------
// Transcript speaker and speech-act classification — 08 §2, §4, §5
// ---------------------------------------------------------------------------

export const SpeakerRole = {
  PAYER_REPRESENTATIVE: 'PAYER_REPRESENTATIVE',
  PAYER_SUPERVISOR: 'PAYER_SUPERVISOR',
  CALLER: 'CALLER',
  IVR: 'IVR',
  UNKNOWN: 'UNKNOWN',
} as const;
export type SpeakerRole = (typeof SpeakerRole)[keyof typeof SpeakerRole];

export const SPEAKER_ROLE_LABEL: Record<SpeakerRole, string> = {
  PAYER_REPRESENTATIVE: 'Representative',
  PAYER_SUPERVISOR: 'Supervisor',
  CALLER: 'Caller',
  IVR: 'Automated phone system',
  UNKNOWN: 'Unidentified speaker',
};

export const SpeechAct = {
  ANSWER: 'ANSWER',
  QUESTION: 'QUESTION',
  CORRECTION: 'CORRECTION',
  NEGATION: 'NEGATION',
  UNCERTAINTY: 'UNCERTAINTY',
  UNAVAILABLE: 'UNAVAILABLE',
  RESTATEMENT: 'RESTATEMENT',
} as const;
export type SpeechAct = (typeof SpeechAct)[keyof typeof SpeechAct];

// ---------------------------------------------------------------------------
// Field data and control types — 06 §2
// ---------------------------------------------------------------------------

export const FieldDataType = {
  TEXT: 'text',
  LONG_TEXT: 'longText',
  IDENTIFIER: 'identifier',
  PHONE: 'phone',
  ADDRESS: 'address',
  DATE: 'date',
  DATE_TIME: 'dateTime',
  MONEY: 'money',
  PERCENT: 'percent',
  INTEGER: 'integer',
  CATEGORICAL: 'categorical',
} as const;
export type FieldDataType = (typeof FieldDataType)[keyof typeof FieldDataType];

export const FieldControlType = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  DATE: 'date',
  DATE_TIME: 'dateTime',
  MONEY: 'money',
  PERCENT: 'percent',
  NUMBER: 'number',
  PHONE: 'phone',
  ADDRESS: 'address',
  READ_ONLY: 'readOnly',
} as const;
export type FieldControlType = (typeof FieldControlType)[keyof typeof FieldControlType];

// ---------------------------------------------------------------------------
// Categorical answer domain — 06 §18, 08 §16
// Blank is NEVER coerced to NO. UNKNOWN / NOT_ASKED / PAYER_UNABLE_TO_VERIFY /
// NOT_APPLICABLE stay distinct.
// ---------------------------------------------------------------------------

export const Answer = {
  YES: 'YES',
  NO: 'NO',
  UNKNOWN: 'UNKNOWN',
  NOT_ASKED: 'NOT_ASKED',
  PAYER_UNABLE_TO_VERIFY: 'PAYER_UNABLE_TO_VERIFY',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type Answer = (typeof Answer)[keyof typeof Answer];

export const ANSWER_LABEL: Record<Answer, string> = {
  YES: 'Yes',
  NO: 'No',
  UNKNOWN: 'Unknown',
  NOT_ASKED: 'Not asked',
  PAYER_UNABLE_TO_VERIFY: 'Payer unable to verify',
  NOT_APPLICABLE: 'Not applicable',
};

export const NetworkStatus = {
  IN_NETWORK: 'IN_NETWORK',
  OUT_OF_NETWORK: 'OUT_OF_NETWORK',
  UNKNOWN: 'UNKNOWN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type NetworkStatus = (typeof NetworkStatus)[keyof typeof NetworkStatus];

export const VisitLimitType = {
  HARD_MAXIMUM: 'HARD_MAXIMUM',
  MEDICALLY_NECESSARY: 'MEDICALLY_NECESSARY',
  NO_STATED_LIMIT: 'NO_STATED_LIMIT',
  UNKNOWN: 'UNKNOWN',
} as const;
export type VisitLimitType = (typeof VisitLimitType)[keyof typeof VisitLimitType];

export const BenefitScope = {
  INDIVIDUAL: 'INDIVIDUAL',
  FAMILY: 'FAMILY',
  COMBINED: 'COMBINED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type BenefitScope = (typeof BenefitScope)[keyof typeof BenefitScope];

/**
 * Eligibility — 08 §13: `current` is an open-ended-period concept, never a fake date.
 */
export const EligibilityStatus = {
  ACTIVE: 'ACTIVE',
  TERMINATED: 'TERMINATED',
  PENDING: 'PENDING',
  UNKNOWN: 'UNKNOWN',
} as const;
export type EligibilityStatus = (typeof EligibilityStatus)[keyof typeof EligibilityStatus];

/** Periods for accumulators and visit limits — 06 §11, §9. */
export const BenefitPeriod = {
  CALENDAR_YEAR: 'CALENDAR_YEAR',
  BENEFIT_YEAR: 'BENEFIT_YEAR',
  ROLLING_PERIOD: 'ROLLING_PERIOD',
  EPISODE: 'EPISODE',
  LIFETIME: 'LIFETIME',
  UNKNOWN: 'UNKNOWN',
} as const;
export type BenefitPeriod = (typeof BenefitPeriod)[keyof typeof BenefitPeriod];

/** Timely-filing units — 06 §13. */
export const TflUnit = {
  DAYS: 'DAYS',
  MONTHS: 'MONTHS',
  YEARS: 'YEARS',
  UNKNOWN: 'UNKNOWN',
} as const;
export type TflUnit = (typeof TflUnit)[keyof typeof TflUnit];

/**
 * Timely-filing reference point — 06 §13. `RA` (remittance advice) matters for
 * CASE-009: the corrected-claim rule must keep its alternative condition.
 */
export const TflReference = {
  DATE_OF_SERVICE: 'DATE_OF_SERVICE',
  REMITTANCE_ADVICE: 'REMITTANCE_ADVICE',
  DATE_OF_DISCHARGE: 'DATE_OF_DISCHARGE',
  ORIGINAL_CLAIM_DECISION: 'ORIGINAL_CLAIM_DECISION',
  UNKNOWN: 'UNKNOWN',
} as const;
export type TflReference = (typeof TflReference)[keyof typeof TflReference];

export const AuthorizationMethod = {
  PHONE: 'PHONE',
  PORTAL: 'PORTAL',
  FAX: 'FAX',
  NOT_REQUIRED: 'NOT_REQUIRED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type AuthorizationMethod = (typeof AuthorizationMethod)[keyof typeof AuthorizationMethod];

/** Confidence presentation — 08 §19 ("simple High, Medium, or Low wording"). */
export const ConfidenceBand = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type ConfidenceBand = (typeof ConfidenceBand)[keyof typeof ConfidenceBand];

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.85) return ConfidenceBand.HIGH;
  if (confidence >= 0.6) return ConfidenceBand.MEDIUM;
  return ConfidenceBand.LOW;
}

/**
 * Privacy classification for log redaction — 06 §2 (last bullet), 12 §19.
 */
export const PrivacyClass = {
  /** Direct patient identifier. Never logged, never in analytics events. */
  PHI_DIRECT: 'PHI_DIRECT',
  /** Identifies the policy/member. Redacted in logs. */
  PHI_INDIRECT: 'PHI_INDIRECT',
  /** Benefit facts about an identified person. Redacted in logs. */
  PHI_BENEFIT: 'PHI_BENEFIT',
  /** Payer-level reference data. Safe to log. */
  OPERATIONAL: 'OPERATIONAL',
  /** System identifiers. Safe to log. */
  SYSTEM: 'SYSTEM',
} as const;
export type PrivacyClass = (typeof PrivacyClass)[keyof typeof PrivacyClass];

export function isRedactedInLogs(privacy: PrivacyClass): boolean {
  return (
    privacy === PrivacyClass.PHI_DIRECT ||
    privacy === PrivacyClass.PHI_INDIRECT ||
    privacy === PrivacyClass.PHI_BENEFIT
  );
}
