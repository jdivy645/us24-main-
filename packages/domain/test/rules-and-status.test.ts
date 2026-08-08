/**
 * Rule engine, conditional logic, bypass consequence, status precedence,
 * freshness and document gating.
 *
 * Spec authority: 06 §17 (conditional rules), 08 §20 and 09 §3 (precedence),
 * 09 §12 (bypass consequences), 09 §15 (freshness), 09 §16 and 13 §11 (gating),
 * 15 §3 (domain unit tests).
 */

import { describe, expect, it } from 'vitest';
import {
  BypassReason,
  CaseStatus,
  ComparisonOutcome,
  DocumentType,
  FIELD_REGISTRY,
  Severity,
  bypassConsequence,
  calculateCaseStatus,
  documentGate,
  evaluateFreshness,
  evaluateRule,
  referencedFields,
  rule,
  runComparison,
  validateBypass,
  type FieldComparison,
  type RuleContext,
} from '../src/index.js';
import {
  DEFAULT_RULE_CONTEXT,
  makeBlankFormValues,
  makeCandidate,
  makeConflictingCandidates,
} from '@us24/testing';

const CONTEXT: RuleContext = DEFAULT_RULE_CONTEXT;

function comparison(overrides: Partial<FieldComparison>): FieldComparison {
  return {
    fieldKey: 'patient.lastName',
    outcome: ComparisonOutcome.MATCH,
    severity: Severity.NONE,
    isVisible: true,
    isRequired: false,
    isCritical: false,
    formRaw: null,
    formCanonical: null,
    formDisplay: null,
    formSteps: [],
    supportedRaw: null,
    supportedCanonical: null,
    supportedDisplay: null,
    supportedSteps: [],
    supportedSourceType: null,
    competingCandidates: [],
    supersededCandidates: [],
    evidence: null,
    confidence: null,
    derivation: null,
    carrierMasterVersionId: null,
    message: '',
    ruleCode: 'TEST',
    actions: [],
    notes: [],
    ...overrides,
  };
}

function statusOf(comparisons: readonly FieldComparison[]) {
  return calculateCaseStatus({
    comparisons,
    ruleSetVersion: 'test-rules',
    dictionaryVersion: 'test-dictionary',
    revisionId: 'rev-1',
    evaluatedAt: '2026-08-07T00:00:00.000Z',
  });
}

describe('rule expressions are data (06 §16)', () => {
  const lookup = (field: string) =>
    (({ 'financial.copayApplies': 'YES', 'visits.limitType': 'HARD_MAXIMUM' }) as Record<string, string>)[
      field
    ];

  it('evaluates equality, membership, presence and composition', () => {
    expect(evaluateRule(rule.eq('financial.copayApplies', 'YES'), lookup as never, CONTEXT)).toBe(true);
    expect(evaluateRule(rule.eq('financial.copayApplies', 'NO'), lookup as never, CONTEXT)).toBe(false);
    expect(evaluateRule(rule.oneOf('visits.limitType', ['HARD_MAXIMUM', 'UNKNOWN']), lookup as never, CONTEXT)).toBe(true);
    expect(evaluateRule(rule.present('financial.copayApplies'), lookup as never, CONTEXT)).toBe(true);
    expect(evaluateRule(rule.blank('financial.copayAmount'), lookup as never, CONTEXT)).toBe(true);
    expect(
      evaluateRule(
        rule.and(rule.eq('financial.copayApplies', 'YES'), rule.eq('visits.limitType', 'HARD_MAXIMUM')),
        lookup as never,
        CONTEXT,
      ),
    ).toBe(true);
    expect(evaluateRule(rule.not(rule.eq('financial.copayApplies', 'YES')), lookup as never, CONTEXT)).toBe(false);
  });

  it('reads case context predicates', () => {
    expect(evaluateRule(rule.context('mode', 'AUDIT'), lookup as never, CONTEXT)).toBe(true);
    expect(evaluateRule(rule.context('mode', 'AUTO_FILL'), lookup as never, CONTEXT)).toBe(false);
  });

  it('serializes to plain JSON so a matrix can be stored and versioned', () => {
    const expr = rule.and(rule.eq('financial.copayApplies', 'YES'), rule.present('financial.copayAmount'));
    expect(JSON.parse(JSON.stringify(expr))).toEqual(expr);
  });

  it('exposes its field dependencies for the renderer', () => {
    const expr = rule.and(rule.eq('financial.copayApplies', 'YES'), rule.present('visits.allowedCount'));
    expect(referencedFields(expr)).toEqual(['financial.copayApplies', 'visits.allowedCount']);
  });
});

