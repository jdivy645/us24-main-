/**
 * Document generation — 13 §11, §12, §13, §17 and 09 §16.
 *
 * ============================================================================
 * DEFERRAL — DECISION_LOG_ADDENDUM.md ADR-015.
 *
 * 13 §7 states that "The client-supplied format decides the final method after
 * inspection" and 17 §18 lists the official template as pending. The template
 * was not supplied, so this renders an INTERIM US24-styled HTML document, clearly
 * marked as not the client's official template, through the same versioned
 * template registry a real template will use (13 §6).
 *
 * What is NOT deferred, and is fully enforced here:
 *   - status gating (09 §16, 13 §11) — FAILED cannot produce a clean final;
 *   - watermarking of drafts;
 *   - the internal QA report contents (13 §12);
 *   - no logo-only trailing page (13 §13, 02 §5);
 *   - checksum and generation metadata on every document (12 §16).
 * ============================================================================
 */

import { createHash } from 'node:crypto';
import type { FieldComparison } from '@us24/domain';
import { FIELD_REGISTRY, SECTION_LABEL, SECTION_ORDER, formatCents } from '@us24/domain';
import { ErrorCode } from '@us24/schemas';
import { unprocessable } from '../errors.js';
import type { Repository } from '../db/repository.js';
import type { StorageAdapter } from '../adapters/index.js';
import type { CaseService } from './case-service.js';

export type DocumentType = 'FINAL' | 'NEEDS_REVIEW_DRAFT' | 'QA_FAILED_DRAFT' | 'QA_REPORT';

const WATERMARK: Record<DocumentType, string | null> = {
  FINAL: null,
  NEEDS_REVIEW_DRAFT: 'NEEDS REVIEW — DRAFT',
  QA_FAILED_DRAFT: 'QA FAILED — DRAFT',
  QA_REPORT: 'INTERNAL QA REPORT',
};

export class DocumentService {
  constructor(
    private readonly repo: Repository,
    private readonly storage: StorageAdapter,
    private readonly cases: CaseService,
  ) {}

  /**
   * 09 §16: finalization selects one revision, one comparison run, one template
   * version and one result. The gate is checked here, server-side, so a client
   * that ignores a disabled button still cannot obtain a clean final document.
   */
  async generate(
    caseId: string,
    input: { revisionId: string; comparisonRunId: string; documentType: DocumentType },
  ): Promise<{ documentId: string; filename: string; pageCount: number }> {
    const snapshot = this.cases.snapshot(caseId);
    const gate = snapshot.documentGate;

    if (!gate) {
      throw unprocessable(
        ErrorCode.STALE_COMPARISON,
        'This case has not been verified yet. Run Verify before generating a document.',
      );
    }

    if (!gate.allowed.includes(input.documentType)) {
      const blocked = gate.blocked.find((b) => b.type === input.documentType);
      throw unprocessable(
        ErrorCode.DOCUMENT_NOT_PERMITTED,
        blocked?.reason ??
          `A ${input.documentType} document is not permitted for this case in its current state.`,
      );
    }

    const run = this.repo.getComparisonRun(input.comparisonRunId);
    if (!run) {
      throw unprocessable(ErrorCode.STALE_COMPARISON, 'That verification result no longer exists.');
    }

    const template =
      this.repo.getActiveTemplateVersion() ??
      ({ id: 'tpl_interim', client_label: 'US24 interim layout' } as Record<string, unknown>);

    const comparisons = JSON.parse(run.comparisons_json) as FieldComparison[];
    const html =
      input.documentType === 'QA_REPORT'
        ? this.renderQaReport(caseId, snapshot, comparisons, run)
        : this.renderVob(caseId, snapshot, comparisons, input.documentType);

    const bytes = Buffer.from(html, 'utf8');
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const filename = this.filenameFor(snapshot, input.documentType);
    const storageKey = `cases/${caseId}/documents/${checksum}.html`;
    await this.storage.put(storageKey, bytes);

    // 13 §13: "Validate page count and non-empty content" and never emit the
    // logo-only trailing page the supplied sample contains (02 §5).
    const pageCount = countPages(html);
    if (pageCount < 1) {
      throw unprocessable(ErrorCode.INTERNAL_ERROR, 'Document rendering produced no pages.');
    }

    const documentId = this.repo.insertDocument({
      caseId,
      revisionId: input.revisionId,
      comparisonRunId: input.comparisonRunId,
      templateVersionId: String(template['id']),
      documentType: input.documentType,
      filename,
      storageKey,
      checksum,
      byteSize: bytes.byteLength,
      pageCount,
    });

    this.repo.audit({
      caseId,
      eventType: 'DOCUMENT_GENERATED',
      entityRef: documentId,
      metadata: { documentType: input.documentType, checksum, pageCount },
    });

    return { documentId, filename, pageCount };
  }

