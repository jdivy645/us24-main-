/**
 * Date normalization — 08 §13.
 *
 *   "Parse spoken month-day-year and numeric US date forms."
 *   "Store ISO date values; Display the client-approved US format."
 *   "Do not guess century or swap month and day when ambiguous."
 *   "Represent `current` as an eligibility or open-ended-period concept, not a fake date."
 *
 * 15 §4 makes two of these an explicit test: 10/07/2010 must equal
 * "October 7th 2010", and "Current" must never become a date.
 */

import { empty, fail, isBlankInput, ok, type NormalizationResult } from './types.js';

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

/**
 * Words that describe open-ended or absent coverage end dates. These are NOT
 * dates and must never be converted into one — 08 §13 and 08 §16
 * ("Normalize `no termination date` separately from an explicit coverage end").
 */
const OPEN_ENDED_TERMS = new Set([
  'current',
  'currently',
  'active',
  'ongoing',
  'open',
  'none',
  'n/a',
  'na',
  'no termination date',
  'no term date',
  'not listed',
  'no end date',
  'open ended',
  'open-ended',
]);

const US_DISPLAY = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

function toIso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function displayIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return US_DISPLAY.format(new Date(Date.UTC(y as number, (m as number) - 1, d as number)));
}

export function normalizeDate(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();

  const steps: string[] = [];
  const original = String(raw).trim();
  const lower = original.toLowerCase().replace(/\s+/g, ' ');
  steps.push(`trimmed "${original}"`);

  // "Current" and friends describe eligibility, not a date. Refusing to parse is
  // the point: the caller records eligibility ACTIVE and leaves the date blank.
  if (OPEN_ENDED_TERMS.has(lower)) {
    return fail(
      'OPEN_ENDED_NOT_A_DATE',
      `"${original}" describes open-ended coverage, not a date. Record eligibility status instead of inventing a termination date.`,
      steps,
    );
  }

  // ISO: 2010-10-07
  const iso = lower.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const year = Number(y), month = Number(m), day = Number(d);
    if (!isRealDate(year, month, day)) {
      return fail('DATE_INVALID', `"${original}" is not a real calendar date.`, steps);
    }
    const value = toIso(year, month, day);
    steps.push('parsed ISO form');
    return ok(value, displayIso(value), value, steps);
  }

  // US numeric: 10/07/2010, 10-07-2010, 10.07.2010
  const usNumeric = lower.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (usNumeric) {
    const [, a, b, c] = usNumeric;
    const yearRaw = c as string;
    // 08 §13: "Do not guess century." A two-digit year is ambiguous, full stop.
    if (yearRaw.length !== 4) {
      return fail(
        'AMBIGUOUS_YEAR',
        `"${original}" has a two-digit year. The century is not guessed — confirm the full year.`,
        steps,
      );
    }
    const month = Number(a), day = Number(b), year = Number(yearRaw);
    // 08 §13: "…or swap month and day when ambiguous." US order is assumed, so a
    // first component above 12 is a real problem rather than a silent DD/MM read.
    if (month > 12) {
      return fail(
        'AMBIGUOUS_DAY_MONTH',
        `"${original}" cannot be read as US month/day order. Month and day are never swapped automatically.`,
        steps,
      );
    }
    if (!isRealDate(year, month, day)) {
      return fail('DATE_INVALID', `"${original}" is not a real calendar date.`, steps);
    }
    const value = toIso(year, month, day);
    steps.push('parsed US month/day/year form');
    return ok(value, displayIso(value), value, steps);
  }

  // Spoken / written: "October 7th 2010", "Oct 7, 2010", "7 October 2010"
  const monthFirst = lower.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  const dayFirst = lower.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/);
  const spoken = monthFirst
    ? { monthWord: monthFirst[1], day: monthFirst[2], year: monthFirst[3] }
    : dayFirst
      ? { monthWord: dayFirst[2], day: dayFirst[1], year: dayFirst[3] }
      : null;

  if (spoken) {
    const month = MONTHS[spoken.monthWord as string];
    if (month === undefined) {
      return fail('UNKNOWN_MONTH', `"${spoken.monthWord}" is not a recognised month.`, steps);
    }
    const day = Number(spoken.day), year = Number(spoken.year);
    if (!isRealDate(year, month, day)) {
      return fail('DATE_INVALID', `"${original}" is not a real calendar date.`, steps);
    }
    const value = toIso(year, month, day);
    steps.push('parsed written month name form');
    return ok(value, displayIso(value), value, steps);
  }

  return fail(
    'DATE_UNPARSEABLE',
    'The date could not be read. It is kept as written and sent to review rather than guessed.',
    steps,
  );
}

/** True when the text describes open-ended coverage rather than a date. */
export function isOpenEndedDateTerm(raw: string): boolean {
  return OPEN_ENDED_TERMS.has(raw.trim().toLowerCase().replace(/\s+/g, ' '));
}

/**
 * Timestamp normalization for call times only. 08 §13: "Attach timezone to call
 * timestamps but not to date-only benefit fields."
 */
export function normalizeDateTime(raw: unknown): NormalizationResult {
  if (isBlankInput(raw)) return empty();
  const original = String(raw).trim();
  const parsed = new Date(original);
  if (Number.isNaN(parsed.getTime())) {
    return fail('DATETIME_UNPARSEABLE', 'The timestamp could not be read.', [
      `trimmed "${original}"`,
    ]);
  }
  const value = parsed.toISOString();
  return ok(value, value, value, [`trimmed "${original}"`, 'parsed as ISO timestamp']);
}
