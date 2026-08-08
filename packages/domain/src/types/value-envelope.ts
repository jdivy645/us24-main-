/**
 * The field value envelope and evidence contracts.
 *
 * Spec authority:
 *  - 06_VOB_FORM_FIELD_ENGINE.md §4 (value envelope) — "Never overwrite the raw original value."
 *  - 08_EXTRACTION_NORMALIZATION_COMPARISON.md §2–§3 (extraction output contract)
 *  - 09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md §8 (evidence presentation), §11 (bypass record)
 */

import type {
  BenefitScope,
  BypassReason,
  ComparisonOutcome,
  NetworkStatus,
  Severity,
  SourceType,
  SpeakerRole,
  SpeechAct,
} from './enums.js';
import type { VobFieldKey } from './field-keys.js';

/** Canonical normalized value. `null` means explicitly empty, never "No". */
export type CanonicalValue = string | number | boolean | null;

/**
 * Where a value came from, precisely enough to re-find it in the source.
 * 09 §8 — excerpt, speaker role, timestamp or page/cell, safe filename.
 */
export interface EvidenceRef {
  readonly evidenceId: string;
  readonly artifactId: string;
  /** Safe truncated filename for display — 09 §8. */
  readonly artifactLabel: string;
  /** Transcript segment id when the source is a call. */
  readonly segmentId?: string;
  /** Seconds from call start — 08 §2. */
  readonly timestampStart?: number;
  readonly timestampEnd?: number;
  /** 1-based page for PDF sources. */
  readonly page?: number;
  /** Sheet name and A1 address for spreadsheet sources — 13 §4. */
  readonly sheet?: string;
  readonly cell?: string;
  /** The exact source passage. Rendered as text, never HTML (11 §11, 11 §18). */
  readonly excerpt: string;
  readonly speakerRole?: SpeakerRole;
  /** Raw speaker label as it appeared, e.g. "ASH" — 02 §6. */
  readonly rawSpeakerLabel?: string;
  /**
   * True when retention policy removed the underlying source but the audit
   * reference is preserved — 09 §8 last bullet.
   */
  readonly evidenceDeleted?: boolean;
}

/**
 * Context dimensions — 08 §10. Candidates with different scopes must not be
 * compared as if they describe one value.
 */
export interface CandidateScope {
  /** PT, OT, ST, chiropractic, combined... */
  readonly service?: string | null;
  readonly network?: NetworkStatus | null;
  readonly benefitScope?: BenefitScope | null;
  /** Effective period or as-of date the statement refers to. */
  readonly asOfDate?: string | null;
  readonly benefitPeriod?: string | null;
  /** Original vs corrected claim context — 08 §10. */
  readonly claimContext?: 'ORIGINAL' | 'CORRECTED_PRACTITIONER' | 'CORRECTED_PAYER' | null;
  /** Initial evaluation vs treatment vs medical-necessity review — 08 §10. */
  readonly authorizationContext?: 'INITIAL_EVALUATION' | 'TREATMENT' | 'MEDICAL_NECESSITY' | null;
}

/**
 * One possible extracted value, before authority and conflict rules choose or
 * escalate it — 00 §10 glossary, 08 §2.
 *
 * The extraction adapter produces these. It NEVER produces a field state or a
 * case status (ADR-005).
 */
export interface ExtractedCandidate {
  readonly candidateId: string;
  readonly fieldKey: VobFieldKey;
  /** Exactly as spoken or written. Preserved verbatim. */
  readonly rawValue: string;
  /** Parsed value, or null when the text could not be parsed. */
  readonly parsedValue: CanonicalValue;
  readonly sourceType: SourceType;
  readonly speakerRole: SpeakerRole;
  readonly speechAct: SpeechAct;
  readonly scope: CandidateScope;
  readonly evidence: EvidenceRef;
  /** 0..1. An input to review, not a truth score — 08 §19. */
  readonly confidence: number;
  readonly confidenceRationale?: string;
  /**
   * Links to earlier candidates this one corrects or contradicts — 08 §2, §6.
   * Correction chains must be preserved, not collapsed.
   */
  readonly supersedesCandidateId?: string;
  /** Candidate ids this one repeats/supports — merged as supporting evidence (08 §7). */
  readonly supportsCandidateIds?: readonly string[];
}

/**
 * The stored value envelope — 06 §4.
 *
 * `raw` is written once and never overwritten. Corrections create a new
 * envelope in a new revision (ADR-006).
 */
