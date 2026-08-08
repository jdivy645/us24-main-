/**
 * Requiredness, criticality and bypass matrix — VERSION v0-pending.
 *
 * ============================================================================
 * THIS ENTIRE FILE IS PENDING CLIENT APPROVAL.
 *
 * 06 §16: "The final matrix is data, not hard-coded JSX."
 * 17 §18: "Final mandatory, optional, conditional, and critical field matrix"
 *         and "Final bypass consequence matrix" are both listed as pending.
 * 16 §1:  "Do not hard-code final required or critical rules that remain pending."
 *
 * Consequently:
 *  - Every entry carries `pendingClient: true`.
 *  - Nothing here uses ALWAYS_REQUIRED or FAIL_IF_MISSING, because 06 §16 says
 *    ALWAYS_REQUIRED "applies only after client approval".
 *  - Replacing this object with a client-approved matrix requires no code change.
 * ============================================================================
 *
 * The conditional entries are NOT guesses: they are the nine conditional rules
 * enumerated verbatim in 06 §17, which the client has already stated.
 */

import { RequirednessKind } from '../types/enums.js';
import type { VobFieldKey } from '../types/field-keys.js';
import type {
  BypassPolicy,
  CriticalityRule,
  RequirednessRule,
} from '../types/field-definition.js';
import { rule } from '../types/rule-expression.js';

export interface RuleMatrixEntry {
  readonly required: RequirednessRule;
  readonly critical: CriticalityRule;
  readonly bypass: BypassPolicy;
}

export interface RuleMatrix {
  readonly version: string;
  readonly pendingClient: boolean;
  readonly description: string;
  readonly defaults: RuleMatrixEntry;
  readonly entries: Partial<Record<VobFieldKey, Partial<RuleMatrixEntry>>>;
}

const ALL_BYPASS_REASONS = [
  'NOT_APPLICABLE',
  'PAYER_UNABLE_TO_VERIFY',
  'NOT_DISCLOSED_DURING_CALL',
  'DATA_UNAVAILABLE',
  'USE_APPROVED_CARRIER_MASTER',
  'TRANSCRIPT_QUALITY_INSUFFICIENT',
  'CLIENT_APPROVED_EXCEPTION',
  'SOURCE_SYSTEM_VALUE_ACCEPTED',
  'OTHER_WITH_REQUIRED_NOTE',
] as const;

/** 09 §12: "Client-approved exception requires a note"; "Other always requires a note." */
const REASONS_REQUIRING_NOTE = [
  'CLIENT_APPROVED_EXCEPTION',
  'OTHER_WITH_REQUIRED_NOTE',
] as const;

const STANDARD_BYPASS: BypassPolicy = {
  allowed: true,
  allowedReasons: ALL_BYPASS_REASONS,
  reasonsRequiringNote: REASONS_REQUIRING_NOTE,
  requiresFollowUp: false,
  pendingClient: true,
};

/** System-controlled values cannot be bypassed — there is nothing to except. */
const NO_BYPASS: BypassPolicy = {
  allowed: false,
  allowedReasons: [],
  reasonsRequiringNote: [],
  requiresFollowUp: false,
  pendingClient: true,
};

const NOT_CRITICAL: CriticalityRule = {
  id: 'CRIT-NONE-V0',
  when: rule.never(),
  pendingClient: true,
};

/**
 * Provisionally critical. 09 §3: "A single critical mismatch can fail a case even
 * when every other field matches." Only fields whose being wrong would make the
 * VOB materially misleading are listed, and the list is explicitly provisional.
 */
function critical(id: string): CriticalityRule {
  return { id, when: rule.always(), pendingClient: true };
}

const OPTIONAL: RequirednessRule = {
  id: 'REQ-OPTIONAL-V0',
  kind: RequirednessKind.OPTIONAL,
  when: rule.always(),
  pendingClient: true,
};

/**
 * REVIEW_IF_MISSING rather than FAIL_IF_MISSING throughout, because 06 §16 gates
 * failure-on-missing behind client approval. A missing value therefore blocks
 * PASSED without asserting a failure the client has not signed off.
 */
function reviewIfMissing(id: string): RequirednessRule {
  return {
    id,
    kind: RequirednessKind.REVIEW_IF_MISSING,
    when: rule.always(),
    pendingClient: true,
  };
}

/** A conditional requirement drawn verbatim from 06 §17. */
function requiredWhen(id: string, when: RequirednessRule['when']): RequirednessRule {
  return { id, kind: RequirednessKind.REQUIRED_WHEN, when, pendingClient: true };
}

/** 06 §16: accepts one approved provenance source (master OR transcript). */
function masterOrTranscript(id: string): RequirednessRule {
  return {
    id,
    kind: RequirednessKind.MASTER_OR_TRANSCRIPT_REQUIRED,
    when: rule.always(),
    pendingClient: true,
  };
}

