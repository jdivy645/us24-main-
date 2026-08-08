/**
 * Registry authoring helpers.
 *
 * A `FieldStructure` is everything about a field that is a structural fact:
 * its key, section, label, data type, control, normalization, comparison,
 * permitted sources, temporal class, template bindings, help and privacy class.
 *
 * Requiredness, criticality and bypass policy are deliberately NOT here. Those
 * three come from a separate versioned rule matrix, because 06 §16 requires the
 * final matrix to be data supplied by the client and 17 §18 still lists it as
 * PENDING_CLIENT. `buildRegistry()` composes the two.
 */

import type {
  FieldControlType,
  FieldDataType,
  PrivacyClass,
  SourceType,
  TemporalClass,
} from '../types/enums.js';
import type { VobFieldKey, VobSection, VobSubgroup } from '../types/field-keys.js';
import type {
  ComparisonStrategy,
  DerivationRule,
  FieldDefinition,
  FieldOption,
  NormalizationStrategy,
  TemplateBinding,
} from '../types/field-definition.js';
import type { RuleExpression } from '../types/rule-expression.js';
import { rule } from '../types/rule-expression.js';

export type FieldStructure = Omit<
  FieldDefinition,
  'requiredRule' | 'criticalRule' | 'bypassPolicy'
>;

/** The interim template all bindings point at until the client supplies theirs (13 §6). */
export const INTERIM_TEMPLATE_ID = 'us24-interim-v1';

export interface DefineFieldInput {
  key: VobFieldKey;
  section: VobSection;
  subgroup: VobSubgroup;
  label: string;
  documentLabel?: string;
  dataType: FieldDataType;
  control: FieldControlType;
  options?: readonly FieldOption[];
  visibleRule?: RuleExpression;
  normalization: NormalizationStrategy;
  comparison: ComparisonStrategy;
  comparisonTolerance?: number;
  allowedSources: readonly SourceType[];
  temporalClass: TemporalClass;
  derivation?: DerivationRule;
  templateBindings?: readonly TemplateBinding[];
  exportColumn?: string;
  helpText: string;
  examples?: readonly string[];
  privacy: PrivacyClass;
  traceIds: readonly string[];
}

export function defineField(input: DefineFieldInput): FieldStructure {
  return {
    key: input.key,
    section: input.section,
    subgroup: input.subgroup,
    label: input.label,
    ...(input.documentLabel !== undefined ? { documentLabel: input.documentLabel } : {}),
    dataType: input.dataType,
    control: input.control,
    ...(input.options !== undefined ? { options: input.options } : {}),
    visibleRule: input.visibleRule ?? rule.always(),
    normalization: input.normalization,
    comparison: input.comparison,
    ...(input.comparisonTolerance !== undefined
      ? { comparisonTolerance: input.comparisonTolerance }
      : {}),
    allowedSources: input.allowedSources,
    temporalClass: input.temporalClass,
    ...(input.derivation !== undefined ? { derivation: input.derivation } : {}),
    templateBindings: input.templateBindings ?? [
      { templateId: INTERIM_TEMPLATE_ID, anchor: input.key },
    ],
    exportColumn: input.exportColumn ?? input.label,
    helpText: input.helpText,
    examples: input.examples ?? [],
    privacy: input.privacy,
    traceIds: input.traceIds,
  };
}

// ---------------------------------------------------------------------------
// Frequently reused source sets
// ---------------------------------------------------------------------------

/** A benefit fact a live representative can confirm on the call. */
export const CALL_VERIFIABLE_SOURCES: readonly SourceType[] = [
  'TRANSCRIPT_REP_CONFIRMED',
  'IMPORTED_COMPLETED_FORM',
  'MANUAL_ENTRY',
  'MANUAL_CORRECTION',
  'BYPASSED',
  'NOT_FOUND',
  'UNKNOWN',
];

/** Call-verifiable plus prior-verification prefill (stable identity fields). */
export const IDENTITY_SOURCES: readonly SourceType[] = [
  'TRANSCRIPT_REP_CONFIRMED',
  'TRANSCRIPT_CALLER_STATED',
  'IMPORTED_COMPLETED_FORM',
  'PREFILLED_PATIENT_RECORD',
  'PREVIOUS_VOB',
  'MANUAL_ENTRY',
  'MANUAL_CORRECTION',
  'BYPASSED',
  'NOT_FOUND',
  'UNKNOWN',
];

/**
 * Fields the carrier master may legitimately supply — the "one time" annotations
 * in the marked template (02 §4) and MTG-015: payer ID, claim address, TFL.
 */
export const MASTER_ELIGIBLE_SOURCES: readonly SourceType[] = [
  'TRANSCRIPT_REP_CONFIRMED',
  'IMPORTED_COMPLETED_FORM',
  'CARRIER_MASTER',
  'PREVIOUS_VOB',
  'MANUAL_ENTRY',
  'MANUAL_CORRECTION',
  'BYPASSED',
  'NOT_FOUND',
  'UNKNOWN',
];

/** Accumulators that may be derived when the rule is enabled (06 §10, §11). */
export const DERIVABLE_SOURCES: readonly SourceType[] = [
  'TRANSCRIPT_REP_CONFIRMED',
  'IMPORTED_COMPLETED_FORM',
  'DERIVED_CALCULATION',
  'MANUAL_ENTRY',
  'MANUAL_CORRECTION',
  'BYPASSED',
  'NOT_FOUND',
  'UNKNOWN',
];

/** System-controlled values that never come from a call (06 §15). */
export const SYSTEM_SOURCES: readonly SourceType[] = ['MANUAL_ENTRY', 'UNKNOWN'];
