# Canonical VOB Form and Field-Rule Engine
## US24 Solutions — React VOB Automation Blueprint

**Document:** `06_VOB_FORM_FIELD_ENGINE.md`
**Document order:** 7 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
**Next:** [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define the canonical field registry, provenance envelope, field groups, conditional logic, source behavior, and configurable pass/fail rules for every VOB value.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`08_EXTRACTION_NORMALIZATION_COMPARISON.md`](./08_EXTRACTION_NORMALIZATION_COMPARISON.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`10_RECORDS_HISTORY_CARRIER_MASTER.md`](./10_RECORDS_HISTORY_CARRIER_MASTER.md)
- [`13_PDF_EXCEL_IMPORT_EXPORT.md`](./13_PDF_EXCEL_IMPORT_EXPORT.md)

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

## 1. Why a canonical field engine is required

- Uploaded PDFs and Excel files may use different labels and layouts for the same business concept.
- The React form, extraction schema, comparison engine, record history, Excel export, and PDF generator must not maintain separate field definitions.
- A single registry prevents label drift, inconsistent normalization, and duplicated conditional logic.
- The registry allows the client's pending required and critical matrix to be supplied as configuration.
- Template mappings can change without changing canonical data.
- Every field state and source can be audited consistently.

## 2. Field registry contract

- Each field has a stable machine key that never depends on visible wording.
- Each field has a display label and optional short PDF label.
- Each field belongs to one section and optional subgroup.
- Each field declares a data type and allowed control type.
- Each field declares normalization and comparison strategies.
- Each field declares possible source types.
- Each field declares whether master data, previous VOB, transcript, imported form, or manual values are allowed.
- Each field declares requiredness and criticality rules.
- Each field declares bypass permissions and status consequences.
- Each field declares visibility and conditional dependencies.
- Each field declares whether it is stable, dynamic, derived, or system-controlled.
- Each field declares template anchors and export column names.
- Each field declares help text and accepted examples.
- Each field declares privacy classification and log-redaction behavior.

## 3. Recommended TypeScript shape

```ts
export interface FieldDefinition {
key: VobFieldKey;
section: VobSectionKey;
label: string;
dataType: FieldDataType;
control: FieldControlType;
requiredRule: RuleExpression;
criticalRule: RuleExpression;
visibleRule: RuleExpression;
bypassPolicy: BypassPolicy;
normalization: NormalizationStrategy;
comparison: ComparisonStrategy;
allowedSources: SourceType[];
temporalClass: "stable" | "dynamic" | "derived" | "system";
templateBindings: TemplateBinding[];
}
```

## 4. Field value envelope

- Store raw value exactly as imported, extracted, or typed; Store canonical normalized value separately.
- Store display value separately when formatting differs; Store source type and source artifact ID.
- Store evidence segment, page region, cell, or master version ID.
- Store source speaker and timestamp where applicable; Store confidence and confidence rationale.
- Store as-of date and benefit period where applicable.
- Store service, network, individual or family scope when applicable.
- Store derivation formula and operand field keys for calculated values.
- Store original revision and latest revision references.
- Store field state, comparison reason, and rule version.
- Store bypass or manual-resolution metadata; Never overwrite the raw original value.

## 5. Source-type enumeration

- TRANSCRIPT_REP_CONFIRMED; TRANSCRIPT_CALLER_STATED.
- TRANSCRIPT_IVR; IMPORTED_COMPLETED_FORM.
- PREFILLED_PATIENT_RECORD.
- PREVIOUS_VOB; CARRIER_MASTER.
- DERIVED_CALCULATION; MANUAL_ENTRY.
- MANUAL_CORRECTION; BYPASSED.
- NOT_FOUND; UNKNOWN.
- Each source chip uses human-readable wording and does not expose internal enum text to normal users.

## 6. Patient and verification fields

- patient.lastName; patient.firstName.
- patient.middleName where the client later requires it.
- patient.dateOfBirth; verification.date.
- verification.time when operationally useful; verification.verifiedByLabel.
- verification.caseId; verification.baseRecordId.
- verification.versionNumber.
- verification.serviceDate or requested DOS when supplied; verification.notes.
- These fields distinguish patient identity from operator and system metadata.

