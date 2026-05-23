#!/usr/bin/env node
/**
 * Encode Grigson source into a website URL hash (and optionally a full URL).
 *
 * Usage:
 *   echo "| Cmaj7 |" | ./scripts/grigson-url.mjs
 *   cat my-chart.grigson | ./scripts/grigson-url.mjs --page sheet --renderer grille-harmonique
 *   ./scripts/grigson-url.mjs --page playground my-chart.grigson
 *
 * Options:
 *   --page <name>       sheet | playground | ast   (omit to output just the hash fragment)
 *   --renderer <name>   grille-harmonique | html | text   (requires --page)
 *   --bars <n>          bars per line for grille-harmonique
 *   --host <url>        base host (default: http://localhost:8080)
 *
 * Output:
 *   With no --page:   #code/<compressed>
 *   With --page:      full URL including ?renderer-config= and #code=
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { compressToEncodedURIComponent } = require(
  resolve(__dirname, '../packages/website/node_modules/lz-string'),
);

// ── Argument parsing ──────────────────────────────────────────────────────────

const PAGE_PATHS = {
  sheet: '/sheet/',
  playground: '/tooling/playground/',
  ast: '/tooling/ast-explorer/',
};

const args = process.argv.slice(2);
let page = null;
let renderer = null;
let barsPerLine = null;
let host = 'http://localhost:8080';
let inputFile = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--page') { page = args[++i]; }
  else if (a === '--renderer') { renderer = args[++i]; }
  else if (a === '--bars') { barsPerLine = parseInt(args[++i], 10); }
  else if (a === '--host') { host = args[++i]; }
  else if (!a.startsWith('-')) { inputFile = a; }
  else { console.error(`Unknown option: ${a}`); process.exit(1); }
}

if (page && !PAGE_PATHS[page]) {
  console.error(`Unknown page "${page}". Valid pages: ${Object.keys(PAGE_PATHS).join(', ')}`);
  process.exit(1);
}

// ── Read source ───────────────────────────────────────────────────────────────

let source;
if (inputFile) {
  source = readFileSync(inputFile, 'utf8');
} else if (!process.stdin.isTTY) {
  source = readFileSync('/dev/stdin', 'utf8');
} else {
  console.error('No input. Pipe Grigson source to stdin or pass a filename.');
  process.exit(1);
}

// ── Encode ────────────────────────────────────────────────────────────────────

const hash = '#code/' + compressToEncodedURIComponent(source);

if (!page) {
  process.stdout.write(hash + '\n');
  process.exit(0);
}

// ── Build full URL ────────────────────────────────────────────────────────────

const pagePath = PAGE_PATHS[page];
let query = '';
if (renderer) {
  const config = { name: renderer };
  if (barsPerLine) config.barsPerLine = barsPerLine;
  query = '?renderer-config=' + encodeURIComponent(JSON.stringify(config));
}

process.stdout.write(host + pagePath + query + hash + '\n');
