/**
 * Registry integrity and the no-default rule.
 *
 * Spec authority: 06 §2 (registry contract), §6–§14 (the 103 fields),
 * §18 (no-default rule), §20 (registry-driven outputs), and 15 §12 (form-engine
 * tests: "No substantive default selections").
 */

import { describe, expect, it } from 'vitest';
import {
  ANSWER_OPTIONS,
  EXPECTED_FIELD_COUNT,
  FIELD_REGISTRY,
  RULE_MATRIX_V0_PENDING,
  SECTION_ORDER,
  buildRegistry,
  initialValueFor,
  matrixEntryFor,
  RequirednessKind,
  rule,
  type FieldDefinition,
} from '../src/index.js';

describe('registry integrity (06 §2, §6–§14)', () => {
  it('declares exactly the 103 canonical fields the spec enumerates', () => {
    expect(FIELD_REGISTRY.fields).toHaveLength(EXPECTED_FIELD_COUNT);
  });

  it('has no duplicate keys', () => {
    const keys = FIELD_REGISTRY.fields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('assigns every field to a known section', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(SECTION_ORDER, `${field.key} has unknown section ${field.section}`).toContain(
        field.section,
      );
    }
  });

  it('gives every field a stable machine key independent of its wording (06 §2)', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(field.key).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
      expect(field.label.length).toBeGreaterThan(0);
    }
  });

  it('gives every field help text and a privacy classification (06 §2)', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(field.helpText.length, `${field.key} has no help text`).toBeGreaterThan(20);
      expect(field.privacy, `${field.key} has no privacy class`).toBeDefined();
    }
  });

  it('traces every field to at least one requirement identifier (02 §11)', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(field.traceIds.length, `${field.key} has no trace ids`).toBeGreaterThan(0);
    }
  });

  it('gives every field an export column and a template binding (06 §2, §20)', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(field.exportColumn.length).toBeGreaterThan(0);
      expect(field.templateBindings.length).toBeGreaterThan(0);
    }
  });

  it('splits network status into group and individual provider (06 §7, CUR-013)', () => {
    expect(FIELD_REGISTRY.find('primary.networkGroupStatus')).toBeDefined();
    expect(FIELD_REGISTRY.find('primary.networkIndividualProviderStatus')).toBeDefined();
  });

  it('holds the authorization threshold as a structured number (06 §12, CUR-014)', () => {
    const threshold = FIELD_REGISTRY.get('authorization.requiredAfterVisitNumber');
    expect(threshold.dataType).toBe('integer');
    expect(threshold.control).toBe('number');
  });

  it('holds a structured remaining-visits field (02 §3 CUR-015)', () => {
    const remaining = FIELD_REGISTRY.get('visits.remainingCount');
    expect(remaining.dataType).toBe('integer');
  });
});

describe('the no-default rule (06 §18, 15 §12)', () => {
  it('never supplies a substantive initial value for any field', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(initialValueFor(field), `${field.key} has a default value`).toBeNull();
    }
  });

  it('offers an Unknown-family option on every categorical control', () => {
    const categorical = FIELD_REGISTRY.fields.filter((f) => f.options && f.options.length > 0);
    expect(categorical.length).toBeGreaterThan(10);
    for (const field of categorical) {
      const hasUnknown = field.options?.some((o) => o.isUnknownFamily);
      expect(hasUnknown, `${field.key} has no Unknown-family option`).toBe(true);
    }
  });

  it('does not preselect In Network on either network field (06 §18)', () => {
    for (const key of ['primary.networkGroupStatus', 'primary.networkIndividualProviderStatus'] as const) {
      const field = FIELD_REGISTRY.get(key);
      expect(initialValueFor(field)).toBeNull();
      expect(field.options?.[0]?.value).not.toBe(undefined);
    }
  });

  it('does not preselect PT on service type (06 §18)', () => {
    expect(initialValueFor(FIELD_REGISTRY.get('primary.serviceType'))).toBeNull();
  });

  it('offers the full six-value answer domain wherever yes/no is asked (06 §14, §18)', () => {
    const values = ANSWER_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      'YES',
      'NO',
      'UNKNOWN',
      'NOT_ASKED',
      'PAYER_UNABLE_TO_VERIFY',
      'NOT_APPLICABLE',
    ]);
  });

  it('gives secondary status its own six-value domain including payer-unable (06 §14)', () => {
    const secondary = FIELD_REGISTRY.get('coordination.secondaryStatus');
    const values = secondary.options?.map((o) => o.value) ?? [];
    expect(values).toContain('PAYER_UNABLE_TO_VERIFY');
    expect(values).toContain('NOT_ASKED');
  });

  it('attaches no derivation rule to the coverage percentage (ADR-012, 06 §8)', () => {
    expect(FIELD_REGISTRY.get('financial.coveragePercent').derivation).toBeUndefined();
    expect(FIELD_REGISTRY.get('financial.payerCoveragePercent').derivation).toBeUndefined();
  });
});