describe('conditional rules from 06 §17', () => {
  function run(formValues: Record<string, string | null>) {
    return runComparison({
      registry: FIELD_REGISTRY,
      formValues,
      candidatesByField: {},
      context: CONTEXT,
      revisionId: 'rev-1',
      evaluatedAt: '2026-08-07T00:00:00.000Z',
    });
  }

  it('makes copay amount required when copay applies is Yes', () => {
    const withCopay = run({ ...makeBlankFormValues(), 'financial.copayApplies': 'Yes' });
    expect(withCopay.byField.get('financial.copayAmount')?.isRequired).toBe(true);

    const withoutCopay = run({ ...makeBlankFormValues(), 'financial.copayApplies': 'No' });
    expect(withoutCopay.byField.get('financial.copayAmount')?.isRequired).toBe(false);
  });

  it('makes coinsurance percentage required when coinsurance applies is Yes', () => {
    const result = run({ ...makeBlankFormValues(), 'financial.coinsuranceApplies': 'Yes' });
    expect(result.byField.get('financial.patientCoinsurancePercent')?.isRequired).toBe(true);
  });

  it('makes allowed count required when the visit limit is a hard maximum', () => {
    const result = run({ ...makeBlankFormValues(), 'visits.limitType': 'Hard maximum' });
    expect(result.byField.get('visits.allowedCount')?.isRequired).toBe(true);
  });

  it('makes the authorization threshold required when treatment authorization is Yes', () => {
    const result = run({ ...makeBlankFormValues(), 'authorization.treatmentRequired': 'Yes' });
    expect(result.byField.get('authorization.requiredAfterVisitNumber')?.isRequired).toBe(true);
  });

  it('shows secondary detail fields only when secondary coverage is confirmed Yes', () => {
    const hidden = run({ ...makeBlankFormValues(), 'coordination.secondaryStatus': 'No' });
    expect(hidden.byField.get('secondary.policyId')?.isVisible).toBe(false);
    expect(hidden.byField.get('secondary.policyId')?.outcome).toBe(ComparisonOutcome.NOT_APPLICABLE);

    const shown = run({ ...makeBlankFormValues(), 'coordination.secondaryStatus': 'Yes' });
    expect(shown.byField.get('secondary.policyId')?.isVisible).toBe(true);
    expect(shown.byField.get('secondary.policyId')?.isRequired).toBe(true);
  });

  it('does not show secondary details when the payer merely could not see them (CASE-005)', () => {
    const result = run({
      ...makeBlankFormValues(),
      'coordination.secondaryStatus': 'Payer unable to verify',
    });
    expect(result.byField.get('secondary.policyId')?.isVisible).toBe(false);
    expect(result.byField.get('secondary.policyId')?.isRequired).toBe(false);
  });
});

