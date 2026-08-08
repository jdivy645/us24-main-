/**
 * The golden case — a mandatory release gate.
 *
 * 15 §8: "Make the supplied Cigna PDF and transcript a mandatory automated golden
 * fixture" and "Run the fixture after parser, prompt, normalizer, rule, or model
 * changes."
 *
 * 15 §22 release gate: "Golden case produces every approved expected outcome" and
 * "Critical false-pass count is zero on the release evaluation set."
 *
 * The fixture is currently reconstructed from spec-stated values because the
 * client source files were not supplied — see packages/testing/src/loader.ts.
 * These assertions test OUTCOMES, so swapping in the real files will not change
 * a single expectation below.
 */

import { describe, expect, it } from 'vitest';
import {
  CaseStatus,
  ComparisonOutcome,
  FIELD_REGISTRY,
  SEVERITY_RANK,
  Severity,
  documentGate,
  runComparison,
  type ComparisonRun,
} from '../src/index.js';
import {
  ALL_GOLDEN_EXPECTATIONS,
  CASE_012,
  DEFAULT_RULE_CONTEXT,
  EXPECTED_DISCREPANCIES,
  EXPECTED_MATCHES,
  loadGoldenFixture,
} from '@us24/testing';

const fixture = loadGoldenFixture();

function runGolden(): ComparisonRun {
  return runComparison({
    registry: FIELD_REGISTRY,
    formValues: fixture.formValues,
    candidatesByField: fixture.candidatesByField,
    context: DEFAULT_RULE_CONTEXT,
    revisionId: 'golden-revision-1',
    evaluatedAt: '2026-08-07T12:00:00.000Z',
  });
}

const run = runGolden();

describe('golden case — expected matches (15 §9)', () => {
  for (const expectation of EXPECTED_MATCHES) {
    it(`${expectation.caseId} ${expectation.fieldKey}: ${expectation.requirement}`, () => {
      const comparison = run.byField.get(expectation.fieldKey as never);
      expect(comparison, `no comparison produced for ${expectation.fieldKey}`).toBeDefined();
      expect(
        expectation.allowedOutcomes,
        `${expectation.fieldKey} produced ${comparison?.outcome} — ${expectation.specRef}`,
      ).toContain(comparison?.outcome);
    });
  }

  it('preserves leading zeros in the group ID all the way to the canonical value', () => {
    const groupId = run.byField.get('primary.groupId');
    expect(groupId?.formCanonical).toBe('00633434');
    expect(groupId?.supportedCanonical).toBe('00633434');
  });

  it('treats $3,000.00 and "three thousand dollars" as the same amount', () => {
    const deductible = run.byField.get('financial.individualDeductibleTotal');
    // Integer cents, never floating point — 08 §14.
    expect(deductible?.formCanonical).toBe(300000);
    expect(deductible?.supportedCanonical).toBe(300000);
    expect(deductible?.outcome).toBe(ComparisonOutcome.MATCH);
  });

  it('treats 10/07/2010 and "October 7th 2010" as the same date', () => {
    const dob = run.byField.get('patient.dateOfBirth');
    expect(dob?.formCanonical).toBe('2010-10-07');
    expect(dob?.supportedCanonical).toBe('2010-10-07');
  });
});

describe('golden case — required discrepancies (02 §9, 15 §10)', () => {
  for (const expectation of EXPECTED_DISCREPANCIES) {
    it(`${expectation.caseId} ${expectation.fieldKey}: ${expectation.requirement}`, () => {
      const comparison = run.byField.get(expectation.fieldKey as never);
      expect(comparison, `no comparison produced for ${expectation.fieldKey}`).toBeDefined();

      expect(
        expectation.allowedOutcomes,
        `${expectation.caseId} produced ${comparison?.outcome} — ${expectation.specRef}`,
      ).toContain(comparison?.outcome);

      for (const forbidden of expectation.forbiddenOutcomes) {
        expect(
          comparison?.outcome,
          `${expectation.caseId} must never be ${forbidden} — ${expectation.specRef}`,
        ).not.toBe(forbidden);
      }

      if (expectation.minimumSeverity) {
        expect(
          SEVERITY_RANK[comparison!.severity],
          `${expectation.caseId} severity ${comparison?.severity} is below the required ${expectation.minimumSeverity}`,
        ).toBeGreaterThanOrEqual(SEVERITY_RANK[expectation.minimumSeverity]);
      }
    });
  }
});

