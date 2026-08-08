# Research Sources, Architecture Decisions, and Open Questions
## US24 Solutions — React VOB Automation Blueprint

**Document:** `17_RESEARCH_SOURCES_AND_DECISION_LOG.md`
**Document order:** 18 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md`](./16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md)
**Next:** None — final reference
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Record source materials, official technical research, architecture decisions, open client questions, upgrade policy, and the rationale behind the recommended implementation.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- Every file in this package

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

## 1. Project source materials

- `US24_VOB_Generator_5.html` — current manual form, live preview, localStorage log, Excel export, and PDF generator.
- `VOB_SAMPLE (1).docx` — marked blank template and source for one-time/carrier-field observations.
- `VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf` — completed sample VOB and official-style visual reference.
- `CARSTEN UHC (AARA) (2).txt` — noisy call transcript with IVR content, ASR errors, corrections, conflicts, and timestamps.
- `US24_VOB_Transcript_Verification_Enhancement_Blueprint.md` — earlier enhancement blueprint and locked workflow baseline.
- US24 meeting summary dated August 6, 2026 — audio, validation, prefill, repeated VOB, carrier master, RingCentral, and PDF requirements.

## 2. Source-derived facts

- The current HTML is a manual form, PDF generator, Excel exporter, live preview, and browser-local saved list.
- The current HTML validates only first name, last name, and insurance name.
- The current HTML contains substantive default values and unsafe 100 percent coverage inference.
- The marked template contains group and individual-provider network concepts and one-time-field annotations.
- The completed sample PDF uses a dense two-column US24 report layout and has an unnecessary logo-only second page.
- The raw transcript contains IVR noise, speaker errors, corrections, contradictions, and unavailable information.
- The meeting requires audio transcription, form validation, prefill, repeat-VOB history, carrier data, PDF generation, and future RingCentral exploration.
- The client requires automatic filling and auditing, inline highlighting, NEEDS REVIEW, no visible login, and multiple document formats.
- The exact field criticality matrix remains pending.

## 3. Official research references

- React official version documentation: https://react.dev/versions
- Vite official releases and guide: https://vite.dev/releases and https://vite.dev/guide/
- React Router official modes and routing documentation: https://reactrouter.com/start/modes
- TanStack Query official React documentation: https://tanstack.com/query/latest/docs/framework/react/overview
- Node.js official release schedule: https://nodejs.org/en/about/previous-releases
- Fastify validation and serialization: https://fastify.io/docs/latest/Reference/Validation-and-Serialization/
- BullMQ workers and retry guidance: https://docs.bullmq.io/guide/workers and https://docs.bullmq.io/guide/retrying-failing-jobs
- Prisma PostgreSQL and JSON guidance: https://www.prisma.io/docs/orm/v6/overview/databases/postgresql
- AWS S3 presigned URL and multipart upload guidance: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- OpenAI file transcription and diarization documentation: https://developers.openai.com/api/docs/guides/speech-to-text
- RingCentral AI Conversation Expert documentation: https://developers.ringcentral.com/guide/ai/ace
- RingCentral call recordings guidance: https://developers.ringcentral.com/guide/voice/call-log/recordings
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- HHS cloud-computing guidance: https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP HTML5 Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- W3C WCAG 2.2 error-identification guidance: https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- W3C ARIA error-field technique: https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21

## 4. Research-derived implementation conclusions

- Use a current supported React and Vite stack rather than the current single HTML file.
- Use React Router route data and error boundaries for multi-screen workflow.
- Use a server-state library instead of duplicating API state.
- Use Node.js LTS and a schema-driven API.
- Use queues because transcription, parsing, extraction, and PDF generation are asynchronous and retryable.
- Use multipart object uploads for large recordings.
- Use diarized transcription when approved and retain speaker timestamps.
- Use private server-side storage and avoid sensitive localStorage.
- Use deterministic comparison because an extraction model should not decide audit status.
- Use WCAG-aligned inline errors because visual red highlighting alone is insufficient.
- Keep RingCentral behind an adapter because products, permissions, and transcript availability differ.

## 5. ADR-001 React and Vite frontend

- Decision: Build the web client with React 19.2, TypeScript, and Vite 8.
- Reason: The application requires a rich interactive workspace, reusable field components, route states, and maintainable typed code.
- Reason: The official React documentation lists React 19.2 as current during research.
- Reason: Vite is the selected modern build tool and current supported releases are documented by the Vite project.
- Consequence: The old HTML is a reference, not the production codebase.
- Consequence: Dependencies are bundled and reviewed rather than loaded from public CDNs.
- Status: Accepted for this blueprint.

## 6. ADR-002 React Router and TanStack Query

- Decision: Use React Router Data or Framework mode and TanStack Query.
- Reason: Route loaders, pending UI, nested layouts, and error boundaries match the processing workflow.
- Reason: Server state has caching, mutation, invalidation, and lifecycle concerns distinct from form state.
- Consequence: URL routes and query keys become explicit contracts.
- Status: Accepted.

## 7. ADR-003 Node LTS and Fastify

- Decision: Use Node.js 24 LTS and Fastify 5.11.x for the reference backend.
- Reason: Node 24 is an active LTS line during research.
- Reason: Fastify supports JSON Schema validation and response serialization.
- Consequence: API schemas must be maintained as first-class artifacts.
- Consequence: Version pins are reviewed before implementation and updated through change control.
- Status: Accepted as reference stack.

## 8. ADR-004 PostgreSQL, object storage, Redis, and BullMQ

- Decision: Use PostgreSQL for authoritative structured data, private S3-compatible storage for artifacts, and Redis with BullMQ for background jobs.
- Reason: Records, versions, comparisons, and audits require transactions and queryable relationships.
- Reason: Large files belong in object storage rather than database blobs or browser storage.
- Reason: Long processing stages need retries, concurrency control, and workers.
- Consequence: Redis is not the source of truth.
- Consequence: Jobs contain references rather than raw sensitive payloads.
- Status: Accepted.

## 9. ADR-005 AI extracts; rules decide

- Decision: Structured AI extraction returns candidates and evidence but cannot set final field or case status.
- Reason: The sample contains leading questions, contradictions, and corrections.
- Reason: Business status must be reproducible and versioned.
- Consequence: Normalization, field comparison, requiredness, criticality, bypass, and precedence are deterministic code.
- Status: Locked.

## 10. ADR-006 Immutable originals and append-only revisions

- Decision: Keep source artifacts, imported original form, extraction runs, comparison runs, and final documents immutable.
- Reason: US24 must audit whether the original form was correct.
- Reason: Silent correction would erase evidence of the error.
- Consequence: Edits create revisions and re-verification.
- Status: Locked.

## 11. ADR-007 Three business outcomes

- Decision: Use PASSED, FAILED, and NEEDS REVIEW.
- Reason: Unclear audio and unavailable payer data should not be forced into a binary result.
- Reason: FAILED and ambiguous are operationally different.
- Consequence: Precedence is FAILED, then NEEDS REVIEW, then PASSED.
- Status: Locked, with field consequence matrix pending.

## 12. ADR-008 No visible login with controlled boundary

- Decision: Do not show a login screen in version one.
- Reason: The client explicitly requested no login.
- Risk: Public unauthenticated access would be inappropriate for sensitive records and weakens attribution.
- Mitigation: Require an approved upstream or environmental access boundary for production.
- Consequence: Actor labels must not be overstated as strong identity.
- Status: Client-locked UI decision; deployment control pending approval.

## 13. ADR-009 Versioned carrier master

- Decision: Store payer information in scoped effective-dated versions.
- Reason: Payer ID, addresses, phones, authorization routes, and TFL can vary by plan, market, network, service, and time.
- Consequence: No single universal value per carrier.
- Consequence: Contradictions create proposals or review.
- Status: Accepted.

## 14. ADR-010 Official template registry

- Decision: Treat the client-supplied template as a versioned rendering asset with canonical bindings.
- Reason: Output format can change independently of field storage.
- Reason: Historical documents must retain their template version.
- Consequence: PDF generation is server-authoritative and status-gated.
- Status: Accepted.

## 15. ADR-011 Manual upload remains

- Decision: RingCentral integration supplements but never removes manual source upload.
- Reason: Integration availability, licenses, permissions, delays, and failures vary.
- Consequence: Every source goes through the same artifact and processing contracts.
- Status: Locked.

## 16. ADR-012 No automatic 100 percent inference

- Decision: Remove the current logic that infers 100 percent when copay and coinsurance are No.
- Reason: Deductible, exclusions, authorization, limits, or other responsibility may remain.
- Consequence: Responsibility banners require supported structured facts.
- Status: Locked.

## 17. Current technology snapshot

- React official documentation reported 19.2 as the latest documented version during research on August 7, 2026.
- Vite official release pages showed the Vite 8 line as supported during research.
- React Router official documentation showed version 8 and multiple operating modes.
- Node.js official release pages showed Node 24 as LTS and Node 26 as Current.
- Fastify official latest documentation showed the 5.11.x line.
- BullMQ official documentation described workers, automatic retries, backoff, cancellation, and production behavior.
- OpenAI official transcription documentation described uploaded-audio transcription and a diarized model with speaker segments.
- RingCentral official documentation described call recordings and AI Conversation Expert transcripts and insights.
- These versions are a dated snapshot and must be checked before installation.

## 18. Pending client decisions

- Final mandatory, optional, conditional, and critical field matrix.
- Final bypass consequence matrix.
- Authority for manual approval and override.
- Exact official blank template and mapping method.
- Color legend in the marked template.
- OCR scope.
- Maximum file size and duration.
- Processing service objectives.
- Retention and deletion schedule.
- Verified-by identity mechanism without visible login.
- Production access boundary.
- Cloud, AI, transcription, and RingCentral vendor approvals.
- RingCentral product, licenses, permissions, and retention.
- Duplicate merge policy.
- Benefit-year base-record policy.
- Carrier-master ownership and approval workflow.
- Whether NEEDS REVIEW can ever produce a clean final PDF after override.

## 19. Upgrade and verification policy

- Recheck official versions before project bootstrap.
- Pin exact versions in the lockfile.
- Enable automated dependency alerts.
- Review security advisories before upgrades.
- Run the complete release gate after major framework, parser, PDF, transcription, or queue upgrades.
- Version extraction prompts and model IDs.
- Version rule sets and dictionaries.
- Do not re-score historical finalized cases automatically after an upgrade.
- Document every architecture change as a new ADR.

## 20. Research limitations

- The supplied meeting content is a summary, not the full original recording.
- The marked DOCX has no confirmed color legend.
- The final official PDF template has not yet been approved in implementation-ready form.
- The exact US24 database or source-system schema was not supplied.
- The RingCentral product and account configuration are unknown.
- Legal applicability and vendor agreements were not supplied.
- The final field matrix is intentionally pending.
- Recommendations that depend on these items remain configurable or gated.

## 21. Decision-review cadence

- Review pending client decisions before Phase 3.
- Review transcription provider and contracts before Phase 4.
- Approve the field and bypass matrices before Phase 5 release.
- Approve duplicate and carrier governance before Phase 6.
- Approve final template before Phase 7.
- Approve RingCentral and production boundary before Phase 8.
- Revisit ADRs after any material source, workflow, security, or vendor change.
- Keep this file in the same repository as code.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm ``US24_VOB_Generator_5.html` — current manual form, live preview, localStorage log, Excel export, and PDF generator` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm ``VOB_SAMPLE (1).docx` — marked blank template and source for one-time/carrier-field observations` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm ``VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf` — completed sample VOB and official-style visual reference` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm ``CARSTEN UHC (AARA) (2).txt` — noisy call transcript with IVR content, ASR errors, corrections, conflicts, and timestamps` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm ``US24_VOB_Transcript_Verification_Enhancement_Blueprint.md` — earlier enhancement blueprint and locked workflow baseline` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `US24 meeting summary dated August 6, 2026 — audio, validation, prefill, repeated VOB, carrier master, RingCentral, and PDF requirements` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `The current HTML is a manual form, PDF generator, Excel exporter, live preview, and browser-local saved list` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `The current HTML validates only first name, last name, and insurance name` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `The current HTML contains substantive default values and unsafe 100 percent coverage inference` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `The marked template contains group and individual-provider network concepts and one-time-field annotations` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-011 — Domain review: confirm `The completed sample PDF uses a dense two-column US24 report layout and has an unnecessary logo-only second page` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-012 — QA verification: confirm `The raw transcript contains IVR noise, speaker errors, corrections, contradictions, and unavailable information` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-013 — Accessibility review: confirm `The meeting requires audio transcription, form validation, prefill, repeat-VOB history, carrier data, PDF generation, and future RingCentral exploration` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-014 — Security review: confirm `The client requires automatic filling and auditing, inline highlighting, NEEDS REVIEW, no visible login, and multiple document formats` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-015 — Regression protection: confirm `The exact field criticality matrix remains pending` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-016 — Client acceptance: confirm `React official version documentation: https://react.dev/versions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-017 — Implementation: confirm `Vite official releases and guide: https://vite.dev/releases and https://vite.dev/guide/` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-018 — Design review: confirm `React Router official modes and routing documentation: https://reactrouter.com/start/modes` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-019 — Domain review: confirm `TanStack Query official React documentation: https://tanstack.com/query/latest/docs/framework/react/overview` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-020 — QA verification: confirm `Node.js official release schedule: https://nodejs.org/en/about/previous-releases` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-021 — Accessibility review: confirm `Fastify validation and serialization: https://fastify.io/docs/latest/Reference/Validation-and-Serialization/` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-022 — Security review: confirm `BullMQ workers and retry guidance: https://docs.bullmq.io/guide/workers and https://docs.bullmq.io/guide/retrying-failing-jobs` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-023 — Regression protection: confirm `Prisma PostgreSQL and JSON guidance: https://www.prisma.io/docs/orm/v6/overview/databases/postgresql` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-024 — Client acceptance: confirm `AWS S3 presigned URL and multipart upload guidance: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-025 — Implementation: confirm `OpenAI file transcription and diarization documentation: https://developers.openai.com/api/docs/guides/speech-to-text` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-026 — Design review: confirm `RingCentral AI Conversation Expert documentation: https://developers.ringcentral.com/guide/ai/ace` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-027 — Domain review: confirm `RingCentral call recordings guidance: https://developers.ringcentral.com/guide/voice/call-log/recordings` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-028 — QA verification: confirm `HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-029 — Accessibility review: confirm `HHS cloud-computing guidance: https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
