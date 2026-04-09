# Plan: Proportional mixed-meter layout + interleaved barline gap columns

## Context

Two related layout problems in the HTML renderer:

1. **Denominator ignored**: `3/8` and `3/4` bars render at the same width. The denominator is stored but never used in layout. A bar of `3/8` should be half the width of a bar of `3/4` when both appear in the same song.

2. **Repeat/time-sig overlap**: When a bar opens with a repeat sign AND carries a time-sig annotation (e.g. `||: (3/4)`), both the barline glyph and the time-sig try to occupy the same zero-width grid position. They visually collide (screenshot in task).

The fix for (2) was explicitly deferred in `project/plans/font-repeat-bars.md`:

> "The grid architecture change is deferred as a separate future task."

This plan implements both fixes together, since (2) requires a structural grid change that also resolves (1) cleanly.

---

## Part 1 — Denominator-aware beat-unit normalisation

### Algorithm

Scan every time signature that appears in the song (frontmatter `meter` + every per-bar `timeSignature`). Compute:

```
beatUnit = max(denominator) across all time sigs
```

For each bar, convert its time-sig numerator into a "beat-unit count":

```
effectiveBeats(timeSig) = timeSig.numerator × (beatUnit / timeSig.denominator)
```

Examples:

| Song contains | beatUnit | 4/4 → effectiveBeats | 6/8 → effectiveBeats | 3/8 → effectiveBeats |
| ------------- | -------- | -------------------- | -------------------- | -------------------- |
| only 4/4      | 4        | 4                    | —                    | —                    |
| only 6/8      | 8        | —                    | 6                    | —                    |
| only 3/8      | 8        | —                    | —                    | 3                    |
| 4/4 + 6/8     | 8        | **8**                | 6                    | —                    |
| 4/4 + 3/8     | 8        | **8**                | —                    | 3                    |
| 3/4 + 3/8     | 8        | —                    | —                    | 3 (and 3/4 → 6)      |

Replace every use of `activeTSig.numerator` as a beat count with `effectiveBeats(activeTSig)`. The `beatsPerChord`, `isEvenDivision`, and `isProportional` checks all use this value.

Add `beatUnit: number` to `GlobalLayout` (used to document the resolved unit; not needed in CSS).

### Where to collect all time sigs

In `computeGlobalLayout` (`html.ts:100`), add a pre-pass that walks all rows/bars and collects every time sig (including `parseMeterToTimeSig(song.meter)`), then takes `max(denominator)`. Use this value throughout the main layout pass.

---

## Part 2 — Interleaved beat/gap grid columns

### CSS Grid feasibility

**Yes, confirmed.** CSS Grid supports `repeat(N, A B)` with N from a CSS custom property:

```css
grid-template-columns: auto repeat(var(--beat-cols), minmax(var(--min-beat-width), 1fr) auto);
```

This produces `1 + 2×beatCols` columns:

| Column index | Purpose                           |
| ------------ | --------------------------------- |
| 1            | Initial gap (open barline of row) |
| 2            | Beat 1                            |
| 3            | Gap after beat 1                  |
| 4            | Beat 2                            |
| 5            | Gap after beat 2                  |
| …            | …                                 |
| 2k           | Beat k                            |
| 2k+1         | Gap after beat k                  |

`auto` gap columns collapse to 0 px when empty; they widen to content width when a barline or time-sig is placed in them. All rows share the same underlying columns via `subgrid`. If one row puts a wide `:||: 3/4` element in gap column 13, every other row's column 13 also widens — so the beat columns on both sides of it stay aligned across rows.

### Column mapping (from beat-offset to CSS column number)

All beat offsets are counted in beat-units (after Part 1 normalisation).

