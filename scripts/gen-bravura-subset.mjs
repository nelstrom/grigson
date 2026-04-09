#!/usr/bin/env node
/**
 * Generates packages/grigson/src/renderers/bravura-subset.ts
 *
 * Uses scripts/fonts/Bravura.otf if present; otherwise downloads from GitHub
 * and caches it there.  Subsets to the glyphs used by the HTML renderer and
 * emits a TypeScript constant containing the base64 data URI.
 *
 * Prerequisites:
 *   pip install fonttools brotli
 *
 * Usage:
 *   node scripts/gen-bravura-subset.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_TS = join(ROOT, 'packages/grigson/src/renderers/bravura-subset.ts');
const OUT_WOFF2 = join(ROOT, 'packages/grigson-fonts/fonts/Bravura-subset.woff2');
const FONTS_DIR = join(__dirname, 'fonts');
const CACHED_OTF = join(FONTS_DIR, 'Bravura.otf');

const BRAVURA_URL =
  'https://github.com/steinbergmedia/bravura/raw/master/redist/otf/Bravura.otf';

// SMuFL glyphs to include:
//   U+E080-E089  time signature digits 0-9
//   U+E08A       common time (C)
//   U+E08B       cut time
//   U+E500       repeat1Bar (single-bar simile mark)
//   U+E501       repeat2Bars (two-bar simile mark)
// Standard Unicode music symbols (also present in Bravura):
//   U+266D       ♭ MUSIC FLAT SIGN
//   U+266F       ♯ MUSIC SHARP SIGN
// Math Bold digits (cmap aliases added by preprocessing step below):
//   U+1D7CE-1D7D7  𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗 — same outlines as U+E080–E089
const UNICODES = 'U+266D,U+266F,U+E080-E08B,U+E500,U+E501,U+1D7CE-1D7D7';

const tmp = tmpdir();
const otfPath = join(tmp, 'Bravura.otf');
const otfWithAliases = join(tmp, 'GrigsonBravura-tmp.otf');
const woff2Path = join(tmp, 'bravura-subset.woff2');

if (existsSync(CACHED_OTF)) {
  console.log(`Using cached Bravura.otf from ${CACHED_OTF}…`);
  writeFileSync(otfPath, readFileSync(CACHED_OTF));
} else {
  console.log('Downloading Bravura.otf…');
  const res = await fetch(BRAVURA_URL);
  if (!res.ok) throw new Error(`Failed to download Bravura: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(otfPath, buf);
  mkdirSync(FONTS_DIR, { recursive: true });
  writeFileSync(CACHED_OTF, buf);
  console.log(`  → cached to ${CACHED_OTF}`);
}
console.log(`  → ${otfPath} (${(readFileSync(otfPath).length / 1024).toFixed(0)} KB)`);

// Preprocessing: add Math Bold cmap aliases U+1D7CE–1D7D7 pointing to the
// same glyph names as U+E080–E089, so pyftsubset can include them in the
// subset without adding new outlines.
const pyScript = join(tmp, 'add_math_bold_cmap.py');
writeFileSync(
  pyScript,
  `\
from fontTools.ttLib import TTFont
font = TTFont("${otfPath}")
for table in font['cmap'].tables:
    # Only format 12 (and 13) support supplementary characters (> U+FFFF).
    # Format 4 is BMP-only (unsigned short), so skip it to avoid overflow.
    if table.format not in (12, 13):
        continue
    for i in range(10):
        gname = table.cmap.get(0xE080 + i)
        if gname:
            table.cmap[0x1D7CE + i] = gname
font.save("${otfWithAliases}")
`,
  'utf8',
);
console.log('Adding Math Bold cmap aliases (U+1D7CE–1D7D7)…');
try {
  execSync(`python3 "${pyScript}"`, { stdio: 'inherit' });
  console.log('Subsetting with pyftsubset…');
  execSync(
    `pyftsubset "${otfWithAliases}" --unicodes="${UNICODES}" --flavor=woff2 --output-file="${woff2Path}"`,
    { stdio: 'inherit' },
  );
} finally {
  try { unlinkSync(otfWithAliases); } catch {}
  try { unlinkSync(pyScript); } catch {}
}
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
// Glyphs included: ♭♯ (U+266D, U+266F), SMuFL time-signature digits (U+E080–E08B), simile marks (U+E500–E501), Math Bold digits 𝟎–𝟗 (U+1D7CE–1D7D7, aliased to same outlines as U+E080–E089).
export const bravuraWoff2 = '${dataUri}';
`;

mkdirSync(dirname(OUT_TS), { recursive: true });
writeFileSync(OUT_TS, ts, 'utf8');
execSync(`pnpm exec oxfmt --config ${join(ROOT, '.oxfmtrc.json')} "${OUT_TS}"`);
console.log(`Written → ${OUT_TS} (${(ts.length / 1024).toFixed(1)} KB)`);

mkdirSync(dirname(OUT_WOFF2), { recursive: true });
writeFileSync(OUT_WOFF2, woff2);
console.log(`Written → ${OUT_WOFF2} (${(woff2.length / 1024).toFixed(1)} KB)`);
