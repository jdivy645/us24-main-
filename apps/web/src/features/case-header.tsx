/**
 * Case header — 05 §6.
 *
 * Sticky below the global top bar, carrying identity, counts, freshness and the
 * status-gated document actions (09 §16).
 */

import { Link } from 'react-router';
import { Button, CaseStatusBadge, WorkflowBadge } from '@us24/ui';
import type { CaseSnapshotDto } from '../lib/api.js';

export function CaseHeader({
  snapshot,
  onVerify,
  onGenerate,
  verifying,
  generating,
}: {
  snapshot: CaseSnapshotDto;
  onVerify: () => void;
  onGenerate: (documentType: string) => void;
  verifying: boolean;
  generating: boolean;
}): React.JSX.Element {
  const { case: caseRow, status, freshness, documentGate } = snapshot;
  const counts = status?.counts;

  const finalBlocked = documentGate?.blocked.find((b) => b.type === 'FINAL');
  const canFinal = documentGate?.allowed.includes('FINAL') ?? false;

  return (
    <div className="case-header">
      <div className="case-header__row">
        <div>
          <h1 className="page__title" style={{ fontSize: 'var(--text-section-title)' }}>
            {caseRow.patient_label ?? 'Unnamed patient'}
          </h1>
          <div className="meta">
            {caseRow.payer_label ?? 'Payer not set'} ·{' '}
            {caseRow.mode === 'AUDIT' ? 'Audit a completed VOB' : 'Auto-fill a blank VOB'}
            {caseRow.service_type ? ` · ${caseRow.service_type}` : ''}
          </div>
        </div>
        <div className="row">
          {/* 09 §17: processing failure is shown separately from the audit outcome. */}
          {caseRow.workflow_state === 'PROCESSING_FAILED' ? (
            <WorkflowBadge state={caseRow.workflow_state} />
          ) : (
            <CaseStatusBadge status={status?.status ?? null} incomplete={status?.incomplete} />
          )}
          {/* 09 §15: the header says so when the current revision is unverified. */}
          {freshness.isStale && freshness.label && (
            <span className="badge badge--review">
              <span className="badge__icon" aria-hidden="true">
                !
              </span>
              {freshness.label}
            </span>
          )}
        </div>
      </div>

      {counts && (
        <div className="case-header__counts">
          <span>
            <strong className="tnum">{counts.completionPercent}%</strong> complete
          </span>
          <span>
            <strong className="tnum">{counts.match}</strong> matched
          </span>
          <span>
            <strong className="tnum">{counts.mismatch}</strong> mismatched
          </span>
          <span>
            <strong className="tnum">{counts.conflict + counts.lowConfidence}</strong> need review
          </span>
          <span>
            <strong className="tnum">{counts.notFoundInSource}</strong> unsupported
          </span>
          <span>
            <strong className="tnum">{counts.bypassed}</strong> bypassed
          </span>
        </div>
      )}

      <div className="case-header__row">
        <div className="row">
          <Button variant="primary" onClick={onVerify} disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify'}
          </Button>
          <Link className="btn btn--secondary" to={`/verifications/${caseRow.id}/review`}>
            Open review
          </Link>
          <Link className="btn btn--neutral" to={`/verifications/${caseRow.id}/processing`}>
            Processing
          </Link>
        </div>

        <div className="row">
          {/*
            09 §16 / 13 §11: FAILED cannot generate a clean final VOB, and
            NEEDS REVIEW produces only a marked draft or QA report. The button is
            disabled with the reason visible beside it (04 §10).
          */}
          <Button
            variant="primary"
            disabled={!canFinal || generating}
            disabledReason={canFinal ? null : (finalBlocked?.reason ?? 'Verify this revision first.')}
            onClick={() => onGenerate('FINAL')}
          >
            Generate final PDF
          </Button>
          {documentGate?.allowed
            .filter((type) => type !== 'FINAL')
            .map((type) => (
              <Button
                key={type}
                variant="neutral"
                disabled={generating}
                onClick={() => onGenerate(type)}
              >
                {type === 'QA_REPORT'
                  ? 'Internal QA report'
                  : type === 'QA_FAILED_DRAFT'
                    ? 'Failed draft'
                    : 'Needs-review draft'}
              </Button>
            ))}
        </div>
      </div>

      {freshness.reason && <p className="meta">{freshness.reason}</p>}
    </div>
  );
}
