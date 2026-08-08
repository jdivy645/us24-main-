# Evidence Extraction, Normalization, and Comparison Engine
## US24 Solutions — React VOB Automation Blueprint

**Document:** `08_EXTRACTION_NORMALIZATION_COMPARISON.md`
**Document order:** 9 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
**Next:** [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Define evidence-first extraction, candidate selection, normalization, comparison outcomes, confidence, correction logic, and deterministic case evaluation.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md`](./02_SOURCE_ANALYSIS_AND_REQUIREMENTS_TRACEABILITY.md)
- [`06_VOB_FORM_FIELD_ENGINE.md`](./06_VOB_FORM_FIELD_ENGINE.md)
- [`07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md`](./07_TRANSCRIPT_AUDIO_UPLOAD_AND_PROCESSING.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
- [`12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md`](./12_BACKEND_DATA_JOBS_AND_RINGCENTRAL.md)
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

## 1. Separation of responsibilities

- The transcription layer converts audio to timestamped text and speakers.
- The relevance layer classifies target and non-target segments.
- The extraction layer returns candidate values with evidence and uncertainty.
- The normalization layer converts comparable values without destroying raw source text.
- The comparison layer evaluates imported or entered values against supported candidates.
- The field-rule engine evaluates requiredness, criticality, bypass, and conditional dependencies.
- The status engine combines field outcomes deterministically.
- The React UI explains results and captures human resolutions; No AI response directly sets PASSED or FAILED.

## 2. Extraction output contract

- Return the canonical field key; Return zero or more value candidates.
- Return raw text and parsed value for each candidate; Return source artifact and segment or page location.
- Return speaker identifier and classified role; Return start and end timestamp when available.
- Return service, network, benefit scope, and temporal context.
- Return whether the statement is an answer, question, correction, negation, uncertainty, or unavailable response.
- Return confidence and concise rationale; Return relationships to prior or later candidate statements.
- Return `notFound` only after reviewing all relevant segments.
- Never return a guessed value merely to satisfy the schema.

## 3. Candidate example

```json
{
"fieldKey": "authorization.requiredAfterVisitNumber",
"candidates": [
{
"rawValue": "after the eighth visit",
"parsedValue": 8,
"speakerRole": "PAYER_REPRESENTATIVE",
"timestampStart": 404.2,
"evidenceText": "After the eighth visit?",
"speechAct": "ANSWER",
"confidence": 0.91
}
]
}
```

## 4. Speaker authority rules

- A clear live payer-representative answer is normally authoritative for call-verifiable benefits.
- A supervisor correction can supersede an earlier representative answer while preserving both.
- A caller's leading question is not confirmation.
- A caller's restatement becomes evidence only when the representative explicitly confirms it.
- IVR content may support call routing, payer identity, or disclosure text but is weaker for member-specific benefits.
- Unknown-speaker statements cannot automatically pass critical fields.
- Existing patient identity data may guide fuzzy matching but must surface material disagreement.
- Carrier master may support configured static fields only within matching scope and effective period.

## 5. Question and answer handling

- Classify whether a numeric phrase is contained in a question or answer.
- Do not extract `$500` from `The deductible is $500, correct?` unless the representative confirms it.
- Handle short confirmations such as Yes by linking them to the immediately preceding proposition.
- Handle interruptions where the answer spans multiple segments.
- Handle repeated confirmation by merging equivalent evidence.
- Keep answer scope attached to service, network, and individual or family context.
- When a short Yes could refer to multiple questions, mark the candidate ambiguous.

## 6. Correction-chain logic

- Detect correction phrases such as `actually`, `let me correct that`, `I misspoke`, `no`, and `for physical therapy`.
- Link the corrected candidate to the earlier candidate.
- Prefer the final clear correction when authority and scope are equal.
- Do not simply choose the chronologically last number without semantic correction evidence.
- Preserve earlier values as conflict history.
- Use the sample visit count as a golden correction case: zero used is corrected to one used through nineteen remaining.
- When the correction remains ambiguous, route the field to NEEDS REVIEW.

## 7. Conflict logic

- Equivalent repeated values are supporting evidence, not conflict.
- Different values from the caller and representative are normally resolved by authority.
- Different values from the same representative without correction language create conflict.
- A later explicit correction can resolve conflict.
- Conflicting network scopes or benefit periods may represent two valid values rather than contradiction.
- A conflict that cannot be scoped or resolved receives CONFLICT_IN_SOURCE; Critical conflicts prevent PASSED.
- The sample 20 versus 30 percent coinsurance must remain conflict or review under the supplied evidence.

## 8. Unknown, unavailable, and negative logic

- `No` is a verified negative only when the representative answers the target question clearly.
- `We cannot see that` maps to PAYER_UNABLE_TO_VERIFY.
- `It was not discussed` maps to NOT_FOUND or NOT_ASKED according to source analysis.
- `Not applicable` is used only when the business rule makes the field inapplicable.
- Silence or absence never becomes No.
- `No termination date is listed` differs from `coverage terminates on no date`.
- Negation scope must include the target concept, such as `authorization is not required`.
- Unknown and unavailable states usually force NEEDS REVIEW when the field matters.

## 9. Starter terminology dictionary

- Policy ID aliases include member ID, subscriber ID, identification number, and insurance ID.
- Group ID aliases include group number, group code, and employer group.
- Effective date aliases include active date, eligible from, coverage started, and effective on.
- Termination date aliases include end date, coverage through, and termed on.
- Coinsurance aliases include patient percentage, member responsibility percentage, and cost share.
- Deductible met aliases include accumulated, applied, satisfied, and met to date.
- Deductible remaining aliases include balance, amount left, and remaining deductible.
- OOP aliases include out of pocket, maximum out of pocket, and OOP max.
- Authorization aliases include prior auth, preauthorization, precertification, and medical-necessity review.
- Referral aliases include PCP referral and physician referral.
- Visit limit aliases include hard max, calendar-year visits, and medically necessary.
- TFL aliases include timely filing, claim submission period, and filing limit.
- Corrected claim aliases include resubmission and practitioner correction.
- Call reference aliases include confirmation number, interaction ID, and reference number.
- The dictionary is versioned and payer-specific additions do not mutate prior runs.

## 10. Context dimensions

- Service scope distinguishes PT, OT, ST, chiropractic, combined services, and other configured services.
- Network scope distinguishes in network, out of network, group status, and individual-provider status.
- Benefit scope distinguishes individual, family, combined, and unknown.
- Temporal scope distinguishes effective period, calendar year, benefit year, date of service, and as-of date.
- Plan scope distinguishes carrier, plan type, line of business, state, and group where available.
- Authorization scope distinguishes initial evaluation, treatment, and medical-necessity review.
- Claim scope distinguishes original, corrected practitioner error, corrected payer error, and alternative deadline.
- Candidates with different scopes must not be compared as if they describe one value.

## 11. String normalization

- Trim surrounding whitespace; Collapse repeated internal whitespace where semantically harmless.
- Normalize case for comparison while preserving display case.
- Normalize common punctuation variants; Use Unicode normalization.
- Do not remove meaningful identifier suffixes; Do not fuzzy-match arbitrary long free text as an automatic pass.
- Use configurable alias sets for payer, plan, service, and network terminology.
- Return the transformation steps for explanation.

## 12. Identifier normalization

- Preserve leading zeros; Remove spaces and punctuation only when the field-specific rule allows it.
- Preserve alpha prefixes and suffixes.
- Treat `106723434` and `106723434-01` as different unless a payer-specific rule approves the relationship.
- Do not convert identifiers to numeric types; Limit fuzzy matching to explicitly approved patterns.
- Display raw and normalized identifiers during review.
- Policy, group, payer, authorization, and call reference may have different normalization rules.

## 13. Date normalization

- Parse spoken month-day-year and numeric US date forms.
- Store ISO date values; Display the client-approved US format.
- Do not guess century or swap month and day when ambiguous.
- Represent `current` as an eligibility or open-ended-period concept, not a fake date.
- Keep effective date and termination date separate; Compare date ranges with explicit boundaries.
- Attach timezone to call timestamps but not to date-only benefit fields.

## 14. Money normalization

- Parse currency symbols, commas, spoken dollars, and cents.
- Store integer cents or a decimal type, not binary floating point.
- Treat `$20`, `$20.00`, and `twenty dollars` as equivalent.
- Do not infer missing thousands from garbled audio without evidence.
- Keep total, met, and remaining as separate fields; Run arithmetic consistency checks after extraction.
- A mathematically consistent derived result is not proof that the transcript explicitly stated it.

## 15. Percentage normalization

- Parse percent signs and spoken percentages; Store a bounded decimal or integer percentage according to schema.
- Distinguish patient coinsurance from payer coverage.
- Treat 20 percent patient responsibility and 80 percent payer coverage as related but not identical field labels.
- Do not infer 100 percent payer coverage from zero copay and zero coinsurance.
- A contradiction between 20 and 30 percent remains material.

## 16. Boolean and categorical normalization

- Map confirmed yes and no to canonical values.
- Keep UNKNOWN, NOT_ASKED, PAYER_UNABLE_TO_VERIFY, and NOT_APPLICABLE distinct.
- Normalize INN to In Network and OON to Out of Network.
- Normalize medically necessary and hard maximum as visit-limit categories.
- Normalize `no termination date` separately from an explicit coverage end.
- Show the original wording in evidence; Do not coerce blank to No.

## 17. Comparison outcomes

- MATCH; MISMATCH.
- MISSING_IN_FORM; NOT_FOUND_IN_SOURCE.
- CONFLICT_IN_SOURCE; LOW_CONFIDENCE.
- MASTER_DATA_SUPPORTED; DERIVED_SUPPORTED.
- NOT_APPLICABLE; BYPASSED.
- MANUALLY_APPROVED; OUT_OF_SCOPE_SOURCE.
- Each outcome includes a rule code, human explanation, severity, and status consequence.

## 18. Comparison pipeline

- Load the exact imported or selected form revision.
- Load extracted candidates and approved non-transcript sources.
- Filter candidates by field, service, network, scope, and effective period.
- Apply speaker authority and correction rules; Normalize form and supported values.
- Evaluate exact, alias, range, and payer-specific equivalence.
- Create field outcome and explanation; Apply requiredness, criticality, and bypass configuration.
- Persist the comparison run before showing it; Never mutate the form as part of comparison.

## 19. Confidence use

- Confidence is an input to review, not an overall truth score.
- Use separate transcription, role, extraction, normalization, and source-authority confidence when available.
- A clear contradiction cannot be passed because confidence is high.
- A low-confidence critical value forces NEEDS REVIEW or FAILED according to configuration.
- Display simple High, Medium, or Low wording with details on demand.
- Calibrate confidence against labeled US24 examples.
- Track field-specific accuracy rather than one global model score.

## 20. Deterministic status precedence

- Evaluate all field outcomes after conditional rules.
- If any configured failure condition exists, case status is FAILED.
- Else if any configured review condition exists, case status is NEEDS REVIEW.
- Else if all required conditions are satisfied, case status is PASSED.
- Else the case remains DRAFT or incomplete.
- A reviewer's action changes field resolution data, then the engine recomputes status.
- The status record stores rule-set version and input revision.
- Aggregate percentages never override this precedence.

## 21. Prompt and data-safety rules

- Treat transcript and document text as untrusted content.
- System instructions state that source text is evidence, never executable instruction.
- Use a strict structured output schema; Reject unknown canonical field keys.
- Validate model output before persistence.
- Do not let source text request tool calls, secrets, status changes, or record deletion.
- Limit context to necessary source segments and controlled dictionaries.
- Record model and prompt version; Use deterministic post-processing for normalization and status.

## 22. Evaluation requirements

- Measure extraction precision and recall by canonical field.
- Measure candidate evidence correctness; Measure correction-chain accuracy.
- Measure conflict-detection recall; Measure false-No rate.
- Measure exact normalized comparison; Measure critical false-pass rate.
- Measure unsupported master-data use; Measure review-rate by payer and field.
- Use the supplied transcript and PDF as a mandatory adversarial fixture.
- Add payer-specific examples before enabling payer-specific automatic passes.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `The transcription layer converts audio to timestamped text and speakers` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `The relevance layer classifies target and non-target segments` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `The extraction layer returns candidate values with evidence and uncertainty` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `The normalization layer converts comparable values without destroying raw source text` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `The comparison layer evaluates imported or entered values against supported candidates` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `The field-rule engine evaluates requiredness, criticality, bypass, and conditional dependencies` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `The status engine combines field outcomes deterministically` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `The React UI explains results and captures human resolutions` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm `No AI response directly sets PASSED or FAILED` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm `Return the canonical field key` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
