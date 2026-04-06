#!/usr/bin/env node
/**
 * Generates jazz/Real Book-style font subset TypeScript files for the HTML renderer:
 *   packages/grigson/src/renderers/petaluma-script-subset.ts
 *
 * Font source files are cached in scripts/fonts/ and downloaded on first run.
 * OFL licence files are saved alongside each font where available.
 *
 * Prerequisites:
 *   pip install fonttools brotli
 *
 * Usage:
 *   node scripts/gen-jazz-subsets.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONTS_DIR = join(__dirname, 'fonts');

const FONTS = [
  {
    cacheName: 'PetalumaScript.otf',
    oflCacheName: 'PetalumaScript-OFL.txt',
    fontUrl:
      'https://raw.githubusercontent.com/steinbergmedia/petaluma/master/redist/otf/PetalumaScript.otf',
    oflUrl: 'https://raw.githubusercontent.com/steinbergmedia/petaluma/master/OFL.txt',
    // Latin-1 covers all chord text and quality symbols (ø at U+00F8).
    // PetalumaScript also has ♭♯ at standard Unicode positions, so no Bravura fallback needed.
    unicodes: 'U+0000-00FF,U+266D,U+266F',
    outTs: join(ROOT, 'packages/grigson/src/renderers/petaluma-script-subset.ts'),
    exportName: 'petalumaScriptWoff2',
    credit:
      'PetalumaScript, © Steinberg Media Technologies GmbH, licensed under the SIL Open Font License 1.1.',
  },
];

mkdirSync(FONTS_DIR, { recursive: true });
const tmp = tmpdir();

for (const font of FONTS) {
  console.log(`\n── ${font.cacheName} ──`);

  const cachedFont = join(FONTS_DIR, font.cacheName);
  const cachedOfl = join(FONTS_DIR, font.oflCacheName);
  const tmpFont = join(tmp, font.cacheName);
  const tmpWoff2 = join(tmp, font.cacheName.replace(/\.(ttf|otf)$/, '.woff2'));

  // Download font if not cached.
  if (existsSync(cachedFont)) {
    console.log(`  Using cached ${font.cacheName}`);
    writeFileSync(tmpFont, readFileSync(cachedFont));
  } else {
    console.log(`  Downloading ${font.fontUrl}…`);
    const res = await fetch(font.fontUrl);
    if (!res.ok)
      throw new Error(`Failed to download ${font.cacheName}: ${res.status} ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(tmpFont, buf);
    writeFileSync(cachedFont, buf);
    console.log(`  → cached to ${cachedFont}`);
  }
  console.log(`  Font: ${(readFileSync(tmpFont).length / 1024).toFixed(0)} KB`);

  // Download OFL if not cached and a URL is provided.
  if (font.oflUrl && !existsSync(cachedOfl)) {
    console.log(`  Downloading OFL.txt…`);
    const res = await fetch(font.oflUrl);
    if (res.ok) writeFileSync(cachedOfl, await res.text(), 'utf8');
  }

  // Subset with pyftsubset.
  console.log(`  Subsetting unicodes: ${font.unicodes}…`);
  execSync(
    `pyftsubset "${tmpFont}" --unicodes="${font.unicodes}" --flavor=woff2 --output-file="${tmpWoff2}"`,
    { stdio: 'inherit' },
  );
  const woff2 = readFileSync(tmpWoff2);
  console.log(`  Subset WOFF2: ${(woff2.length / 1024).toFixed(1)} KB`);

  const b64 = woff2.toString('base64');
  const dataUri = `data:font/woff2;base64,${b64}`;

  const ts = `\
// Auto-generated — do not edit manually.
// To regenerate: node scripts/gen-jazz-subsets.mjs
//
// ${font.credit}
// Unicodes: ${font.unicodes}
export const ${font.exportName} = '${dataUri}';
`;

  writeFileSync(font.outTs, ts, 'utf8');
  console.log(`  Written → ${font.outTs} (${(ts.length / 1024).toFixed(1)} KB)`);
}

console.log('\nDone.');
