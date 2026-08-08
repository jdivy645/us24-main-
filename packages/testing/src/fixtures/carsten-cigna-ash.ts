/**
 * Golden fixture — the Cigna ASH verification case.
 *
 * ============================================================================
 * PROVENANCE AND STATUS
 *
 * 15 §8 designates three client files as the golden fixture:
 *   VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf   (the completed form)
 *   CARSTEN UHC (AARA) (2).txt                    (the call transcript)
 *   VOB_SAMPLE (1).docx                           (the blank template)
 *
 * None of those files were supplied with the specification package. This fixture
 * is therefore RECONSTRUCTED from the values the specs state verbatim:
 *   02 §5  — completed sample PDF findings
 *   02 §9  — CASE-001 … CASE-012 discrepancy requirements
 *   15 §9  — golden-case expected matches
 *   15 §10 — golden-case required mismatch or review outcomes
 *   15 §11 — golden-case correction expectation
 *
 * It is synthetic, non-PHI demo data, which is what 16 §1 requires of fixtures.
 * The patient name is invented: no spec file states it. Every benefit value,
 * identifier and discrepancy below is quoted from the sections above.
 *
 * WHEN THE REAL FILES ARRIVE: implement `GoldenFixtureLoader` against them and
 * register it in `../loader.ts`. No engine code and no test assertion changes.
 * ============================================================================
 */

import type {
  CandidateScope,
  EvidenceRef,
  ExtractedCandidate,
  SpeakerRole,
  SpeechAct,
} from '@us24/domain';

/**
 * CASE-012: "The filename contains UHC while the content concerns Cigna ASH;
 * filenames must not supply benefit facts." The label below is deliberately the
 * misleading one, and the test asserts no candidate value derives from it.
 */
export const TRANSCRIPT_ARTIFACT = {
  id: 'artifact-transcript-0001',
  label: 'CARSTEN UHC (AARA) (2).txt',
} as const;

export const COMPLETED_FORM_ARTIFACT = {
  id: 'artifact-completedform-0001',
  label: 'VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf',
} as const;

let candidateSeq = 0;

interface CandidateSpec {
  field: string;
  raw: string;
  parsed: string | number | boolean | null;
  role?: SpeakerRole;
  act?: SpeechAct;
  confidence?: number;
  at: number;
  excerpt: string;
  rationale?: string;
  supersedes?: string;
  scope?: CandidateScope;
  id?: string;
}

function candidate(spec: CandidateSpec): ExtractedCandidate {
  const evidence: EvidenceRef = {
    evidenceId: `ev-${String(++candidateSeq).padStart(4, '0')}`,
    artifactId: TRANSCRIPT_ARTIFACT.id,
    artifactLabel: TRANSCRIPT_ARTIFACT.label,
    segmentId: `seg-${Math.round(spec.at)}`,
    timestampStart: spec.at,
    timestampEnd: spec.at + 6,
    excerpt: spec.excerpt,
    speakerRole: spec.role ?? 'PAYER_REPRESENTATIVE',
    rawSpeakerLabel: (spec.role ?? 'PAYER_REPRESENTATIVE') === 'CALLER' ? 'US24' : 'ASH',
  };

  return {
    candidateId: spec.id ?? `cand-${String(candidateSeq).padStart(4, '0')}`,
    fieldKey: spec.field as ExtractedCandidate['fieldKey'],
    rawValue: spec.raw,
    parsedValue: spec.parsed,
    sourceType: (spec.role ?? 'PAYER_REPRESENTATIVE') === 'CALLER'
      ? 'TRANSCRIPT_CALLER_STATED'
      : (spec.role ?? 'PAYER_REPRESENTATIVE') === 'IVR'
        ? 'TRANSCRIPT_IVR'
        : 'TRANSCRIPT_REP_CONFIRMED',
    speakerRole: spec.role ?? 'PAYER_REPRESENTATIVE',
    speechAct: spec.act ?? 'ANSWER',
    scope: spec.scope ?? {},
    evidence,
    confidence: spec.confidence ?? 0.9,
    ...(spec.rationale ? { confidenceRationale: spec.rationale } : {}),
    ...(spec.supersedes ? { supersedesCandidateId: spec.supersedes } : {}),
  };
}

/**
 * The completed VOB under audit — 02 §5.
 *
 * These are the values the polished PDF asserts. 00 §3 warns that the sample
 * "demonstrates current output expectations but does not prove every value is
 * correct", and six of these values are wrong or unsupported.
 */
