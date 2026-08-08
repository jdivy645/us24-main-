/**
 * Boolean and categorical normalization — 08 §16.
 *
 *   "Map confirmed yes and no to canonical values."
 *   "Keep UNKNOWN, NOT_ASKED, PAYER_UNABLE_TO_VERIFY, and NOT_APPLICABLE distinct."
 *   "Normalize INN to In Network and OON to Out of Network."
 *   "Show the original wording in evidence; Do not coerce blank to No."
 *
 * The final clause is the one that matters most. A blank answer returns an empty
 * result, never NO — see the test "Unknown versus No behavior" in 15 §3.
 */

import { Answer } from '../types/enums.js';
import { resolveValueAlias } from '../terminology/dictionary.v1.js';
import { empty, fail, isBlankInput, ok, type NormalizationResult } from './types.js';

const ANSWER_VALUES: readonly string[] = [
  Answer.YES,
  Answer.NO,
  Answer.UNKNOWN,
  Answer.NOT_ASKED,
  Answer.PAYER_UNABLE_TO_VERIFY,
  Answer.NOT_APPLICABLE,
];

/**
 * Normalize a yes/no-family answer.
 *
 * A blank input yields an EMPTY result — not NO. 06 §18 forbids blank-as-No and
 * 08 §8 states "Silence or absence never becomes No."
 */
export function normalizeAnswer(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty(['input was blank; blank is not No']);

  const steps: string[] = [];
  const original = String(raw).trim();
  steps.push(`trimmed "${original}"`);

  const resolved = resolveValueAlias(original, ANSWER_VALUES);
  if (resolved === null) {
    return fail(
      'ANSWER_UNRECOGNISED',
      `"${original}" is not a recognised answer. It is sent to review rather than being read as Yes or No.`,
      steps,
    );
  }

  steps.push(`mapped to ${resolved}`);
  return ok(resolved, labelForAnswer(resolved), resolved, steps);
}

function labelForAnswer(value: string): string {
  switch (value) {
    case Answer.YES:
      return 'Yes';
    case Answer.NO:
      return 'No';
    case Answer.UNKNOWN:
      return 'Unknown';
    case Answer.NOT_ASKED:
      return 'Not asked';
    case Answer.PAYER_UNABLE_TO_VERIFY:
      return 'Payer unable to verify';
    case Answer.NOT_APPLICABLE:
      return 'Not applicable';
    default:
      return value;
  }
}

/**
 * Normalize a closed-option categorical value against the field's own option set.
 * The option list is passed in so "PHONE" resolves correctly for an authorization
 * method and is rejected for, say, a plan type.
 */
export function normalizeCategorical(
  raw: unknown,
  allowedValues: readonly string[],
  optionLabels?: ReadonlyMap<string, string>,
): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  const original = String(raw).trim();
  steps.push(`trimmed "${original}"`);

  const resolved = resolveValueAlias(original, allowedValues);
  if (resolved === null) {
    return fail(
      'CATEGORY_UNRECOGNISED',
      `"${original}" does not match any allowed option for this field.`,
      steps,
    );
  }

  if (resolved.toLowerCase() !== original.toLowerCase()) {
    steps.push(`recognised "${original}" as ${resolved}`);
  }
  return ok(resolved, optionLabels?.get(resolved) ?? resolved, resolved, steps);
}

/**
 * 08 §8: "`No` is a verified negative only when the representative answers the
 * target question clearly." This predicate is used by the comparison engine to
 * decide whether an answer may satisfy a requirement.
 */
export function isVerifiedNegative(canonical: unknown): boolean {
  return canonical === Answer.NO;
}

/**
 * Answers that explicitly are NOT a negative and must not be treated as one.
 * Central to CASE-005: PAYER_UNABLE_TO_VERIFY is not No.
 */
export function isUnknownFamily(canonical: unknown): boolean {
  return (
    canonical === Answer.UNKNOWN ||
    canonical === Answer.NOT_ASKED ||
    canonical === Answer.PAYER_UNABLE_TO_VERIFY ||
    canonical === Answer.NOT_APPLICABLE
  );
}
