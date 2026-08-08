/**
 * Review Queue — 05 §13.
 *
 * 05 §13: "Bulk actions are limited to safe operational actions such as assign
 * label or export IDs; do not bulk approve benefits."
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Button, Card, EmptyState } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';
import { CaseStatusCell } from './new-verification.js';

type Tab = 'NEEDS_REVIEW' | 'FAILED' | 'PROCESSING_PROBLEMS' | 'BYPASS_FOLLOW_UP';

const TABS: { key: Tab; label: string }[] = [
  { key: 'NEEDS_REVIEW', label: 'Needs review' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'PROCESSING_PROBLEMS', label: 'Processing problems' },
  { key: 'BYPASS_FOLLOW_UP', label: 'Bypass follow-up' },
];

export function ReviewQueueRoute(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('NEEDS_REVIEW');
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.cases('queue'),
    queryFn: () => api.listCases(),
  });

  if (isLoading) return <RouteSkeleton title="Review queue" />;
  if (isError) throw error;

  const all = data?.items ?? [];
  const rows = all.filter((row) => {
    switch (tab) {
      case 'NEEDS_REVIEW':
        return row.case_status === 'NEEDS_REVIEW';
      case 'FAILED':
        return row.case_status === 'FAILED';
      case 'PROCESSING_PROBLEMS':
        return row.workflow_state === 'PROCESSING_FAILED';
      case 'BYPASS_FOLLOW_UP':
        return false;
    }
  });

  return (
    <div className="page page--wide">
      <header className="page__header">
        <div>
          <h1 className="page__title">Review queue</h1>
          <p className="page__lede">
            Work that cannot be finalized yet. Opening an item lands on the fields that need a
            decision, with their evidence.
          </p>
        </div>
      </header>

      <div className="pane__tabs" role="tablist" aria-label="Queue">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
            {entry.key === 'NEEDS_REVIEW' && (
              <span className="tnum">
                {' '}
                ({all.filter((r) => r.case_status === 'NEEDS_REVIEW').length})
              </span>
            )}
            {entry.key === 'FAILED' && (
              <span className="tnum"> ({all.filter((r) => r.case_status === 'FAILED').length})</span>
            )}
          </button>
        ))}
      </div>

      <Card title={`${rows.length} item${rows.length === 1 ? '' : 's'}`}>
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing in this queue"
            body={
              tab === 'BYPASS_FOLLOW_UP'
                ? 'Bypasses recorded with a follow-up requirement appear here. None are outstanding.'
                : 'No unresolved cases match this tab. Clearing filters or switching tabs shows other outstanding work.'
            }
            action={
              <Link className="btn btn--secondary" to="/records">
                Open records
              </Link>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Patient</th>
                  <th>Payer</th>
                  <th>Service</th>
                  <th>Age</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <CaseStatusCell status={row.case_status} workflowState={row.workflow_state} />
                    </td>
                    <td>{row.patient_label ?? '—'}</td>
                    <td>{row.payer_label ?? '—'}</td>
                    <td>{row.service_type ?? '—'}</td>
                    <td className="tnum">{ageInDays(row.updated_at)}d</td>
                    <td>
                      <Link className="btn btn--neutral btn--sm" to={`/verifications/${row.id}/review`}>
                        Open review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Bulk actions">
        <div className="row">
          <Button variant="neutral" disabledReason="Select rows to export their identifiers.">
            Export selected IDs
          </Button>
          {/*
            05 §13: bulk approval of benefits is deliberately absent, not merely
            disabled — approving a benefit requires seeing its evidence.
          */}
          <p className="meta" style={{ maxWidth: '54ch' }}>
            Bulk actions are limited to safe operational tasks such as exporting identifiers or
            assigning a label. Benefits are never approved in bulk: each field decision needs its
            own evidence.
          </p>
        </div>
      </Card>
    </div>
  );
}

function ageInDays(updatedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000));
}
