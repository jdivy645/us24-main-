/**
 * Spoken-number parsing.
 *
 * Required by 08 §14 ("Parse currency symbols, commas, spoken dollars, and cents";
 * "Treat $20, $20.00, and twenty dollars as equivalent") and 15 §4, which makes
 * that equivalence an explicit test.
 *
 * Deliberately conservative: it parses well-formed English cardinals and ordinals
 * and returns null for anything it does not fully understand. Returning null sends
 * the value to review, which is the correct failure direction — 08 §2 forbids
 * "a guessed value merely to satisfy the schema".
 */

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40, // common ASR misspelling
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  million: 1_000_000,
};

/**
 * Ordinals matter for the authorization threshold: the transcript says "after the
 * eighth visit" while the completed form says the fifth (CASE-001). The threshold
 * is a structured number, so the word must resolve to 8.
 */
const ORDINAL_TO_CARDINAL: Record<string, string> = {
  first: 'one',
  second: 'two',
  third: 'three',
  fourth: 'four',
  fifth: 'five',
  sixth: 'six',
  seventh: 'seven',
  eighth: 'eight',
  eigth: 'eight', // common ASR misspelling
  ninth: 'nine',
  tenth: 'ten',
  eleventh: 'eleven',
  twelfth: 'twelve',
  thirteenth: 'thirteen',
  fourteenth: 'fourteen',
  fifteenth: 'fifteen',
  sixteenth: 'sixteen',
  seventeenth: 'seventeen',
  eighteenth: 'eighteen',
  nineteenth: 'nineteen',
  twentieth: 'twenty',
  thirtieth: 'thirty',
  fortieth: 'forty',
  fiftieth: 'fifty',
};

/** Words that carry no numeric weight and may appear inside a spoken number. */
const FILLER = new Set(['and', 'a', 'the', 'about', 'approximately']);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9.\-\s]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !FILLER.has(t));
}

/**
 * Parse an English cardinal or ordinal phrase to a number.
 * Returns null when any token is not understood.
 */
export function parseNumberWords(input: string): number | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let sawAnyNumber = false;

  for (const rawToken of tokens) {
    const token = ORDINAL_TO_CARDINAL[rawToken] ?? rawToken;

    if (token in UNITS) {
      current += UNITS[token] as number;
      sawAnyNumber = true;
      continue;
    }
    if (token in TENS) {
      current += TENS[token] as number;
      sawAnyNumber = true;
      continue;
    }
    if (token in SCALES) {
      const scale = SCALES[token] as number;
      if (scale === 100) {
        // "three hundred" -> 300; "hundred" alone -> 100
        current = (current === 0 ? 1 : current) * scale;
      } else {
        total += (current === 0 ? 1 : current) * scale;
        current = 0;
      }
      sawAnyNumber = true;
      continue;
    }
    // A bare numeral inside a spoken phrase, e.g. "20 percent".
    if (/^\d+$/.test(token)) {
      current += Number(token);
      sawAnyNumber = true;
      continue;
    }
    // Any unrecognised token invalidates the whole phrase rather than being skipped.
    return null;
  }

  if (!sawAnyNumber) return null;
  return total + current;
}

/**
 * Extract a numeric quantity from free text that may be digits or words.
 * Handles "$20", "20", "twenty", "twenty dollars", "the eighth visit".
 */
export function parseQuantity(input: string): number | null {
  const cleaned = input
    .toLowerCase()
    // Units the quantity may be expressed in.
    .replace(/\b(dollars?|cents?|percent|per\s?cent|visits?|days?|months?|years?)\b/g, ' ')
    // Positional words that carry no numeric weight. Stripping them lets
    // "after the eighth visit" resolve to 8 while `parseNumberWords` itself stays
    // strict. Direction is the extractor's concern, not the parser's: the field
    // is already "authorization required AFTER visit number" (06 §12).
    .replace(/\b(after|before|from|following|starting|beginning|the|an?|of|at|on|per)\b/g, ' ')
    .replace(/[$%,]/g, ' ')
    .trim();

  // Pure numeral (possibly decimal) is the common case.
  const numeral = cleaned.match(/^-?\d+(?:\.\d+)?$/);
  if (numeral) return Number(cleaned);

  // A numeral embedded in words: take it only when exactly one is present, so
  // "20 or 30" stays unparsed and becomes a conflict instead of a silent pick.
  const numerals = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (numerals && numerals.length === 1) return Number(numerals[0]);
  if (numerals && numerals.length > 1) return null;

  return parseNumberWords(cleaned);
}
