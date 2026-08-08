/**
 * Golden-fixture loader.
 *
 * 15 §8: "Keep an immutable copy of the fixture" and "Do not manually clean the
 * transcript before the test."
 *
 * The indirection here is the swap point. Today `reconstructedLoader` serves the
 * fixture rebuilt from spec-stated values. When the client supplies
 * `CARSTEN UHC (AARA) (2).txt` and `VOB_CARSTEN_ACT_CIGNA ASH_08.04.26 (2).pdf`,
 * add a loader that parses them and register it below. Tests assert OUTCOMES, not
 * fixture internals, so they carry over unchanged.
 */

import type { ExtractedCandidate } from '@us24/domain';
import {
  ALL_CANDIDATES,
  COMPLETED_FORM_ARTIFACT,
  COMPLETED_FORM_VALUES,
  TRANSCRIPT_ARTIFACT,
  TRANSCRIPT_CANDIDATES,
} from './fixtures/carsten-cigna-ash.js';

export interface GoldenFixture {
  readonly id: string;
  readonly description: string;
  /** RECONSTRUCTED when rebuilt from the specs; CLIENT_SUPPLIED when parsed from real files. */
  readonly provenance: 'RECONSTRUCTED' | 'CLIENT_SUPPLIED';
  readonly transcriptArtifact: { readonly id: string; readonly label: string };
  readonly completedFormArtifact: { readonly id: string; readonly label: string };
  readonly formValues: Readonly<Record<string, string | null>>;
  readonly candidatesByField: Readonly<Record<string, readonly ExtractedCandidate[]>>;
  readonly allCandidates: readonly ExtractedCandidate[];
}

export interface GoldenFixtureLoader {
  readonly id: string;
  load(): GoldenFixture;
}

const reconstructedLoader: GoldenFixtureLoader = {
  id: 'carsten-cigna-ash',
  load: () => ({
    id: 'carsten-cigna-ash',
    description:
      'Cigna ASH outpatient physical-therapy verification. Reconstructed from 02 §5, 02 §9, 15 §9–§11 because the client source files were not supplied with the specification package.',
    provenance: 'RECONSTRUCTED',
    transcriptArtifact: TRANSCRIPT_ARTIFACT,
    completedFormArtifact: COMPLETED_FORM_ARTIFACT,
    // Frozen so no test can mutate the shared fixture — 15 §8 immutability.
    formValues: Object.freeze({ ...COMPLETED_FORM_VALUES }),
    candidatesByField: TRANSCRIPT_CANDIDATES,
    allCandidates: ALL_CANDIDATES,
  }),
};

let activeLoader: GoldenFixtureLoader = reconstructedLoader;

/** Register a loader backed by the real client files once they are available. */
export function registerGoldenFixtureLoader(loader: GoldenFixtureLoader): void {
  activeLoader = loader;
}

export function loadGoldenFixture(): GoldenFixture {
  return activeLoader.load();
}
