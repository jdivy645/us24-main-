/**
 * Bypass dialog — 05 §17, 09 §10, §11.
 *
 * 09 §10: "A generic Ignore reason is prohibited." The reason list comes from
 * the field's own policy in the server rule bundle, and a note is demanded when
 * that policy requires one.
 */

import { useEffect, useState } from 'react';
import { Banner, Button, Dialog } from '@us24/ui';
import type { RegistryFieldDto } from '../lib/api.js';

const REASON_LABELS: Record<string, string> = {
  NOT_APPLICABLE: 'Not applicable to this case',
  PAYER_UNABLE_TO_VERIFY: 'Payer could not verify this',
  NOT_DISCLOSED_DURING_CALL: 'Not disclosed during the call',
  DATA_UNAVAILABLE: 'Data unavailable',
  USE_APPROVED_CARRIER_MASTER: 'Use approved carrier master value',
  TRANSCRIPT_QUALITY_INSUFFICIENT: 'Transcript or audio quality insufficient',
  CLIENT_APPROVED_EXCEPTION: 'Client-approved exception',
  SOURCE_SYSTEM_VALUE_ACCEPTED: 'Source-system value accepted',
  OTHER_WITH_REQUIRED_NOTE: 'Other',
};

/** 09 §12 — the consequence the operator is agreeing to, stated up front. */
const REASON_CONSEQUENCE: Record<string, string> = {
  NOT_APPLICABLE:
    'On an optional field this can allow the case to pass. On a critical field it still needs review.',
  PAYER_UNABLE_TO_VERIFY:
    'The case will need review. A payer being unable to see something does not confirm it is absent.',
  NOT_DISCLOSED_DURING_CALL: 'The case will need review — this does not automatically pass.',
  DATA_UNAVAILABLE: 'The case will need review.',
  USE_APPROVED_CARRIER_MASTER:
    'Passes only when an active carrier-master version matches this case scope; otherwise it needs review.',
  TRANSCRIPT_QUALITY_INSUFFICIENT: 'The case will need review.',
  CLIENT_APPROVED_EXCEPTION:
    'No approval authority is configured for this deployment, so the case will still need review.',
  SOURCE_SYSTEM_VALUE_ACCEPTED:
    'Passes only for fields configured to accept a source-system value.',
  OTHER_WITH_REQUIRED_NOTE: 'The case will need review. A note is required.',
};

export function BypassDialog({
  open,
  field,
  currentValue,
  onClose,
  onSubmit,
  error,
  pending,
}: {
  open: boolean;
  field: RegistryFieldDto | null;
  currentValue: string | null;
  onClose: () => void;
  onSubmit: (reason: string, note: string | null) => void;
  error: string | null;
  pending: boolean;
}): React.JSX.Element | null {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
    }
  }, [open]);

  if (!field) return null;

  const noteRequired = field.bypassReasonsRequiringNote.includes(reason);
  const canSubmit = reason !== '' && (!noteRequired || note.trim() !== '');

  return (
    <Dialog
      open={open}
      title={`Bypass — ${field.label}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit || pending}
            disabledReason={
              reason === ''
                ? 'Choose a reason.'
                : noteRequired && note.trim() === ''
                  ? 'This reason requires a note.'
                  : null
            }
            onClick={() => onSubmit(reason, note.trim() === '' ? null : note.trim())}
          >
            Record bypass
          </Button>
        </>
      }
    >
      <p className="meta">
        A bypass is a recorded exception, not a dismissal. It stays on the field, in the review
        queue, in history and in the QA report, and it carries a consequence for the case result.
      </p>

      {currentValue !== null && (
        <p className="meta">
          Current value: <strong className="tnum">{currentValue}</strong> — kept in history.
        </p>
      )}

      <div className="stack stack--2">
        <label htmlFor="bypass-reason" className="field-block__label">
          Reason
        </label>
        <select
          id="bypass-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-control)',
            font: 'inherit',
          }}
        >
          <option value="">Choose a reason</option>
          {field.bypassReasons.map((value) => (
            <option key={value} value={value}>
              {REASON_LABELS[value] ?? value}
            </option>
          ))}
        </select>
        {reason && <p className="meta">{REASON_CONSEQUENCE[reason]}</p>}
      </div>

      <div className="stack stack--2">
        <label htmlFor="bypass-note" className="field-block__label">
          Note {noteRequired ? '(required)' : '(optional)'}
        </label>
        <textarea
          id="bypass-note"
          value={note}
          rows={3}
          onChange={(e) => setNote(e.target.value)}
          aria-required={noteRequired}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-control)',
            font: 'inherit',
          }}
        />
      </div>

      {error && (
        <Banner tone="danger" title="The bypass was rejected.">
          {error}
        </Banner>
      )}
    </Dialog>
  );
}
