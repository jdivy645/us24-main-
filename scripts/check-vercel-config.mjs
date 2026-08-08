import { readFileSync } from 'node:fs';

/**
 * Validate vercel.json the way Vercel does: strict JSON, and only properties the
 * schema knows about. Vercel sets additionalProperties:false at every level, so
 * a stray key — including a "//" pseudo-comment — is a hard request rejection.
 */

const TOP_LEVEL = new Set([
  '$schema', 'buildCommand', 'installCommand', 'devCommand', 'ignoreCommand',
  'outputDirectory', 'framework', 'public', 'regions', 'functions', 'routes',
  'rewrites', 'redirects', 'headers', 'cleanUrls', 'trailingSlash', 'crons',
  'git', 'images', 'name', 'version',
]);

const REWRITE = new Set(['source', 'destination', 'has', 'missing', 'statusCode']);
const REDIRECT = new Set(['source', 'destination', 'permanent', 'statusCode', 'has', 'missing']);
const HEADER_RULE = new Set(['source', 'headers', 'has', 'missing']);
const HEADER_ENTRY = new Set(['key', 'value']);

const raw = readFileSync('vercel.json', 'utf8');

let config;
try {
  config = JSON.parse(raw);
} catch (error) {
  console.error('INVALID JSON:', error.message);
  process.exit(1);
}

const problems = [];

function checkKeys(obj, allowed, where) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) problems.push(`${where}: unknown property ${JSON.stringify(key)}`);
  }
}

checkKeys(config, TOP_LEVEL, 'root');

for (const [i, rule] of (config.rewrites ?? []).entries()) {
  checkKeys(rule, REWRITE, `rewrites[${i}]`);
}
for (const [i, rule] of (config.redirects ?? []).entries()) {
  checkKeys(rule, REDIRECT, `redirects[${i}]`);
}
for (const [i, rule] of (config.headers ?? []).entries()) {
  checkKeys(rule, HEADER_RULE, `headers[${i}]`);
  for (const [j, h] of (rule.headers ?? []).entries()) {
    checkKeys(h, HEADER_ENTRY, `headers[${i}].headers[${j}]`);
  }
}

// A comment key anywhere at any depth is the specific failure we just hit.
const commentKeys = [];
(function walk(node, path) {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === '//' || k.startsWith('//')) commentKeys.push(`${path}.${k}`);
      walk(v, `${path}.${k}`);
    }
  }
})(config, '');
for (const k of commentKeys) problems.push(`comment key present at ${k}`);

if (problems.length > 0) {
  console.error('FAIL');
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}

console.log('vercel.json is valid.');
console.log(`  buildCommand:    ${config.buildCommand}`);
console.log(`  outputDirectory: ${config.outputDirectory}`);
console.log(`  rewrites:        ${(config.rewrites ?? []).length}`);
console.log(`  header rules:    ${(config.headers ?? []).length}`);

const api = (config.rewrites ?? []).find((r) => r.source.startsWith('/v1'));
if (api && api.destination.includes('REPLACE-WITH-YOUR-API-HOST')) {
  console.log('\n  NOTE: the /v1 rewrite still points at the placeholder host.');
}
