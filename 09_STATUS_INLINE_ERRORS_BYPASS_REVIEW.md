# Statuses, Inline Errors, Bypass, and Human Review
## US24 Solutions — React VOB Automation Blueprint

**Document:** `09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`
**Document order:** 10 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`08_EXTRACTION_NORMALIZATION_COMPARISON.md`](./08_EXTRACTION_NORMALIZATION_COMPARISON.md)
**Next:** [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define business statuses, field-state presentation, inline error wording, bypass governance, correction workflows, review, and finalization.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`08_EXTRACTION_NORMALIZATION_COMPARISON.md`](./08_EXTRACTION_NORMALIZATION_COMPARISON.md)
- [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)
- [`14_SECURITY_PRIVACY_ACCESSIBILITY.md`](./14_SECURITY_PRIVACY_ACCESSIBILITY.md)

## Authority and invariants

- Preserve source-derived facts and do not silently replace them with general assumptions.
- The client-supplied official VOB template controls the final report after sign-off.
- AI extracts evidence-backed candidates; deterministic rules calculate field and case outcomes.
- Original sources and original imported form values are immutable.
- Inline field highlighting is the primary error experience.
- PASSED, FAILED, and NEEDS REVIEW are the business outcomes.
- No visible login is included, but production still requires an approved controlled-access boundary.
- The final required, optional, conditional, and critical field matrix remains configurable.

## Source basis

- `US24_VOB_Generator_5.html` — current manual form, live preview, localStorage log, Excel export, and PDF generator.
- `VOB_SAMPLE (1).docx` — marked blank template and source for one-time/carrier-field observations.
- `VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf` — completed sample VOB and official-style visual reference.
- `CARSTEN UHC (AARA) (2).txt` — noisy call transcript with IVR content, ASR errors, corrections, conflicts, and timestamps.
- `US24_VOB_Transcript_Verification_Enhancement_Blueprint.md` — earlier enhancement blueprint and locked workflow baseline.
- US24 meeting summary dated August 6, 2026.
- Official framework, vendor, security, and accessibility research is indexed in file 17.

---

## 1. Workflow states versus audit outcomes

- DRAFT means the case or revision is editable and has not completed a valid verification run.
- UPLOADING means one or more source artifacts are transferring.
- PROCESSING means parsing, transcription, extraction, or comparison is active.
- READY means processing completed and the workspace can be reviewed.
- PASSED is a business audit outcome.
- FAILED is a business audit outcome.
- NEEDS REVIEW is a business audit outcome.
- FINALIZED means the selected revision and allowed outcome are locked for document generation.
- ARCHIVED removes the case from normal active lists without erasing governed history.
- Do not mix PROCESSING with FAILED; processing failure is an operational state with its own reason.

## 2. Field-state catalog

- MATCH means normalized entered and supported values agree.
- MISMATCH means they materially differ.
- MISSING_IN_FORM means the source supports a value but the completed form is blank.
- NOT_FOUND_IN_SOURCE means the form asserts a value not supported by permitted sources.
- CONFLICT_IN_SOURCE means multiple unresolved source candidates remain.
- LOW_CONFIDENCE means source or extraction quality is below the configured threshold.
- MASTER_DATA_SUPPORTED means a scoped approved master provides the value.
- DERIVED_SUPPORTED means an approved calculation provides the value.
- NOT_APPLICABLE means the field is conditionally outside scope.
- BYPASSED means a controlled exception exists.
- MANUALLY_APPROVED means an authorized resolution exists with explanation.
- UNKNOWN means the business fact is not known.
- PAYER_UNABLE_TO_VERIFY means the representative explicitly lacked visibility.

## 3. Overall status rules

- FAILED has highest precedence.
- NEEDS REVIEW has second precedence.
- PASSED is permitted only when no unresolved failure or review condition exists.
- A single critical mismatch can fail a case even when every other field matches.
- A high completion or match percentage cannot override criticality.
- A bypass can lead to PASSED, NEEDS REVIEW, or FAILED depending on field and reason configuration.
- A manual approval must recompute status and remain visible in history.
- Changing source, form revision, field rules, or master version invalidates a stale final result.

## 4. Red field-block specification

- Use for definite mismatch, missing required value, unsupported assertion, or invalid prohibited bypass.
- Apply a two-pixel danger border to the entire field block.
- Use a pale red background that maintains readable contrast.
- Display an error icon and text label.
- Keep the entered value visible in the control.
- Show the supported value directly below the control.
- Show the concise difference statement.
- Show source and evidence action.
- Show permitted resolution actions.
- Set `aria-invalid=true` on the relevant control.
- Associate the error message with `aria-describedby` or the approved equivalent.

## 5. Amber field-block specification

