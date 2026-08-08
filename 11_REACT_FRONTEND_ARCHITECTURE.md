# React Frontend Architecture and Engineering Standards
## US24 Solutions — React VOB Automation Blueprint

**Document:** `11_REACT_FRONTEND_ARCHITECTURE.md`
**Document order:** 12 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)
**Next:** [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define the React 19.2 and Vite 8 frontend stack, repository structure, route architecture, state ownership, field rendering, API integration, quality, and performance rules.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
- [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
- [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)
- [`14_SECURITY_PRIVACY_ACCESSIBILITY.md`](./14_SECURITY_PRIVACY_ACCESSIBILITY.md)
- [`15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md`](./15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md)

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

## 1. Recommended frontend stack

- React 19.2 with TypeScript in strict mode.
- Vite 8 for development and production builds.
- React Router 8 in Data or Framework mode for route data, pending UI, and error boundaries.
- TanStack Query for server-state fetching, caching, mutation, and invalidation.
- React Hook Form for high-density form control and performance.
- Zod for shared runtime validation at client boundaries.
- Tailwind CSS 4 with CSS custom-property design tokens and a small controlled component layer.
- PDF.js for in-browser PDF viewing and source-page evidence.
- A maintained spreadsheet parser for XLSX import and export, isolated behind an adapter.
- Playwright for browser E2E and accessibility-flow tests.
- Vitest and React Testing Library for unit and component tests.
- Use exact reviewed package versions in the lockfile and update through controlled dependency review.

## 2. Why Vite rather than Create React App

- Create React App is no longer the recommended starting point for new React applications.
- Vite provides the modern development and build workflow selected for this project.
- The platform is an authenticated-by-boundary operations SPA, so a heavy public-site framework is not required.
- Vite keeps the frontend separable from the Fastify API and worker services.
- Production hosting can serve static frontend assets behind the same controlled gateway.
- The build must avoid runtime CDN dependencies used by the current HTML prototype.

## 3. Repository organization

- Use a monorepo so frontend, API, workers, shared schemas, and document packages version together.
- `apps/web` contains the React application.
- `apps/api` contains Fastify HTTP and event endpoints.
- `apps/worker` contains background job processors.
- `packages/domain` contains canonical field keys, enums, rule types, and pure comparison contracts.
- `packages/schemas` contains Zod or JSON Schema boundary definitions.
- `packages/ui` contains US24 design-system components.
- `packages/pdf` contains template mappings and render contracts.
- `packages/testing` contains factories and golden fixtures.
- `packages/config` contains lint, TypeScript, and test configuration.
- Do not share infrastructure clients directly with the browser package.

## 4. Frontend folder tree

- `src/app` for providers, router, shell, and global error boundaries.
- `src/routes` for route modules and route-level loaders or actions.
- `src/features/verification-setup`.
- `src/features/processing`; `src/features/workspace`.
- `src/features/transcript`.
- `src/features/vob-form`; `src/features/evidence`.
- `src/features/review`; `src/features/records`.
- `src/features/carrier-master`.
- `src/features/templates`; `src/features/system-health`.
- `src/components` only for truly cross-feature components.
- `src/lib/api` for typed transport clients.
- `src/lib/format` for date, money, percentage, phone, and identifier display.
- `src/lib/a11y` for focus and live-region utilities.
- `src/test` for frontend fixtures and render helpers.

## 5. Route architecture

- Define routes from the route map in file 03.
- Each major route has a loading boundary, error boundary, and recovery action.
- Case routes load only summary data initially and fetch heavy transcript or document data on demand.
- Use nested routes or layout routes for case header persistence.
- Keep filter state in URL search parameters on Records and Review Queue.
- Use route blockers only for unsynchronized draft mutations, not for every field edit.
- Support deep links to a selected field and evidence location.
- Unknown IDs show a contextual not-found panel rather than a blank route.

## 6. State ownership

- TanStack Query owns server state; React Hook Form owns the editable form revision.
- URL search parameters own shareable filters and selected route tabs.
- A small workspace context or reducer owns pane sizes, selected field, and local view preferences.
- Upload state is modeled through server upload sessions plus local transfer progress.
- Do not duplicate full case objects in multiple global stores.
- Do not persist PHI-bearing server caches to browser localStorage.
- Use optimistic updates only for safe metadata and reversible draft edits.
- Finalization and bypass operations wait for server confirmation.

## 7. Query-key standards

- Use structured keys such as `['case', caseId, 'summary']`.
- Use separate keys for transcript segments, evidence, revisions, runs, and documents.
- Include version or revision IDs when data is immutable.
- Invalidate narrowly after mutations.
- Use stale times appropriate to immutable history versus active processing.
- Poll only when the event stream is unavailable; Stop polling terminal jobs.
- Clear case caches when access at the controlled boundary is revoked or the user leaves a shared workstation according to policy.

## 8. Typed API client

- Generate or derive types from the API schema.
- Centralize base URL, credentials mode, headers, timeout, correlation ID, and error decoding.
- Represent domain errors with stable machine codes and user-safe messages.
- Do not scatter raw `fetch` calls through components.
- Support JSON, direct object-storage upload instructions, server-sent events, and signed downloads.
- Validate important responses at runtime.
- Redact request and response bodies from browser diagnostics where they contain sensitive data.

## 9. Canonical form implementation

- Build one `RegistryFormRenderer` that reads field definitions from the server-approved rule bundle.
- Use React Hook Form field arrays only where truly repeated data exists.
- Use controlled components only when the UI component requires them.
- Register hidden metadata separately from editable values.
- Group fields by registry section and visibility rules.
- Calculate section counts from comparison results, not DOM inspection.
- Keep original imported values outside mutable form state.
- Create a new revision payload containing only canonical field values and resolution metadata.
- Use field-level subscriptions to prevent whole-form rerenders.

## 10. FieldBlock component contract

- Accept field definition, current value, original value, comparison result, provenance, and available actions.
- Render label, requirement state, control, source chip, message, evidence excerpt, and resolution buttons.
- Expose a stable DOM ID derived from field key.
- Set accessible invalid and description relationships.
- Render MATCH compactly and problematic states expansively.
- Allow slots for money, date, select, text, textarea, and structured range controls.
- Never encode business criticality only in JSX.
- Emit typed actions rather than mutating data internally.
- Support read-only historical mode.

## 11. Transcript viewer implementation

- Use virtualized rendering for large transcripts.
- Keep segments addressable by stable IDs.
- Render speaker role, raw speaker label, timestamp, relevance, and text.
- Support full-text search with highlighted matches.
- Support filtered views without changing segment IDs.
- Scroll to and focus evidence targets.
- Synchronize audio playback with timestamps when available.
- Avoid injecting transcript HTML; render source text as text.
- Show irrelevant segments with reduced emphasis but preserve access.
- Announce only deliberate navigation changes, not every playback tick.

## 12. Document and Excel source viewers

- Load PDFs through a worker-backed viewer; Render page thumbnails lazily.
- Overlay mapped bounding boxes without modifying the original PDF.
- Provide keyboard page navigation.
- For Excel, render only necessary ranges and virtualize large sheets.
- Preserve cell addresses and formatted string values.
- Show mapping chips and ambiguous mappings.
- Never execute spreadsheet formulas in the browser.

## 13. Upload implementation

- Create upload session through the API.
- Perform direct single-part or multipart transfer using returned instructions.
- Use an abort controller for cancellation; Retry failed parts with bounded attempts.
- Persist non-sensitive upload-session identifiers only when needed for resume.
- Finalize through the API and wait for checksum confirmation.
- Show server validation separately from browser validation.
- Do not read entire multi-gigabyte files into memory.
- Use a Web Worker for checksum or heavy client parsing only when justified.

## 14. Processing events

- Open one event stream per active case or use a global multiplexed stream.
- Reconcile events with the latest server snapshot after reconnect.
- Update stage progress without invalidating every case query.
- Show retryable versus final failures.
- Close the stream when the case reaches a terminal processing state.
- Fallback to controlled polling with backoff.
- Do not trust event ordering without sequence numbers.
- Do not display sensitive payloads from event metadata.

## 15. Form save strategy

- Debounce draft saves at a practical interval after edits.
- Send changed field values and a revision base token.
- Detect concurrent revision conflicts; Show `Saving`, `Saved`, and `Save failed` states.
- Keep failed local changes in memory and offer retry.
- Do not mark a comparison fresh after a draft save.
- A deliberate Verify action creates the comparison snapshot.
- Finalization requires the latest server-confirmed revision.

## 16. Error handling

- Route boundaries handle case-not-found, source unavailable, and unexpected load failures.
- Field mutations show inline errors next to the action.
- Upload errors remain in the source card.
- Processing errors remain in the stage timeline.
- Global toasts confirm background success but do not replace persistent error guidance.
- Every server error includes a safe message and correlation ID.
- Do not expose stack traces, SQL, object keys, provider secrets, or transcript content in generic errors.
- Provide retry and safe navigation.

## 17. Performance standards

- Code-split route-level features; Lazy-load PDF, spreadsheet, and audio-heavy viewers.
- Virtualize transcript segments and large tables; Memoize registry-derived selectors.
- Avoid rerendering the entire VOB form on one field update.
- Reserve panel dimensions to prevent layout shift; Compress and cache static assets.
- Do not load full audio into memory merely to display metadata.
- Use pagination or cursor loading for records and audit events.
- Track interaction latency on field edits, issue navigation, and transcript search.

## 18. Frontend security standards

- Do not place AI, storage, RingCentral, or database credentials in the frontend.
- Render uploaded source text as text, never trusted HTML.
- Use a restrictive content security policy supplied by deployment.
- Avoid public CDN scripts.
- Do not store source documents, transcripts, or records in localStorage.
- Treat signed URLs as bearer credentials and keep their lifetime short.
- Clear sensitive in-memory state on controlled session termination.
- Use same-site secure transport settings at the gateway.
- Validate file selection again on the server.

## 19. Frontend testing

- Unit-test formatters and field-state selectors.
- Component-test every FieldBlock status and action.
- Test registry-driven visibility and conditional requiredness.
- Test keyboard issue navigation; Test transcript evidence jumps.
- Test upload progress, retry, cancellation, and replacement.
- Test stale comparison after edit; Test route loading and error boundaries.
- Test responsive pane behavior; Test no-blank states.
- Run automated accessibility checks and manual keyboard flows.
- Use Playwright for the full auto-fill and audit journeys.

## 20. Build and quality commands

- `pnpm lint` runs ESLint and repository rules.
- `pnpm typecheck` runs strict TypeScript without emit.
- `pnpm test` runs unit and component tests; `pnpm test:e2e` runs Playwright.
- `pnpm test:a11y` runs automated accessibility checks.
- `pnpm build` creates production assets.
- `pnpm analyze` reports large chunks and dependency weight.
- CI blocks merge on lint, type, unit, critical E2E, and build failures.
- Dependency updates include changelog and security review.
- The exact package-manager choice may change, but the commands and gates remain equivalent.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `React 19.2 with TypeScript in strict mode` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Vite 8 for development and production builds` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `React Router 8 in Data or Framework mode for route data, pending UI, and error boundaries` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `TanStack Query for server-state fetching, caching, mutation, and invalidation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `React Hook Form for high-density form control and performance` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Zod for shared runtime validation at client boundaries` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Tailwind CSS 4 with CSS custom-property design tokens and a small controlled component layer` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `PDF.js for in-browser PDF viewing and source-page evidence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `A maintained spreadsheet parser for XLSX import and export, isolated behind an adapter` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Playwright for browser E2E and accessibility-flow tests` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
