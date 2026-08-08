/**
 * Normalization contracts.
 *
 * 08_EXTRACTION_NORMALIZATION_COMPARISON.md §1: "The normalization layer converts
 * comparable values without destroying raw source text."
 * §11: "Return the transformation steps for explanation." — the Comparison tab in
 * the workspace (05 §9) shows raw value, normalized value and the rule that
 * produced it, so every normalizer records what it did.
 */

import type { CanonicalValue } from '../types/value-envelope.js';

export interface NormalizationResult {
  /** False when the input could not be parsed. `canonical` is then null. */
  readonly ok: boolean;
  /** The comparable canonical value. */
  readonly canonical: CanonicalValue;
  /** Formatted for display. Null when there is nothing to show. */
  readonly display: string | null;
  /**
   * The string actually used for equality. Kept separate from `canonical` so a
   * money value can compare on integer cents while displaying "$3,000.00".
   */
  readonly comparisonKey: string | null;
  /** Ordered description of each transformation applied — 08 §11. */
  readonly steps: readonly string[];
  /** Machine code when `ok` is false, e.g. AMBIGUOUS_DATE. */
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export function ok(
  canonical: CanonicalValue,
  display: string | null,
  comparisonKey: string | null,
  steps: readonly string[],
): NormalizationResult {
  return { ok: true, canonical, display, comparisonKey, steps };
}

export function fail(
  errorCode: string,
  errorMessage: string,
  steps: readonly string[] = [],
): NormalizationResult {
  return {
    ok: false,
    canonical: null,
    display: null,
    comparisonKey: null,
    steps,
    errorCode,
    errorMessage,
  };
}

/** An empty input is empty. It is never a substantive answer — 06 §18, 08 §8. */
export function empty(steps: readonly string[] = ['input was blank']): NormalizationResult {
  return { ok: true, canonical: null, display: null, comparisonKey: null, steps };
}

export function isBlankInput(raw: unknown): boolean {
  return raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
}
