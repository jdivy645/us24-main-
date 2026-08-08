# Implementation Phases and AI Coding-Agent Prompts
## US24 Solutions — React VOB Automation Blueprint

**Document:** `16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md`
**Document order:** 17 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md`](./15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md)
**Next:** [`17_RESEARCH_SOURCES_AND_DECISION_LOG.md`](./17_RESEARCH_SOURCES_AND_DECISION_LOG.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Provide a low-phase implementation roadmap and complete prompts that an AI coding agent can execute while preserving the locked US24 requirements.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`01_PRODUCT_VISION_SCOPE_AND_SUCCESS.md`](./01_PRODUCT_VISION_SCOPE_AND_SUCCESS.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
- [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
- [`08_EXTRACTION_NORMALIZATION_COMPARISON.md`](./08_EXTRACTION_NORMALIZATION_COMPARISON.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)
- [`11_REACT_FRONTEND_ARCHITECTURE.md`](./11_REACT_FRONTEND_ARCHITECTURE.md)
- [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
- [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)
- [`14_SECURITY_PRIVACY_ACCESSIBILITY.md`](./14_SECURITY_PRIVACY_ACCESSIBILITY.md)
- [`15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md`](./15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md)

## Authority and invariants

- Preserve source-derived facts and do not silently replace them with general assumptions.
- The client-supplied official VOB template controls the final report after sign-off.
- AI extracts evidence-backed candidates; deterministic rules calculate field and case outcomes.
- Original sources and original imported form values are immutable.
- Inline field highlighting is the primary error experience; PASSED, FAILED, and NEEDS REVIEW are the business outcomes.
- No visible login is included, but production still requires an approved controlled-access boundary.
- The final required, optional, conditional, and critical field matrix remains configurable.

## Source basis

- `US24_VOB_Generator_5.html` — current manual form, live preview, localStorage log, Excel export, and PDF generator.
- `VOB_SAMPLE (1).docx` — marked blank template and source for one-time/carrier-field observations.
- `VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf` — completed sample VOB and official-style visual reference.
- `CARSTEN UHC (AARA) (2).txt` — noisy call transcript with IVR content, ASR errors, corrections, conflicts, and timestamps.
- `US24_VOB_Transcript_Verification_Enhancement_Blueprint.md` — earlier enhancement blueprint and locked workflow baseline.
- US24 meeting summary dated August 6, 2026; Official framework, vendor, security, and accessibility research is indexed in file 17.

---

## 1. Agent operating rules

- Read file 00 and every dependency for the active phase before editing code.
- Treat client-supplied sources and requirement identifiers as authoritative.
- Do not reduce scope without recording a decision; Do not create blank routes or placeholder-only pages.
- Use realistic non-PHI demo fixtures; Do not add a visible login screen.
- Do not store production-style data in localStorage; Do not hard-code final required or critical rules that remain pending.
- Do not let AI output assign PASSED or FAILED; Do not infer 100 percent coverage.
- Do not silently default substantive Yes or No values; Preserve immutable original forms and source artifacts.
- Run quality commands before declaring a phase complete; Report changed files, tests, remaining approved deferrals, and risks.

## 2. Phase model

- Use eight implementation phases; Each phase is a complete vertical milestone and should not be subdivided for normal delivery.
- A phase prompt may be executed in one coding-agent session if the repository and tooling permit.
- Later phases depend on the acceptance gates of earlier phases.
- Backend and frontend contracts are built together when a vertical flow needs both.
- The first phase creates a polished populated frontend shell, not a blank scaffold.
- The final phase hardens integrations, security, accessibility, and release evidence.

## 3. Phase 1 — Foundation and visual system

- Create the monorepo and strict TypeScript configuration; Create React 19.2 and Vite 8 web app.
- Create Fastify API health endpoint and shared schema package; Implement US24 design tokens and core components.
- Implement global app shell and all routes with realistic populated demo states.
- Implement responsive navigation and no-login presentation.
- Implement status badges, source cards, field blocks, tables, drawers, dialogs, and previews using fixture data.
- Add lint, type, unit, component, E2E smoke, and build commands; Do not implement real PHI storage yet.
- Definition of done: every route is visually complete, responsive, keyboard reachable, and no route is blank.

## 4. Phase 1 agent prompt

```text
Implement Phase 1 from 16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md.
Read 00, 03, 04, 05, 11, 14, and 15 first.
Build the complete React/Vite US24 operations shell with realistic demo content.
Preserve navy/orange/off-white identity from the supplied HTML while modernizing it.
Create every route and core component described in file 05.
Use strict TypeScript, responsive layouts, visible focus, and no localStorage PHI.
Do not add login.
Run lint, typecheck, tests, E2E smoke, and production build.
Return a concise implementation report with screenshots or route evidence where available.
```

## 5. Phase 2 — Canonical form and review workspace

- Implement the shared field registry and value envelope; Implement registry-driven VOB sections and controls.
- Implement original, current, and read-only historical form modes; Implement the three-pane workspace.
- Implement source chips, field states, inline errors, evidence drawer, and issue navigation.
- Implement conditional visibility and placeholder configurable requiredness.
- Remove all substantive default answers; Implement stale comparison state after edits.
- Use fixture comparison data before real extraction.
- Definition of done: the supplied sample form can be represented field by field and all status states are demonstrable.

## 6. Phase 2 agent prompt

```text
Implement Phase 2.
Read 02, 04, 05, 06, 08, 09, 11, and 15.
Create one canonical registry used by the React form, comparison fixtures, exports, and preview.
Implement the complete review workspace and every inline field state.
Keep original imported values immutable and edits as revisions.
Do not hard-code the pending final critical matrix; use a versioned configuration placeholder.
Demonstrate the fifth-versus-eighth auth mismatch and 20-versus-30 coinsurance conflict.
Run all quality gates and report evidence.
```

## 7. Phase 3 — Secure source upload and document parsing

- Implement PostgreSQL, object-storage metadata, case, artifact, revision, and audit entities.
- Implement short-lived direct upload sessions and multipart support.
- Implement server validation and private artifact storage; Implement TXT, DOCX, text PDF, CSV, and XLSX parsing adapters.
- Implement completed-form mapping into the canonical form; Implement source viewers and mapping overlays.
- Implement processing events and retryable parse jobs; Detect image-only PDF.
- Definition of done: every requested document format reaches the workspace with lineage or a clear supported failure.

## 8. Phase 3 agent prompt

```text
Implement Phase 3.
Read 06, 07, 11, 12, 13, 14, and 15.
Add durable server-side case and artifact storage, secure upload sessions, queues, and parsers.
Support TXT, DOCX, text PDF, CSV, XLSX, and completed VOB PDF or Excel.
Preserve leading zeros and source page or cell evidence.
Detect image-only PDFs and show an explicit state.
Do not use browser localStorage for case data.
Run parser fixtures, upload security tests, E2E upload flows, and build.
```

## 9. Phase 4 — Audio and long-call transcription

- Implement audio preflight and metadata; Implement controlled transcoding.
- Implement long-audio chunking and overlap; Implement transcription adapter and diarized segment persistence.
- Implement stitching and gap detection; Implement speaker-role and relevance classification.
- Implement stage and chunk progress UI; Implement retry, cancellation, and resume.
- Use approved test recordings or synthetic non-PHI audio.
- Definition of done: a long call can recover from one failed chunk without restarting successful chunks.

## 10. Phase 4 agent prompt

```text
Implement Phase 4.
Read 07, 08, 12, 14, 15, and 17.
Build the provider-abstracted audio pipeline with resumable upload, preflight, transcode, chunk, transcribe, stitch, diarize, classify, retry, and cancel.
Persist global timestamps and artifact lineage.
Keep IVR and irrelevant text in the source while excluding it from normal extraction context.
Do not promise a fixed one-to-two-minute duration.
Test failed middle-chunk retry, overlap removal, cancellation, and event reconnect.
```

## 11. Phase 5 — Evidence extraction and deterministic audit

- Implement strict structured extraction; Implement speaker authority, question-answer, correction, conflict, unknown, and scope rules.
- Implement starter terminology dictionary; Implement field-specific normalization.
- Implement deterministic comparison and status.
- Implement evidence linking; Implement automatic fill and audit modes.
- Implement re-verification after revisions.
- Definition of done: the golden Cigna case produces the approved mismatch, conflict, correction, unknown, and derived results.

## 12. Phase 5 agent prompt

```text
Implement Phase 5.
Read 02, 06, 08, 09, 12, 14, and 15.
Use AI only to extract candidates with evidence; validate structured output.
Use deterministic code for normalization, comparison, requiredness, criticality, bypass consequence, and overall status.
Implement the starter terminology dictionary and version it.
Make the supplied Cigna PDF and transcript a mandatory automated golden fixture.
Never convert payer-unable-to-verify secondary coverage into No.
Never infer 100 percent coverage.
```

## 13. Phase 6 — Records, repeated VOB, carrier master, and review queue

- Implement patient, policy, base record, verification versions, and duplicate candidates.
- Implement repeat-VOB prefill and dynamic-field warnings; Implement field deltas and timeline.
- Implement Records, base detail, historical version, and comparison views.
- Implement Review Queue; Implement scoped versioned carrier master and activation.
- Implement contradiction proposal.
- Definition of done: a second VOB creates a new version, shows accumulator changes, and does not mutate version one.

## 14. Phase 6 agent prompt

```text
Implement Phase 6.
Read 03, 05, 06, 09, 10, 12, 14, and 15.
Build durable base records, duplicate checks, version history, field deltas, review queues, and carrier masters.
Scope masters by payer, plan, state, network, service, and effective period as configured.
Never silently merge records or update a master from one call.
Demonstrate first VOB plus a later VOB with deductible, OOP, and visit changes.
Run history immutability and carrier-precedence tests.
```

## 15. Phase 7 — Official documents and operational exports

- Implement template registry and mapping; Implement final PDF and marked draft generation.
- Implement internal QA report; Implement server-authoritative preview.
- Implement Excel operational export and import profiles; Implement document list and signed downloads.
- Prevent trailing blank pages; Validate responsibility-banner facts.
- Definition of done: PASSED creates a clean official PDF; FAILED and unresolved NEEDS REVIEW cannot.

## 16. Phase 7 agent prompt

```text
Implement Phase 7.
Read 05, 06, 09, 10, 12, 13, 14, and 15.
Use the client-supplied official template through a versioned registry.
Generate clean final, failed draft, needs-review draft, and QA report document types.
Prevent a logo-only second page.
Render values from the selected verification version and revision.
Implement Excel export with identifier preservation and formula-injection protection.
Run golden PDF and document-gating tests.
```

## 17. Phase 8 — RingCentral, hardening, and release

- Confirm RingCentral product, licenses, permissions, and test access; Implement server-side import adapter with manual fallback.
- Handle multiple recording legs and deduplication; Complete controlled-access deployment.
- Complete security, privacy, audit, retention, backup, accessibility, performance, and resilience work.
- Run full golden, long-audio, document, and restore suites; Perform client acceptance testing.
- Definition of done: release gate in file 15 is satisfied and open risks are explicitly accepted or blocked.

## 18. Phase 8 agent prompt

```text
Implement Phase 8 only after RingCentral and compliance prerequisites are confirmed.
Read every Markdown specification, especially 07, 12, 14, 15, and 17.
Add the approved RingCentral adapter without removing manual upload.
Complete security headers, gateway integration, logging redaction, retention, backup restore, monitoring, accessibility, performance, and disaster recovery tests.
Do not claim HIPAA compliance; produce an engineering evidence pack for client review.
Run the complete release gate and list every remaining risk or pending client decision.
```

## 19. Migration from current HTML

- Use the current HTML only as a visual and field-coverage reference.
- Recreate the navy top bar, orange accent, off-white canvas, cards, live preview concept, and section labels in React.
- Do not wrap the old HTML in an iframe.
- Do not copy localStorage persistence; Do not keep public CDN scripts.
- Remove the unsafe coverage inference; Replace manual `onclick` handlers with typed React actions.
- Replace hard-coded field lists with the canonical registry; Preserve Excel and PDF concepts through secure server-backed implementations.

## 20. Quality commands for every phase

- Install from the lockfile.
- Run formatting check; Run lint.
- Run strict typecheck; Run unit and component tests.
- Run affected integration tests; Run critical Playwright flows.
- Run automated accessibility checks; Run production build.
- Run migration validation when database changes.
- Run secret scan; Record results in the phase report.

## 21. Phase report template

- Phase and commit reference.
- Files and packages changed; Requirements implemented.
- Screens or API routes completed.
- Migrations created; Tests added.
- Commands and results; Security and accessibility considerations.
- Known limitations allowed by the phase; Pending client decisions.
- Screenshots or artifact links where available; Exact next phase prerequisites.

## 22. Change-control rules

- A requirement change updates the relevant Markdown source before or with code.
- A field change updates registry, import, extraction, comparison, UI, Excel, PDF, and tests.
- A status-rule change creates a new rule-set version; A prompt or model change creates a new extraction version.
- A carrier-master change creates a new master version; A template change creates a new template version.
- Do not retroactively mutate finalized historical results; Document architecture changes in file 17.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Read file 00 and every dependency for the active phase before editing code` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Treat client-supplied sources and requirement identifiers as authoritative` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `Do not reduce scope without recording a decision` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `Do not create blank routes or placeholder-only pages` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `Use realistic non-PHI demo fixtures` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Do not add a visible login screen` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Do not store production-style data in localStorage` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Do not hard-code final required or critical rules that remain pending` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Do not let AI output assign PASSED or FAILED` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Do not infer 100 percent coverage` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
