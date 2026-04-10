#!/usr/bin/env node
/**
 * Merges FinaleJazzText.otf (Latin text) and FinaleJazz.otf (SMuFL accidentals)
 * into a single derivative font: GrigsonJazz.otf.
 *
 * FinaleJazzText provides the Latin-1 text glyphs used in chord charts (letters,
 * digits, °, ø, etc.).  FinaleJazz provides the accidental and chord-quality
 * glyph outlines at SMuFL codepoints.  Four glyphs are copied from FinaleJazz
 * and mapped to standard Unicode positions:
 *
 *   U+266D ♭  →  uniE260  (SMuFL accidentalFlat)
 *   U+266E ♮  →  uniE261  (SMuFL accidentalNatural)
 *   U+266F ♯  →  uniE262  (SMuFL accidentalSharp)
 *   U+25B3 △  →  uniE873  (SMuFL chordSymbolMajorSeventh)
 *
 * The font is renamed from "Finale Jazz Text" to "GrigsonJazz" to satisfy the
 * SIL OFL reserved-name requirement for derivatives.
 *
 * Prerequisites:  pip install fonttools
 * Usage:          node scripts/reencode-finale-jazz.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, 'fonts');
const base   = join(FONTS_DIR, 'FinaleJazzText.otf');
const source = join(FONTS_DIR, 'FinaleJazz.otf');
const dest   = join(FONTS_DIR, 'GrigsonJazz.otf');

const pyScript = `\
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

base   = TTFont(${JSON.stringify(base)})
source = TTFont(${JSON.stringify(source)})

src_glyphs  = source.getGlyphSet()
base_cff    = base['CFF '].cff.topDictIndex[0]
base_cs     = base_cff.CharStrings
base_order  = base.getGlyphOrder()

# Glyphs to import from FinaleJazz, mapped to standard Unicode codepoints
IMPORT = {
    0x266D: 'uniE260',   # ♭ flat
    0x266E: 'uniE261',   # ♮ natural
    0x266F: 'uniE262',   # ♯ sharp
    0x25B3: 'uniE873',   # △ major-seventh triangle
    # time-sig digits at Math Bold codepoints
    0x1D7CE: 'uniE080',  # 𝟎
    0x1D7CF: 'uniE081',  # 𝟏
    0x1D7D0: 'uniE082',  # 𝟐
    0x1D7D1: 'uniE083',  # 𝟑
    0x1D7D2: 'uniE084',  # 𝟒
    0x1D7D3: 'uniE085',  # 𝟓
    0x1D7D4: 'uniE086',  # 𝟔
    0x1D7D5: 'uniE087',  # 𝟕
    0x1D7D6: 'uniE088',  # 𝟖
    0x1D7D7: 'uniE089',  # 𝟗
    # simile marks at native SMuFL PUA codepoints
    0xE500: 'uniE500',   # repeat1Bar
    0xE501: 'uniE501',   # repeat2Bars
    # barlines and repeat signs at native SMuFL PUA codepoints
    0xE030: 'uniE030',   # barlineSingle
    0xE040: 'uniE040',   # repeatLeft (start repeat)
    0xE041: 'uniE041',   # repeatRight (end repeat)
    0xE042: 'uniE042',   # repeatRightLeft (end+start repeat)
}

for unicode_cp, glyph_name in IMPORT.items():
    # Round-trip through RecordingPen → T2Pen to avoid subr-reference issues
    rec = RecordingPen()
    src_glyphs[glyph_name].draw(rec)

    t2pen = T2CharStringPen(src_glyphs[glyph_name].width, src_glyphs)
    rec.replay(t2pen)
    new_cs = t2pen.getCharString()

    new_cs.private = base_cff.Private
    # CharStrings uses an indexed structure: names map to integer indices
    # into charStringsIndex.items; append the new charstring and record its index.
    base_cs.charStringsIndex.items.append(new_cs)
    base_cs.charStrings[glyph_name] = len(base_cs.charStringsIndex.items) - 1

    # Advance width + lsb
    src_width = src_glyphs[glyph_name].width
    base['hmtx'].metrics[glyph_name] = (src_width, 0)

    # Register in glyph order
    if glyph_name not in base_order:
        base_order.append(glyph_name)

base.setGlyphOrder(base_order)

# ── Synthetic glyphs ────────────────────────────────────────────────────────
# Helper: split a RecordingPen value into individual contours.
def split_contours(value):
    contours, current = [], []
    for op, args in value:
        current.append((op, args))
        if op in ('endPath', 'closePath'):
            contours.append(current)
            current = []
    return contours

# Helper: tight bounding box of one contour's ops.
def contour_bounds(ops):
    rec = RecordingPen(); rec.value = ops
    bp = BoundsPen(None); rec.replay(bp)
    return bp.bounds  # (xMin, yMin, xMax, yMax) or None

# Helper: classify a contour as a dot (small/square) vs a barline stroke (tall/narrow).
def is_dot(bounds):
    if bounds is None: return False
    xMin, yMin, xMax, yMax = bounds
    return (yMax - yMin) < (xMax - xMin) * 3   # height < 3x width -> dot

# ── Measure gap from repeatRight (U+E041) ────────────────────────────────────
rr_g = src_glyphs['uniE041']
rr_rec = RecordingPen(); rr_g.draw(rr_rec)
rr_contours = split_contours(rr_rec.value)
rr_bounds_list = [(c, contour_bounds(c)) for c in rr_contours]

# Barline strokes in repeatRight, sorted left-to-right.
barline_pairs = sorted(
    [(c, b) for c, b in rr_bounds_list if b is not None and not is_dot(b)],
    key=lambda x: x[1][0]
)

if len(barline_pairs) >= 2:
    _, b0 = barline_pairs[0]   # thin stroke (leftmost)
    _, b1 = barline_pairs[1]   # thick stroke
    inter_stroke_gap = b1[0] - b0[2]  # xMin(thick) - xMax(thin)
else:
    inter_stroke_gap = 0

# ── barlineDouble (U+E031 / uniE031) ────────────────────────────────────────
# Two copies of barlineSingle with the same inter-stroke gap as in repeatRight.
single_g = src_glyphs['uniE030']
bp_single = BoundsPen(None); single_g.draw(bp_single)
single_bounds = bp_single.bounds                         # (xMin, yMin, xMax, yMax)
single_adv    = single_g.width

# Offset for the second copy: advance width of first + gap.
double_offset = single_adv + inter_stroke_gap
double_adv    = double_offset + single_adv

single_rec = RecordingPen(); single_g.draw(single_rec)
t2_double = T2CharStringPen(double_adv, src_glyphs)
single_rec.replay(t2_double)                             # first copy at x=0
shifted = TransformPen(t2_double, (1, 0, 0, 1, double_offset, 0))
single_rec.replay(shifted)                               # second copy shifted right
cs_double = t2_double.getCharString()
cs_double.private = base_cff.Private
base_cs.charStringsIndex.items.append(cs_double)
base_cs.charStrings['uniE031'] = len(base_cs.charStringsIndex.items) - 1
base['hmtx'].metrics['uniE031'] = (double_adv, 0)
if 'uniE031' not in base_order: base_order.append('uniE031')

# ── barlineFinal (U+E032 / uniE032) ─────────────────────────────────────────
# repeatRight's barline strokes only (no dots), translated so the thin stroke
# starts at the same x-position as barlineSingle does (i.e. at x=0 origin).
thin_xMin = barline_pairs[0][1][0] if barline_pairs else 0
single_xMin = single_bounds[0] if single_bounds else 0
translate_x = single_xMin - thin_xMin   # shift so thin barline lines up with origin

final_adv = rr_g.width + translate_x  # trim dot region; preserves repeatRight's RSB
t2_final = T2CharStringPen(final_adv, src_glyphs)
for contour_ops, _ in barline_pairs:
    shifted_final = TransformPen(t2_final, (1, 0, 0, 1, translate_x, 0))
    for op, args in contour_ops:
        getattr(shifted_final, op)(*args)
cs_final = t2_final.getCharString()
cs_final.private = base_cff.Private
base_cs.charStringsIndex.items.append(cs_final)
base_cs.charStrings['uniE032'] = len(base_cs.charStringsIndex.items) - 1
base['hmtx'].metrics['uniE032'] = (final_adv, 0)
if 'uniE032' not in base_order: base_order.append('uniE032')

# Map standard Unicode codepoints to the imported glyph names.
# BMP codepoints (≤ U+FFFF) go into all tables; supplementary codepoints
# (> U+FFFF) can only go into format 12/13 tables (format 4 uses 16-bit only).
bmp_import     = {cp: name for cp, name in IMPORT.items() if cp <= 0xFFFF}
non_bmp_import = {cp: name for cp, name in IMPORT.items() if cp >  0xFFFF}

SYNTHETIC_BMP = {0xE031: 'uniE031', 0xE032: 'uniE032'}
bmp_import.update(SYNTHETIC_BMP)

from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
for table in base['cmap'].tables:
    # Skip format-6 (trimmed array) — it only handles a contiguous range and
    # adding high BMP codepoints like U+E500 would overflow it.
    if table.format != 6:
        table.cmap.update(bmp_import)
    if table.format in (12, 13):
        table.cmap.update(non_bmp_import)

# If no format-12 table exists, create one so the non-BMP codepoints are reachable.
if non_bmp_import and not any(t.format == 12 for t in base['cmap'].tables):
    fmt12 = CmapSubtable.newSubtable(12)
    fmt12.platformID = 3
    fmt12.platEncID  = 10
    fmt12.language   = 0
    # Seed with all existing BMP mappings from the first Unicode table, plus new ones.
    existing = {}
    for t in base['cmap'].tables:
        if t.platformID in (0, 3):
            existing.update(t.cmap)
    existing.update(bmp_import)
    existing.update(non_bmp_import)
    fmt12.cmap = existing
    base['cmap'].tables.append(fmt12)

# Rename: replace all occurrences of the reserved Finale names
REPLACEMENTS = [
    ('Finale Jazz Text', 'GrigsonJazz'),
    ('FinaleJazzText',   'GrigsonJazz'),
    ('Finale Jazz',      'GrigsonJazz'),
    ('FinaleJazz',       'GrigsonJazz'),
]
for record in base['name'].names:
    try:
        s = record.toUnicode()
    except Exception:
        raw = record.string
        for orig, repl in REPLACEMENTS:
            for enc in ('utf-16-be', 'latin-1', 'ascii'):
                try:
                    raw = raw.replace(orig.encode(enc), repl.encode(enc))
                except Exception:
                    pass
        record.string = raw
        continue
    new_s = s
    for orig, repl in REPLACEMENTS:
        new_s = new_s.replace(orig, repl)
    if new_s != s:
        encoding = 'utf-16-be' if record.platformID in (0, 3) else 'latin-1'
        try:
            record.string = new_s.encode(encoding)
        except UnicodeEncodeError:
            record.string = new_s.encode('utf-16-be')

base.save(${JSON.stringify(dest)})
print('Saved', ${JSON.stringify(dest)})
`;

const tmpPy = join(tmpdir(), 'reencode-finale-jazz.py');
writeFileSync(tmpPy, pyScript, 'utf8');
try {
  execSync(`python3 "${tmpPy}"`, { stdio: 'inherit' });
} finally {
  unlinkSync(tmpPy);
}
