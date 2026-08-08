/**
 * Percentage normalization — 08 §15.
 *
 *   "Parse percent signs and spoken percentages."
 *   "Distinguish patient coinsurance from payer coverage."
 *   "Treat 20 percent patient responsibility and 80 percent payer coverage as
 *    related but not identical field labels."
 *   "Do not infer 100 percent payer coverage from zero copay and zero coinsurance."
 *   "A contradiction between 20 and 30 percent remains material."
 *
 * The last line is CASE-002. Note there is no "pick the first" or "pick the last"
 * behaviour anywhere in this module — resolving competing percentages is the
 * comparison engine's job, and its answer for CASE-002 is CONFLICT_IN_SOURCE.
 */

import { parseNumberWords } from './number-words.js';
import { empty, fail, isBlankInput, ok, type NormalizationResult } from './types.js';

export function normalizePercent(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];

  if (typeof raw === 'number') {
    // A spreadsheet may store 20% as 0.2. Values at or below 1 are ambiguous, so
    // they are read as fractions only when the cell is explicitly formatted that
    // way; here a bare number is taken at face value and flagged in the steps.
    if (!Number.isFinite(raw)) return fail('PERCENT_NOT_FINITE', 'Value is not a finite number.');
    return ok(raw, `${raw}%`, String(raw), [`read numeric value ${raw} as a percentage`]);
  }

  const original = String(raw).trim();
  let text = original.toLowerCase();
  steps.push(`trimmed "${original}"`);

  if (text.includes('%')) {
    text = text.replace(/%/g, '').trim();
    steps.push('removed percent sign');
  }
  text = text.replace(/\bper\s?cent\b/g, '').replace(/\bpercent\b/g, '').trim();

  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    const value = Number(text);
    if (value < 0 || value > 100) {
      return fail(
        'PERCENT_OUT_OF_RANGE',
        `${value}% is outside the 0–100 range and is sent to review rather than clamped.`,
        steps,
      );
    }
    steps.push('parsed numeric percentage');
    return ok(value, `${value}%`, String(value), steps);
  }

  const spoken = parseNumberWords(text);
  if (spoken !== null) {
    if (spoken < 0 || spoken > 100) {
      return fail('PERCENT_OUT_OF_RANGE', `${spoken}% is outside the 0–100 range.`, steps);
    }
    steps.push('parsed spoken percentage');
    return ok(spoken, `${spoken}%`, String(spoken), steps);
  }

  return fail(
    'PERCENT_UNPARSEABLE',
    'The percentage could not be read. It is kept as written and sent to review rather than guessed.',
    steps,
  );
}

/**
 * The complement of a percentage, used only for EXPLANATION, never for filling a
 * field. 08 §15 keeps patient coinsurance and payer coverage as separate labels,
 * so the UI may say "20% patient responsibility corresponds to 80% payer
 * coverage" without ever writing 80 into `payerCoveragePercent`.
 */
export function complementPercent(value: number): number {
  return 100 - value;
}

/**
 * ADR-012 / 08 §15 / 13 §9 guard.
 *
 * The current HTML prototype infers 100% coverage when copay and coinsurance are
 * both No (02 §3, CUR-007). That inference is removed. This function exists so
 * the prohibition is executable and testable rather than a comment: it always
 * returns null, and the accompanying test asserts that no combination of inputs
 * produces a number.
 */
export function inferCoverageFromCostSharing(
  _copayApplies: string | null,
  _coinsuranceApplies: string | null,
): null {
  // Deductible, exclusions, authorization requirements, visit limits and
  // out-of-network status can all create patient responsibility even when both
  // copay and coinsurance are absent. No inference is safe.
  return null;
}
