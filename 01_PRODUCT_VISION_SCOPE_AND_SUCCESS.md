# Product Vision, Scope, Users, and Success Measures
## US24 Solutions — React VOB Automation Blueprint

**Document:** `01_PRODUCT_VISION_SCOPE_AND_SUCCESS.md`
**Document order:** 2 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Next:** [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define the problem, product promise, users, boundaries, status semantics, measurable outcomes, and unresolved business decisions.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
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

## 1. Problem statement

- US24 staff currently fill VOB information manually after payer calls and need a reliable way to verify that the form reflects what was actually confirmed.
- Call transcripts contain IVR prompts, greetings, repeated questions, caller assumptions, speech-to-text errors, corrections, and unrelated conversation.
- A visually complete form can still contain materially wrong values such as policy identifiers, authorization thresholds, coinsurance, or timely filing.
- The existing generator produces polished PDFs but cannot prove that its values are supported by the source call.
- Repeated benefit calls can create duplicate records and overwrite changing financial values without historical context.
- Static payer information is repeatedly entered even when it should be reused from a controlled carrier master.
- Long recordings can fail in a monolithic upload or transcription process.
- The product must reduce manual effort without creating false confidence or silently inventing benefits.

## 2. Product vision

- Create an evidence-first VOB operations workspace that turns payer calls and existing forms into explainable, reviewable, versioned benefit records.
- Make every consequential value traceable to a transcript statement, approved master-data version, existing patient record, deterministic calculation, or documented manual exception.
- Allow an operator to understand why a field matched, failed, or needs review without reading the entire call.
- Preserve the familiar US24 report and brand while replacing the manual document workflow with a safer operational system.
- Optimize for low critical false-pass risk rather than maximizing the number of automatic passes.

## 3. Product principles

- Evidence before automation.
- No silent assumptions.
- The payer representative's final unambiguous confirmation normally outranks a caller's leading question.
- Unknown is not equivalent to No.
- Not discussed is not equivalent to Not applicable.
- A correction creates history rather than erasing the original.
- AI proposes structured facts; deterministic business rules determine status.
- The user sees uncertainty at the field where it matters.
- Reusable master data is scoped, dated, and reviewable.
- The clean final PDF is an outcome of successful verification, not the starting action.
- Manual upload always remains available.
- No empty or placeholder-only screens are acceptable in the demo or production UI.

## 4. Primary personas

- VOB specialist uploads a recording or transcript, imports or fills a form, reviews extracted values, resolves highlighted fields, and generates the final document.
- QA reviewer opens FAILED or NEEDS REVIEW records, inspects evidence, approves a supported exception, and reruns verification.
- Operations lead monitors processing, duplicate risk, review queues, turnaround time, false-pass findings, and carrier-master quality.
- Template maintainer maps the client-supplied official template to canonical fields and validates PDF output.
- Carrier-data maintainer adds or versions payer phone, payer ID, claim address, authorization route, and timely-filing rules.
- Technical operator monitors background jobs, integration health, failed parsers, transcription providers, and storage lifecycle.
- These are functional personas even though version one has no visible role-based login interface.

## 5. Jobs to be done

- When I receive a payer call recording, help me turn it into a structured VOB without retyping every confirmed answer.
- When I receive a completed VOB, compare it to the call and show exactly which fields are unsupported or wrong.
- When the transcript is noisy, show the competing evidence and route the case to review instead of guessing.
- When a representative corrects an earlier answer, use the final confirmed value and preserve the earlier statement as conflict history.
- When a field cannot be verified, let me record why without forcing false information.
- When the same patient is verified again, copy stable values, update dynamic values, and show what changed.
- When carrier information is stable, reuse the approved version rather than asking for it on every call.
- When processing a long call, show progress, allow retry, and avoid restarting successful work.
- When verification is complete, generate the standardized client PDF and a traceable internal audit record.

## 6. Product modes

- Mode A is automatic filling from audio or transcript into a blank canonical VOB and client template.
- Mode B is audit of an already-filled VOB against audio or transcript.
- Mode C is repeat verification using a previous VOB as a starting snapshot with current-call updates.
- Mode D is carrier-master maintenance for controlled reusable payer information.
- Mode E is record review for FAILED, NEEDS REVIEW, previous versions, and generated documents.
- Mode F is future RingCentral import of call recordings or transcripts without removing manual upload.

## 7. In-scope capabilities

- Source upload, paste, validation, progress, cancellation, and retry.
- Text extraction from supported documents.
- Audio transcription with speaker segments and timestamps.
- Relevance classification that excludes non-benefit talk from extraction while retaining the original.
- Canonical VOB form with source provenance on every field.
- Prefill from imported form, previous VOB, patient record, and carrier master.
- Field synonym and payer-terminology dictionary.
- Correction, contradiction, negation, unknown, and scope detection.
- Field-specific normalization for text, identifiers, dates, money, percentages, phone numbers, booleans, and ranges.
- Deterministic comparison and conditional requiredness.
- Inline error and review presentation.
- Controlled bypass and manual resolution.
- Base records, deduplication candidates, versions, and field deltas.
- Saved-record list and filters.
- Official PDF generation and Excel export.
- Future RingCentral adapter.
- Operational metrics and audit events.

## 8. Explicit non-goals for the first release

- Do not build a patient-facing portal.
- Do not build claims submission or payment adjudication.
- Do not guarantee payer reimbursement.
- Do not replace payer portals or clearinghouse eligibility transactions.
- Do not infer benefits from general insurance knowledge.
- Do not auto-update the carrier master from one call without review.
- Do not add public signup, social login, or a visible login page.
- Do not build autonomous approval that hides evidence.
- Do not perform broad medical coding or clinical decision support.
- Do not use filename text as verified patient, payer, or plan data.
- Do not support scanned image-only forms unless OCR is separately approved and tested.
- Do not call a record PASSED solely from a high aggregate percentage.

## 9. Case outcome semantics

- PASSED means every applicable required and critical field is matched or resolved by an approved rule, with no unresolved conflict or low-confidence condition.
- FAILED means at least one definite required or critical mismatch, missing required value, unsupported assertion, or prohibited bypass remains.
- NEEDS REVIEW means the case lacks a definite failure but contains ambiguity, conflicting evidence, low confidence, unavailable information, or a review-requiring bypass.
- FAILED takes precedence over NEEDS REVIEW, and NEEDS REVIEW takes precedence over PASSED.
- PROCESSING means source work is not complete and is not a business audit result.
- DRAFT means the user has not completed verification.
- FINALIZED means a permitted result and selected revision have been locked for output.
- A percentage score is informative only and never overrides critical field rules.

## 10. Success metrics

- Critical false-pass rate is the primary safety metric and should approach zero on the approved test set.
- Normalized exact-match accuracy measures correct comparisons after allowed formatting differences.
- Field extraction precision, recall, and F1 are tracked by field and source type.
- Evidence-link coverage measures how many transcript-derived values have usable source evidence.
- False-No rate measures cases where unknown, unavailable, or not discussed was incorrectly converted to No.
- Manual review rate is monitored by field to identify weak prompts, parsers, or business rules.
- Median and percentile processing latency are measured separately for text documents, short audio, and long audio.
- Long-file completion rate measures resumable processing reliability.
- Duplicate detection precision and recall measure record-linking quality.
- Dynamic accumulator delta accuracy measures deductible, OOP, and visit updates.
- PDF completeness and no-overflow rates measure document quality.
- Operator correction time and total turnaround time measure workflow improvement.

## 11. Operational constraints

- The current client asks for no visible login.
- The final field criticality matrix is pending and must remain configuration-driven.
- The exact official PDF mapping will be finalized after the client supplies and approves the template.
- Transcription and extraction providers must be replaceable behind adapters.
- RingCentral product type, licenses, permissions, and retention settings must be confirmed before implementation.
- Processing time varies with file size, queue load, provider latency, and audio quality; the UI must not promise a fixed completion time.
- Insurance terminology and plan rules vary by payer, product, state, network, service, provider contract, and effective period.
- The platform handles sensitive patient and insurance data and requires controlled deployment even without a visible login.

## 12. Open business decisions

- Approve the mandatory, optional, conditional, and critical field matrix.
- Approve which bypass reasons allow PASSED versus force NEEDS REVIEW or FAILED.
- Approve whether a QA reviewer may manually approve a critical mismatch and under what authority.
- Approve the required identity for `Verified by` when there is no app login.
- Approve the exact duplicate-key policy and manual merge rules.
- Approve how fuzzy patient-name and identifier suffix matches are handled.
- Approve whether scanned PDFs and OCR are in the first release.
- Approve retention periods for audio, transcripts, forms, evidence, PDFs, and audit events.
- Approve whether clean final PDFs are permitted for NEEDS REVIEW after documented override.
- Approve the carrier-master ownership and change-approval process.
- Approve the RingCentral product and integration path.
- Approve target service-level objectives and maximum supported recording length.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `US24 staff currently fill VOB information manually after payer calls and need a reliable way to verify that the form reflects what was actually confirmed` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Call transcripts contain IVR prompts, greetings, repeated questions, caller assumptions, speech-to-text errors, corrections, and unrelated conversation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `A visually complete form can still contain materially wrong values such as policy identifiers, authorization thresholds, coinsurance, or timely filing` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `The existing generator produces polished PDFs but cannot prove that its values are supported by the source call` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `Repeated benefit calls can create duplicate records and overwrite changing financial values without historical context` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Static payer information is repeatedly entered even when it should be reused from a controlled carrier master` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Long recordings can fail in a monolithic upload or transcription process` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `The product must reduce manual effort without creating false confidence or silently inventing benefits` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Create an evidence-first VOB operations workspace that turns payer calls and existing forms into explainable, reviewable, versioned benefit records` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Make every consequential value traceable to a transcript statement, approved master-data version, existing patient record, deterministic calculation, or documented manual exception` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-011 — Domain review: confirm `Allow an operator to understand why a field matched, failed, or needs review without reading the entire call` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-012 — QA verification: confirm `Preserve the familiar US24 report and brand while replacing the manual document workflow with a safer operational system` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-013 — Accessibility review: confirm `Optimize for low critical false-pass risk rather than maximizing the number of automatic passes` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-014 — Security review: confirm `Evidence before automation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-015 — Regression protection: confirm `No silent assumptions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-016 — Client acceptance: confirm `The payer representative's final unambiguous confirmation normally outranks a caller's leading question` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-017 — Implementation: confirm `Unknown is not equivalent to No` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-018 — Design review: confirm `Not discussed is not equivalent to Not applicable` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-019 — Domain review: confirm `A correction creates history rather than erasing the original` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-020 — QA verification: confirm `The user sees uncertainty at the field where it matters` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-021 — Accessibility review: confirm `Reusable master data is scoped, dated, and reviewable` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-022 — Security review: confirm `The clean final PDF is an outcome of successful verification, not the starting action` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-023 — Regression protection: confirm `Manual upload always remains available` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-024 — Client acceptance: confirm `No empty or placeholder-only screens are acceptable in the demo or production UI` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-025 — Implementation: confirm `VOB specialist uploads a recording or transcript, imports or fills a form, reviews extracted values, resolves highlighted fields, and generates the final document` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-026 — Design review: confirm `QA reviewer opens FAILED or NEEDS REVIEW records, inspects evidence, approves a supported exception, and reruns verification` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-027 — Domain review: confirm `Operations lead monitors processing, duplicate risk, review queues, turnaround time, false-pass findings, and carrier-master quality` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-028 — QA verification: confirm `Template maintainer maps the client-supplied official template to canonical fields and validates PDF output` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-029 — Accessibility review: confirm `Carrier-data maintainer adds or versions payer phone, payer ID, claim address, authorization route, and timely-filing rules` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-030 — Security review: confirm `Technical operator monitors background jobs, integration health, failed parsers, transcription providers, and storage lifecycle` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-031 — Regression protection: confirm `These are functional personas even though version one has no visible role-based login interface` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-032 — Client acceptance: confirm `When I receive a payer call recording, help me turn it into a structured VOB without retyping every confirmed answer` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-033 — Implementation: confirm `When I receive a completed VOB, compare it to the call and show exactly which fields are unsupported or wrong` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-034 — Design review: confirm `When the transcript is noisy, show the competing evidence and route the case to review instead of guessing` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-035 — Domain review: confirm `When a representative corrects an earlier answer, use the final confirmed value and preserve the earlier statement as conflict history` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-036 — QA verification: confirm `When a field cannot be verified, let me record why without forcing false information` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-037 — Accessibility review: confirm `When the same patient is verified again, copy stable values, update dynamic values, and show what changed` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-038 — Security review: confirm `When carrier information is stable, reuse the approved version rather than asking for it on every call` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-039 — Regression protection: confirm `When processing a long call, show progress, allow retry, and avoid restarting successful work` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-040 — Client acceptance: confirm `When verification is complete, generate the standardized client PDF and a traceable internal audit record` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-041 — Implementation: confirm `Mode A is automatic filling from audio or transcript into a blank canonical VOB and client template` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-042 — Design review: confirm `Mode B is audit of an already-filled VOB against audio or transcript` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-043 — Domain review: confirm `Mode C is repeat verification using a previous VOB as a starting snapshot with current-call updates` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-044 — QA verification: confirm `Mode D is carrier-master maintenance for controlled reusable payer information` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-045 — Accessibility review: confirm `Mode E is record review for FAILED, NEEDS REVIEW, previous versions, and generated documents` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-046 — Security review: confirm `Mode F is future RingCentral import of call recordings or transcripts without removing manual upload` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-047 — Regression protection: confirm `Source upload, paste, validation, progress, cancellation, and retry` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-048 — Client acceptance: confirm `Text extraction from supported documents` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-049 — Implementation: confirm `Audio transcription with speaker segments and timestamps` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-050 — Design review: confirm `Relevance classification that excludes non-benefit talk from extraction while retaining the original` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-051 — Domain review: confirm `Canonical VOB form with source provenance on every field` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-052 — QA verification: confirm `Prefill from imported form, previous VOB, patient record, and carrier master` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-053 — Accessibility review: confirm `Field synonym and payer-terminology dictionary` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-054 — Security review: confirm `Correction, contradiction, negation, unknown, and scope detection` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-055 — Regression protection: confirm `Field-specific normalization for text, identifiers, dates, money, percentages, phone numbers, booleans, and ranges` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-056 — Client acceptance: confirm `Deterministic comparison and conditional requiredness` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-057 — Implementation: confirm `Inline error and review presentation` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-058 — Design review: confirm `Controlled bypass and manual resolution` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-059 — Domain review: confirm `Base records, deduplication candidates, versions, and field deltas` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-060 — QA verification: confirm `Saved-record list and filters` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-061 — Accessibility review: confirm `Official PDF generation and Excel export` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-062 — Security review: confirm `Future RingCentral adapter` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-063 — Regression protection: confirm `Operational metrics and audit events` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-064 — Client acceptance: confirm `Do not build a patient-facing portal` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-065 — Implementation: confirm `Do not build claims submission or payment adjudication` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-066 — Design review: confirm `Do not guarantee payer reimbursement` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-067 — Domain review: confirm `Do not replace payer portals or clearinghouse eligibility transactions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-068 — QA verification: confirm `Do not infer benefits from general insurance knowledge` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-069 — Accessibility review: confirm `Do not auto-update the carrier master from one call without review` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-070 — Security review: confirm `Do not add public signup, social login, or a visible login page` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-071 — Regression protection: confirm `Do not build autonomous approval that hides evidence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-072 — Client acceptance: confirm `Do not perform broad medical coding or clinical decision support` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-073 — Implementation: confirm `Do not use filename text as verified patient, payer, or plan data` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-074 — Design review: confirm `Do not support scanned image-only forms unless OCR is separately approved and tested` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-075 — Domain review: confirm `Do not call a record PASSED solely from a high aggregate percentage` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-076 — QA verification: confirm `PASSED means every applicable required and critical field is matched or resolved by an approved rule, with no unresolved conflict or low-confidence condition` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-077 — Accessibility review: confirm `FAILED means at least one definite required or critical mismatch, missing required value, unsupported assertion, or prohibited bypass remains` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-078 — Security review: confirm `NEEDS REVIEW means the case lacks a definite failure but contains ambiguity, conflicting evidence, low confidence, unavailable information, or a review-requiring bypass` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-079 — Regression protection: confirm `FAILED takes precedence over NEEDS REVIEW, and NEEDS REVIEW takes precedence over PASSED` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-080 — Client acceptance: confirm `PROCESSING means source work is not complete and is not a business audit result` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-081 — Implementation: confirm `DRAFT means the user has not completed verification` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-082 — Design review: confirm `FINALIZED means a permitted result and selected revision have been locked for output` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-083 — Domain review: confirm `A percentage score is informative only and never overrides critical field rules` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-084 — QA verification: confirm `Critical false-pass rate is the primary safety metric and should approach zero on the approved test set` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-085 — Accessibility review: confirm `Normalized exact-match accuracy measures correct comparisons after allowed formatting differences` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-086 — Security review: confirm `Field extraction precision, recall, and F1 are tracked by field and source type` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-087 — Regression protection: confirm `Evidence-link coverage measures how many transcript-derived values have usable source evidence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-088 — Client acceptance: confirm `False-No rate measures cases where unknown, unavailable, or not discussed was incorrectly converted to No` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-089 — Implementation: confirm `Manual review rate is monitored by field to identify weak prompts, parsers, or business rules` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-090 — Design review: confirm `Median and percentile processing latency are measured separately for text documents, short audio, and long audio` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-091 — Domain review: confirm `Long-file completion rate measures resumable processing reliability` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-092 — QA verification: confirm `Duplicate detection precision and recall measure record-linking quality` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-093 — Accessibility review: confirm `Dynamic accumulator delta accuracy measures deductible, OOP, and visit updates` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-094 — Security review: confirm `PDF completeness and no-overflow rates measure document quality` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-095 — Regression protection: confirm `Operator correction time and total turnaround time measure workflow improvement` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-096 — Client acceptance: confirm `The current client asks for no visible login` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-097 — Implementation: confirm `The final field criticality matrix is pending and must remain configuration-driven` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
