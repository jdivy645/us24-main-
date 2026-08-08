/**
 * FieldBlock component tests — 15 §13 (inline UX tests) and 15 §12 (form engine).
 *
 * 15 §13 lists these explicitly:
 *   "Mismatch colors the whole field block"
 *   "Error text appears inside the block"
 *   "Entered and supported values are both visible"
 *   "Conflict does not show unsafe apply"
 *   "No separate-only issue panel is required to understand the error"
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldBlock, type FieldComparisonView, type FieldDefinitionView } from '@us24/ui';

const definition: FieldDefinitionView = {
  key: 'authorization.requiredAfterVisitNumber',
  label: 'Authorization required after visit number',
  control: 'number',
  dataType: 'integer',
  helpText: 'The visit number after which authorization is needed.',
  requiredKind: 'REQUIRED_WHEN',
  requiredPendingClient: true,
  bypassAllowed: true,
};

function comparison(overrides: Partial<FieldComparisonView> = {}): FieldComparisonView {
  return {
    fieldKey: definition.key,
    outcome: 'MATCH',
    severity: 'NONE',
    isVisible: true,
    isRequired: false,
    isCritical: false,
    formDisplay: null,
    formCanonical: null,
    supportedDisplay: null,
    supportedSourceType: null,
    competingCandidates: [],
    supersededCandidates: [],
    evidence: null,
    confidence: null,
    derivation: null,
    message: '',
    ruleCode: 'TEST',
    actions: [],
    notes: [],
    ...overrides,
  };
}

const MISMATCH = comparison({
  outcome: 'MISMATCH',
  severity: 'FAILURE',
  isRequired: true,
  isCritical: true,
  formDisplay: '5',
  formCanonical: 5,
  supportedDisplay: '8',
  supportedSourceType: 'TRANSCRIPT_REP_CONFIRMED',
  evidence: {
    excerpt: 'Correct — authorization is required after the eighth visit.',
    timestampStart: 404.2,
    artifactLabel: 'CARSTEN UHC (AARA) (2).txt',
    speakerRole: 'PAYER_REPRESENTATIVE',
  },
  confidence: 0.91,
  message: 'Entered 5; representative confirmed 8.',
  ruleCode: 'CMP-060-MISMATCH',
  actions: ['APPLY_SUPPORTED_VALUE', 'EDIT_MANUALLY', 'BYPASS_WITH_REASON', 'VIEW_EVIDENCE'],
});

const CONFLICT = comparison({
  outcome: 'CONFLICT_IN_SOURCE',
  severity: 'REVIEW',
  formDisplay: '20%',
  message: 'The call contains conflicting values: 20% and 30%.',
  ruleCode: 'SEL-040-CONFLICT',
  actions: ['REVIEW_CONFLICT', 'EDIT_MANUALLY', 'BYPASS_WITH_REASON', 'VIEW_EVIDENCE'],
  competingCandidates: [
    {
      candidateId: 'a',
      rawValue: '20%',
      confidence: 0.85,
      evidence: {
        excerpt: 'Member coinsurance is twenty percent after deductible.',
        timestampStart: 209.6,
        artifactLabel: 'call.txt',
      },
    },
    {
      candidateId: 'b',
      rawValue: '30%',
      confidence: 0.8,
      evidence: {
        excerpt: 'Coinsurance shows thirty percent. Yes.',
        timestampStart: 341.2,
        artifactLabel: 'call.txt',
      },
    },
  ],
});

function renderBlock(c: FieldComparisonView, props: Partial<Parameters<typeof FieldBlock>[0]> = {}) {
  const onAction = vi.fn();
  const result = render(
    <FieldBlock
      definition={definition}
      comparison={c}
      value={String(c.formDisplay ?? '')}
      originalValue={String(c.formDisplay ?? '')}
      onAction={onAction}
      {...props}
    />,
  );
  return { ...result, onAction };
}

describe('mismatch (15 §13)', () => {
  it('applies the danger treatment to the whole field block', () => {
    const { container } = renderBlock(MISMATCH);
    const block = container.querySelector('.field-block');
    expect(block?.className).toContain('field-block--danger');
    expect(block?.getAttribute('data-severity')).toBe('FAILURE');
  });

  it('puts the error text inside the block, not in a detached panel', () => {
    renderBlock(MISMATCH);
    const block = document.querySelector('.field-block') as HTMLElement;
    expect(within(block).getByText('Entered 5; representative confirmed 8.')).toBeInTheDocument();
  });

  it('keeps the entered value visible and shows the supported value beside it', () => {
    renderBlock(MISMATCH);
    expect(screen.getByLabelText(/Authorization required after visit number/)).toHaveValue('5');
    expect(screen.getByText(/Supported value:/)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('marks the control invalid and links the message to it (09 §4)', () => {
    renderBlock(MISMATCH);
    const input = screen.getByLabelText(/Authorization required after visit number/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('-message');
    const message = document.getElementById(describedBy.split(' ')[0] as string);
    expect(message?.textContent).toBe('Entered 5; representative confirmed 8.');
  });

  it('announces the error to assistive technology (04 §8)', () => {
    renderBlock(MISMATCH);
    expect(screen.getByRole('alert')).toHaveTextContent('Entered 5; representative confirmed 8.');
  });

  it('shows the evidence excerpt with speaker and timestamp inside the block (09 §8)', () => {
    renderBlock(MISMATCH);
    expect(screen.getByText(/authorization is required after the eighth visit/)).toBeInTheDocument();
    expect(screen.getByText('Representative')).toBeInTheDocument();
    expect(screen.getByText('at 6:44')).toBeInTheDocument();
  });

  it('offers Apply supported value and emits a typed action (11 §10)', async () => {
    const { onAction } = renderBlock(MISMATCH);
    await userEvent.click(screen.getByRole('button', { name: 'Apply supported value' }));
    expect(onAction).toHaveBeenCalledWith({
      type: 'APPLY_SUPPORTED_VALUE',
      fieldKey: definition.key,
      value: '8',
    });
  });

  it('marks a provisional requirement rather than stating it as final (17 §18)', () => {
    renderBlock(MISMATCH);
    expect(screen.getByText(/provisional rule/)).toBeInTheDocument();
  });
});

describe('conflict (15 §13, 09 §5)', () => {
  it('uses the amber review treatment, not the danger treatment', () => {
    const { container } = renderBlock(CONFLICT);
    expect(container.querySelector('.field-block')?.className).toContain('field-block--review');
  });

  it('does NOT offer Apply supported value when no single safe value exists', () => {
    renderBlock(CONFLICT);
    expect(screen.queryByRole('button', { name: 'Apply supported value' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Review conflict' })).toBeInTheDocument();
  });

  it('shows every material candidate, not just a preferred one', () => {
    renderBlock(CONFLICT);
    expect(screen.getByText(/Member coinsurance is twenty percent/)).toBeInTheDocument();
    expect(screen.getByText(/Coinsurance shows thirty percent/)).toBeInTheDocument();
  });

  it('never displays a supported value it has not chosen', () => {
    renderBlock(CONFLICT);
    expect(screen.queryByText(/Supported value:/)).toBeNull();
  });
});

describe('match renders compactly (09 §6)', () => {
  it('does not expand into the full result region', () => {
    const { container } = renderBlock(
      comparison({ outcome: 'MATCH', severity: 'NONE', formDisplay: '8', message: 'Matches.' }),
    );
    expect(container.querySelector('.field-result')).toBeNull();
    expect(container.querySelector('.field-block')?.className).not.toContain('field-block--danger');
  });
});

describe('derived values are labeled, never matched (06 §10)', () => {
  it('discloses the formula', () => {
    renderBlock(
      comparison({
        outcome: 'DERIVED_SUPPORTED',
        severity: 'NONE',
        formDisplay: '1',
        supportedDisplay: '1',
        message: '1 was calculated from 20 and 19.',
        derivation: { formula: '20 − 19', ruleId: 'DERIVE-VISITS-USED-V1' },
        actions: ['VIEW_EVIDENCE'],
      }),
    );
    expect(screen.getByText('Formula: 20 − 19')).toBeInTheDocument();
  });
});

describe('payer unable to verify is never rendered as No (CASE-005)', () => {
  it('shows the payer-visibility wording', () => {
    renderBlock(
      comparison({
        outcome: 'PAYER_UNABLE_TO_VERIFY',
        severity: 'REVIEW',
        supportedDisplay: 'Payer unable to verify',
        message: 'The representative said this information was not visible on their side.',
        actions: ['EDIT_MANUALLY', 'BYPASS_WITH_REASON'],
      }),
    );
    expect(
      screen.getByText('The representative said this information was not visible on their side.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^No$/)).toBeNull();
  });
});

describe('correction history stays visible (15 §11)', () => {
  it('discloses the earlier value the representative corrected', () => {
    renderBlock(
      comparison({
        outcome: 'DERIVED_SUPPORTED',
        severity: 'NONE',
        formDisplay: '1',
        message: '1 was calculated from 20 and 19.',
        derivation: { formula: '20 − 19', ruleId: 'DERIVE-VISITS-USED-V1' },
        supersededCandidates: [
          {
            candidateId: 'x',
            rawValue: 'none used',
            evidence: {
              excerpt: 'It looks like no visits have been used so far this year.',
              timestampStart: 310.5,
            },
          },
        ],
        actions: [],
      }),
    );
    expect(screen.getByText(/Corrected during the call/)).toBeInTheDocument();
    expect(screen.getByText(/no visits have been used/)).toBeInTheDocument();
  });
});

describe('immutable original stays visible after an edit (ADR-006)', () => {
  it('shows the imported value alongside the edited one', () => {
    renderBlock(MISMATCH, { value: '8', originalValue: '5' });
    expect(screen.getByText(/Imported value:/)).toBeInTheDocument();
    expect(screen.getByText(/kept unchanged in history/)).toBeInTheDocument();
  });
});

describe('read-only historical mode (11 §10)', () => {
  it('renders no editable control', () => {
    renderBlock(MISMATCH, { readOnly: true });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Apply supported value' })).toBeNull();
  });
});

describe('select controls carry no substantive default (06 §18)', () => {
  it('offers an explicit unselected option rather than a business answer', () => {
    render(
      <FieldBlock
        definition={{
          ...definition,
          key: 'financial.copayApplies',
          label: 'Copay applies',
          control: 'select',
          dataType: 'categorical',
          options: [
            { value: 'YES', label: 'Yes' },
            { value: 'NO', label: 'No' },
            { value: 'UNKNOWN', label: 'Unknown', isUnknownFamily: true },
          ],
        }}
        comparison={comparison({ fieldKey: 'financial.copayApplies' })}
        value={null}
        originalValue={null}
        onAction={vi.fn()}
      />,
    );
    const select = screen.getByLabelText(/Copay applies/) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(within(select).getByText('Not recorded')).toBeInTheDocument();
    expect(within(select).getByText('Unknown')).toBeInTheDocument();
  });
});
