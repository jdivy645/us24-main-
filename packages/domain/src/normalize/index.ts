/**
 * Normalization dispatch.
 *
 * One entry point that reads the strategy off the field definition (06 §20:
 * "The comparison engine loads normalization and comparison strategies from the
 * registry"), so no call site ever picks a normalizer by hand.
 */

import type { FieldDefinition } from '../types/field-definition.js';
import { normalizeAnswer, normalizeCategorical } from './categorical.js';
import { normalizeDate, normalizeDateTime } from './date.js';
import { normalizeIdentifier, normalizeInteger, normalizePhone } from './identifier.js';
import { normalizeMoney } from './money.js';
import { normalizePercent } from './percent.js';
import { normalizeAddress, normalizeFreeText, normalizeString } from './text.js';
import type { NormalizationResult } from './types.js';

export function normalizeFieldValue(
  definition: FieldDefinition,
  raw: unknown,
): NormalizationResult {
  switch (definition.normalization) {
    case 'STRING':
      return normalizeString(raw);
    case 'FREE_TEXT':
      return normalizeFreeText(raw);
    case 'ADDRESS':
      return normalizeAddress(raw);
    case 'IDENTIFIER':
      return normalizeIdentifier(raw);
    case 'PHONE':
      return normalizePhone(raw);
    case 'DATE':
      return normalizeDate(raw);
    case 'DATE_TIME':
      return normalizeDateTime(raw);
    case 'MONEY':
      return normalizeMoney(raw);
    case 'PERCENT':
      return normalizePercent(raw);
    case 'INTEGER':
      return normalizeInteger(raw);
    case 'ANSWER':
      return normalizeAnswer(raw);
    case 'CATEGORICAL': {
      const allowed = definition.options?.map((o) => o.value) ?? [];
      const labels = new Map(definition.options?.map((o) => [o.value, o.label]) ?? []);
      return normalizeCategorical(raw, allowed, labels);
    }
  }
}

export * from './types.js';
export * from './number-words.js';
export { normalizeMoney, formatCents, checkMoneyConsistency } from './money.js';
export { normalizeDate, normalizeDateTime, isOpenEndedDateTerm } from './date.js';
export {
  normalizeIdentifier,
  normalizeInteger,
  normalizePhone,
  suffixRelationship,
} from './identifier.js';
export {
  normalizePercent,
  complementPercent,
  inferCoverageFromCostSharing,
} from './percent.js';
export { normalizeString, normalizeFreeText, normalizeAddress } from './text.js';
export {
  normalizeAnswer,
  normalizeCategorical,
  isVerifiedNegative,
  isUnknownFamily,
} from './categorical.js';
