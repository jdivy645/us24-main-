/**
 * Identifier normalization — 08 §12.
 *
 *   "Preserve leading zeros"
 *   "Preserve alpha prefixes and suffixes."
 *   "Treat 106723434 and 106723434-01 as different unless a payer-specific rule
 *    approves the relationship."
 *   "Do not convert identifiers to numeric types."
 *
 * 15 §4 tests two of these directly: leading zeros must survive in group IDs, and
 * policy suffixes must remain unless a payer rule permits equivalence (CASE-006).
 */

import { parseQuantity } from './number-words.js';
import { empty, fail, isBlankInput, ok, type NormalizationResult } from './types.js';

/**
 * Internal whitespace is removed because spoken identifiers arrive split by
 * pauses — "1 0 6 7 2 3 4 3 4". Punctuation is NOT removed: a hyphen can be the
 * difference between two real policies.
 */
export function normalizeIdentifier(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  // String conversion first and always — 08 §12 forbids numeric coercion, which
  // is exactly what would silently destroy a leading zero.
  const original = String(raw);
  const trimmed = original.trim();
  steps.push(`kept as text "${trimmed}"`);

  const withoutSpaces = trimmed.replace(/\s+/g, '');
  if (withoutSpaces !== trimmed) steps.push('removed spacing from spoken digits');

  const upper = withoutSpaces.toUpperCase();
  if (upper !== withoutSpaces) steps.push('upper-cased for comparison only');

  if (/^0+\d/.test(withoutSpaces)) steps.push('leading zeros preserved');

  return ok(withoutSpaces, withoutSpaces, upper, steps);
}

/**
 * Whether two identifiers differ only by a trailing suffix such as `-01`.
 *
 * This does NOT declare them equal. 08 §12 requires an approved payer-specific
 * rule before a suffix relationship can pass, so the comparison engine uses this
 * to route CASE-006 to review with a useful explanation instead of guessing.
 */
export function suffixRelationship(
  a: string,
  b: string,
): { related: boolean; base: string; suffix: string } | null {
  const x = a.trim().toUpperCase();
  const y = b.trim().toUpperCase();
  if (x === y) return null;

  const [longer, shorter] = x.length >= y.length ? [x, y] : [y, x];
  const match = longer.match(/^(.*?)([-/_][A-Z0-9]{1,4})$/);
  if (match && match[1] === shorter) {
    return { related: true, base: shorter, suffix: match[2] as string };
  }
  return null;
}

/**
 * Phone normalization. The comparison key is digits only so punctuation variants
 * agree (15 §4: "Phone punctuation is normalized"), while display stays readable.
 */
export function normalizePhone(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  const original = String(raw).trim();
  steps.push(`trimmed "${original}"`);

  let digits = original.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
    steps.push('removed US country code');
  }
  steps.push('reduced to digits for comparison');

  if (digits.length !== 10) {
    // Not a failure: some payer numbers are extensions or short codes. It simply
    // compares as written rather than being reformatted into something wrong.
    return ok(digits, original, digits, [...steps, 'kept original formatting for display']);
  }

  const display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return ok(digits, display, digits, steps);
}

/** Whole-number normalization for visit counts, thresholds and filing windows. */
export function normalizeInteger(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw)) {
      return ok(Math.round(raw), String(Math.round(raw)), String(Math.round(raw)), [
        `rounded ${raw} to a whole number`,
      ]);
    }
    return ok(raw, String(raw), String(raw), ['read numeric value']);
  }

  const original = String(raw).trim();
  steps.push(`trimmed "${original}"`);

  const digits = original.replace(/,/g, '');
  if (/^-?\d+$/.test(digits)) {
    const value = Number(digits);
    return ok(value, String(value), String(value), [...steps, 'parsed whole number']);
  }

  // Spoken form, including ordinals such as "after the eighth visit" (CASE-001).
  const spoken = parseQuantity(original);
  if (spoken !== null && Number.isInteger(spoken)) {
    return ok(spoken, String(spoken), String(spoken), [...steps, 'parsed spoken number']);
  }

  return fail(
    'INTEGER_UNPARSEABLE',
    'The number could not be read. It is kept as written and sent to review rather than guessed.',
    steps,
  );
}
