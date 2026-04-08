#!/usr/bin/env node
/**
 * Generates per-font glyph data JSON files for the font-explorer Eleventy site.
 * Output: packages/font-explorer/_data/fonts/<slug>.json
 *
 * For each configured font:
 *   1. Downloads the font file to scripts/fonts/ if not cached
 *   2. Runs a Python/fonttools subprocess to extract glyph outlines as SVG paths
 *   3. Writes the result as JSON
 *
 * Prerequisites:  pip install fonttools
 * Usage:          node scripts/gen-font-explorer-data.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONTS_DIR = join(__dirname, 'fonts');
const OUT_DIR = join(ROOT, 'packages/font-explorer/_data/fonts');

mkdirSync(OUT_DIR, { recursive: true });

// ── Font configuration ──────────────────────────────────────────────────────

const FONTS = [
  {
    slug: 'finale-jazz',
    name: 'FinaleJazz',
    cacheName: 'FinaleJazz.otf',
    fontUrl: null, // already cached
    // Codepoints to highlight in the table (♭ ♯ ♮ △ at standard Unicode)
    targetCodepoints: [],
    sections: [
      { title: 'Non-SMuFL glyphs', filter: cp => cp < 0xE000 },
      { title: 'SMuFL glyphs (U+E000–U+EFFF)', filter: cp => cp >= 0xE000 && cp < 0xF000 },
      { title: 'Finale PUA glyphs (U+F000–)', filter: cp => cp >= 0xF000 },
    ],
  },
  {
    slug: 'noto-music',
    name: 'NotoMusic',
    cacheName: 'NotoMusic-Regular.ttf',
    fontUrl:
      'https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts/NotoMusic/full/ttf/NotoMusic-Regular.ttf',
    // The key question: does NotoMusic cover standard Unicode music symbols?
    targetCodepoints: [0x266d, 0x266f, 0x266e],
    sections: [
      { title: 'Non-PUA glyphs', filter: cp => cp < 0xE000 },
      { title: 'PUA glyphs (U+E000–)', filter: cp => cp >= 0xE000 },
    ],
  },
];

// ── Python glyph extraction ──────────────────────────────────────────────────

function makePyScript(fontPath, targetCodepoints) {
  return `
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

font     = TTFont(${JSON.stringify(fontPath)})
gs       = font.getGlyphSet()
cmap     = font.getBestCmap()
upm      = font['head'].unitsPerEm
ascender = font['OS/2'].sTypoAscender
PAD      = upm * 0.08
targets  = set(${JSON.stringify(targetCodepoints)})

# Build cp→name map and reverse
cp_to_name = dict(cmap)

result = []
for cp, gname in sorted(cp_to_name.items()):
    if gname not in gs:
        continue
    g = gs[gname]

    # SVG path
    path_pen = SVGPathPen(gs)
    g.draw(path_pen)
    d = path_pen.getCommands()

    # Consistent em-square viewBox (preserves relative sizes)
    w      = g.width if g.width > 0 else upm
    cx     = w / 2
    vx     = cx - upm / 2 - PAD
    vy     = -(ascender + PAD)
    vw     = upm + 2 * PAD
    vh     = (ascender - font['OS/2'].sTypoDescender) + 2 * PAD
    vb     = f"{vx:.1f} {vy:.1f} {vw:.1f} {vh:.1f}"

    result.append({
        "cp":       cp,
        "hex":      f"{cp:04X}",
        "name":     gname,
        "svgPath":  d,
        "viewBox":  vb,
        "advance":  g.width,
        "isTarget": cp in targets,
    })

outline = "CFF" if "CFF " in font else "TTF"
output  = {
    "upm":     upm,
    "outline": outline,
    "glyphs":  result,
}
print(json.dumps(output))
`;
}

// ── Main loop ────────────────────────────────────────────────────────────────

for (const font of FONTS) {
  console.log(`\n── ${font.name} ──`);

  const fontPath = join(FONTS_DIR, font.cacheName);

  // Download if needed
  if (existsSync(fontPath)) {
    console.log(`  Using cached ${font.cacheName}`);
  } else if (font.fontUrl) {
    console.log(`  Downloading ${font.fontUrl}…`);
    const res = await fetch(font.fontUrl);
    if (!res.ok) throw new Error(`Failed: ${res.status} ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(fontPath, buf);
    console.log(`  → ${fontPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  } else {
    throw new Error(`${font.cacheName} not found and no fontUrl configured`);
  }

  // Run Python to extract glyph data
  console.log(`  Extracting glyph data…`);
  const tmpPy = join(tmpdir(), `font-explorer-${font.slug}.py`);
  writeFileSync(tmpPy, makePyScript(fontPath, font.targetCodepoints), 'utf8');
  let raw;
  try {
    raw = execSync(`python3 "${tmpPy}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
  } finally {
    try { unlinkSync(tmpPy); } catch {}
  }

  const { upm, outline, glyphs } = JSON.parse(raw);
  console.log(`  ${glyphs.length} glyphs extracted`);

  // Partition into sections
  const sections = font.sections.map(({ title, filter }) => ({
    title,
    glyphs: glyphs.filter(g => filter(g.cp)),
  })).filter(s => s.glyphs.length > 0);

  // Coverage summary for target codepoints
  const coverage = font.targetCodepoints.map(cp => ({
    cp,
    hex: cp.toString(16).toUpperCase().padStart(4, '0'),
    symbol: String.fromCodePoint(cp),
    present: glyphs.some(g => g.cp === cp),
  }));

  const out = {
    slug: font.slug,
    name: font.name,
    upm,
    outline,
    totalGlyphs: glyphs.length,
    targetCodepoints: font.targetCodepoints,
    coverage,
    sections,
  };

  const outPath = join(OUT_DIR, `${font.slug}.json`);
  writeFileSync(outPath, JSON.stringify(out), 'utf8');
  console.log(`  → ${outPath}`);
}

console.log('\nDone.');