export interface FieldValueEnvelope {
  readonly fieldKey: VobFieldKey;

  /** Exactly as imported, extracted or typed. Immutable. */
  readonly raw: string | null;
  /** Comparable canonical form. */
  readonly canonical: CanonicalValue;
  /** Formatted for display when it differs from canonical. */
  readonly display: string | null;

  readonly sourceType: SourceType;
  readonly sourceArtifactId: string | null;
  readonly evidence: EvidenceRef | null;
  /** Competing candidates retained for CONFLICT presentation — 09 §8. */
  readonly competingCandidates: readonly ExtractedCandidate[];

  readonly confidence: number | null;
  readonly confidenceRationale: string | null;

  /** Dated provenance for dynamic accumulators — 06 §9, 10 §6. */
  readonly asOfDate: string | null;
  readonly benefitPeriod: string | null;
  readonly scope: CandidateScope | null;

  /** Populated for DERIVED values; the formula is always disclosed — 06 §10. */
  readonly derivation: {
    readonly ruleId: string;
    readonly operands: readonly VobFieldKey[];
    readonly formula: string;
  } | null;

  /** Carrier master version that supplied this value — 10 §16. */
  readonly carrierMasterVersionId: string | null;

  readonly originRevisionId: string;
  readonly latestRevisionId: string;

  readonly outcome: ComparisonOutcome;
  readonly comparisonReason: string | null;
  readonly ruleSetVersion: string | null;

  readonly bypass: BypassRecord | null;
  readonly manualResolution: ManualResolution | null;
}

/** 09 §11 — the bypass record. Never removes the field from history. */
export interface BypassRecord {
  readonly bypassId: string;
  readonly caseId: string;
  readonly versionId: string;
  readonly revisionId: string;
  readonly fieldKey: VobFieldKey;
  readonly reason: BypassReason;
  readonly note: string | null;
  readonly createdAt: string;
  /** Operational metadata only — never presented as strong identity (09 §14). */
  readonly operatorLabel: string | null;
  /** The value at the moment of bypass. */
  readonly valueBeforeBypass: string | null;
  readonly evidence: EvidenceRef | null;
  readonly ruleSetVersion: string;
  readonly consequence: Severity;
  readonly requiresFollowUp: boolean;
}

/** 09 §13 — manual correction workflow. */
export interface ManualResolution {
  readonly resolutionId: string;
  readonly fieldKey: VobFieldKey;
  readonly previousValue: string | null;
  readonly newValue: string | null;
  /** Provenance the operator selected or described. */
  readonly provenance: SourceType;
  readonly explanation: string | null;
  readonly createdAt: string;
  readonly operatorLabel: string | null;
  /** True when overriding a clear representative-confirmed value — 09 §13. */
  readonly overridesSupportedValue: boolean;
}

/** Create an empty envelope with no substantive default — 06 §18. */
export function emptyEnvelope(
  fieldKey: VobFieldKey,
  revisionId: string,
  sourceType: SourceType = 'UNKNOWN',
): FieldValueEnvelope {
  return {
    fieldKey,
    raw: null,
    canonical: null,
    display: null,
    sourceType,
    sourceArtifactId: null,
    evidence: null,
    competingCandidates: [],
    confidence: null,
    confidenceRationale: null,
    asOfDate: null,
    benefitPeriod: null,
    scope: null,
    derivation: null,
    carrierMasterVersionId: null,
    originRevisionId: revisionId,
    latestRevisionId: revisionId,
    outcome: 'NOT_EVALUATED',
    comparisonReason: null,
    ruleSetVersion: null,
    bypass: null,
    manualResolution: null,
  };
}

/** A form revision — append-only (ADR-006, 12 §7). */
export interface FormRevision {
  readonly revisionId: string;
  readonly caseId: string;
  readonly versionId: string;
  readonly revisionNumber: number;
  /** The immutable imported/prefilled baseline this chain descends from. */
  readonly originRevisionId: string;
  readonly createdAt: string;
  readonly createdReason:
    | 'IMPORTED_ORIGINAL'
    | 'AUTO_FILLED'
    | 'PREFILLED_FROM_PREVIOUS'
    | 'MANUAL_EDIT'
    | 'APPLY_SUPPORTED_VALUE'
    | 'BYPASS'
    | 'REVERT';
  readonly values: Readonly<Record<string, FieldValueEnvelope>>;
}
