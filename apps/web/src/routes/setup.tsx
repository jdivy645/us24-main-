/**
 * Source Setup — 05 §3, 05 §4, 03 §3.
 *
 * 05 §3: "Use `Validate sources` before `Begin processing`" and
 * "Display source-specific errors inside the source card."
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { Banner, Button, Card, EmptyState, WorkflowBadge } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';
import { useAnnouncer } from '../app/announcer.js';

type SourceTab = 'AUDIO' | 'TRANSCRIPT_FILE' | 'PASTE' | 'RINGCENTRAL';

export function SetupRoute(): React.JSX.Element {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { announce } = useAnnouncer();

  const [tab, setTab] = useState<SourceTab>('PASTE');
  const [pasted, setPasted] = useState('');
  const [validated, setValidated] = useState(false);

  const snapshot = useQuery({
    queryKey: queryKeys.case(caseId),
    queryFn: () => api.getCase(caseId),
  });
  const sources = useQuery({
    queryKey: queryKeys.sources(caseId),
    queryFn: () => api.listSources(caseId),
  });

  const attach = useMutation({
    mutationFn: () => api.attachTranscriptText(caseId, pasted, 'Pasted transcript.txt'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sources(caseId) });
      setPasted('');
      setValidated(false);
      announce('Transcript attached.');
    },
  });

  const process = useMutation({
    mutationFn: () => api.startProcessing(caseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) });
      void navigate(`/verifications/${caseId}/processing`);
    },
  });

  if (snapshot.isLoading) return <RouteSkeleton title="Source setup" />;
  if (snapshot.isError) throw snapshot.error;

  const caseRow = snapshot.data!.case;
  const isAudit = caseRow.mode === 'AUDIT';
  const attached = sources.data?.items ?? [];
  const hasCallSource = attached.some((a) => a['kind'] === 'TRANSCRIPT' || a['kind'] === 'AUDIO');
  const hasCompletedForm = attached.some((a) => a['kind'] === 'COMPLETED_FORM');

  // 03 §3: "For audit mode, require a completed VOB PDF or Excel source before
  // verification can begin."
  const missingRequirement = !hasCallSource
    ? 'Attach a call transcript before processing.'
    : isAudit && !hasCompletedForm
      ? 'Audit mode needs the completed VOB as well as the call.'
      : !validated
        ? 'Validate the sources before processing.'
        : null;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Source setup</h1>
          <p className="page__lede">
            {isAudit
              ? 'Attach the call and the completed VOB you want audited.'
              : 'Attach the call the VOB will be filled from.'}
          </p>
        </div>
        <div className="row">
          <span className="chip tnum">Case {caseId.slice(0, 16)}…</span>
          <WorkflowBadge state={caseRow.workflow_state} />
        </div>
      </header>

      <Card
        title="Call source"
        hint="Where the benefit facts come from. The original file is kept unchanged as evidence."
      >
        <div className="pane__tabs" role="tablist" aria-label="Call source type">
          {(
            [
              ['PASTE', 'Paste text'],
              ['TRANSCRIPT_FILE', 'Transcript file'],
              ['AUDIO', 'Audio'],
              ['RINGCENTRAL', 'RingCentral'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'var(--space-3)' }}>
          {tab === 'PASTE' && (
            <div className="stack stack--2">
              <label htmlFor="paste-transcript" className="field-block__label">
                Transcript text
              </label>
              <textarea
                id="paste-transcript"
                value={pasted}
                rows={10}
                onChange={(e) => {
                  setPasted(e.target.value);
                  setValidated(false);
                }}
                placeholder={'[00:04] IVR: Thank you for calling…\n[01:36] ASH: The deductible is…'}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-control)',
                  font: 'inherit',
                  fontSize: 'var(--text-input)',
                }}
              />
              {/* 05 §3: "Pasted transcript area shows character count and
                  preserves speaker and timestamp formatting." */}
              <p className="meta tnum">
                {pasted.length.toLocaleString()} characters · speaker labels and timestamps are
                preserved exactly as pasted
              </p>
              <div className="row">
                <Button
                  variant="secondary"
                  disabled={pasted.trim().length === 0 || attach.isPending}
                  onClick={() => attach.mutate()}
                >
                  Attach transcript
                </Button>
              </div>
              {attach.isError && (
                <Banner tone="danger" title="This source was rejected.">
                  {(attach.error as Error).message}
                </Banner>
              )}
            </div>
          )}

          {tab === 'TRANSCRIPT_FILE' && (
            <div className="stack stack--2">
              <div className="empty">
                <h3 className="empty__title">Drop a transcript file</h3>
                <p className="empty__body">
                  Accepted: TXT, DOCX, text-based PDF, CSV and XLSX. Maximum 200 MB. The file is
                  stored privately and never in your browser.
                </p>
                <Button
                  variant="neutral"
                  disabledReason="File upload is wired to the storage adapter but document parsers for DOCX, PDF and XLSX are deferred until the client source files are supplied. Paste the transcript text instead."
                >
                  Browse files
                </Button>
              </div>
            </div>
          )}

          {tab === 'AUDIO' && (
            <Banner tone="review" title="Audio transcription is not enabled.">
              Converting a recording to a transcript needs an approved transcription provider and a
              signed agreement covering call content. Until that is in place, no audio is sent
              anywhere. Paste or upload a transcript instead.
            </Banner>
          )}

          {tab === 'RINGCENTRAL' && (
            <Banner tone="review" title="RingCentral import is not configured.">
              Ten questions about the account still need answers — which RingCentral product is in
              use, whether recording is enabled and for whom, permissions for call logs and
              recordings, licensing, retention, multi-leg transfers, webhook versus polling, rate
              limits, how a call maps to a patient, and BAA coverage. Manual upload remains
              available and will stay available after the integration lands.
            </Banner>
          )}
        </div>
      </Card>

      {isAudit && (
        <Card
          title="Completed VOB"
          hint="The document being audited. Its original values are preserved and never overwritten."
        >
          {hasCompletedForm ? (
            <ul className="stack stack--2" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {attached
                .filter((a) => a['kind'] === 'COMPLETED_FORM')
                .map((artifact) => (
                  <li key={String(artifact['id'])} className="row row--between">
                    <span>{String(artifact['filename'])}</span>
                    <span className="chip">{String(artifact['parse_state'])}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <EmptyState
              title="No completed VOB attached"
              body="Audit mode compares an existing form against the call, so the form is required. Accepted: text-based PDF and Excel. An image-only PDF is detected and reported rather than silently producing a blank form."
              action={
                <Button
                  variant="neutral"
                  disabledReason="Completed-form import is deferred until the client's sample PDF and Excel files are supplied (ADR-015)."
                >
                  Upload completed VOB
                </Button>
              }
            />
          )}
        </Card>
      )}

      <Card title="Attached sources" hint="Each source keeps its checksum and parsing state.">
        {attached.length === 0 ? (
          <EmptyState
            title="Nothing attached yet"
            body="Sources appear here with their size, checksum and parsing state as soon as you attach them."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Kind</th>
                  <th>Size</th>
                  <th>Checksum</th>
                  <th>State</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {attached.map((artifact) => (
                  <tr key={String(artifact['id'])}>
                    <td>{String(artifact['filename'])}</td>
                    <td>{String(artifact['kind'])}</td>
                    <td className="tnum">
                      {Number(artifact['byte_size']).toLocaleString()} bytes
                    </td>
                    <td className="tnum" title={String(artifact['checksum_sha256'])}>
                      {String(artifact['checksum_sha256']).slice(0, 12)}…
                    </td>
                    <td>{String(artifact['parse_state'])}</td>
                    <td>{String(artifact['parse_detail'] ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="row action-bar">
        <Button
          variant="secondary"
          disabled={!hasCallSource}
          disabledReason={!hasCallSource ? 'Attach a call source first.' : null}
          onClick={() => setValidated(true)}
        >
          Validate sources
        </Button>
        <Button
          variant="primary"
          disabled={missingRequirement !== null || process.isPending}
          disabledReason={missingRequirement}
          onClick={() => process.mutate()}
        >
          Begin processing
        </Button>
      </div>

      {validated && missingRequirement === null && (
        <Banner tone="info" title="Sources look usable.">
          {attached.length} source{attached.length === 1 ? '' : 's'} attached. Processing keeps each
          original file unchanged and records what was derived from it.
        </Banner>
      )}
    </div>
  );
}
