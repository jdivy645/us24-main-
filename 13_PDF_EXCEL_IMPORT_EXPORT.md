# PDF and Excel Import, Mapping, Generation, and Export
## US24 Solutions — React VOB Automation Blueprint

**Document:** `13_PDF_EXCEL_IMPORT_EXPORT.md`
**Document order:** 14 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
**Next:** [`14_SECURITY_PRIVACY_ACCESSIBILITY.md`](./14_SECURITY_PRIVACY_ACCESSIBILITY.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define safe document ingestion, canonical mapping, official-template rendering, PDF gating, Excel exports, file naming, previews, and document QA.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)
- [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
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

## 1. Document responsibilities

- Import completed VOB values from PDF or Excel into the canonical field registry.
- Preserve the original file and source locations.
- Render the client-approved official template from a selected canonical revision.
- Generate internal QA reports that explain mismatches and resolutions.
- Export operational record data to Excel.
- Provide previews without treating preview rendering as finalization.
- Keep template version, rule version, revision, and checksum linked to every generated document.

## 2. Completed PDF import

- Detect text-based versus image-only pages.
- Extract text with page and position metadata.
- Use label dictionaries and layout relationships to map labels to values.
- Preserve line wraps and repeated labels.
- Handle a value that appears in the neighboring column.
- Capture unmapped text for review.
- Show every mapping in the source viewer.
- Do not treat the PDF's polished appearance as proof of correctness.
- Reject or route encrypted or malformed documents appropriately.

## 3. Image-only PDF policy

- Detect that no usable text layer exists.
- Show `Image-only PDF` in the source card.
- Do not silently create a blank canonical form.
- If OCR is not approved, require a text PDF, Excel file, or manual entry.
- If OCR is later approved, store OCR output as a distinct derived artifact with confidence and page boxes.
- OCR-derived critical values normally require review until validated.
- The first-release decision remains pending client approval.

## 4. Excel import

- Read XLSX and approved CSV formats.
- Preserve identifiers as strings.
- Inspect all sheets and named ranges.
- Capture raw, formatted, and formula values.
- Never execute macros or untrusted formulas.
- Map headers and labels through aliases.
- Detect one-record-per-row and label-value layouts.
- Show ambiguous headers.
- Store source sheet and cell for every imported value.
- Use the official sample structures as fixtures when supplied.

## 5. Canonical mapping workflow

- Run automatic label and layout mapping.
- Assign mapping confidence.
- Materialize a canonical original form revision.
- Show unmapped required fields in red after rule evaluation.
- Show ambiguous mappings in amber.
- Allow manual mapping without altering the source.
- Save a template or import-profile mapping only after approval.
- Version import mappings.
- Reuse mappings by source-template signature, not filename alone.

## 6. Template registry

- Template ID; Template version.
- Client-visible name; File type.
- Effective-from and effective-through dates.
- Scope such as payer, service, or general.
- Source file checksum; Rendering engine.
- Canonical field bindings.
- Formatting rules; Required anchors.
- Page and overflow constraints.
- Validation status; Activation status.

## 7. Preferred final-template strategy

- Prefer a controlled DOCX template with explicit placeholders or content controls when the client permits it.
- Convert the filled DOCX to PDF in a reproducible server-side environment.
- If the official source is a fillable PDF, map canonical fields to form-field names.
- If the official PDF is non-fillable, use a versioned coordinate overlay map.
- Do not approximate coordinates separately in frontend and backend.
- Keep one rendering implementation as authoritative.
- The client-supplied format decides the final method after inspection.

## 8. Official PDF content

- US24 logo and tagline.
- Pre-Authorization and Benefits Determination title.
- Patient name and DOB.
- Verification date and verified-by label.
- Additional information or patient-responsibility banner.
- Insurance name and contact number.
- Policy ID and group ID.
- Service, plan, group network, individual-provider network, and coverage.
- Effective and termination information.
- HSA, HRA, or HCA value.
- Copay, coinsurance, deductible, and OOP.
- Visit limits and use.
- Authorization and referral.
- Primary and secondary coverage.
- Representative and call reference.
- Claim address, payer ID, original TFL, and corrected TFL.
- Secondary-insurance details when applicable.
- Benefits-not-guaranteed disclaimer.

## 9. Responsibility-banner rules

- Do not generate a 100 percent coverage banner from No copay and No coinsurance.
- Build the banner from explicitly supported or approved derived facts.
- Include deductible and OOP conditions when they materially affect responsibility.
- Use payer versus patient percentage semantics correctly.
- Mark the banner as reviewable when its source facts conflict.
- Keep the free-text note separate from structured facts.
- Validate that the note does not contradict the canonical fields.
- Allow the client to approve standardized wording templates.

## 10. Dynamic values and as-of dates

- Render values from the selected verification version, not the base record's latest unrelated values.
- Include verification or as-of date for accumulator information where the template permits.
- Never silently replace a historical PDF's deductible with a newer version.
- Generate a new document for a new version.
- Store the selected revision and version IDs in document metadata.
- Show the date in the records and document list.

## 11. Document status policy

- PASSED permits a clean final VOB.
- FAILED permits an internal QA report and optionally a red `QA FAILED — DRAFT` document.
- NEEDS REVIEW permits an internal QA report and amber `NEEDS REVIEW — DRAFT` document.
- DRAFT and PROCESSING do not permit a clean final VOB.
- FINALIZED clean documents are immutable.
- A later correction creates a new superseding document.
- Every download UI shows document type and status.

## 12. Internal QA report

- Case and version identifiers.
- Overall result and rule version.
- Original form revision.
- Current revision; Counts by field state.
- Every mismatch with form value, supported value, source, and evidence.
- Every conflict with all candidates.
- Every bypass with reason and consequence.
- Every manual approval.
- Master-data versions used.
- Processing warnings.
- Document generation time and checksum.
- The QA report is separate from the client-facing VOB.

## 13. Layout quality rules

- Match the signed-off page size and margins.
- Preserve US24 brand proportions.
- Use table widths that prevent clipped identifiers.
- Wrap long coverage and authorization text.
- Keep labels with their values.
- Prevent orphaned section labels.
- Avoid tiny unreadable font reduction.
- Add a new page only when needed.
- Do not emit the accidental logo-only second page seen in the supplied sample.
- Validate page count and non-empty content.

## 14. Live preview behavior

- Preview the currently selected form revision.
- Show a visible DRAFT or result watermark when not finalized.
- Update after a short debounce.
- Do not imply that a preview is saved or finalized.
- Show template version.
- Allow zoom and page navigation.
- Keep preview rendering errors separate from form validation.
- Use the same field formatting contract as server generation.
- Final server PDF remains authoritative.

## 15. Excel operational export

- Export filtered records or a selected base record's versions.
- Include status, processing state, patient, payer, policy, group, service, dates, version, issue counts, call reference, and document state.
- Optionally include canonical fields in a wide VOB sheet.
- Include a separate issue sheet.
- Include a separate version-delta sheet.
- Include a carrier-master-use sheet where requested.
- Preserve identifiers as text.
- Escape formula-leading characters.
- Freeze headers and set practical widths.
- Never include raw transcript text by default.

## 16. Excel template import profile

- Profile ID and version.
- Recognized sheet names; Header aliases.
- Cell or column mappings.
- Date and money formats.
- Identifier preservation rules.
- Required columns; Ignored columns.
- Validation messages.
- Source checksum or structural signature.
- Activation state.
- Profiles are reviewed before reuse.

## 17. File naming

- Use a sanitized deterministic display filename.
- Include patient last name only when the client approves it for downloaded files.
- Include payer, verification date, and version where useful.
- Do not rely on the filename as record identity.
- Avoid unsupported characters.
- Keep a server document ID and checksum independent of the name.
- Differentiate FINAL, NEEDS_REVIEW_DRAFT, QA_FAILED_DRAFT, and QA_REPORT.
- Do not overwrite an existing finalized document.

## 18. Download and access

- Return short-lived signed downloads after server authorization at the controlled boundary.
- Do not expose private storage object keys as permanent URLs.
- Log document download events at an appropriate level.
- Show file size and generated time.
- Warn before downloading a draft mistaken for a final.
- Revoke or expire links quickly.
- Do not embed PHI in analytics events.

## 19. Document testing

- Golden-image comparison of the client-approved template.
- Text extraction check to confirm every expected value appears.
- Page-count assertion.
- No-empty-trailing-page assertion.
- Long-name, long-address, long-coverage, and long-authorization fixtures.
- Leading-zero identifier fixture.
- Money and percentage formatting fixture.
- Secondary-insurance conditional layout.
- FAILED and NEEDS REVIEW watermark fixture.
- Template-version regression tests.
- Excel round-trip mapping tests.
- Formula-injection tests.
- PDF viewer and download accessibility tests.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Import completed VOB values from PDF or Excel into the canonical field registry` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Preserve the original file and source locations` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `Render the client-approved official template from a selected canonical revision` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `Generate internal QA reports that explain mismatches and resolutions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `Export operational record data to Excel` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Provide previews without treating preview rendering as finalization` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Keep template version, rule version, revision, and checksum linked to every generated document` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Detect text-based versus image-only pages` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Extract text with page and position metadata` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Use label dictionaries and layout relationships to map labels to values` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