describe('status precedence (08 §20, 09 §3)', () => {
  it('FAILED takes precedence over everything else', () => {
    const status = statusOf([
      comparison({ outcome: ComparisonOutcome.MATCH, severity: Severity.NONE }),
      comparison({ fieldKey: 'primary.policyId', outcome: ComparisonOutcome.CONFLICT_IN_SOURCE, severity: Severity.REVIEW }),
      comparison({ fieldKey: 'patient.dateOfBirth', outcome: ComparisonOutcome.MISMATCH, severity: Severity.FAILURE }),
    ]);
    expect(status.status).toBe(CaseStatus.FAILED);
  });

  it('NEEDS REVIEW takes precedence over PASSED', () => {
    const status = statusOf([
      comparison({ outcome: ComparisonOutcome.MATCH, severity: Severity.NONE }),
      comparison({ fieldKey: 'primary.policyId', outcome: ComparisonOutcome.LOW_CONFIDENCE, severity: Severity.REVIEW }),
    ]);
    expect(status.status).toBe(CaseStatus.NEEDS_REVIEW);
  });

  it('PASSED only when nothing is unresolved', () => {
    const status = statusOf([
      comparison({ outcome: ComparisonOutcome.MATCH, severity: Severity.NONE }),
      comparison({ fieldKey: 'primary.policyId', outcome: ComparisonOutcome.MATCH, severity: Severity.NONE }),
    ]);
    expect(status.status).toBe(CaseStatus.PASSED);
  });

  it('one critical mismatch fails a case where everything else matches (09 §3)', () => {
    const many = Array.from({ length: 99 }, (_, i) =>
      comparison({ fieldKey: `field-${i}` as never, outcome: ComparisonOutcome.MATCH, severity: Severity.NONE }),
    );
    const status = statusOf([
      ...many,
      comparison({
        fieldKey: 'authorization.requiredAfterVisitNumber',
        outcome: ComparisonOutcome.MISMATCH,
        severity: Severity.FAILURE,
        isCritical: true,
      }),
    ]);
    expect(status.counts.matchPercent).toBeGreaterThan(95);
    expect(status.status).toBe(CaseStatus.FAILED);
  });

  it('ignores fields that are not visible', () => {
    const status = statusOf([
      comparison({ outcome: ComparisonOutcome.MATCH, severity: Severity.NONE }),
      comparison({
        fieldKey: 'secondary.policyId',
        outcome: ComparisonOutcome.MISMATCH,
        severity: Severity.FAILURE,
        isVisible: false,
      }),
    ]);
    expect(status.status).toBe(CaseStatus.PASSED);
  });

  it('reports an unevaluated case as incomplete rather than passed', () => {
    const status = statusOf([
      comparison({ outcome: ComparisonOutcome.NOT_EVALUATED, severity: Severity.NONE }),
    ]);
    expect(status.incomplete).toBe(true);
    expect(status.status).not.toBe(CaseStatus.PASSED);
  });

  it('records the rule-set version and input revision with the result (08 §20)', () => {
    const status = statusOf([comparison({})]);
    expect(status.ruleSetVersion).toBe('test-rules');
    expect(status.revisionId).toBe('rev-1');
  });

  it('orders reasons most severe first', () => {
    const status = statusOf([
      comparison({ fieldKey: 'primary.policyId', outcome: ComparisonOutcome.LOW_CONFIDENCE, severity: Severity.REVIEW }),
      comparison({ fieldKey: 'patient.dateOfBirth', outcome: ComparisonOutcome.MISMATCH, severity: Severity.FAILURE }),
    ]);
    expect(status.reasons[0]?.severity).toBe(Severity.FAILURE);
  });
});

