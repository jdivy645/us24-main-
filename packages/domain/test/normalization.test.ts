/**
 * Normalization tests — 15 §4, reproduced clause by clause.
 *
 * Each `describe` below quotes the spec bullet it enforces.
 */

import { describe, expect, it } from 'vitest';
import {
  checkMoneyConsistency,
  complementPercent,
  formatCents,
  inferCoverageFromCostSharing,
  isOpenEndedDateTerm,
  isUnknownFamily,
  isVerifiedNegative,
  normalizeAnswer,
  normalizeCategorical,
  normalizeDate,
  normalizeIdentifier,
  normalizeInteger,
  normalizeMoney,
  normalizePercent,
  normalizePhone,
  parseNumberWords,
  parseQuantity,
  suffixRelationship,
} from '../src/index.js';

describe('money — "$20, $20.00, and twenty dollars match" (15 §4)', () => {
  it('treats all three forms as the same value', () => {
    const a = normalizeMoney('$20');
    const b = normalizeMoney('$20.00');
    const c = normalizeMoney('twenty dollars');
    expect(a.comparisonKey).toBe(b.comparisonKey);
    expect(b.comparisonKey).toBe(c.comparisonKey);
  });

  it('stores integer cents, never binary floating point (08 §14)', () => {
    expect(normalizeMoney('$20').canonical).toBe(2000);
    expect(normalizeMoney('$5,473.76').canonical).toBe(547376);
    // The classic float trap: 0.1 + 0.2 !== 0.3. Cents arithmetic is exact.
    expect(normalizeMoney('$0.10').canonical).toBe(10);
    expect(normalizeMoney('$0.20').canonical).toBe(20);
  });

  it('parses spoken dollars and cents', () => {
    expect(normalizeMoney('five thousand four hundred seventy three dollars and seventy six cents').canonical)
      .toBe(547376);
  });

  it('removes thousands separators without losing precision', () => {
    expect(normalizeMoney('3,000.00').canonical).toBe(300000);
    expect(formatCents(300000)).toBe('$3,000.00');
  });

  it('does not infer missing thousands from garbled audio (08 §14)', () => {
    // "twelve hundred" and "twelve thousand" stay different values.
    expect(normalizeMoney('twelve hundred').canonical).toBe(120000);
    expect(normalizeMoney('twelve thousand').canonical).toBe(1200000);
  });

  it('refuses to guess when the amount is unreadable', () => {
    const result = normalizeMoney('somewhere around a few hundred-ish');
    expect(result.ok).toBe(false);
    expect(result.canonical).toBeNull();
  });

  it('flags arithmetic inconsistency without changing the stated values (06 §9)', () => {
    const check = checkMoneyConsistency(300000, 120000, 180000);
    expect(check?.consistent).toBe(true);
    const bad = checkMoneyConsistency(300000, 120000, 999999);
    expect(bad?.consistent).toBe(false);
    expect(bad?.expectedRemainingCents).toBe(180000);
  });
});

describe('dates — "10/07/2010 and October 7th 2010 match" (15 §4)', () => {
  it('normalizes both forms to the same ISO value', () => {
    expect(normalizeDate('10/07/2010').canonical).toBe('2010-10-07');
    expect(normalizeDate('October 7th 2010').canonical).toBe('2010-10-07');
    expect(normalizeDate('Oct 7, 2010').canonical).toBe('2010-10-07');
    expect(normalizeDate('2010-10-07').canonical).toBe('2010-10-07');
  });

  it('displays the US format while storing ISO (08 §13)', () => {
    expect(normalizeDate('October 7th 2010').display).toBe('10/07/2010');
  });

  it('"Current" is not converted into a fake termination date (15 §4)', () => {
    const result = normalizeDate('Current');
    expect(result.ok).toBe(false);
    expect(result.canonical).toBeNull();
    expect(result.errorCode).toBe('OPEN_ENDED_NOT_A_DATE');
    expect(result.errorMessage).toContain('eligibility status');
  });

  it('treats "no termination date" as open-ended, not as a date (08 §16)', () => {
    expect(isOpenEndedDateTerm('no termination date')).toBe(true);
    expect(isOpenEndedDateTerm('none')).toBe(true);
    expect(isOpenEndedDateTerm('10/07/2010')).toBe(false);
  });

  it('does not guess the century (08 §13)', () => {
    const result = normalizeDate('10/07/10');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('AMBIGUOUS_YEAR');
  });

  it('does not swap month and day when the order is impossible (08 §13)', () => {
    const result = normalizeDate('25/12/2026');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('AMBIGUOUS_DAY_MONTH');
  });

  it('rejects impossible calendar dates', () => {
    expect(normalizeDate('02/30/2026').ok).toBe(false);
  });
});