- Use for conflict, low confidence, ambiguous scope, unavailable fact, or review-requiring bypass.
- Apply a two-pixel amber border and pale amber background.
- Use `Needs review` text rather than vague AI language.
- Show every material candidate rather than only one preferred candidate.
- Show why the system could not choose safely.
- Offer `Review evidence`, `Edit`, and allowed bypass actions.
- Do not show `Apply supported value` when no single supported value exists.
- Amber fields prevent PASSED until resolved or approved by policy.

## 6. Neutral, green, blue, and derived states

- Neutral is the default unverified or editable field state.
- A subtle green check indicates MATCH without coloring the entire form.
- Blue identifies carrier-master or approved source-system provenance.
- A distinct info or violet treatment identifies DERIVED values and exposes the formula.
- Gray identifies NOT APPLICABLE or system-controlled values.
- Every state includes text or icon meaning and never relies on color alone.

## 7. Inline message templates

- Mismatch: `Entered {form}; representative confirmed {source}.`
- Missing: `Required field is blank; the call supports {source}.`
- Unsupported: `Entered value was not found in the permitted sources.`
- Conflict: `The call contains conflicting values: {candidateA} and {candidateB}.`
- Low confidence: `The value may be {candidate}, but the audio or transcript is unclear.`
- Payer unavailable: `The representative said this information was not visible on their side.`
- Master supported: `Filled from {carrierMasterVersion}; not stated in the call.`
- Derived: `{result} was calculated from {operandA} and {operandB}.`
- Conditional missing: `{dependentField} is required because {triggerField} is {triggerValue}.`
- Scope mismatch: `The value refers to {sourceScope}, while this field is {targetScope}.`

## 8. Evidence presentation inside the field

- Show a one- or two-line excerpt.
- Show speaker role rather than only raw speaker label.
- Show timestamp or page and cell location.
- Show source filename in a safe truncated form.
- Show confidence only when it helps explain review.
- Use `View full evidence` to open context in the evidence pane.
- Keep evidence text read-only.
- When multiple candidates exist, show each with source metadata.
- When evidence was deleted by retention policy, show that fact and preserve the audit reference.

## 9. Resolution actions

- Apply supported value creates a new form revision value with source lineage.
- Edit manually opens the control and requires provenance when the field was previously problematic.
- Review conflict opens all candidate evidence.
- Mark not applicable is available only when the field rule permits it.
- Bypass with reason opens the governed bypass dialog.
- Use carrier master is available only when a scoped active master matches.
- Revert restores the value from the prior revision but does not delete history.
- Next issue moves focus to the next unresolved field.
- Re-verify runs deterministic comparison against the selected revision.
- No action silently modifies the imported original form.

## 10. Bypass reason taxonomy

- NOT_APPLICABLE.
- PAYER_UNABLE_TO_VERIFY.
- NOT_DISCLOSED_DURING_CALL.
- DATA_UNAVAILABLE.
- USE_APPROVED_CARRIER_MASTER.
- TRANSCRIPT_QUALITY_INSUFFICIENT.
- CLIENT_APPROVED_EXCEPTION.
- SOURCE_SYSTEM_VALUE_ACCEPTED.
- OTHER_WITH_REQUIRED_NOTE.
- The visible wording is user-friendly and the enum remains stable.
- A generic Ignore reason is prohibited.

## 11. Bypass record

- Store case, version, revision, field key, reason, note, created time, and operator label.
- Store the value before bypass.
- Store relevant source evidence.
- Store rule version and resulting case consequence.
- Store whether the bypass requires later follow-up.
- Store approval metadata if a second review is required.
- Display the bypass on the field, review queue, history, and QA report.
- Never remove the field from history.

## 12. Bypass policy examples

- A truly non-applicable optional field may permit PASSED.
- Payer unable to verify a critical coordination field normally forces NEEDS REVIEW.
- Not discussed during the call does not automatically permit PASSED.
- Use approved carrier master may pass only for fields configured as master-eligible with matching scope.
- Transcript quality insufficient on a critical field forces NEEDS REVIEW or FAILED.
- Client-approved exception requires a note and configured authority.
- Other always requires a note and should normally force NEEDS REVIEW.
- The final consequence matrix remains pending client approval.

## 13. Manual correction workflow

- Select Edit manually from the field block.
- Keep original imported and source-supported values visible.
- Enter the corrected canonical value.
- Choose or describe provenance.
- Require explanation for overriding a clear representative-confirmed value.
- Save as a new revision.
- Re-run verification.
- Show `Changed after audit` on the field.
- Keep before, after, reason, and time in history.

## 14. Review workflow without visible login