  /** 13 §17: differentiate FINAL, NEEDS_REVIEW_DRAFT, QA_FAILED_DRAFT and QA_REPORT. */
  private filenameFor(
    snapshot: { case: Record<string, unknown> },
    type: DocumentType,
  ): string {
    const payer = sanitize(String(snapshot.case['payer_label'] ?? 'payer'));
    const date = new Date().toISOString().slice(0, 10);
    return `US24_VOB_${payer}_${date}_${type}.html`;
  }

  private renderVob(
    caseId: string,
    snapshot: ReturnType<CaseService['snapshot']>,
    comparisons: readonly FieldComparison[],
    type: DocumentType,
  ): string {
    const watermark = WATERMARK[type];
    const byKey = new Map(comparisons.map((c) => [c.fieldKey, c]));

    const sections = SECTION_ORDER.map((section) => {
      const fields = FIELD_REGISTRY.bySection(section).filter((f) => {
        const c = byKey.get(f.key);
        // 13 §13: no orphaned section labels — a section with nothing to show
        // is omitted entirely rather than printing an empty heading.
        return c?.isVisible !== false && snapshot.currentValues[f.key] != null;
      });
      if (fields.length === 0) return '';
      const rows = fields
        .map((f) => {
          const c = byKey.get(f.key);
          const value = formatForDocument(f.key, snapshot.currentValues[f.key] ?? null, c);
          return `<tr><th scope="row">${esc(f.documentLabel ?? f.label)}</th><td>${esc(value)}</td></tr>`;
        })
        .join('');
      return `<section class="grp"><h2>${esc(SECTION_LABEL[section])}</h2><table>${rows}</table></section>`;
    })
      .filter((s) => s !== '')
      .join('');

    return `<!-- interim template, not the client's official VOB template -->
<article class="page">
  <header class="brand">
    <div class="wordmark">US24 <span>Solutions</span></div>
    <div class="doc-title">Pre-Authorization and Benefits Determination</div>
  </header>
  ${watermark ? `<div class="watermark">${esc(watermark)}</div>` : ''}
  <div class="meta">
    <span>Case ${esc(caseId)}</span>
    <span>Revision ${esc(String(snapshot.revisionId ?? ''))}</span>
    <span>Generated ${new Date().toISOString().slice(0, 10)}</span>
  </div>
  ${sections}
  <footer class="disclaimer">
    Benefits quoted are not a guarantee of payment. Payment is subject to eligibility,
    plan provisions and the terms of the member's policy at the time services are rendered.
  </footer>
  <p class="interim-note">
    Rendered from the US24 interim layout. The client's official VOB template has not been
    supplied, so this document is not the approved final format.
  </p>
</article>`;
  }

