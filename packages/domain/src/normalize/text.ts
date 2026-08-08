/**
 * String normalization — 08 §11.
 *
 *   "Trim surrounding whitespace; Collapse repeated internal whitespace where
 *    semantically harmless."
 *   "Normalize case for comparison while preserving display case."
 *   "Normalize common punctuation variants; Use Unicode normalization."
 *   "Do not remove meaningful identifier suffixes; Do not fuzzy-match arbitrary
 *    long free text as an automatic pass."
 */

import { empty, isBlankInput, ok, type NormalizationResult } from './types.js';

/** Curly quotes, en/em dashes and non-breaking spaces arrive from PDF and DOCX text. */
function normalizePunctuation(input: string): string {
  return input
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[\u00a0\u202f\u2007]/g, ' ');
}

export function normalizeString(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  const original = String(raw);

  let value = original.normalize('NFKC');
  if (value !== original) steps.push('applied Unicode normalization');

  const punctuated = normalizePunctuation(value);
  if (punctuated !== value) steps.push('normalized quote and dash characters');
  value = punctuated;

  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed !== value) steps.push('trimmed and collapsed whitespace');
  value = trimmed;

  const comparisonKey = value.toLowerCase();
  if (comparisonKey !== value) steps.push('lower-cased for comparison; display case preserved');

  return ok(value, value, comparisonKey, steps);
}

/**
 * Long free text. Normalized for display but given a comparison key that the
 * engine deliberately refuses to auto-pass on similarity — see the
 * NARRATIVE_REVIEW comparison strategy. 08 §11: "Do not fuzzy-match arbitrary
 * long free text as an automatic pass."
 */
export function normalizeFreeText(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  const original = String(raw);
  const value = normalizePunctuation(original.normalize('NFKC')).trim();
  steps.push('normalized characters and trimmed; internal line breaks preserved');

  return ok(value, value, value.toLowerCase().replace(/\s+/g, ' '), steps);
}

/**
 * Postal addresses. Line breaks collapse to comma separation for comparison so a
 * two-line and three-line rendering of the same address agree, while display
 * keeps the original layout.
 */
export function normalizeAddress(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  const original = String(raw);
  const display = normalizePunctuation(original.normalize('NFKC')).trim();

  const comparisonKey = display
    .toLowerCase()
    .replace(/[\r\n]+/g, ', ')
    .replace(/[.,]/g, ' ')
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(suite|ste)\b/g, 'ste')
    .replace(/\b(post office box|po box|pobox)\b/g, 'po box')
    .replace(/\s+/g, ' ')
    .trim();
  steps.push('collapsed line breaks and standardised common address abbreviations');

  return ok(display, display, comparisonKey, steps);
}
