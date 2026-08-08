/**
 * The canonical field registry.
 *
 * 06_VOB_FORM_FIELD_ENGINE.md §20 — one registry drives the React form, the
 * extraction schema, the comparison engine, the review queue, the records table,
 * Excel import/export, PDF template bindings, test factories and help text.
 * Nothing else may declare a field.
 *
 * `buildRegistry()` composes two independently versioned inputs:
 *   1. Field STRUCTURE (this package, stable)
 *   2. The requiredness/criticality/bypass MATRIX (client-supplied, pending)
 */

import type { FieldDefinition } from '../types/field-definition.js';
import type { VobFieldKey, VobSection, VobSubgroup } from '../types/field-keys.js';
import { CANONICAL_FIELD_COUNT, SECTION_ORDER } from '../types/field-keys.js';
import { RULE_MATRIX_V0_PENDING, matrixEntryFor, type RuleMatrix } from '../rules/matrix.v0-pending.js';
import type { FieldStructure } from './define.js';
import { PATIENT_FIELDS } from './fields/patient.js';
import { INSURANCE_FIELDS } from './fields/insurance.js';
import { FINANCIAL_FIELDS } from './fields/financials.js';
import { VISITS_AUTHORIZATION_FIELDS } from './fields/visits-authorization.js';
import { CLAIMS_CALL_FIELDS } from './fields/claims-call.js';
import { SECONDARY_FIELDS } from './fields/secondary.js';

/** All field structures, in spec-section order. */
export const FIELD_STRUCTURES: readonly FieldStructure[] = [
  ...PATIENT_FIELDS,
  ...INSURANCE_FIELDS,
  ...FINANCIAL_FIELDS,
  ...VISITS_AUTHORIZATION_FIELDS,
  ...CLAIMS_CALL_FIELDS,
  ...SECONDARY_FIELDS,
];

export interface Registry {
  readonly matrixVersion: string;
  readonly matrixPendingClient: boolean;
  readonly fields: readonly FieldDefinition[];
  readonly byKey: ReadonlyMap<VobFieldKey, FieldDefinition>;
  get(key: VobFieldKey): FieldDefinition;
  find(key: string): FieldDefinition | undefined;
  bySection(section: VobSection): readonly FieldDefinition[];
  /** Fields grouped by subgroup within a section, preserving declaration order. */
  sectionGroups(section: VobSection): readonly {
    subgroup: VobSubgroup;
    fields: readonly FieldDefinition[];
  }[];
  label(key: VobFieldKey): string;
}

export function buildRegistry(matrix: RuleMatrix = RULE_MATRIX_V0_PENDING): Registry {
  const fields: FieldDefinition[] = FIELD_STRUCTURES.map((structure) => {
    const entry = matrixEntryFor(matrix, structure.key);
    return {
      ...structure,
      requiredRule: entry.required,
      criticalRule: entry.critical,
      bypassPolicy: entry.bypass,
    };
  });

  const byKey = new Map<VobFieldKey, FieldDefinition>(fields.map((f) => [f.key, f]));

  // Fail loudly at construction rather than silently serving a broken registry.
  if (byKey.size !== fields.length) {
    const seen = new Set<string>();
    const duplicates = fields.map((f) => f.key).filter((k) => !seen.add(k));
    throw new Error(`Duplicate canonical field keys in registry: ${duplicates.join(', ')}`);
  }

  const sectionCache = new Map<VobSection, FieldDefinition[]>();
  for (const section of SECTION_ORDER) sectionCache.set(section, []);
  for (const field of fields) sectionCache.get(field.section)?.push(field);

  return {
    matrixVersion: matrix.version,
    matrixPendingClient: matrix.pendingClient,
    fields,
    byKey,
    get(key) {
      const found = byKey.get(key);
      if (!found) throw new Error(`Unknown canonical field key: ${key}`);
      return found;
    },
    find(key) {
      return byKey.get(key as VobFieldKey);
    },
    bySection(section) {
      return sectionCache.get(section) ?? [];
    },
    sectionGroups(section) {
      const groups: { subgroup: VobSubgroup; fields: FieldDefinition[] }[] = [];
      for (const field of sectionCache.get(section) ?? []) {
        const last = groups[groups.length - 1];
        if (last && last.subgroup === field.subgroup) last.fields.push(field);
        else groups.push({ subgroup: field.subgroup, fields: [field] });
      }
      return groups;
    },
    label(key) {
      return byKey.get(key)?.label ?? key;
    },
  };
}

/** The default registry, built with the provisional matrix. */
export const FIELD_REGISTRY: Registry = buildRegistry();

/** Asserted by the registry integrity test — 06 §6–§14 enumerate 103 fields. */
export const EXPECTED_FIELD_COUNT = CANONICAL_FIELD_COUNT;

export { defineField, INTERIM_TEMPLATE_ID } from './define.js';
export type { FieldStructure } from './define.js';
