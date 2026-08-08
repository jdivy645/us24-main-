# UI/UX Design System and Interaction Standards
## US24 Solutions — React VOB Automation Blueprint

**Document:** `04_UI_UX_DESIGN_SYSTEM.md`
**Document order:** 5 of 18
**Parent index:** [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
**Previous:** [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
**Next:** [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
**Project state:** Implementation-ready specification with named pending client decisions
**Prepared:** 2026-08-07

---

## Purpose

Translate the existing US24 visual identity into a polished, accessible, high-density operations design system for the React website.

## Direct dependencies

- [`00_README_AND_MASTER_INDEX.md`](./00_README_AND_MASTER_INDEX.md)
- [`03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md`](./03_INFORMATION_ARCHITECTURE_AND_USER_FLOWS.md)
- [`05_SCREEN_SPECIFICATIONS_WORKSPACE.md`](./05_SCREEN_SPECIFICATIONS_WORKSPACE.md)
- [`09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md`](./09_STATUS_INLINE_ERRORS_BYPASS_REVIEW.md)
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

## 1. Visual direction

- Preserve the current navy and orange identity rather than redesigning the brand into a consumer application.
- Use off-white page backgrounds, white working surfaces, restrained shadows, and cool gray dividers.
- Make the workspace feel like a precise insurance operations tool rather than an AI novelty.
- Use color primarily for status and focus, not decoration.
- Keep document preview styling visually connected to the client PDF.
- Use strong information hierarchy so dense data remains scannable.
- Avoid oversized marketing headers, glassmorphism, gradients across the entire viewport, or excessive rounded cards.
- Use subtle depth and motion to communicate pane changes, processing, and resolution.

## 2. Core color tokens

- `--us24-navy-900: #0F1B2D` for primary text and deepest surfaces.
- `--us24-navy-800: #1B3A6B` for the main brand and top bar.
- `--us24-navy-700: #2C5AA0` for focus and interactive emphasis.
- `--us24-orange-600: #E8761F` for primary action and brand accent.
- `--surface-canvas: #F5F7FA` for page background.
- `--surface-card: #FFFFFF` for working panels.
- `--border-default: #DDE4EE` for section and field borders.
- `--text-muted: #5A6A80` for secondary labels.
- `--success-700: #0E7C5A` and `--success-050: #E7F5EF`.
- `--danger-700: #B42318` and `--danger-050: #FEF3F2`.
- `--review-700: #B54708` and `--review-050: #FFFAEB`.
- `--info-700: #175CD3` and `--info-050: #EFF8FF`.
- `--disabled-foreground: #98A2B3` and `--disabled-background: #F2F4F7`.
- Never use color alone to communicate a result.

## 3. Typography

- Use Inter or a metrically compatible system sans-serif for the web interface.
- Use a compact type scale appropriate to data-heavy work.
- Page title: 24 to 28 pixels, 700 weight.
- Section title: 16 to 18 pixels, 700 weight.
- Card title: 14 to 16 pixels, 650 or 700 weight.
- Field label: 12 to 13 pixels, 600 weight.
- Input value: 14 pixels minimum on desktop and 16 pixels on touch-focused mobile controls to avoid zoom.
- Metadata: 11 to 12 pixels with sufficient contrast.
- Use tabular numerals for money, dates, percentages, policy numbers, and counts.
- Do not uppercase long labels; reserve uppercase for short eyebrow labels and status tokens.
- Preserve readable line height in evidence excerpts.

## 4. Spacing and layout

- Use a four-pixel base spacing scale.
- Common gaps are 4, 8, 12, 16, 20, 24, and 32 pixels.
- Use 12-pixel field-block radii and 10-pixel inner-control radii.
- Use one-pixel borders for neutral structure and two-pixel borders for focused or problematic field blocks.
- Keep form labels close to their controls and separate unrelated groups with larger section spacing.
- Use a maximum content width only on list and settings pages; the review workspace may use the full viewport.
- Keep dense form rows aligned but allow long evidence text to grow vertically.
- Reserve pane widths before loading to prevent layout shift.

## 5. Elevation and borders

- Use a subtle shadow only for floating surfaces, sticky panes, and dialogs.
- Use borders rather than shadows for most dense workspace panels.
- Use a stronger shadow for the evidence drawer and modal confirmation dialogs.
- Do not put every nested block in its own elevated card.
- Use an orange top or left accent only for selected or highlighted business content.
- Use a three-pixel navy rule in the live document preview to echo the current PDF.

## 6. Field-block anatomy

- Each canonical field renders as one semantic `FieldBlock`.
- The block header contains label, requirement indicator, field-state icon, and source chip.
- The input area contains the editable control or read-only display.
- The provenance row shows source type and as-of date when needed.
- The inline result region shows comparison text, supported value, evidence action, confidence, and resolution actions.
- A changed-field marker opens revision history.
- A bypass marker shows the controlled reason and status consequence.
- A derived marker exposes the formula and operands.
- The entire block receives red or amber treatment when problematic.
- The entered value remains readable and is never replaced by only a placeholder.

## 7. Status visual language

- PASSED uses a restrained green badge with a check icon and text.
- FAILED uses a red badge with an error icon and text.
- NEEDS REVIEW uses amber with a review icon and text.
- PROCESSING uses blue with progress text and optional indeterminate animation.
- DRAFT uses neutral gray.
- MATCH uses a small neutral or green check without flooding the whole form green.
- MISMATCH and MISSING REQUIRED use a red field border and pale red background.
- CONFLICT and LOW CONFIDENCE use an amber border and pale amber background.
- MASTER DATA SUPPORTED uses a blue source chip.
- DERIVED uses a violet or info-toned chip plus formula disclosure, not a success color.
- BYPASSED uses a neutral outlined badge plus reason.

## 8. Inline error behavior

- Place the error explanation immediately below the control inside the field block.
- Start the message with the practical difference, such as `Entered 5 visits; representative confirmed 8`.
- Show a short evidence excerpt without forcing the user to open another page.
- Include timestamp, page, sheet, or source label.
- Use `View evidence` to open full context.
- Use `Apply supported value` only when the comparison has a single safe supported value.
- Use `Review conflict` when multiple candidates exist.
- Use `Bypass with reason` only when field configuration permits it.
- Keep the red state until re-verification confirms the resolution.
- Announce newly inserted messages to assistive technology.

## 9. Core component library

- AppShell.
- BrandTopBar.
- NavigationRail.
- CaseHeader.
- StatusBadge.
- StageProgress.
- SourceCard.
- UploadDropzone.
- MultipartProgress.
- TranscriptViewer.
- SpeakerFilter.
- EvidenceExcerpt.
- EvidenceDrawer.
- FormSection.
- FieldBlock.
- SourceChip.
- ConfidenceIndicator.
- ComparisonMessage.
- ResolutionActions.
- BypassDialog.
- RevisionHistoryPopover.
- DocumentPreview.
- RecordTable.
- RecordCard.
- FilterBar.
- VersionTimeline.
- DeltaTable.
- CarrierScopeCard.
- TemplateMappingTable.
- EmptyState with realistic next actions.
- ErrorBoundaryPanel.
- Toast and persistent inline status region.

## 10. Buttons and controls

- Use orange only for the primary action in the current context.
- Use navy for secondary high-value actions such as Preview or Open Workspace.
- Use neutral outlined buttons for non-destructive utilities.
- Use red only for destructive actions and irreversible finalization warnings.
- Button labels must describe outcomes, such as `Verify against transcript`, not generic `Submit`.
- Disable actions only when the reason is visible nearby.
- Show a progress indicator inside long-running action buttons but keep page-level progress as the source of truth.
- Use segmented controls for two to four mutually exclusive modes.
- Use searchable comboboxes for carrier, patient, policy, and template selection.
- Use explicit Unknown, Not available, and Not applicable options rather than blank-as-No.

## 11. Motion and feedback

- Use 120 to 180 millisecond transitions for hover, focus, pane expand, and field-state updates.
- Use 180 to 240 milliseconds for drawers and dialogs.
- Animate only opacity and transform where possible.
- Do not animate the entire form after verification.
- Use a brief highlight when evidence navigation lands on a transcript segment.
- Use progress skeletons that preserve final layout dimensions.
- Respect `prefers-reduced-motion`.
- Do not use confetti, bouncing status icons, or celebratory animation in this operational workflow.
- Use toasts for completed background actions and persistent inline messages for errors requiring work.

## 12. Desktop behavior

- Target common operations widths from 1280 to 1920 pixels.
- Use a 240-pixel expanded navigation rail and a compact collapsed state.
- Allow the three-pane workspace to allocate approximately 28 percent source, 44 percent form, and 28 percent evidence or preview.
- Allow users to resize source and evidence panes within minimum and maximum constraints.
- Keep the case header and section navigator sticky.
- Keep final action controls visible without covering content.
- Use virtualized transcript rendering for very long calls.
- Use sticky table headers on Records and Review Queue.

## 13. Tablet and mobile behavior

- At tablet widths, use a collapsible navigation drawer and two-pane workspace.
- At mobile widths, use Source, Form, Evidence, and Preview tabs.
- Show unresolved-field count on the Form tab.
- Place primary actions in a bottom action bar with safe-area padding.
- Use full-screen dialogs for bypass and evidence details.
- Ensure every touch target meets the agreed accessibility minimum.
- Do not hide evidence or status information on mobile.
- Convert dense two-column form grids to one column.
- Preserve policy IDs and money formatting without horizontal clipping.

## 14. Content standards

- Use `Needs review`, not `AI uncertain`.
- Use `Supported value`, not `AI answer`.
- Use `Representative confirmed`, `Caller stated`, `Carrier master`, or `Derived calculation` for provenance.
- Use `Payer unable to verify` instead of converting the answer to No.
- Use sentence case for field labels and actions.
- Write dates in the selected US display format while storing ISO values.
- Preserve leading zeros in group, policy, payer, and reference identifiers.
- Explain abbreviations on first use in help or tooltips.
- Avoid claims such as `100% covered` unless explicitly supported.
- Display the benefits-not-guaranteed disclaimer in the document, not as a substitute for correct verification.

## 15. Accessibility design standards

- Every field has a persistent visible label.
- Requiredness, invalidity, and error descriptions are programmatically associated with the control.
- Focus order follows the visual task order.
- Keyboard shortcuts are optional and never the only way to act.
- Visible focus uses a high-contrast ring.
- Status and progress changes use appropriate live regions without excessive announcements.
- Icons have text or accessible names.
- Color contrast meets the agreed WCAG 2.2 level.
- Error links move focus to the affected field.
- Dialogs trap focus and return it to the invoking control.
- Transcript timestamps, play controls, and speaker labels are keyboard accessible.
- Tables expose headers and provide a card alternative at narrow widths.


## Implementation acceptance checklist

- [ ] AC-001 — Implementation: confirm `Preserve the current navy and orange identity rather than redesigning the brand into a consumer application` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-002 — Design review: confirm `Use off-white page backgrounds, white working surfaces, restrained shadows, and cool gray dividers` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-003 — Domain review: confirm `Make the workspace feel like a precise insurance operations tool rather than an AI novelty` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-004 — QA verification: confirm `Use color primarily for status and focus, not decoration` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-005 — Accessibility review: confirm `Keep document preview styling visually connected to the client PDF` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-006 — Security review: confirm `Use strong information hierarchy so dense data remains scannable` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-007 — Regression protection: confirm `Avoid oversized marketing headers, glassmorphism, gradients across the entire viewport, or excessive rounded cards` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-008 — Client acceptance: confirm `Use subtle depth and motion to communicate pane changes, processing, and resolution` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-009 — Implementation: confirm ``--us24-navy-900: #0F1B2D` for primary text and deepest surfaces` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-010 — Design review: confirm ``--us24-navy-800: #1B3A6B` for the main brand and top bar` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-011 — Domain review: confirm ``--us24-navy-700: #2C5AA0` for focus and interactive emphasis` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-012 — QA verification: confirm ``--us24-orange-600: #E8761F` for primary action and brand accent` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-013 — Accessibility review: confirm ``--surface-canvas: #F5F7FA` for page background` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-014 — Security review: confirm ``--surface-card: #FFFFFF` for working panels` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-015 — Regression protection: confirm ``--border-default: #DDE4EE` for section and field borders` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-016 — Client acceptance: confirm ``--text-muted: #5A6A80` for secondary labels` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-017 — Implementation: confirm ``--success-700: #0E7C5A` and `--success-050: #E7F5EF`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-018 — Design review: confirm ``--danger-700: #B42318` and `--danger-050: #FEF3F2`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-019 — Domain review: confirm ``--review-700: #B54708` and `--review-050: #FFFAEB`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-020 — QA verification: confirm ``--info-700: #175CD3` and `--info-050: #EFF8FF`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-021 — Accessibility review: confirm ``--disabled-foreground: #98A2B3` and `--disabled-background: #F2F4F7`` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-022 — Security review: confirm `Never use color alone to communicate a result` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-023 — Regression protection: confirm `Use Inter or a metrically compatible system sans-serif for the web interface` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-024 — Client acceptance: confirm `Use a compact type scale appropriate to data-heavy work` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-025 — Implementation: confirm `Page title: 24 to 28 pixels, 700 weight` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-026 — Design review: confirm `Section title: 16 to 18 pixels, 700 weight` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-027 — Domain review: confirm `Card title: 14 to 16 pixels, 650 or 700 weight` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-028 — QA verification: confirm `Field label: 12 to 13 pixels, 600 weight` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-029 — Accessibility review: confirm `Input value: 14 pixels minimum on desktop and 16 pixels on touch-focused mobile controls to avoid zoom` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-030 — Security review: confirm `Metadata: 11 to 12 pixels with sufficient contrast` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-031 — Regression protection: confirm `Use tabular numerals for money, dates, percentages, policy numbers, and counts` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-032 — Client acceptance: confirm `Preserve readable line height in evidence excerpts` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-033 — Implementation: confirm `Use a four-pixel base spacing scale` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-034 — Design review: confirm `Common gaps are 4, 8, 12, 16, 20, 24, and 32 pixels` is implemented, demonstrated, or explicitly recorded as pending.
- [ ] AC-035 — Domain review: confirm `Use 12-pixel field-block radii and 10-pixel inner-control radii` is implemented, demonstrated, or explicitly recorded as pending.
**End of document — exactly 300 lines.**