  /** 13 §12 — the internal QA report, separate from the client-facing VOB. */
  private renderQaReport(
    caseId: string,
    snapshot: ReturnType<CaseService['snapshot']>,
    comparisons: readonly FieldComparison[],
    run: { rule_set_version: string; dictionary_version: string; case_status: string; created_at: string },
  ): string {
    const issues = comparisons.filter((c) => c.isVisible && c.severity !== 'NONE');
    const bypasses = this.repo.listBypasses(caseId);

    const issueRows = issues
      .map(
        (c) => `<tr>
        <td>${esc(FIELD_REGISTRY.find(c.fieldKey)?.label ?? c.fieldKey)}</td>
        <td>${esc(c.outcome)}</td>
        <td>${esc(c.severity)}</td>
        <td>${esc(String(c.formDisplay ?? c.formCanonical ?? '—'))}</td>
        <td>${esc(String(c.supportedDisplay ?? c.supportedCanonical ?? '—'))}</td>
        <td>${esc(c.message)}</td>
        <td>${esc(c.evidence?.excerpt ?? '—')}</td>
        <td>${esc(c.ruleCode)}</td>
      </tr>`,
      )
      .join('');

    const conflictRows = comparisons
      .filter((c) => c.competingCandidates.length > 1)
      .map(
        (c) => `<tr>
        <td>${esc(FIELD_REGISTRY.find(c.fieldKey)?.label ?? c.fieldKey)}</td>
        <td>${c.competingCandidates.map((x) => esc(x.rawValue)).join(' / ')}</td>
      </tr>`,
      )
      .join('');

    const bypassRows = bypasses
      .map(
        (b) => `<tr>
        <td>${esc(String(b['field_key']))}</td>
        <td>${esc(String(b['reason']))}</td>
        <td>${esc(String(b['note'] ?? '—'))}</td>
        <td>${esc(String(b['consequence']))}</td>
      </tr>`,
      )
      .join('');

    return `<article class="page qa">
  <header class="brand">
    <div class="wordmark">US24 <span>Solutions</span></div>
    <div class="doc-title">Internal QA report</div>
  </header>
  <div class="watermark">${esc(WATERMARK.QA_REPORT ?? '')}</div>
  <section class="grp">
    <h2>Result</h2>
    <table>
      <tr><th scope="row">Case</th><td>${esc(caseId)}</td></tr>
      <tr><th scope="row">Overall result</th><td>${esc(run.case_status)}</td></tr>
      <tr><th scope="row">Rule set version</th><td>${esc(run.rule_set_version)}</td></tr>
      <tr><th scope="row">Dictionary version</th><td>${esc(run.dictionary_version)}</td></tr>
      <tr><th scope="row">Original revision</th><td>${esc(String(snapshot.case['id']))}</td></tr>
      <tr><th scope="row">Current revision</th><td>${esc(String(snapshot.revisionId ?? ''))}</td></tr>
      <tr><th scope="row">Verified at</th><td>${esc(run.created_at)}</td></tr>
    </table>
  </section>
  <section class="grp">
    <h2>Issues (${issues.length})</h2>
    <table class="wide">
      <thead><tr><th>Field</th><th>State</th><th>Severity</th><th>Form value</th><th>Supported value</th><th>Explanation</th><th>Evidence</th><th>Rule</th></tr></thead>
      <tbody>${issueRows || '<tr><td colspan="8">No issues recorded.</td></tr>'}</tbody>
    </table>
  </section>
  <section class="grp">
    <h2>Conflicting candidates</h2>
    <table class="wide"><tbody>${conflictRows || '<tr><td>None.</td></tr>'}</tbody></table>
  </section>
  <section class="grp">
    <h2>Bypasses</h2>
    <table class="wide">
      <thead><tr><th>Field</th><th>Reason</th><th>Note</th><th>Consequence</th></tr></thead>
      <tbody>${bypassRows || '<tr><td colspan="4">None.</td></tr>'}</tbody>
    </table>
  </section>
</article>`;
  }
}

/** Money renders from integer cents; identifiers render verbatim (13 §15). */
function formatForDocument(
  fieldKey: string,
  raw: string | null,
  comparison: FieldComparison | undefined,
): string {
  if (raw === null || raw === '') return '—';
  const definition = FIELD_REGISTRY.find(fieldKey);
  if (definition?.normalization === 'MONEY' && typeof comparison?.formCanonical === 'number') {
    return formatCents(comparison.formCanonical);
  }
  return comparison?.formDisplay ?? raw;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitize(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) || 'case';
}

/**
 * 13 §13 / 02 §5: the supplied sample PDF ends with a page containing only the
 * logo. A page is counted only when it has real content, so an empty trailing
 * page can never be produced or reported.
 */
function countPages(html: string): number {
  const pages = html.match(/<article class="page/g)?.length ?? 0;
  const hasContent = /<section class="grp">/.test(html);
  return hasContent ? pages : 0;
}
