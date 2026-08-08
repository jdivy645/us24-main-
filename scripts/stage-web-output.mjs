/**
 * Copy the built frontend to a `dist/` directory at the repository root.
 *
 * Vercel's Root Directory for this project is the repository root — apps/web
 * aliases into ../../packages/*, so it cannot be scoped narrower — and its
 * default Output Directory is `dist` relative to that root. A dashboard Output
 * Directory field, once set, also overrides vercel.json.
 *
 * Rather than depend on those two agreeing, the build stages its output where
 * Vercel looks by default. Vite keeps emitting to apps/web/dist so `vite
 * preview` and local tooling behave normally; this only adds a copy.
 *
 * Both paths are gitignored.
 */

import { cpSync, existsSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../apps/web/dist', import.meta.url));
const target = fileURLToPath(new URL('../dist', import.meta.url));

if (!existsSync(source)) {
  console.error(`No build output at ${source}. Run \`pnpm --filter @us24/web build\` first.`);
  process.exit(1);
}

if (!existsSync(`${source}/index.html`)) {
  console.error(`${source} exists but has no index.html — the build did not complete.`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

// Fail loudly rather than handing Vercel a directory it will reject.
if (!existsSync(`${target}/index.html`) || !statSync(`${target}/index.html`).size) {
  console.error(`Staging produced no usable index.html at ${target}.`);
  process.exit(1);
}

console.log(`Staged frontend to ./dist for deployment (from apps/web/dist).`);
