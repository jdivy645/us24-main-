/**
 * System health — 05 §16.
 *
 * 05 §16: "Do not expose API keys, raw PHI logs, or full transcript content."
 * Everything on this page comes from a health endpoint that returns statuses and
 * versions only.
 */

import { useQuery } from '@tanstack/react-query';
import { Banner, Card } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';

interface HealthService {
  status: string;
  provider?: string;
  engine?: string;
  note?: string | null;
}

export function SystemRoute(): React.JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.systemHealth,
    queryFn: api.systemHealth,
    refetchInterval: 30_000,
  });

  if (isLoading) return <RouteSkeleton title="System" />;
  if (isError) throw error;

  const health = data as unknown as {
    services: Record<string, HealthService>;
    versions: Record<string, string | number | boolean>;
    limits: Record<string, unknown>;
    jobs: { recent: { id: string; queue: string; status: string; attempts: number }[] };
    environmentLabel: string;
    retention: { summary: string; nextCleanupRun: string | null };
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">System</h1>
          <p className="page__lede">
            Component health, active versions and limits. No keys, patient data or transcript
            content is shown here.
          </p>
        </div>
        <span className="chip">{health.environmentLabel}</span>
      </header>

      <Card title="Services">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Implementation</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(health.services).map(([name, service]) => (
                <tr key={name}>
                  <td>{humanizeKey(name)}</td>
                  <td>
                    <span
                      className={`badge ${
                        service.status === 'UP' ? 'badge--success' : 'badge--review'
                      }`}
                    >
                      <span className="badge__icon" aria-hidden="true">
                        {service.status === 'UP' ? '✓' : '!'}
                      </span>
                      {service.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{service.engine ?? service.provider ?? '—'}</td>
                  <td className="meta">{service.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Active versions" hint="Every result records the versions that produced it.">
          <table className="table">
            <tbody>
              {Object.entries(health.versions).map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{humanizeKey(key)}</th>
                  <td className="tnum">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {health.versions['fieldRulePendingClient'] === true && (
            <Banner tone="review" title="Field rules are provisional.">
              The requiredness, criticality and bypass matrices are awaiting client approval.
              Replacing them is a configuration change, not a code change.
            </Banner>
          )}
        </Card>

        <Card title="Limits and supported formats">
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">Maximum upload</th>
                <td className="tnum">
                  {(Number(health.limits['maxUploadBytes']) / (1024 * 1024)).toFixed(0)} MB
                </td>
              </tr>
              <tr>
                <th scope="row">Transcript formats</th>
                <td>{(health.limits['supportedTranscriptFormats'] as string[]).join(', ')}</td>
              </tr>
              <tr>
                <th scope="row">Completed form formats</th>
                <td>{(health.limits['supportedCompletedFormFormats'] as string[]).join(', ')}</td>
              </tr>
              <tr>
                <th scope="row">Audio formats</th>
                <td>
                  {(health.limits['audioFormats'] as string[]).length === 0
                    ? 'None — transcription is not enabled'
                    : (health.limits['audioFormats'] as string[]).join(', ')}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Recent jobs" hint="Queue, attempt count and outcome. No payloads are shown.">
        {health.jobs.recent.length === 0 ? (
          <p className="meta">No jobs have run in this process yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Queue</th>
                  <th>Status</th>
                  <th>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {health.jobs.recent.map((job) => (
                  <tr key={job.id}>
                    <td className="tnum">{job.queue}</td>
                    <td>{job.status}</td>
                    <td className="tnum">{job.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Retention">
        <p className="meta">{health.retention.summary}</p>
      </Card>
    </div>
  );
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
