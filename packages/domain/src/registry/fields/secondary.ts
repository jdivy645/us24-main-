/**
 * Coordination and secondary-coverage fields — 06_VOB_FORM_FIELD_ENGINE.md §14
 * (10 fields).
 *
 * §14 states the prohibition twice over:
 *   "coordination.secondaryStatus uses YES, NO, UNKNOWN, PAYER_UNABLE_TO_VERIFY,
 *    NOT_ASKED, and NOT_APPLICABLE."
 *   "Do not map `payer cannot see secondary` to No."
 *
 * This is CASE-005 and it is the single most common way an audit could produce a
 * materially wrong PASSED: a payer's lack of visibility is not proof that no
 * secondary policy exists (02 §12).
 */

import { VobSection, VobSubgroup } from '../../types/field-keys.js';
import type { FieldOption } from '../../types/field-definition.js';
import { rule } from '../../types/rule-expression.js';
import {
  CALL_VERIFIABLE_SOURCES,
  IDENTITY_SOURCES,
  defineField,
  type FieldStructure,
} from '../define.js';

/**
 * The full secondary-status domain from 06 §14. Note that PAYER_UNABLE_TO_VERIFY
 * and NOT_ASKED are first-class answers, not shades of No.
 */
const SECONDARY_STATUS_OPTIONS: readonly FieldOption[] = [
  { value: 'YES', label: 'Yes — secondary coverage exists' },
  { value: 'NO', label: 'No — representative confirmed none' },
  { value: 'UNKNOWN', label: 'Unknown', isUnknownFamily: true },
  {
    value: 'PAYER_UNABLE_TO_VERIFY',
    label: 'Payer unable to verify',
    isUnknownFamily: true,
  },
  { value: 'NOT_ASKED', label: 'Not asked during the call', isUnknownFamily: true },
  { value: 'NOT_APPLICABLE', label: 'Not applicable', isUnknownFamily: true },
];

/**
 * 06 §14: "Secondary detail fields become required only when secondaryStatus is
 * YES under the approved matrix." Visibility follows the same trigger.
 */
const SECONDARY_DETAILS_VISIBLE = rule.eq('coordination.secondaryStatus', 'YES');

