/**
 * Workspace panes — 05 §7 (source), §8 (canonical form), §9 (evidence and preview).
 */

import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, EvidenceExcerpt, FieldBlock, FormSection } from '@us24/ui';
import type { FieldAction } from '@us24/ui';
import type {
  CaseSnapshotDto,
  FieldComparisonDto,
  RegistryDto,
  RegistryFieldDto,
  TranscriptSegmentDto,
} from '../lib/api.js';

// -------------------------------------------------------------- Source pane

/**
 * 05 §7 / 11 §11: transcript search, speaker filter, relevance filter and
 * timestamp navigation. Segment text is rendered as text, never HTML.
 */
export function TranscriptPane({
  segments,
  highlightSegmentId,
  onSelectSegment,
}: {
  segments: readonly TranscriptSegmentDto[];
  highlightSegmentId: string | null;
  onSelectSegment: (segment: TranscriptSegmentDto) => void;
}): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [speaker, setSpeaker] = useState<string>('ALL');
  const [showIrrelevant, setShowIrrelevant] = useState(true);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return segments.filter((segment) => {
      if (speaker !== 'ALL' && segment.speaker_role !== speaker) return false;
      if (!showIrrelevant && segment.relevant === 0) return false;
      if (needle && !segment.text.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [segments, search, speaker, showIrrelevant]);

  return (
    <section className="pane" aria-label="Call sources">
      <header className="pane__header">
        <h2 className="pane__title">Transcript</h2>
        <span className="meta tnum">
          {filtered.length}/{segments.length}
        </span>
      </header>

      <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-default)' }}>
        <label className="sr-only" htmlFor="transcript-search">
          Search the transcript
        </label>
        <input
          id="transcript-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcript"
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-control)',
            font: 'inherit',
            fontSize: 'var(--text-meta)',
          }}
        />
        <div className="row" style={{ marginTop: 'var(--space-2)' }}>
          <label className="sr-only" htmlFor="speaker-filter">
            Filter by speaker
          </label>
          <select
            id="speaker-filter"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            style={{
              padding: '2px var(--space-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-control)',
              fontSize: 'var(--text-meta)',
            }}
          >
            <option value="ALL">All speakers</option>
            <option value="PAYER_REPRESENTATIVE">Representative</option>
            <option value="PAYER_SUPERVISOR">Supervisor</option>
            <option value="CALLER">Caller</option>
            <option value="IVR">Automated phone system</option>
            <option value="UNKNOWN">Unidentified</option>
          </select>
          <label className="meta row" style={{ gap: 'var(--space-1)' }}>
            <input
              type="checkbox"
              checked={showIrrelevant}
              onChange={(e) => setShowIrrelevant(e.target.checked)}
            />
            Show non-target talk
          </label>
        </div>
      </div>

      <div className="pane__body">
        {segments.length === 0 ? (
          <EmptyState
            title="No transcript segments"
            body="Once a call source is parsed, its segments appear here with speaker roles and timestamps, and every field's evidence links back to this pane."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No segments match these filters"
            body="Nothing in the transcript matches your search and filters. Clearing them restores the full call."
            action={
              <Button
                variant="neutral"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSpeaker('ALL');
                  setShowIrrelevant(true);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filtered.map((segment) => (
              <li key={segment.id}>
                <button
                  type="button"
                  className={`segment${highlightSegmentId === segment.id ? ' segment--highlight' : ''}${
                    segment.relevant === 0 ? ' segment--irrelevant' : ''
                  }`}
                  onClick={() => onSelectSegment(segment)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    font: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <span className="segment__meta">
                    <span>{humanSpeaker(segment.speaker_role)}</span>
                    {segment.timestamp_start !== null && (
                      <span className="tnum">{formatTime(segment.timestamp_start)}</span>
                    )}
                    {segment.relevant === 0 && <span>non-target</span>}
                  </span>
                  <p className="segment__text">{highlight(segment.text, search)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function highlight(text: string, needle: string): React.ReactNode {
  const term = needle.trim();
  if (term === '') return text;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}

function humanSpeaker(role: string): string {
  const map: Record<string, string> = {
    PAYER_REPRESENTATIVE: 'Representative',
    PAYER_SUPERVISOR: 'Supervisor',
    CALLER: 'Caller',
    IVR: 'Automated phone system',
    UNKNOWN: 'Unidentified speaker',
  };
  return map[role] ?? role;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- Form pane

/**
 * 11 §9: one registry-driven renderer. Sections and controls come from the
 * server rule bundle; nothing here hard-codes a field.
 */
export function FormPane({
  registry,
  snapshot,
  onAction,
  filterUnresolvedOnly = false,
  readOnly = false,
}: {
  registry: RegistryDto;
  snapshot: CaseSnapshotDto;
  onAction: (action: FieldAction) => void;
  filterUnresolvedOnly?: boolean;
  readOnly?: boolean;
}): React.JSX.Element {
  const byField = useMemo(
    () => new Map(snapshot.comparisons.map((c) => [c.fieldKey, c])),
    [snapshot.comparisons],
  );

  return (
    <section className="pane" aria-label="Canonical VOB form">
      <header className="pane__header">
        <h2 className="pane__title">
          {filterUnresolvedOnly ? 'Unresolved fields' : 'Verification of benefits'}
        </h2>
        <span className="meta">Rules {snapshot.status?.ruleSetVersion ?? registry.matrixVersion}</span>
      </header>

      <div className="pane__body">
        {/* 05 §8: a sticky section navigator. */}
        <nav className="section-nav" aria-label="Form sections">
          {registry.sections.map((section) => (
            <a key={section.key} className="tab" href={`#section-${section.key}`}>
              {section.label}
            </a>
          ))}
        </nav>

        {registry.sections.map((section) => {
          const sectionFields = section.groups.flatMap((g) => g.fields);
          const visible = sectionFields.filter((f) => {
            const c = byField.get(f.key);
            if (!c || !c.isVisible) return false;
            if (!filterUnresolvedOnly) return true;
            return c.severity === 'FAILURE' || c.severity === 'REVIEW';
          });
          if (visible.length === 0) return null;

          // 11 §9: counts come from comparison results, not DOM inspection.
          const counts = {
            total: sectionFields.length,
            completed: sectionFields.filter((f) => snapshot.currentValues[f.key] != null).length,
            failed: sectionFields.filter((f) => byField.get(f.key)?.severity === 'FAILURE').length,
            review: sectionFields.filter((f) => byField.get(f.key)?.severity === 'REVIEW').length,
          };

          return (
            <div key={section.key} id={`section-${section.key}`} style={{ marginBottom: 'var(--space-6)' }}>
              <FormSection title={section.label} counts={counts}>
                <div className="stack stack--3">
                  {section.groups.map((group) => {
                    const groupFields = group.fields.filter((f) =>
                      visible.some((v) => v.key === f.key),
                    );
                    if (groupFields.length === 0) return null;
                    return (
                      <div key={group.subgroup} className="stack stack--2">
                        <h3 className="meta" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {group.label}
                        </h3>
                        {groupFields.map((field) => (
                          <FieldBlock
                            key={field.key}
                            definition={toDefinitionView(field)}
                            comparison={toComparisonView(byField.get(field.key)!)}
                            value={snapshot.currentValues[field.key] ?? null}
                            originalValue={snapshot.originValues[field.key] ?? null}
                            onAction={onAction}
                            readOnly={readOnly}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </FormSection>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function toDefinitionView(field: RegistryFieldDto) {
  return {
    key: field.key,
    label: field.label,
    control: field.control,
    dataType: field.dataType,
    options: field.options,
    helpText: field.helpText,
    requiredKind: field.requiredKind,
    requiredPendingClient: field.requiredPendingClient,
    bypassAllowed: field.bypassAllowed,
  };
}

function toComparisonView(c: FieldComparisonDto) {
  return c as unknown as Parameters<typeof FieldBlock>[0]['comparison'];
}

// ------------------------------------------------------------ Evidence pane

export type EvidenceTab = 'EVIDENCE' | 'COMPARISON' | 'HISTORY' | 'PREVIEW';

/** 05 §9: Evidence, Comparison, History and PDF Preview tabs. */
export function EvidencePane({
  snapshot,
  selectedFieldKey,
  registry,
  tab,
  onTabChange,
  revisions,
  documents,
}: {
  snapshot: CaseSnapshotDto;
  selectedFieldKey: string | null;
  registry: RegistryDto;
  tab: EvidenceTab;
  onTabChange: (tab: EvidenceTab) => void;
  revisions: readonly Record<string, unknown>[];
  documents: readonly Record<string, unknown>[];
}): React.JSX.Element {
  const comparison = snapshot.comparisons.find((c) => c.fieldKey === selectedFieldKey) ?? null;
  const field = registry.sections
    .flatMap((s) => s.groups.flatMap((g) => g.fields))
    .find((f) => f.key === selectedFieldKey);

  return (
    <section className="pane pane--evidence" aria-label="Evidence and preview">
      <header className="pane__header">
        <div className="pane__tabs" role="tablist" aria-label="Evidence views">
          {(
            [
              ['EVIDENCE', 'Evidence'],
              ['COMPARISON', 'Comparison'],
              ['HISTORY', 'History'],
              ['PREVIEW', 'Preview'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === key}
              onClick={() => onTabChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="pane__body">
        {tab === 'EVIDENCE' && (
          <EvidenceTabPanel comparison={comparison} fieldLabel={field?.label ?? null} />
        )}
        {tab === 'COMPARISON' && (
          <ComparisonTabPanel comparison={comparison} fieldLabel={field?.label ?? null} />
        )}
        {tab === 'HISTORY' && <HistoryTabPanel revisions={revisions} />}
        {tab === 'PREVIEW' && <PreviewTabPanel snapshot={snapshot} registry={registry} documents={documents} />}
      </div>
    </section>
  );
}

function EvidenceTabPanel({
  comparison,
  fieldLabel,
}: {
  comparison: FieldComparisonDto | null;
  fieldLabel: string | null;
}): React.JSX.Element {
  if (!comparison) {
    return (
      <EmptyState
        title="Select a field"
        body="Choosing a field, or using View evidence inside a field block, shows the exact passage the value came from — with speaker, timestamp and source file."
      />
    );
  }
  return (
    <div className="stack stack--3">
      <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)' }}>{fieldLabel}</h3>
      <p className="meta">{comparison.message}</p>
      {comparison.evidence ? (
        <EvidenceExcerpt
          excerpt={comparison.evidence.excerpt}
          {...(comparison.evidence.timestampStart !== undefined
            ? { timestampStart: comparison.evidence.timestampStart }
            : {})}
          artifactLabel={comparison.evidence.artifactLabel}
          {...(comparison.evidence.speakerRole ? { speakerRole: comparison.evidence.speakerRole } : {})}
        />
      ) : (
        <p className="meta">No permitted source supports a value for this field.</p>
      )}
      {comparison.competingCandidates.length > 1 && (
        <>
          <h4 className="meta" style={{ margin: 0 }}>
            All candidates
          </h4>
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
        </>
      )}
    </div>
  );
}

/**
 * 05 §9: "Comparison shows raw form value, normalized form value, raw candidate
 * values, chosen supported value, and rule explanation." This is what makes the
 * deterministic engine legible rather than a black box.
 */
function ComparisonTabPanel({
  comparison,
  fieldLabel,
}: {
  comparison: FieldComparisonDto | null;
  fieldLabel: string | null;
}): React.JSX.Element {
  if (!comparison) {
    return (
      <EmptyState
        title="Select a field"
        body="The comparison view explains exactly how a result was reached: the raw value, what it normalized to, every candidate considered, and the rule that decided."
      />
    );
  }
  return (
    <div className="stack stack--3">
      <h3 style={{ margin: 0, fontSize: 'var(--text-card-title)' }}>{fieldLabel}</h3>
      <table className="table">
        <tbody>
          <tr>
            <th scope="row">Raw form value</th>
            <td className="tnum">{comparison.formRaw ?? '—'}</td>
          </tr>
          <tr>
            <th scope="row">Normalized form value</th>
            <td className="tnum">{String(comparison.formCanonical ?? '—')}</td>
          </tr>
          <tr>
            <th scope="row">Supported value</th>
            <td className="tnum">{comparison.supportedDisplay ?? '—'}</td>
          </tr>
          <tr>
            <th scope="row">Normalized supported value</th>
            <td className="tnum">{String(comparison.supportedCanonical ?? '—')}</td>
          </tr>
          <tr>
            <th scope="row">Outcome</th>
            <td>{comparison.outcome}</td>
          </tr>
          <tr>
            <th scope="row">Rule</th>
            <td className="tnum">{comparison.ruleCode}</td>
          </tr>
        </tbody>
      </table>

      {comparison.formSteps.length > 0 && (
        <div>
          <h4 className="meta" style={{ margin: '0 0 var(--space-1)' }}>
            How the form value was normalized
          </h4>
          <ol className="meta" style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
            {comparison.formSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {comparison.supportedSteps.length > 0 && (
        <div>
          <h4 className="meta" style={{ margin: '0 0 var(--space-1)' }}>
            How the supported value was normalized
          </h4>
          <ol className="meta" style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
            {comparison.supportedSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      <p className="meta">{comparison.message}</p>
    </div>
  );
}

function HistoryTabPanel({
  revisions,
}: {
  revisions: readonly Record<string, unknown>[];
}): React.JSX.Element {
  if (revisions.length === 0) {
    return (
      <EmptyState
        title="No revisions yet"
        body="The imported form is the first revision. Every correction creates a new one, and the original is never overwritten."
      />
    );
  }
  return (
    <ol className="stack stack--2" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {revisions.map((revision) => (
        <li key={String(revision['id'])} className="card" style={{ padding: 'var(--space-3)' }}>
          <div className="row row--between">
            <strong className="tnum">Revision {String(revision['revision_number'])}</strong>
            <span className="chip">{String(revision['created_reason']).replace(/_/g, ' ').toLowerCase()}</span>
          </div>
          <div className="meta tnum">{new Date(String(revision['created_at'])).toLocaleString()}</div>
          {revision['explanation'] ? <p className="meta">{String(revision['explanation'])}</p> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * 13 §14: the preview shows the currently selected revision with a visible
 * watermark when it is not finalized, and never implies it is saved or final.
 */
function PreviewTabPanel({
  snapshot,
  registry,
  documents,
}: {
  snapshot: CaseSnapshotDto;
  registry: RegistryDto;
  documents: readonly Record<string, unknown>[];
}): React.JSX.Element {
  const status = snapshot.status?.status ?? null;
  const watermark =
    status === 'FAILED'
      ? 'QA FAILED — DRAFT'
      : status === 'NEEDS_REVIEW'
        ? 'NEEDS REVIEW — DRAFT'
        : snapshot.freshness.isStale
          ? 'NOT VERIFIED — DRAFT'
          : null;

  const rows = registry.sections
    .flatMap((s) => s.groups.flatMap((g) => g.fields))
    .filter((f) => snapshot.currentValues[f.key] != null)
    .slice(0, 24);

  return (
    <div className="stack stack--3">
      {watermark && (
        <span className={`doc-watermark${status === 'FAILED' ? ' doc-watermark--failed' : ''}`}>
          {watermark}
        </span>
      )}
      <div className="doc-preview">
        <strong>US24 Solutions</strong>
        <div className="doc-preview__rule" />
        <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          Pre-Authorization and Benefits Determination
        </div>
        <table>
          <tbody>
            {rows.map((field) => (
              <tr key={field.key}>
                <th scope="row">{field.documentLabel ?? field.label}</th>
                <td className="tnum">{snapshot.currentValues[field.key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meta" style={{ marginTop: 'var(--space-3)' }}>
          Benefits quoted are not a guarantee of payment.
        </p>
      </div>
      <p className="meta">
        This preview is not saved and is not a finalized document. It renders the currently selected
        revision using the interim US24 layout — the client&rsquo;s official template has not been
        supplied, so the final format is still to be confirmed.
      </p>
      {documents.length > 0 && (
        <div>
          <h4 className="meta" style={{ margin: '0 0 var(--space-1)' }}>
            Generated documents
          </h4>
          <ul className="stack stack--1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {documents.map((doc) => (
              <li key={String(doc['id'])} className="row row--between">
                <span className="meta">{String(doc['document_type']).replace(/_/g, ' ')}</span>
                <a
                  className="btn btn--quiet btn--sm"
                  href={`/v1/documents/${String(doc['id'])}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Small card used by the workspace and review screens. */
export function IssueSummary({
  snapshot,
  onGoToFirstIssue,
}: {
  snapshot: CaseSnapshotDto;
  onGoToFirstIssue: () => void;
}): React.JSX.Element {
  const reasons = snapshot.status?.reasons ?? [];
  if (reasons.length === 0) {
    return (
      <Card title="Nothing unresolved">
        <p className="meta">
          Every visible field is either matched, explained by an approved source, or recorded as not
          applicable.
        </p>
      </Card>
    );
  }
  return (
    <Card
      title={`${reasons.length} item${reasons.length === 1 ? '' : 's'} to resolve`}
      hint="Resolution happens inside each field block, not here."
      actions={
        <Button variant="secondary" size="sm" onClick={onGoToFirstIssue}>
          Go to first issue
        </Button>
      }
    >
      <ol className="stack stack--1" style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
        {reasons.slice(0, 6).map((reason) => (
          <li key={reason.fieldKey} className="meta">
            <strong>{reason.severity === 'FAILURE' ? 'Failed' : 'Needs review'}:</strong>{' '}
            {reason.message}
          </li>
        ))}
      </ol>
    </Card>
  );
}