describe('identifiers — leading zeros and suffixes (15 §4, 08 §12)', () => {
  it('preserves leading zeros in group IDs', () => {
    expect(normalizeIdentifier('00633434').canonical).toBe('00633434');
    // The failure mode this guards against is numeric coercion.
    expect(normalizeIdentifier('00633434').canonical).not.toBe(633434);
    expect(typeof normalizeIdentifier('00633434').canonical).toBe('string');
  });

  it('preserves leading zeros even when the value arrives as a number', () => {
    // A spreadsheet cell may hand over 633434; it must not gain or lose digits.
    expect(normalizeIdentifier(633434).canonical).toBe('633434');
  });

  it('joins digits spoken with pauses', () => {
    expect(normalizeIdentifier('1 0 6 7 2 3 4 3 4').canonical).toBe('106723434');
  });

  it('keeps a policy suffix distinct unless a payer rule permits equivalence', () => {
    const a = normalizeIdentifier('106723434');
    const b = normalizeIdentifier('106723434-01');
    expect(a.comparisonKey).not.toBe(b.comparisonKey);
  });

  it('detects a suffix relationship without declaring the values equal', () => {
    const related = suffixRelationship('106723434-01', '106723434');
    expect(related?.related).toBe(true);
    expect(related?.suffix).toBe('-01');
    // Unrelated identifiers are not forced into a relationship.
    expect(suffixRelationship('106723434', '999999999')).toBeNull();
  });

  it('preserves alpha prefixes and suffixes', () => {
    expect(normalizeIdentifier('ASHP1').canonical).toBe('ASHP1');
    expect(normalizeIdentifier('W12345678A').canonical).toBe('W12345678A');
  });
});

describe('phone — "Phone punctuation is normalized" (15 §4)', () => {
  it('compares equal across punctuation variants', () => {
    const forms = ['800-972-4226', '(800) 972-4226', '800.972.4226', '8009724226', '1-800-972-4226'];
    const keys = forms.map((f) => normalizePhone(f).comparisonKey);
    expect(new Set(keys).size).toBe(1);
  });

  it('displays a readable format', () => {
    expect(normalizePhone('8009724226').display).toBe('(800) 972-4226');
  });
});

describe('percentages — patient versus payer (15 §4, 08 §15)', () => {
  it('parses percent signs and spoken percentages', () => {
    expect(normalizePercent('20%').canonical).toBe(20);
    expect(normalizePercent('20 percent').canonical).toBe(20);
    expect(normalizePercent('twenty percent').canonical).toBe(20);
  });

  it('does not mislabel 20 percent patient coinsurance as payer coverage', () => {
    // The complement is available for explanation only; it is never written back.
    expect(complementPercent(20)).toBe(80);
    expect(normalizePercent('20%').canonical).toBe(20);
  });

  it('sends an out-of-range percentage to review rather than clamping it', () => {
    const result = normalizePercent('120%');
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('PERCENT_OUT_OF_RANGE');
  });

  it('leaves "20 or 30" unparsed so it becomes a conflict, not a silent pick', () => {
    expect(parseQuantity('20 or 30')).toBeNull();
  });
});

describe('no copay and no coinsurance do not derive 100 percent (15 §4, ADR-012)', () => {
  it('never returns a coverage percentage, whatever the inputs', () => {
    const combinations = [
      ['NO', 'NO'],
      ['NO', 'UNKNOWN'],
      ['UNKNOWN', 'NO'],
      ['NO', null],
      [null, 'NO'],
      [null, null],
      ['YES', 'YES'],
    ] as const;
    for (const [copay, coinsurance] of combinations) {
      expect(
        inferCoverageFromCostSharing(copay, coinsurance),
        `inferred coverage from copay=${copay}, coinsurance=${coinsurance}`,
      ).toBeNull();
    }
  });
});

