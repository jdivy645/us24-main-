/**
 * New Verification landing — 05 §2, 03 §3.
 *
 * 05 §2: "Use realistic sample content in the prototype so the page never
 * appears empty" and "Show a disabled-looking but explanatory
 * `Import from RingCentral` option until configured, not a dead control."
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { Banner, Button, Card, CaseStatusBadge, EmptyState, WorkflowBadge } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { useAnnouncer } from '../app/announcer.js';

type Mode = 'AUTO_FILL' | 'AUDIT';

const MODES: {
  mode: Mode;
  title: string;
  requires: string;
  output: string;
  chooseWhen: string;
}[] = [
  {
    mode: 'AUTO_FILL',
    title: 'Auto-fill a blank VOB',
    requires: 'A call recording or transcript, plus the approved official template.',
    output: 'A canonical VOB filled from evidence, with every value showing where it came from.',
    chooseWhen: 'Choose this when you have just made the call and no form exists yet.',
  },
  {
    mode: 'AUDIT',
    title: 'Audit a completed VOB',
    requires: 'A call recording or transcript, plus the completed VOB as PDF or Excel.',
    output: 'A field-by-field comparison showing every mismatch, conflict and unverified value.',
    chooseWhen: 'Choose this when a VOB already exists and you need to check it against the call.',
  },
];

export function NewVerificationRoute(): React.JSX.Element {
  const [mode, setMode] = useState<Mode | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { announce } = useAnnouncer();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.cases('all'),
    queryFn: () => api.listCases(),
  });

  const create = useMutation({
    mutationFn: (selected: Mode) => api.createCase({ mode: selected }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases('all') });
      announce('New verification created. Add your call source to continue.');
      void navigate(`/verifications/${created.id}/setup`);
    },
  });

  // 05 §2: a recent-drafts rail. 03 §11: drafts and failures stay visible.
  const drafts = (data?.items ?? []).filter(
    (c) => c.case_status === null || c.workflow_state === 'PROCESSING_FAILED',
  );

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">New verification</h1>
          <p className="page__lede">
            Start by choosing what you have. The workflow is the same either way — evidence is
            extracted from the call, then deterministic rules decide each field.
          </p>
        </div>
      </header>

      <div className="grid-2">
        {MODES.map((entry) => (
          <Card key={entry.mode} selected={mode === entry.mode}>
            <button
              type="button"
              className="mode-card"
              aria-pressed={mode === entry.mode}
              onClick={() => setMode(entry.mode)}
            >
              <h2 className="mode-card__title">{entry.title}</h2>
              <dl>
                <dt>Requires</dt>
                <dd>{entry.requires}</dd>
                <dt>Produces</dt>
                <dd>{entry.output}</dd>
                <dt>When to choose it</dt>
                <dd>{entry.chooseWhen}</dd>
              </dl>
            </button>
          </Card>
        ))}
      </div>

      <div className="row">
        <Button
          variant="primary"
          disabled={mode === null || create.isPending}
          disabledReason={mode === null ? 'Choose a mode above to continue.' : null}
          onClick={() => mode && create.mutate(mode)}
        >
          {mode === 'AUDIT' ? 'Start audit' : mode === 'AUTO_FILL' ? 'Start auto-fill' : 'Start'}
        </Button>
      </div>

      {create.isError && (
        <Banner tone="danger" title="Could not create the verification.">
          {(create.error as Error).message}
        </Banner>
      )}

      <Card
        title="Supported sources"
        hint="Every format below reaches the workspace, or explains clearly why it cannot."
      >
        <div className="row">
          {['TXT', 'DOCX', 'PDF (text)', 'CSV', 'XLSX', 'Pasted text'].map((format) => (
            <span key={format} className="chip">
              {format}
            </span>
          ))}
          {/*
            05 §2: not a dead control. Audio and RingCentral are explained rather
            than silently missing — both are deferred (17 §18, 12 §13).
          */}
          <span className="chip" title="Audio transcription requires an approved provider">
            MP3 / audio — not enabled
          </span>
        </div>
        <p className="meta" style={{ marginTop: 'var(--space-3)' }}>
          Audio transcription and RingCentral import are not enabled in this build. Both need vendor
          approval and a signed agreement before any call data may be sent to a provider. Manual
          upload always remains available and is never removed.
        </p>
        <div className="row" style={{ marginTop: 'var(--space-3)' }}>
          <Button
            variant="neutral"
            disabledReason="RingCentral is not configured. Product, licences, permissions, recording retention and BAA coverage must be confirmed first."
          >
            Import from RingCentral
          </Button>
          <Link className="btn btn--quiet" to="/help">
            Upload guidance
          </Link>
        </div>
      </Card>

      <Card
        title="Resume recent work"
        hint="Drafts and interrupted processing stay visible until you deal with them."
      >
        {isLoading ? (
          <div className="skeleton skeleton--title" />
        ) : drafts.length === 0 ? (
          <EmptyState
            title="No unfinished verifications"
            body="Drafts appear here as soon as you create a verification and attach a source. Nothing is lost if you navigate away mid-way."
            action={
              <Link className="btn btn--secondary" to="/records">
                Open records
              </Link>
            }
          />
        ) : (
          <ul className="stack stack--2" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {drafts.map((draft) => (
              <li key={draft.id} className="row row--between card" style={{ padding: 'var(--space-3)' }}>
                <div>
                  <strong>{draft.patient_label ?? 'Unnamed patient'}</strong>
                  <div className="meta">
                    {draft.payer_label ?? 'Payer not set'} ·{' '}
                    {draft.mode === 'AUDIT' ? 'Audit' : 'Auto-fill'} · updated{' '}
                    <span className="tnum">{new Date(draft.updated_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="row">
                  <WorkflowBadge state={draft.workflow_state} />
                  <Link className="btn btn--neutral btn--sm" to={`/verifications/${draft.id}/setup`}>
                    Resume
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Use a previous VOB" hint="Repeat verification under an existing base record.">
        <p className="meta">
          Opening a base record and starting a new verification carries stable values forward with
          their source, and marks every changing value — deductible, out-of-pocket, visits,
          authorisation and eligibility — as needing confirmation on this call.
        </p>
        <Link className="btn btn--secondary" to="/records">
          Find an existing record
        </Link>
      </Card>
    </div>
  );
}

/** Shared status cell used by several list screens — 09 §17. */
export function CaseStatusCell({
  status,
  workflowState,
}: {
  status: 'PASSED' | 'FAILED' | 'NEEDS_REVIEW' | null;
  workflowState: string;
}): React.JSX.Element {
  // 09 §17: "Show processing failure separately from audit outcome."
  if (workflowState === 'PROCESSING_FAILED' || workflowState === 'PROCESSING') {
    return <WorkflowBadge state={workflowState} />;
  }
  return <CaseStatusBadge status={status} />;
}
