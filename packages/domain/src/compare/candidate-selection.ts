/**
 * Candidate selection — 08 §4 (speaker authority), §5 (question and answer
 * handling), §6 (correction chains), §7 (conflict logic) and §8 (unknown,
 * unavailable and negative logic).
 *
 * This module decides which extracted candidate, if any, is the SUPPORTED value.
 * It never decides a field state or a case status.
 *
 * Three behaviours are load-bearing and each maps to a golden case:
 *  - §5 "Do not extract $500 from 'The deductible is $500, correct?' unless the
 *    representative confirms it." — a caller's leading question is not evidence.
 *  - §6 "Do not simply choose the chronologically last number without semantic
 *    correction evidence." — CASE-004, the 0-used → 19-remaining chain.
 *  - §7 "Different values from the same representative without correction language
 *    create conflict." — CASE-002, 20% vs 30% coinsurance.
 */

import { SpeakerRole, SpeechAct } from '../types/enums.js';
import type { CandidateScope, ExtractedCandidate } from '../types/value-envelope.js';

/**
 * Authority ranking — 08 §4. Higher wins.
 *
 * IVR outranks the caller for payer identity and routing but is deliberately
 * weak: §4 says IVR content "is weaker for member-specific benefits", which the
 * scope check below enforces separately.
 */
const AUTHORITY_RANK: Record<SpeakerRole, number> = {
  PAYER_SUPERVISOR: 4,
  PAYER_REPRESENTATIVE: 3,
  IVR: 2,
  CALLER: 1,
  UNKNOWN: 0,
};

export const SelectionKind = {
  /** Exactly one authoritative candidate survived. */
  SUPPORTED: 'SUPPORTED',
  /** Two or more irreconcilable candidates of equal authority — 08 §7. */
  CONFLICT: 'CONFLICT',
  /** A candidate exists but confidence is below the threshold — 08 §19. */
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  /** The payer explicitly could not see the information — 08 §8. */
  PAYER_UNAVAILABLE: 'PAYER_UNAVAILABLE',
  /** Candidates exist but all describe a different scope — 08 §10. */
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  /** Nothing in the permitted sources supports a value. */
  NONE: 'NONE',
} as const;
export type SelectionKind = (typeof SelectionKind)[keyof typeof SelectionKind];

export interface CandidateSelection {
  readonly kind: SelectionKind;
  readonly supported: ExtractedCandidate | null;
  /** Every material candidate, shown when the field needs review — 09 §5. */
  readonly competing: readonly ExtractedCandidate[];
  /** Earlier values in a correction chain, kept visible as history — 08 §6. */
  readonly superseded: readonly ExtractedCandidate[];
  readonly ruleCode: string;
  readonly reason: string;
}