describe('the rule matrix stays configuration, not code (06 §16, 17 §18)', () => {
  it('marks every requiredness entry as pending client approval', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(
        field.requiredRule.pendingClient,
        `${field.key} requiredness is not marked pending`,
      ).toBe(true);
    }
  });

  it('marks every criticality and bypass entry as pending client approval', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(field.criticalRule.pendingClient).toBe(true);
      expect(field.bypassPolicy.pendingClient).toBe(true);
    }
  });

  it('uses no ALWAYS_REQUIRED or FAIL_IF_MISSING rule, which 06 §16 gates behind approval', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(field.requiredRule.kind).not.toBe(RequirednessKind.ALWAYS_REQUIRED);
      expect(field.requiredRule.kind).not.toBe(RequirednessKind.FAIL_IF_MISSING);
    }
  });

  it('gives every requiredness rule an identifier and version (06 §16)', () => {
    for (const field of FIELD_REGISTRY.fields) {
      expect(field.requiredRule.id.length).toBeGreaterThan(0);
      expect(field.criticalRule.id.length).toBeGreaterThan(0);
    }
    expect(RULE_MATRIX_V0_PENDING.version).toMatch(/^v0-pending/);
  });

  it('can be swapped for a client-approved matrix without touching field structure', () => {
    const approved = buildRegistry({
      ...RULE_MATRIX_V0_PENDING,
      version: 'v1-client-approved-test',
      pendingClient: false,
      defaults: {
        ...RULE_MATRIX_V0_PENDING.defaults,
        required: {
          id: 'REQ-ALL-V1',
          kind: RequirednessKind.ALWAYS_REQUIRED,
          when: rule.always(),
          pendingClient: false,
        },
      },
      entries: {},
    });

    expect(approved.matrixVersion).toBe('v1-client-approved-test');
    expect(approved.matrixPendingClient).toBe(false);
    expect(approved.fields).toHaveLength(EXPECTED_FIELD_COUNT);
    // Same fields, different rules — proving the two are genuinely separable.
    expect(approved.get('patient.lastName').label).toBe(
      FIELD_REGISTRY.get('patient.lastName').label,
    );
    expect(approved.get('patient.lastName').requiredRule.kind).toBe(
      RequirednessKind.ALWAYS_REQUIRED,
    );
  });

  it('resolves matrix defaults for a field with no explicit entry', () => {
    const entry = matrixEntryFor(RULE_MATRIX_V0_PENDING, 'patient.middleName');
    expect(entry.required.kind).toBe(RequirednessKind.OPTIONAL);
  });
});

describe('bypass policy shape (09 §10)', () => {
  it('never offers a generic Ignore reason', () => {
    for (const field of FIELD_REGISTRY.fields) {
      for (const reason of field.bypassPolicy.allowedReasons) {
        expect(reason.toLowerCase()).not.toContain('ignore');
      }
    }
  });

  it('forbids bypassing system-generated values', () => {
    const systemFields: readonly (keyof never | string)[] = [
      'verification.caseId',
      'verification.baseRecordId',
      'verification.versionNumber',
    ];
    for (const key of systemFields) {
      expect(FIELD_REGISTRY.get(key as never).bypassPolicy.allowed).toBe(false);
    }
  });

  it('requires a note for Other and Client-approved exception (09 §12)', () => {
    const field: FieldDefinition = FIELD_REGISTRY.get('financial.copayAmount');
    expect(field.bypassPolicy.reasonsRequiringNote).toContain('OTHER_WITH_REQUIRED_NOTE');
    expect(field.bypassPolicy.reasonsRequiringNote).toContain('CLIENT_APPROVED_EXCEPTION');
  });
});

describe('registry-driven grouping for the form renderer (05 §8, 11 §9)', () => {
  it('returns fields grouped by subgroup within each section', () => {
    const groups = FIELD_REGISTRY.sectionGroups('INSURANCE');
    expect(groups.length).toBeGreaterThan(1);
    for (const group of groups) {
      expect(group.fields.length).toBeGreaterThan(0);
    }
  });

  it('places every field in exactly one section, and every section has fields', () => {
    let total = 0;
    for (const section of SECTION_ORDER) {
      const fields = FIELD_REGISTRY.bySection(section);
      expect(fields.length, `section ${section} is empty`).toBeGreaterThan(0);
      total += fields.length;
    }
    expect(total).toBe(EXPECTED_FIELD_COUNT);
  });
});