describe('CASE-001 — authorization threshold, fifth versus eighth visit', () => {
  const c = run.byField.get('authorization.requiredAfterVisitNumber')!;

  it('states the practical difference first, per 04 §8', () => {
    expect(c.message).toBe('Entered 5; representative confirmed 8.');
  });

  it('keeps the entered value visible rather than replacing it (09 §4)', () => {
    expect(c.formCanonical).toBe(5);
    expect(c.supportedCanonical).toBe(8);
  });

  it('ignores the caller question and uses only the representative confirmation (08 §5)', () => {
    expect(c.evidence?.speakerRole).toBe('PAYER_REPRESENTATIVE');
    expect(c.evidence?.excerpt).toContain('Correct');
  });

  it('offers Apply supported value because one safe value exists (04 §8)', () => {
    expect(c.actions).toContain('APPLY_SUPPORTED_VALUE');
  });
});

describe('CASE-002 — 20 versus 30 percent coinsurance', () => {
  const c = run.byField.get('financial.patientCoinsurancePercent')!;

  it('reports a source conflict rather than picking the later number (08 §6)', () => {
    expect(c.outcome).toBe(ComparisonOutcome.CONFLICT_IN_SOURCE);
  });

  it('shows every material candidate (09 §5)', () => {
    expect(c.competingCandidates).toHaveLength(2);
    const values = c.competingCandidates.map((x) => x.parsedValue).sort();
    expect(values).toEqual([20, 30]);
  });

  it('does NOT offer Apply supported value — 09 §5 forbids it without one safe value', () => {
    expect(c.actions).not.toContain('APPLY_SUPPORTED_VALUE');
    expect(c.actions).toContain('REVIEW_CONFLICT');
  });

  it('uses the 09 §7 conflict template', () => {
    expect(c.message).toBe('The call contains conflicting values: 20% and 30%.');
  });
});

describe('CASE-004 — the visits correction chain', () => {
  const used = run.byField.get('visits.usedCount')!;

  it('resolves to one used, derived from twenty allowed and nineteen remaining', () => {
    expect(used.outcome).toBe(ComparisonOutcome.DERIVED_SUPPORTED);
    expect(used.supportedCanonical).toBe(1);
  });

  it('discloses the formula rather than presenting a bare number (06 §10)', () => {
    expect(used.derivation).not.toBeNull();
    expect(used.derivation?.formula).toBe('20 − 19');
    expect(used.message).toBe('1 was calculated from 20 and 19.');
  });

  it('keeps the representative’s earlier "no visits used" in evidence history (15 §11)', () => {
    expect(used.supersededCandidates).toHaveLength(1);
    expect(used.supersededCandidates[0]?.parsedValue).toBe(0);
    expect(used.supersededCandidates[0]?.evidence.excerpt).toContain('no visits have been used');
  });

  it('does not let the caller restatement stand as confirmation (08 §4)', () => {
    // The caller said the portal shows one used. The value happens to be right,
    // but it must not be the reason the engine accepts it.
    expect(used.supportedSourceType).toBe('DERIVED_CALCULATION');
  });
});

describe('CASE-005 — payer cannot see secondary coverage', () => {
  const c = run.byField.get('coordination.secondaryStatus')!;

  it('never reports a match against a form asserting No', () => {
    expect(c.outcome).not.toBe(ComparisonOutcome.MATCH);
    expect(c.outcome).toBe(ComparisonOutcome.MISMATCH);
  });

  it('does not convert the lack of visibility into No (06 §14)', () => {
    expect(c.supportedCanonical).toBe('PAYER_UNABLE_TO_VERIFY');
    expect(c.supportedCanonical).not.toBe('NO');
  });

  it('explains why a lack of visibility is not proof of absence', () => {
    expect(c.message).toContain('not visible on their side');
    expect(c.message).toContain('does not confirm that none exists');
  });
});

describe('CASE-006 — policy identifier suffix', () => {
  const c = run.byField.get('primary.policyId')!;

  it('does not treat 106723434-01 and 106723434 as the same identifier (08 §12)', () => {
    expect(c.outcome).not.toBe(ComparisonOutcome.MATCH);
  });

  it('explains that an approved payer rule would be required', () => {
    expect(c.message).toContain('-01');
    expect(c.message).toContain('approved payer rule');
  });
});

describe('CASE-007 — out-of-pocket met is derived, not matched', () => {
  const c = run.byField.get('financial.individualOopMet')!;

  it('is labeled DERIVED rather than MATCH (06 §10)', () => {
    expect(c.outcome).toBe(ComparisonOutcome.DERIVED_SUPPORTED);
  });

  it('computes 6500.00 minus 5473.76 in integer cents', () => {
    expect(c.supportedCanonical).toBe(102624);
    expect(c.derivation?.formula).toBe('$6,500.00 − $5,473.76');
  });
});

describe('CASE-008 — garbled deductible retains competing candidates', () => {
  const met = run.byField.get('financial.individualDeductibleMet')!;

  it('does not force a clean value', () => {
    expect(met.outcome).toBe(ComparisonOutcome.CONFLICT_IN_SOURCE);
  });

  it('retains both readings of the garbled passage', () => {
    expect(met.competingCandidates.length).toBeGreaterThanOrEqual(2);
  });
});

