#!/usr/bin/env node
/**
 * Generates Noto font subset TypeScript files for the HTML renderer:
 *   packages/grigson/src/renderers/noto-sans-subset.ts
 *   packages/grigson/src/renderers/noto-serif-subset.ts
 *   packages/grigson/src/renderers/noto-symbols2-subset.ts
 *
 * Font source files are cached in scripts/fonts/ and downloaded from Google
 * Fonts' GitHub repository if not already present.  OFL licence files are
 * saved alongside each font.
 *
 * Prerequisites:
 *   pip install fonttools brotli
 *
 * Usage:
 *   node scripts/gen-noto-subsets.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONTS_DIR = join(__dirname, 'fonts');
const FONTS_PKG_DIR = join(ROOT, 'packages/grigson-fonts/fonts');

const FONTS = [
  {
    cacheName: 'NotoSans-Variable.ttf',
    oflCacheName: 'NotoSans-OFL.txt',
    ttfUrl:
      'https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf',
    oflUrl: 'https://github.com/google/fonts/raw/main/ofl/notosans/OFL.txt',
    // Latin-1 Supplement: covers all Western European characters for song
    // titles and chord quality text.
    unicodes: 'U+0000-00FF',
    outTs: join(ROOT, 'packages/grigson/src/renderers/noto-sans-subset.ts'),
    pkgWoff2Name: 'NotoSans-subset.woff2',
    exportName: 'notoSansWoff2',
    credit: 'Noto Sans, © Google LLC, licensed under the SIL Open Font License 1.1.',
  },
  {
    cacheName: 'NotoSerif-Variable.ttf',
    oflCacheName: 'NotoSerif-OFL.txt',
    ttfUrl:
      'https://github.com/google/fonts/raw/main/ofl/notoserif/NotoSerif%5Bwdth%2Cwght%5D.ttf',
    oflUrl: 'https://github.com/google/fonts/raw/main/ofl/notoserif/OFL.txt',
    unicodes: 'U+0000-00FF',
    outTs: join(ROOT, 'packages/grigson/src/renderers/noto-serif-subset.ts'),
    pkgWoff2Name: 'NotoSerif-subset.woff2',
    exportName: 'notoSerifWoff2',
    credit: 'Noto Serif, © Google LLC, licensed under the SIL Open Font License 1.1.',
  },
  {
    cacheName: 'NotoSansSymbols2-Regular.ttf',
    oflCacheName: 'NotoSansSymbols2-OFL.txt',
    ttfUrl:
      'https://github.com/google/fonts/raw/main/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf',
    oflUrl:
      'https://github.com/google/fonts/raw/main/ofl/notosanssymbols2/OFL.txt',
    // U+25B3 = △ WHITE UP-POINTING TRIANGLE (used for major-7 chords).
    // Shared between sans and serif variants — geometric shapes are
    // typeface-agnostic.
    unicodes: 'U+25B3',
    outTs: join(ROOT, 'packages/grigson/src/renderers/noto-symbols2-subset.ts'),
    pkgWoff2Name: 'NotoSansSymbols2-subset.woff2',
    exportName: 'notoSymbols2Woff2',
    credit: 'Noto Sans Symbols 2, © Google LLC, licensed under the SIL Open Font License 1.1.',
  },
];

mkdirSync(FONTS_DIR, { recursive: true });
const tmp = tmpdir();

for (const font of FONTS) {
  console.log(`\n── ${font.cacheName} ──`);

  const cachedTtf = join(FONTS_DIR, font.cacheName);
  const cachedOfl = join(FONTS_DIR, font.oflCacheName);
  const tmpTtf = join(tmp, font.cacheName);
  const tmpWoff2 = join(tmp, font.cacheName.replace(/\.ttf$/, '.woff2'));
  const pkgWoff2 = join(FONTS_PKG_DIR, font.pkgWoff2Name);

  // Download TTF if not cached.
  if (existsSync(cachedTtf)) {
    console.log(`  Using cached ${font.cacheName}`);
    writeFileSync(tmpTtf, readFileSync(cachedTtf));
  } else {
    console.log(`  Downloading ${font.ttfUrl}…`);
    const res = await fetch(font.ttfUrl);
    if (!res.ok)
      throw new Error(`Failed to download ${font.cacheName}: ${res.status} ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(tmpTtf, buf);
    writeFileSync(cachedTtf, buf);
    console.log(`  → cached to ${cachedTtf}`);
  }
  console.log(`  TTF: ${(readFileSync(tmpTtf).length / 1024).toFixed(0)} KB`);

  // Download OFL if not cached.
  if (!existsSync(cachedOfl)) {
    console.log(`  Downloading OFL.txt…`);
    const res = await fetch(font.oflUrl);
    if (res.ok) writeFileSync(cachedOfl, await res.text(), 'utf8');
  }

  // Subset with pyftsubset.
  console.log(`  Subsetting unicodes: ${font.unicodes}…`);
  execSync(
    `pyftsubset "${tmpTtf}" --unicodes="${font.unicodes}" --flavor=woff2 --output-file="${tmpWoff2}"`,
    { stdio: 'inherit' },
  );
  const woff2 = readFileSync(tmpWoff2);
  console.log(`  Subset WOFF2: ${(woff2.length / 1024).toFixed(1)} KB`);

  const b64 = woff2.toString('base64');
  const dataUri = `data:font/woff2;base64,${b64}`;

  const ts = `\
// Auto-generated — do not edit manually.
// To regenerate: node scripts/gen-noto-subsets.mjs
//
// ${font.credit}
// Unicodes: ${font.unicodes}
export const ${font.exportName} = '${dataUri}';
`;

  writeFileSync(font.outTs, ts, 'utf8');
  execSync(`oxfmt --config ${join(ROOT, '.oxfmtrc.json')} "${font.outTs}"`);
  console.log(`  Written → ${font.outTs} (${(ts.length / 1024).toFixed(1)} KB)`);

  mkdirSync(FONTS_PKG_DIR, { recursive: true });
  writeFileSync(pkgWoff2, woff2);
  console.log(`  Written → ${pkgWoff2} (${(woff2.length / 1024).toFixed(1)} KB)`);
}

console.log('\nDone.');
