/**
 * Starter terminology dictionary, version 1.
 *
 * 08_EXTRACTION_NORMALIZATION_COMPARISON.md §9 lists every alias family below;
 * they are reproduced here rather than invented. CLT-008 records why this exists:
 * "Build the initial keyword dictionary because US24 has not supplied one."
 *
 * 08 §9 closes: "The dictionary is versioned and payer-specific additions do not
 * mutate prior runs." Every comparison run therefore records `DICTIONARY_VERSION`,
 * and adding aliases means publishing a new version, never editing this one.
 */

import type { VobFieldKey } from '../types/field-keys.js';

export const DICTIONARY_VERSION = 'terminology-v1-2026-08-07';

export interface TerminologyDictionary {
  readonly version: string;
  /** Label synonyms used when mapping an imported PDF/Excel label to a field. */
  readonly fieldAliases: Readonly<Record<string, readonly string[]>>;
  /** Value synonyms used when normalizing a categorical answer. */
  readonly valueAliases: Readonly<Record<string, readonly string[]>>;
}

/**
 * Field label aliases — 08 §9. Used by document import (13 §2, §4) to map a
 * label found in a PDF or spreadsheet onto a canonical key.
 */
const FIELD_ALIASES: Record<string, readonly string[]> = {
  'primary.policyId': [
    'policy id',
    'policy number',
    'policy #',
    'member id',
    'member number',
    'subscriber id',
    'subscriber number',
    'identification number',
    'insurance id',
    'id number',
  ],
  'primary.groupId': ['group id', 'group number', 'group #', 'group code', 'employer group'],
  'primary.effectiveDate': [
    'effective date',
    'active date',
    'eligible from',
    'coverage started',
    'coverage start',
    'effective on',
    'start date',
  ],
  'primary.terminationDate': [
    'termination date',
    'term date',
    'end date',
    'coverage through',
    'coverage end',
    'termed on',
  ],
  'financial.patientCoinsurancePercent': [
    'coinsurance',
    'co-insurance',
    'patient percentage',
    'patient responsibility percentage',
    'member responsibility percentage',
    'cost share',
    'cost sharing',
  ],
  'financial.individualDeductibleMet': [
    'deductible met',
    'deductible accumulated',
    'deductible applied',
    'deductible satisfied',
    'met to date',
    'accumulated',
  ],
  'financial.individualDeductibleRemaining': [
    'deductible remaining',
    'deductible balance',
    'amount left',
    'remaining deductible',
    'balance',
  ],
  'financial.individualOopMaximum': [
    'out of pocket',
    'out-of-pocket',
    'oop',
    'maximum out of pocket',
    'oop max',
    'out of pocket maximum',
  ],
  'authorization.treatmentRequired': [
    'authorization',
    'prior auth',
    'prior authorization',
    'preauthorization',
    'pre-authorization',
    'precertification',
    'pre-certification',
    'medical necessity review',
  ],
  'referral.required': ['referral', 'pcp referral', 'physician referral'],
  'visits.limitType': [
    'visit limit',
    'visit limits',
    'hard max',
    'hard maximum',
    'calendar year visits',
    'medically necessary',
  ],
  'claims.originalTflValue': [
    'timely filing',
    'tfl',
    'filing limit',
    'claim submission period',
    'timely filing limit',
  ],
  'claims.correctedTflValue': [
    'corrected claim',
    'corrected timely filing',
    'resubmission',
    'resubmission period',
    'practitioner correction',
  ],
  'call.referenceNumber': [
    'call reference',
    'reference number',
    'confirmation number',
    'interaction id',
    'call id',
  ],
  'financial.copayAmount': ['copay', 'co-pay', 'copayment', 'co-payment'],
  'primary.insuranceName': ['insurance', 'insurance name', 'payer', 'carrier', 'plan carrier'],
  'primary.insurancePhone': ['insurance phone', 'payer phone', 'customer service', 'benefits phone'],
  'primary.payerId': ['payer id', 'payor id', 'electronic payer id', 'edi payer id'],
  'claims.mailingAddress': ['claims address', 'claim address', 'claims mailing address', 'mail claims to'],
  'patient.dateOfBirth': ['dob', 'date of birth', 'birth date', 'birthdate'],
  'coordination.secondaryStatus': ['secondary', 'secondary insurance', 'secondary coverage', 'cob'],
};

/**
 * Value aliases — 08 §16 ("Normalize INN to In Network and OON to Out of Network";
 * "Normalize medically necessary and hard maximum as visit-limit categories").
 *
 * Keys are canonical values; entries are the surface forms that map to them.
 */
