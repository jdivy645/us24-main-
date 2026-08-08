/**
 * Production bundle for the API.
 *
 * `tsc` alone is not enough here. Workspace packages are consumed as TypeScript
 * SOURCE — `@us24/domain`'s `main` points at `src/index.ts` — which is exactly
 * what makes local development pleasant and what makes a plain `tsc` build
 * unrunnable: the emitted JavaScript still contains `from '@us24/domain'`, and
 * Node resolves that to a `.ts` file it cannot load.
 *
 * So the workspace packages are BUNDLED in, while real third-party dependencies
 * stay external and are installed from package.json at deploy time. That keeps
 * the artifact small, keeps native and conditional-export packages working, and
 * produces a single entry point that Node can execute directly.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Everything declared as a runtime dependency stays external EXCEPT the
// workspace packages, which have no published build output to resolve to.
const external = Object.keys(pkg.dependencies ?? {}).filter((name) => !name.startsWith('@us24/'));

const result = await build({
  entryPoints: [`${here}src/index.ts`],
  outfile: `${here}dist/index.js`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  // `node:sqlite` and friends are built into the runtime, never bundled.
  packages: undefined,
  banner: {
    // Bundled CJS dependencies expect `require` to exist in an ESM output file.
    js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);",
  },
  logLevel: 'info',
  metafile: true,
});

const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0);
console.log(`API bundled: ${(bytes / 1024).toFixed(0)} kB, ${external.length} external deps`);
