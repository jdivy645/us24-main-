/**
 * The deterministic comparison pipeline — 08 §18.
 *
 *   Load the exact imported or selected form revision.
 *   Load extracted candidates and approved non-transcript sources.
 *   Filter candidates by field, service, network, scope, and effective period.
 *   Apply speaker authority and correction rules; Normalize form and supported values.
 *   Evaluate exact, alias, range, and payer-specific equivalence.
 *   Create field outcome and explanation; Apply requiredness, criticality, and bypass configuration.
 *   Persist the comparison run before showing it; NEVER MUTATE THE FORM.
 *
 * ADR-005 is enforced structurally: nothing in this file consults a model. Its
 * only inputs are the form revision, extracted candidates with evidence, approved
 * master data and the versioned rule matrix.
 */

import { bypassConsequence } from '../rules/bypass-policy.js';
import { normalizeFieldValue } from '../normalize/index.js';
import { suffixRelationship } from '../normalize/identifier.js';
import { formatCents } from '../normalize/money.js';
import { ComparisonOutcome, RequirednessKind, Severity, SourceType } from '../types/enums.js';
import type { FieldDefinition } from '../types/field-definition.js';
import type { VobFieldKey } from '../types/field-keys.js';
import type { RuleContext, RuleValueLookup } from '../types/rule-expression.js';
import { describeRule, evaluateRule, referencedFields } from '../types/rule-expression.js';
import type {
  BypassRecord,
  CandidateScope,
  CanonicalValue,
  EvidenceRef,
  ExtractedCandidate,
  ManualResolution,
} from '../types/value-envelope.js';
import { SelectionKind, selectCandidate } from './candidate-selection.js';
import { arithmeticNote, identifierSuffixMessage, inlineMessage } from './messages.js';

/** Actions the field block may offer — 09 §9. */
export const ResolutionAction = {
  APPLY_SUPPORTED_VALUE: 'APPLY_SUPPORTED_VALUE',
  EDIT_MANUALLY: 'EDIT_MANUALLY',
  REVIEW_CONFLICT: 'REVIEW_CONFLICT',
  MARK_NOT_APPLICABLE: 'MARK_NOT_APPLICABLE',
  BYPASS_WITH_REASON: 'BYPASS_WITH_REASON',
  USE_CARRIER_MASTER: 'USE_CARRIER_MASTER',
  REVERT: 'REVERT',
  VIEW_EVIDENCE: 'VIEW_EVIDENCE',
} as const;
export type ResolutionAction = (typeof ResolutionAction)[keyof typeof ResolutionAction];

/** A scoped carrier-master value offered to a field — 10 §16. */
export interface MasterValueOffer {
  readonly value: string;
  readonly versionId: string;
  readonly versionLabel: string;
  /** False when no ACTIVE version matches the case scope — 10 §16. */
  readonly scopeMatches: boolean;
}

export interface FieldComparisonInput {
  readonly definition: FieldDefinition;
  /** The raw value from the form revision under audit. Never modified. */
  readonly formValueRaw: string | null;
  readonly candidates: readonly ExtractedCandidate[];
  readonly bypass?: BypassRecord | null;
  readonly manualResolution?: ManualResolution | null;
  readonly masterOffer?: MasterValueOffer | null;
  /** Canonical operand values for a derived field, keyed by field. */
  readonly derivationOperands?: Readonly<Record<string, CanonicalValue>>;
  readonly targetScope?: CandidateScope;
}

export interface FieldComparison {
  readonly fieldKey: VobFieldKey;
  readonly outcome: ComparisonOutcome;
  readonly severity: Severity;
  readonly isVisible: boolean;
  readonly isRequired: boolean;
  readonly isCritical: boolean;

  readonly formRaw: string | null;
  readonly formCanonical: CanonicalValue;
  readonly formDisplay: string | null;
  readonly formSteps: readonly string[];

  readonly supportedRaw: string | null;
  readonly supportedCanonical: CanonicalValue;
  readonly supportedDisplay: string | null;
  readonly supportedSteps: readonly string[];
  readonly supportedSourceType: SourceType | null;

