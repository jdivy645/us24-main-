/**
 * Review-only screen — 05 §10.
 *
 * 05 §10: "Keep the actual field controls visible rather than replacing them
 * with a detached issue table" and "Show a top summary for orientation, but
 * resolution occurs inside each field block."
 */

import { useParams } from 'react-router';
import { Banner, Button, Card, EmptyState } from '@us24/ui';
import { RouteSkeleton } from '../app/shell.js';
import { CaseHeader } from '../features/case-header.js';
import { BypassDialog } from '../features/bypass-dialog.js';
import { FormPane, IssueSummary } from '../features/workspace-panes.js';
import { useCaseWorkspace } from '../features/use-case-workspace.js';

export function ReviewRoute(): React.JSX.Element {
  const { caseId = '' } = useParams();
  const workspace = useCaseWorkspace(caseId);
  const { registry, snapshot } = workspace;

  if (registry.isLoading || snapshot.isLoading) return <RouteSkeleton title="Review" />;
  if (snapshot.isError) throw snapshot.error;

  const data = snapshot.data!;
  const registryData = registry.data!;
  const status = data.status;
  const unresolved = data.comparisons.filter(
    (c) => c.isVisible && (c.severity === 'FAILURE' || c.severity === 'REVIEW'),
  );

  return (
    <div className="page page--wide">
      <CaseHeader
        snapshot={data}
        onVerify={() => workspace.verify.mutate()}
        onGenerate={(type) => workspace.generate.mutate(type)}
        verifying={workspace.verify.isPending}
        generating={workspace.generate.isPending}
      />

      {/* 05 §10: "Show why the current overall status is FAILED or NEEDS REVIEW." */}
      {status && status.status !== 'PASSED' && (
        <Banner tone={status.status === 'FAILED' ? 'danger' : 'review'} title={`Why this is ${status.status.replace('_', ' ').toLowerCase()}:`}>
          {status.status === 'FAILED'
            ? `${status.reasons.filter((r) => r.severity === 'FAILURE').length} field${
                status.reasons.filter((r) => r.severity === 'FAILURE').length === 1 ? '' : 's'
              } contradict the call or are missing a critical value. A high match rate elsewhere does not override this.`
            : `${status.counts.unresolved} item${status.counts.unresolved === 1 ? '' : 's'} could not be resolved safely from the sources available.`}
        </Banner>
      )}

      <IssueSummary snapshot={data} onGoToFirstIssue={() => workspace.focusIssue('first')} />

      {/*
        05 §10: "Provide `Resolve and next` and `Skip for now`."
        "Go to first issue" lives in the summary card above and is deliberately
        not repeated here — two controls with the same name would be ambiguous
        to a screen-reader user navigating by button name.
      */}
      <div className="row">
        <Button variant="secondary" onClick={() => workspace.focusIssue('next')}>
          Resolve and next
        </Button>
        <Button variant="quiet" onClick={() => workspace.focusIssue('next')}>
          Skip for now
        </Button>
      </div>

      {unresolved.length === 0 ? (
        <Card title="Final review checklist">
          <EmptyState
            title="No unresolved issues"
            body="Every visible field is matched, supported by an approved source, derived from clear operands, or recorded as not applicable. Re-verify the current revision before finalizing so the result matches exactly what will be printed."
            action={
              <Button variant="primary" onClick={() => workspace.verify.mutate()}>
                Re-verify before finalizing
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="workspace" style={{ gridTemplateColumns: '1fr' }}>
          {/*
            05 §10: real field controls, filtered to what still needs work.
            Resolution happens in the block, not in a separate panel.
          */}
          <FormPane
            registry={registryData}
            snapshot={data}
            onAction={workspace.handleAction}
            filterUnresolvedOnly
          />
        </div>
      )}

      <BypassDialog
        open={workspace.bypassField !== null}
        field={workspace.bypassField}
        currentValue={
          workspace.bypassField ? (data.currentValues[workspace.bypassField.key] ?? null) : null
        }
        onClose={() => workspace.setBypassField(null)}
        onSubmit={(reason, note) =>
          workspace.bypassField &&
          workspace.bypass.mutate({ fieldKey: workspace.bypassField.key, reason, note })
        }
        error={workspace.bypass.isError ? workspace.actionError : null}
        pending={workspace.bypass.isPending}
      />
    </div>
  );
}