describe('CASE-009 — corrected timely filing keeps its alternative condition', () => {
  const c = run.byField.get('claims.correctedTflAlternativeRule')!;

  it('is not flattened into a single number', () => {
    expect(String(c.formCanonical)).toContain('180');
    expect(String(c.formCanonical)).toContain('60');
    expect(String(c.formCanonical)).toContain('RA');
  });
});

describe('CASE-011 — values needing a carrier master or review', () => {
  for (const key of [
    'primary.insurancePhone',
    'primary.planType',
    'primary.networkGroupStatus',
    'primary.payerId',
    'financial.copayApplies',
  ]) {
    it(`${key} does not silently pass without an approved source`, () => {
      const c = run.byField.get(key as never)!;
      expect(c.outcome).not.toBe(ComparisonOutcome.MATCH);
      expect(SEVERITY_RANK[c.severity]).toBeGreaterThanOrEqual(SEVERITY_RANK[Severity.REVIEW]);
    });
  }

  it('treats an IVR greeting as too weak to support a member-facing value (08 §4)', () => {
    const phone = run.byField.get('primary.insurancePhone')!;
    expect(phone.outcome).not.toBe(ComparisonOutcome.MATCH);
  });
});

describe('CASE-012 — filenames supply no benefit facts', () => {
  it('the transcript filename names the wrong payer', () => {
    expect(fixture.transcriptArtifact.label).toContain(CASE_012.misleadingToken);
  });

  it('no extracted candidate takes its value from the filename', () => {
    for (const candidate of fixture.allCandidates) {
      expect(
        candidate.rawValue.toUpperCase(),
        `candidate ${candidate.candidateId} on ${candidate.fieldKey} echoes the filename`,
      ).not.toContain(CASE_012.misleadingToken);
    }
  });

  it('the payer resolves from call content, not the file name', () => {
    const insurer = run.byField.get('primary.insuranceName')!;
    expect(insurer.supportedCanonical).toBe(CASE_012.actualPayer);
    expect(insurer.evidence?.artifactLabel).toContain(CASE_012.misleadingToken);
  });
});

describe('golden case — overall outcome and document gating', () => {
  it('is FAILED, driven by critical mismatches (08 §20, 09 §3)', () => {
    expect(run.status.status).toBe(CaseStatus.FAILED);
  });

  it('never reports PASSED — this is the critical false-pass gate (15 §22)', () => {
    expect(run.status.status).not.toBe(CaseStatus.PASSED);
  });

  it('records the rule-set and dictionary versions with the result (08 §20)', () => {
    expect(run.status.ruleSetVersion).toBe(FIELD_REGISTRY.matrixVersion);
    expect(run.status.dictionaryVersion).toMatch(/^terminology-v1/);
  });

  it('ranks the most severe reason first, so the review screen can explain why', () => {
    expect(run.status.reasons.length).toBeGreaterThan(0);
    expect(run.status.reasons[0]?.severity).toBe(Severity.FAILURE);
  });

  it('blocks a clean final PDF and offers only a draft and QA report (09 §16, 13 §11)', () => {
    const gate = documentGate(run.status, false);
    expect(gate.allowed).not.toContain('FINAL');
    expect(gate.allowed).toContain('QA_FAILED_DRAFT');
    expect(gate.allowed).toContain('QA_REPORT');
    expect(gate.blocked.find((b) => b.type === 'FINAL')?.reason).toContain('cannot be generated');
  });

  it('many matching fields do not override one critical failure (09 §3)', () => {
    // Far more fields agree with the call than contradict it. Aggregate agreement
    // is reported for orientation and has no bearing on the outcome.
    expect(run.status.counts.match).toBeGreaterThanOrEqual(10);
    expect(run.status.counts.match).toBeGreaterThan(run.status.counts.mismatch);
    expect(run.status.status).toBe(CaseStatus.FAILED);
  });

  it('separates contradicted values from merely unsupported ones (10 §9)', () => {
    // A value the call never mentioned is a different finding from one the call
    // contradicts, and the records table shows them in different columns.
    expect(run.status.counts.notFoundInSource).toBeGreaterThan(0);
    expect(run.status.counts.mismatch).toBeLessThan(run.status.counts.notFoundInSource);
  });
});

describe('golden case — coverage of the expectation table', () => {
  it('every expectation names a real canonical field', () => {
    for (const expectation of ALL_GOLDEN_EXPECTATIONS) {
      expect(
        FIELD_REGISTRY.find(expectation.fieldKey),
        `${expectation.caseId} references unknown field ${expectation.fieldKey}`,
      ).toBeDefined();
    }
  });

  it('produces a comparison for every registry field', () => {
    expect(run.comparisons).toHaveLength(FIELD_REGISTRY.fields.length);
  });
});