| Item                                   | Old column formula | New column formula             |
| -------------------------------------- | ------------------ | ------------------------------ |
| Open barline of row                    | 1                  | 1 (still col 1, now a gap col) |
| Slot at `beatOffset` (0-indexed)       | `beatOffset + 1`   | `2×beatOffset + 2`             |
| Slot span of `b` beats                 | `b`                | `2b − 1`                       |
| Close barline after `beatOffset` beats | `beatOffset + 1`   | `2×beatOffset + 1`             |

The slot span `2b − 1` spans b beat columns and the b−1 inner gap columns between them, but stops before the trailing gap column that contains the close barline.

Verify with 4/4, 1 chord spanning 8 beat-units (after normalisation):

- slotCol = 2, slotSpan = 15 → cols 2–16
- closeBarlineCol = 17 (col 2×8+1) ✓

Verify with 3/8, 1 chord spanning 3 beat-units:

- slotCol = 2, slotSpan = 5 → cols 2–6
- closeBarlineCol = 7 ✓

### Time-sig placement: move from slot to gap cell

Currently `showTimeSig` lives on `SlotLayout` and the time sig is absolutely positioned inside the first slot with `padding-left: 1em` on the slot.

In the new scheme the time sig belongs in the gap cell beside the barline. Move `showTimeSig` from `SlotLayout` to the bar-level entry in `RowLayout.bars`:

```typescript
// Before (SlotLayout):
export interface SlotLayout {
  col: number;
  span: number;
  showTimeSig?: TimeSignature;   // ← remove
  …
}

// After (bar entry in RowLayout):
bars: Array<{
  slots: SlotLayout[];
  closeBarlineCol: number;
  showTimeSig?: TimeSignature;   // ← the time sig shown at this bar's OPEN barline
}>;
```

During rendering, when emitting the open barline of bar `i`:

- For `i = 0`: use `rowLayout.openBarlineCol` (col 1), include `bars[0].showTimeSig`
- For `i > 0`: use `bars[i-1].closeBarlineCol`, include `bars[i].showTimeSig`

The gap cell HTML:

```html
<span part="barline barline-single" style="grid-column: 9">
  <!-- barline glyph/border as today -->
  <span part="time-sig">…</span>  <!-- new: inside barline span, not slot -->
</span>
```

### Barline rendering: switch from zero-width + absolute to natural-width

Currently every barline element has `width: 0; position: relative` and its SVG is `position: absolute`. This works because the barline occupies no grid space.

In the new scheme the barline lives in a gap column sized by `auto`, so the barline should have natural width:

- Remove `width: 0` and `position: relative` from `[part~="barline"]`
- Remove `position: absolute` from `[part~="barline"] svg`
- Remove `[part~="barline"] + [part="slot"] { padding-left: 1em }` (no longer needed)
- Remove `[part="time-sig"]` absolute positioning; it becomes a flex sibling inside the barline span

The gap column will auto-size to the rendered width of the barline + time-sig content.

**Note on font-repeat-bars plan**: `project/plans/font-repeat-bars.md` switches SVG barlines to font glyphs but still uses absolute positioning (explicitly deferring the grid change). If that plan is implemented first, update its absolute-positioning CSS here instead of the SVG CSS. If this plan is implemented first, font-repeat-bars must be updated to use natural-width glyphs (remove `position: absolute` from `[part="barline-glyph"]`).

---

## Files to change

| File                                             | Change                                                                                                                                                                                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/grigson/src/renderers/html.ts`         | Pre-pass to compute `beatUnit`; replace `numerator` with `effectiveBeats()` everywhere; move `showTimeSig` from `SlotLayout` to bar-level; update all column/span formulas                                                                         |
| `packages/grigson/src/renderers/html-element.ts` | New `grid-template-columns` CSS; remove barline `width:0`/`position:relative`; remove `[part~="barline"] svg { position:absolute }`; remove `padding-left:1em` on first slot; update time-sig CSS (now flows inside barline span rather than slot) |
| `packages/grigson/src/renderers/html.test.ts`    | Update all column/span assertions; add tests for mixed-denominator proportionality                                                                                                                                                                 |

---

## Test examples

### Example A: pure mixed-denominator (3/4 + 3/8), no repeats

```
meter: mixed

