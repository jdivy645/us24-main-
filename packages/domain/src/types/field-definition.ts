/**
 * The field registry contract.
 *
 * Spec authority: 06_VOB_FORM_FIELD_ENGINE.md §2 (registry contract) and §3
 * (recommended TypeScript shape). This interface is a superset of §3: the extra
 * members are the remaining §2 bullets (help text, examples, privacy class,
 * export metadata, subgroup) which §3 abbreviates.
 *
 * 06 §20 — one registry drives the React form, the extraction schema, the
 * comparison engine, the review queue, the records table, Excel import/export,
 * PDF bindings, test factories and help text. Nothing may re-declare a field.
 */

import type {
  Answer,
  FieldControlType,
  FieldDataType,
  PrivacyClass,
  RequirednessKind,
  SourceType,
  TemporalClass,
} from './enums.js';
import type { VobFieldKey, VobSection, VobSubgroup } from './field-keys.js';
import type { RuleExpression } from './rule-expression.js';

/**
 * How a raw value becomes a comparable canonical value — 08 §11–§16.
 * The strategy never destroys the raw source text (06 §4).
 */
export const NormalizationStrategy = {
  /** Trim, collapse whitespace, casefold for comparison, preserve display case. */
  STRING: 'STRING',
  /** Preserve leading zeros and alpha affixes; never coerce to a number. 08 §12. */
  IDENTIFIER: 'IDENTIFIER',
  /** Digits-only comparison key, formatted display. */
  PHONE: 'PHONE',
  /** Multi-line postal address; whitespace and punctuation tolerant. */
  ADDRESS: 'ADDRESS',
  /** ISO date storage, US display, no century guessing, no month/day swap. 08 §13. */
  DATE: 'DATE',
  /** ISO timestamp with timezone — call times only, never benefit dates. 08 §13. */
  DATE_TIME: 'DATE_TIME',
  /** Integer cents. Never binary floating point. 08 §14. */
  MONEY: 'MONEY',
  /** Bounded percentage; patient vs payer semantics kept distinct. 08 §15. */
  PERCENT: 'PERCENT',
  /** Whole count. */
  INTEGER: 'INTEGER',
  /** YES/NO/UNKNOWN/NOT_ASKED/PAYER_UNABLE_TO_VERIFY/NOT_APPLICABLE. 08 §16. */
  ANSWER: 'ANSWER',
  /** Closed option set with alias mapping (INN -> IN_NETWORK). 08 §16. */
  CATEGORICAL: 'CATEGORICAL',
  /** Free text that must not be fuzzy-matched into an automatic pass. 08 §11. */
  FREE_TEXT: 'FREE_TEXT',
} as const;
export type NormalizationStrategy =
  (typeof NormalizationStrategy)[keyof typeof NormalizationStrategy];

/** How canonical values are judged equivalent — 08 §18. */
export const ComparisonStrategy = {
  /** Canonical values must be identical. */
  EXACT: 'EXACT',
  /** Identical after approved alias expansion. */
  ALIAS: 'ALIAS',
  /** Numeric equality within a configured tolerance. */
  NUMERIC_TOLERANCE: 'NUMERIC_TOLERANCE',
  /** Money equality in cents. */
  MONEY_EXACT: 'MONEY_EXACT',
  /** Date equality after ISO normalization. */
  DATE_EXACT: 'DATE_EXACT',
  /** Identifier equality; suffix relationships need an approved payer rule. 08 §12. */
  IDENTIFIER_STRICT: 'IDENTIFIER_STRICT',
  /**
   * Long prose. Never auto-passes on fuzzy similarity — a difference routes to
   * review rather than being judged a match. 08 §11.
   */
  NARRATIVE_REVIEW: 'NARRATIVE_REVIEW',
  /** Field is system-controlled and not compared against sources. */
  NOT_COMPARED: 'NOT_COMPARED',
} as const;
export type ComparisonStrategy = (typeof ComparisonStrategy)[keyof typeof ComparisonStrategy];

/** Requiredness rule with a stable identifier and version — 06 §16 last bullet. */
export interface RequirednessRule {
  readonly id: string;
  readonly kind: RequirednessKind;
  /** Applies only when this expression is true. For ALWAYS_REQUIRED use `always`. */
  readonly when: RuleExpression;
  /**
   * True while the client has not signed off this entry — 17 §18.
   * The UI shows these as provisional and the release gate lists them.
   */
  readonly pendingClient: boolean;
}

