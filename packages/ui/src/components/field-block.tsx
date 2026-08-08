/**
 * FieldBlock — the primary error experience.
 *
 * Spec authority: 04 §6 (anatomy), 04 §8 (inline error behavior),
 * 09 §4 (red block), 09 §5 (amber block), 09 §8 (evidence in the field),
 * 09 §9 (resolution actions), 11 §10 (component contract).
 *
 * 00 §4: "Show validation problems inside the affected field block with red or
 * amber highlighting, not only in a detached error section."
 *
 * 11 §10: "Never encode business criticality only in JSX. Emit typed actions
 * rather than mutating data internally." Every visual decision below reads from
 * the comparison result the deterministic engine produced.
 */

import { useId, type ReactNode } from 'react';
import { OUTCOME_BAND, type ComparisonOutcome } from '@us24/domain';
import { ConfidenceIndicator, OutcomeBadge, SourceChip } from './status.js';
import { Button } from './primitives.js';

/** Mirrors @us24/domain FieldComparison, narrowed to what the block renders. */
export interface FieldComparisonView {
  fieldKey: string;
  outcome: ComparisonOutcome;
  severity: 'NONE' | 'INFO' | 'REVIEW' | 'FAILURE';
  isVisible: boolean;
  isRequired: boolean;
  isCritical: boolean;
  formDisplay: string | null;
  formCanonical: unknown;
  supportedDisplay: string | null;
  supportedSourceType: string | null;
  competingCandidates: readonly {
    candidateId: string;
    rawValue: string;
    confidence: number;
    evidence: { excerpt: string; timestampStart?: number; artifactLabel: string };
  }[];
  supersededCandidates: readonly {
    candidateId: string;
    rawValue: string;
    evidence: { excerpt: string; timestampStart?: number };
  }[];
  evidence: {
    excerpt: string;
    timestampStart?: number;
    page?: number;
    artifactLabel: string;
    speakerRole?: string;
  } | null;
  confidence: number | null;
  derivation: { formula: string; ruleId: string } | null;
  message: string;
  ruleCode: string;
  actions: readonly string[];
  notes: readonly string[];
}

export interface FieldDefinitionView {
  key: string;
  label: string;
  control: string;
  dataType: string;
  options?: readonly { value: string; label: string; isUnknownFamily?: boolean }[] | null;
  helpText: string;
  requiredKind: string;
  requiredPendingClient: boolean;
  bypassAllowed: boolean;
}

export type FieldAction =
  | { type: 'APPLY_SUPPORTED_VALUE'; fieldKey: string; value: string }
  | { type: 'EDIT'; fieldKey: string; value: string | null }
  | { type: 'REVIEW_CONFLICT'; fieldKey: string }
  | { type: 'BYPASS_WITH_REASON'; fieldKey: string }
  | { type: 'VIEW_EVIDENCE'; fieldKey: string }
  | { type: 'USE_CARRIER_MASTER'; fieldKey: string }
  | { type: 'REVERT'; fieldKey: string };

const BAND_MODIFIER: Record<string, string> = {
  SUCCESS: 'field-block--success',
  DANGER: 'field-block--danger',
  REVIEW: 'field-block--review',
  INFO: 'field-block--info',
  MUTED: 'field-block--muted',
  NEUTRAL: '',
};