export const COMPLETED_FORM_VALUES: Readonly<Record<string, string | null>> = {
  'patient.lastName': 'Rivera',
  'patient.firstName': 'Dominic',
  'patient.dateOfBirth': '10/07/2010',
  'verification.date': '08/04/2026',
  'verification.verifiedByLabel': 'Workstation 4',
  'verification.serviceDate': '08/11/2026',

  'primary.insuranceName': 'Cigna ASH',
  'primary.insurancePhone': '800-972-4226',
  'primary.policyId': '106723434-01',
  'primary.groupId': '00633434',
  'primary.planType': 'PPO',
  'primary.serviceType': 'PT',
  'primary.networkGroupStatus': 'In network',
  'primary.effectiveDate': '10/01/2025',
  'primary.eligibilityStatus': 'Active',
  'primary.payerId': 'ASHP1',

  'financial.copayApplies': 'No',
  'financial.coinsuranceApplies': 'Yes',
  'financial.patientCoinsurancePercent': '20%',

  'financial.deductibleApplies': 'Yes',
  'financial.deductibleScope': 'Individual',
  'financial.individualDeductibleTotal': '$3,000.00',
  'financial.individualDeductibleMet': '$1,200.00',
  'financial.individualDeductibleRemaining': '$1,800.00',
  'financial.deductibleAsOfDate': '08/04/2026',

  'financial.individualOopMaximum': '$6,500.00',
  'financial.individualOopRemaining': '$5,473.76',
  'financial.individualOopMet': '$1,026.24',

  'visits.limitType': 'Hard maximum',
  'visits.allowedCount': '20',
  'visits.usedCount': '1',
  'visits.remainingCount': '19',
  'visits.period': 'Calendar year',

  'authorization.treatmentRequired': 'Yes',
  'authorization.requiredAfterVisitNumber': '5',
  'authorization.method': 'Phone',
  'referral.required': 'No',

  'claims.mailingAddress': 'PO Box 981652, El Paso, TX 79998',
  'claims.payerId': 'ASHP1',
  'claims.originalTflValue': '90',
  'claims.originalTflUnit': 'Days',
  'claims.originalTflReference': 'From date of service',
  'claims.correctedTflValue': '180',
  'claims.correctedTflUnit': 'Days',
  'claims.correctedTflReference': 'From date of service',
  'claims.correctedTflAlternativeRule': '180 days from DOS or 60 calendar days from RA',

  'call.representativeName': 'Marisol .C',
  'call.referenceNumber': '20874738',

  'coordination.primaryPayerName': 'Cigna ASH',
  'coordination.secondaryStatus': 'No',
};

/** Candidate ids referenced by the correction chain. */
const VISITS_USED_INITIAL = 'cand-visits-used-initial';

/**
 * Evidence candidates extracted from the call — 02 §6.
 *
 * The transcript "deliberately includes ambiguity that the product must surface"
 * (00 §3): leading questions, a correction chain, two unreconciled percentages,
 * garbled money and an explicit payer-visibility limitation.
 */