const VALUE_ALIASES: Record<string, readonly string[]> = {
  // Network
  IN_NETWORK: ['in network', 'in-network', 'inn', 'par', 'participating', 'contracted'],
  OUT_OF_NETWORK: ['out of network', 'out-of-network', 'oon', 'non-par', 'nonpar', 'non participating'],

  // Answers. Note there is no alias that maps silence or blank to NO — 08 §8.
  YES: ['yes', 'y', 'yeah', 'yep', 'correct', 'that is correct', 'affirmative', 'required', 'true'],
  NO: ['no', 'n', 'nope', 'not required', 'none', 'negative', 'false'],
  UNKNOWN: ['unknown', 'unsure', 'not sure', 'unclear', "don't know", 'do not know'],
  NOT_ASKED: ['not asked', 'not discussed', 'did not ask', 'was not asked'],
  PAYER_UNABLE_TO_VERIFY: [
    'payer unable to verify',
    'unable to verify',
    'cannot see that',
    'cannot see',
    "can't see",
    'not visible',
    'no visibility',
    'not showing on my end',
    'i cannot view that',
  ],
  NOT_APPLICABLE: ['not applicable', 'n/a', 'na', 'does not apply'],

  // Visit limit types
  HARD_MAXIMUM: ['hard max', 'hard maximum', 'hard limit', 'maximum', 'capped'],
  MEDICALLY_NECESSARY: ['medically necessary', 'medical necessity', 'as medically necessary'],
  NO_STATED_LIMIT: ['no stated limit', 'unlimited', 'no limit', 'no maximum'],

  // Eligibility
  ACTIVE: ['active', 'current', 'currently active', 'in force', 'eligible'],
  TERMINATED: ['terminated', 'termed', 'inactive', 'cancelled', 'canceled'],
  PENDING: ['pending', 'pending activation'],

  // Scope
  INDIVIDUAL: ['individual', 'member', 'single', 'self only'],
  FAMILY: ['family'],
  COMBINED: ['combined', 'shared', 'aggregate'],

  // Periods
  CALENDAR_YEAR: ['calendar year', 'cy', 'per calendar year', 'annual'],
  BENEFIT_YEAR: ['benefit year', 'plan year', 'policy year'],
  ROLLING_PERIOD: ['rolling', 'rolling period', 'rolling year'],
  EPISODE: ['per episode', 'episode of care', 'per condition'],
  LIFETIME: ['lifetime', 'per lifetime'],

  // Timely filing references
  DATE_OF_SERVICE: ['from dos', 'from date of service', 'date of service', 'dos'],
  REMITTANCE_ADVICE: ['from ra', 'remittance advice', 'ra', 'eob date', 'from the eob'],
  DATE_OF_DISCHARGE: ['from discharge', 'date of discharge'],

  // Authorization method
  PHONE: ['phone', 'by phone', 'call', 'telephone'],
  PORTAL: ['portal', 'online', 'website', 'web portal'],
  FAX: ['fax', 'by fax'],

  // Plan types
  HMO: ['hmo'],
  PPO: ['ppo'],
  EPO: ['epo'],
  POS: ['pos'],

  // TFL units
  DAYS: ['days', 'day', 'calendar days'],
  BUSINESS_DAYS: ['business days', 'working days'],
  MONTHS: ['months', 'month'],
  YEARS: ['years', 'year'],

  // Service types
  PT: ['pt', 'physical therapy', 'physiotherapy'],
  OT: ['ot', 'occupational therapy'],
  ST: ['st', 'speech therapy', 'speech language pathology', 'slp'],
  CHIROPRACTIC: ['chiro', 'chiropractic', 'chiropractor'],
};

export const TERMINOLOGY_V1: TerminologyDictionary = {
  version: DICTIONARY_VERSION,
  fieldAliases: FIELD_ALIASES,
  valueAliases: VALUE_ALIASES,
};

/** Reverse index: surface form -> canonical value. Built once. */
const VALUE_LOOKUP: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(VALUE_ALIASES)) {
    map.set(canonical.toLowerCase(), canonical);
    for (const alias of aliases) map.set(alias.toLowerCase(), canonical);
  }
  return map;
})();

/**
 * Resolve a surface form to a canonical value, restricted to an allowed set.
 * The restriction matters: "PHONE" is a valid authorization method and also a
 * data type, so the caller's option list decides which meaning applies.
 */
export function resolveValueAlias(
  surface: string,
  allowedValues: readonly string[],
): string | null {
  const normalized = surface.trim().toLowerCase().replace(/\s+/g, ' ');
  const direct = VALUE_LOOKUP.get(normalized);
  if (direct && allowedValues.includes(direct)) return direct;

  // Exact match against an allowed value that has no alias entry.
  const exact = allowedValues.find((v) => v.toLowerCase() === normalized);
  return exact ?? null;
}

/** Reverse index: label alias -> canonical field key. Used by document import. */
const FIELD_LOOKUP: ReadonlyMap<string, VobFieldKey> = (() => {
  const map = new Map<string, VobFieldKey>();
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) map.set(alias.toLowerCase(), key as VobFieldKey);
  }
  return map;
})();

export function resolveFieldAlias(label: string): VobFieldKey | null {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[:#*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return FIELD_LOOKUP.get(normalized) ?? null;
}
