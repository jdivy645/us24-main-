# Information Architecture and End-to-End User Flows
## US24 Solutions — React VOB Automation Blueprint

**Document:** `03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`
**Document order:** 4 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
**Next:** [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define the React website's routes, navigation, page hierarchy, responsive workspace, and complete user flows for every supported operational path.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`01_PRODUCT_VISION_SCOPE_AND_SUCCESS.md`](./01_PRODUCT_VISION_SCOPE_AND_SUCCESS.md)
- [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)

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

## 1. Primary navigation model

- Use a persistent US24 top bar with the logo, product label `Verification of Benefits`, system health indicator, and help entry.
- Use a left navigation rail on desktop for New Verification, Records, Review Queue, Carrier Master, Templates, and System.
- Collapse the rail to icons at medium widths and to a bottom or drawer navigation at narrow widths.
- Keep the current visual identity but replace the simple two-tab structure with task-oriented navigation.
- The default route opens New Verification because it is the highest-frequency task.
- Show processing and review counts beside relevant navigation items.
- Do not show account, profile, sign-in, or sign-out controls in version one.
- Preserve the operator's unfinished draft when navigating between workspace routes.

## 2. Route map

- `/` redirects to `/verifications/new`.
- `/verifications/new` creates or resumes an unsaved source-setup draft.
- `/verifications/:caseId/setup` shows source selection and upload state.
- `/verifications/:caseId/processing` shows asynchronous job progress and recovery.
- `/verifications/:caseId/workspace` shows transcript, canonical form, evidence, and preview.
- `/verifications/:caseId/review` focuses only unresolved fields and resolutions.
- `/records` shows all base records and verification versions.
- `/records/:recordId` shows the patient-policy-service overview and timeline.
- `/records/:recordId/versions/:versionId` opens a historical immutable verification.
- `/review` shows FAILED and NEEDS REVIEW queues.
- `/carriers` shows versioned carrier and plan masters.
- `/carriers/:carrierId` shows master details and effective versions.
- `/templates` shows official template versions and mapping status.
- `/system` shows parser, queue, storage, provider, and integration health.
- `/help` shows field-state meanings, upload rules, and workflow guidance.

## 3. New verification flow

- Start with a mode selector containing `Auto-fill a blank VOB` and `Audit a completed VOB`.
- Ask for the call source first: audio, transcript document, pasted transcript, or future RingCentral import.
- For audit mode, require a completed VOB PDF or Excel source before verification can begin.
- For auto-fill mode, select the approved official template and optionally import patient or previous-VOB data.
- Show accepted formats and size guidance before selection.
- Validate sources immediately and explain unsupported or image-only content inline.
- Create the case only after the user confirms the source set.
- Navigate to processing while preserving uploaded source cards and checksums.
- After processing, open the workspace with every section populated by values, explicit blanks, or review states.

## 4. Automatic filling flow

- Create an immutable audio or transcript artifact.
- Parse or transcribe the call.
- Classify speaker roles and irrelevant segments.
- Extract structured evidence candidates.
- Prefill patient and carrier values from approved sources.
- Resolve values into the canonical form without marking them as user-confirmed.
- Render low-confidence and conflicting fields in amber.
- Require the operator to review unresolved fields and source provenance.
- Run deterministic validation when the operator selects Verify.
- Allow corrections that create a new revision.
- Generate the clean final PDF only after a permitted outcome.

## 5. Completed-form audit flow

- Import the completed PDF or Excel and map it into the canonical field registry.
- Preserve the imported artifact and original mapped values.
- Parse or transcribe the call source independently.
- Compare normalized original form values against source-supported values.
- Render every mismatch or missing required field directly in its form block.
- Show an evidence button beside transcript-derived supported values.
- Permit `Apply supported value`, `Edit manually`, or `Bypass with reason` according to field rules.
- Re-run comparison after each resolution without losing the original audit result.
- Store initial and final outcomes as separate verification runs.

## 6. Processing flow

- Display a stage timeline: Upload, Validate, Parse or Transcribe, Identify Speakers, Extract Facts, Compare, Prepare Workspace.
- Show each source artifact independently so one failed file does not hide successful files.
- Show uploaded bytes and part progress for large files.
- Show elapsed time without promising a fixed remaining time.
- Allow safe cancellation before final comparison.
- Allow retry of only the failed stage or failed audio chunk.
- Explain whether failure is recoverable, requires another file, or requires manual entry.
- Provide a `Continue with available sources` action only when business rules permit.
- Keep the case visible in Records even if processing is interrupted.

## 7. Three-pane review workspace

- The left pane contains source navigation, transcript search, speaker filters, timestamps, and document pages.
- The center pane contains the canonical VOB form and is the primary editing surface.
- The right pane contains evidence details, comparison explanation, previous-version delta, and live PDF preview tabs.
- Allow each pane to collapse independently.
- Use a minimum comfortable center-pane width and move the right pane into a drawer at smaller desktop widths.
- Use a single-column task sequence on tablet and mobile, with sticky section navigation.
- Keep the case header and status visible while scrolling.
- Use section completion and issue counts rather than one giant form progress bar.

## 8. Transcript interaction flow

- Search transcript text without modifying evidence.
- Filter by representative, caller, IVR, or unknown speaker.
- Toggle irrelevant segments for context.
- Select a field to jump to its primary evidence.
- Select a transcript segment to see fields that cite it.
- Play the matching audio range when audio exists.
- Show corrected and conflicting candidate chains.
- Never allow transcript edits to overwrite the original artifact.
- Permit a separate corrected transcript annotation with full history.

## 9. Inline field-resolution flow

- Focus enters the field input, not a detached issue card.
- The error panel inside the block shows entered value, supported value, reason, source, and confidence.
- `Apply supported value` copies the normalized value into a new revision.
- `Edit manually` leaves evidence visible and requires a source or explanation.
- `Bypass` opens a reason dialog scoped to the field.
- `View evidence` opens the right pane and highlights the source location.
- After resolution, keep a small history indicator showing the field changed.
- Re-verification updates the block status without a full page refresh.
- Keyboard users can move to the next unresolved field.

## 10. Repeated VOB flow

- Search for an existing patient, policy, or base record before creating a new record.
- Show possible duplicates with clear matching dimensions.
- Allow creating a new verification version under the selected base record.
- Prefill stable values from the prior version with source labels.
- Mark dynamic accumulator fields as `Requires current-call confirmation`.
- After processing, show previous, current, and delta values.
- Do not overwrite prior versions.
- Allow a new base record only after the user dismisses or resolves duplicate candidates.

## 11. Records and history flow

- The Records page defaults to recent verifications with non-empty realistic rows.
- Filter by status, processing state, payer, service, verification date, issue count, and operator label.
- Search patient name, policy ID, group ID, call reference, or record ID.
- Open the base record to see demographic summary, policy summary, current snapshot, and version timeline.
- Open a historical version in read-only mode.
- Compare any two versions at field level.
- Download only documents that the version is permitted to expose.
- Resume DRAFT, failed-processing, or unresolved review work.

## 12. Carrier master flow

- Search a carrier or plan before creating a new master.
- Show scope dimensions before values so users understand applicability.
- Create a proposed version rather than editing the active version in place.
- Map reusable fields to canonical VOB fields.
- Set effective-from and optional effective-through dates.
- Show which VOB records used a master version.
- Require explicit activation of a proposed version.
- When a call contradicts master data, create a review proposal rather than silently updating the master.

## 13. Responsive and recovery behavior

- At narrow widths, source, form, evidence, and preview become ordered tabs with an always-visible status summary.
- Sticky actions must not cover the focused input or mobile keyboard.
- Tables become card rows or horizontally scroll within a labeled region.
- Large transcript excerpts wrap without expanding the entire page width.
- Draft state survives refresh through server-side case state rather than sensitive localStorage.
- After network loss, show last synchronized time and retry mutations safely.
- After provider failure, preserve uploads and completed stages.
- After a browser crash, reopen the case from Records.
- No route may render a blank page; every loading state has context, progress, and a safe next action.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Use a persistent US24 top bar with the logo, product label `Verification of Benefits`, system health indicator, and help entry` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Use a left navigation rail on desktop for New Verification, Records, Review Queue, Carrier Master, Templates, and System` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `Collapse the rail to icons at medium widths and to a bottom or drawer navigation at narrow widths` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `Keep the current visual identity but replace the simple two-tab structure with task-oriented navigation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `The default route opens New Verification because it is the highest-frequency task` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Show processing and review counts beside relevant navigation items` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Do not show account, profile, sign-in, or sign-out controls in version one` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Preserve the operator's unfinished draft when navigating between workspace routes` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm ``/` redirects to `/verifications/new`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm ``/verifications/new` creates or resumes an unsaved source-setup draft` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-011 — Domain review: confirm ``/verifications/:caseId/setup` shows source selection and upload state` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-012 — QA verification: confirm ``/verifications/:caseId/processing` shows asynchronous job progress and recovery` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-013 — Accessibility review: confirm ``/verifications/:caseId/workspace` shows transcript, canonical form, evidence, and preview` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-014 — Security review: confirm ``/verifications/:caseId/review` focuses only unresolved fields and resolutions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-015 — Regression protection: confirm ``/records` shows all base records and verification versions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-016 — Client acceptance: confirm ``/records/:recordId` shows the patient-policy-service overview and timeline` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-017 — Implementation: confirm ``/records/:recordId/versions/:versionId` opens a historical immutable verification` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-018 — Design review: confirm ``/review` shows FAILED and NEEDS REVIEW queues` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-019 — Domain review: confirm ``/carriers` shows versioned carrier and plan masters` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-020 — QA verification: confirm ``/carriers/:carrierId` shows master details and effective versions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-021 — Accessibility review: confirm ``/templates` shows official template versions and mapping status` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-022 — Security review: confirm ``/system` shows parser, queue, storage, provider, and integration health` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-023 — Regression protection: confirm ``/help` shows field-state meanings, upload rules, and workflow guidance` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-024 — Client acceptance: confirm `Start with a mode selector containing `Auto-fill a blank VOB` and `Audit a completed VOB`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-025 — Implementation: confirm `Ask for the call source first: audio, transcript document, pasted transcript, or future RingCentral import` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-026 — Design review: confirm `For audit mode, require a completed VOB PDF or Excel source before verification can begin` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-027 — Domain review: confirm `For auto-fill mode, select the approved official template and optionally import patient or previous-VOB data` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-028 — QA verification: confirm `Show accepted formats and size guidance before selection` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-029 — Accessibility review: confirm `Validate sources immediately and explain unsupported or image-only content inline` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-030 — Security review: confirm `Create the case only after the user confirms the source set` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-031 — Regression protection: confirm `Navigate to processing while preserving uploaded source cards and checksums` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-032 — Client acceptance: confirm `After processing, open the workspace with every section populated by values, explicit blanks, or review states` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-033 — Implementation: confirm `Create an immutable audio or transcript artifact` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-034 — Design review: confirm `Parse or transcribe the call` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-035 — Domain review: confirm `Classify speaker roles and irrelevant segments` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-036 — QA verification: confirm `Extract structured evidence candidates` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-037 — Accessibility review: confirm `Prefill patient and carrier values from approved sources` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-038 — Security review: confirm `Resolve values into the canonical form without marking them as user-confirmed` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-039 — Regression protection: confirm `Render low-confidence and conflicting fields in amber` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-040 — Client acceptance: confirm `Require the operator to review unresolved fields and source provenance` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-041 — Implementation: confirm `Run deterministic validation when the operator selects Verify` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-042 — Design review: confirm `Allow corrections that create a new revision` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-043 — Domain review: confirm `Generate the clean final PDF only after a permitted outcome` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-044 — QA verification: confirm `Import the completed PDF or Excel and map it into the canonical field registry` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-045 — Accessibility review: confirm `Preserve the imported artifact and original mapped values` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-046 — Security review: confirm `Parse or transcribe the call source independently` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-047 — Regression protection: confirm `Compare normalized original form values against source-supported values` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-048 — Client acceptance: confirm `Render every mismatch or missing required field directly in its form block` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-049 — Implementation: confirm `Show an evidence button beside transcript-derived supported values` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-050 — Design review: confirm `Permit `Apply supported value`, `Edit manually`, or `Bypass with reason` according to field rules` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-051 — Domain review: confirm `Re-run comparison after each resolution without losing the original audit result` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-052 — QA verification: confirm `Store initial and final outcomes as separate verification runs` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-053 — Accessibility review: confirm `Display a stage timeline: Upload, Validate, Parse or Transcribe, Identify Speakers, Extract Facts, Compare, Prepare Workspace` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-054 — Security review: confirm `Show each source artifact independently so one failed file does not hide successful files` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-055 — Regression protection: confirm `Show uploaded bytes and part progress for large files` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-056 — Client acceptance: confirm `Show elapsed time without promising a fixed remaining time` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-057 — Implementation: confirm `Allow safe cancellation before final comparison` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-058 — Design review: confirm `Allow retry of only the failed stage or failed audio chunk` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-059 — Domain review: confirm `Explain whether failure is recoverable, requires another file, or requires manual entry` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-060 — QA verification: confirm `Provide a `Continue with available sources` action only when business rules permit` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-061 — Accessibility review: confirm `Keep the case visible in Records even if processing is interrupted` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-062 — Security review: confirm `The left pane contains source navigation, transcript search, speaker filters, timestamps, and document pages` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-063 — Regression protection: confirm `The center pane contains the canonical VOB form and is the primary editing surface` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-064 — Client acceptance: confirm `The right pane contains evidence details, comparison explanation, previous-version delta, and live PDF preview tabs` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-065 — Implementation: confirm `Allow each pane to collapse independently` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-066 — Design review: confirm `Use a minimum comfortable center-pane width and move the right pane into a drawer at smaller desktop widths` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-067 — Domain review: confirm `Use a single-column task sequence on tablet and mobile, with sticky section navigation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-068 — QA verification: confirm `Keep the case header and status visible while scrolling` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-069 — Accessibility review: confirm `Use section completion and issue counts rather than one giant form progress bar` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-070 — Security review: confirm `Search transcript text without modifying evidence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-071 — Regression protection: confirm `Filter by representative, caller, IVR, or unknown speaker` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-072 — Client acceptance: confirm `Toggle irrelevant segments for context` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-073 — Implementation: confirm `Select a field to jump to its primary evidence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-074 — Design review: confirm `Select a transcript segment to see fields that cite it` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-075 — Domain review: confirm `Play the matching audio range when audio exists` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-076 — QA verification: confirm `Show corrected and conflicting candidate chains` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-077 — Accessibility review: confirm `Never allow transcript edits to overwrite the original artifact` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-078 — Security review: confirm `Permit a separate corrected transcript annotation with full history` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-079 — Regression protection: confirm `Focus enters the field input, not a detached issue card` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-080 — Client acceptance: confirm `The error panel inside the block shows entered value, supported value, reason, source, and confidence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-081 — Implementation: confirm ``Apply supported value` copies the normalized value into a new revision` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-082 — Design review: confirm ``Edit manually` leaves evidence visible and requires a source or explanation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-083 — Domain review: confirm ``Bypass` opens a reason dialog scoped to the field` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-084 — QA verification: confirm ``View evidence` opens the right pane and highlights the source location` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-085 — Accessibility review: confirm `After resolution, keep a small history indicator showing the field changed` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-086 — Security review: confirm `Re-verification updates the block status without a full page refresh` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-087 — Regression protection: confirm `Keyboard users can move to the next unresolved field` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-088 — Client acceptance: confirm `Search for an existing patient, policy, or base record before creating a new record` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
