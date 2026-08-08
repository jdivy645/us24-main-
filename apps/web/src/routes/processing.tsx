/**
 * Processing screen — 05 §5, 03 §6.
 *
 * 05 §5: "Do not show a fake fixed countdown." Elapsed time is real; no
 * remaining-time estimate is invented. 03 §6: "Show elapsed time without
 * promising a fixed remaining time."
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { Banner, Button, Card, StageProgress, WorkflowBadge, type StageView } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';
import { useAnnouncer } from '../app/announcer.js';

const STAGE_LABELS: Record<string, string> = {
  UPLOAD: 'Upload',
  VALIDATE: 'Validate',
  PARSE_OR_TRANSCRIBE: 'Parse or transcribe',
  IDENTIFY_SPEAKERS: 'Identify speakers',
  EXTRACT_FACTS: 'Extract facts',
  COMPARE: 'Compare',
  PREPARE_WORKSPACE: 'Prepare workspace',
};

const STAGE_ORDER = Object.keys(STAGE_LABELS);

interface EventRow {
  sequence: number;
  stage: string;
  status: StageView['status'];
  message_code: string;
  created_at: string;
  terminal: number;
}

export function ProcessingRoute(): React.JSX.Element {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { announce } = useAnnouncer();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const snapshot = useQuery({
    queryKey: queryKeys.case(caseId),
    queryFn: () => api.getCase(caseId),
    // 11 §7: poll only while the case is still working, and stop at a terminal state.
    refetchInterval: (query) =>
      query.state.data?.case.workflow_state === 'PROCESSING' ? 1000 : false,
  });

  /**
   * 12 §17 / 11 §14: one event stream per active case, resuming after the last
   * sequence received so a reconnect replays only what was missed.
   */
  useEffect(() => {
    if (!caseId) return;
    const source = new EventSource(`/v1/cases/${caseId}/events?after=-1`);
    source.onmessage = (message) => {
      const event = JSON.parse(message.data as string) as EventRow;
      setEvents((prev) => (prev.some((e) => e.sequence === event.sequence) ? prev : [...prev, event]));
      if (event.terminal === 1) {
        source.close();
        void queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) });
      }
    };
    // 11 §14: fall back to polling rather than failing loudly if the stream drops.
    source.onerror = () => source.close();
    return () => source.close();
  }, [caseId, queryClient]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const isComplete = snapshot.data?.case.workflow_state === 'READY';

  // Declared before the early returns below so hook order is stable across
  // renders — a loading render and a loaded render must call the same hooks.
  useEffect(() => {
    if (isComplete) announce('Processing complete. The review workspace is ready.');
  }, [isComplete, announce]);

  const cancel = useMutation({
    mutationFn: () => api.cancelProcessing(caseId),
    onSuccess: () => {
      announce('Processing cancelled. Completed sources are kept.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) });
    },
  });

  const retry = useMutation({
    mutationFn: (stage: string) => api.retryStage(caseId, stage),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) }),
  });

  if (snapshot.isLoading) return <RouteSkeleton title="Processing" />;
  if (snapshot.isError) throw snapshot.error;

  const caseRow = snapshot.data!.case;
  const hasFailure = events.some((e) => e.status === 'FAILED');

  const stages: StageView[] = STAGE_ORDER.map((stage) => {
    const latest = [...events].reverse().find((e) => e.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      status: latest?.status ?? (isComplete ? 'COMPLETE' : 'PENDING'),
    };
  });

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Processing</h1>
          <p className="page__lede">
            Each stage runs independently, so one failure does not discard the work that already
            succeeded.
          </p>
        </div>
        <div className="row">
          <WorkflowBadge state={caseRow.workflow_state} />
          {/* 03 §6: elapsed only — never a promised remaining time. */}
          <span className="chip tnum">Elapsed {formatElapsed(elapsed)}</span>
        </div>
      </header>

      <Card title="Stages">
        <StageProgress stages={stages} />
      </Card>

      <Card
        title="Event log"
        hint="Operational messages only — no patient data or transcript content appears here."
      >
        {events.length === 0 ? (
          <p className="meta">Waiting for the first event…</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stage</th>
                  <th>State</th>
                  <th>Message</th>
                  <th>At</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.sequence}>
                    <td className="tnum">{event.sequence}</td>
                    <td>{STAGE_LABELS[event.stage] ?? event.stage}</td>
                    <td>{event.status}</td>
                    <td>{humanizeCode(event.message_code)}</td>
                    <td className="tnum">{new Date(event.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {hasFailure && (
        <Banner tone="danger" title="A stage failed.">
          The sources that parsed successfully are kept. Retry only the failed stage, or replace the
          source that caused it.
        </Banner>
      )}

      <div className="row action-bar">
        {isComplete ? (
          <Button variant="primary" onClick={() => void navigate(`/verifications/${caseId}/workspace`)}>
            Open review workspace
          </Button>
        ) : (
          <Button
            variant="neutral"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            Cancel processing
          </Button>
        )}
        <Button
          variant="neutral"
          disabled={retry.isPending}
          onClick={() => retry.mutate('PARSE_OR_TRANSCRIBE')}
        >
          Retry failed stage
        </Button>
        <Link className="btn btn--quiet" to="/records">
          Return to records
        </Link>
      </div>

      {isComplete && (
        <Banner tone="info" title="Processing finished.">
          The completion summary stays visible so you can see what was produced before opening the
          workspace.
        </Banner>
      )}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Message codes keep PHI out of the event stream; wording is resolved here. */
function humanizeCode(code: string): string {
  const map: Record<string, string> = {
    SOURCE_ATTACHED: 'Source attached',
    SOURCES_VALIDATED: 'Sources validated',
    PARSING_TRANSCRIPT: 'Parsing transcript',
    TRANSCRIPT_PARSED: 'Transcript parsed',
    SPEAKERS_CLASSIFIED: 'Speakers classified',
    EXTRACTION_STARTED: 'Extracting evidence',
    EXTRACTION_COMPLETE: 'Evidence extracted',
    EXTRACTION_PROVIDER_UNAVAILABLE: 'No extraction provider configured',
    COMPARISON_COMPLETE: 'Comparison complete',
    WORKSPACE_READY: 'Workspace ready',
    PROCESSING_CANCELLED: 'Processing cancelled',
    ARTIFACT_PARSE_FAILED: 'A source could not be read',
    IMAGE_ONLY_PDF: 'Image-only PDF — no text layer',
  };
  return map[code] ?? code.toLowerCase().replace(/_/g, ' ');
}
