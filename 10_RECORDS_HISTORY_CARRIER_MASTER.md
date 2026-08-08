# Patient Records, Repeated VOB History, and Carrier Master
## US24 Solutions — React VOB Automation Blueprint

**Document:** `10_RECORDS_HISTORY_CARRIER_MASTER.md`
**Document order:** 11 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
**Next:** [`11_REACT_FRONTEND_ARCHITECTURE.md`](./11_REACT_FRONTEND_ARCHITECTURE.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define base records, duplicate prevention, immutable VOB versions, dynamic benefit history, saved-record UX, and scoped carrier-master governance.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
- [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)
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

## 1. Record hierarchy

- A patient entity stores stable identity references.
- A policy entity links patient, payer, policy ID, group, plan, and effective periods.
- A base VOB record groups one patient-policy-service context.
- A verification version represents one dated call or verification event.
- A form revision represents imported, prefilled, or corrected values within a verification version.
- An extraction run represents one source-processing result.
- A comparison run evaluates one form revision against one extraction and rule set.
- A finalization selects one verified revision and template version.
- Documents and audit events reference these immutable identifiers.

## 2. Base-record key strategy

- Primary dimensions are patient identifier or normalized name and DOB, payer, policy ID, and service type.
- Group ID, plan, benefit period, network, and line of business refine matching.
- Call reference and source checksum detect duplicate verification events.
- Do not rely on patient name alone.
- Do not rely on filename.
- Preserve policy suffixes unless an approved normalization rule relates them.
- Show match strength and dimensions to the operator.
- The client must approve whether a new benefit year creates a new base record or a new version.

## 3. Duplicate candidate workflow

- Search existing records during source setup.
- Show exact and possible duplicate candidates before creating the base record.
- Explain which dimensions match and differ.
- Allow `Add verification to this record`.
- Allow `Create separate record` with a required reason when a strong candidate exists.
- Allow a governed merge after comparing histories.
- Never silently merge records.
- Use idempotency keys to prevent duplicate creation from retries.
- Keep duplicate decisions in audit history.

## 4. First VOB behavior

- Create the patient and policy records or link existing ones.
- Create the base VOB record.
- Create version one with source artifacts.
- Keep the original imported or auto-filled revision.
- Run extraction, comparison, and review.
- Finalize the approved revision.
- Mark stable and dynamic fields according to registry configuration.
- The first VOB becomes a source for later prefill but not unquestioned truth.

## 5. Later VOB behavior

- Create a new verification version under the base record.
- Copy stable values with previous-version provenance.
- Require current evidence for fields classified as dynamic.
- Show prior values beside current candidates.
- Detect changes in eligibility, network, accumulators, visits, authorization, and secondary status.
- Do not overwrite the prior version.
- Generate a new PDF tied to the new verification date and dynamic values.
- Allow the operator to correct an incorrectly linked base record before finalization.

## 6. Dynamic fields to track

- Eligibility status.
- Effective and termination dates.
- Deductible total when plan resets or changes.
- Deductible met; Deductible remaining.
- OOP maximum when plan resets or changes.
- OOP met; OOP remaining.
- Visits allowed; Visits used.
- Visits remaining.
- Authorization requirement, threshold, number, and coverage dates.
- Referral requirement.
- Secondary coverage status.
- Coverage or network changes.
- Every dynamic value includes an as-of date.

## 7. Field delta model

- Store previous normalized value.
- Store current normalized value.
- Store raw display values.
- Store absolute and percentage delta for money where meaningful.
- Store numeric delta for visits.
- Store categorical transition for status fields.
- Store source and as-of date for both sides.
- Classify change as expected accumulator movement, reset, correction, plan change, or unexplained.
- Show unexplained reversals in NEEDS REVIEW.
- Do not calculate a delta when scopes or periods differ.

## 8. Version timeline UX

- Show verification date and call time.
- Show status and processing state.
- Show operator or workstation label.
- Show source type and call reference.
- Show changed-field count.
- Show deductible, OOP, and visit summary deltas.
- Show final PDF or QA report availability.
- Allow opening an immutable version.
- Allow selecting two versions for comparison.
- Use a clear current-version marker.

## 9. Records-list data

- Status; Processing state.
- Patient name.
- Date of birth; Insurance.
- Policy ID; Group ID.
- Plan or service; Verification date.
- Version number; Network.
- Completion percentage.
- Match percentage as secondary information.
- Mismatch count; Needs-review count.
- Bypass count; Call reference.
- Source filename or RingCentral ID.
- Last updated time; Final document state.

## 10. Search and filters

- Search patient first or last name.
- Search DOB.
- Search policy ID with leading-zero preservation.
- Search group ID; Search payer and plan.
- Search call reference.
- Search case or base record ID.
- Filter PASSED, FAILED, NEEDS REVIEW, DRAFT, and processing problems.
- Filter service and network.
- Filter verification date and update date.
- Filter carrier-master version use.
- Filter unresolved field group.
- Save operational views without exposing them as user accounts.

## 11. Archive and deletion

- Archive hides records from default active views.
- Archive does not erase source lineage or audit history.
- Permanent deletion follows retention and legal policy, not a casual row button.
- Source deletion can be separate from structured record retention.
- Generated documents have their own retention class.
- A deletion job records object, database, and index outcomes.
- The UI shows when evidence is unavailable because of approved deletion.
- Restore from archive is governed and logged.

## 12. Carrier master purpose

- Reduce repeated entry of relatively static payer and plan information.
- Support payer phone, payer ID, claim mailing address, authorization route, timely-filing rules, and terminology aliases.
- Provide source provenance to VOB fields not discussed on every call.
- Avoid treating one call's answer as a universal payer rule.
- Keep values scoped, versioned, effective-dated, and reviewable.
- Allow multiple active values for distinct plans or markets when scopes do not overlap.

## 13. Carrier-master scope

- Carrier; Plan name or product.
- Line of business.
- State or market; Network.
- Provider group or contract when necessary.
- Service type when authorization or benefits differ.
- Group ID or employer group when necessary.
- Effective-from date; Effective-through date.
- Source or policy reference.
- Priority and specificity.
- A master record lacking required scope cannot auto-fill a critical field.

## 14. Carrier-master fields

- Carrier canonical name and aliases.
- Customer-service or benefits phone.
- Authorization phone.
- Authorization portal or method.
- Payer ID; Claim mailing address.
- Original-claim timely filing rule.
- Corrected-claim timely filing rule and alternative conditions.
- Known plan types; Terminology aliases.
- Provider notes that are not copied into patient documents.
- Source document or approved reference.
- Effective period and status.

## 15. Master version states

- DRAFT; PROPOSED.
- VALIDATED; ACTIVE.
- SUPERSEDED; RETIRED.
- Only ACTIVE versions can auto-fill.
- A new version never edits a prior ACTIVE version in place.
- Activation records reason and effective date.
- Overlapping conflicting scope requires resolution.
- Retired versions remain linked to historical VOBs.

## 16. Master-data precedence

- A matching active master may prefill configured fields.
- A transcript's clear member-specific representative answer can contradict the master and trigger review.
- A single contradiction creates a proposal, not an automatic master update.
- More specific scope outranks general scope.
- Current effective period outranks expired period.
- The chosen master version is stored on every inherited field.
- If no unique matching version exists, the field remains unresolved.
- Manual selection of a less-specific master requires explanation.

## 17. Master update workflow

- Open a carrier or plan detail.
- Create proposed version from the active version.
- Edit scoped values; Attach source or reason.
- Run overlap and completeness validation.
- Review a side-by-side diff.
- Activate with effective date.
- Keep the prior version available for historical records.
- Optionally identify future VOBs needing review.
- Do not retroactively mutate finalized documents.

## 18. Patient and carrier prefill UX

- Prefilled fields show a source chip.
- Previous-VOB dynamic fields show a warning that current confirmation is required.
- Carrier-master fields show scope and effective version.
- Patient-system identity fields show source-system record reference.
- The operator can remove an inappropriate prefill before verification.
- Imported form values remain the audited original in audit mode.
- Prefill never marks the field MATCH until the comparison or allowed source rule runs.

## 19. Audit events

- Base record created.
- Duplicate candidate accepted or dismissed.
- Version created; Source attached or replaced.
- Form revision created.
- Extraction and comparison run.
- Field changed; Bypass recorded.
- Master version selected.
- Status changed; Finalization created.
- Document generated.
- Record archived or restored.
- Retention deletion performed.
- Every event stores timestamp, actor context available, entity references, and safe metadata.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `A patient entity stores stable identity references` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `A policy entity links patient, payer, policy ID, group, plan, and effective periods` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `A base VOB record groups one patient-policy-service context` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `A verification version represents one dated call or verification event` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `A form revision represents imported, prefilled, or corrected values within a verification version` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `An extraction run represents one source-processing result` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `A comparison run evaluates one form revision against one extraction and rule set` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `A finalization selects one verified revision and template version` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Documents and audit events reference these immutable identifiers` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Primary dimensions are patient identifier or normalized name and DOB, payer, policy ID, and service type` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
