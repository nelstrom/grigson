#!/usr/bin/env node
/**
 * Generates CDN-backed TypeScript constant files alongside the embedded *-subset.ts files:
 *   packages/grigson/src/renderers/noto-sans-cdn.ts
 *   packages/grigson/src/renderers/noto-serif-cdn.ts
 *   packages/grigson/src/renderers/noto-symbols2-cdn.ts
 *   packages/grigson/src/renderers/bravura-cdn.ts
 *   packages/grigson/src/renderers/petaluma-script-cdn.ts
 *
 * Each file exports the same constant name as its *-subset.ts counterpart, but with a
 * jsDelivr CDN URL instead of a base64 data URI.  The version is read from
 * packages/grigson-fonts/package.json.
 *
 * Usage:
 *   node scripts/gen-cdn-constants.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const fontsPkgJson = JSON.parse(
  readFileSync(join(ROOT, 'packages/grigson-fonts/package.json'), 'utf8'),
);
const version = fontsPkgJson.version;
const BASE = `https://cdn.jsdelivr.net/gh/nelstrom/grigson@grigson-fonts-v${version}/packages/grigson-fonts/fonts`;

const FILES = [
  {
    file: 'NotoSans-subset.woff2',
    exportName: 'notoSansWoff2',
    outTs: join(ROOT, 'packages/grigson/src/renderers/noto-sans-cdn.ts'),
    regenerate: 'node scripts/gen-noto-subsets.mjs && node scripts/gen-cdn-constants.mjs',
  },
  {
    file: 'NotoSerif-subset.woff2',
    exportName: 'notoSerifWoff2',
    outTs: join(ROOT, 'packages/grigson/src/renderers/noto-serif-cdn.ts'),
    regenerate: 'node scripts/gen-noto-subsets.mjs && node scripts/gen-cdn-constants.mjs',
  },
  {
    file: 'NotoSansSymbols2-subset.woff2',
    exportName: 'notoSymbols2Woff2',
    outTs: join(ROOT, 'packages/grigson/src/renderers/noto-symbols2-cdn.ts'),
    regenerate: 'node scripts/gen-noto-subsets.mjs && node scripts/gen-cdn-constants.mjs',
  },
  {
    file: 'Bravura-subset.woff2',
    exportName: 'bravuraWoff2',
    outTs: join(ROOT, 'packages/grigson/src/renderers/bravura-cdn.ts'),
    regenerate: 'node scripts/gen-bravura-subset.mjs && node scripts/gen-cdn-constants.mjs',
  },
  {
    file: 'PetalumaScript-subset.woff2',
    exportName: 'petalumaScriptWoff2',
    outTs: join(ROOT, 'packages/grigson/src/renderers/petaluma-script-cdn.ts'),
    regenerate: 'node scripts/gen-jazz-subsets.mjs && node scripts/gen-cdn-constants.mjs',
  },
];

for (const { file, exportName, outTs, regenerate } of FILES) {
  const url = `${BASE}/${file}`;
  const ts = `\
// Auto-generated — do not edit manually.
// To regenerate: ${regenerate}
//
// CDN build: fonts loaded from jsDelivr at grigson-fonts v${version}
export const ${exportName} = '${url}';
`;

  mkdirSync(dirname(outTs), { recursive: true });
  writeFileSync(outTs, ts, 'utf8');
  console.log(`Written → ${outTs}`);
}

console.log(`\nCDN base URL: ${BASE}`);
console.log('Done.');