const CANDIDATE_LIST: readonly ExtractedCandidate[] = [
  // -- 15 §9 expected matches --------------------------------------------------
  candidate({
    field: 'patient.dateOfBirth',
    raw: 'October 7th 2010',
    parsed: '2010-10-07',
    at: 121.4,
    confidence: 0.93,
    excerpt: 'Thank you. I have the member as a date of birth of October 7th 2010.',
  }),
  candidate({
    field: 'primary.insuranceName',
    raw: 'Cigna ASH',
    parsed: 'Cigna ASH',
    at: 96.2,
    confidence: 0.95,
    excerpt: "You've reached Cigna ASH provider services, this is Marisol.",
  }),
  candidate({
    field: 'primary.serviceType',
    raw: 'physical therapy',
    parsed: 'PT',
    at: 158.0,
    confidence: 0.92,
    excerpt: "You're calling about outpatient physical therapy benefits, correct?",
  }),
  candidate({
    field: 'primary.effectiveDate',
    raw: 'October 1, 2025',
    parsed: '2025-10-01',
    at: 187.5,
    confidence: 0.9,
    excerpt: 'The policy has been effective since October 1, 2025.',
  }),
  candidate({
    field: 'primary.groupId',
    raw: '00633434',
    parsed: '00633434',
    at: 143.8,
    confidence: 0.9,
    excerpt: 'The group number is zero zero six three three four three four.',
    rationale: 'Digits spoken individually; leading zeros explicit.',
  }),
  candidate({
    field: 'financial.individualDeductibleTotal',
    raw: 'three thousand dollars',
    parsed: 300000,
    at: 231.0,
    confidence: 0.88,
    excerpt: 'The individual deductible is three thousand dollars for the calendar year.',
  }),
  candidate({
    field: 'financial.individualOopMaximum',
    raw: '$6,500',
    parsed: 650000,
    at: 268.3,
    confidence: 0.9,
    excerpt: 'Out of pocket maximum is sixty five hundred.',
  }),
  candidate({
    field: 'financial.individualOopRemaining',
    raw: '5,473.76',
    parsed: 547376,
    at: 274.9,
    confidence: 0.87,
    excerpt: 'She has five thousand four hundred seventy three dollars and seventy six cents remaining.',
  }),
  candidate({
    field: 'visits.limitType',
    raw: 'hard max',
    parsed: 'HARD_MAXIMUM',
    at: 302.1,
    confidence: 0.9,
    excerpt: 'That is a hard max, not medically necessary.',
  }),
  candidate({
    field: 'visits.allowedCount',
    raw: 'twenty',
    parsed: 20,
    at: 300.4,
    confidence: 0.92,
    excerpt: 'The plan allows twenty visits per calendar year.',
  }),
  candidate({
    field: 'call.referenceNumber',
    raw: '20874738',
    parsed: '20874738',
    at: 612.7,
    confidence: 0.95,
    excerpt: 'Your reference number for this call is 2 0 8 7 4 7 3 8.',
  }),
  candidate({
    field: 'authorization.treatmentRequired',
    raw: 'yes',
    parsed: 'YES',
    at: 398.2,
    confidence: 0.9,
    excerpt: 'Yes, ongoing treatment does require authorization.',
  }),

  // -- CASE-001: authorization threshold, fifth (form) vs eighth (call) --------
  // 08 §5 matters here: the caller ASKS "After the eighth visit?" and the
  // representative CONFIRMS. Only the confirmation is admissible evidence.
  candidate({
    field: 'authorization.requiredAfterVisitNumber',
    raw: 'after the eighth visit',
    parsed: 8,
    act: 'QUESTION',
    role: 'CALLER',
    at: 402.9,
    confidence: 0.7,
    excerpt: 'After the eighth visit?',
    rationale: 'Caller question, not confirmation.',
  }),
  candidate({
    field: 'authorization.requiredAfterVisitNumber',
    raw: 'after the eighth visit',
    parsed: 8,
    at: 404.2,
    confidence: 0.91,
    excerpt: "Correct — authorization is required after the eighth visit.",
  }),

  // -- CASE-002: 20% and 30% coinsurance, neither correcting the other --------
  candidate({
    field: 'financial.patientCoinsurancePercent',
    raw: '20%',
    parsed: 20,
    at: 209.6,
    confidence: 0.85,
    excerpt: 'Member coinsurance is twenty percent after deductible.',
  }),
  candidate({
    field: 'financial.patientCoinsurancePercent',
    raw: '30%',
    parsed: 30,
    at: 341.2,
    confidence: 0.8,
    excerpt: 'Coinsurance shows thirty percent. Yes.',
    rationale: 'Stated later with no correction language linking it to the earlier value.',
  }),

  // -- CASE-003: original timely filing, 90 days (form) vs 180 (call) ---------
  candidate({
    field: 'claims.originalTflValue',
    raw: '180 days',
    parsed: 180,
    at: 501.3,
    confidence: 0.9,
    excerpt: 'Timely filing for an original claim is one hundred eighty days from date of service.',
  }),
  candidate({
    field: 'claims.originalTflUnit',
    raw: 'days',
    parsed: 'DAYS',
    at: 501.3,
    confidence: 0.9,
    excerpt: 'one hundred eighty days from date of service',
  }),
  candidate({
    field: 'claims.originalTflReference',
    raw: 'from date of service',
    parsed: 'DATE_OF_SERVICE',
    at: 501.3,
    confidence: 0.9,
    excerpt: 'one hundred eighty days from date of service',
  }),

  // -- CASE-009: corrected-claim rule keeps its alternative condition ---------
  candidate({
    field: 'claims.correctedTflAlternativeRule',
    raw: '180 days from DOS or 60 calendar days from RA',
    parsed: '180 days from DOS or 60 calendar days from RA',
    at: 516.8,
    confidence: 0.85,
    excerpt:
      'For a corrected claim it is one hundred eighty days from DOS, or sixty calendar days from the remittance advice, whichever is later.',
  }),

  // -- CASE-004: correction chain. 15 §11 ------------------------------------
  candidate({
    id: VISITS_USED_INITIAL,
    field: 'visits.usedCount',
    raw: 'none used',
    parsed: 0,
    at: 310.5,
    confidence: 0.8,
    excerpt: 'It looks like no visits have been used so far this year.',
  }),
  candidate({
    field: 'visits.usedCount',
    raw: 'let me correct that — for physical therapy she has nineteen remaining out of twenty',
    parsed: null,
    act: 'CORRECTION',
    at: 327.8,
    confidence: 0.89,
    supersedes: VISITS_USED_INITIAL,
    excerpt:
      'Actually, let me correct that. For physical therapy specifically she has nineteen remaining out of twenty.',
    rationale: 'Explicit correction phrase; withdraws the earlier count without restating a used figure.',
  }),
  candidate({
    field: 'visits.usedCount',
    raw: 'the portal shows one used',
    parsed: 1,
    role: 'CALLER',
    act: 'RESTATEMENT',
    at: 320.1,
    confidence: 0.6,
    excerpt: 'Our portal shows one visit already used.',
    rationale: 'Caller restatement; not confirmation until the representative agrees.',
  }),
  candidate({
    field: 'visits.remainingCount',
    raw: 'nineteen',
    parsed: 19,
    at: 327.8,
    confidence: 0.9,
    excerpt: 'For physical therapy specifically she has nineteen remaining out of twenty.',
  }),

  // -- CASE-005: payer cannot see secondary coverage --------------------------
  candidate({
    field: 'coordination.secondaryStatus',
    raw: 'I cannot see any secondary on my end',
    parsed: null,
    act: 'UNAVAILABLE',
    at: 561.4,
    confidence: 0.88,
    excerpt:
      "I'm not able to see secondary coverage on my end — our system only shows our own policy.",
  }),

  // -- CASE-006: spoken member ID omits the -01 suffix ------------------------
  candidate({
    field: 'primary.policyId',
    raw: '106723434',
    parsed: '106723434',
    at: 131.2,
    confidence: 0.9,
    excerpt: 'Member ID one zero six seven two three four three four.',
  }),

  // -- CASE-008: garbled deductible accumulators -----------------------------
  candidate({
    field: 'financial.individualDeductibleMet',
    raw: '$1,200',
    parsed: 120000,
    at: 246.7,
    confidence: 0.42,
    excerpt: 'She has met... twelve hundred, I believe.',
    rationale: 'Audio unclear; speaker hesitates mid-figure.',
  }),
  candidate({
    field: 'financial.individualDeductibleMet',
    raw: '$12,000',
    parsed: 1200000,
    at: 248.9,
    confidence: 0.38,
    excerpt: '...twelve thousand applied to date.',
    rationale: 'Competing reading of the same garbled passage.',
  }),
  candidate({
    field: 'financial.individualDeductibleRemaining',
    raw: '$1,800',
    parsed: 180000,
    at: 252.0,
    confidence: 0.45,
    excerpt: 'Remaining would be eighteen hundred then.',
    rationale: 'Low audio quality across the deductible passage.',
  }),

  // -- CASE-010: representative name is noisy; the .C suffix is unconfirmed ---
  candidate({
    field: 'call.representativeName',
    raw: 'Marisol',
    parsed: 'Marisol',
    at: 96.2,
    confidence: 0.62,
    excerpt: "You've reached Cigna ASH provider services, this is Marisol.",
    rationale: 'Surname not clearly audible.',
  }),

  // -- 02 §6: the call opens with IVR content. 08 §4 makes it weak evidence. --
  candidate({
    field: 'primary.insurancePhone',
    raw: '800-972-4226',
    parsed: '8009724226',
    role: 'IVR',
    at: 4.0,
    confidence: 0.95,
    excerpt:
      'Thank you for calling provider services at 800-972-4226. For eligibility and benefits, press one.',
    rationale:
      'Stated only by the automated menu. High transcription confidence, but a recorded message is not a live confirmation.',
  }),
];

/** Candidates grouped by canonical field, ready for the comparison engine. */
export const TRANSCRIPT_CANDIDATES: Readonly<Record<string, readonly ExtractedCandidate[]>> =
  CANDIDATE_LIST.reduce<Record<string, ExtractedCandidate[]>>((acc, c) => {
    (acc[c.fieldKey] ??= []).push(c);
    return acc;
  }, {});

export const ALL_CANDIDATES: readonly ExtractedCandidate[] = CANDIDATE_LIST;

/** Fields CASE-011 says need a carrier master or review; none is configured here. */
export const FIELDS_REQUIRING_MASTER_OR_REVIEW = [
  'primary.insurancePhone',
  'primary.planType',
  'primary.networkGroupStatus',
  'primary.payerId',
  'financial.copayApplies',
] as const;
