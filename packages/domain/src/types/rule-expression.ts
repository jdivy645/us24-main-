/**
 * Serializable rule expressions.
 *
 * Spec authority: 06_VOB_FORM_FIELD_ENGINE.md §16 — "The final matrix is data, not
 * hard-coded JSX" — and §17 (conditional rules). Because the client's final
 * required/optional/conditional/critical matrix is still PENDING_CLIENT (17 §18),
 * requiredness and criticality must be expressible as configuration that can be
 * replaced without a code change.
 *
 * Expressions are plain JSON. They can be stored in the database, versioned,
 * shipped to the browser in a rule bundle (11 §9) and diffed in review.
 */

import type { VobFieldKey } from './field-keys.js';

/** Scalar operands permitted inside an expression. */
export type RuleLiteral = string | number | boolean | null;

export type RuleExpression =
  /** Constant outcome. */
  | { readonly op: 'always' }
  | { readonly op: 'never' }
  /** Field equals / not-equals a literal. */
  | { readonly op: 'eq'; readonly field: VobFieldKey; readonly value: RuleLiteral }
  | { readonly op: 'neq'; readonly field: VobFieldKey; readonly value: RuleLiteral }
  /** Field value is one of a set. */
  | { readonly op: 'in'; readonly field: VobFieldKey; readonly values: readonly RuleLiteral[] }
  /** Field has any non-blank canonical value. */
  | { readonly op: 'present'; readonly field: VobFieldKey }
  | { readonly op: 'blank'; readonly field: VobFieldKey }
  /** Numeric comparison against a literal. */
  | { readonly op: 'gt'; readonly field: VobFieldKey; readonly value: number }
  | { readonly op: 'gte'; readonly field: VobFieldKey; readonly value: number }
  | { readonly op: 'lt'; readonly field: VobFieldKey; readonly value: number }
  | { readonly op: 'lte'; readonly field: VobFieldKey; readonly value: number }
  /** Case-context predicate, e.g. mode === 'AUDIT'. */
  | { readonly op: 'context'; readonly key: RuleContextKey; readonly value: RuleLiteral }
  /** Boolean composition. */
  | { readonly op: 'and'; readonly all: readonly RuleExpression[] }
  | { readonly op: 'or'; readonly any: readonly RuleExpression[] }
  | { readonly op: 'not'; readonly expr: RuleExpression };

/** Case-level context available to `context` predicates. */
export const RuleContextKey = {
  MODE: 'mode',
  SERVICE_TYPE: 'serviceType',
  IS_REPEAT_VERIFICATION: 'isRepeatVerification',
  HAS_TRANSCRIPT_SOURCE: 'hasTranscriptSource',
  HAS_COMPLETED_FORM_SOURCE: 'hasCompletedFormSource',
} as const;
export type RuleContextKey = (typeof RuleContextKey)[keyof typeof RuleContextKey];

export interface RuleContext {
  readonly mode: 'AUTO_FILL' | 'AUDIT';
  readonly serviceType: string | null;
  readonly isRepeatVerification: boolean;
  readonly hasTranscriptSource: boolean;
  readonly hasCompletedFormSource: boolean;
}

/** Values the evaluator reads. Canonical (normalized) values, not raw display text. */
export type RuleValueLookup = (field: VobFieldKey) => RuleLiteral | undefined;

/** Convenience constructors — keep call sites readable in the matrix file. */
export const rule = {
  always: (): RuleExpression => ({ op: 'always' }),
  never: (): RuleExpression => ({ op: 'never' }),
  eq: (field: VobFieldKey, value: RuleLiteral): RuleExpression => ({ op: 'eq', field, value }),
  neq: (field: VobFieldKey, value: RuleLiteral): RuleExpression => ({ op: 'neq', field, value }),
  oneOf: (field: VobFieldKey, values: readonly RuleLiteral[]): RuleExpression => ({
    op: 'in',
    field,
    values,
  }),
  present: (field: VobFieldKey): RuleExpression => ({ op: 'present', field }),
  blank: (field: VobFieldKey): RuleExpression => ({ op: 'blank', field }),
  gt: (field: VobFieldKey, value: number): RuleExpression => ({ op: 'gt', field, value }),
  gte: (field: VobFieldKey, value: number): RuleExpression => ({ op: 'gte', field, value }),
  lt: (field: VobFieldKey, value: number): RuleExpression => ({ op: 'lt', field, value }),
  lte: (field: VobFieldKey, value: number): RuleExpression => ({ op: 'lte', field, value }),
  context: (key: RuleContextKey, value: RuleLiteral): RuleExpression => ({
    op: 'context',
    key,
    value,
  }),
  and: (...all: readonly RuleExpression[]): RuleExpression => ({ op: 'and', all }),
  or: (...any: readonly RuleExpression[]): RuleExpression => ({ op: 'or', any }),
  not: (expr: RuleExpression): RuleExpression => ({ op: 'not', expr }),
} as const;

