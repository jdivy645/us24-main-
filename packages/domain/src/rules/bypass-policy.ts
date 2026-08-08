/**
 * Bypass consequence rules — 09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md §10–§12.
 *
 * ============================================================================
 * PENDING CLIENT APPROVAL. 09 §12 ends: "The final consequence matrix remains
 * pending client approval." 17 §18 repeats it. The mapping below implements the
 * seven worked examples the client HAS stated in 09 §12, and defaults everything
 * else to REVIEW — the conservative direction, since an unrecognised exception
 * must never quietly permit PASSED.
 * ============================================================================
 *
 * 09 §10: "A generic Ignore reason is prohibited." There is deliberately no
 * catch-all reason in the enum, and `OTHER_WITH_REQUIRED_NOTE` forces a note.
 */

import { BypassReason, Severity } from '../types/enums.js';
import type { BypassPolicy } from '../types/field-definition.js';

export const BYPASS_CONSEQUENCE_VERSION = 'bypass-v0-pending-2026-08-07';

export interface BypassContext {
  /** Whether the field's criticality rule currently evaluates true. */
  readonly isCritical: boolean;
  /** Whether the field may legitimately be sourced from a carrier master (06 §2). */
  readonly isMasterEligible: boolean;
  /** Whether a scoped ACTIVE master version actually matches this case (10 §16). */
  readonly hasMatchingMasterScope: boolean;
  /** Whether the field may be sourced from an approved patient/source system. */
  readonly isSourceSystemEligible: boolean;
  /**
   * Whether the deployment has a configured authority for client-approved
   * exceptions. 09 §12: "Client-approved exception requires a note and configured
   * authority." 17 §18 lists that authority as pending, so this is false today.
   */
  readonly hasConfiguredExceptionAuthority: boolean;
}

export interface BypassConsequence {
  readonly severity: Severity;
  readonly requiresFollowUp: boolean;
  /** Human sentence shown on the field block and in the QA report. */
  readonly explanation: string;
  readonly ruleVersion: string;
}

/**
 * Map a bypass to its case consequence.
 *
 * 09 §3: "A bypass can lead to PASSED, NEEDS REVIEW, or FAILED depending on
 * field and reason configuration."
 */
