/**
 * Golden-case expected outcomes.
 *
 * Every row below is a requirement quoted from 02 §9 (CASE-001 … CASE-012),
 * 15 §9 (expected matches), 15 §10 (required mismatch or review outcomes) or
 * 15 §11 (the correction expectation).
 *
 * 15 §22 makes these a release gate: "Golden case produces every approved
 * expected outcome" and "Critical false-pass count is zero."
 */

import type { ComparisonOutcome, Severity } from '@us24/domain';

export interface GoldenExpectation {
  /** CASE-001 … CASE-012, or MATCH-nnn for the 15 §9 expected matches. */
  readonly caseId: string;
  readonly fieldKey: string;
  /** Outcomes any of which satisfies the spec. Several cases permit two. */
  readonly allowedOutcomes: readonly ComparisonOutcome[];
  /** Outcomes that would be a spec violation. Asserted separately and loudly. */
  readonly forbiddenOutcomes: readonly ComparisonOutcome[];
  readonly minimumSeverity?: Severity;
  readonly requirement: string;
  readonly specRef: string;
}

/** 15 §9 — values the call supports and the form got right. */
export const EXPECTED_MATCHES: readonly GoldenExpectation[] = [
  {
    caseId: 'MATCH-001',
    fieldKey: 'patient.dateOfBirth',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'DOB 10/07/2010 matches October 7, 2010.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-002',
    fieldKey: 'primary.serviceType',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'Service PT is supported.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-003',
    fieldKey: 'primary.effectiveDate',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'Effective date October 1, 2025 is supported.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-004',
    fieldKey: 'financial.individualDeductibleTotal',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'Individual deductible total 3000 is supported.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-005',
    fieldKey: 'financial.individualOopMaximum',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'OOP maximum 6500 is supported.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-006',
    fieldKey: 'financial.individualOopRemaining',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'OOP remaining 5473.76 is supported.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-007',
    fieldKey: 'primary.groupId',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'Group ID 00633434 is supported, with leading zeros intact.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-008',
    fieldKey: 'visits.allowedCount',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'Visit limit 20 hard maximum is supported.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-009',
    fieldKey: 'primary.insuranceName',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'Primary payer Cigna ASH is supported.',
    specRef: '15 §9',
  },
  {
    caseId: 'MATCH-010',
    fieldKey: 'call.referenceNumber',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement: 'Call reference 20874738 matches.',
    specRef: '15 §9',
  },
];