## 7. Primary insurance and plan fields

- primary.insuranceName; primary.insurancePhone.
- primary.policyId; primary.groupId.
- primary.planName; primary.planType.
- primary.lineOfBusiness; primary.serviceType.
- primary.networkGroupStatus; primary.networkIndividualProviderStatus.
- primary.coverageSummary; primary.effectiveDate.
- primary.terminationDate; primary.eligibilityStatus.
- primary.hsaHraHcaAmount; primary.payerId.
- primary.stateOrMarket when required for master-data scope.
- The current single network field must be split because the template distinguishes group and individual-provider status.

## 8. Copay, coinsurance, and responsibility fields

- financial.copayApplies; financial.copayAmount.
- financial.coinsuranceApplies; financial.patientCoinsurancePercent.
- financial.payerCoveragePercent when explicitly supported; financial.patientResponsibilitySummary.
- financial.coveragePercent must not be auto-derived from No copay and No coinsurance.
- Use an explicit unknown state for every yes/no-like field.
- Rename ambiguous `Covered` wording in the web UI while preserving signed-off PDF wording through template mapping.
- A patient-responsibility banner is generated only from supported or approved derived facts.

## 9. Deductible fields

- financial.deductibleApplies; financial.deductibleScope as individual, family, combined, or unknown.
- financial.individualDeductibleTotal; financial.individualDeductibleMet.
- financial.individualDeductibleRemaining; financial.familyDeductibleTotal when requested.
- financial.familyDeductibleMet when requested; financial.familyDeductibleRemaining when requested.
- financial.deductiblePeriod; financial.deductibleAsOfDate.
- Met and remaining values are dynamic and require dated provenance.
- Arithmetic consistency may raise review but must not silently replace transcript evidence.

## 10. Out-of-pocket fields

- financial.oopScope; financial.individualOopMaximum.
- financial.individualOopMet; financial.individualOopRemaining.
- financial.familyOopMaximum when requested; financial.familyOopMet when requested.
- financial.familyOopRemaining when requested.
- financial.oopPeriod; financial.oopAsOfDate.
- OOP met may be derived from maximum minus remaining only when both operands are clear and the rule is enabled.
- Derived values remain visibly labeled.

## 11. Visit fields

- visits.limitType as hard maximum, medically necessary, no stated limit, or unknown.
- visits.allowedCount; visits.usedCount.
- visits.remainingCount; visits.period such as calendar year, benefit year, rolling period, or episode.
- visits.combinedServices when PT, OT, or ST share a limit.
- visits.serviceScope; visits.asOfDate.
- Used and remaining counts must support correction chains.
- One used out of twenty is a valid derivation from nineteen remaining when the rule is enabled and evidence is clear.

## 12. Authorization and referral fields

- authorization.initialEvaluationRequired.
- authorization.treatmentRequired; authorization.requiredAfterVisitNumber.
- authorization.method; authorization.phone.
- authorization.portal; authorization.requestWindowValue.
- authorization.requestWindowUnit; authorization.requestWindowReference such as DOS.
- authorization.number; authorization.coverageStartDate.
- authorization.coverageEndDate; authorization.medicalNecessityReviewRequired.
- referral.required; referral.pcpRequired.
- The threshold is a separate structured value and must not be embedded only in a coverage sentence.

## 13. Claims and call-record fields

- claims.mailingAddress; claims.payerId.
- claims.originalTflValue; claims.originalTflUnit.
- claims.originalTflReference.
- claims.correctedTflValue; claims.correctedTflUnit.
- claims.correctedTflReference.
- claims.correctedTflAlternativeRule; call.representativeName.
- call.referenceNumber; call.sourcePhone.
- call.startedAt; call.endedAt.
- call.ringCentralRecordId when integrated.
- Conditional TFL alternatives must retain their conditions rather than being flattened into one number.

## 14. Primary and secondary coordination fields

