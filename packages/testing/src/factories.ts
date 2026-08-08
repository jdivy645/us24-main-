/**
 * Registry-driven test factories — 06 §20: "Test factories generate valid,
 * missing, conflicting, and boundary values from registry metadata."
 *
 * Reading the registry rather than a hand-written list means a new canonical
 * field is automatically covered by every factory-driven test.
 */

import {
  FIELD_REGISTRY,
  type ExtractedCandidate,
  type FieldDefinition,
  type RuleContext,
  type VobFieldKey,
} from '@us24/domain';

export const DEFAULT_RULE_CONTEXT: RuleContext = {
  mode: 'AUDIT',
  serviceType: 'PT',
  isRepeatVerification: false,
  hasTranscriptSource: true,
  hasCompletedFormSource: true,
};

export const AUTO_FILL_CONTEXT: RuleContext = {
  ...DEFAULT_RULE_CONTEXT,
  mode: 'AUTO_FILL',
  hasCompletedFormSource: false,
};

/** A plausible valid raw value for a field, derived from its declared type. */
export function validValueFor(definition: FieldDefinition): string {
  if (definition.options && definition.options.length > 0) {
    // Prefer a substantive option so tests exercise real answers, not Unknown.
    const substantive = definition.options.find((o) => !o.isUnknownFamily);
    return (substantive ?? definition.options[0])?.value ?? 'UNKNOWN';
  }
  switch (definition.dataType) {
    case 'money':
      return '$1,234.56';
    case 'percent':
      return '25%';
    case 'integer':
      return '7';
    case 'date':
      return '03/15/2026';
    case 'dateTime':
      return '2026-03-15T14:30:00.000Z';
    case 'identifier':
      return '00A12345';
    case 'phone':
      return '800-555-0142';
    case 'address':
      return 'PO Box 1234, Austin, TX 78701';
    case 'longText':
      return 'Coverage confirmed for outpatient therapy subject to deductible.';
    default:
      return 'Sample value';
  }
}

let seq = 0;

export interface CandidateOverrides {
  readonly rawValue?: string;
  readonly parsedValue?: string | number | boolean | null;
  readonly speakerRole?: ExtractedCandidate['speakerRole'];
  readonly speechAct?: ExtractedCandidate['speechAct'];
  readonly confidence?: number;
  readonly supersedesCandidateId?: string;
  readonly scope?: ExtractedCandidate['scope'];
  readonly candidateId?: string;
}

/** Build a single candidate for a field with sensible, overridable defaults. */
export function makeCandidate(
  fieldKey: VobFieldKey,
  overrides: CandidateOverrides = {},
): ExtractedCandidate {
  const definition = FIELD_REGISTRY.get(fieldKey);
  const raw = overrides.rawValue ?? validValueFor(definition);
  const id = overrides.candidateId ?? `factory-cand-${++seq}`;

  return {
    candidateId: id,
    fieldKey,
    rawValue: raw,
    parsedValue: overrides.parsedValue !== undefined ? overrides.parsedValue : raw,
    sourceType: 'TRANSCRIPT_REP_CONFIRMED',
    speakerRole: overrides.speakerRole ?? 'PAYER_REPRESENTATIVE',
    speechAct: overrides.speechAct ?? 'ANSWER',
    scope: overrides.scope ?? {},
    evidence: {
      evidenceId: `factory-ev-${seq}`,
      artifactId: 'factory-artifact',
      artifactLabel: 'factory-transcript.txt',
      segmentId: `factory-seg-${seq}`,
      timestampStart: 100 + seq,
      timestampEnd: 106 + seq,
      excerpt: `Representative stated ${raw}.`,
      speakerRole: overrides.speakerRole ?? 'PAYER_REPRESENTATIVE',
      rawSpeakerLabel: 'REP',
    },
    confidence: overrides.confidence ?? 0.9,
    ...(overrides.supersedesCandidateId
      ? { supersedesCandidateId: overrides.supersedesCandidateId }
      : {}),
  };
}

/** Two irreconcilable candidates for one field — the CASE-002 shape. */
export function makeConflictingCandidates(
  fieldKey: VobFieldKey,
  a: string,
  b: string,
  parsedA?: string | number,
  parsedB?: string | number,
): readonly ExtractedCandidate[] {
  return [
    makeCandidate(fieldKey, {
      rawValue: a,
      ...(parsedA !== undefined ? { parsedValue: parsedA } : {}),
    }),
    makeCandidate(fieldKey, {
      rawValue: b,
      ...(parsedB !== undefined ? { parsedValue: parsedB } : {}),
      confidence: 0.85,
    }),
  ];
}

/** An answer that is later corrected — the CASE-004 shape. */
export function makeCorrectionChain(
  fieldKey: VobFieldKey,
  original: string,
  corrected: string,
  parsedOriginal?: string | number,
  parsedCorrected?: string | number | null,
): readonly ExtractedCandidate[] {
  const first = makeCandidate(fieldKey, {
    rawValue: original,
    ...(parsedOriginal !== undefined ? { parsedValue: parsedOriginal } : {}),
    candidateId: `factory-original-${++seq}`,
  });
  const second = makeCandidate(fieldKey, {
    rawValue: corrected,
    ...(parsedCorrected !== undefined ? { parsedValue: parsedCorrected } : {}),
    speechAct: 'CORRECTION',
    supersedesCandidateId: first.candidateId,
  });
  return [first, second];
}

/** An empty form revision — every field blank, no substantive defaults (06 §18). */
export function makeBlankFormValues(): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  for (const field of FIELD_REGISTRY.fields) values[field.key] = null;
  return values;
}

/** A fully populated, internally consistent form revision. */
export function makeCompleteFormValues(
  overrides: Readonly<Record<string, string | null>> = {},
): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  for (const field of FIELD_REGISTRY.fields) {
    values[field.key] = field.control === 'readOnly' ? null : validValueFor(field);
  }
  return { ...values, ...overrides };
}
