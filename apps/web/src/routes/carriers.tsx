/**
 * Carrier Master — 05 §14, 10 §12–§17.
 *
 * 05 §14: "Detail screen shows scope before values." 10 §16: "A single
 * contradiction creates a proposal, not an automatic master update."
 */

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { Banner, Button, Card, EmptyState } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';

export function CarriersRoute(): React.JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.carriers,
    queryFn: api.carriers,
  });

  if (isLoading) return <RouteSkeleton title="Carrier master" />;
  if (isError) throw error;

  const carriers = data?.items ?? [];

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Carrier master</h1>
          <p className="page__lede">
            Reusable payer information — payer ID, claims address, phones, authorisation route and
            timely filing — scoped and effective-dated so one call never becomes a universal rule.
          </p>
        </div>
      </header>

      <Banner tone="info" title="Scope decides applicability.">
        A master value applies only where its scope matches: carrier, plan, line of business, state
        or market, network and service. A master without the scope a field needs cannot fill that
        field automatically.
      </Banner>

      <Card title={`Carriers (${carriers.length})`}>
        {carriers.length === 0 ? (
          <EmptyState
            title="No carrier masters yet"
            body="Carrier masters reduce repeated entry of payer data that does not change per call. Start one from a payer you verify often, or import a starter set."
            action={
              <Button variant="neutral" disabledReason="Carrier-master authoring is deferred until ownership and approval workflow are agreed (17 §18).">
                Create a carrier master
              </Button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Versions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {carriers.map((carrier) => (
                  <tr key={String(carrier['id'])}>
                    <td>{String(carrier['canonical_name'])}</td>
                    <td className="tnum">{String(carrier['version_count'])}</td>
                    <td>
                      <Link
                        className="btn btn--neutral btn--sm"
                        to={`/carriers/${String(carrier['id'])}`}
                      >
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

export function CarrierDetailRoute(): React.JSX.Element {
  const { carrierId = '' } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.carrier(carrierId),
    queryFn: () => api.carrier(carrierId),
  });

  if (isLoading) return <RouteSkeleton title="Carrier detail" />;
  if (isError) throw error;

  const versions = data?.versions ?? [];
  const active = versions.find((v) => v['state'] === 'ACTIVE');
  const proposed = versions.find((v) => v['state'] === 'PROPOSED');

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Carrier master detail</h1>
          <p className="page__lede">
            Versions are effective-dated. A new version never edits an active one in place, and
            historical verifications keep the version they actually used.
          </p>
        </div>
        <Link className="btn btn--neutral" to="/carriers">
          Back to carriers
        </Link>
      </header>

      {proposed && (
        <Banner tone="review" title="A proposed version is waiting for review.">
          {String(proposed['change_reason'] ?? 'A call contradicted the active master.')} Activation
          requires an effective date and a change reason — a contradiction on one call never updates
          the master by itself.
        </Banner>
      )}

      {versions.length === 0 ? (
        <EmptyState
          title="No versions"
          body="This carrier has no master versions yet. Creating one records the scope it applies to before any values."
        />
      ) : (
        versions.map((version) => (
          <Card
            key={String(version['id'])}
            title={`Version ${String(version['version_number'])} — ${String(version['state'])}`}
            hint={`Effective from ${String(version['effective_from'])}${
              version['effective_through'] ? ` through ${String(version['effective_through'])}` : ''
            }`}
          >
            {/* 05 §14: scope is presented before values. */}
            <h3 className="meta" style={{ margin: '0 0 var(--space-2)', textTransform: 'uppercase' }}>
              Scope
            </h3>
            <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
              {Object.entries(JSON.parse(String(version['scope_json'])) as Record<string, string>).map(
                ([key, value]) => (
                  <span key={key} className="chip">
                    {key}: {value}
                  </span>
                ),
              )}
            </div>

            <h3 className="meta" style={{ margin: '0 0 var(--space-2)', textTransform: 'uppercase' }}>
              Values
            </h3>
            <div className="table-scroll">
              <table className="table">
                <tbody>
                  {Object.entries(
                    JSON.parse(String(version['values_json'])) as Record<string, string>,
                  ).map(([key, value]) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      <td className="tnum">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {version['state'] === 'PROPOSED' && (
              <div className="row" style={{ marginTop: 'var(--space-3)' }}>
                <Button
                  variant="primary"
                  disabledReason="Activation requires the carrier-master ownership and approval workflow the client has not yet defined (17 §18)."
                >
                  Activate this version
                </Button>
              </div>
            )}

            {active && version['id'] === active['id'] && (
              <p className="meta" style={{ marginTop: 'var(--space-3)' }}>
                Every field filled from this version records the exact version identifier, so a later
                change never rewrites what a past verification used.
              </p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
