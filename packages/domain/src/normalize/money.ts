/**
 * Money normalization — 08 §14.
 *
 *   "Store integer cents or a decimal type, not binary floating point."
 *   "Treat $20, $20.00, and twenty dollars as equivalent."
 *   "Do not infer missing thousands from garbled audio without evidence."
 *
 * The canonical value is an integer number of cents. Nothing downstream performs
 * float arithmetic on money.
 */

import { parseNumberWords } from './number-words.js';
import { empty, fail, isBlankInput, ok, type NormalizationResult } from './types.js';

const CURRENCY_DISPLAY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCents(cents: number): string {
  return CURRENCY_DISPLAY.format(cents / 100);
}

/** Split "... dollars and ... cents" into its two spoken halves. */
function parseSpokenCurrency(text: string): number | null {
  const match = text.match(/^(.*?)\s*dollars?\s*(?:and\s*)?(.*?)\s*cents?$/);
  if (match) {
    const dollars = parseNumberWords(match[1] ?? '');
    const cents = parseNumberWords(match[2] ?? '');
    if (dollars === null || cents === null) return null;
    if (cents > 99) return null;
    return dollars * 100 + cents;
  }

  const dollarsOnly = text.match(/^(.*?)\s*dollars?$/);
  if (dollarsOnly) {
    const dollars = parseNumberWords(dollarsOnly[1] ?? '');
    return dollars === null ? null : dollars * 100;
  }

  return null;
}

export function normalizeMoney(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];

  // A number arriving from a spreadsheet cell is already a dollar amount.
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return fail('MONEY_NOT_FINITE', 'Value is not a finite number.');
    const cents = Math.round(raw * 100);
    steps.push(`read numeric cell value ${raw}`, `stored as ${cents} cents`);
    return ok(cents, formatCents(cents), String(cents), steps);
  }

  const original = String(raw).trim();
  let text = original.toLowerCase();
  steps.push(`trimmed "${original}"`);

  if (text.includes('$')) {
    text = text.replace(/\$/g, '').trim();
    steps.push('removed currency symbol');
  }

  // Digit form: 3000, 3,000, 3000.00, 5,473.76
  const digitForm = text.replace(/,/g, '');
  if (/^-?\d+(?:\.\d{1,2})?$/.test(digitForm)) {
    if (digitForm !== text) steps.push('removed thousands separators');
    // Parse via string split rather than float maths so 5473.76 cannot drift.
    const negative = digitForm.startsWith('-');
    const unsigned = negative ? digitForm.slice(1) : digitForm;
    const [whole = '0', fraction = ''] = unsigned.split('.');
    const centsPart = (fraction + '00').slice(0, 2);
    const cents = (Number(whole) * 100 + Number(centsPart)) * (negative ? -1 : 1);
    steps.push(`stored as ${cents} cents`);
    return ok(cents, formatCents(cents), String(cents), steps);
  }

  // Spoken form: "twenty dollars", "five thousand dollars and ten cents"
  const spoken = parseSpokenCurrency(text);
  if (spoken !== null) {
    steps.push('parsed spoken currency', `stored as ${spoken} cents`);
    return ok(spoken, formatCents(spoken), String(spoken), steps);
  }

  // Bare spoken number with no unit: "twenty"
  const bare = parseNumberWords(text);
  if (bare !== null) {
    const cents = bare * 100;
    steps.push('parsed spoken number as whole dollars', `stored as ${cents} cents`);
    return ok(cents, formatCents(cents), String(cents), steps);
  }

  return fail(
    'MONEY_UNPARSEABLE',
    'The amount could not be read. It is kept as written and sent to review rather than guessed.',
    steps,
  );
}

/**
 * Arithmetic consistency check for total / met / remaining triples — 08 §14
 * ("Run arithmetic consistency checks after extraction") and 06 §9 ("Arithmetic
 * consistency may raise review but must not silently replace transcript evidence").
 *
 * Returns null when any operand is absent; callers treat null as "cannot check".
 */
export function checkMoneyConsistency(
  totalCents: number | null,
  metCents: number | null,
  remainingCents: number | null,
): { consistent: boolean; expectedRemainingCents: number } | null {
  if (totalCents === null || metCents === null || remainingCents === null) return null;
  const expected = totalCents - metCents;
  return { consistent: expected === remainingCents, expectedRemainingCents: expected };
}