describe('answers — blank is never No (15 §4, 06 §18, 08 §8)', () => {
  it('returns empty for a blank input rather than NO', () => {
    for (const blank of ['', '   ', null, undefined]) {
      const result = normalizeAnswer(blank);
      expect(result.canonical).toBeNull();
      expect(result.canonical).not.toBe('NO');
    }
  });

  it('keeps UNKNOWN, NOT_ASKED, PAYER_UNABLE_TO_VERIFY and NOT_APPLICABLE distinct', () => {
    const values = ['unknown', 'not asked', 'cannot see that', 'not applicable'].map(
      (v) => normalizeAnswer(v).canonical,
    );
    expect(values).toEqual(['UNKNOWN', 'NOT_ASKED', 'PAYER_UNABLE_TO_VERIFY', 'NOT_APPLICABLE']);
    expect(new Set(values).size).toBe(4);
  });

  it('maps "we cannot see that" to PAYER_UNABLE_TO_VERIFY, not NO (08 §8)', () => {
    for (const phrase of ['cannot see that', "can't see", 'not visible', 'unable to verify']) {
      expect(normalizeAnswer(phrase).canonical).toBe('PAYER_UNABLE_TO_VERIFY');
    }
  });

  it('distinguishes a verified negative from the unknown family', () => {
    expect(isVerifiedNegative('NO')).toBe(true);
    expect(isVerifiedNegative('PAYER_UNABLE_TO_VERIFY')).toBe(false);
    expect(isUnknownFamily('PAYER_UNABLE_TO_VERIFY')).toBe(true);
    expect(isUnknownFamily('NO')).toBe(false);
  });

  it('sends an unrecognised answer to review rather than reading it as Yes or No', () => {
    const result = normalizeAnswer('sort of, in some circumstances');
    expect(result.ok).toBe(false);
    expect(result.canonical).toBeNull();
  });
});

describe('categorical aliases — "INN and in network match" (15 §4)', () => {
  const NETWORK = ['IN_NETWORK', 'OUT_OF_NETWORK', 'UNKNOWN', 'NOT_APPLICABLE'];

  it('normalizes INN to In Network and OON to Out of Network (08 §16)', () => {
    expect(normalizeCategorical('INN', NETWORK).canonical).toBe('IN_NETWORK');
    expect(normalizeCategorical('in network', NETWORK).canonical).toBe('IN_NETWORK');
    expect(normalizeCategorical('OON', NETWORK).canonical).toBe('OUT_OF_NETWORK');
    expect(normalizeCategorical('out-of-network', NETWORK).canonical).toBe('OUT_OF_NETWORK');
  });

  it('normalizes visit-limit categories', () => {
    const LIMITS = ['HARD_MAXIMUM', 'MEDICALLY_NECESSARY', 'NO_STATED_LIMIT', 'UNKNOWN'];
    expect(normalizeCategorical('hard max', LIMITS).canonical).toBe('HARD_MAXIMUM');
    expect(normalizeCategorical('medically necessary', LIMITS).canonical).toBe('MEDICALLY_NECESSARY');
  });

  it('rejects a value outside the field option set', () => {
    expect(normalizeCategorical('PPO', NETWORK).ok).toBe(false);
  });
});

describe('spoken numbers and ordinals', () => {
  it('parses cardinals', () => {
    expect(parseNumberWords('twenty')).toBe(20);
    expect(parseNumberWords('nineteen')).toBe(19);
    expect(parseNumberWords('three thousand')).toBe(3000);
    expect(parseNumberWords('six thousand five hundred')).toBe(6500);
    expect(parseNumberWords('one hundred eighty')).toBe(180);
  });

  it('parses ordinals, which the authorization threshold depends on (CASE-001)', () => {
    expect(parseNumberWords('eighth')).toBe(8);
    expect(parseNumberWords('fifth')).toBe(5);
    expect(normalizeInteger('after the eighth visit').canonical).toBe(8);
  });

  it('returns null for phrases it does not fully understand', () => {
    expect(parseNumberWords('quite a few')).toBeNull();
    expect(parseNumberWords('')).toBeNull();
  });
});
