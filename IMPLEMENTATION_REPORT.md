# Implementation Report

**Template:** [`16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md`](./16_IMPLEMENTATION_PHASES_AND_AI_AGENT_PROMPTS.md) §21
**Phases:** 1 and 2 complete; the deterministic core of 3, 5, 6 and 7
**Date:** 2026-08-07
**Decisions:** [`DECISION_LOG_ADDENDUM.md`](./DECISION_LOG_ADDENDUM.md)

---

## Running it

```bash
pnpm install
pnpm db:push          # apply the schema
pnpm seed             # populate demo data — one case per outcome state
pnpm dev              # api on :3001, web on :5173
```

Open <http://localhost:5173>. The seed prints the golden case ID.

```bash
pnpm typecheck        # strict TypeScript across 7 packages
pnpm lint             # ESLint, zero warnings tolerated
pnpm test             # 233 unit, component and API tests
pnpm test:e2e         # 30 Playwright journeys (re-seeds first)
pnpm test:a11y        # the axe subset
pnpm build            # production build
pnpm verify           # typecheck + lint + test + build
```

Playwright needs its browser once: `pnpm --filter @us24/e2e install-browsers`.

---

## Commands and results

| Gate | Result |
|---|---|
| `pnpm typecheck` | **Pass** — 7 packages, strict mode, `noUncheckedIndexedAccess` on |
| `pnpm lint` | **Pass** — 0 errors, 0 warnings |
| `pnpm test` | **Pass** — 233/233 across 7 files |
| `pnpm test:e2e` | **Pass** — 30/30 |
| `pnpm test:a11y` | **Pass** — no serious or critical axe violations on any route |
| `pnpm build` | **Pass** — web 203 kB app + 280 kB vendor (50/89 kB gzipped); API emits JS |
| Golden case | **Pass** — all of CASE-001…CASE-012 produce their required outcomes |
| Critical false passes | **Zero** |

---

## Packages

| Package | Contents |
|---|---|
| `packages/domain` | Registry, rules, normalizers, terminology, comparison, status. Pure — no I/O, no clock, no randomness |
| `packages/schemas` | Zod boundary contracts; the extraction contract enforcing ADR-005 |
| `packages/testing` | Golden fixture, expectation table, registry-driven factories |
| `packages/ui` | Design tokens and components from 04 §2–§9 |
| `apps/api` | Fastify 5, 12 §5 entities, SSE, jobs, adapters, documents |
| `apps/web` | React 19.2 / Vite 8, fifteen routes, three-pane workspace |
| `e2e` | Playwright + axe |

**Migrations:** one — `apps/api/src/db/database.ts` creates 18 tables. Run with
`pnpm db:push`.

---

## Requirements implemented

**Locked contract (00 §4).** Both modes; transcript and pasted-text inputs;
US24 navy/orange identity preserved; inline field highlighting as the primary
error experience; PASSED / FAILED / NEEDS REVIEW as the only outcomes with
PROCESSING and DRAFT kept separate; immutable originals with append-only
revisions; AI as extractor only; irrelevant talk excluded from extraction context
but retained; governed bypass with no generic Ignore; versioned carrier master;
manual upload permanent; no login screen; no localStorage PHI; no 100 percent
inference; configurable field matrix; status-gated documents; filenames never
authoritative.

**Golden case (02 §9, 15 §9–§11).** All twelve discrepancy cases and all ten
expected matches are asserted in `packages/domain/test/golden-case.test.ts` and
again through the browser in `e2e/tests/journeys.spec.ts`.

**Normalization (15 §4).** `$20` / `$20.00` / `twenty dollars` equal;
`10/07/2010` equals `October 7th 2010`; `INN` equals in network; phone
punctuation normalized; leading zeros preserved; policy suffixes kept distinct;
`Current` never becomes a date; patient coinsurance never relabelled as payer
coverage; no-copay plus no-coinsurance never derives 100 percent; ambiguous
numeric dates refused.

**Accessibility (04 §15, 15 §19).** Persistent visible labels; `aria-invalid` and
`aria-describedby` driven by the deterministic result; focus order following task
order; a skip link; high-contrast focus rings; polite live regions for results and
saves; text plus icon on every status so colour is never the only signal;
`prefers-reduced-motion` honoured; keyboard issue navigation landing on the field
itself; native `<dialog>` for focus trapping and return.

---

## Screens and routes

All fifteen routes from 03 §2 exist and are populated. `/` redirects to
`/verifications/new`; an unknown route explains itself and offers safe
navigation. Verified by test, not by inspection.

## API routes

The 12 §4 endpoint list, plus `/v1/registry` (the rule bundle the browser renders
the form from) and `/v1/system/health`. `POST /v1/integrations/ringcentral/import`
returns 501 with the reason and names manual upload as the permanent fallback.

---

## Tests added

