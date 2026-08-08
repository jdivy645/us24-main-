# Decision Log Addendum

**Companion to:** [`17_RESEARCH_SOURCES_AND_DECISION_LOG.md`](./17_RESEARCH_SOURCES_AND_DECISION_LOG.md)
**Covers:** the implementation dated 2026-08-07
**Status:** engineering decisions, pending client review

---

## Why this file exists rather than an edit to file 17

File 16 §22 requires architecture changes to be documented in file 17, and 17 §19
requires every architecture change to be recorded as a new ADR.

The eighteen specification files cannot be edited. `LINE_COUNT_MANIFEST.txt` pins
each to exactly 300 newline-terminated lines with a SHA-256 digest, and its
verification result reads `PASS`. Editing file 17 would break that manifest and
destroy the integrity check the package ships with.

This addendum therefore continues the ADR sequence from ADR-012 and is intended
to be merged into file 17 by whoever owns the specification package.

---

## What was built

Phase 1 and Phase 2 in full, plus the parts of Phases 3, 5, 6 and 7 that need no
AI provider, no cloud infrastructure and no client template.

| Layer | Delivered |
|---|---|
| `packages/domain` | 103-field canonical registry, serializable rule engine, normalizers, terminology dictionary v1, deterministic comparison, status precedence, document gating |
| `packages/schemas` | Zod boundary contracts and the structured extraction contract |
| `packages/testing` | Golden fixture reproducing CASE-001…CASE-012, registry-driven factories |
| `packages/ui` | US24 tokens and components, including `FieldBlock` |
| `apps/api` | Fastify 5, entity model from 12 §5, SSE with resumable sequences, job runner, provider adapter seams, status-gated document generation |
| `apps/web` | React 19.2 / Vite 8, all fifteen routes from 03 §2, three-pane workspace |
| `e2e` | Playwright journeys and axe accessibility flows |

**Verified:** 233 unit, component and API tests; 30 browser tests including
accessibility on every route. Typecheck, lint and production build all clean.

---

## ADR-013 — SQLite, local disk and an in-process job runner

**Decision.** Use Node's built-in SQLite driver for relational data, a private
local folder for artifacts, and an in-process job runner, in place of the
PostgreSQL / S3 / Redis-and-BullMQ stack in 12 §1.

**Reason.** None of PostgreSQL, Redis or Docker is installed on the target
machine, and the user confirmed the build should run without them.

**What is preserved.**
- The relational schema is the 12 §5 entity list verbatim, written
  PostgreSQL-first: money in integer cents, identifiers as `TEXT`, indexes on the
  dimensions 12 §6 names.
- Immutability (12 §7) is enforced in the repository layer, which exposes no
  update or delete path for artifacts, revisions, extraction runs, comparison
  runs, bypasses or documents. A test asserts those methods do not exist.
- Artifact bytes go through a `StorageAdapter`; nothing writes files directly.
- The job runner implements the interface BullMQ would, keeping idempotency
  keys, bounded attempts, backoff, unrecoverable-error classification,
  cooperative cancellation and per-stage retry that resumes rather than restarts.
- Queue names are 12 §8 verbatim.

**Consequence.** Migrating to the specified stack replaces three files —
`db/database.ts`, `db/migrate.ts` and `jobs/queue.ts` — plus the storage adapter.
Nothing above the repository and adapter interfaces changes.

**Not delivered.** Connection pooling, worker/API process separation, backup and
restore, and the disaster-recovery exercises in 12 §20.

**Status.** Accepted for this build. Revisit before Phase 3 sign-off.

---

## ADR-014 — Fixture-backed transcription and extraction adapters

**Decision.** Ship the transcription and extraction adapters as interfaces with
fixture-backed doubles. No provider is called.

**Reason.** 12 §12 is explicit: *"Do not send data before the client approves
contractual, privacy, and security requirements."* 17 §18 lists cloud, AI,
transcription and RingCentral vendor approvals as pending. Calling a provider
would breach the specification, not merely anticipate it.

**What is preserved.**
- ADR-005 is enforced structurally. The extraction contract in
  `packages/schemas` is `.strict()` and has no property through which a model
  could express a field state or a case status. A test asserts that, and asserts
  that an attempt to smuggle `outcome` or `caseStatus` is rejected.
- Adapter output passes the same Zod validation a real provider will
  (08 §21: *"Validate model output before persistence"*).
- Every extraction run records provider, model version and prompt version.
- Transcript parsing, speaker-role classification and relevance classification
  are real and run against pasted or uploaded text.

**Deliberately not built.** Keyword extraction. 02 §12 and 00 §4 both forbid
treating isolated keywords as benefit facts, and 02 §6 notes the supplied
transcript *"demonstrates why keyword-only extraction would create false
values."* With no approved provider, `NoProviderExtractionAdapter` returns
nothing, which surfaces every form value as unsupported and needing review — the
safe direction.

**Consequence.** Audio transcription (Phase 4) is unavailable end to end.
Uploading audio raises an explicit error rather than producing an empty
transcript that would look like a call in which nothing was said.