  readonly competingCandidates: readonly ExtractedCandidate[];
  readonly supersededCandidates: readonly ExtractedCandidate[];
  readonly evidence: EvidenceRef | null;
  readonly confidence: number | null;

  readonly derivation: { ruleId: string; formula: string; operands: readonly VobFieldKey[] } | null;
  readonly carrierMasterVersionId: string | null;

  readonly message: string;
  readonly ruleCode: string;
  readonly actions: readonly ResolutionAction[];
  /** Secondary notes, e.g. an arithmetic-consistency warning. */
  readonly notes: readonly string[];
}

export interface ComparisonRuleContext {
  readonly context: RuleContext;
  readonly lookup: RuleValueLookup;
  readonly ruleSetVersion: string;
  readonly dictionaryVersion: string;
  /** Whether the deployment has a configured exception-approval authority — 09 §12. */
  readonly hasConfiguredExceptionAuthority?: boolean;
}

/** Severity of a blank value, from the requiredness kind — 06 §16. */
function severityForMissing(kind: RequirednessKind, isCritical: boolean): Severity {
  switch (kind) {
    case RequirednessKind.ALWAYS_REQUIRED:
    case RequirednessKind.FAIL_IF_MISSING:
      return Severity.FAILURE;
    case RequirednessKind.REVIEW_IF_MISSING:
    case RequirednessKind.REQUIRED_WHEN:
    case RequirednessKind.MASTER_OR_TRANSCRIPT_REQUIRED:
      return isCritical ? Severity.FAILURE : Severity.REVIEW;
    case RequirednessKind.OPTIONAL:
    case RequirednessKind.SYSTEM_GENERATED:
      return Severity.NONE;
  }
}

function valuesEqual(
  definition: FieldDefinition,
  formKey: string | null,
  supportedKey: string | null,
  formCanonical: CanonicalValue,
  supportedCanonical: CanonicalValue,
): boolean {
  switch (definition.comparison) {
    case 'NUMERIC_TOLERANCE': {
      if (typeof formCanonical !== 'number' || typeof supportedCanonical !== 'number') {
        return formKey === supportedKey;
      }
      const tolerance = definition.comparisonTolerance ?? 0;
      return Math.abs(formCanonical - supportedCanonical) <= tolerance;
    }
    case 'NOT_COMPARED':
      return true;
    default:
      // EXACT, ALIAS, MONEY_EXACT, DATE_EXACT, IDENTIFIER_STRICT and
      // NARRATIVE_REVIEW all compare on the normalizer's comparison key. Alias
      // resolution already happened during normalization.
      return formKey === supportedKey;
  }
}

