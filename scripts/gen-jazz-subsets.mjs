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
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONTS_DIR = join(__dirname, 'fonts');
const FONTS_PKG_DIR = join(ROOT, 'packages/grigson-fonts/fonts');

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
    pkgWoff2Name: 'PetalumaScript-subset.woff2',
    exportName: 'petalumaScriptWoff2',
    credit:
      'PetalumaScript, © Steinberg Media Technologies GmbH, licensed under the SIL Open Font License 1.1.',
  },
  {
    cacheName: 'GrigsonJazz.otf',
    // Generated locally by scripts/reencode-finale-jazz.mjs — no download URL.
    fontUrl: null,
    oflUrl: null,
    // Latin-1 covers chord text and quality symbols (° U+00B0, ø U+00F8).
    // ♭♯ and △ are now available at standard Unicode positions via re-encoding.
    unicodes: 'U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7,U+E030,U+E040-E042,U+E500-E501',
    outTs: join(ROOT, 'packages/grigson/src/renderers/grigson-jazz-subset.ts'),
    pkgWoff2Name: 'GrigsonJazz-subset.woff2',
    exportName: 'grigsonJazzWoff2',
    credit:
      'GrigsonJazz, derived from FinaleJazz by MakeMusic Inc., licensed under the SIL Open Font License 1.1.',
  },
  {
    cacheName: 'Petaluma.otf',
    oflCacheName: null,
    // Locally cached — download only if missing.
    fontUrl: 'https://github.com/steinbergmedia/petaluma/raw/master/redist/otf/Petaluma.otf',
    oflUrl: null,
    // Math Bold digits, simile marks, and barline/repeat glyphs for GrigsonCursive typeface.
    unicodes: 'U+1D7CE-1D7D7,U+E030-E033,U+E040-E042,U+E500-E501',
    outTs: join(ROOT, 'packages/grigson/src/renderers/grigson-petaluma-notation-subset.ts'),
    pkgWoff2Name: 'GrigsonPetaluma-notation-subset.woff2',
    exportName: 'grigsonPetalumaNotationWoff2',
    credit:
      'GrigsonPetaluma-notation, derived from Petaluma by Steinberg Media Technologies GmbH, licensed under the SIL Open Font License 1.1.',
    // Petaluma has time-sig glyphs at U+E080–E089 (SMuFL PUA). Add cmap aliases
    // at U+1D7CE–1D7D7 (Math Bold) so pyftsubset can find them.
    preprocessPy: `\
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

font = TTFont(__INPUT__)
non_bmp = {}
for i in range(10):
    for table in font['cmap'].tables:
        gname = table.cmap.get(0xE080 + i)
        if gname:
            non_bmp[0x1D7CE + i] = gname
            break

for table in font['cmap'].tables:
    if table.format in (12, 13):
        table.cmap.update(non_bmp)

if non_bmp and not any(t.format == 12 for t in font['cmap'].tables):
    fmt12 = CmapSubtable.newSubtable(12)
    fmt12.platformID = 3
    fmt12.platEncID  = 10
    fmt12.language   = 0
    existing = {}
    for t in font['cmap'].tables:
        if t.platformID in (0, 3):
            existing.update(t.cmap)
    existing.update(non_bmp)
    fmt12.cmap = existing
    font['cmap'].tables.append(fmt12)

font.save(__OUTPUT__)
print('Preprocessed Petaluma saved to', __OUTPUT__)
`,
  },
];

mkdirSync(FONTS_DIR, { recursive: true });
const tmp = tmpdir();

for (const font of FONTS) {
  console.log(`\n── ${font.cacheName} ──`);

  const cachedFont = join(FONTS_DIR, font.cacheName);
  const cachedOfl = font.oflCacheName ? join(FONTS_DIR, font.oflCacheName) : null;
  const tmpFont = join(tmp, font.cacheName);
  const tmpWoff2 = join(tmp, font.cacheName.replace(/\.(ttf|otf)$/, '.woff2'));
  const pkgWoff2 = join(FONTS_PKG_DIR, font.pkgWoff2Name);

  // Load font — either from cache, by downloading, or from a local-only file.
  if (existsSync(cachedFont)) {
    console.log(`  Using cached ${font.cacheName}`);
    writeFileSync(tmpFont, readFileSync(cachedFont));
  } else if (font.fontUrl) {
    console.log(`  Downloading ${font.fontUrl}…`);
    const res = await fetch(font.fontUrl);
    if (!res.ok)
      throw new Error(`Failed to download ${font.cacheName}: ${res.status} ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(tmpFont, buf);
    writeFileSync(cachedFont, buf);
    console.log(`  → cached to ${cachedFont}`);
  } else {
    throw new Error(
      `${font.cacheName} not found in ${FONTS_DIR}. Run: node scripts/reencode-finale-jazz.mjs`,
    );
  }
  console.log(`  Font: ${(readFileSync(tmpFont).length / 1024).toFixed(0)} KB`);

  // Download OFL if not cached and a URL is provided.
  if (font.oflUrl && cachedOfl && !existsSync(cachedOfl)) {
    console.log(`  Downloading OFL.txt…`);
    const res = await fetch(font.oflUrl);
    if (res.ok) writeFileSync(cachedOfl, await res.text(), 'utf8');
  }

  // Optional Python preprocessing step (e.g. adding cmap aliases).
  let fontToSubset = tmpFont;
  if (font.preprocessPy) {
    const preprocessedFont = join(tmp, `preprocessed-${font.cacheName}`);
    const tmpPy = join(tmp, `preprocess-${font.cacheName}.py`);
    const pyContent = font.preprocessPy
      .replaceAll('__INPUT__', JSON.stringify(tmpFont))
      .replaceAll('__OUTPUT__', JSON.stringify(preprocessedFont));
    writeFileSync(tmpPy, pyContent, 'utf8');
    try {
      execSync(`python3 "${tmpPy}"`, { stdio: 'inherit' });
    } finally {
      unlinkSync(tmpPy);
    }
    fontToSubset = preprocessedFont;
  }

  // Subset with pyftsubset.
  console.log(`  Subsetting unicodes: ${font.unicodes}…`);
  execSync(
    `pyftsubset "${fontToSubset}" --unicodes="${font.unicodes}" --flavor=woff2 --output-file="${tmpWoff2}"`,
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
  execSync(`oxfmt --config ${join(ROOT, '.oxfmtrc.json')} "${font.outTs}"`);
  console.log(`  Written → ${font.outTs} (${(ts.length / 1024).toFixed(1)} KB)`);

  mkdirSync(FONTS_PKG_DIR, { recursive: true });
  writeFileSync(pkgWoff2, woff2);
  console.log(`  Written → ${pkgWoff2} (${(woff2.length / 1024).toFixed(1)} KB)`);
}

console.log('\nDone.');