describe('bypass consequences (09 §12)', () => {
  const ctx = {
    isCritical: false,
    isMasterEligible: false,
    hasMatchingMasterScope: false,
    isSourceSystemEligible: false,
    hasConfiguredExceptionAuthority: false,
  };

  it('a truly non-applicable optional field may permit PASSED', () => {
    expect(bypassConsequence(BypassReason.NOT_APPLICABLE, ctx).severity).toBe(Severity.NONE);
  });

  it('not applicable on a critical field still needs review', () => {
    expect(bypassConsequence(BypassReason.NOT_APPLICABLE, { ...ctx, isCritical: true }).severity).toBe(
      Severity.REVIEW,
    );
  });

  it('payer unable to verify forces review', () => {
    expect(bypassConsequence(BypassReason.PAYER_UNABLE_TO_VERIFY, ctx).severity).toBe(Severity.REVIEW);
  });

  it('not discussed during the call does not automatically permit PASSED', () => {
    expect(bypassConsequence(BypassReason.NOT_DISCLOSED_DURING_CALL, ctx).severity).toBe(Severity.REVIEW);
  });

  it('carrier master passes only with a matching scope', () => {
    expect(
      bypassConsequence(BypassReason.USE_APPROVED_CARRIER_MASTER, {
        ...ctx,
        isMasterEligible: true,
        hasMatchingMasterScope: true,
      }).severity,
    ).toBe(Severity.NONE);

    expect(
      bypassConsequence(BypassReason.USE_APPROVED_CARRIER_MASTER, {
        ...ctx,
        isMasterEligible: true,
        hasMatchingMasterScope: false,
      }).severity,
    ).toBe(Severity.REVIEW);
  });

  it('a client-approved exception needs a configured authority to clear review', () => {
    expect(bypassConsequence(BypassReason.CLIENT_APPROVED_EXCEPTION, ctx).severity).toBe(Severity.REVIEW);
    expect(
      bypassConsequence(BypassReason.CLIENT_APPROVED_EXCEPTION, {
        ...ctx,
        hasConfiguredExceptionAuthority: true,
      }).severity,
    ).toBe(Severity.NONE);
  });

  it('Other always forces review', () => {
    expect(bypassConsequence(BypassReason.OTHER_WITH_REQUIRED_NOTE, ctx).severity).toBe(Severity.REVIEW);
  });

  it('rejects a bypass without a required note', () => {
    const policy = FIELD_REGISTRY.get('financial.copayAmount').bypassPolicy;
    const missing = validateBypass(policy, BypassReason.OTHER_WITH_REQUIRED_NOTE, null);
    expect(missing.valid).toBe(false);
    expect(missing.errors[0]?.code).toBe('NOTE_REQUIRED');

    const provided = validateBypass(policy, BypassReason.OTHER_WITH_REQUIRED_NOTE, 'Confirmed by fax.');
    expect(provided.valid).toBe(true);
  });

  it('rejects a bypass on a field that forbids it', () => {
    const policy = FIELD_REGISTRY.get('verification.caseId').bypassPolicy;
    const result = validateBypass(policy, BypassReason.NOT_APPLICABLE, null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('BYPASS_NOT_PERMITTED');
  });
});

describe('freshness (09 §15)', () => {
  it('marks an unverified revision stale', () => {
    const result = evaluateFreshness({
      comparedRevisionId: null,
      currentRevisionId: 'rev-1',
      comparedRuleSetVersion: null,
      currentRuleSetVersion: 'v0',
    });
    expect(result.isStale).toBe(true);
  });

  it('marks the comparison stale after any form change', () => {
    const result = evaluateFreshness({
      comparedRevisionId: 'rev-1',
      currentRevisionId: 'rev-2',
      comparedRuleSetVersion: 'v0',
      currentRuleSetVersion: 'v0',
    });
    expect(result.isStale).toBe(true);
    expect(result.label).toBe('Changes not verified');
  });

  it('marks the comparison stale after a source is replaced', () => {
    const result = evaluateFreshness({
      comparedRevisionId: 'rev-1',
      currentRevisionId: 'rev-1',
      comparedRuleSetVersion: 'v0',
      currentRuleSetVersion: 'v0',
      sourcesChangedAfterComparison: true,
    });
    expect(result.isStale).toBe(true);
  });

  it('marks the comparison stale when the rules change underneath it', () => {
    const result = evaluateFreshness({
      comparedRevisionId: 'rev-1',
      currentRevisionId: 'rev-1',
      comparedRuleSetVersion: 'v0',
      currentRuleSetVersion: 'v1',
    });
    expect(result.isStale).toBe(true);
  });

  it('is fresh when revision and rules both match', () => {
    const result = evaluateFreshness({
      comparedRevisionId: 'rev-1',
      currentRevisionId: 'rev-1',
      comparedRuleSetVersion: 'v0',
      currentRuleSetVersion: 'v0',
    });
    expect(result.isStale).toBe(false);
  });
});

describe('document gating (09 §16, 13 §11, 15 §22)', () => {
  const passed = statusOf([comparison({ outcome: ComparisonOutcome.MATCH, severity: Severity.NONE })]);
  const failed = statusOf([
    comparison({ outcome: ComparisonOutcome.MISMATCH, severity: Severity.FAILURE, isCritical: true }),
  ]);
  const review = statusOf([
    comparison({ outcome: ComparisonOutcome.CONFLICT_IN_SOURCE, severity: Severity.REVIEW }),
  ]);

  it('PASSED permits a clean final VOB', () => {
    expect(documentGate(passed, false).allowed).toContain(DocumentType.FINAL);
  });

  it('FAILED cannot generate a clean final VOB', () => {
    const gate = documentGate(failed, false);
    expect(gate.allowed).not.toContain(DocumentType.FINAL);
    expect(gate.allowed).toContain(DocumentType.QA_FAILED_DRAFT);
  });

  it('NEEDS REVIEW permits only a marked draft or QA report', () => {
    const gate = documentGate(review, false);
    expect(gate.allowed).not.toContain(DocumentType.FINAL);
    expect(gate.allowed).toContain(DocumentType.NEEDS_REVIEW_DRAFT);
  });

  it('a stale result blocks the final PDF even when the last run passed (09 §15)', () => {
    const gate = documentGate(passed, true);
    expect(gate.allowed).not.toContain(DocumentType.FINAL);
    expect(gate.blocked.find((b) => b.type === DocumentType.FINAL)?.reason).toContain('Verify');
  });

  it('explains the blockage in terms the operator can act on', () => {
    const gate = documentGate(review, false);
    expect(gate.blocked[0]?.reason).toContain('need review');
  });
});

describe('candidate handling edge cases (08 §4–§8)', () => {
  function compareOne(fieldKey: string, formValue: string | null, candidates: unknown[]) {
    return runComparison({
      registry: FIELD_REGISTRY,
      formValues: { ...makeBlankFormValues(), [fieldKey]: formValue },
      candidatesByField: { [fieldKey]: candidates as never },
      context: CONTEXT,
      revisionId: 'rev-1',
      evaluatedAt: '2026-08-07T00:00:00.000Z',
    }).byField.get(fieldKey as never)!;
  }

  it('does not extract a value from a caller question (08 §5)', () => {
    const result = compareOne('financial.copayAmount', null, [
      makeCandidate('financial.copayAmount', {
        rawValue: '$500',
        parsedValue: 50000,
        speakerRole: 'CALLER',
        speechAct: 'QUESTION',
      }),
    ]);
    expect(result.supportedCanonical).toBeNull();
    expect(result.outcome).not.toBe(ComparisonOutcome.MISSING_IN_FORM);
  });

  it('treats repeated equivalent values as supporting evidence, not conflict (08 §7)', () => {
    const result = compareOne('visits.allowedCount', '20', [
      makeCandidate('visits.allowedCount', { rawValue: '20', parsedValue: 20 }),
      makeCandidate('visits.allowedCount', { rawValue: 'twenty', parsedValue: 20, confidence: 0.8 }),
    ]);
    expect(result.outcome).toBe(ComparisonOutcome.MATCH);
  });

  it('creates a conflict for distinct values at equal authority (08 §7)', () => {
    const result = compareOne(
      'financial.patientCoinsurancePercent',
      '20%',
      makeConflictingCandidates('financial.patientCoinsurancePercent', '20%', '30%', 20, 30) as never[],
    );
    expect(result.outcome).toBe(ComparisonOutcome.CONFLICT_IN_SOURCE);
  });

  it('prefers a supervisor correction over the earlier representative answer (08 §4)', () => {
    const result = compareOne('visits.allowedCount', '30', [
      makeCandidate('visits.allowedCount', { rawValue: '20', parsedValue: 20 }),
      makeCandidate('visits.allowedCount', {
        rawValue: '30',
        parsedValue: 30,
        speakerRole: 'PAYER_SUPERVISOR',
      }),
    ]);
    expect(result.outcome).toBe(ComparisonOutcome.MATCH);
    expect(result.supportedCanonical).toBe(30);
  });

  it('routes a low-confidence reading to review rather than accepting it (08 §19)', () => {
    const result = compareOne('financial.individualOopMaximum', '$6,500.00', [
      makeCandidate('financial.individualOopMaximum', {
        rawValue: '$6,500',
        parsedValue: 650000,
        confidence: 0.3,
      }),
    ]);
    expect(result.outcome).toBe(ComparisonOutcome.LOW_CONFIDENCE);
  });

  it('does not compare candidates from a different service scope (08 §10)', () => {
    const result = runComparison({
      registry: FIELD_REGISTRY,
      formValues: { ...makeBlankFormValues(), 'visits.allowedCount': '20' },
      candidatesByField: {
        'visits.allowedCount': [
          makeCandidate('visits.allowedCount', {
            rawValue: '12',
            parsedValue: 12,
            scope: { service: 'CHIROPRACTIC' },
          }),
        ] as never,
      },
      context: CONTEXT,
      targetScope: { service: 'PT' },
      revisionId: 'rev-1',
      evaluatedAt: '2026-08-07T00:00:00.000Z',
    }).byField.get('visits.allowedCount')!;

    expect(result.outcome).toBe(ComparisonOutcome.OUT_OF_SCOPE_SOURCE);
  });

  it('an unknown speaker cannot automatically satisfy a critical field (08 §4)', () => {
    const result = compareOne('patient.dateOfBirth', '10/07/2010', [
      makeCandidate('patient.dateOfBirth', {
        rawValue: 'October 7th 2010',
        parsedValue: '2010-10-07',
        speakerRole: 'UNKNOWN',
      }),
    ]);
    expect(result.outcome).toBe(ComparisonOutcome.LOW_CONFIDENCE);
  });
});