export const SECONDARY_FIELDS: readonly FieldStructure[] = [
  defineField({
    key: 'coordination.primaryPayerName',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.COORDINATION,
    label: 'Primary payer',
    dataType: 'text',
    control: 'text',
    normalization: 'STRING',
    comparison: 'ALIAS',
    allowedSources: CALL_VERIFIABLE_SOURCES,
    temporalClass: 'dynamic',
    exportColumn: 'Primary payer',
    helpText:
      'Which payer is primary for coordination of benefits. Recorded explicitly because the payer being called is not automatically the primary payer.',
    examples: ['Cigna ASH'],
    privacy: 'PHI_INDIRECT',
    traceIds: ['MTG-010', 'TPL-029'],
  }),
  defineField({
    key: 'coordination.secondaryStatus',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.COORDINATION,
    label: 'Secondary coverage',
    documentLabel: 'Secondary',
    dataType: 'categorical',
    control: 'select',
    options: SECONDARY_STATUS_OPTIONS,
    normalization: 'ANSWER',
    comparison: 'ALIAS',
    allowedSources: CALL_VERIFIABLE_SOURCES,
    temporalClass: 'dynamic',
    exportColumn: 'Secondary coverage',
    helpText:
      'Whether the member has secondary coverage. If the representative says they cannot see secondary coverage, record Payer unable to verify — never No. A lack of visibility does not prove a secondary policy is absent, so the two answers carry different consequences.',
    examples: ['Payer unable to verify'],
    privacy: 'PHI_BENEFIT',
    traceIds: ['MTG-010', 'CASE-005', 'TPL-029'],
  }),
  defineField({
    key: 'secondary.insuranceName',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary insurance name',
    dataType: 'text',
    control: 'text',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'STRING',
    comparison: 'ALIAS',
    allowedSources: IDENTITY_SOURCES,
    temporalClass: 'stable',
    exportColumn: 'Secondary insurance',
    helpText: 'Secondary payer name. Shown once secondary coverage is confirmed to exist.',
    privacy: 'PHI_INDIRECT',
    traceIds: ['TPL-030'],
  }),
  defineField({
    key: 'secondary.planName',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary plan name',
    dataType: 'text',
    control: 'text',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'STRING',
    comparison: 'ALIAS',
    allowedSources: IDENTITY_SOURCES,
    temporalClass: 'stable',
    exportColumn: 'Secondary plan',
    helpText: 'Secondary product or plan name.',
    privacy: 'PHI_INDIRECT',
    traceIds: ['TPL-030'],
  }),
  defineField({
    key: 'secondary.policyId',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary policy ID',
    dataType: 'identifier',
    control: 'text',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'IDENTIFIER',
    comparison: 'IDENTIFIER_STRICT',
    allowedSources: IDENTITY_SOURCES,
    temporalClass: 'stable',
    exportColumn: 'Secondary policy ID',
    helpText: 'Secondary member identifier, with leading zeros preserved.',
    privacy: 'PHI_INDIRECT',
    traceIds: ['TPL-030'],
  }),
  defineField({
    key: 'secondary.effectiveDate',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary effective date',
    dataType: 'date',
    control: 'date',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'DATE',
    comparison: 'DATE_EXACT',
    allowedSources: CALL_VERIFIABLE_SOURCES,
    temporalClass: 'dynamic',
    exportColumn: 'Secondary effective date',
    helpText: 'Date secondary coverage began.',
    privacy: 'PHI_BENEFIT',
    traceIds: ['TPL-030'],
  }),
  defineField({
    key: 'secondary.deductible',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary deductible',
    dataType: 'money',
    control: 'money',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'MONEY',
    comparison: 'MONEY_EXACT',
    allowedSources: CALL_VERIFIABLE_SOURCES,
    temporalClass: 'dynamic',
    exportColumn: 'Secondary deductible',
    helpText: 'Deductible under the secondary policy.',
    privacy: 'PHI_BENEFIT',
    traceIds: ['TPL-030'],
  }),
  defineField({
    key: 'secondary.visitLimit',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary visit limit',
    dataType: 'integer',
    control: 'number',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'INTEGER',
    comparison: 'NUMERIC_TOLERANCE',
    comparisonTolerance: 0,
    allowedSources: CALL_VERIFIABLE_SOURCES,
    temporalClass: 'dynamic',
    exportColumn: 'Secondary visit limit',
    helpText: 'Visit allowance under the secondary policy.',
    privacy: 'PHI_BENEFIT',
    traceIds: ['TPL-030'],
  }),
  defineField({
    key: 'secondary.visitsUsed',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary visits used',
    dataType: 'integer',
    control: 'number',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'INTEGER',
    comparison: 'NUMERIC_TOLERANCE',
    comparisonTolerance: 0,
    allowedSources: CALL_VERIFIABLE_SOURCES,
    temporalClass: 'dynamic',
    exportColumn: 'Secondary visits used',
    helpText: 'Visits already used under the secondary policy.',
    privacy: 'PHI_BENEFIT',
    traceIds: ['TPL-030'],
  }),
  defineField({
    key: 'secondary.source',
    section: VobSection.SECONDARY,
    subgroup: VobSubgroup.SECONDARY_DETAIL,
    label: 'Secondary information source',
    dataType: 'text',
    control: 'text',
    visibleRule: SECONDARY_DETAILS_VISIBLE,
    normalization: 'STRING',
    comparison: 'NARRATIVE_REVIEW',
    allowedSources: IDENTITY_SOURCES,
    temporalClass: 'dynamic',
    exportColumn: 'Secondary source',
    helpText:
      'Where the secondary details came from — the member, another payer, or a source system. Recorded because the payer being called often cannot see the secondary policy at all.',
    privacy: 'PHI_BENEFIT',
    traceIds: ['CASE-005', 'TPL-030'],
  }),
];