| Suite | Count | Covers |
|---|---|---|
| `domain/test/golden-case.test.ts` | 64 | CASE-001…CASE-012, expected matches, status, gating |
| `domain/test/normalization.test.ts` | 45 | The 15 §4 table, clause by clause |
| `domain/test/registry.test.ts` | 25 | Field count, no-default rule, matrix separability |
| `domain/test/rules-and-status.test.ts` | 40 | Conditional rules, precedence, bypass, freshness, candidate handling |
| `schemas/test/extraction-contract.test.ts` | 16 | ADR-005 enforcement, prompt-injection inertness |
| `api/test/api-contract.test.ts` | 24 | Validation, idempotency, concurrency, immutability, gating, audit |
| `web/src/features/field-block.test.tsx` | 19 | Every FieldBlock state and action |
| `e2e/tests/journeys.spec.ts` | 30 | Journeys, security, responsive, accessibility |

---

## Security and accessibility notes

**Enforced mechanically, not by review.** ESLint bans
`dangerouslySetInnerHTML` and any use of `localStorage` or `sessionStorage`
outside the E2E suite that proves they are empty. An E2E test asserts browser
storage contains no case, transcript or patient data, and that `localStorage` is
literally `{}`.

**Also in place.** Helmet with a restrictive CSP and no CDN origins; rate
limiting; storage keys rejected for path traversal; log redaction for request
bodies and headers; errors returning only a code, a safe message and a
correlation ID — a test asserts no SQL, stack trace or storage key can leak.

**Two accessibility defects were found and fixed during this build**, both by the
axe suite rather than by inspection:

1. The primary button rendered white on `#E8761F` at 2.98:1, below the WCAG AA
   4.5:1 minimum. Fixed by using navy text on the unchanged brand orange, giving
   4.97:1 — the identity is preserved rather than redesigned.
2. Non-target transcript segments were de-emphasised with opacity, dropping them
   to 2.26:1. Replaced with a muted colour and tinted background at 4.94:1.

**Not done.** Zoom at 200 and 400 percent, touch-target spacing measurement and
screen-reader walkthroughs are listed in 15 §19 and were not performed. Automated
checks catch roughly half of accessibility defects; a manual pass is still
required before release.

---

## Known limitations allowed by these phases

- Audio transcription is unavailable (ADR-014). Uploading audio raises an
  explicit error rather than silently producing an empty transcript.
- Document parsers for DOCX, PDF, XLSX and CSV are not built (ADR-016). Pasted
  and uploaded plain text work end to end.
- Documents render from an interim layout, not the client template (ADR-015).
- SQLite, local disk and an in-process runner stand in for PostgreSQL, S3 and
  BullMQ (ADR-013).
- Repeat-VOB prefill, field deltas and carrier-master authoring have data models
  and read paths but no write flows.
- The golden fixture is reconstructed from spec-stated values, so it cannot
  reproduce transcription noise the specs describe but do not quote.

---

## Pending client decisions

Unchanged from 17 §18. The four that block the most work:

1. **The field, criticality and bypass matrices.** Everything is built to accept
   them as configuration; `RULE_MATRIX_V0_PENDING` is provisional and every entry
   is flagged in the UI as such.
2. **The official template**, its format and its colour legend.
3. **Vendor approvals** for transcription and extraction, with a signed agreement.
4. **The production access boundary.** ADR-008 requires one and this build does
   not provide it.

Also outstanding: OCR scope, retention schedule, duplicate-merge policy,
benefit-year base-record policy, carrier-master ownership, the verified-by
identity mechanism, manual-approval authority, and whether NEEDS REVIEW may ever
produce a clean final PDF after an override.

---

## Next-phase prerequisites

**Before Phase 3 completion:** the four client source files, so parsers can be
built against the 15 §5 fixture matrix; a decision on PostgreSQL versus
continuing on SQLite; OCR scope for image-only PDFs.

**Before Phase 4:** an approved transcription provider with a signed agreement;
maximum file size and duration limits; approved test recordings or synthetic
non-PHI audio.

**Before Phase 5 release:** approved field and bypass matrices; calibration
examples for confidence thresholds.

**Before Phase 6:** duplicate-merge and benefit-year policies; carrier-master
ownership and approval workflow.

**Before Phase 7:** the official template and sign-off on its layout.

**Before Phase 8:** answers to all ten RingCentral discovery questions in 12 §13;
the production access boundary; the security, backup and disaster-recovery work
in 12 §20.

---

## The one thing to check first

Open the golden case workspace and look at four fields: the authorization
threshold, coinsurance, secondary coverage and visits used. If those four read
the way 02 §9 says they must — a red mismatch stating *"Entered 5; representative
confirmed 8"*, an amber conflict showing both 20% and 30% with no apply button,
a secondary field that refuses to say "No", and a visits count showing
*"1 was calculated from 20 and 19"* with the representative's retracted "none
used" still in history — then the deterministic engine is behaving as specified.

If they do not, nothing downstream can be trusted, and that is the point of
making them a release gate.
