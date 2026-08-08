/**
 * Base record detail and historical version — 05 §12, 10 §5–§8.
 *
 * 10 §5: "Do not overwrite the prior version." 10 §8: the version timeline shows
 * dates, status, operator label, source and changed-field counts.
 */

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { Banner, Button, Card, CaseStatusBadge, EmptyState } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';
import { FormPane } from '../features/workspace-panes.js';

export function RecordDetailRoute(): React.JSX.Element {
  const { recordId = '' } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.record(recordId),
    queryFn: () => api.record(recordId),
  });

  if (isLoading) return <RouteSkeleton title="Base record" />;
  if (isError) throw error;

  const record = data!.record;
  const versions = data!.versions;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">
            {String(record['last_name'])}, {String(record['first_name'])}
          </h1>
          <p className="page__lede">
            {String(record['carrier_name'])} · policy{' '}
            <span className="tnum">{String(record['policy_id'])}</span> · group{' '}
            <span className="tnum">{String(record['group_id'] ?? '—')}</span> ·{' '}
            {String(record['service_type'] ?? 'service not set')}
          </p>
        </div>
        <Link className="btn btn--primary" to="/verifications/new">
          New verification for this record
        </Link>
      </header>

      <div className="grid-3">
        <Card title="Patient">
          <dl className="stack stack--1" style={{ margin: 0, fontSize: 'var(--text-meta)' }}>
            <dt className="muted">Date of birth</dt>
            <dd className="tnum" style={{ margin: 0 }}>
              {String(record['date_of_birth'] ?? '—')}
            </dd>
          </dl>
        </Card>
        <Card title="Policy">
          <dl className="stack stack--1" style={{ margin: 0, fontSize: 'var(--text-meta)' }}>
            <dt className="muted">Plan</dt>
            <dd style={{ margin: 0 }}>{String(record['plan_name'] ?? '—')}</dd>
            <dt className="muted">Effective from</dt>
            <dd className="tnum" style={{ margin: 0 }}>
              {String(record['effective_date'] ?? '—')}
            </dd>
          </dl>
        </Card>
        <Card title="Duplicate risk">
          <p className="meta">
            Matching uses patient identity, date of birth, payer, policy identifier and service —
            never the patient name alone and never the filename. Records are never merged
            automatically.
          </p>
        </Card>
      </div>

      <Card
        title={`Version timeline (${versions.length})`}
        hint="Each call creates a dated version. Earlier versions are never rewritten."
      >
        {versions.length === 0 ? (
          <EmptyState
            title="No versions yet"
            body="Finalizing a verification against this patient, policy and service creates version one."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Verification date</th>
                  <th>Status</th>
                  <th>Case</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={String(version['id'])}>
                    <td className="tnum">v{String(version['version_number'])}</td>
                    <td className="tnum">{String(version['verification_date'])}</td>
                    <td>
                      <CaseStatusBadge
                        status={(version['case_status'] as 'PASSED' | 'FAILED' | 'NEEDS_REVIEW') ?? null}
                      />
                    </td>
                    <td className="tnum">{String(version['case_id'] ?? '—').slice(0, 14)}…</td>
                    <td>
                      <Link
                        className="btn btn--neutral btn--sm"
                        to={`/records/${recordId}/versions/${String(version['id'])}`}
                      >
                        Open (read-only)
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Changing values to confirm on the next call">
        <p className="meta">
          Eligibility, effective and termination dates, deductible and out-of-pocket accumulators,
          visits used and remaining, authorisation requirements and secondary status all move
          between calls. A repeat verification carries stable values forward with their source and
          marks each of these as needing confirmation rather than assuming it still holds.
        </p>
      </Card>
    </div>
  );
}

/**
 * Historical version — 03 §11: "Open a historical version in read-only mode."
 * 12 §7: finalized history is immutable, so nothing here can be edited.
 */
export function HistoricalVersionRoute(): React.JSX.Element {
  const { recordId = '', versionId = '' } = useParams();
  const record = useQuery({ queryKey: queryKeys.record(recordId), queryFn: () => api.record(recordId) });
  const registry = useQuery({ queryKey: queryKeys.registry, queryFn: api.registry });

  const version = record.data?.versions.find((v) => String(v['id']) === versionId);
  const caseId = version ? String(version['case_id'] ?? '') : '';

  const snapshot = useQuery({
    queryKey: queryKeys.case(caseId),
    queryFn: () => api.getCase(caseId),
    enabled: caseId !== '',
  });

  if (record.isLoading || registry.isLoading) return <RouteSkeleton title="Historical version" />;
  if (record.isError) throw record.error;

  if (!version) {
    return (
      <div className="page">
        <h1 className="page__title">Version not found</h1>
        <Banner tone="danger" title="No such version.">
          That version does not belong to this record. It may have been opened from a stale link.
        </Banner>
        <Link className="btn btn--secondary" to={`/records/${recordId}`}>
          Back to the record
        </Link>
      </div>
    );
  }

  return (
    <div className="page page--wide">
      <header className="page__header">
        <div>
          <h1 className="page__title">
            Version {String(version['version_number'])} —{' '}
            <span className="tnum">{String(version['verification_date'])}</span>
          </h1>
          <p className="page__lede">
            This is a finalized historical verification. It is read-only: a later correction creates
            a new version rather than changing what was recorded here.
          </p>
        </div>
        <CaseStatusBadge
          status={(version['case_status'] as 'PASSED' | 'FAILED' | 'NEEDS_REVIEW') ?? null}
        />
      </header>

      <Banner tone="info" title="Read-only.">
        Historical values are never re-scored when rules or dictionaries change. What you see is
        what the engine decided on the verification date, with the rule-set version it used.
      </Banner>

      {snapshot.data && registry.data ? (
        <div className="workspace" style={{ gridTemplateColumns: '1fr' }}>
          <FormPane
            registry={registry.data}
            snapshot={snapshot.data}
            onAction={() => undefined}
            readOnly
          />
        </div>
      ) : (
        <Card title="Values">
          <EmptyState
            title="No form revision linked"
            body="This version has no stored form revision, which happens for versions imported before the case pipeline existed."
            action={
              <Link className="btn btn--neutral" to={`/records/${recordId}`}>
                Back to the record
              </Link>
            }
          />
        </Card>
      )}

      <div className="row">
        <Link className="btn btn--secondary" to={`/records/${recordId}`}>
          Back to the record
        </Link>
        <Button
          variant="neutral"
          disabledReason="Version-to-version comparison needs two finalized versions on this record."
        >
          Compare with another version
        </Button>
      </div>
    </div>
  );
}