export interface SelectionOptions {
  /** The scope this field is asking about. Candidates in other scopes are excluded. */
  readonly targetScope?: CandidateScope;
  /** Below this, a candidate is LOW_CONFIDENCE rather than SUPPORTED — 08 §19. */
  readonly confidenceThreshold?: number;
  /**
   * Whether an unknown-speaker statement may support this field. 08 §4:
   * "Unknown-speaker statements cannot automatically pass critical fields."
   */
  readonly isCritical?: boolean;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

/** Two scope facets conflict only when both are stated and differ. */
function facetConflicts(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return a !== b;
}

function scopeMatches(candidate: CandidateScope | undefined, target?: CandidateScope): boolean {
  if (!target || !candidate) return true;
  return !(
    facetConflicts(candidate.service, target.service) ||
    facetConflicts(candidate.network, target.network) ||
    facetConflicts(candidate.benefitScope, target.benefitScope) ||
    facetConflicts(candidate.claimContext, target.claimContext) ||
    facetConflicts(candidate.authorizationContext, target.authorizationContext)
  );
}

/**
 * Resolve correction chains — 08 §6.
 *
 * A candidate that another candidate supersedes is removed from consideration but
 * retained as history. Crucially, supersession requires an explicit link produced
 * by the extractor from correction language; chronological order alone never
 * demotes a candidate.
 */
function applyCorrections(candidates: readonly ExtractedCandidate[]): {
  live: ExtractedCandidate[];
  superseded: ExtractedCandidate[];
} {
  const supersededIds = new Set<string>();
  for (const c of candidates) {
    if (c.supersedesCandidateId) supersededIds.add(c.supersedesCandidateId);
  }
  return {
    live: candidates.filter((c) => !supersededIds.has(c.candidateId)),
    superseded: candidates.filter((c) => supersededIds.has(c.candidateId)),
  };
}

/**
 * Merge candidates that assert the same value — 08 §7: "Equivalent repeated
 * values are supporting evidence, not conflict."
 */
function distinctValues(candidates: readonly ExtractedCandidate[]): Map<string, ExtractedCandidate[]> {
  const groups = new Map<string, ExtractedCandidate[]>();
  for (const c of candidates) {
    const key = c.parsedValue === null ? `__raw__${c.rawValue.toLowerCase()}` : String(c.parsedValue);
    const bucket = groups.get(key);
    if (bucket) bucket.push(c);
    else groups.set(key, [c]);
  }
  return groups;
}

export function selectCandidate(
  allCandidates: readonly ExtractedCandidate[],
  options: SelectionOptions = {},
): CandidateSelection {
  const threshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  if (allCandidates.length === 0) {
    return {
      kind: SelectionKind.NONE,
      supported: null,
      competing: [],
      superseded: [],
      ruleCode: 'SEL-000-NO-CANDIDATES',
      reason: 'No permitted source supports a value for this field.',
    };
  }

  // -- 08 §5: a value spoken inside a question is not an answer.
  const notQuestions = allCandidates.filter((c) => c.speechAct !== SpeechAct.QUESTION);
  const droppedQuestions = allCandidates.length - notQuestions.length;

  // -- 08 §4: a caller's restatement becomes evidence only when the representative
  // confirms it. An unconfirmed caller restatement is context, not confirmation.
  const admissible = notQuestions.filter((c) => {
    if (c.speakerRole !== SpeakerRole.CALLER) return true;
    return c.speechAct === SpeechAct.ANSWER;
  });

  // -- 08 §10: candidates describing a different scope are not comparable.
  const inScope = admissible.filter((c) => scopeMatches(c.scope, options.targetScope));
  if (inScope.length === 0 && admissible.length > 0) {
    return {
      kind: SelectionKind.OUT_OF_SCOPE,
      supported: null,
      competing: admissible,
      superseded: [],
      ruleCode: 'SEL-010-OUT-OF-SCOPE',
      reason:
        'The call discusses this value for a different service, network or benefit scope, so it cannot be applied here.',
    };
  }

  // -- 08 §8: "We cannot see that" maps to PAYER_UNABLE_TO_VERIFY.
  //
  // An explicit statement of non-visibility is separated from value-bearing
  // candidates rather than competing with them. If the representative later
  // supplies an actual value, that value wins; if they never do, the
  // non-visibility is the finding — and it is emphatically not No (CASE-005).
  const isPayerSide = (c: ExtractedCandidate): boolean =>
    c.speakerRole === SpeakerRole.PAYER_REPRESENTATIVE ||
    c.speakerRole === SpeakerRole.PAYER_SUPERVISOR;

  const unavailable = inScope.filter((c) => c.speechAct === SpeechAct.UNAVAILABLE && isPayerSide(c));
  const valueBearing = inScope.filter((c) => c.speechAct !== SpeechAct.UNAVAILABLE);

  if (valueBearing.length === 0 && unavailable.length > 0) {
    return {
      kind: SelectionKind.PAYER_UNAVAILABLE,
      supported: unavailable[0] as ExtractedCandidate,
      competing: unavailable,
      superseded: [],
      ruleCode: 'SEL-020-PAYER-UNAVAILABLE',
      reason: 'The representative said this information was not visible on their side.',
    };
  }

  if (valueBearing.length === 0) {
    return {
      kind: SelectionKind.NONE,
      supported: null,
      competing: [],
      superseded: [],
      ruleCode: droppedQuestions > 0 ? 'SEL-001-ONLY-QUESTIONS' : 'SEL-000-NO-CANDIDATES',
      reason:
        droppedQuestions > 0
          ? 'The value appears only inside a question, which the representative did not confirm.'
          : 'No permitted source supports a value for this field.',
    };
  }

  // -- 08 §6: apply correction chains before choosing.
  const { live, superseded } = applyCorrections(valueBearing);

  // A correction that withdraws an earlier answer without stating a replacement
  // leaves the transcript supporting no direct value for this field. That is not
  // low confidence — the representative was clear, they simply restated the fact
  // a different way. Returning NONE lets an approved derivation supply the value
  // from its operands (06 §11), which is exactly the CASE-004 path: "no visits
  // used" is corrected to "nineteen remaining out of twenty", and one used
  // follows from the allowance rather than from a second spoken count.
  if (superseded.length > 0 && live.every((c) => c.parsedValue === null)) {
    return {
      kind: SelectionKind.NONE,
      supported: null,
      competing: live,
      superseded,
      ruleCode: 'SEL-002-RETRACTED',
      reason:
        'The representative corrected an earlier answer without restating this value directly. The original answer is kept in history.',
    };
  }

  // -- 08 §4: rank by speaker authority; a supervisor correction outranks a rep.
  const maxAuthority = Math.max(...live.map((c) => AUTHORITY_RANK[c.speakerRole]));
  const topAuthority = live.filter((c) => AUTHORITY_RANK[c.speakerRole] === maxAuthority);

  // 08 §4: "IVR content may support call routing, payer identity, or disclosure
  // text but is weaker for member-specific benefits", and 02 §10 adds that it
  // "should not automatically override a live representative".
  //
  // A recorded menu is therefore never sufficient on its own for ANY field. It
  // routes to review rather than passing. This is deliberately stricter than
  // splitting fields into member-specific and not: CASE-011 requires the payer
  // phone — pure routing information — to need another approved source or review,
  // so a per-field carve-out would produce the wrong answer there.
  if (topAuthority.every((c) => c.speakerRole === SpeakerRole.IVR)) {
    return {
      kind: SelectionKind.LOW_CONFIDENCE,
      supported: null,
      competing: topAuthority,
      superseded,
      ruleCode: 'SEL-030-IVR-ONLY',
      reason:
        'Only the automated phone system stated this. Recorded messages are not a reliable source for member-specific benefits.',
    };
  }

  // 08 §4: unknown-speaker statements cannot automatically pass critical fields.
  if (options.isCritical && topAuthority.every((c) => c.speakerRole === SpeakerRole.UNKNOWN)) {
    return {
      kind: SelectionKind.LOW_CONFIDENCE,
      supported: null,
      competing: topAuthority,
      superseded,
      ruleCode: 'SEL-031-UNKNOWN-SPEAKER-CRITICAL',
      reason:
        'The speaker could not be identified, so this cannot automatically satisfy a critical field.',
    };
  }

  // -- 08 §7: distinct values at equal authority with no correction = conflict.
  const groups = distinctValues(topAuthority);
  if (groups.size > 1) {
    return {
      kind: SelectionKind.CONFLICT,
      supported: null,
      competing: topAuthority,
      superseded,
      ruleCode: 'SEL-040-CONFLICT',
      reason:
        'The call contains more than one value for this field and no statement corrects the others.',
    };
  }

  // Exactly one value. Prefer the highest-confidence utterance as the exemplar;
  // the rest are supporting evidence for the same value (08 §7).
  const winners = [...(groups.values().next().value ?? [])].sort(
    (a, b) => b.confidence - a.confidence,
  );
  const supported = winners[0];
  if (!supported) {
    return {
      kind: SelectionKind.NONE,
      supported: null,
      competing: [],
      superseded,
      ruleCode: 'SEL-000-NO-CANDIDATES',
      reason: 'No permitted source supports a value for this field.',
    };
  }

  // A candidate the extractor could not parse is not a usable supported value.
  if (supported.parsedValue === null) {
    return {
      kind: SelectionKind.LOW_CONFIDENCE,
      supported,
      competing: topAuthority,
      superseded,
      ruleCode: 'SEL-050-UNPARSED',
      reason: 'The value was heard but could not be read clearly enough to use.',
    };
  }

  // -- 08 §19: low confidence is an input to review, never overridden by a
  // high-confidence claim elsewhere.
  if (supported.confidence < threshold) {
    return {
      kind: SelectionKind.LOW_CONFIDENCE,
      supported,
      competing: topAuthority,
      superseded,
      ruleCode: 'SEL-051-BELOW-THRESHOLD',
      reason: 'The audio or transcript is unclear, so this value needs review before it is used.',
    };
  }

  return {
    kind: SelectionKind.SUPPORTED,
    supported,
    competing: winners.length > 1 ? winners : [],
    superseded,
    ruleCode:
      superseded.length > 0 ? 'SEL-060-SUPPORTED-AFTER-CORRECTION' : 'SEL-061-SUPPORTED',
    reason:
      superseded.length > 0
        ? 'The representative corrected an earlier statement; the corrected value is used and the original is kept in history.'
        : 'A single authoritative source supports this value.',
  };
}
