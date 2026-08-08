# Transcript, Document, Audio Upload, and Processing Pipeline
## US24 Solutions — React VOB Automation Blueprint

**Document:** `07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`
**Document order:** 8 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
**Next:** [`08_EXTRACTION_NORMALIZATION_COMPARISON.md`](./08_EXTRACTION_NORMALIZATION_COMPARISON.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Specify secure source intake, parsing, long-audio transcription, relevance processing, progress, retries, and artifact lineage.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`08_EXTRACTION_NORMALIZATION_COMPARISON.md`](./08_EXTRACTION_NORMALIZATION_COMPARISON.md)
- [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
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

## 1. Supported source matrix

- Audio sources include MP3 and approved WAV, M4A, MP4, MPEG, OGG, FLAC, and WEBM formats when supported by the selected transcription adapter.
- Transcript files include TXT, DOCX, text-based PDF, CSV, and XLSX.
- Completed VOB files include text-based PDF and XLSX.
- Pasted transcript text is stored as a source artifact with a generated filename and checksum.
- RingCentral recordings or transcripts are future source artifacts with provider record identifiers.
- Image-only or scanned PDFs are detected and not silently treated as empty text.
- Every format has a configured maximum size, maximum duration where applicable, and parser version.

## 2. Upload user experience

- Show accepted extensions and practical guidance before file selection.
- Perform client-side extension and size checks for fast feedback without treating them as security controls.
- Compute a checksum in a worker when practical.
- Request a short-lived server-generated upload target.
- Upload directly to private object storage.
- Show per-file progress, part progress for large files, retry, cancel, and resume.
- After upload, call a finalize endpoint that verifies metadata and checksum.
- Keep the source card visible throughout processing.
- Never embed cloud credentials in the React bundle.

## 3. Server-side upload validation

- Allow-list extensions and expected MIME types.
- Inspect file signatures rather than trusting the filename or browser MIME.
- Generate storage object names instead of using user filenames as paths.
- Store the original filename only as metadata.
- Enforce size, duration, page, sheet, and decompression limits.
- Reject executables, scripts, macros, encrypted documents that cannot be safely parsed, and malformed archives.
- Scan or quarantine uploads according to the deployment policy.
- Prevent path traversal and formula injection in downstream exports.
- Record validation outcome without logging sensitive file content.

## 4. Object-storage design

- Use a private bucket or equivalent private object store.
- Use separate prefixes or buckets for original sources, normalized intermediates, generated documents, and temporary chunks.
- Use short-lived presigned uploads with minimum permissions.
- Use server-side encryption and approved key management.
- Store checksum, content type, size, uploader context, and retention class in the database.
- Use immutable object keys for originals.
- Do not overwrite an existing source object when a new upload has the same filename.
- Delete abandoned multipart uploads on a scheduled lifecycle.
- Use signed downloads only after case-level authorization at the controlled boundary.

## 5. Multipart and resumable upload

- Use multipart upload for large audio according to configured thresholds.
- Split the file into independently retryable parts.
- Persist upload ID and completed part numbers server-side.
- Resume after browser refresh by querying upload status.
- Verify the completed object checksum or provider integrity data.
- Abort multipart sessions after explicit cancellation.
- Show a clear distinction between upload completion and transcription completion.
- Do not restart successful parts after one part fails.

## 6. TXT and pasted-text parsing

- Detect UTF-8 and approved fallback encodings.
- Normalize line endings without changing the preserved original.
- Retain speaker labels, timestamps, and blank-line boundaries.
- Reject or review binary-looking content.
- Create line and character offsets for evidence linking.
- Do not remove IVR or irrelevant text from the preserved artifact.
- Store a normalized searchable copy separately.

## 7. DOCX parsing

- Extract paragraphs, tables, headers, footers, and ordering information.
- Preserve cell coordinates for form-label mapping.
- Collect text runs without treating highlight color as authoritative business logic.
- Detect tracked changes or comments when the parser supports them.
- Record parser warnings for floating text boxes or unsupported objects.
- Never execute macros.
- Create page-independent evidence locations such as paragraph and table-cell identifiers.

## 8. Text PDF parsing

- Determine whether usable text exists on each page.
- Extract text with page, bounding box, and reading-order metadata when possible.
- Detect repeated headers, footers, and logos.
- Preserve page images for visual review.
- Flag low-text or scrambled-layout pages.
- Use layout-aware label-to-value mapping rather than plain concatenated text for completed forms.
- Route image-only pages to OCR only when OCR is an approved scope.
- Store PDF parser version and warnings.

## 9. CSV and Excel parsing

- Treat identifier columns as strings to preserve leading zeros and suffixes.
- Inspect all sheets rather than assuming the first is authoritative.
- Capture sheet name, cell address, raw value, formatted value, and formula presence.
- Do not evaluate untrusted formulas.
- Map headers and labels through the configurable synonym dictionary.
- Detect merged cells and multi-row labels.
- Show ambiguous mapping in NEEDS REVIEW rather than selecting a random column.
- Neutralize dangerous formula prefixes during generated CSV or Excel export.

## 10. Audio preflight

- Read duration, channels, codec, sample rate, and bitrate.
- Reject unreadable or corrupt media with a source-specific message.
- Estimate processing class as short, standard, long, or very long.
- Detect silence-only or extremely low-audio sources where possible.
- Preserve the original audio artifact.
- Create a normalized speech-friendly derivative using a controlled media worker.
- Use mono or channel-aware processing according to source quality and provider behavior.
- Record transformation commands and checksums without logging audio content.

## 11. Long-recording strategy

- Never send a two-hour recording as one fragile synchronous browser request.
- Chunk audio in a background worker using silence-aware boundaries where reliable.
- Use a small overlap to avoid cutting words and carry global timestamps through every chunk.
- Persist each chunk as a child artifact with sequence and time range.
- Transcribe chunks independently with retry and concurrency limits.
- Resume only failed or missing chunks.
- Detect duplicate overlap text during stitching.
- Detect gaps, reversed chunks, or missing time ranges.
- Run a second consistency pass over the stitched transcript.
- Expose chunk progress and degraded chunks to the user.

## 12. Transcription adapter contract

- Accept a normalized audio object reference and transcription options.
- Return transcript text, segments, speaker labels, start and end times, language, and provider metadata.
- Support provider-specific chunking without leaking it into business logic.
- Support speaker diarization when the provider offers it.
- Support vocabulary or prompt hints for payer names and VOB terminology when approved.
- Return retryable and non-retryable error categories.
- Return usage and latency metadata for operations.
- Never store provider API keys in browser code.
- Use an approved provider agreement before sending sensitive data.

## 13. Speaker and role processing

- Keep provider diarization labels as raw speaker identifiers.
- Classify segments as payer representative, provider-office caller, IVR, supervisor, or unknown.
- Do not assume the first speaker is always IVR or the second is always the caller.
- Use greetings, question patterns, call context, and optional known-speaker hints.
- Allow manual role correction without editing transcript text.
- When speaker role is uncertain, lower authority and route affected fields to review.
- Keep role-classifier version and confidence.

## 14. Relevance classification

- Label IVR navigation, monitoring notices, greetings, hold messages, surveys, and unrelated conversation as non-target context.
- Retain all text in the original transcript.
- Exclude non-target segments from normal field extraction unless a field specifically allows that source.
- Keep neighboring relevant context so negation and corrections are not lost.
- Mark provider credentialing data relevant only when a configured field needs it.
- Do not remove a statement merely because it is multilingual or grammatically noisy.
- Expose a toggle to show or hide non-target segments in the UI.

## 15. Processing state machine

- CREATED.
- VALIDATING.
- UPLOADING.
- UPLOADED.
- PARSING.
- TRANSCODING.
- TRANSCRIBING.
- STITCHING.
- DIARIZING.
- CLASSIFYING_RELEVANCE.
- EXTRACTING.
- COMPARING.
- READY_FOR_REVIEW.
- COMPLETED_WITH_WARNINGS.
- FAILED_RETRYABLE.
- FAILED_FINAL.
- CANCELLED.
- Each transition is persisted, timestamped, and idempotent.

## 16. Progress event model

- Emit case ID, job ID, stage, status, completed units, total units where known, message code, and timestamp.
- Use server-sent events or another resilient update channel.
- Treat percent as exact only when total work is known.
- Show indeterminate stage animation when provider work has no measurable progress.
- Replay current state after reconnect.
- Do not leak transcript text or PHI into generic event messages.
- Persist final stage summaries for later diagnostics.

## 17. Retry, cancellation, and recovery

- Retry transient storage, network, provider-rate, and worker failures with bounded backoff.
- Do not retry unsupported format, corrupted source, or policy violation without source replacement.
- Use idempotency keys so retries do not create duplicate artifacts or cases.
- Allow cancelling queued and cooperative active work.
- Keep completed stages and chunks after a retryable later-stage failure.
- Make partial transcript viewing read-only until stitching is complete.
- Record who or what initiated retry or cancellation through available operator context.
- Surface correlation IDs for support without exposing secrets.

## 18. Artifact lineage

- Link normalized audio to the original recording.
- Link chunks to normalized audio and global time ranges.
- Link transcript segments to chunk and provider response.
- Link extracted facts to one or more transcript segments.
- Link imported canonical values to page, cell, or source label.
- Link comparison results to the exact field revision and extraction run.
- Link generated documents to the selected revision, template version, and rule version.
- Lineage must survive retries and provider changes.

## 19. Retention and cleanup

- Assign retention classes separately to original audio, transcript, parsed text, chunks, completed forms, generated PDFs, and logs.
- Delete temporary chunks after the approved recovery window when they are no longer required.
- Do not let aborted multipart uploads accumulate.
- Honor legal or operational holds through explicit metadata.
- Record deletion events and outcome.
- Ensure generated evidence links handle an intentionally deleted source with a clear retention message.
- The final retention schedule is pending client and compliance approval.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Audio sources include MP3 and approved WAV, M4A, MP4, MPEG, OGG, FLAC, and WEBM formats when supported by the selected transcription adapter` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Transcript files include TXT, DOCX, text-based PDF, CSV, and XLSX` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `Completed VOB files include text-based PDF and XLSX` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `Pasted transcript text is stored as a source artifact with a generated filename and checksum` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `RingCentral recordings or transcripts are future source artifacts with provider record identifiers` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Image-only or scanned PDFs are detected and not silently treated as empty text` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Every format has a configured maximum size, maximum duration where applicable, and parser version` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Show accepted extensions and practical guidance before file selection` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Perform client-side extension and size checks for fast feedback without treating them as security controls` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Compute a checksum in a worker when practical` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-011 — Domain review: confirm `Request a short-lived server-generated upload target` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-012 — QA verification: confirm `Upload directly to private object storage` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-013 — Accessibility review: confirm `Show per-file progress, part progress for large files, retry, cancel, and resume` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-014 — Security review: confirm `After upload, call a finalize endpoint that verifies metadata and checksum` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-015 — Regression protection: confirm `Keep the source card visible throughout processing` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-016 — Client acceptance: confirm `Never embed cloud credentials in the React bundle` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-017 — Implementation: confirm `Allow-list extensions and expected MIME types` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-018 — Design review: confirm `Inspect file signatures rather than trusting the filename or browser MIME` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-019 — Domain review: confirm `Generate storage object names instead of using user filenames as paths` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-020 — QA verification: confirm `Store the original filename only as metadata` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-021 — Accessibility review: confirm `Enforce size, duration, page, sheet, and decompression limits` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-022 — Security review: confirm `Reject executables, scripts, macros, encrypted documents that cannot be safely parsed, and malformed archives` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-023 — Regression protection: confirm `Scan or quarantine uploads according to the deployment policy` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-024 — Client acceptance: confirm `Prevent path traversal and formula injection in downstream exports` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-025 — Implementation: confirm `Record validation outcome without logging sensitive file content` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-026 — Design review: confirm `Use a private bucket or equivalent private object store` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-027 — Domain review: confirm `Use separate prefixes or buckets for original sources, normalized intermediates, generated documents, and temporary chunks` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-028 — QA verification: confirm `Use short-lived presigned uploads with minimum permissions` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