function formatTimestamp(seconds?: number): string | null {
  if (seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 09 §8 — an evidence excerpt shown inside the block, read-only. */
export function EvidenceExcerpt({
  excerpt,
  timestampStart,
  page,
  artifactLabel,
  speakerRole,
}: {
  excerpt: string;
  timestampStart?: number;
  page?: number;
  artifactLabel: string;
  speakerRole?: string;
}): React.JSX.Element {
  const time = formatTimestamp(timestampStart);
  // 09 §8: "Show source filename in a safe truncated form."
  const safeLabel = artifactLabel.length > 44 ? `${artifactLabel.slice(0, 41)}…` : artifactLabel;

  return (
    <figure className="evidence">
      {/*
        11 §11 / 11 §18: source text is rendered as TEXT, never as HTML.
        React escapes by default and no dangerouslySetInnerHTML appears anywhere
        in this package, so transcript content cannot execute.
      */}
      <blockquote className="evidence__text">“{excerpt}”</blockquote>
      <figcaption className="evidence__meta">
        {speakerRole && <span>{humanSpeaker(speakerRole)}</span>}
        {time && <span className="tnum">at {time}</span>}
        {page !== undefined && <span>page {page}</span>}
        <span title={artifactLabel}>{safeLabel}</span>
      </figcaption>
    </figure>
  );
}

function humanSpeaker(role: string): string {
  switch (role) {
    case 'PAYER_REPRESENTATIVE':
      return 'Representative';
    case 'PAYER_SUPERVISOR':
      return 'Supervisor';
    case 'CALLER':
      return 'Caller';
    case 'IVR':
      return 'Automated phone system';
    default:
      return 'Unidentified speaker';
  }
}

export interface FieldBlockProps {
  definition: FieldDefinitionView;
  comparison: FieldComparisonView;
  value: string | null;
  /** The immutable imported/auto-filled value — 04 §6, ADR-006. */
  originalValue: string | null;
  onAction: (action: FieldAction) => void;
  /** 11 §10: "Support read-only historical mode." */
  readOnly?: boolean;
}

export function FieldBlock({
  definition,
  comparison,
  value,
  originalValue,
  onAction,
  readOnly = false,
}: FieldBlockProps): React.JSX.Element {
  const controlId = `field-${definition.key.replace(/\./g, '-')}`;
  const messageId = `${controlId}-message`;
  const helpId = `${controlId}-help`;
  const band = OUTCOME_BAND[comparison.outcome];
  const isProblem = comparison.severity === 'FAILURE' || comparison.severity === 'REVIEW';

  // 09 §4: aria-invalid is set from the deterministic result, not from a
  // separate UI notion of "error".
  const invalid = comparison.severity === 'FAILURE';

  const describedBy = [isProblem ? messageId : null, helpId].filter(Boolean).join(' ');

  return (
    <div
      className={`field-block ${BAND_MODIFIER[band] ?? ''}`}
      data-field-key={definition.key}
      data-outcome={comparison.outcome}
      data-severity={comparison.severity}
      id={`block-${controlId}`}
    >
      <div className="field-block__header">
        <label className="field-block__label" htmlFor={controlId}>
          {definition.label}
          {comparison.isRequired && (
            <>
              <span className="field-block__req" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(required)</span>
            </>
          )}
          {/*
            17 §18: the field matrix is pending client approval, so a
            requirement is shown as provisional rather than stated as final.
          */}
          {comparison.isRequired && definition.requiredPendingClient && (
            <span className="field-block__pending"> · provisional rule</span>
          )}
        </label>
        <div className="field-block__meta">
          {comparison.outcome !== 'NOT_EVALUATED' && <OutcomeBadge outcome={comparison.outcome} />}
          <SourceChip sourceType={comparison.supportedSourceType as never} />
        </div>
      </div>

      <div className="field-block__control">
        {/* tabIndex on the read-only view so "next issue" can move focus to it. */}
        {readOnly ? (
          <div className="field-block__readonly" id={controlId} tabIndex={-1}>
            {value ?? '—'}
          </div>
        ) : (
          <FieldControl
            id={controlId}
            definition={definition}
            value={value}
            invalid={invalid}
            describedBy={describedBy}
            onChange={(next) => onAction({ type: 'EDIT', fieldKey: definition.key, value: next })}
          />
        )}
      </div>

      <p id={helpId} className="meta">
        {definition.helpText}
      </p>

      {/*
        04 §6: "The entered value remains readable and is never replaced by only
        a placeholder." ADR-006: the imported original stays visible after edits.
      */}
      {originalValue !== null && originalValue !== value && (
        <p className="field-result__note">
          Imported value: <strong className="tnum">{originalValue}</strong> — kept unchanged in
          history.
        </p>
      )}

      {/*
        09 §6: MATCH renders compactly. Only problematic states expand into the
        full inline result region (11 §10).
      */}
      {isProblem || comparison.derivation || comparison.outcome === 'MASTER_DATA_SUPPORTED' ? (
        <div className="field-result">
          <p
            id={messageId}
            className="field-result__message"
            // 04 §8: "Announce newly inserted messages to assistive technology."
            role={comparison.severity === 'FAILURE' ? 'alert' : undefined}
          >
            {comparison.message}
          </p>

          {comparison.supportedDisplay && comparison.outcome !== 'CONFLICT_IN_SOURCE' && (
            <p className="field-result__supported">
              Supported value: <span className="tnum">{comparison.supportedDisplay}</span>
            </p>
          )}

          {comparison.derivation && (
            <p className="field-result__note">Formula: {comparison.derivation.formula}</p>
          )}

          {/* 09 §5: "Show every material candidate rather than only one." */}
          {comparison.competingCandidates.length > 1 && (
            <ul className="evidence__candidates">
              {comparison.competingCandidates.map((candidate) => (
                <li key={candidate.candidateId}>
                  <EvidenceExcerpt
                    excerpt={candidate.evidence.excerpt}
                    {...(candidate.evidence.timestampStart !== undefined
                      ? { timestampStart: candidate.evidence.timestampStart }
                      : {})}
                    artifactLabel={candidate.evidence.artifactLabel}
                  />
                </li>
              ))}
            </ul>
          )}

          {comparison.competingCandidates.length <= 1 && comparison.evidence && (
            <EvidenceExcerpt
              excerpt={comparison.evidence.excerpt}
              {...(comparison.evidence.timestampStart !== undefined
                ? { timestampStart: comparison.evidence.timestampStart }
                : {})}
              {...(comparison.evidence.page !== undefined ? { page: comparison.evidence.page } : {})}
              artifactLabel={comparison.evidence.artifactLabel}
              {...(comparison.evidence.speakerRole
                ? { speakerRole: comparison.evidence.speakerRole }
                : {})}
            />
          )}

          {/* 08 §6 / 15 §11: an earlier corrected value stays visible. */}
          {comparison.supersededCandidates.length > 0 && (
            <details>
              <summary className="meta">
                Corrected during the call ({comparison.supersededCandidates.length} earlier value
                {comparison.supersededCandidates.length === 1 ? '' : 's'})
              </summary>
              <ul className="evidence__candidates">
                {comparison.supersededCandidates.map((candidate) => (
                  <li key={candidate.candidateId}>
                    <EvidenceExcerpt
                      excerpt={candidate.evidence.excerpt}
                      {...(candidate.evidence.timestampStart !== undefined
                        ? { timestampStart: candidate.evidence.timestampStart }
                        : {})}
                      artifactLabel="earlier in the call"
                    />
                  </li>
                ))}
              </ul>
            </details>
          )}

          {comparison.notes.map((note) => (
            <p key={note} className="field-result__note">
              {note}
            </p>
          ))}

          <div className="field-block__meta">
            <ConfidenceIndicator confidence={comparison.confidence} />
            <span className="meta" title="Deterministic rule that produced this result">
              {comparison.ruleCode}
            </span>
          </div>

          {!readOnly && (
            <ResolutionActions
              comparison={comparison}
              definition={definition}
              onAction={onAction}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 09 §9 resolution actions.
 *
 * The action list comes from the comparison result, so 09 §5's rule —
 * "Do not show `Apply supported value` when no single supported value exists" —
 * is enforced by the engine rather than re-derived here.
 */
export function ResolutionActions({
  comparison,
  definition,
  onAction,
}: {
  comparison: FieldComparisonView;
  definition: FieldDefinitionView;
  onAction: (action: FieldAction) => void;
}): React.JSX.Element {
  return (
    <div className="field-result__actions">
      {comparison.actions.includes('APPLY_SUPPORTED_VALUE') && comparison.supportedDisplay && (
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            onAction({
              type: 'APPLY_SUPPORTED_VALUE',
              fieldKey: definition.key,
              value: comparison.supportedDisplay ?? '',
            })
          }
        >
          Apply supported value
        </Button>
      )}
      {comparison.actions.includes('REVIEW_CONFLICT') && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAction({ type: 'REVIEW_CONFLICT', fieldKey: definition.key })}
        >
          Review conflict
        </Button>
      )}
      {comparison.actions.includes('VIEW_EVIDENCE') && (
        <Button
          variant="neutral"
          size="sm"
          onClick={() => onAction({ type: 'VIEW_EVIDENCE', fieldKey: definition.key })}
        >
          View evidence
        </Button>
      )}
      {comparison.actions.includes('USE_CARRIER_MASTER') && (
        <Button
          variant="neutral"
          size="sm"
          onClick={() => onAction({ type: 'USE_CARRIER_MASTER', fieldKey: definition.key })}
        >
          Use carrier master
        </Button>
      )}
      {comparison.actions.includes('BYPASS_WITH_REASON') && definition.bypassAllowed && (
        <Button
          variant="neutral"
          size="sm"
          onClick={() => onAction({ type: 'BYPASS_WITH_REASON', fieldKey: definition.key })}
        >
          Bypass with reason
        </Button>
      )}
      {comparison.actions.includes('REVERT') && (
        <Button
          variant="quiet"
          size="sm"
          onClick={() => onAction({ type: 'REVERT', fieldKey: definition.key })}
        >
          Revert
        </Button>
      )}
    </div>
  );
}

/**
 * Control slots — 11 §10: "Allow slots for money, date, select, text, textarea,
 * and structured range controls."
 *
 * 06 §18: select controls carry no pre-selected substantive value. The empty
 * option reads "Not recorded", never a business answer.
 */
function FieldControl({
  id,
  definition,
  value,
  invalid,
  describedBy,
  onChange,
}: {
  id: string;
  definition: FieldDefinitionView;
  value: string | null;
  invalid: boolean;
  describedBy: string;
  onChange: (next: string | null) => void;
}): ReactNode {
  const shared = {
    id,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy || undefined,
    value: value ?? '',
    onChange: (e: { target: { value: string } }) =>
      onChange(e.target.value === '' ? null : e.target.value),
  };

  switch (definition.control) {
    case 'select':
      return (
        <select {...shared}>
          {/* 06 §18: an explicit unselected state, never blank-as-No. */}
          <option value="">Not recorded</option>
          {(definition.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'textarea':
    case 'address':
      return <textarea {...shared} rows={3} />;
    case 'date':
      return <input {...shared} type="text" inputMode="numeric" placeholder="MM/DD/YYYY" className="tnum" />;
    case 'dateTime':
      return <input {...shared} type="text" placeholder="ISO timestamp" className="tnum" />;
    case 'money':
      return <input {...shared} type="text" inputMode="decimal" placeholder="$0.00" className="tnum" />;
    case 'percent':
      return <input {...shared} type="text" inputMode="decimal" placeholder="0%" className="tnum" />;
    case 'number':
      return <input {...shared} type="text" inputMode="numeric" className="tnum" />;
    case 'phone':
      return <input {...shared} type="tel" className="tnum" />;
    case 'readOnly':
      return (
        <div className="field-block__readonly" id={id} tabIndex={-1}>
          {value ?? '—'}
        </div>
      );
    default:
      // 04 §14 / 08 §12: identifiers keep leading zeros, so they are text inputs
      // with tabular numerals — never number inputs, which would strip them.
      return <input {...shared} type="text" className={definition.dataType === 'identifier' ? 'tnum' : undefined} />;
  }
}

/** Section heading with the counts 05 §8 requires. */
export function FormSection({
  title,
  counts,
  children,
}: {
  title: string;
  counts: { completed: number; total: number; failed: number; review: number };
  children: ReactNode;
}): React.JSX.Element {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="stack stack--3">
      <header className="row row--between">
        <h2 id={headingId} style={{ fontSize: 'var(--text-section-title)', margin: 0 }}>
          {title}
        </h2>
        <span className="meta tnum">
          {counts.completed}/{counts.total} completed
          {counts.failed > 0 && ` · ${counts.failed} failed`}
          {counts.review > 0 && ` · ${counts.review} need review`}
        </span>
      </header>
      {children}
    </section>
  );
}
