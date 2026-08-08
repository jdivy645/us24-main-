# Backend, Data, Background Jobs, and RingCentral Architecture
## US24 Solutions — React VOB Automation Blueprint

**Document:** `12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`
**Document order:** 13 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`11_REACT_FRONTEND_ARCHITECTURE.md`](./11_REACT_FRONTEND_ARCHITECTURE.md)
**Next:** [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define the Node.js backend, Fastify API, PostgreSQL data model, BullMQ jobs, object storage, provider adapters, RingCentral path, deployment, and observability.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
- [`08_EXTRACTION_NORMALIZATION_COMPARISON.md`](./08_EXTRACTION_NORMALIZATION_COMPARISON.md)
- [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)
- [`11_REACT_FRONTEND_ARCHITECTURE.md`](./11_REACT_FRONTEND_ARCHITECTURE.md)
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

## 1. Recommended backend stack

- Node.js 24 LTS for the production runtime.
- Fastify 5.11.x for schema-based HTTP APIs and response serialization.
- PostgreSQL for relational records, history, and transactional integrity.
- Prisma or an equivalent typed ORM with reviewed migrations.
- Redis plus BullMQ for background queues, retries, delayed work, and job state.
- Private S3-compatible object storage for original sources, intermediates, and generated documents.
- Server-sent events for processing updates.
- Containerized deployment with separate web, API, worker, and scheduler processes.
- Provider adapters for transcription, extraction, PDF conversion, storage, and RingCentral.

## 2. Service boundaries

- Case service creates and reads verification cases.
- Upload service creates signed upload sessions and validates finalized artifacts.
- Artifact service owns object metadata and lineage.
- Document parser service handles TXT, DOCX, PDF, CSV, and Excel.
- Media service probes, transcodes, chunks, and stitches audio.
- Transcription service calls the selected provider adapter.
- Speaker and relevance service classifies transcript segments.
- Extraction service creates field candidates; Comparison service normalizes and evaluates values.
- Rule service evaluates requiredness, criticality, bypass, and status.
- Record service manages base records and versions; Carrier service manages scoped master versions.
- Document service creates previews, final PDFs, and QA reports.
- Integration service handles RingCentral; Audit service records material events.

## 3. API design principles

- Use resource-oriented versioned endpoints.
- Use JSON Schema to validate requests and serialize responses.
- Return stable machine-readable error codes.
- Use idempotency keys for case creation, upload finalization, processing start, and finalization.
- Use optimistic concurrency tokens for editable revisions; Paginate large lists and transcripts.
- Never return sensitive fields that the route does not need.
- Use signed download endpoints rather than public object URLs.
- Include correlation IDs; Document every endpoint and event schema.

## 4. Core API endpoints

- `POST /v1/cases`; `GET /v1/cases/:caseId`.
- `POST /v1/cases/:caseId/uploads`; `POST /v1/uploads/:uploadId/complete`.
- `POST /v1/cases/:caseId/process`; `POST /v1/cases/:caseId/process/retry`.
- `POST /v1/cases/:caseId/process/cancel`.
- `GET /v1/cases/:caseId/events`; `GET /v1/cases/:caseId/transcript`.
- `GET /v1/cases/:caseId/evidence/:evidenceId`.
- `POST /v1/cases/:caseId/revisions`; `POST /v1/cases/:caseId/verify`.
- `POST /v1/cases/:caseId/fields/:fieldKey/bypass`; `POST /v1/cases/:caseId/finalize`.
- `GET /v1/records`; `GET /v1/records/:recordId`.
- `GET /v1/records/:recordId/versions`; `GET /v1/carriers`.
- `POST /v1/carriers/:carrierId/versions`; `POST /v1/carrier-versions/:versionId/activate`.
- `GET /v1/documents/:documentId/download`.

## 5. Relational entities

- Patient; InsuranceCarrier.
- InsurancePlan; Policy.
- BaseVobRecord; VerificationVersion.
- FormRevision; FieldValue.
- SourceArtifact; ArtifactRelationship.
- Transcript; TranscriptSegment.
- Speaker; ExtractionRun.
- ExtractedCandidate.
- ComparisonRun; FieldComparison.
- BypassResolution; ManualResolution.
- CarrierMasterVersion; CarrierMasterField.
- Template; TemplateVersion.
- TemplateBinding; GeneratedDocument.
- ProcessingJob; AuditEvent.
- IntegrationConnectionMetadata.

## 6. Relational versus JSON data

- Use relational columns for identifiers, foreign keys, status, dates, scope, and query-heavy fields.
- Use JSONB for immutable provider payload summaries, rule snapshots, and flexible evidence metadata.
- Do not store the entire system as one JSON blob.
- Index normalized policy, group, call reference, payer, status, verification date, and base-record dimensions.
- Use database constraints for unique idempotency keys and immutable artifact checksums where appropriate.
- Use transactions for revision creation, comparison result persistence, finalization, and master activation.
- Store money in integer cents or exact decimal columns; Store identifiers as text.

## 7. Immutable and mutable data

- Original source artifacts are immutable; Imported original form values are immutable.
- Transcript text from a provider run is immutable; corrected annotations are separate.
- Extraction and comparison runs are immutable; Form revisions are append-only.
- Finalizations and generated documents are immutable.
- Case metadata and draft labels may be mutable with audit events.
- Carrier masters change by creating versions; Archive status is mutable and audited.
- Retention deletion creates tombstone metadata where policy requires it.

## 8. Queue design

- `artifact-validate`.
- `document-parse`; `audio-probe`.
- `audio-transcode`; `audio-chunk`.
- `audio-transcribe`; `transcript-stitch`.
- `speaker-classify`; `relevance-classify`.
- `fact-extract`; `field-compare`.
- `pdf-generate`; `document-convert`.
- `retention-cleanup`; `ringcentral-import`.
- Use parent-child or flow orchestration where stages depend on all chunks.
- Keep jobs small enough to retry independently.

## 9. Job reliability

- Every job has an idempotency key.
- Persist stage input references rather than large payloads in Redis.
- Set bounded attempts and exponential or provider-aware backoff.
- Classify unrecoverable errors and stop retrying them; Use worker concurrency limits per provider.
- Extend or monitor locks for long media tasks; Detect stalled jobs.
- Record start, finish, attempt, provider, latency, and safe error code.
- Retain enough failed-job metadata for support without storing full PHI in queue logs.
- Support cooperative cancellation; Resume successful chunks.

## 10. Case-processing orchestrator

- Validate required source set for selected mode; Create or reuse normalized artifacts.
- Run document parsing and audio transcription in parallel where possible.
- Wait for required source outputs.
- Run role and relevance classification; Run evidence extraction.
- Import the completed form or create the prefilled form revision.
- Run deterministic comparison; Persist READY or completion-with-warning state.
- Emit progress events after every durable transition.
- Never mark the case PASSED inside the orchestration job.

## 11. Provider abstraction

- Define a stable transcription adapter.
- Define a structured extraction adapter; Define a PDF conversion adapter.
- Define an object-storage adapter; Define a RingCentral adapter.
- Keep provider-specific request fields inside adapters.
- Normalize provider errors into retryable, rate-limited, invalid-input, policy, and permanent categories.
- Record provider and model version on every run; Allow test doubles and local fixtures.
- Support provider replacement without rewriting field rules.

## 12. OpenAI transcription option

- A transcription adapter may use an approved OpenAI transcription model.
- Use diarized output when speaker separation is required and supported.
- Set chunking according to model requirements and the long-audio design.
- Pass language and controlled vocabulary hints only where supported and appropriate.
- Retain timestamps and speaker labels.
- Do not send data before the client approves contractual, privacy, and security requirements.
- Do not let the model assign final field or case status.
- The adapter must also support a non-OpenAI provider if the client selects one.

## 13. RingCentral discovery questions

- Confirm whether US24 uses RingEX, RingCX, or another RingCentral product.
- Confirm whether call recording is enabled and which users are recorded.
- Confirm account permissions for call logs and recordings.
- Confirm AI Conversation Expert licensing and insight permissions.
- Confirm recording and transcript retention.
- Confirm whether calls include transfers with multiple recording legs.
- Confirm whether webhooks or periodic import is preferred.
- Confirm how a call should be linked to a patient or VOB.
- Confirm rate limits and sandbox or test access.
- Confirm whether a BAA and applicable configuration cover the selected product.

## 14. RingCentral import architecture

- Store the RingCentral account and call identifiers as integration metadata.
- Retrieve call metadata server-side.
- Group recording legs by telephony session or approved call relationship.
- Sort and merge legs chronologically or retain them as linked artifacts.
- Use AI Conversation Expert transcript when available and approved.
- Otherwise retrieve recording media and pass it through the normal transcription pipeline.
- Deduplicate by provider recording ID and checksum; Keep a manual upload fallback.
- Never expose RingCentral credentials to the browser.
- Record import time, source, and API version.

## 15. Carrier master service

- Query active versions by scope and case effective date.
- Return all candidate versions when no unique match exists.
- Never silently choose a broad master over a more specific conflicting version.
- Persist the exact selected version on each inherited field.
- Create contradiction proposals from transcript evidence.
- Activate versions transactionally; Prevent invalid overlapping active scopes.
- Keep historical versions available.

## 16. PDF service

- Accept one finalized or draft revision ID, template version ID, document type, and watermark policy.
- Load canonical values and approved display formatting; Render or fill the official template.
- Run overflow and required-anchor validation; Store generated bytes privately.
- Compute checksum; Persist generation metadata.
- Return a document ID, not a permanent public URL.
- Use a separate worker because conversion can be CPU and memory intensive.

## 17. Events and real-time updates

- Persist processing state before broadcasting.
- Use monotonically increasing event sequence numbers.
- Allow clients to resume after the last received sequence.
- Keep event payloads compact and non-sensitive.
- Send stage, status, units, message code, and timestamp.
- Send a terminal event; Fallback clients can fetch the current snapshot.
- Do not make business decisions depend on successful event delivery.

## 18. Deployment topology

- Serve the React bundle through a hardened static host or gateway.
- Run API instances separately from worker instances.
- Run media and PDF workers with resource limits appropriate to CPU and memory workloads.
- Run Redis and PostgreSQL in private network segments.
- Use private object storage access from services.
- Place the system behind the approved no-visible-login access boundary.
- Use separate development, test, staging, and production environments.
- Do not use production patient data in development.
- Use infrastructure-as-code and versioned configuration.

## 19. Observability

- Structured application logs with correlation IDs.
- Metrics for HTTP latency, queue depth, job age, retries, provider latency, and failure codes.
- Metrics for extraction and comparison quality from labeled tests, not raw production PHI.
- Distributed traces across API, queue, provider, and storage calls where approved.
- Dashboards for long-audio success and oldest job.
- Alerts for queue backlog, storage failure, database saturation, provider outage, and repeated PDF errors.
- Redact patient names, DOB, policy IDs, transcript text, and signed URLs.
- Maintain an operational audit trail separate from verbose application logs.

## 20. Backup and recovery

- Back up PostgreSQL according to approved recovery objectives.
- Version or protect generated documents and source objects according to retention policy.
- Test database restoration; Test object-to-database consistency repair.
- Rebuild search indexes from authoritative data.
- Recover or mark in-flight jobs after worker or Redis loss.
- Do not assume Redis is the durable source of case truth; Document provider replay limitations.
- Run disaster-recovery exercises before production sign-off.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Node.js 24 LTS for the production runtime` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Fastify 5.11.x for schema-based HTTP APIs and response serialization` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `PostgreSQL for relational records, history, and transactional integrity` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `Prisma or an equivalent typed ORM with reviewed migrations` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `Redis plus BullMQ for background queues, retries, delayed work, and job state` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Private S3-compatible object storage for original sources, intermediates, and generated documents` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Server-sent events for processing updates` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Containerized deployment with separate web, API, worker, and scheduler processes` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Provider adapters for transcription, extraction, PDF conversion, storage, and RingCentral` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Case service creates and reads verification cases` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
