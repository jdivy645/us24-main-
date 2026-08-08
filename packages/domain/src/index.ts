/**
 * @us24/domain — the deterministic core.
 *
 * Canonical field registry, rule engine, normalization, comparison and status
 * precedence. Pure TypeScript with zero I/O: no database, no network, no clock,
 * no randomness. Every function is a pure transform of its inputs, which is what
 * makes a verification result reproducible from stored data alone (15 §1:
 * "Keep source, parser, model, rule, and template versions reproducible").
 *
 * ADR-005 is enforced structurally — nothing in this package can call a model.
 */

// Types
export * from './types/enums.js';
export * from './types/field-keys.js';
export * from './types/field-definition.js';
export * from './types/rule-expression.js';
export * from './types/value-envelope.js';

// Registry
export * from './registry/index.js';

// Rules
export * from './rules/matrix.v0-pending.js';
export * from './rules/bypass-policy.js';

// Normalization
export * from './normalize/index.js';

// Terminology
export * from './terminology/dictionary.v1.js';

// Comparison
export * from './compare/index.js';

// Status
export * from './status/precedence.js';
