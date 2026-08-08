/**
 * @us24/testing — golden fixtures, expectations and factories.
 *
 * 15 §2 lists "Test factories generate valid, missing, conflicting, and boundary
 * values from registry metadata" (06 §20) as a first-class requirement, so the
 * factories here read the registry rather than hard-coding field lists.
 */

export * from './fixtures/carsten-cigna-ash.js';
export * from './loader.js';
export * from './expectations.js';
export * from './factories.js';