**Status.** Accepted. Blocked on vendor approval and a signed agreement.

---

## ADR-015 — Interim document template

**Decision.** Generate documents from an interim US24-styled HTML layout,
registered in the template registry and labelled as not the client's template.

**Reason.** The client's official blank VOB template was not supplied. 13 §7
states *"The client-supplied format decides the final method after inspection"* —
DOCX placeholders, fillable-PDF field names and a coordinate overlay are three
different implementations, and choosing between them without the file would be
guesswork.

**What is preserved, and fully enforced.**
- Status gating (09 §16, 13 §11). FAILED cannot produce a clean final VOB;
  NEEDS REVIEW produces only a marked draft or the internal QA report. The gate
  is checked server-side, so a client ignoring a disabled button still cannot
  obtain a clean final.
- A stale result blocks finalization entirely (09 §15).
- Draft watermarking, and the four document types from 13 §17.
- The internal QA report contents from 13 §12.
- Page-count validation with no logo-only trailing page — the defect 02 §5
  records in the supplied sample.
- Checksum and generation metadata on every document (12 §16).
- Every document stores its template version, so a template change never
  rewrites a historical document.

**Status.** Accepted. Blocked on the template file and its colour legend.

---

## ADR-016 — The golden fixture is reconstructed, not parsed

**Decision.** Rebuild the golden fixture from the values the specifications
state, behind a loader interface, rather than blocking on the missing files.

**Reason.** 15 §8 designates three client files as the golden fixture. None was
supplied. However 02 §5, 02 §9, 15 §9, 15 §10 and 15 §11 state the relevant
values verbatim — the fifth-versus-eighth visit, 20-versus-30 percent
coinsurance, 90-versus-180 day filing, secondary unable-to-verify, nineteen
remaining of twenty, group ID `00633434`, call reference `20874738`. The user
confirmed reconstruction.

**What is preserved.** The tests assert *outcomes*, not fixture internals. When
the real files arrive, implement `GoldenFixtureLoader` against them and register
it in `packages/testing/src/loader.ts`. No engine code and no assertion changes.

**Known limitation.** The reconstruction cannot reproduce transcription noise
the specs describe but do not quote — ASR spelling errors, numbers split by
pauses, and the exact garbling of the deductible passage. Those are approximated.
Running the fixture against the real transcript may surface extraction gaps this
build does not exercise.

**Status.** Accepted, with the real files superseding it when supplied.

---

## ADR-017 — Two interpretation decisions the specs leave open

Recorded because they are judgement calls a reviewer should check, not
mechanical readings.

**1. `NOT_FOUND_IN_SOURCE` carries REVIEW severity, never FAILURE.**

09 §2 defines it as *"the form asserts a value not supported by permitted
sources."* Unsupported is not contradicted: the value may be correct and simply
never discussed. CASE-011 confirms the reading — payer phone, plan, network,
payer ID and copay *"require another approved source or review."* REVIEW still
blocks PASSED, so this cannot produce a critical false pass. Only a direct
contradiction earns FAILURE.

**2. IVR evidence alone is never sufficient for any field.**

08 §4 says IVR content *"may support call routing, payer identity, or disclosure
text but is weaker for member-specific benefits"*, and 02 §10 adds it *"should
not automatically override a live representative."* A per-field carve-out — IVR
acceptable for routing data, weak for benefits — produces the wrong answer for
CASE-011, which requires the payer phone to need another source or review. IVR-only
evidence therefore routes to review regardless of field.

**Status.** Both are implemented, tested and flagged for client confirmation.

---

## Also deferred

| Item | Reason | Unblocked by |
|---|---|---|
| Phase 4 — audio transcode, chunk, transcribe, diarize | ADR-014 | Vendor approval and signed agreement |
| Phase 8 — RingCentral | 12 §13 lists ten unanswered discovery questions | Client answers |
| DOCX / PDF / XLSX / CSV parsers | Client source files not supplied; parser fixtures in 15 §5 cannot be built without them | Files supplied |
| Completed-form import mapping (13 §2, §4) | Same | Same |
| Excel operational export (13 §15) | Depends on the same spreadsheet adapter | Same |
| Repeat-VOB prefill and field deltas (10 §5, §7) | Data model and screens exist; the prefill flow itself is not wired | Duplicate-merge and benefit-year policy (17 §18) |
| Carrier-master authoring and activation | Read paths and proposal display are built; write paths need governance | Carrier-master ownership and approval workflow (17 §18) |
| Final field, criticality and bypass matrices | `PENDING_CLIENT` by design (06 §16, 09 §12) | Client sign-off |
| Production access boundary | ADR-008 requires it and this build does not provide it | Deployment decision (17 §18) |

---

## The standing risk, restated

ADR-008 records it and it has not changed: **this application has no
authentication.** It must not be exposed to an untrusted network. The workstation
label in the top bar is operational metadata and is not evidence of who performed
an action. Production deployment requires an approved controlled-access boundary
in front of it.

No claim of HIPAA compliance is made or implied. This is an engineering
evidence pack for client review, as 16 §18 requires.
