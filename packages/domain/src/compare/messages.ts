/**
 * Inline message templates — 09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md §7.
 *
 * The ten templates below are reproduced verbatim from the spec. 04 §8 requires
 * the message to "Start with the practical difference, such as
 * `Entered 5 visits; representative confirmed 8`", and 04 §14 fixes the wording:
 * "Needs review" not "AI uncertain", "Supported value" not "AI answer",
 * "Payer unable to verify" instead of converting the answer to No.
 *
 * Keeping them in one module means the same sentence appears in the field block,
 * the review queue, the QA report and the Excel issue sheet.
 */

export interface MessageParts {
  readonly formValue?: string | null;
  readonly sourceValue?: string | null;
  readonly candidateA?: string | null;
  readonly candidateB?: string | null;
  readonly dependentFieldLabel?: string | null;
  readonly triggerFieldLabel?: string | null;
  readonly triggerValue?: string | null;
  readonly sourceScope?: string | null;
  readonly targetScope?: string | null;
  readonly carrierMasterVersion?: string | null;
  readonly operandA?: string | null;
  readonly operandB?: string | null;
  readonly result?: string | null;
}

const NO_VALUE = '(blank)';

function show(value: string | null | undefined): string {
  return value === null || value === undefined || value === '' ? NO_VALUE : value;
}

export const inlineMessage = {
  /** `Entered {form}; representative confirmed {source}.` */
  mismatch: (p: MessageParts): string =>
    `Entered ${show(p.formValue)}; representative confirmed ${show(p.sourceValue)}.`,

  /** `Required field is blank; the call supports {source}.` */
  missing: (p: MessageParts): string =>
    `Required field is blank; the call supports ${show(p.sourceValue)}.`,

  /** `Entered value was not found in the permitted sources.` */
  unsupported: (): string => 'Entered value was not found in the permitted sources.',

  /** `The call contains conflicting values: {candidateA} and {candidateB}.` */
  conflict: (p: MessageParts): string =>
    `The call contains conflicting values: ${show(p.candidateA)} and ${show(p.candidateB)}.`,

  /** `The value may be {candidate}, but the audio or transcript is unclear.` */
  lowConfidence: (p: MessageParts): string =>
    `The value may be ${show(p.candidateA)}, but the audio or transcript is unclear.`,

  /** `The representative said this information was not visible on their side.` */
  payerUnavailable: (): string =>
    'The representative said this information was not visible on their side.',

  /** `Filled from {carrierMasterVersion}; not stated in the call.` */
  masterSupported: (p: MessageParts): string =>
    `Filled from ${show(p.carrierMasterVersion)}; not stated in the call.`,

  /** `{result} was calculated from {operandA} and {operandB}.` */
  derived: (p: MessageParts): string =>
    `${show(p.result)} was calculated from ${show(p.operandA)} and ${show(p.operandB)}.`,

  /** `{dependentField} is required because {triggerField} is {triggerValue}.` */
  conditionalMissing: (p: MessageParts): string =>
    `${show(p.dependentFieldLabel)} is required because ${show(p.triggerFieldLabel)} is ${show(p.triggerValue)}.`,

  /** `The value refers to {sourceScope}, while this field is {targetScope}.` */
  scopeMismatch: (p: MessageParts): string =>
    `The value refers to ${show(p.sourceScope)}, while this field is ${show(p.targetScope)}.`,

  /** Match needs no explanation beyond confirmation — 09 §6 renders it compactly. */
  match: (p: MessageParts): string =>
    `Matches the value confirmed on the call${p.sourceValue ? `: ${p.sourceValue}` : ''}.`,
} as const;

/**
 * Identifier suffix explanation for CASE-006. 08 §12 requires an approved
 * payer rule before a suffix relationship can pass, so the message says what is
 * needed rather than asserting equivalence.
 */
export function identifierSuffixMessage(
  formValue: string,
  sourceValue: string,
  suffix: string,
): string {
  return `Entered ${formValue}; the call stated ${sourceValue}. These differ only by the suffix ${suffix}, which is not treated as the same identifier without an approved payer rule.`;
}

/** Arithmetic inconsistency note — 06 §9, 08 §14. Raises review, never overwrites. */
export function arithmeticNote(
  totalLabel: string,
  metLabel: string,
  remainingLabel: string,
  expectedDisplay: string,
  actualDisplay: string,
): string {
  return `${totalLabel} minus ${metLabel} gives ${expectedDisplay}, but ${remainingLabel} is recorded as ${actualDisplay}. The stated values are kept and flagged for review rather than recalculated.`;
}
