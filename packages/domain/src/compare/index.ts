/**
 * Comparison-run orchestration.
 *
 * Runs the deterministic pipeline across every registry field and hands the
 * results to the status engine. 08 §18 closes with "Persist the comparison run
 * before showing it; Never mutate the form as part of comparison" — this module
 * returns a new result object and touches no input.
 */

import { DICTIONARY_VERSION } from '../terminology/dictionary.v1.js';
import type { Registry } from '../registry/index.js';
import type { VobFieldKey } from '../types/field-keys.js';
import type { RuleContext, RuleLiteral } from '../types/rule-expression.js';
import type {
  BypassRecord,
  CandidateScope,
  CanonicalValue,
  ExtractedCandidate,
  ManualResolution,
} from '../types/value-envelope.js';
import { normalizeFieldValue } from '../normalize/index.js';
import { calculateCaseStatus, type CaseStatusResult } from '../status/precedence.js';
import { compareField, type FieldComparison, type MasterValueOffer } from './pipeline.js';

export interface ComparisonRunInput {
  readonly registry: Registry;
  /** Raw values from the form revision under audit, keyed by canonical field. */
  readonly formValues: Readonly<Record<string, string | null>>;
  /** Extracted candidates grouped by canonical field. */
  readonly candidatesByField: Readonly<Record<string, readonly ExtractedCandidate[]>>;
  readonly bypasses?: Readonly<Record<string, BypassRecord>>;
  readonly manualResolutions?: Readonly<Record<string, ManualResolution>>;
  readonly masterOffers?: Readonly<Record<string, MasterValueOffer>>;
  readonly context: RuleContext;
  readonly targetScope?: CandidateScope;
  readonly revisionId: string;
  readonly evaluatedAt: string;
  readonly hasConfiguredExceptionAuthority?: boolean;
}

export interface ComparisonRun {
  readonly comparisons: readonly FieldComparison[];
  readonly byField: ReadonlyMap<VobFieldKey, FieldComparison>;
  readonly status: CaseStatusResult;
  readonly ruleSetVersion: string;
  readonly dictionaryVersion: string;
}

/**
 * Build the canonical-value lookup that rule expressions read.
 *
 * Rules see NORMALIZED values, so a rule written as `copayApplies === 'YES'`
 * matches a form that recorded "yes" or "Y". Normalization happens once here
 * rather than inside every rule evaluation.
 */
function buildLookup(
  registry: Registry,
  formValues: Readonly<Record<string, string | null>>,
): (field: VobFieldKey) => RuleLiteral | undefined {
  const cache = new Map<VobFieldKey, CanonicalValue>();
  return (field) => {
    if (cache.has(field)) return cache.get(field) as RuleLiteral;
    const definition = registry.find(field);
    if (!definition) return undefined;
    const result = normalizeFieldValue(definition, formValues[field] ?? null);
    cache.set(field, result.canonical);
    return result.canonical as RuleLiteral;
  };
}

export function runComparison(input: ComparisonRunInput): ComparisonRun {
  const { registry } = input;
  const lookup = buildLookup(registry, input.formValues);

  const ruleContext = {
    context: input.context,
    lookup,
    ruleSetVersion: registry.matrixVersion,
    dictionaryVersion: DICTIONARY_VERSION,
    hasConfiguredExceptionAuthority: input.hasConfiguredExceptionAuthority ?? false,
  };

  const comparisons: FieldComparison[] = [];
  for (const definition of registry.fields) {
    // Derived fields need their operands' canonical values, taken from the same
    // revision so the calculation is reproducible from stored data alone.
    let derivationOperands: Record<string, CanonicalValue> | undefined;
    if (definition.derivation) {
      derivationOperands = {};
      for (const operand of definition.derivation.operands) {
        derivationOperands[operand] = lookup(operand) ?? null;
      }
    }

    comparisons.push(
      compareField(
        {
          definition,
          formValueRaw: input.formValues[definition.key] ?? null,
          candidates: input.candidatesByField[definition.key] ?? [],
          bypass: input.bypasses?.[definition.key] ?? null,
          manualResolution: input.manualResolutions?.[definition.key] ?? null,
          masterOffer: input.masterOffers?.[definition.key] ?? null,
          ...(derivationOperands ? { derivationOperands } : {}),
          ...(input.targetScope ? { targetScope: input.targetScope } : {}),
        },
        ruleContext,
      ),
    );
  }

  const status = calculateCaseStatus({
    comparisons,
    ruleSetVersion: registry.matrixVersion,
    dictionaryVersion: DICTIONARY_VERSION,
    revisionId: input.revisionId,
    evaluatedAt: input.evaluatedAt,
  });

  return {
    comparisons,
    byField: new Map(comparisons.map((c) => [c.fieldKey, c])),
    status,
    ruleSetVersion: registry.matrixVersion,
    dictionaryVersion: DICTIONARY_VERSION,
  };
}

/**
 * Auto-fill mode — 03 §4. Produces form values from supported candidates without
 * marking them user-confirmed. The caller writes these into a NEW revision; this
 * function returns data and mutates nothing (ADR-006).
 */
export function buildAutoFillValues(
  registry: Registry,
  candidatesByField: Readonly<Record<string, readonly ExtractedCandidate[]>>,
  context: RuleContext,
  targetScope?: CandidateScope,
): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  const emptyLookup = (): RuleLiteral | undefined => undefined;

  for (const definition of registry.fields) {
    const candidates = candidatesByField[definition.key] ?? [];
    if (candidates.length === 0) {
      // 06 §18: an absent value stays absent. No substantive default is written.
      values[definition.key] = null;
      continue;
    }
    const comparison = compareField(
      {
        definition,
        formValueRaw: null,
        candidates,
        ...(targetScope ? { targetScope } : {}),
      },
      {
        context,
        lookup: emptyLookup,
        ruleSetVersion: registry.matrixVersion,
        dictionaryVersion: DICTIONARY_VERSION,
      },
    );
    // Only an unambiguous supported value is written. Conflicts and low-confidence
    // readings are left blank so the operator sees the evidence and decides.
    values[definition.key] =
      comparison.outcome === 'MISSING_IN_FORM' && comparison.supportedRaw !== null
        ? comparison.supportedRaw
        : null;
  }
  return values;
}

export * from './pipeline.js';
export * from './candidate-selection.js';
export * from './messages.js';