export function compareField(
  input: FieldComparisonInput,
  ruleContext: ComparisonRuleContext,
): FieldComparison {
  const { definition } = input;
  const { context, lookup } = ruleContext;

  const isVisible = evaluateRule(definition.visibleRule, lookup, context);
  const isCritical = evaluateRule(definition.criticalRule.when, lookup, context);
  const requiredActive =
    definition.requiredRule.kind !== RequirednessKind.OPTIONAL &&
    definition.requiredRule.kind !== RequirednessKind.SYSTEM_GENERATED &&
    evaluateRule(definition.requiredRule.when, lookup, context);

  const form = normalizeFieldValue(definition, input.formValueRaw);
  const notes: string[] = [];

  // Chosen up front so superseded candidates are carried on every result. A value
  // withdrawn during the call stays visible in history no matter which branch
  // produces the outcome — 08 §6 "Preserve earlier values as conflict history."
  const selection = selectCandidate(input.candidates, {
    targetScope: input.targetScope,
    isCritical,
  });

  const base = {
    fieldKey: definition.key,
    isVisible,
    isRequired: requiredActive,
    isCritical,
    formRaw: input.formValueRaw,
    formCanonical: form.canonical,
    formDisplay: form.display,
    formSteps: form.steps,
    supportedRaw: null as string | null,
    supportedCanonical: null as CanonicalValue,
    supportedDisplay: null as string | null,
    supportedSteps: [] as readonly string[],
    supportedSourceType: null as SourceType | null,
    competingCandidates: [] as readonly ExtractedCandidate[],
    supersededCandidates: selection.superseded,
    evidence: null as EvidenceRef | null,
    confidence: null as number | null,
    derivation: null as FieldComparison['derivation'],
    carrierMasterVersionId: null as string | null,
    notes: notes as readonly string[],
  };

  // -- 1. Conditionally out of scope. 05 §8: do not hide the field, mark it. ----
  if (!isVisible) {
    return {
      ...base,
      outcome: ComparisonOutcome.NOT_APPLICABLE,
      severity: Severity.NONE,
      message: 'This field does not apply given the answers recorded elsewhere on the form.',
      ruleCode: 'CMP-000-NOT-VISIBLE',
      actions: [],
    };
  }

  // -- 2. Not compared at all (system-controlled values). ----------------------
  if (definition.comparison === 'NOT_COMPARED') {
    return {
      ...base,
      outcome: ComparisonOutcome.NOT_EVALUATED,
      severity: Severity.NONE,
      message: 'System-managed value; not compared against call sources.',
      ruleCode: 'CMP-001-NOT-COMPARED',
      actions: [ResolutionAction.EDIT_MANUALLY],
    };
  }

  // -- 3. A recorded bypass short-circuits, with its configured consequence. ----
  if (input.bypass) {
    const consequence = bypassConsequence(input.bypass.reason, {
      isCritical,
      isMasterEligible: definition.allowedSources.includes(SourceType.CARRIER_MASTER),
      hasMatchingMasterScope: input.masterOffer?.scopeMatches ?? false,
      isSourceSystemEligible: definition.allowedSources.includes(
        SourceType.PREFILLED_PATIENT_RECORD,
      ),
      hasConfiguredExceptionAuthority: ruleContext.hasConfiguredExceptionAuthority ?? false,
    });
    return {
      ...base,
      outcome: ComparisonOutcome.BYPASSED,
      severity: consequence.severity,
      evidence: input.bypass.evidence,
      message: consequence.explanation,
      ruleCode: `CMP-010-BYPASS/${consequence.ruleVersion}`,
      actions: [ResolutionAction.REVERT, ResolutionAction.EDIT_MANUALLY],
    };
  }

  // -- 4. A manual approval was recorded by an operator — 09 §2, §13. ----------
  if (input.manualResolution) {
    return {
      ...base,
      outcome: ComparisonOutcome.MANUALLY_APPROVED,
      severity: Severity.NONE,
      message:
        input.manualResolution.explanation ??
        'An operator approved this value and recorded the reason.',
      ruleCode: 'CMP-020-MANUAL-APPROVAL',
      actions: [ResolutionAction.REVERT, ResolutionAction.EDIT_MANUALLY, ResolutionAction.VIEW_EVIDENCE],
    };
  }

  // -- 5. Act on the supported value chosen above — 08 §4–§8. -----------------
  const formBlank = form.canonical === null;

  // -- 6. Payer explicitly could not see it — CASE-005. -----------------------
  if (selection.kind === SelectionKind.PAYER_UNAVAILABLE) {
    const evidence = selection.supported?.evidence ?? null;
    // A form asserting a definite No against "we cannot see that" is the exact
    // false-negative 02 §12 warns about. It must never read as MATCH.
    if (form.canonical === 'NO') {
      return {
        ...base,
        outcome: ComparisonOutcome.MISMATCH,
        severity: isCritical ? Severity.FAILURE : Severity.REVIEW,
        supportedRaw: selection.supported?.rawValue ?? null,
        supportedCanonical: 'PAYER_UNABLE_TO_VERIFY',
        supportedDisplay: 'Payer unable to verify',
        supportedSourceType: SourceType.TRANSCRIPT_REP_CONFIRMED,
        evidence,
        confidence: selection.supported?.confidence ?? null,
        message: `Entered No; the representative said this information was not visible on their side. A lack of payer visibility does not confirm that none exists.`,
        ruleCode: 'CMP-030-NO-VS-UNABLE-TO-VERIFY',
        actions: [
          ResolutionAction.EDIT_MANUALLY,
          ResolutionAction.BYPASS_WITH_REASON,
          ResolutionAction.VIEW_EVIDENCE,
        ],
      };
    }
    return {
      ...base,
      outcome: ComparisonOutcome.PAYER_UNABLE_TO_VERIFY,
      severity: Severity.REVIEW,
      supportedRaw: selection.supported?.rawValue ?? null,
      supportedCanonical: 'PAYER_UNABLE_TO_VERIFY',
      supportedDisplay: 'Payer unable to verify',
      supportedSourceType: SourceType.TRANSCRIPT_REP_CONFIRMED,
      evidence,
      confidence: selection.supported?.confidence ?? null,
      message: inlineMessage.payerUnavailable(),
      ruleCode: 'CMP-031-PAYER-UNAVAILABLE',
      actions: [
        ResolutionAction.EDIT_MANUALLY,
        ResolutionAction.BYPASS_WITH_REASON,
        ResolutionAction.VIEW_EVIDENCE,
      ],
    };
  }

  // -- 7. Conflicting candidates — CASE-002. ----------------------------------
  // 09 §5: "Do not show `Apply supported value` when no single supported value
  // exists." The action list below deliberately omits it.
  if (selection.kind === SelectionKind.CONFLICT) {
    const shown = selection.competing.slice(0, 2);
    return {
      ...base,
      outcome: ComparisonOutcome.CONFLICT_IN_SOURCE,
      severity: Severity.REVIEW,
      competingCandidates: selection.competing,
      supersededCandidates: selection.superseded,
      evidence: shown[0]?.evidence ?? null,
      message: inlineMessage.conflict({
        candidateA: shown[0]?.rawValue ?? null,
        candidateB: shown[1]?.rawValue ?? null,
      }),
      ruleCode: selection.ruleCode,
      actions: [
        ResolutionAction.REVIEW_CONFLICT,
        ResolutionAction.EDIT_MANUALLY,
        ResolutionAction.BYPASS_WITH_REASON,
        ResolutionAction.VIEW_EVIDENCE,
      ],
    };
  }

  // -- 8. Low confidence or unparsed audio — 08 §19. --------------------------
  if (selection.kind === SelectionKind.LOW_CONFIDENCE) {
    return {
      ...base,
      outcome: ComparisonOutcome.LOW_CONFIDENCE,
      severity: Severity.REVIEW,
      competingCandidates: selection.competing,
      supersededCandidates: selection.superseded,
      evidence: selection.supported?.evidence ?? selection.competing[0]?.evidence ?? null,
      confidence: selection.supported?.confidence ?? null,
      message: inlineMessage.lowConfidence({
        candidateA: selection.supported?.rawValue ?? selection.competing[0]?.rawValue ?? null,
      }),
      ruleCode: selection.ruleCode,
      actions: [
        ResolutionAction.REVIEW_CONFLICT,
        ResolutionAction.EDIT_MANUALLY,
        ResolutionAction.BYPASS_WITH_REASON,
        ResolutionAction.VIEW_EVIDENCE,
      ],
    };
  }

  // -- 9. Candidates exist but describe a different scope — 08 §10. -----------
  if (selection.kind === SelectionKind.OUT_OF_SCOPE) {
    const other = selection.competing[0];
    return {
      ...base,
      outcome: ComparisonOutcome.OUT_OF_SCOPE_SOURCE,
      severity: Severity.REVIEW,
      competingCandidates: selection.competing,
      evidence: other?.evidence ?? null,
      message: inlineMessage.scopeMismatch({
        sourceScope: other?.scope?.service ?? other?.scope?.network ?? 'a different scope',
        targetScope: input.targetScope?.service ?? definition.label,
      }),
      ruleCode: selection.ruleCode,
      actions: [
        ResolutionAction.EDIT_MANUALLY,
        ResolutionAction.BYPASS_WITH_REASON,
        ResolutionAction.VIEW_EVIDENCE,
      ],
    };
  }

  // -- 10. A supported transcript value exists. -------------------------------
  if (selection.kind === SelectionKind.SUPPORTED && selection.supported) {
    const candidate = selection.supported;
    const supported = normalizeFieldValue(definition, candidate.rawValue);
    const supportedCanonical =
      supported.ok && supported.canonical !== null ? supported.canonical : candidate.parsedValue;

    const supportedInfo = {
      supportedRaw: candidate.rawValue,
      supportedCanonical,
      supportedDisplay: supported.display ?? String(candidate.parsedValue ?? candidate.rawValue),
      supportedSteps: supported.steps,
      supportedSourceType: SourceType.TRANSCRIPT_REP_CONFIRMED,
      competingCandidates: selection.competing,
      supersededCandidates: selection.superseded,
      evidence: candidate.evidence,
      confidence: candidate.confidence,
    };

    if (formBlank) {
      return {
        ...base,
        ...supportedInfo,
        outcome: ComparisonOutcome.MISSING_IN_FORM,
        severity: requiredActive
          ? severityForMissing(definition.requiredRule.kind, isCritical)
          : Severity.REVIEW,
        message: inlineMessage.missing({ sourceValue: supportedInfo.supportedDisplay }),
        ruleCode: 'CMP-040-MISSING-IN-FORM',
        actions: [
          ResolutionAction.APPLY_SUPPORTED_VALUE,
          ResolutionAction.EDIT_MANUALLY,
          ResolutionAction.BYPASS_WITH_REASON,
          ResolutionAction.VIEW_EVIDENCE,
        ],
      };
    }

    const equal = valuesEqual(
      definition,
      form.comparisonKey,
      supported.comparisonKey,
      form.canonical,
      supportedCanonical,
    );

    if (equal) {
      return {
        ...base,
        ...supportedInfo,
        outcome: ComparisonOutcome.MATCH,
        severity: Severity.NONE,
        message: inlineMessage.match({ sourceValue: supportedInfo.supportedDisplay }),
        ruleCode: selection.ruleCode,
        actions: [ResolutionAction.VIEW_EVIDENCE],
      };
    }

    // Identifier suffix relationship — CASE-006. Explicitly NOT a match.
    if (definition.comparison === 'IDENTIFIER_STRICT') {
      const related = suffixRelationship(String(form.canonical), String(supportedCanonical));
      if (related) {
        return {
          ...base,
          ...supportedInfo,
          outcome: ComparisonOutcome.LOW_CONFIDENCE,
          severity: Severity.REVIEW,
          message: identifierSuffixMessage(
            String(form.display ?? form.canonical),
            String(supportedInfo.supportedDisplay),
            related.suffix,
          ),
          ruleCode: 'CMP-050-IDENTIFIER-SUFFIX',
          actions: [
            ResolutionAction.REVIEW_CONFLICT,
            ResolutionAction.EDIT_MANUALLY,
            ResolutionAction.BYPASS_WITH_REASON,
            ResolutionAction.VIEW_EVIDENCE,
          ],
        };
      }
    }

    // Narrative prose differing is not proof of error — 08 §11 forbids auto-pass
    // on similarity, and equally forbids calling a rewording a failure.
    const narrative = definition.comparison === 'NARRATIVE_REVIEW';

    return {
      ...base,
      ...supportedInfo,
      outcome: ComparisonOutcome.MISMATCH,
      severity: narrative ? Severity.REVIEW : isCritical ? Severity.FAILURE : Severity.REVIEW,
      message: narrative
        ? `The wording differs from what the call supports. Entered "${form.display ?? ''}"; the call supports "${supportedInfo.supportedDisplay}".`
        : inlineMessage.mismatch({
            formValue: form.display ?? String(form.canonical),
            sourceValue: supportedInfo.supportedDisplay,
          }),
      ruleCode: narrative ? 'CMP-061-NARRATIVE-DIFFERENCE' : 'CMP-060-MISMATCH',
      actions: [
        ResolutionAction.APPLY_SUPPORTED_VALUE,
        ResolutionAction.EDIT_MANUALLY,
        ResolutionAction.BYPASS_WITH_REASON,
        ResolutionAction.VIEW_EVIDENCE,
      ],
    };
  }

  // -- 11. No transcript candidate. Try approved non-transcript sources. ------

  // 11a. Carrier master, only with matching scope — 10 §16.
  if (
    input.masterOffer &&
    input.masterOffer.scopeMatches &&
    definition.allowedSources.includes(SourceType.CARRIER_MASTER)
  ) {
    const master = normalizeFieldValue(definition, input.masterOffer.value);
    const masterInfo = {
      supportedRaw: input.masterOffer.value,
      supportedCanonical: master.canonical,
      supportedDisplay: master.display,
      supportedSteps: master.steps,
      supportedSourceType: SourceType.CARRIER_MASTER,
      carrierMasterVersionId: input.masterOffer.versionId,
    };

    if (formBlank || valuesEqual(definition, form.comparisonKey, master.comparisonKey, form.canonical, master.canonical)) {
      return {
        ...base,
        ...masterInfo,
        outcome: ComparisonOutcome.MASTER_DATA_SUPPORTED,
        severity: Severity.NONE,
        message: inlineMessage.masterSupported({
          carrierMasterVersion: input.masterOffer.versionLabel,
        }),
        ruleCode: 'CMP-070-MASTER-SUPPORTED',
        actions: [ResolutionAction.EDIT_MANUALLY, ResolutionAction.VIEW_EVIDENCE],
      };
    }

    // 10 §16: a member-specific answer contradicting the master creates review.
    return {
      ...base,
      ...masterInfo,
      outcome: ComparisonOutcome.MISMATCH,
      severity: isCritical ? Severity.FAILURE : Severity.REVIEW,
      message: `Entered ${form.display ?? String(form.canonical)}; ${input.masterOffer.versionLabel} holds ${master.display}. A contradiction creates a master-data proposal rather than updating the master.`,
      ruleCode: 'CMP-071-MASTER-CONTRADICTION',
      actions: [
        ResolutionAction.USE_CARRIER_MASTER,
        ResolutionAction.EDIT_MANUALLY,
        ResolutionAction.BYPASS_WITH_REASON,
      ],
    };
  }

  // 11b. Approved derivation — 06 §10, §11 and CASE-004 / CASE-007.
  const derivation = definition.derivation;
  if (derivation && derivation.enabledByDefault && input.derivationOperands) {
    const operandValues = derivation.operands.map((k) => input.derivationOperands?.[k] ?? null);
    const allNumeric = operandValues.every((v) => typeof v === 'number');
    if (allNumeric) {
      const [a, b] = operandValues as number[];
      const result = derivation.kind === 'SUBTRACT' ? (a as number) - (b as number) : (a as number) + (b as number);
      const isMoney = definition.normalization === 'MONEY';
      const fmt = (n: number): string => (isMoney ? formatCents(n) : String(n));
      const formula = derivation.describe(operandValues.map((v) => fmt(v as number)));

      const derivedInfo = {
        supportedRaw: String(result),
        supportedCanonical: result as CanonicalValue,
        supportedDisplay: fmt(result),
        supportedSteps: [`derived: ${formula}`],
        supportedSourceType: SourceType.DERIVED_CALCULATION,
        derivation: { ruleId: derivation.id, formula, operands: derivation.operands },
      };

      const equal =
        !formBlank &&
        valuesEqual(definition, form.comparisonKey, String(result), form.canonical, result);

      if (formBlank || equal) {
        return {
          ...base,
          ...derivedInfo,
          // 06 §10: "Derived values remain visibly labeled." Never MATCH.
          outcome: ComparisonOutcome.DERIVED_SUPPORTED,
          severity: Severity.NONE,
          message: inlineMessage.derived({
            result: fmt(result),
            operandA: fmt(operandValues[0] as number),
            operandB: fmt(operandValues[1] as number),
          }),
          ruleCode: `CMP-080-DERIVED/${derivation.id}`,
          actions: [ResolutionAction.EDIT_MANUALLY, ResolutionAction.VIEW_EVIDENCE],
        };
      }

      notes.push(
        arithmeticNote(
          derivation.operands[0] ?? 'operand A',
          derivation.operands[1] ?? 'operand B',
          definition.label,
          fmt(result),
          form.display ?? String(form.canonical),
        ),
      );
      return {
        ...base,
        ...derivedInfo,
        notes,
        outcome: ComparisonOutcome.MISMATCH,
        severity: isCritical ? Severity.FAILURE : Severity.REVIEW,
        message: inlineMessage.mismatch({
          formValue: form.display ?? String(form.canonical),
          sourceValue: `${fmt(result)} (calculated)`,
        }),
        ruleCode: `CMP-081-DERIVED-MISMATCH/${derivation.id}`,
        actions: [
          ResolutionAction.APPLY_SUPPORTED_VALUE,
          ResolutionAction.EDIT_MANUALLY,
          ResolutionAction.BYPASS_WITH_REASON,
        ],
      };
    }
  }

  // -- 12. Nothing supports a value. ------------------------------------------
  if (!formBlank) {
    // The form asserts something no permitted source supports — 09 §2.
    //
    // Severity is REVIEW even on a critical field. "Unsupported" is not
    // "contradicted": the value may well be correct and simply never discussed,
    // which is precisely CASE-011 ("Payer phone, plan, network, payer ID, and
    // copay require another approved source or review"). Only a direct
    // contradiction earns FAILURE. REVIEW still blocks PASSED, so this cannot
    // produce a critical false pass.
    return {
      ...base,
      outcome: ComparisonOutcome.NOT_FOUND_IN_SOURCE,
      severity: Severity.REVIEW,
      message: inlineMessage.unsupported(),
      ruleCode: 'CMP-090-NOT-FOUND-IN-SOURCE',
      actions: [
        ResolutionAction.EDIT_MANUALLY,
        ResolutionAction.BYPASS_WITH_REASON,
        ...(input.masterOffer ? [ResolutionAction.USE_CARRIER_MASTER] : []),
      ],
    };
  }

  // Blank, unsupported. Requiredness decides whether that matters.
  if (requiredActive) {
    const triggers = referencedFields(definition.requiredRule.when);
    const conditional =
      definition.requiredRule.kind === RequirednessKind.REQUIRED_WHEN && triggers.length > 0;
    return {
      ...base,
      outcome: ComparisonOutcome.UNKNOWN,
      severity: severityForMissing(definition.requiredRule.kind, isCritical),
      message: conditional
        ? inlineMessage.conditionalMissing({
            dependentFieldLabel: definition.label,
            triggerFieldLabel: String(triggers[0]),
            triggerValue: String(lookup(triggers[0] as VobFieldKey) ?? 'set'),
          }) + ' No permitted source supplies it.'
        : `${definition.label} is blank and no permitted source supplies a value.`,
      ruleCode: `CMP-100-REQUIRED-BLANK/${definition.requiredRule.id}`,
      actions: [ResolutionAction.EDIT_MANUALLY, ResolutionAction.BYPASS_WITH_REASON],
    };
  }

  return {
    ...base,
    outcome: ComparisonOutcome.UNKNOWN,
    severity: Severity.NONE,
    message: 'Not stated on the call and not required for this case.',
    ruleCode: 'CMP-101-OPTIONAL-BLANK',
    actions: [ResolutionAction.EDIT_MANUALLY],
  };
}

/** Explanation of why a conditional requirement is active — 09 §7. */
export function describeRequirement(
  definition: FieldDefinition,
  label: (k: VobFieldKey) => string,
): string {
  if (definition.requiredRule.kind === RequirednessKind.OPTIONAL) return 'Optional.';
  if (definition.requiredRule.kind === RequirednessKind.REQUIRED_WHEN) {
    return `Required when ${describeRule(definition.requiredRule.when, label)}.`;
  }
  return `${definition.requiredRule.kind.replace(/_/g, ' ').toLowerCase()}.`;
}