- coordination.primaryPayerName.
- coordination.secondaryStatus uses YES, NO, UNKNOWN, PAYER_UNABLE_TO_VERIFY, NOT_ASKED, and NOT_APPLICABLE.
- secondary.insuranceName.
- secondary.planName; secondary.policyId.
- secondary.effectiveDate.
- secondary.deductible; secondary.visitLimit.
- secondary.visitsUsed; secondary.source.
- Do not map `payer cannot see secondary` to No.
- Secondary detail fields become required only when secondaryStatus is YES under the approved matrix.

## 15. Static, dynamic, derived, and system classes

- Stable fields include patient DOB, policy base identifier, payer name, and plan identifiers but still require versioned source.
- Dynamic fields include eligibility, termination, deductible accumulators, OOP accumulators, visits used, authorization, and coverage changes.
- Derived fields include met or remaining amounts calculated from approved operands.
- System fields include case ID, revision, job state, template version, and rule version.
- Carrier-master fields are not automatically stable; their scope and effective period determine reuse.
- The class controls prefill warnings and repeated-VOB behavior.

## 16. Requiredness model

- `ALWAYS_REQUIRED` applies only after client approval.
- `REQUIRED_WHEN` evaluates a rule expression over other fields and case context.
- `OPTIONAL` permits a blank without status consequence.
- `REVIEW_IF_MISSING` creates NEEDS REVIEW; `FAIL_IF_MISSING` creates FAILED.
- `MASTER_OR_TRANSCRIPT_REQUIRED` accepts one approved provenance source.
- `SYSTEM_GENERATED` is not expected from the call; The final matrix is data, not hard-coded JSX.
- Every requirement rule has an identifier and version.

## 17. Conditional rules

- When copayApplies is YES, copayAmount becomes required.
- When coinsuranceApplies is YES, patientCoinsurancePercent becomes required.
- When deductibleApplies is YES, configured deductible totals and accumulators become required or reviewable.
- When treatmentRequired is YES, authorization method and threshold may become required.
- When secondaryStatus is YES, secondary identity and policy fields become visible and conditionally required.
- When terminationDate exists, eligibility status and effective period must remain logically consistent.
- When visit limit type is hard maximum, allowed count becomes required.
- When a master value is used, master scope and effective date must match the case.
- When a field is bypassed, its bypass policy determines case outcome.

## 18. No-default rule

- Do not default network to In Network.
- Do not default service type to PT unless inherited from a selected source and visibly labeled.
- Do not default copay, coinsurance, deductible, authorization, referral, or secondary to No.
- Do not default termination to Current; Do not default coverage to 100 percent.
- Use an explicit unselected or unknown state.
- A prefilled value is not a default; it must show provenance and may require confirmation.
- Select controls must include Unknown where the business concept allows it.

## 19. Validation layers

- Control validation checks type, length, date shape, and allowed option.
- Semantic validation checks field combinations and impossible values.
- Normalization validation checks parseability without changing the raw value.
- Comparison validation checks equivalence against supported sources.
- Completeness validation applies requiredness rules.
- Criticality validation determines case consequence.
- Temporal validation checks effective periods and as-of dates.
- Scope validation checks service, network, and individual or family alignment.
- Document validation checks whether the template can render the selected revision.

## 20. Registry-driven outputs

- The React form renders sections and controls from the registry.
- The extraction schema requests canonical keys from the registry.
- The comparison engine loads normalization and comparison strategies from the registry.
- The review queue uses registry severity and labels.
- The records table uses registry export metadata; Excel import maps labels to registry synonyms.
- PDF generation maps fields to versioned template bindings.
- Test factories generate valid, missing, conflicting, and boundary values from registry metadata.
- Help text and tooltips come from the same controlled definitions.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Uploaded PDFs and Excel files may use different labels and layouts for the same business concept` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `The React form, extraction schema, comparison engine, record history, Excel export, and PDF generator must not maintain separate field definitions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `A single registry prevents label drift, inconsistent normalization, and duplicated conditional logic` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `The registry allows the client's pending required and critical matrix to be supplied as configuration` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `Template mappings can change without changing canonical data` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Every field state and source can be audited consistently` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Each field has a stable machine key that never depends on visible wording` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Each field has a display label and optional short PDF label` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `Each field belongs to one section and optional subgroup` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Each field declares a data type and allowed control type` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
