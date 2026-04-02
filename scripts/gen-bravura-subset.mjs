#!/usr/bin/env node
/**
 * Generates packages/grigson/src/renderers/bravura-subset.ts
 *
 * Downloads Bravura from GitHub, subsets it to the glyphs used by the HTML
 * renderer, and emits a TypeScript constant containing the base64 data URI.
 *
 * Prerequisites:
 *   pip install fonttools brotli
 *
 * Usage:
 *   node scripts/gen-bravura-subset.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_TS = join(ROOT, 'packages/grigson/src/renderers/bravura-subset.ts');

const BRAVURA_URL =
  'https://github.com/steinbergmedia/bravura/raw/master/redist/otf/Bravura.otf';

// SMuFL glyphs to include:
//   U+E080-E089  time signature digits 0-9
//   U+E08A       common time (C)
//   U+E08B       cut time
//   U+E1E7       repeat1Bar (single-bar simile mark)
//   U+E1E8       repeat2Bars (two-bar simile, reserved for future use)
const UNICODES = 'U+E080-E08B,U+E1E7,U+E1E8';

const tmp = tmpdir();
const otfPath = join(tmp, 'Bravura.otf');
const woff2Path = join(tmp, 'bravura-subset.woff2');

console.log('Downloading Bravura.otf…');
const res = await fetch(BRAVURA_URL);
if (!res.ok) throw new Error(`Failed to download Bravura: ${res.status} ${res.statusText}`);
writeFileSync(otfPath, Buffer.from(await res.arrayBuffer()));
console.log(`  → ${otfPath} (${(readFileSync(otfPath).length / 1024).toFixed(0)} KB)`);

console.log('Subsetting with pyftsubset…');
execSync(
  `pyftsubset "${otfPath}" --unicodes="${UNICODES}" --flavor=woff2 --output-file="${woff2Path}"`,
  { stdio: 'inherit' },
);
const woff2 = readFileSync(woff2Path);
console.log(`  → ${woff2Path} (${(woff2.length / 1024).toFixed(1)} KB)`);

const b64 = woff2.toString('base64');
const dataUri = `data:font/woff2;base64,${b64}`;

const ts = `\
// Auto-generated — do not edit manually.
// To regenerate: node scripts/gen-bravura-subset.mjs
//
// Contains a subset of Bravura (https://github.com/steinbergmedia/bravura),
// © Steinberg Media Technologies GmbH, licensed under the SIL Open Font License 1.1.
// Glyphs included: SMuFL time-signature digits (U+E080–E08B) and simile marks (U+E1E7–E1E8).
export const bravuraWoff2 = '${dataUri}';
`;

mkdirSync(dirname(OUT_TS), { recursive: true });
writeFileSync(OUT_TS, ts, 'utf8');
console.log(`Written → ${OUT_TS} (${(ts.length / 1024).toFixed(1)} KB)`);
