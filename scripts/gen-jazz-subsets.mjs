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
    unicodes: 'U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7,U+E030-E032,U+E040-E042,U+E500-E501',
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
    // Math Bold digits, simile marks, barline/repeat glyphs, plus ø (copied from
    // PetalumaScript) and △ (re-encoded from U+E0BD) for GrigsonCursive typeface.
    unicodes: 'U+00F8,U+25B3,U+1D7CE-1D7D7,U+E030-E033,U+E040-E042,U+E500-E501',
    outTs: join(ROOT, 'packages/grigson/src/renderers/grigson-petaluma-notation-subset.ts'),
    pkgWoff2Name: 'GrigsonPetaluma-notation-subset.woff2',
    exportName: 'grigsonPetalumaNotationWoff2',
    credit:
      'GrigsonPetaluma-notation, derived from Petaluma by Steinberg Media Technologies GmbH, licensed under the SIL Open Font License 1.1.',
    // Save the preprocessed font as GrigsonPetaluma.otf.
    preprocessedSaveName: 'GrigsonPetaluma.otf',
    // Preprocessing steps:
    //   1. Add Math Bold cmap aliases U+1D7CE–1D7D7 → E080–E089 (time-sig digits).
    //   2. Re-encode the triangle glyph at U+E0BD to also sit at U+25B3 (△ maj7 symbol).
    //   3. Copy the oslash glyph from PetalumaScript.otf and map it at U+00F8 (ø quality symbol).
    preprocessPy: `\
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.cffLib import CharStrings

font = TTFont(__INPUT__)
target_top = font['CFF '].cff.topDictIndex[0]
old_cs_obj = target_top.CharStrings

# ── 1. Math Bold digit aliases U+1D7CE–1D7D7 → E080–E089 ─────────────────────
non_bmp = {}
for i in range(10):
    for table in font['cmap'].tables:
        gname = table.cmap.get(0xE080 + i)
        if gname:
            non_bmp[0x1D7CE + i] = gname
            break

# ── 2. Triangle alias U+25B3 → uniE0BD ────────────────────────────────────────
triangle_glyph = None
for table in font['cmap'].tables:
    gname = table.cmap.get(0xE0BD)
    if gname:
        triangle_glyph = gname
        break
print(f'Triangle glyph for U+25B3: {triangle_glyph}')

# ── 2b. Repeat barline aliases U+E040/E041 → uniE04C/uniE04D ─────────────────
# U+E04C and U+E04D are compact repeat barlines that suit the cursive aesthetic
# better than the large sweeping glyphs at U+E040/E041.
repeat_start_glyph = None
repeat_end_glyph = None
for table in font['cmap'].tables:
    if repeat_start_glyph is None:
        repeat_start_glyph = table.cmap.get(0xE04C)
    if repeat_end_glyph is None:
        repeat_end_glyph = table.cmap.get(0xE04D)
print(f'Repeat start glyph for U+E040: {repeat_start_glyph}')
print(f'Repeat end glyph for U+E041: {repeat_end_glyph}')

# ── 3. Copy oslash from PetalumaScript ────────────────────────────────────────
ps = TTFont(${JSON.stringify(join(FONTS_DIR, 'PetalumaScript.otf'))})
oslash_name = ps.getBestCmap().get(0x00F8)
ps_gs = ps.getGlyphSet()
rec = RecordingPen()
ps_gs[oslash_name].draw(rec)
oslash_width = ps['hmtx'].metrics[oslash_name][0]

# Rebuild CharStrings in non-indexed mode so we can freely insert glyphs.
decompiled = {}
for name in old_cs_obj.charStrings:
    decompiled[name] = old_cs_obj[name]

pen = T2CharStringPen(oslash_width, old_cs_obj)
rec.replay(pen)
oslash_cs = pen.getCharString()
oslash_cs.private = target_top.Private
decompiled[oslash_name] = oslash_cs

new_cs_obj = CharStrings(None, None, old_cs_obj.globalSubrs, target_top.Private, None, None)
new_cs_obj.charStrings = decompiled
target_top.CharStrings = new_cs_obj

# font.getGlyphOrder() returns the same list object as target_top.charset; copy it first
# so that charset.append below does not also mutate existing_go.
existing_go = list(font.getGlyphOrder())
if oslash_name not in existing_go:
    target_top.charset.append(oslash_name)
    font.setGlyphOrder(existing_go + [oslash_name])
font['hmtx'].metrics[oslash_name] = (oslash_width, 0)
print(f'Copied oslash glyph from PetalumaScript (width={oslash_width})')

# ── 4. Update cmap tables ──────────────────────────────────────────────────────
bmp_aliases = {}
if triangle_glyph:
    bmp_aliases[0x25B3] = triangle_glyph
if repeat_start_glyph:
    bmp_aliases[0xE040] = repeat_start_glyph
if repeat_end_glyph:
    bmp_aliases[0xE041] = repeat_end_glyph
bmp_aliases[0x00F8] = oslash_name

for table in font['cmap'].tables:
    table.cmap.update(bmp_aliases)
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
    existing.update(bmp_aliases)
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

    // Optionally persist the preprocessed font for downstream use (e.g. font-explorer).
    if (font.preprocessedSaveName) {
      const savedPath = join(FONTS_DIR, font.preprocessedSaveName);
      writeFileSync(savedPath, readFileSync(preprocessedFont));
      console.log(`  → saved preprocessed font to ${savedPath}`);
    }
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
