/**
 * Provider adapters — 12 §11.
 *
 *   "Define a stable transcription adapter. Define a structured extraction
 *    adapter... Keep provider-specific request fields inside adapters...
 *    Allow test doubles and local fixtures. Support provider replacement without
 *    rewriting field rules."
 *
 * ============================================================================
 * DEFERRAL — DECISION_LOG_ADDENDUM.md ADR-014.
 *
 * The transcription and extraction adapters below are FIXTURE-BACKED DOUBLES.
 * No provider is called. 12 §12 is explicit: "Do not send data before the client
 * approves contractual, privacy, and security requirements", and 17 §18 lists
 * "Cloud, AI, transcription, and RingCentral vendor approvals" as pending.
 *
 * The interfaces are the real seam. A production adapter implements the same
 * contract; the orchestrator, comparison engine and rule matrix are unchanged.
 * ============================================================================
 */

import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ExtractedCandidate } from '@us24/domain';
import { extractedCandidateSchema } from '@us24/schemas';

// ---------------------------------------------------------------------------
// Storage — 12 §11 "Define an object-storage adapter"
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  put(key: string, bytes: Buffer): Promise<{ key: string; checksum: string; size: number }>;
  get(key: string): Promise<Buffer>;
  /** 13 §18: short-lived signed downloads, never a permanent public URL. */
  signedUrl(key: string, ttlSeconds: number): Promise<{ url: string; expiresAt: string }>;
}

/**
 * Local private-disk storage. Stands in for private S3-compatible storage
 * (12 §1). The directory is gitignored; nothing is served statically.
 */
export class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    // Reject traversal before touching the filesystem — 15 §20 "Path traversal filename".
    if (key.includes('..') || key.startsWith('/') || /[<>:"|?*]/.test(key)) {
      throw new Error('Invalid storage key');
    }
    return join(this.root, key);
  }

  async put(key: string, bytes: Buffer): Promise<{ key: string; checksum: string; size: number }> {
    const path = this.resolve(key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
    return {
      key,
      checksum: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.byteLength,
    };
  }

  async get(key: string): Promise<Buffer> {
    return readFileSync(this.resolve(key));
  }

  async signedUrl(key: string, ttlSeconds: number): Promise<{ url: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    // A real adapter signs an object URL. Locally the API streams the bytes
    // itself, so the "signature" is an opaque short-lived token.
    const token = createHash('sha256').update(`${key}:${expiresAt}`).digest('hex').slice(0, 32);
    return { url: `/v1/documents/download?token=${token}`, expiresAt };
  }
}

// ---------------------------------------------------------------------------
// Transcription — 12 §11, §12
// ---------------------------------------------------------------------------

export interface TranscriptSegmentDto {
  ordinal: number;
  speakerRole: 'PAYER_REPRESENTATIVE' | 'PAYER_SUPERVISOR' | 'CALLER' | 'IVR' | 'UNKNOWN';
  rawSpeakerLabel: string | null;
  timestampStart: number | null;
  timestampEnd: number | null;
  text: string;
  /** 08 §1: the relevance layer classifies target vs non-target segments. */
  relevant: boolean;
}

export interface TranscriptionAdapter {
  readonly name: string;
  readonly modelVersion: string;
  /** True only when a client-approved provider is configured. */
  readonly available: boolean;
  transcribe(input: { artifactId: string; bytes: Buffer }): Promise<TranscriptSegmentDto[]>;
}

/**
 * Audio transcription is Phase 4 and is not implemented — no approved provider,
 * no BAA, no key. Attempting it throws rather than silently producing an empty
 * transcript, which would look like a successful call with nothing said.
 */
export class UnavailableTranscriptionAdapter implements TranscriptionAdapter {
  readonly name = 'none';
  readonly modelVersion = 'n/a';
  readonly available = false;

  async transcribe(): Promise<TranscriptSegmentDto[]> {
    throw new Error(
      'Audio transcription is not enabled. Phase 4 requires an approved transcription provider (12 §12, 17 §18). Upload a text transcript instead.',
    );
  }
}

