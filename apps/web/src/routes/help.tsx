/**
 * Help — 03 §2: "`/help` shows field-state meanings, upload rules, and workflow
 * guidance."
 *
 * The wording here follows 04 §14 content standards: "Needs review" rather than
 * "AI uncertain", "Supported value" rather than "AI answer", and "Payer unable
 * to verify" instead of converting the answer to No.
 */

import { Card } from '@us24/ui';

const FIELD_STATES: { state: string; meaning: string; whatToDo: string }[] = [
  {
    state: 'Match',
    meaning: 'The value you entered and the value the call supports agree once both are normalized.',
    whatToDo: 'Nothing. Formatting differences such as $20 and "twenty dollars" are not mismatches.',
  },
  {
    state: 'Mismatch',
    meaning: 'The call clearly supports a different value from the one recorded.',
    whatToDo:
      'Apply the supported value, or correct it manually and say where your value came from. On a critical field this fails the case until resolved.',
  },
  {
    state: 'Missing required value',
    meaning: 'The call supports a value but the form is blank.',
    whatToDo: 'Apply the supported value, or record why it should stay blank.',
  },
  {
    state: 'Not found in sources',
    meaning:
      'The form asserts something no permitted source supports. That is not the same as the call contradicting it.',
    whatToDo:
      'Supply another approved source — a scoped carrier master or a source-system record — or bypass with a reason.',
  },
  {
    state: 'Needs review — conflicting values',
    meaning: 'The call contains more than one value and nothing in it corrects the others.',
    whatToDo:
      'Open the evidence for each candidate and decide. There is deliberately no "apply" button, because there is no single safe value to apply.',
  },
  {
    state: 'Needs review — unclear source',
    meaning: 'A value was heard but the audio or transcript quality was too low to rely on it.',
    whatToDo: 'Check the evidence. If it cannot be confirmed, bypass with a reason or re-verify.',
  },
  {
    state: 'Payer unable to verify',
    meaning:
      'The representative said they could not see this information. This is never recorded as "No".',
    whatToDo:
      'Confirm elsewhere if it matters, or bypass with the payer-unable-to-verify reason. The case will still need review.',
  },
  {
    state: 'From carrier master',
    meaning:
      'A scoped, effective-dated carrier master supplied this value; it was not stated on this call.',
    whatToDo: 'Check that the master scope matches this case — carrier, plan, state, network and service.',
  },
  {
    state: 'Derived calculation',
    meaning:
      'The value was calculated from other clear values, such as out-of-pocket met from maximum minus remaining.',
    whatToDo:
      'The formula is shown beside the value. A derived value is never reported as a match, because the call did not state it directly.',
  },
  {
    state: 'Bypassed',
    meaning: 'A recorded exception with a reason and a consequence for the case result.',
    whatToDo: 'Bypasses stay visible on the field, in the queue, in history and in the QA report.',
  },
];

export function HelpRoute(): React.JSX.Element {
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Help</h1>
          <p className="page__lede">
            What each field state means, what the system will and will not decide for you, and the
            rules that govern documents.
          </p>
        </div>
      </header>

      <Card title="How a result is decided">
        <p className="meta">
          Extraction finds candidate values in the call and records the exact passage, speaker and
          timestamp for each one. It never decides whether a field passes. Normalization,
          comparison, requiredness, criticality, bypass consequence and the overall result are all
          deterministic rules with a version stamped on every run, so the same inputs always give
          the same answer and that answer can be explained.
        </p>
        <p className="meta">
          Precedence is fixed: any failure makes the case failed; otherwise any unresolved review
          item makes it need review; only a case with neither can pass. A high match percentage
          never overrides a single critical problem.
        </p>
      </Card>

      <Card title="Field states">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>State</th>
                <th>What it means</th>
                <th>What to do</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_STATES.map((entry) => (
                <tr key={entry.state}>
                  <td style={{ whiteSpace: 'normal', minWidth: 180 }}>
                    <strong>{entry.state}</strong>
                  </td>
                  <td style={{ whiteSpace: 'normal', minWidth: 260 }}>{entry.meaning}</td>
                  <td style={{ whiteSpace: 'normal', minWidth: 260 }}>{entry.whatToDo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="What the system will never do">
        <ul className="stack stack--1" style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
          <li className="meta">Treat a blank answer as "No".</li>
          <li className="meta">
            Turn "the payer cannot see secondary coverage" into "no secondary coverage".
          </li>
          <li className="meta">
            Infer 100% coverage from no copay and no coinsurance — a deductible, exclusions,
            authorisation or visit limits can all still create patient responsibility.
          </li>
          <li className="meta">Pre-select a network status, service type or yes/no answer.</li>
          <li className="meta">Take a benefit fact from a filename.</li>
          <li className="meta">
            Accept a value spoken only inside a caller&rsquo;s question as though the representative
            confirmed it.
          </li>
          <li className="meta">
            Pick the last number spoken when two conflict, without correction language linking them.
          </li>
          <li className="meta">Drop a leading zero from a group, policy or reference identifier.</li>
          <li className="meta">Overwrite an imported value or a finalized historical result.</li>
        </ul>
      </Card>

      <Card title="Upload rules">
        <ul className="stack stack--1" style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
          <li className="meta">
            Transcripts: TXT, DOCX, text-based PDF, CSV, XLSX or pasted text. Speaker labels and
            timestamps are preserved exactly.
          </li>
          <li className="meta">
            Completed VOBs: text-based PDF or Excel. An image-only PDF is detected and reported
            rather than silently producing a blank form.
          </li>
          <li className="meta">
            Audio: not enabled in this build. Sending call recordings to a transcription provider
            requires vendor approval and a signed agreement first.
          </li>
          <li className="meta">
            Uploaded files are stored privately on the server. Nothing sensitive is kept in your
            browser.
          </li>
        </ul>
      </Card>

      <Card title="Documents">
        <ul className="stack stack--1" style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
          <li className="meta">A passed verification can produce a clean final VOB.</li>
          <li className="meta">
            A failed verification cannot. It produces an internal QA report and a clearly marked
            failed draft.
          </li>
          <li className="meta">
            A verification needing review produces a marked draft and a QA report, never a clean
            final.
          </li>
          <li className="meta">
            Editing a field makes the last result stale. Finalizing is blocked until you re-verify,
            so a document always matches the result printed on it.
          </li>
        </ul>
      </Card>

      <Card title="Access and attribution">
        <p className="meta">
          This version has no sign-in screen, by request. The workstation label shown in the top bar
          is operational metadata and is not authentication — it should not be relied on to prove
          who performed an action. Production deployment still requires an approved controlled-access
          boundary in front of the application.
        </p>
      </Card>
    </div>
  );
}
