/**
 * Template management — 05 §15, 13 §6.
 *
 * 05 §15: "The client-supplied official template remains the authority."
 * That template has not been supplied, so the active entry is explicitly an
 * interim layout and says so (ADR-015).
 */

import { useQuery } from '@tanstack/react-query';
import { Banner, Button, Card, EmptyState } from '@us24/ui';
import { api, queryKeys } from '../lib/api.js';
import { RouteSkeleton } from '../app/shell.js';

export function TemplatesRoute(): React.JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.templates,
    queryFn: api.templates,
  });

  if (isLoading) return <RouteSkeleton title="Templates" />;
  if (isError) throw error;

  const templates = data?.items ?? [];

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Templates</h1>
          <p className="page__lede">
            The official document format, versioned. Historical documents keep the template version
            they were generated with.
          </p>
        </div>
      </header>

      <Banner tone="review" title="The official template has not been supplied.">
        {data?.note}
      </Banner>

      <Card title={`Template versions (${templates.length})`}>
        {templates.length === 0 ? (
          <EmptyState
            title="No templates registered"
            body="Register the client's approved blank VOB template to enable final document generation. Until then only interim and internal documents can be produced."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Version</th>
                  <th>Label</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Mapped fields</th>
                  <th>Client supplied</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={String(template['id'])}>
                    <td className="tnum">{String(template['template_id'])}</td>
                    <td className="tnum">v{String(template['version_number'])}</td>
                    <td>{String(template['client_label'])}</td>
                    <td>{String(template['file_type'])}</td>
                    <td>
                      <span
                        className={`badge ${
                          template['state'] === 'ACTIVE' ? 'badge--success' : 'badge--neutral'
                        }`}
                      >
                        <span className="badge__icon" aria-hidden="true">
                          {template['state'] === 'ACTIVE' ? '✓' : '·'}
                        </span>
                        {String(template['state'])}
                      </span>
                    </td>
                    <td className="tnum">{String(template['mapping_completeness'])}</td>
                    <td>{Number(template['is_client_supplied']) === 1 ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="What is needed to finish this"
        hint="13 §7 — the client-supplied format decides the rendering method after inspection."
      >
        <ul className="stack stack--1" style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
          <li className="meta">
            The approved blank VOB template file, so field bindings can be mapped to real anchors.
          </li>
          <li className="meta">
            Confirmation of the format. A DOCX with placeholders is preferred; a fillable PDF maps
            to form-field names; a non-fillable PDF needs a versioned coordinate overlay.
          </li>
          <li className="meta">
            The colour legend used in the marked template, which currently has no authoritative key.
          </li>
          <li className="meta">
            Sign-off on the final layout, after which the template governs labels, ordering and
            arrangement.
          </li>
        </ul>
        <div className="row" style={{ marginTop: 'var(--space-3)' }}>
          <Button
            variant="primary"
            disabledReason="Upload the client's approved template file to enable mapping and validation."
          >
            Register official template
          </Button>
        </div>
      </Card>
    </div>
  );
}