| (3/4) C | Am | F |
| (3/8) Dm | Em | Am |
```

Expected (beatUnit = 8):

- Row 1: 3 bars × 6 beat-units each = 18 beat-units
- Row 2: 3 bars × 3 beat-units each = 9 beat-units
- `beatCols` = 18
- Row 2's bars occupy the left half of the grid

### Example B: 4/4 + 6/8, with repeats and uneven line lengths

```
meter: mixed

||: (4/4) C | Am | F | G :||
||: (6/8) Dm | Em :||: Am | C :||
    (6/8) Bm7b5 | E7 ||.
```

Expected (beatUnit = 8):

- Row 1: 4 bars × 8 beat-units = 32
- Row 2: 2 bars × 6 beat-units + 2 bars × 6 beat-units = 24
- Row 3: 2 bars × 6 beat-units = 12
- `beatCols` = 32

Gap cells in row 2:

- Col 1: `||: 6/8` (start repeat + time sig together)
- Col 13: `:||:` (end-repeat-start-repeat, no time sig change)

Gap cells in row 3:

- Col 1: `| 6/8` (single barline + time sig)

### Example C: 4/4 + 3/8 + 3/4 mixed, repeats spanning multiple rows

```
meter: mixed

||: (4/4) Cmaj7 | Am7 | Dm7 | G7 :||
||: (3/4) Cm7 | Cdim :||: (3/8) Cdim7 | Cm7b5 :||
    (4/4) C7b5 | C7b5 ||.
```

(This is the chart from the screenshot.)

Expected (beatUnit = 8):

- Row 1 (4/4): 4 × 8 = 32 beat-units
- Row 2 (3/4 then 3/8): 2×6 + 2×3 = 18 beat-units
- Row 3 (4/4): 2 × 8 = 16 beat-units
- `beatCols` = 32

Gap cells in row 2:

- Col 1: `||: 3/4` — start repeat + time sig, rendered in one gap cell; no more overlap

---

## Data structure changes summary

```typescript
// GlobalLayout: add beatUnit
export interface GlobalLayout {
  rows: Map<Row, RowLayout>;
  beatCols: number;
  beatUnit: number;       // NEW: 4 or 8 (or 16 etc.) — resolved smallest note value
  minBeatWidth: string;
}

// SlotLayout: remove showTimeSig
export interface SlotLayout {
  col: number;
  span: number;
  // showTimeSig removed — now on bar entry
  implicit?: boolean;
  sourceSlotIdx?: number;
}

// RowLayout bar entry: add showTimeSig
bars: Array<{
  slots: SlotLayout[];
  closeBarlineCol: number;
  showTimeSig?: TimeSignature;   // NEW — rendered at this bar's open barline gap cell
}>;
```

---

## Verification

1. `pnpm test` — all existing layout tests pass with updated column/span values
2. New tests:
   - `computeGlobalLayout` for a 4/4 + 6/8 song produces `beatUnit: 8` and a 4/4 bar with 8 effective beats
   - `computeGlobalLayout` for a 3/4 + 3/8 song produces `beatUnit: 8`, 3/4 → 6 beats, 3/8 → 3 beats
   - A 4/4 + 6/8 row HTML has `grid-column: 2` / `span: 15` for a 4/4 single-chord bar, and `grid-column: 18` / `span: 11` for a following 6/8 bar
   - The `||: (3/4)` bar in example C produces a gap cell at col 1 with both the repeat barline and a time-sig child span
3. Browser: load example C in the playground; verify `||: 3/4` renders without overlap; verify 3/8 bars are half the width of 3/4 bars
4. Browser: resize viewport; verify beat columns flex proportionally; verify barline gap columns stay content-sized (don't stretch)