/** 02 §9 and 15 §10 — the discrepancies the engine must surface. */
export const EXPECTED_DISCREPANCIES: readonly GoldenExpectation[] = [
  {
    caseId: 'CASE-001',
    fieldKey: 'authorization.requiredAfterVisitNumber',
    allowedOutcomes: ['MISMATCH'],
    forbiddenOutcomes: ['MATCH', 'NOT_EVALUATED'],
    minimumSeverity: 'FAILURE',
    requirement:
      'The completed PDF says treatment authorization after the fifth visit, while the transcript says after the eighth visit; this must be a mismatch.',
    specRef: '02 §9 CASE-001, 15 §10',
  },
  {
    caseId: 'CASE-002',
    fieldKey: 'financial.patientCoinsurancePercent',
    allowedOutcomes: ['CONFLICT_IN_SOURCE'],
    forbiddenOutcomes: ['MATCH'],
    minimumSeverity: 'REVIEW',
    requirement:
      'The PDF says 20 percent coinsurance while the transcript includes both 20 percent and a later 30 percent; this must not silently pass.',
    specRef: '02 §9 CASE-002, 15 §10',
  },
  {
    caseId: 'CASE-003',
    fieldKey: 'claims.originalTflValue',
    allowedOutcomes: ['MISMATCH'],
    forbiddenOutcomes: ['MATCH'],
    minimumSeverity: 'REVIEW',
    requirement:
      'The PDF says original TFL is 90 days while the clearest payer statement says 180 days from DOS; this must be a mismatch or high-severity review.',
    specRef: '02 §9 CASE-003, 15 §10',
  },
  {
    caseId: 'CASE-004',
    fieldKey: 'visits.usedCount',
    allowedOutcomes: ['DERIVED_SUPPORTED', 'MATCH'],
    forbiddenOutcomes: ['MISMATCH'],
    requirement:
      'The representative first says zero visits used and later confirms 19 remaining out of 20; the final corrected value is one used, and the earlier zero remains visible in evidence history.',
    specRef: '02 §9 CASE-004, 15 §11',
  },
  {
    caseId: 'CASE-005',
    fieldKey: 'coordination.secondaryStatus',
    allowedOutcomes: ['MISMATCH', 'PAYER_UNABLE_TO_VERIFY'],
    forbiddenOutcomes: ['MATCH'],
    minimumSeverity: 'REVIEW',
    requirement:
      'The payer cannot see secondary coverage; this must become UNKNOWN or PAYER UNABLE TO VERIFY, never No, and never MATCH against a form asserting No.',
    specRef: '02 §9 CASE-005, 15 §10',
  },
  {
    caseId: 'CASE-006',
    fieldKey: 'primary.policyId',
    allowedOutcomes: ['LOW_CONFIDENCE', 'MISMATCH'],
    forbiddenOutcomes: ['MATCH'],
    minimumSeverity: 'REVIEW',
    requirement:
      'The PDF policy ID includes suffix -01 while the spoken member ID omits it; apply payer-approved normalization or NEEDS REVIEW.',
    specRef: '02 §9 CASE-006, 15 §10',
  },
  {
    caseId: 'CASE-007',
    fieldKey: 'financial.individualOopMet',
    allowedOutcomes: ['DERIVED_SUPPORTED'],
    forbiddenOutcomes: ['MATCH'],
    requirement:
      'The OOP met amount is derived from maximum minus remaining and must be labeled DERIVED if used.',
    specRef: '02 §9 CASE-007, 15 §10',
  },
  {
    caseId: 'CASE-008',
    fieldKey: 'financial.individualDeductibleMet',
    allowedOutcomes: ['CONFLICT_IN_SOURCE', 'LOW_CONFIDENCE'],
    forbiddenOutcomes: ['MATCH'],
    minimumSeverity: 'REVIEW',
    requirement:
      'The deductible section is garbled and must retain competing candidates rather than force a clean value.',
    specRef: '02 §9 CASE-008, 15 §10',
  },
  {
    caseId: 'CASE-009',
    fieldKey: 'claims.correctedTflAlternativeRule',
    allowedOutcomes: ['MATCH'],
    forbiddenOutcomes: [],
    requirement:
      'Corrected TFL must retain the "180 days from DOS or 60 calendar days from RA" context rather than being flattened into one number.',
    specRef: '02 §9 CASE-009, 15 §10',
  },
  {
    caseId: 'CASE-010',
    fieldKey: 'call.representativeName',
    allowedOutcomes: ['MISMATCH', 'LOW_CONFIDENCE'],
    forbiddenOutcomes: ['MATCH'],
    minimumSeverity: 'REVIEW',
    requirement: 'The representative .C suffix is unsupported unless another source supplies it.',
    specRef: '02 §9 CASE-010, 15 §10',
  },
  {
    caseId: 'CASE-011',
    fieldKey: 'primary.networkGroupStatus',
    allowedOutcomes: ['NOT_FOUND_IN_SOURCE', 'MASTER_DATA_SUPPORTED'],
    forbiddenOutcomes: ['MATCH'],
    minimumSeverity: 'REVIEW',
    requirement:
      'Payer phone, plan, network, payer ID and copay require another approved source or review.',
    specRef: '02 §9 CASE-011, 15 §10',
  },
];

export const ALL_GOLDEN_EXPECTATIONS: readonly GoldenExpectation[] = [
  ...EXPECTED_MATCHES,
  ...EXPECTED_DISCREPANCIES,
];

/**
 * CASE-012 has no single field outcome — it is a property of the whole run:
 * "The filename contains UHC while the content concerns Cigna ASH; filenames
 * must not supply benefit facts." Asserted structurally in the golden test.
 */
export const CASE_012 = {
  caseId: 'CASE-012',
  requirement:
    'The filename contains UHC while the content concerns Cigna ASH; filenames must not supply benefit facts.',
  specRef: '02 §9 CASE-012',
  misleadingToken: 'UHC',
  actualPayer: 'Cigna ASH',
} as const;