/** Parses an already-textual transcript into speaker-tagged segments. */
export class TextTranscriptParser {
  /**
   * Recognises `[mm:ss] SPEAKER: text` and `SPEAKER: text`, and falls back to
   * one segment per non-empty line. 11 §11: source text is rendered as text,
   * never HTML, so nothing here interprets markup.
   */
  parse(text: string): TranscriptSegmentDto[] {
    const lines = text.split(/\r?\n/);
    const segments: TranscriptSegmentDto[] = [];
    let ordinal = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      const withTime = trimmed.match(/^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*([A-Za-z0-9 ._-]{1,40}):\s*(.*)$/);
      const withoutTime = trimmed.match(/^([A-Za-z0-9 ._-]{1,40}):\s*(.*)$/);

      let seconds: number | null = null;
      let speakerLabel: string | null = null;
      let body = trimmed;

      if (withTime) {
        const [, a, b, c, label, rest] = withTime;
        seconds = c
          ? Number(a) * 3600 + Number(b) * 60 + Number(c)
          : Number(a) * 60 + Number(b);
        speakerLabel = (label ?? '').trim();
        body = rest ?? '';
      } else if (withoutTime) {
        speakerLabel = (withoutTime[1] ?? '').trim();
        body = withoutTime[2] ?? '';
      }

      const speakerRole = classifySpeaker(speakerLabel, body);
      segments.push({
        ordinal: ordinal++,
        speakerRole,
        rawSpeakerLabel: speakerLabel,
        timestampStart: seconds,
        timestampEnd: null,
        text: body,
        relevant: isRelevant(body, speakerRole),
      });
    }
    return segments;
  }
}

/**
 * Speaker-role classification — 08 §1, 02 §6.
 *
 * The supplied transcript is known to reuse one label ("ASH") for both the IVR
 * and the live representative, so the text itself is inspected, not just the tag.
 */
function classifySpeaker(label: string | null, text: string): TranscriptSegmentDto['speakerRole'] {
  const l = (label ?? '').toLowerCase();
  const t = text.toLowerCase();

  if (/press \d|main menu|please hold|your call may be recorded|for eligibility/.test(t)) return 'IVR';
  if (/^(ivr|system|automated|recording)/.test(l)) return 'IVR';
  if (/^(us24|caller|provider|agent|me)\b/.test(l)) return 'CALLER';
  if (/supervisor/.test(l)) return 'PAYER_SUPERVISOR';
  if (l === '') return 'UNKNOWN';
  return 'PAYER_REPRESENTATIVE';
}

/**
 * 00 §4: "Remove irrelevant talk from extraction context while retaining the
 * original transcript and timestamps for audit evidence." Irrelevant segments
 * are flagged, never deleted — 11 §11 keeps them visible at reduced emphasis,
 * and the segment text stays byte-for-byte as transcribed.
 *
 * IVR content is non-target as a class. 02 §6 notes the supplied transcript
 * opens with "IVR eligibility menus, legal notices, survey prompts, and
 * connection messages", and 08 §4 treats recorded menus as weak evidence, so
 * routing them out of extraction context is the point — not a judgement about
 * any individual sentence.
 */
function isRelevant(text: string, speakerRole: TranscriptSegmentDto['speakerRole']): boolean {
  if (speakerRole === 'IVR') return false;
  const t = text.toLowerCase().trim();
  if (t.length < 3) return false;
  return !/^(please hold|thank you for holding|one moment|how is the weather|have a nice day)/.test(
    t,
  );
}

// ---------------------------------------------------------------------------
// Extraction — 12 §11, ADR-005
// ---------------------------------------------------------------------------

export interface ExtractionAdapter {
  readonly name: string;
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly available: boolean;
  extract(input: {
    caseId: string;
    segments: readonly TranscriptSegmentDto[];
  }): Promise<readonly ExtractedCandidate[]>;
}

/**
 * Fixture-backed extraction double.
 *
 * Returns the golden fixture's candidates for the demo case and nothing
 * otherwise. Critically, output is validated against `extractedCandidateSchema`
 * before it is returned — the same gate a real provider will pass through
 * (08 §21 "Validate model output before persistence").
 */
export class FixtureExtractionAdapter implements ExtractionAdapter {
  readonly name = 'fixture';
  readonly modelVersion = 'none';
  readonly promptVersion = 'fixture-v1';
  readonly available = true;

  constructor(private readonly candidates: readonly ExtractedCandidate[]) {}

  async extract(): Promise<readonly ExtractedCandidate[]> {
    const validated: ExtractedCandidate[] = [];
    for (const candidate of this.candidates) {
      const parsed = extractedCandidateSchema.safeParse(candidate);
      if (!parsed.success) {
        // A malformed candidate is dropped, not coerced. 08 §2 forbids
        // "a guessed value merely to satisfy the schema".
        continue;
      }
      validated.push(candidate);
    }
    return validated;
  }
}

/**
 * Keyword-free empty extractor for cases with no approved provider.
 *
 * 02 §12 and 00 §4 both forbid keyword-only extraction, so this returns nothing
 * rather than scraping numbers out of text. An empty result surfaces every form
 * value as unsupported and needing review, which is the correct, safe outcome.
 */
export class NoProviderExtractionAdapter implements ExtractionAdapter {
  readonly name = 'none';
  readonly modelVersion = 'n/a';
  readonly promptVersion = 'n/a';
  readonly available = false;

  async extract(): Promise<readonly ExtractedCandidate[]> {
    return [];
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
