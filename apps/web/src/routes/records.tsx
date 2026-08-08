/**
 * Records — 05 §11, 10 §9, 10 §10.
 *
 * 05 §11: "Rows show processing failures and drafts rather than hiding them" and
 * "Do not expose Delete as a routine row action; use governed archive behavior."
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { Button, Card, EmptyState } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';
import { CaseStatusCell } from './new-verification.js';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'NEEDS_REVIEW', label: 'Needs review' },
  { value: 'DRAFT', label: 'Draft' },
] as const;

export function RecordsRoute(): React.JSX.Element {
  // 11 §5: filter state lives in URL search parameters so a view is shareable.
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const search = params.get('q') ?? '';
  const [searchDraft, setSearchDraft] = useState(search);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.cases(`${status}:${search}`),
    queryFn: () => api.listCases({ status: status || undefined, search: search || undefined }),
  });
  const records = useQuery({ queryKey: queryKeys.records, queryFn: api.records });

  if (isLoading) return <RouteSkeleton title="Records" />;
  if (isError) throw error;

  const rows = data?.items ?? [];
  const baseRecords = records.data?.baseRecords ?? [];

  return (
    <div className="page page--wide">
      <header className="page__header">
        <div>
          <h1 className="page__title">Records</h1>
          <p className="page__lede">
            Every verification, including drafts and interrupted processing. Nothing is hidden
            because it went wrong.
          </p>
        </div>
        <Link className="btn btn--primary" to="/verifications/new">
          New verification
        </Link>
      </header>

      <Card title="Filters">
        <div className="row">
          {STATUS_FILTERS.map((filter) => (
            // aria-pressed, not aria-selected: these are toggle buttons, not
            // tabs, and aria-selected is not a permitted attribute on a button.
            <button
              key={filter.value}
              type="button"
              className="tab"
              aria-pressed={status === filter.value}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (filter.value) next.set('status', filter.value);
                else next.delete('status');
                setParams(next);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <form
          className="row"
          style={{ marginTop: 'var(--space-3)' }}
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(params);
            if (searchDraft) next.set('q', searchDraft);
            else next.delete('q');
            setParams(next);
          }}
        >
          <label className="sr-only" htmlFor="records-search">
            Search records
          </label>
          <input
            id="records-search"
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Patient, payer, policy, group or call reference"
            style={{
              flex: 1,
              minWidth: 240,
              padding: 'var(--space-2) var(--space-3)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-control)',
              font: 'inherit',
            }}
          />
          <Button variant="secondary" type="submit">
            Search
          </Button>
        </form>
      </Card>

      <Card title={`Verifications (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState
            title="No records match these filters"
            body="Records are created the first time you verify a call. If you expected results here, clearing the filters will show everything."
            action={
              <Button variant="neutral" onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </Button>
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
                  <th>Mode</th>
                  <th>Updated</th>
                  <th>Actions</th>
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
                    <td>{row.mode === 'AUDIT' ? 'Audit' : 'Auto-fill'}</td>
                    <td className="tnum">{new Date(row.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row">
                        <Link
                          className="btn btn--neutral btn--sm"
                          to={
                            row.case_status
                              ? `/verifications/${row.id}/workspace`
                              : `/verifications/${row.id}/setup`
                          }
                        >
                          {row.case_status ? 'Open' : 'Resume'}
                        </Link>
                        {/*
                          05 §11: archive is governed, and Delete is deliberately
                          not offered as a routine row action.
                        */}
                        <Button
                          variant="quiet"
                          size="sm"
                          disabledReason="Archiving follows the retention policy, which is pending client approval. Archived records keep their source lineage and audit history."
                        >
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={`Base records (${baseRecords.length})`}
        hint="One per patient, policy and service. The first VOB creates it; later calls add dated versions."
      >
        {baseRecords.length === 0 ? (
          <EmptyState
            title="No base records yet"
            body="A base record is created the first time a verification is finalized for a patient, policy and service combination. Later calls add versions to it rather than creating duplicates."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>DOB</th>
                  <th>Payer</th>
                  <th>Policy</th>
                  <th>Group</th>
                  <th>Service</th>
                  <th>Versions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {baseRecords.map((record) => (
                  <tr key={String(record['id'])}>
                    <td>
                      {String(record['last_name'])}, {String(record['first_name'])}
                    </td>
                    <td className="tnum">{String(record['date_of_birth'] ?? '—')}</td>
                    <td>{String(record['carrier_name'])}</td>
                    {/* 08 §12 / 15 §4: leading zeros survive all the way to the table. */}
                    <td className="tnum">{String(record['policy_id'])}</td>
                    <td className="tnum">{String(record['group_id'] ?? '—')}</td>
                    <td>{String(record['service_type'] ?? '—')}</td>
                    <td className="tnum">{String(record['version_count'])}</td>
                    <td>
                      <Link className="btn btn--neutral btn--sm" to={`/records/${String(record['id'])}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
