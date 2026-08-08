/**
 * Canonical field keys and section keys.
 *
 * Spec authority: 06_VOB_FORM_FIELD_ENGINE.md §2 ("Each field has a stable machine
 * key that never depends on visible wording") and §6–§14 which enumerate every field.
 *
 * These keys are the contract shared by the React form, the extraction schema, the
 * comparison engine, record history, Excel export and PDF template bindings (06 §20).
 * Renaming a visible label must never require touching a key.
 */

/**
 * Form sections, matching the sticky section navigator in 05 §8:
 * Patient, Insurance, Financials, Visits and Authorization, Claims and Call,
 * Secondary, Summary.
 */
export const VobSection = {
  PATIENT: 'PATIENT',
  INSURANCE: 'INSURANCE',
  FINANCIALS: 'FINANCIALS',
  VISITS_AUTHORIZATION: 'VISITS_AUTHORIZATION',
  CLAIMS_CALL: 'CLAIMS_CALL',
  SECONDARY: 'SECONDARY',
  SUMMARY: 'SUMMARY',
} as const;
export type VobSection = (typeof VobSection)[keyof typeof VobSection];

export const SECTION_ORDER: readonly VobSection[] = [
  VobSection.PATIENT,
  VobSection.INSURANCE,
  VobSection.FINANCIALS,
  VobSection.VISITS_AUTHORIZATION,
  VobSection.CLAIMS_CALL,
  VobSection.SECONDARY,
  VobSection.SUMMARY,
];

export const SECTION_LABEL: Record<VobSection, string> = {
  PATIENT: 'Patient',
  INSURANCE: 'Insurance',
  FINANCIALS: 'Financials',
  VISITS_AUTHORIZATION: 'Visits and authorization',
  CLAIMS_CALL: 'Claims and call',
  SECONDARY: 'Secondary',
  SUMMARY: 'Summary',
};

/** Optional within-section grouping — 06 §2 ("one section and optional subgroup"). */
export const VobSubgroup = {
  IDENTITY: 'IDENTITY',
  VERIFICATION_META: 'VERIFICATION_META',
  PLAN: 'PLAN',
  NETWORK: 'NETWORK',
  ELIGIBILITY: 'ELIGIBILITY',
  RESPONSIBILITY: 'RESPONSIBILITY',
  DEDUCTIBLE: 'DEDUCTIBLE',
  OUT_OF_POCKET: 'OUT_OF_POCKET',
  VISITS: 'VISITS',
  AUTHORIZATION: 'AUTHORIZATION',
  REFERRAL: 'REFERRAL',
  CLAIMS: 'CLAIMS',
  CALL_RECORD: 'CALL_RECORD',
  COORDINATION: 'COORDINATION',
  SECONDARY_DETAIL: 'SECONDARY_DETAIL',
  ROLLUP: 'ROLLUP',
} as const;
export type VobSubgroup = (typeof VobSubgroup)[keyof typeof VobSubgroup];

export const SUBGROUP_LABEL: Record<VobSubgroup, string> = {
  IDENTITY: 'Patient identity',
  VERIFICATION_META: 'Verification details',
  PLAN: 'Plan',
  NETWORK: 'Network status',
  ELIGIBILITY: 'Eligibility',
  RESPONSIBILITY: 'Copay and coinsurance',
  DEDUCTIBLE: 'Deductible',
  OUT_OF_POCKET: 'Out of pocket',
  VISITS: 'Visit limits',
  AUTHORIZATION: 'Authorization',
  REFERRAL: 'Referral',
  CLAIMS: 'Claims',
  CALL_RECORD: 'Call record',
  COORDINATION: 'Coordination of benefits',
  SECONDARY_DETAIL: 'Secondary insurance',
  ROLLUP: 'Summary',
};

/**
 * The canonical field key union — 103 fields.
 *
 * Grouped exactly as the spec enumerates them so each block is auditable against
 * its source section. Do not reorder without updating the section comments.
 */