const SYSTEM_GENERATED: RequirednessRule = {
  id: 'REQ-SYSTEM-V0',
  kind: RequirednessKind.SYSTEM_GENERATED,
  when: rule.always(),
  pendingClient: true,
};

export const RULE_MATRIX_V0_PENDING: RuleMatrix = {
  version: 'v0-pending-2026-08-07',
  pendingClient: true,
  description:
    'Provisional field matrix. Conditional rules are taken verbatim from 06 §17; ' +
    'requiredness and criticality beyond those are placeholders awaiting the ' +
    'client-approved matrix named in 17 §18. No entry uses ALWAYS_REQUIRED or ' +
    'FAIL_IF_MISSING because 06 §16 gates both behind client approval.',

  defaults: {
    required: OPTIONAL,
    critical: NOT_CRITICAL,
    bypass: STANDARD_BYPASS,
  },

  entries: {
    // -- System-controlled ---------------------------------------------------
    'verification.caseId': { required: SYSTEM_GENERATED, bypass: NO_BYPASS },
    'verification.baseRecordId': { required: SYSTEM_GENERATED, bypass: NO_BYPASS },
    'verification.versionNumber': { required: SYSTEM_GENERATED, bypass: NO_BYPASS },
    'verification.verifiedByLabel': { required: SYSTEM_GENERATED, bypass: NO_BYPASS },
    'call.startedAt': { required: SYSTEM_GENERATED, bypass: NO_BYPASS },
    'call.endedAt': { required: SYSTEM_GENERATED, bypass: NO_BYPASS },
    'call.ringCentralRecordId': { required: SYSTEM_GENERATED, bypass: NO_BYPASS },

    // -- MTG-007: patient name, DOB, group ID, effective date, coverage, network
    // are named by the client as important fields.
    'patient.lastName': {
      required: reviewIfMissing('REQ-PATIENT-LAST-V0'),
      critical: critical('CRIT-PATIENT-LAST-V0'),
    },
    'patient.firstName': {
      required: reviewIfMissing('REQ-PATIENT-FIRST-V0'),
      critical: critical('CRIT-PATIENT-FIRST-V0'),
    },
    'patient.dateOfBirth': {
      required: reviewIfMissing('REQ-DOB-V0'),
      critical: critical('CRIT-DOB-V0'),
    },
    'verification.date': { required: reviewIfMissing('REQ-VERIFICATION-DATE-V0') },

    'primary.insuranceName': {
      required: reviewIfMissing('REQ-INSURANCE-NAME-V0'),
      critical: critical('CRIT-INSURANCE-NAME-V0'),
    },
    'primary.policyId': {
      required: reviewIfMissing('REQ-POLICY-ID-V0'),
      critical: critical('CRIT-POLICY-ID-V0'),
    },
    'primary.groupId': { required: reviewIfMissing('REQ-GROUP-ID-V0') },
    'primary.serviceType': { required: reviewIfMissing('REQ-SERVICE-TYPE-V0') },
    'primary.effectiveDate': {
      required: reviewIfMissing('REQ-EFFECTIVE-DATE-V0'),
      critical: critical('CRIT-EFFECTIVE-DATE-V0'),
    },
    'primary.eligibilityStatus': {
      required: reviewIfMissing('REQ-ELIGIBILITY-V0'),
      critical: critical('CRIT-ELIGIBILITY-V0'),
    },
    'primary.networkGroupStatus': {
      required: reviewIfMissing('REQ-NETWORK-GROUP-V0'),
      critical: critical('CRIT-NETWORK-GROUP-V0'),
    },
    'primary.networkIndividualProviderStatus': {
      required: reviewIfMissing('REQ-NETWORK-PROVIDER-V0'),
    },

    // -- 06 §17 conditional rules, stated verbatim by the client --------------

    // "When copayApplies is YES, copayAmount becomes required."
    'financial.copayApplies': { required: reviewIfMissing('REQ-COPAY-APPLIES-V0') },
    'financial.copayAmount': {
      required: requiredWhen('REQ-COPAY-AMOUNT-V0', rule.eq('financial.copayApplies', 'YES')),
    },

    // "When coinsuranceApplies is YES, patientCoinsurancePercent becomes required."
    'financial.coinsuranceApplies': {
      required: reviewIfMissing('REQ-COINSURANCE-APPLIES-V0'),
    },
    'financial.patientCoinsurancePercent': {
      required: requiredWhen(
        'REQ-COINSURANCE-PERCENT-V0',
        rule.eq('financial.coinsuranceApplies', 'YES'),
      ),
      critical: critical('CRIT-COINSURANCE-PERCENT-V0'),
    },

    // "When deductibleApplies is YES, configured deductible totals and
    //  accumulators become required or reviewable."
    'financial.deductibleApplies': { required: reviewIfMissing('REQ-DEDUCTIBLE-APPLIES-V0') },
    'financial.individualDeductibleTotal': {
      required: requiredWhen(
        'REQ-DEDUCTIBLE-TOTAL-V0',
        rule.eq('financial.deductibleApplies', 'YES'),
      ),
    },
    'financial.individualDeductibleMet': {
      required: requiredWhen(
        'REQ-DEDUCTIBLE-MET-V0',
        rule.eq('financial.deductibleApplies', 'YES'),
      ),
    },
    'financial.individualDeductibleRemaining': {
      required: requiredWhen(
        'REQ-DEDUCTIBLE-REMAINING-V0',
        rule.eq('financial.deductibleApplies', 'YES'),
      ),
    },
    'financial.deductibleAsOfDate': {
      required: requiredWhen(
        'REQ-DEDUCTIBLE-ASOF-V0',
        rule.eq('financial.deductibleApplies', 'YES'),
      ),
    },

    'financial.individualOopMaximum': { required: reviewIfMissing('REQ-OOP-MAX-V0') },
    'financial.individualOopRemaining': { required: reviewIfMissing('REQ-OOP-REMAINING-V0') },

    // "When visit limit type is hard maximum, allowed count becomes required."
    'visits.limitType': { required: reviewIfMissing('REQ-VISIT-LIMIT-TYPE-V0') },
    'visits.allowedCount': {
      required: requiredWhen(
        'REQ-VISITS-ALLOWED-V0',
        rule.eq('visits.limitType', 'HARD_MAXIMUM'),
      ),
      critical: critical('CRIT-VISITS-ALLOWED-V0'),
    },
    'visits.remainingCount': {
      required: requiredWhen(
        'REQ-VISITS-REMAINING-V0',
        rule.eq('visits.limitType', 'HARD_MAXIMUM'),
      ),
    },

    // "When treatmentRequired is YES, authorization method and threshold may
    //  become required."
    'authorization.initialEvaluationRequired': {
      required: reviewIfMissing('REQ-AUTH-INITIAL-V0'),
    },
    'authorization.treatmentRequired': {
      required: reviewIfMissing('REQ-AUTH-TREATMENT-V0'),
      critical: critical('CRIT-AUTH-TREATMENT-V0'),
    },
    'authorization.requiredAfterVisitNumber': {
      required: requiredWhen(
        'REQ-AUTH-THRESHOLD-V0',
        rule.eq('authorization.treatmentRequired', 'YES'),
      ),
      // CASE-001. Treating the wrong visit as the authorization trigger causes
      // denied claims, so a mismatch here must not be able to pass.
      critical: critical('CRIT-AUTH-THRESHOLD-V0'),
    },
    'authorization.method': {
      required: requiredWhen(
        'REQ-AUTH-METHOD-V0',
        rule.eq('authorization.treatmentRequired', 'YES'),
      ),
    },
    'referral.required': { required: reviewIfMissing('REQ-REFERRAL-V0') },

    // -- Claims. Master-eligible per MTG-015 ---------------------------------
    'claims.mailingAddress': { required: masterOrTranscript('REQ-CLAIMS-ADDRESS-V0') },
    'claims.payerId': { required: masterOrTranscript('REQ-CLAIMS-PAYER-ID-V0') },
    'claims.originalTflValue': {
      required: masterOrTranscript('REQ-ORIGINAL-TFL-V0'),
      // CASE-003. A wrong filing deadline causes unrecoverable claim denials.
      critical: critical('CRIT-ORIGINAL-TFL-V0'),
    },
    'claims.correctedTflValue': { required: masterOrTranscript('REQ-CORRECTED-TFL-V0') },
    'primary.payerId': { required: masterOrTranscript('REQ-PAYER-ID-V0') },
    'primary.insurancePhone': { required: masterOrTranscript('REQ-INSURANCE-PHONE-V0') },

    'call.referenceNumber': {
      required: reviewIfMissing('REQ-CALL-REFERENCE-V0'),
      critical: critical('CRIT-CALL-REFERENCE-V0'),
    },

    // -- Coordination. CASE-005 ----------------------------------------------
    // "When secondaryStatus is YES, secondary identity and policy fields become
    //  visible and conditionally required."
    'coordination.secondaryStatus': {
      required: reviewIfMissing('REQ-SECONDARY-STATUS-V0'),
      critical: critical('CRIT-SECONDARY-STATUS-V0'),
    },
    'secondary.insuranceName': {
      required: requiredWhen(
        'REQ-SECONDARY-NAME-V0',
        rule.eq('coordination.secondaryStatus', 'YES'),
      ),
    },
    'secondary.policyId': {
      required: requiredWhen(
        'REQ-SECONDARY-POLICY-V0',
        rule.eq('coordination.secondaryStatus', 'YES'),
      ),
    },
  },
};

/** Resolve the effective entry for a field, applying matrix defaults. */
export function matrixEntryFor(matrix: RuleMatrix, key: VobFieldKey): RuleMatrixEntry {
  const override = matrix.entries[key];
  if (!override) return matrix.defaults;
  return {
    required: override.required ?? matrix.defaults.required,
    critical: override.critical ?? matrix.defaults.critical,
    bypass: override.bypass ?? matrix.defaults.bypass,
  };
}
