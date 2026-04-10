# Plan: Synthesize barlineDouble and barlineFinal in GrigsonJazz

## Context

FinaleJazz.otf has U+E030 (barlineSingle) and U+E040–E042 (repeat signs), but is missing
U+E031 (barlineDouble) and U+E032 (barlineFinal). Without these, the Jazz typeface falls back
to Bravura's clean geometric glyphs for those two barline types, breaking style consistency.
Both glyphs can be constructed programmatically from existing FinaleJazz outlines:

- **barlineDouble**: two copies of barlineSingle, spaced with the same inter-stroke gap used in
  the repeat signs (which already contain two barline strokes at a natural FinaleJazz spacing).
- **barlineFinal**: the barline strokes of repeatRight (U+E041) with the dot contours removed.

## Files to modify

| File                               | Change                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| `scripts/reencode-finale-jazz.mjs` | Add synthetic glyph construction after the IMPORT loop |
| `scripts/gen-jazz-subsets.mjs`     | Extend GrigsonJazz unicodes to include U+E031–E032     |

## Algorithm

All changes are in the embedded Python template string in `reencode-finale-jazz.mjs`.

### 1. Add Python imports

Add to the top of the Python block (alongside existing `RecordingPen`, `T2CharStringPen`):

```python
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
```

### 2. Add a synthetic glyph helper section after the IMPORT loop

After the `for unicode_cp, glyph_name in IMPORT.items():` loop and `base.setGlyphOrder(base_order)`,
and **before** the cmap registration block, insert:

```python
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
    return (yMax - yMin) < (xMax - xMin) * 3   # height < 3× width → dot

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
    inter_stroke_gap = b1[0] - b0[2]  # xMin(thick) − xMax(thin)
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

final_adv = rr_g.width  # preserve repeatRight's advance width
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
```

### 3. Register synthetic glyphs in cmap

After the IMPORT loop, the cmap block updates tables from `bmp_import`. Extend it to
also register the two synthetic glyphs. The cleanest way: add a `SYNTHETIC_BMP` dict and
merge it into `bmp_import` before the cmap update loop:

```python
SYNTHETIC_BMP = {0xE031: 'uniE031', 0xE032: 'uniE032'}
bmp_import.update(SYNTHETIC_BMP)
```

(This goes right before the `for table in base['cmap'].tables:` loop.)

### 4. Update gen-jazz-subsets.mjs

Extend the GrigsonJazz unicodes from:

```
U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7,U+E030,U+E040-E042,U+E500-E501
```

to:

```
U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7,U+E030-E032,U+E040-E042,U+E500-E501
```

## Execution sequence

```bash
node scripts/reencode-finale-jazz.mjs
PATH="$(pnpm bin):$PATH" node scripts/gen-jazz-subsets.mjs
pnpm build
pnpm test
```

## Verification

1. `pnpm build` and `pnpm test` pass.
2. Open the font explorer and navigate to GrigsonJazz — confirm U+E031 and U+E032 are now
   marked **present** and render visually reasonable glyphs.
3. Load the typefaces tutorial page in a browser; check that the Jazz typeface shows
   handwritten-style double and final barlines (not Bravura's clean geometric ones).
4. Visually compare barlineDouble's inter-stroke gap against the gap in repeatRight/repeatLeft
   — they should look consistent.
5. Visually compare barlineFinal against repeatRight — the two barline strokes should be at
   the same relative positions; only the dots should be absent.