export type VobFieldKey =
  // -- 06 §6 Patient and verification (12) --------------------------------
  | 'patient.lastName'
  | 'patient.firstName'
  | 'patient.middleName'
  | 'patient.dateOfBirth'
  | 'verification.date'
  | 'verification.time'
  | 'verification.verifiedByLabel'
  | 'verification.caseId'
  | 'verification.baseRecordId'
  | 'verification.versionNumber'
  | 'verification.serviceDate'
  | 'verification.notes'
  // -- 06 §7 Primary insurance and plan (17) ------------------------------
  | 'primary.insuranceName'
  | 'primary.insurancePhone'
  | 'primary.policyId'
  | 'primary.groupId'
  | 'primary.planName'
  | 'primary.planType'
  | 'primary.lineOfBusiness'
  | 'primary.serviceType'
  | 'primary.networkGroupStatus'
  | 'primary.networkIndividualProviderStatus'
  | 'primary.coverageSummary'
  | 'primary.effectiveDate'
  | 'primary.terminationDate'
  | 'primary.eligibilityStatus'
  | 'primary.hsaHraHcaAmount'
  | 'primary.payerId'
  | 'primary.stateOrMarket'
  // -- 06 §8 Copay, coinsurance and responsibility (7) --------------------
  | 'financial.copayApplies'
  | 'financial.copayAmount'
  | 'financial.coinsuranceApplies'
  | 'financial.patientCoinsurancePercent'
  | 'financial.payerCoveragePercent'
  | 'financial.patientResponsibilitySummary'
  | 'financial.coveragePercent'
  // -- 06 §9 Deductible (10) ----------------------------------------------
  | 'financial.deductibleApplies'
  | 'financial.deductibleScope'
  | 'financial.individualDeductibleTotal'
  | 'financial.individualDeductibleMet'
  | 'financial.individualDeductibleRemaining'
  | 'financial.familyDeductibleTotal'
  | 'financial.familyDeductibleMet'
  | 'financial.familyDeductibleRemaining'
  | 'financial.deductiblePeriod'
  | 'financial.deductibleAsOfDate'
  // -- 06 §10 Out of pocket (9) -------------------------------------------
  | 'financial.oopScope'
  | 'financial.individualOopMaximum'
  | 'financial.individualOopMet'
  | 'financial.individualOopRemaining'
  | 'financial.familyOopMaximum'
  | 'financial.familyOopMet'
  | 'financial.familyOopRemaining'
  | 'financial.oopPeriod'
  | 'financial.oopAsOfDate'
  // -- 06 §11 Visits (8) ---------------------------------------------------
  | 'visits.limitType'
  | 'visits.allowedCount'
  | 'visits.usedCount'
  | 'visits.remainingCount'
  | 'visits.period'
  | 'visits.combinedServices'
  | 'visits.serviceScope'
  | 'visits.asOfDate'
  // -- 06 §12 Authorization and referral (15) ------------------------------
  | 'authorization.initialEvaluationRequired'
  | 'authorization.treatmentRequired'
  | 'authorization.requiredAfterVisitNumber'
  | 'authorization.method'
  | 'authorization.phone'
  | 'authorization.portal'
  | 'authorization.requestWindowValue'
  | 'authorization.requestWindowUnit'
  | 'authorization.requestWindowReference'
  | 'authorization.number'
  | 'authorization.coverageStartDate'
  | 'authorization.coverageEndDate'
  | 'authorization.medicalNecessityReviewRequired'
  | 'referral.required'
  | 'referral.pcpRequired'
  // -- 06 §13 Claims and call record (15) ----------------------------------
  | 'claims.mailingAddress'
  | 'claims.payerId'
  | 'claims.originalTflValue'
  | 'claims.originalTflUnit'
  | 'claims.originalTflReference'
  | 'claims.correctedTflValue'
  | 'claims.correctedTflUnit'
  | 'claims.correctedTflReference'
  | 'claims.correctedTflAlternativeRule'
  | 'call.representativeName'
  | 'call.referenceNumber'
  | 'call.sourcePhone'
  | 'call.startedAt'
  | 'call.endedAt'
  | 'call.ringCentralRecordId'
  // -- 06 §14 Coordination and secondary (10) ------------------------------
  | 'coordination.primaryPayerName'
  | 'coordination.secondaryStatus'
  | 'secondary.insuranceName'
  | 'secondary.planName'
  | 'secondary.policyId'
  | 'secondary.effectiveDate'
  | 'secondary.deductible'
  | 'secondary.visitLimit'
  | 'secondary.visitsUsed'
  | 'secondary.source';

/** Total canonical field count, asserted by the registry integrity test. */
export const CANONICAL_FIELD_COUNT = 103;