- The interface does not show a sign-in page.
- Capture a configured workstation or operator label where the deployment can reliably provide it.
- If the client uses a typed `Verified by` value, label it as operational metadata rather than strong authentication.
- A controlled network, upstream gateway, managed device, or kiosk boundary is required for production access.
- Review and finalization actions still record available actor context, device context where approved, time, and correlation ID.
- The client must approve who is allowed to make manual approvals.
- Do not imply non-repudiation when the platform lacks reliable identity.

## 15. Re-verification and status freshness

- Every form change marks the last comparison stale.
- Every source replacement marks extraction and comparison stale.
- Every master-data version change affects only new runs unless an explicit re-evaluation is requested.
- The Verify action snapshots the revision and rule versions.
- The header shows `Changes not verified` until the new run completes.
- The prior result remains visible in history but not as the current result.
- Finalization is disabled when the current revision has no fresh result.

## 16. Finalization

- Finalization selects one form revision, one comparison run, one template version, and one result.
- PASSED can generate the clean final VOB.
- FAILED cannot generate a clean final VOB.
- NEEDS REVIEW can generate only a marked draft or internal QA report unless client policy explicitly permits an approved override.
- Show a confirmation summarizing unresolved items and document consequence.
- Lock the finalized revision from direct edits.
- A later correction creates a new revision and new finalization rather than mutating the old document.
- Store document checksum and generation metadata.

## 17. Saved-list behavior

- Show PASSED, FAILED, and NEEDS REVIEW as prominent text badges.
- Show processing failure separately from audit outcome.
- Show issue counts and highest-severity reason.
- Show bypass count.
- Show stale-result indicator when the latest revision has not been re-verified.
- Show final PDF availability and draft watermark state.
- Filter and sort by status, severity, age, and verification date.
- Opening the row lands on the first unresolved field when appropriate.

## 18. Accessibility and focus

- When verification finishes, announce the overall result and issue count.
- Do not move focus unexpectedly to the top of the page.
- Provide a `Go to first issue` action.
- When an issue is resolved, announce the field and new state.
- Error descriptions remain associated after re-render.
- The next-issue control follows document order.
- Dialogs return focus to the invoking field.
- Evidence highlights do not rely on color alone.
- Reduced-motion preferences disable attention animations.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `DRAFT means the case or revision is editable and has not completed a valid verification run` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `UPLOADING means one or more source artifacts are transferring` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `PROCESSING means parsing, transcription, extraction, or comparison is active` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `READY means processing completed and the workspace can be reviewed` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `PASSED is a business audit outcome` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `FAILED is a business audit outcome` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `NEEDS REVIEW is a business audit outcome` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `FINALIZED means the selected revision and allowed outcome are locked for document generation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `ARCHIVED removes the case from normal active lists without erasing governed history` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `MATCH means normalized entered and supported values agree` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-011 — Domain review: confirm `MISMATCH means they materially differ` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-012 — QA verification: confirm `MISSING_IN_FORM means the source supports a value but the completed form is blank` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-013 — Accessibility review: confirm `NOT_FOUND_IN_SOURCE means the form asserts a value not supported by permitted sources` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-014 — Security review: confirm `CONFLICT_IN_SOURCE means multiple unresolved source candidates remain` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-015 — Regression protection: confirm `LOW_CONFIDENCE means source or extraction quality is below the configured threshold` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-016 — Client acceptance: confirm `MASTER_DATA_SUPPORTED means a scoped approved master provides the value` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-017 — Implementation: confirm `DERIVED_SUPPORTED means an approved calculation provides the value` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-018 — Design review: confirm `NOT_APPLICABLE means the field is conditionally outside scope` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-019 — Domain review: confirm `BYPASSED means a controlled exception exists` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-020 — QA verification: confirm `MANUALLY_APPROVED means an authorized resolution exists with explanation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-021 — Accessibility review: confirm `UNKNOWN means the business fact is not known` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-022 — Security review: confirm `PAYER_UNABLE_TO_VERIFY means the representative explicitly lacked visibility` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-023 — Regression protection: confirm `FAILED has highest precedence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-024 — Client acceptance: confirm `NEEDS REVIEW has second precedence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-025 — Implementation: confirm `PASSED is permitted only when no unresolved failure or review condition exists` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-026 — Design review: confirm `A single critical mismatch can fail a case even when every other field matches` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-027 — Domain review: confirm `A high completion or match percentage cannot override criticality` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-028 — QA verification: confirm `A bypass can lead to PASSED, NEEDS REVIEW, or FAILED depending on field and reason configuration` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-029 — Accessibility review: confirm `A manual approval must recompute status and remain visible in history` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-030 — Security review: confirm `Changing source, form revision, field rules, or master version invalidates a stale final result` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-031 — Regression protection: confirm `Use for definite mismatch, missing required value, unsupported assertion, or invalid prohibited bypass` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-032 — Client acceptance: confirm `Apply a two-pixel danger border to the entire field block` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
