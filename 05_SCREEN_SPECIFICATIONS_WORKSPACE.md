# Screen Specifications for the VOB Operations Workspace
## US24 Solutions — React VOB Automation Blueprint

**Document:** `05_SCREEN_SPECIFICATIONS_WORKSPACE.md`
**Document order:** 6 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
**Next:** [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Specify every React screen, panel, state, action, and responsive behavior needed for a complete, non-blank US24 implementation.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
- [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)
- [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)

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

## 1. Global app shell

- The top bar contains the US24 wordmark, `Verification of Benefits`, environment label, system-health dot, Help, and export shortcut where relevant.
- The desktop navigation rail contains New Verification, Records, Review Queue, Carrier Master, Templates, and System.
- The content header contains route title, context, and primary action.
- The shell persists during loading and error states.
- The no-login requirement means there is no profile menu; an optional workstation or operator label is shown as operational metadata.
- A global processing drawer lists active jobs and permits navigation to their cases.
- A global announcement region reports completed uploads, processing, and saves.

## 2. New Verification landing screen

- Show two large but compact mode cards: `Auto-fill a blank VOB` and `Audit a completed VOB`.
- Each card explains required sources, output, and when to choose it.
- Show a recent drafts rail with patient, payer, mode, last updated time, and resume action.
- Show supported-source chips and a link to upload guidance.
- Show a `Use previous VOB` entry for repeat verification.
- Show a disabled-looking but explanatory `Import from RingCentral` option until configured, not a dead control.
- Use realistic sample content in the prototype so the page never appears empty.
- Primary action changes to `Start auto-fill` or `Start audit` after selection.

## 3. Source Setup screen

- Use a case header with mode, temporary case ID, and current stage.
- Show a Call Source card with tabs for Audio, Transcript File, Paste Text, and RingCentral.
- Show a Completed VOB card only in audit mode.
- Show a Patient or Previous Record card for optional prefill and duplicate search.
- Show an Official Template selector in auto-fill mode.
- Each upload card contains dropzone, browse button, allowed formats, maximum policy, checksum state, and remove or replace action.
- Pasted transcript area shows character count and preserves speaker and timestamp formatting.
- Use `Validate sources` before `Begin processing`.
- Display source-specific errors inside the source card.

## 4. Upload states

- Idle state shows formats and privacy warning.
- Dragging state uses a navy outline and descriptive text.
- Validating state shows filename, size, MIME check, and checksum progress.
- Uploading state shows bytes, percentage, current part, pause or cancel where supported.
- Uploaded state shows a success icon and immutable artifact label.
- Rejected state shows the exact reason and replacement action.
- Image-only PDF state explains that OCR is not enabled or routes to review when approved.
- Duplicate artifact state shows the previous case or recording that uses the same checksum.
- Interrupted state shows Resume Upload rather than starting from zero.

## 5. Processing screen

- Show a seven-stage vertical or horizontal timeline.
- Each stage shows Pending, Active, Complete, Warning, Failed, or Skipped.
- Show source cards with independent processing state.
- Show audio duration, transcript segment count, document pages or sheets, and extracted candidate count as they become available.
- Show a live event log using non-sensitive operational messages.
- Show `Open partial transcript` when transcription is sufficiently available.
- Show `Retry failed stage`, `Cancel processing`, and `Return to records`.
- Do not show a fake fixed countdown.
- When complete, automatically offer `Open review workspace` and preserve a visible completion summary.

## 6. Case header in workspace

- Show patient placeholder or resolved name, payer, mode, verification date, base record, version, and status.
- Show completion count, mismatch count, review count, bypass count, and last-saved time.
- Show `Verify`, `Save draft`, `Open review`, and status-gated PDF actions.
- Show source icons for audio, transcript, completed form, prior VOB, and carrier master.
- Show a compact processing warning if any source stage finished with degraded quality.
- Keep this header sticky below the global top bar.

## 7. Source pane

- Tabs are Transcript, Completed Form, Previous VOB, and Source Files as applicable.
- Transcript tab provides search, speaker filter, relevance filter, and timestamp navigation.
- Completed Form tab shows PDF pages or Excel sheet grid with mapped-field overlays.
- Previous VOB tab shows the prior canonical values and date.
- Source Files tab shows checksums, parsing status, download permission, and lineage.
- Selecting evidence from the form scrolls and highlights the source.
- Selecting source text shows the fields that cite it.
- An audio mini-player appears when timestamps and audio are available.

## 8. Canonical form pane

- Use a sticky section navigator with Patient, Insurance, Financials, Visits and Authorization, Claims and Call, Secondary, and Summary.
- Each section header shows completed, matched, failed, and review counts.
- Render fields from the registry defined in file 06.
- Use two columns on wide form panes, one column when compressed.
- Do not hide non-applicable fields; collapse them behind an explicit status row when appropriate.
- Show source chips and as-of dates.
- Keep imported values visually distinct until first verification.
- Use inline field blocks from file 09.
- Add `Next issue` and `Previous issue` keyboard-accessible controls.

## 9. Evidence and preview pane

- Tabs are Evidence, Comparison, History, and PDF Preview.
- Evidence shows full excerpt, speaker, timestamp or page, source artifact, confidence, and neighboring context.
- Comparison shows raw form value, normalized form value, raw candidate values, chosen supported value, and rule explanation.
- History shows original, revisions, bypass decisions, and verification runs for the selected field.
- PDF Preview shows the selected revision rendered with the client template.
- The pane opens automatically when `View evidence` is invoked.
- At narrow widths it becomes a right drawer or full-screen tab.

## 10. Review-only screen

- Filter to unresolved, failed, low-confidence, bypassed, or changed fields.
- Group issues by severity and form section.
- Keep the actual field controls visible rather than replacing them with a detached issue table.
- Show a top summary for orientation, but resolution occurs inside each field block.
- Provide `Resolve and next` and `Skip for now`.
- Show why the current overall status is FAILED or NEEDS REVIEW.
- Require re-verification before finalization.
- Show a final review checklist when zero unresolved issues remain.

## 11. Records screen

- Use a dense table on desktop and record cards on mobile.
- Columns include status, patient, DOB, payer, policy, service, verification date, version, mismatches, review items, bypasses, source, call reference, and updated time.
- Use filter chips for status and date plus an advanced filter drawer.
- Search supports patient name, policy, group, payer, call reference, and record ID.
- Rows show processing failures and drafts rather than hiding them.
- Actions include Open, Resume, Compare versions, Download allowed document, and Archive.
- Do not expose Delete as a routine row action; use governed archive behavior.
- Provide saved views such as Needs Review Today and Failed Critical.

## 12. Base record detail screen

- Header shows patient identity, policy identity, payer, service, and duplicate-risk indicators.
- Current snapshot summarizes eligibility, network, financial responsibility, visits, authorization, and latest status.
- Version timeline shows verification date, source call, status, operator label, and changed-field count.
- A delta panel compares the selected version to the prior version.
- Documents panel lists final PDFs, QA reports, source files, and template versions.
- Audit panel lists revisions, bypasses, finalizations, and master-data use.
- Create New Verification starts a repeat-VOB flow with stable fields prefilled.

## 13. Review Queue screen

- Default tabs are Needs Review, Failed, Processing Problems, and Bypass Follow-up.
- Each row shows highest-severity issue and age.
- Filters include payer, service, field group, confidence, source type, and date.
- Bulk actions are limited to safe operational actions such as assign label or export IDs; do not bulk approve benefits.
- Opening a queue item returns to the field-focused review screen.
- A queue summary shows counts but does not replace record-level evidence.

## 14. Carrier Master screens

- List screen shows carrier, plan or line of business, state, network, active version, effective date, and records using it.
- Detail screen shows scope before values.
- Version editor contains payer phone, payer ID, claim address, TFL rules, authorization method, authorization phone or portal, terminology aliases, and notes.
- A proposal comparison shows active versus proposed values.
- Activation requires an effective date and change reason.
- Usage view links back to VOB versions that inherited each master value.
- A contradiction from a transcript creates a proposal or review task, not a silent update.

## 15. Template Management screen

- Show template ID, client label, file type, version, effective date, mapping completeness, and last validation.
- Template detail shows page preview with field anchors or DOCX placeholders.
- Mapping table connects canonical field keys to template anchors.
- Validation checks overflow, missing anchors, repeated fields, font fit, and extra pages.
- A template can be Draft, Validated, Active, or Retired.
- Only one approved active template per intended scope is selected automatically.
- The client-supplied official template remains the authority.

## 16. System screen

- Show API, database, object storage, queue, transcription provider, extraction provider, PDF worker, and RingCentral adapter health.
- Show non-sensitive job throughput, retry count, oldest queued job, and recent failures.
- Show configured maximum file sizes and supported formats.
- Show current field-rule version, keyword-dictionary version, and active template versions.
- Show retention-policy summary and next cleanup run.
- Do not expose API keys, raw PHI logs, or full transcript content.
- Provide safe retry and diagnostic export actions.

## 17. Dialogs and confirmations

- Bypass dialog requires reason and optional or mandatory note according to reason.
- Manual override dialog requires source selection and explanation.
- Finalize dialog shows status, unresolved count, selected revision, and document consequence.
- Archive dialog explains recoverability and retention.
- Replace source dialog warns that reprocessing creates a new run.
- Merge duplicate dialog compares base-record keys and never auto-merges.
- Cancel-processing dialog explains which completed artifacts are retained.
- All dialogs have explicit primary and secondary actions and accessible focus behavior.

## 18. No-blank-state rule

- Every route has populated demo fixtures for the prototype.
- Empty Records explains how records are created and offers New Verification.
- Empty Review Queue explains that no unresolved cases match current filters and offers Clear filters.
- No Carrier Master shows a starter import or create action.
- No Templates shows the required official-template setup steps.
- Processing failure shows retry and source-replacement actions.
- API failure shows retry, correlation ID, and safe navigation.
- Unknown route shows navigation back to New Verification and Records.
- Skeletons preserve the final structure rather than displaying a blank white panel.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `The top bar contains the US24 wordmark, `Verification of Benefits`, environment label, system-health dot, Help, and export shortcut where relevant` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `The desktop navigation rail contains New Verification, Records, Review Queue, Carrier Master, Templates, and System` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `The content header contains route title, context, and primary action` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `The shell persists during loading and error states` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `A global processing drawer lists active jobs and permits navigation to their cases` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `A global announcement region reports completed uploads, processing, and saves` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Show two large but compact mode cards: `Auto-fill a blank VOB` and `Audit a completed VOB`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Each card explains required sources, output, and when to choose it` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Show a recent drafts rail with patient, payer, mode, last updated time, and resume action` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Show supported-source chips and a link to upload guidance` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-011 — Domain review: confirm `Show a `Use previous VOB` entry for repeat verification` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-012 — QA verification: confirm `Show a disabled-looking but explanatory `Import from RingCentral` option until configured, not a dead control` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-013 — Accessibility review: confirm `Use realistic sample content in the prototype so the page never appears empty` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-014 — Security review: confirm `Primary action changes to `Start auto-fill` or `Start audit` after selection` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-015 — Regression protection: confirm `Use a case header with mode, temporary case ID, and current stage` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-016 — Client acceptance: confirm `Show a Call Source card with tabs for Audio, Transcript File, Paste Text, and RingCentral` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-017 — Implementation: confirm `Show a Completed VOB card only in audit mode` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-018 — Design review: confirm `Show a Patient or Previous Record card for optional prefill and duplicate search` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-019 — Domain review: confirm `Show an Official Template selector in auto-fill mode` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-020 — QA verification: confirm `Each upload card contains dropzone, browse button, allowed formats, maximum policy, checksum state, and remove or replace action` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-021 — Accessibility review: confirm `Pasted transcript area shows character count and preserves speaker and timestamp formatting` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-022 — Security review: confirm `Use `Validate sources` before `Begin processing`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-023 — Regression protection: confirm `Display source-specific errors inside the source card` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-024 — Client acceptance: confirm `Idle state shows formats and privacy warning` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-025 — Implementation: confirm `Dragging state uses a navy outline and descriptive text` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-026 — Design review: confirm `Validating state shows filename, size, MIME check, and checksum progress` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-027 — Domain review: confirm `Uploading state shows bytes, percentage, current part, pause or cancel where supported` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-028 — QA verification: confirm `Uploaded state shows a success icon and immutable artifact label` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-029 — Accessibility review: confirm `Rejected state shows the exact reason and replacement action` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-030 — Security review: confirm `Image-only PDF state explains that OCR is not enabled or routes to review when approved` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-031 — Regression protection: confirm `Duplicate artifact state shows the previous case or recording that uses the same checksum` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-032 — Client acceptance: confirm `Interrupted state shows Resume Upload rather than starting from zero` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-033 — Implementation: confirm `Show a seven-stage vertical or horizontal timeline` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-034 — Design review: confirm `Each stage shows Pending, Active, Complete, Warning, Failed, or Skipped` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-035 — Domain review: confirm `Show source cards with independent processing state` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-036 — QA verification: confirm `Show audio duration, transcript segment count, document pages or sheets, and extracted candidate count as they become available` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-037 — Accessibility review: confirm `Show a live event log using non-sensitive operational messages` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-038 — Security review: confirm `Show `Open partial transcript` when transcription is sufficiently available` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-039 — Regression protection: confirm `Show `Retry failed stage`, `Cancel processing`, and `Return to records`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-040 — Client acceptance: confirm `Do not show a fake fixed countdown` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-041 — Implementation: confirm `When complete, automatically offer `Open review workspace` and preserve a visible completion summary` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-042 — Design review: confirm `Show patient placeholder or resolved name, payer, mode, verification date, base record, version, and status` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-043 — Domain review: confirm `Show completion count, mismatch count, review count, bypass count, and last-saved time` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-044 — QA verification: confirm `Show `Verify`, `Save draft`, `Open review`, and status-gated PDF actions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-045 — Accessibility review: confirm `Show source icons for audio, transcript, completed form, prior VOB, and carrier master` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-046 — Security review: confirm `Show a compact processing warning if any source stage finished with degraded quality` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-047 — Regression protection: confirm `Keep this header sticky below the global top bar` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-048 — Client acceptance: confirm `Tabs are Transcript, Completed Form, Previous VOB, and Source Files as applicable` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-049 — Implementation: confirm `Transcript tab provides search, speaker filter, relevance filter, and timestamp navigation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-050 — Design review: confirm `Completed Form tab shows PDF pages or Excel sheet grid with mapped-field overlays` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-051 — Domain review: confirm `Previous VOB tab shows the prior canonical values and date` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-052 — QA verification: confirm `Source Files tab shows checksums, parsing status, download permission, and lineage` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