/** Criticality rule — a single critical mismatch can fail a case (09 §3). */
export interface CriticalityRule {
  readonly id: string;
  readonly when: RuleExpression;
  readonly pendingClient: boolean;
}

/** Bypass permission and consequence — 09 §10–§12. */
export interface BypassPolicy {
  /** Whether the field may be bypassed at all. */
  readonly allowed: boolean;
  /** Reasons permitted for this field. A generic "Ignore" is prohibited (09 §10). */
  readonly allowedReasons: readonly string[];
  /** Reasons that require a free-text note regardless of global policy. */
  readonly reasonsRequiringNote: readonly string[];
  /** Whether a bypass on this field needs a second review (09 §11). */
  readonly requiresFollowUp: boolean;
  readonly pendingClient: boolean;
}

/** Binding to a versioned output template — 06 §2, 13 §6. */
export interface TemplateBinding {
  readonly templateId: string;
  readonly anchor: string;
  /** Short label used on the printed document when it differs from the UI label. */
  readonly documentLabel?: string;
}

/** Derived-value definition — 06 §10/§11, 09 §6 (formula must be disclosed). */
export interface DerivationRule {
  readonly id: string;
  readonly operands: readonly VobFieldKey[];
  readonly kind: 'SUBTRACT' | 'ADD';
  /** Human formula shown beside the value: "6500 − 5473.76". */
  readonly describe: (operandLabels: readonly string[]) => string;
  /**
   * Derivation is opt-in per 06 §10 ("only when both operands are clear and the
   * rule is enabled") and the result is always labeled DERIVED, never MATCH.
   */
  readonly enabledByDefault: boolean;
}

/** A selectable option for categorical controls. */
export interface FieldOption {
  readonly value: string;
  readonly label: string;
  /** Marks UNKNOWN-family options so the renderer can group them (06 §18). */
  readonly isUnknownFamily?: boolean;
}

export interface FieldDefinition {
  readonly key: VobFieldKey;
  readonly section: VobSection;
  readonly subgroup: VobSubgroup;
  readonly label: string;
  /** Short label for the printed document when it differs (06 §2). */
  readonly documentLabel?: string;

  readonly dataType: FieldDataType;
  readonly control: FieldControlType;
  /** Closed option set for CATEGORICAL/ANSWER controls. */
  readonly options?: readonly FieldOption[];

  readonly requiredRule: RequirednessRule;
  readonly criticalRule: CriticalityRule;
  readonly visibleRule: RuleExpression;
  readonly bypassPolicy: BypassPolicy;

  readonly normalization: NormalizationStrategy;
  readonly comparison: ComparisonStrategy;
  /** Tolerance for NUMERIC_TOLERANCE comparisons. */
  readonly comparisonTolerance?: number;

  /** Which provenance sources may legitimately supply this field (06 §2). */
  readonly allowedSources: readonly SourceType[];
  readonly temporalClass: TemporalClass;
  readonly derivation?: DerivationRule;

  readonly templateBindings: readonly TemplateBinding[];
  /** Column header used by Excel export (06 §2, 13 §15). */
  readonly exportColumn: string;

  readonly helpText: string;
  readonly examples: readonly string[];
  readonly privacy: PrivacyClass;

  /**
   * Requirement identifiers this field traces to — 02 §11 ("Every field registry
   * entry references template and meeting identifiers").
   */
  readonly traceIds: readonly string[];
}

/** Convenience: the default answer option set. Note there is no pre-selected value. */
export const ANSWER_OPTIONS: readonly FieldOption[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'UNKNOWN', label: 'Unknown', isUnknownFamily: true },
  { value: 'NOT_ASKED', label: 'Not asked', isUnknownFamily: true },
  {
    value: 'PAYER_UNABLE_TO_VERIFY',
    label: 'Payer unable to verify',
    isUnknownFamily: true,
  },
  { value: 'NOT_APPLICABLE', label: 'Not applicable', isUnknownFamily: true },
];

/**
 * 06 §18 — the no-default rule. A registry entry must never carry a substantive
 * initial value. This helper exists so the form renderer has one obvious place to
 * ask "what is the starting value?" and always gets an explicit unselected state.
 */
export function initialValueFor(_definition: FieldDefinition): null {
  return null;
}

/** Answer values that are explicitly NOT a verified negative — 08 §8. */
export const NON_NEGATIVE_ANSWERS: readonly Answer[] = [
  'UNKNOWN',
  'NOT_ASKED',
  'PAYER_UNABLE_TO_VERIFY',
  'NOT_APPLICABLE',
];
