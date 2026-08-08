# Security, Privacy, Auditability, and Accessibility
## US24 Solutions — React VOB Automation Blueprint

**Document:** `14_SECURITY_PRIVACY_ACCESSIBILITY.md`
**Document order:** 15 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)
**Next:** [`15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md`](./15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define controlled-access deployment, sensitive-data handling, upload security, audit controls, AI safety, retention, and WCAG 2.2 accessibility requirements.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`04_UI_UX_DESIGN_SYSTEM.md`](./04_UI_UX_DESIGN_SYSTEM.md)
- [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`11_REACT_FRONTEND_ARCHITECTURE.md`](./11_REACT_FRONTEND_ARCHITECTURE.md)
- [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
- [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)
- [`15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md`](./15_TESTING_ACCEPTANCE_AND_SAMPLE_CASES.md)
- [`17_RESEARCH_SOURCES_AND_DECISION_LOG.md`](./17_RESEARCH_SOURCES_AND_DECISION_LOG.md)

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

## 1. Scope and disclaimer

- Patient names, DOBs, policy identifiers, benefit information, recordings, and transcripts are sensitive data and may be PHI or ePHI depending on the parties and use.
- US24 must determine legal and contractual applicability with qualified counsel and compliance staff.
- This file defines engineering controls and risk questions, not a legal compliance certification.
- No-login does not mean no access-control requirement.
- The production threat model differs materially from a local demonstration.

## 2. No-visible-login risk treatment

- Do not add a visible application login page in version one.
- Do not expose the production site to the public internet without an approved access boundary.
- Use an upstream identity-aware gateway, private network, VPN, managed-device policy, kiosk boundary, or another client-approved control.
- Restrict network paths to API, database, Redis, and object storage.
- Record available gateway or device identity where permitted.
- A typed `Verified by` field is not equivalent to authentication.
- Document the residual attribution risk.
- Use automatic timeout or workstation-clearing behavior appropriate to the environment.

## 3. Security-rule alignment

- Maintain confidentiality of sensitive electronic data.
- Maintain integrity of source artifacts, values, revisions, results, and documents.
- Maintain availability through backups, retryable jobs, and recovery plans.
- Perform and document risk analysis.
- Implement appropriate administrative, physical, and technical safeguards.
- Keep audit controls for material access and changes.
- Use person or entity authentication at the selected boundary where required.
- Protect transmission with current TLS.
- Review controls when architecture or vendors change.

## 4. Cloud and vendor governance

- Identify every service that creates, receives, maintains, or transmits sensitive data.
- Confirm required contractual terms and any Business Associate Agreement before production use when applicable.
- Review data region, retention, support access, subprocessors, incident terms, and deletion behavior.
- Do not assume encryption alone removes business-associate obligations.
- Approve transcription, extraction, storage, hosting, logging, error-monitoring, and backup vendors.
- Keep a vendor inventory and data-flow diagram.
- Use test data until approvals are complete.

## 5. Data classification

- Restricted: audio, transcript, patient identity, policy ID, DOB, benefit details, completed forms, final PDFs, and evidence excerpts.
- Confidential operational: carrier masters, template mappings, QA notes, rule sets, and non-public metrics.
- Internal: system health, queue counts, parser versions, and non-sensitive configuration.
- Public: only intentionally published marketing or help content.
- Classification controls logging, download, retention, backup, and support access.
- Do not place Restricted data in generic telemetry.

## 6. Browser storage

- Do not store production records, transcripts, source files, signed URLs, or PHI in localStorage.
- Do not persist the TanStack Query cache containing sensitive responses to localStorage.
- Use in-memory state plus server-side drafts.
- Use secure cookies or gateway mechanisms only when the selected boundary requires them.
- Clear in-memory data at controlled session end.
- Avoid browser autocomplete on fields where the client policy prohibits it.
- The current HTML localStorage implementation remains demo-only.

## 7. Secure file upload

- Allow-list types and validate file signatures.
- Enforce configured size, duration, page, sheet, and decompression limits.
- Generate object names server-side.
- Store files outside the web root in private object storage.
- Scan or quarantine according to policy.
- Reject macros, executables, malformed files, and unsupported encrypted files.
- Limit concurrent uploads and processing resource use.
- Use multipart cleanup; Do not trust client validation.
- Protect parsers with time and memory limits.

## 8. Encryption and keys

- Use TLS for browser, API, provider, database, Redis, and object-storage connections.
- Use encryption at rest for database, objects, backups, and relevant queue persistence.
- Use managed key services where appropriate.
- Separate keys and credentials by environment; Rotate secrets.
- Do not place secrets in source control, frontend bundles, logs, or error reports.
- Use least-privilege service identities.
- Record key ownership and recovery procedures.

## 9. API and network controls

- Expose only required API routes through the gateway.
- Validate every request and serialize only approved response fields.
- Use request size limits.
- Use rate and concurrency controls for costly processing endpoints.
- Use idempotency to reduce replay effects.
- Apply CORS narrowly when separate origins are required.
- Use content security policy and secure response headers.
- Protect signed URLs as bearer credentials.
- Block direct public access to database, Redis, workers, and buckets.

## 10. Prompt-injection and AI safety

- Treat uploaded transcript, PDF, and spreadsheet text as untrusted evidence.
- Never concatenate source text as trusted system instructions.
- Use strict system prompts and structured output schemas.
- Reject model-returned unknown field keys and invalid types.
- Do not allow the extraction model to call business tools or set status.
- Limit supplied context to relevant controlled material.
- Do not expose secrets, hidden configuration, unrelated records, or other cases to the model.
- Log model metadata without raw prompts when prompts contain sensitive data.
- Test hostile source text that tells the model to ignore rules.

## 11. Data minimization

- Upload only sources required for the case.
- Send only necessary excerpts or audio to external providers.
- Do not include unrelated prior patient records in model context.
- Do not export raw transcripts in routine spreadsheets.
- Do not copy full evidence into every audit event.
- Use references to private artifacts.
- Remove temporary derivatives after the approved window.
- Keep fields the client actually uses.
- Review whether audio must be retained after an approved transcript and audit period.

## 12. Logging and redaction

- Use correlation IDs and stable event codes.
- Redact patient names, DOB, policy IDs, group IDs, call references, phone numbers, addresses, transcript text, signed URLs, and document content.
- Do not log request bodies by default.
- Do not log provider payloads containing source content.
- Separate security logs, operational logs, audit events, and quality metrics.
- Limit log access.
- Set retention; Test redaction.
- Record safe error categories and timing.

## 13. Audit controls

- Record source upload, replacement, and checksum.
- Record parsing, transcription, extraction, and comparison run versions.
- Record form revisions and changed fields.
- Record bypasses and manual approvals; Record status changes.
- Record finalization and document generation.
- Record carrier-master selection and activation.
- Record archive, restore, and governed deletion.
- Record download events as approved.
- Audit events are append-only and time synchronized.
- Do not claim strong user attribution beyond the available access boundary.

## 14. Retention and deletion

- Define separate retention periods for audio, transcripts, source forms, canonical records, PDFs, temporary chunks, logs, and audit events.
- Apply legal or operational hold metadata.
- Run scheduled cleanup jobs.
- Verify object and database deletion; Record cleanup failures.
- Prevent old signed links from working.
- Document provider-side retention and deletion.
- Return or destroy data at contract termination where required.
- The client and compliance team must approve the final schedule.

## 15. Backups and resilience

- Encrypt backups; Restrict backup access.
- Define recovery point and recovery time objectives.
- Test restore; Keep backup retention aligned with policy.
- Ensure deletion obligations account for backups.
- Monitor queue and storage availability.
- Use idempotent recovery for in-flight jobs.
- Document manual continuity procedures for provider outages.

## 16. Incident readiness

- Define incident severity and contacts.
- Preserve relevant logs and audit events.
- Revoke or rotate compromised credentials.
- Disable provider or integration adapters independently.
- Identify affected cases and artifacts.
- Document notification and contractual processes.
- Test a tabletop scenario involving uploaded transcript exposure.
- Test a scenario involving incorrect automatic PASSED results.
- Keep recovery actions and post-incident changes in the decision log.

## 17. Accessibility target

- Target WCAG 2.2 AA for the React interface.
- Use semantic HTML before ARIA.
- Provide persistent labels and instructions.
- Identify invalid fields programmatically and in text.
- Associate error descriptions with controls.
- Use live regions for status messages without flooding announcements.
- Support complete keyboard operation.
- Provide visible focus; Meet color contrast.
- Respect reduced motion.
- Provide sufficient target size and spacing.
- Test with screen readers and zoom.

## 18. Accessible inline errors

- Do not rely on a red border alone.
- Use an icon and text such as Mismatch or Needs review.
- Set `aria-invalid` on invalid controls.
- Reference the specific message with `aria-describedby` or `aria-errormessage` according to support strategy.
- Keep the error in the field block; Provide `Go to first issue`.
- Move focus only on explicit user action.
- Announce verification result and issue count.
- Keep source evidence reachable by keyboard.
- Do not remove the label when showing placeholders.

## 19. Accessible transcript and media

- Transcript segments use semantic lists or regions.
- Speaker and timestamp are readable text.
- Search results expose count and current result.
- Evidence navigation moves focus to the target segment.
- Audio controls have accessible names.
- Provide transcript access independent of audio playback.
- Do not autoplay recordings; Show playback time and duration.
- Support keyboard play, pause, seek, and evidence jump.

## 20. Accessible documents and tables

- PDF preview includes a downloadable accessible source or structured form view.
- Do not make the PDF canvas the only way to review values.
- Records tables use proper headers and captions.
- Responsive card views preserve field names.
- Sort controls expose state; Filter controls have labels.
- Sticky headers do not obscure focused rows.
- Excel export is a secondary format, not the only accessible record view.

## 21. Security acceptance gate

- No critical or high unaccepted findings from the approved security review.
- No sensitive data in browser localStorage.
- No production credentials in frontend code.
- Upload validation passes adversarial fixtures.
- Logs pass redaction tests; Object storage is private.
- Provider agreements and deployment boundary are approved.
- Backups and restore are tested; Retention jobs are tested.
- Accessibility critical flows pass automated and manual review.
- Residual no-login risks are documented and accepted by the client.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Patient names, DOBs, policy identifiers, benefit information, recordings, and transcripts are sensitive data and may be PHI or ePHI depending on the parties and use` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `US24 must determine legal and contractual applicability with qualified counsel and compliance staff` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `This file defines engineering controls and risk questions, not a legal compliance certification` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `No-login does not mean no access-control requirement` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `The production threat model differs materially from a local demonstration` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Do not add a visible application login page in version one` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Do not expose the production site to the public internet without an approved access boundary` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Use an upstream identity-aware gateway, private network, VPN, managed-device policy, kiosk boundary, or another client-approved control` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Restrict network paths to API, database, Redis, and object storage` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Record available gateway or device identity where permitted` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
