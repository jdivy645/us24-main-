# Testing Strategy, Acceptance Criteria, and Golden Sample Cases
## US24 Solutions — React VOB Automation Blueprint

**Document:** `15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md`
**Document order:** 16 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`14_SECURITY_PRIVACY_ACCESSIBILITY.md`](./14_SECURITY_PRIVACY_ACCESSIBILITY.md)
**Next:** [`16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md`](./16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define test layers, golden fixtures, discrepancy expectations, performance and accessibility checks, release gates, and production-monitoring quality metrics.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
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
- US24 meeting summary dated August 6, 2026.
- Official framework, vendor, security, and accessibility research is indexed in file 17.

---

## 1. Quality objective

- Prevent materially incorrect VOBs from being marked PASSED.
- Prove every automatic decision with deterministic rules and source evidence.
- Test uncertainty and unknown states as carefully as successful matches.
- Test the actual client sources, not only clean synthetic data.
- Keep source, parser, model, rule, and template versions reproducible.
- Treat document output and workflow recovery as first-class quality areas.

## 2. Test layers

- Pure domain unit tests; Normalization property and table tests.
- Rule-engine unit tests; Parser fixture tests.
- Transcription-adapter contract tests; Extraction schema and evaluation tests.
- Comparison integration tests; Database repository tests.
- Queue and worker integration tests.
- API contract tests; React component tests.
- Browser E2E tests; Accessibility tests.
- Visual regression tests; PDF and Excel tests.
- Security and upload tests.
- Performance and resilience tests; User acceptance tests.

## 3. Domain unit tests

- Field requiredness expressions; Criticality precedence.
- Bypass consequences; Status precedence.
- Stale-comparison detection; Version and revision immutability.
- Duplicate-key scoring; Carrier-master specificity.
- Temporal effective-period selection.
- Derived-money calculations; Visit-count derivation.
- Unknown versus No behavior.

## 4. Normalization tests

- `$20`, `$20.00`, and `twenty dollars` match; `10/07/2010` and `October 7th 2010` match.
- `INN` and `in network` match; Phone punctuation is normalized.
- Leading zeros remain in group IDs; Policy suffixes remain unless a payer rule permits equivalence.
- `Current` is not converted into a fake termination date.
- 20 percent patient coinsurance is not mislabeled as 20 percent payer coverage.
- No copay and no coinsurance do not derive 100 percent; Ambiguous numeric dates require review.

## 5. Parser fixture matrix

- Clean TXT transcript; Noisy TXT transcript with timestamps.
- DOCX paragraphs and tables; DOCX colored text without a legend.
- Text PDF with two columns; Image-only PDF.
- PDF with repeated header and trailing logo page.
- CSV label-value format; Excel one-row format.
- Excel label-value grid.
- Excel leading-zero IDs; Excel formula cells.
- Malformed file; Encrypted file; Oversized file.

## 6. Audio tests

- Short clear two-speaker audio; IVR plus live representative.
- Noisy call; Overlapping speech.
- Long silence; Multiple representative transfer.
- Two-hour-plus synthetic or approved test audio.
- Chunk boundary at a number; Interrupted upload and resume.
- Failed middle chunk and retry.
- Duplicate overlap removal; Missing chunk detection.
- Cancellation; Provider timeout.
- Unsupported codec.

## 7. Extraction evaluation set

- Representative answer after caller question.
- Short Yes linked to one proposition; Ambiguous Yes after multiple questions.
- Explicit No; Payer unable to verify.
- Not discussed; Correction with `actually`.
- Correction without explicit phrase but clear restatement; Two unresolved representative values.
- Service-scope difference; Individual versus family difference.
- Original versus corrected claim rule.
- Date and money ASR errors; Payer-specific identifier suffix.
- Prompt-injection text embedded in transcript.

## 8. Supplied golden-case setup

- Use `VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf` as the completed form.
- Use `CARSTEN UHC (AARA) (2).txt` as the call transcript; Use the marked blank template as a field and output reference.
- Keep an immutable copy of the fixture; Record expected outcomes by field.
- Do not manually clean the transcript before the test.
- Run the fixture after parser, prompt, normalizer, rule, or model changes.

## 9. Golden-case expected matches

- DOB 10/07/2010 matches October 7, 2010; Service PT is supported.
- Effective date October 1, 2025 is supported; Individual deductible total 3000 is supported.
- OOP maximum 6500 is supported; OOP remaining 5473.76 is supported.
- Group ID 00633434 is supported; Visit limit 20 hard maximum is supported.
- Visits used one matches the final corrected call context.
- Primary payer Cigna ASH is supported; Call reference 20874738 matches.
- These expectations still retain evidence and confidence.

## 10. Golden-case required mismatch or review outcomes

- Authorization threshold PDF fifth visit versus transcript eighth visit is MISMATCH.
- Original TFL PDF 90 days versus transcript 180 days is MISMATCH or critical review under final policy.
- Coinsurance PDF 20 percent versus conflicting 20 and 30 percent source is CONFLICT_IN_SOURCE.
- Secondary PDF No versus payer unable to see it is MISMATCH or NEEDS REVIEW, never MATCH.
- Policy suffix `-01` versus spoken base identifier requires configured rule or NEEDS REVIEW.
- Deductible met and remaining are noisy and require candidate or derived review.
- OOP met is DERIVED if calculated from maximum and remaining.
- Corrected TFL must retain `180 days from DOS or 60 calendar days from RA` context.
- Representative `.C` suffix is unsupported unless another source supplies it.
- Payer phone, plan, network, payer ID, and copay require another approved source or review.

## 11. Golden-case correction expectation

- The representative initially says no visits were used; The caller reports the portal shows one used.
- The representative corrects the PT context and says nineteen remaining; The engine links the correction chain.
- The canonical result is one used and nineteen remaining when the approved derivation rule is enabled.
- The earlier zero remains visible in evidence history.
- The completed form's one used may MATCH the resolved final supported value.

## 12. Form-engine tests

- No substantive default selections; Conditional copay amount.
- Conditional coinsurance percentage; Conditional deductible details.
- Conditional authorization details; Conditional secondary section.
- Network group and individual-provider fields.
- Unknown options; Master-data source chip.
- Derived formula disclosure; Bypass states.
- Read-only historical version.

## 13. Inline UX tests

- Mismatch colors the whole field block; Error text appears inside the block.
- Entered and supported values are both visible.
- Evidence action opens the correct segment; Apply creates a new revision.
- Conflict does not show unsafe apply; Bypass requires a reason.
- Re-verification clears or updates the state.
- Go to first issue focuses the field; Next issue follows form order.
- No separate-only issue panel is required to understand the error.

## 14. Records and history tests

- First VOB creates a base record; Later VOB creates a version.
- Retry does not duplicate the case; Same source checksum is detected.
- Strong duplicate candidate requires a decision.
- Dynamic values show deltas; Historical values remain unchanged.
- Carrier-master version remains linked.
- Archive hides but does not erase; Two versions can be compared.
- Finalized document remains tied to its revision.

## 15. Carrier-master tests

- Exact scope selects the active version; More specific scope outranks general scope.
- Expired version is not selected for a later effective date.
- Overlapping conflict blocks activation; One call contradiction creates a proposal.
- Historical VOB retains old master version; Unscoped master cannot support a critical field automatically.
- Manual broader-master selection requires a reason.

## 16. API and queue tests

- Schema rejects invalid payloads; Idempotency prevents duplicate actions.
- Optimistic concurrency detects stale revision.
- Signed upload expires; Upload finalization validates checksum.
- Retryable job retries with backoff.
- Unrecoverable job stops; Cancelled job stops cooperatively.
- Event sequence reconnect works; Redis loss does not erase authoritative case state.
- Database transaction rolls back partial finalization.

## 17. PDF tests

- PASSED clean PDF; FAILED draft watermark.
- NEEDS REVIEW draft watermark.
- QA report issues and evidence; No logo-only trailing page.
- Long patient name; Long coverage summary.
- Long claim address; Leading-zero IDs.
- Secondary section hidden or shown correctly; Selected version's dynamic values.
- Template-version metadata; Text-extraction sanity.

## 18. Excel tests

- Identifiers remain text; Dangerous formula prefixes are escaped.
- Filters export only selected records.
- Issue sheet is complete; Version-delta sheet is correct.
- No transcript text appears by default; Dates and money display correctly.
- Import mapping retains cell addresses; Ambiguous mapping routes to review.
- Round-trip canonical values remain stable.

## 19. Accessibility tests

- Keyboard-only new verification; Keyboard upload replacement.
- Keyboard navigation to first and next issue; Screen-reader label and error association.
- Status result announcement; Dialog focus trap and return.
- Transcript evidence navigation; Zoom at 200 and 400 percent.
- Reduced motion; Color contrast.
- Touch target spacing; Responsive table alternative.

## 20. Security tests

- MIME and signature mismatch; Path traversal filename.
- Macro-enabled document; Formula injection.
- Zip bomb or decompression limit.
- Oversized upload; Expired signed URL.
- Unauthorized direct object request at the controlled boundary.
- Prompt injection in transcript; XSS-like transcript content rendered as text.
- Sensitive log redaction; No localStorage PHI.
- Rate and concurrency limits.

## 21. Performance targets to agree

- Time to interactive for the app shell; Records list response percentile.
- Form edit response time; Issue-navigation response time.
- Transcript search latency; Short text-case processing latency.
- Short audio-case processing latency; Long-audio completion rate.
- Queue-age alert threshold; PDF generation percentile.
- These targets are measured and approved rather than guessed in this document.

## 22. Release gate

- All critical unit and integration tests pass; Golden case produces every approved expected outcome.
- Critical false-pass count is zero on the release evaluation set.
- No unresolved high-severity security finding; No blocker accessibility failure in primary flows.
- No accidental clean PDF for FAILED or unresolved NEEDS REVIEW.
- No data loss during upload retry or worker restart tests; No historical mutation during repeat-VOB tests.
- No blank routes or unhandled browser errors; Client accepts the official PDF layout.
- Client approves the field matrix used by the release; Staging backup and restore are demonstrated.

## 23. Production quality monitoring

- Review a sample of automatic PASSED cases.
- Track manual corrections after PASSED; Track false-No findings.
- Track fields causing the most NEEDS REVIEW; Track provider and payer-specific error rates.
- Track long-audio failures; Track duplicate overrides.
- Track PDF generation failures; Track stale carrier-master conflicts.
- Use findings to create versioned rule, dictionary, parser, or model changes.
- Never silently re-score finalized historical records.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Prevent materially incorrect VOBs from being marked PASSED` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Prove every automatic decision with deterministic rules and source evidence` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `Test uncertainty and unknown states as carefully as successful matches` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `Test the actual client sources, not only clean synthetic data` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `Keep source, parser, model, rule, and template versions reproducible` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Treat document output and workflow recovery as first-class quality areas` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Pure domain unit tests` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Normalization property and table tests` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Rule-engine unit tests` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Parser fixture tests` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
