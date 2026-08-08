/**
 * Status presentation — 04 §7 (status visual language), 09 §2 (field states),
 * 09 §6 (neutral/green/blue/derived).
 *
 * 04 §2: "Never use color alone to communicate a result." Every component here
 * renders an icon glyph AND a text label; colour is the third signal, not the
 * only one.
 */

import {
  ANSWER_LABEL,
  OUTCOME_BAND,
  OUTCOME_LABEL,
  SOURCE_TYPE_LABEL,
  confidenceBand,
  type CaseStatus,
  type ComparisonOutcome,
  type ConfidenceBand,
  type SourceType,
} from '@us24/domain';

const BAND_CLASS: Record<string, string> = {
  SUCCESS: 'badge--success',
  DANGER: 'badge--danger',
  REVIEW: 'badge--review',
  INFO: 'badge--info',
  MUTED: 'badge--neutral',
  NEUTRAL: 'badge--neutral',
};

const BAND_ICON: Record<string, string> = {
  SUCCESS: '✓',
  DANGER: '✕',
  REVIEW: '!',
  INFO: 'i',
  MUTED: '–',
  NEUTRAL: '·',
};

/** The three business outcomes — 04 §7, 09 §17. */
export function CaseStatusBadge({
  status,
  incomplete,
}: {
  status: CaseStatus | null;
  incomplete?: boolean;
}): React.JSX.Element {
  if (status === null) {
    return (
      <span className="badge badge--neutral">
        <span className="badge__icon" aria-hidden="true">
          ·
        </span>
        Draft
      </span>
    );
  }
  const map: Record<CaseStatus, { cls: string; icon: string; label: string }> = {
    PASSED: { cls: 'badge--success', icon: '✓', label: 'Passed' },
    FAILED: { cls: 'badge--danger', icon: '✕', label: 'Failed' },
    NEEDS_REVIEW: { cls: 'badge--review', icon: '!', label: 'Needs review' },
  };
  const entry = map[status];
  return (
    <span className={`badge ${entry.cls}`}>
      <span className="badge__icon" aria-hidden="true">
        {entry.icon}
      </span>
      {entry.label}
      {incomplete ? ' — not yet verified' : ''}
    </span>
  );
}

/** Workflow states are visually distinct from audit outcomes — 09 §1. */
export function WorkflowBadge({ state }: { state: string }): React.JSX.Element {
  const label = state
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
  const cls =
    state === 'PROCESSING'
      ? 'badge--processing'
      : state === 'PROCESSING_FAILED'
        ? 'badge--danger'
        : 'badge--neutral';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge__icon" aria-hidden="true">
        {state === 'PROCESSING' ? '◐' : state === 'PROCESSING_FAILED' ? '✕' : '·'}
      </span>
      {label}
    </span>
  );
}

/** Field-level outcome — 09 §2. */
export function OutcomeBadge({ outcome }: { outcome: ComparisonOutcome }): React.JSX.Element {
  const band = OUTCOME_BAND[outcome];
  return (
    <span className={`badge ${BAND_CLASS[band] ?? 'badge--neutral'}`}>
      <span className="badge__icon" aria-hidden="true">
        {BAND_ICON[band] ?? '·'}
      </span>
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}

/**
 * Provenance chip — 04 §14: "Use `Representative confirmed`, `Caller stated`,
 * `Carrier master`, or `Derived calculation` for provenance." The internal enum
 * never reaches the user (06 §5).
 */
export function SourceChip({ sourceType }: { sourceType: SourceType | null }): React.JSX.Element | null {
  if (!sourceType) return null;
  const modifier =
    sourceType === 'CARRIER_MASTER'
      ? ' chip--master'
      : sourceType === 'DERIVED_CALCULATION'
        ? ' chip--derived'
        : ' chip--transcript';
  return (
    <span className={`chip${modifier}`}>
      <span aria-hidden="true">◆</span>
      {SOURCE_TYPE_LABEL[sourceType]}
    </span>
  );
}

/**
 * 08 §19: "Display simple High, Medium, or Low wording with details on demand."
 * Shown only where it helps explain a review (09 §8).
 */
export function ConfidenceIndicator({
  confidence,
  rationale,
}: {
  confidence: number | null;
  rationale?: string | null;
}): React.JSX.Element | null {
  if (confidence === null) return null;
  const band: ConfidenceBand = confidenceBand(confidence);
  const label = band === 'HIGH' ? 'High' : band === 'MEDIUM' ? 'Medium' : 'Low';
  return (
    <span className="chip" title={rationale ?? undefined}>
      <span aria-hidden="true">◔</span>
      {label} confidence
    </span>
  );
}

/** Answer values rendered with their approved wording — 04 §14. */
export function AnswerLabel({ value }: { value: string | null }): React.JSX.Element {
  if (value === null || value === '') return <span className="muted">Not recorded</span>;
  const label = (ANSWER_LABEL as Record<string, string>)[value];
  return <span>{label ?? value}</span>;
}

// ------------------------------------------------------- Stage progress

export interface StageView {
  stage: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'WARNING' | 'FAILED' | 'SKIPPED';
  label: string;
  detail?: string | null;
}

const STAGE_ICON: Record<StageView['status'], string> = {
  PENDING: '○',
  ACTIVE: '◐',
  COMPLETE: '✓',
  WARNING: '!',
  FAILED: '✕',
  SKIPPED: '–',
};

/**
 * The seven-stage timeline — 03 §6, 05 §5.
 *
 * 05 §5: "Do not show a fake fixed countdown." No estimate is rendered; only
 * elapsed facts and per-stage state.
 */
export function StageProgress({ stages }: { stages: readonly StageView[] }): React.JSX.Element {
  return (
    <ol className="stages">
      {stages.map((stage) => (
        <li key={stage.stage} className={`stage stage--${stage.status}`}>
          <span aria-hidden="true">{STAGE_ICON[stage.status]}</span>
          <span>
            {stage.label}
            <span className="sr-only">: {stage.status.toLowerCase()}</span>
          </span>
          {stage.detail && <span className="muted">— {stage.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