function isBlank(value: RuleLiteral | undefined): boolean {
  return value === undefined || value === null || value === '';
}

function asNumber(value: RuleLiteral | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Evaluate a rule expression.
 *
 * Deliberately total: an unknown or unreadable operand yields `false` rather than
 * throwing, because a rule that cannot be evaluated must never silently assert a
 * requirement is satisfied. Callers that need "unevaluable" distinguished from
 * "false" should check operand presence explicitly first.
 */
export function evaluateRule(
  expr: RuleExpression,
  lookup: RuleValueLookup,
  context: RuleContext,
): boolean {
  switch (expr.op) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'eq':
      return lookup(expr.field) === expr.value;
    case 'neq':
      return lookup(expr.field) !== expr.value;
    case 'in':
      return expr.values.includes(lookup(expr.field) as RuleLiteral);
    case 'present':
      return !isBlank(lookup(expr.field));
    case 'blank':
      return isBlank(lookup(expr.field));
    case 'gt': {
      const n = asNumber(lookup(expr.field));
      return n !== null && n > expr.value;
    }
    case 'gte': {
      const n = asNumber(lookup(expr.field));
      return n !== null && n >= expr.value;
    }
    case 'lt': {
      const n = asNumber(lookup(expr.field));
      return n !== null && n < expr.value;
    }
    case 'lte': {
      const n = asNumber(lookup(expr.field));
      return n !== null && n <= expr.value;
    }
    case 'context':
      return (context as unknown as Record<string, RuleLiteral>)[expr.key] === expr.value;
    case 'and':
      return expr.all.every((e) => evaluateRule(e, lookup, context));
    case 'or':
      return expr.any.some((e) => evaluateRule(e, lookup, context));
    case 'not':
      return !evaluateRule(expr.expr, lookup, context);
  }
}

/** Every field key referenced by an expression — used to build dependency graphs. */
export function referencedFields(expr: RuleExpression): VobFieldKey[] {
  switch (expr.op) {
    case 'always':
    case 'never':
    case 'context':
      return [];
    case 'and':
      return expr.all.flatMap(referencedFields);
    case 'or':
      return expr.any.flatMap(referencedFields);
    case 'not':
      return referencedFields(expr.expr);
    default:
      return [expr.field];
  }
}

/**
 * Render an expression as an explanation fragment for inline messages —
 * 09 §7 conditional template: "{dependentField} is required because
 * {triggerField} is {triggerValue}."
 */
export function describeRule(expr: RuleExpression, label: (f: VobFieldKey) => string): string {
  switch (expr.op) {
    case 'always':
      return 'always';
    case 'never':
      return 'never';
    case 'eq':
      return `${label(expr.field)} is ${String(expr.value)}`;
    case 'neq':
      return `${label(expr.field)} is not ${String(expr.value)}`;
    case 'in':
      return `${label(expr.field)} is one of ${expr.values.map(String).join(', ')}`;
    case 'present':
      return `${label(expr.field)} has a value`;
    case 'blank':
      return `${label(expr.field)} is blank`;
    case 'gt':
      return `${label(expr.field)} is more than ${expr.value}`;
    case 'gte':
      return `${label(expr.field)} is at least ${expr.value}`;
    case 'lt':
      return `${label(expr.field)} is less than ${expr.value}`;
    case 'lte':
      return `${label(expr.field)} is at most ${expr.value}`;
    case 'context':
      return `the case ${expr.key} is ${String(expr.value)}`;
    case 'and':
      return expr.all.map((e) => describeRule(e, label)).join(' and ');
    case 'or':
      return expr.any.map((e) => describeRule(e, label)).join(' or ');
    case 'not':
      return `not (${describeRule(expr.expr, label)})`;
  }
}