export function bypassConsequence(
  reason: BypassReason,
  context: BypassContext,
): BypassConsequence {
  const v = BYPASS_CONSEQUENCE_VERSION;

  switch (reason) {
    // 09 §12: "A truly non-applicable optional field may permit PASSED."
    case BypassReason.NOT_APPLICABLE:
      return context.isCritical
        ? {
            severity: Severity.REVIEW,
            requiresFollowUp: true,
            explanation:
              'Marked not applicable on a field configured as critical, so the case still needs review.',
            ruleVersion: v,
          }
        : {
            severity: Severity.NONE,
            requiresFollowUp: false,
            explanation: 'Field is not applicable to this case.',
            ruleVersion: v,
          };

    // 09 §12: "Payer unable to verify a critical coordination field normally
    // forces NEEDS REVIEW."
    case BypassReason.PAYER_UNABLE_TO_VERIFY:
      return {
        severity: Severity.REVIEW,
        requiresFollowUp: true,
        explanation:
          'The representative could not see this information. That is not the same as confirming it does not exist, so the case needs review.',
        ruleVersion: v,
      };

    // 09 §12: "Not discussed during the call does not automatically permit PASSED."
    case BypassReason.NOT_DISCLOSED_DURING_CALL:
      return {
        severity: Severity.REVIEW,
        requiresFollowUp: true,
        explanation: 'This was not covered during the call, so it remains unverified.',
        ruleVersion: v,
      };

    case BypassReason.DATA_UNAVAILABLE:
      return {
        severity: Severity.REVIEW,
        requiresFollowUp: true,
        explanation: 'The information was unavailable at the time of verification.',
        ruleVersion: v,
      };

    // 09 §12: "Use approved carrier master may pass only for fields configured as
    // master-eligible with matching scope."
    case BypassReason.USE_APPROVED_CARRIER_MASTER:
      if (context.isMasterEligible && context.hasMatchingMasterScope) {
        return {
          severity: Severity.NONE,
          requiresFollowUp: false,
          explanation: 'Filled from an approved carrier master version whose scope matches this case.',
          ruleVersion: v,
        };
      }
      return {
        severity: Severity.REVIEW,
        requiresFollowUp: true,
        explanation: context.isMasterEligible
          ? 'No active carrier-master version matches this case scope, so the value is unresolved.'
          : 'This field is not configured to accept carrier-master data.',
        ruleVersion: v,
      };

    // 09 §12: "Transcript quality insufficient on a critical field forces
    // NEEDS REVIEW or FAILED."
    case BypassReason.TRANSCRIPT_QUALITY_INSUFFICIENT:
      return {
        severity: Severity.REVIEW,
        requiresFollowUp: true,
        explanation: context.isCritical
          ? 'Audio or transcript quality was insufficient to verify a critical field.'
          : 'Audio or transcript quality was insufficient to verify this field.',
        ruleVersion: v,
      };

    // 09 §12: "Client-approved exception requires a note and configured authority."
    case BypassReason.CLIENT_APPROVED_EXCEPTION:
      return context.hasConfiguredExceptionAuthority
        ? {
            severity: Severity.NONE,
            requiresFollowUp: false,
            explanation: 'Recorded under a client-approved exception.',
            ruleVersion: v,
          }
        : {
            severity: Severity.REVIEW,
            requiresFollowUp: true,
            explanation:
              'A client-approved exception was recorded, but no approval authority is configured for this deployment, so the case still needs review.',
            ruleVersion: v,
          };

    case BypassReason.SOURCE_SYSTEM_VALUE_ACCEPTED:
      return context.isSourceSystemEligible
        ? {
            severity: Severity.NONE,
            requiresFollowUp: false,
            explanation: 'Accepted from an approved source system rather than the call.',
            ruleVersion: v,
          }
        : {
            severity: Severity.REVIEW,
            requiresFollowUp: true,
            explanation: 'This field is not configured to accept a source-system value.',
            ruleVersion: v,
          };

    // 09 §12: "Other always requires a note and should normally force NEEDS REVIEW."
    case BypassReason.OTHER_WITH_REQUIRED_NOTE:
      return {
        severity: Severity.REVIEW,
        requiresFollowUp: true,
        explanation: 'Bypassed for a reason outside the standard list.',
        ruleVersion: v,
      };
  }
}

export interface BypassValidationResult {
  readonly valid: boolean;
  /** Machine code, e.g. NOTE_REQUIRED. Empty when valid. */
  readonly errors: readonly { code: string; message: string }[];
}

/**
 * Validate a proposed bypass against the field's policy before it is recorded.
 * Rejecting here keeps an impermissible bypass out of the audit history entirely.
 */
export function validateBypass(
  policy: BypassPolicy,
  reason: BypassReason,
  note: string | null,
): BypassValidationResult {
  const errors: { code: string; message: string }[] = [];

  if (!policy.allowed) {
    errors.push({
      code: 'BYPASS_NOT_PERMITTED',
      message: 'This field cannot be bypassed.',
    });
  } else if (!policy.allowedReasons.includes(reason)) {
    errors.push({
      code: 'REASON_NOT_PERMITTED',
      message: 'That reason is not permitted for this field.',
    });
  }

  const noteIsBlank = note === null || note.trim() === '';
  if (policy.reasonsRequiringNote.includes(reason) && noteIsBlank) {
    errors.push({
      code: 'NOTE_REQUIRED',
      message: 'This reason requires a note explaining the decision.',
    });
  }

  return { valid: errors.length === 0, errors };
}
