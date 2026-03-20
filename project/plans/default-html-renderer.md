# Plan: Beautiful HTML Renderer

## Context

The existing `HtmlRenderer` produces a simple text-like HTML dump — essentially the text renderer with CSS class hooks. The goal is to redesign it as a proper music typesetting renderer: beats equally spaced, barlines aligned vertically across all rows in the entire song, time signature changes handled gracefully, musical Unicode typography throughout. This is the default renderer used when no child renderer is specified in `<grigson-chart>`.

## Key files

- `packages/grigson/src/renderers/html.ts` — core renderer (produces HTML string)
- `packages/grigson/src/renderers/html-element.ts` — custom element wrapper (provides CSS)

## Dependencies / normalizer requirements

The renderer trusts that incoming `Song` ASTs have been normalised. One new normalizer requirement arises from this design:

> **The normalizer must ensure `bar.timeSignature` is explicitly set on the first bar of a song when the song has a declared meter.** Currently, for uniform-meter songs, the normalizer hoists the inline token to `song.meter` and strips it from bars. The renderer relies on `bar.timeSignature` being present to know when to display a time signature annotation — including at the very start of the chart. This is a separate task.

For `meter: mixed`, the normalizer already preserves inline time sig tokens on each section's first bar. 4/4 is the renderer's hardcoded fallback default.

---

## Design principles

1. **Source-order layout** — row breaks follow the source chart exactly. Rows are left-aligned and ragged right; their width reflects how long they are in time.
2. **Global beat width** — the widest row in the entire song fills the available horizontal space. All rows share the same beat column width. A 4-bar chorus row is 4/5 the width of a 5-bar verse row.
3. **Cross-song barline alignment** — all rows share a single global CSS grid, so barlines at the same beat position align vertically across sections.
4. **Musical typography** — Unicode symbols (♭ ♯ △ ° ø), superscript quality suffixes, fraction-layout slash chords.
5. **Time signatures as stacked fractions** — compact numerator/denominator, always shown when `bar.timeSignature` is set.
6. **Comments not rendered** — comments are source-level annotations; the HTML renderer omits them entirely.

---

## CSS Grid layout strategy

### Single global grid

All rows across all sections participate in one CSS Grid on `part="song-grid"`. Sections use `display: contents` so their children (section labels and rows) become direct grid items. This gives true cross-section barline alignment.

```html
<div part="song" style="--beat-cols: 20; --min-beat-width: 1.8em">
  <header part="song-header">...</header>
  <div part="song-grid">
    <section part="section" style="display: contents">
      <h2 part="section-label">Verse</h2>          <!-- grid-column: 1 / -1 -->
      <div part="row">...</div>                     <!-- grid-column: 1 / -1, subgrid -->
    </section>
    <section part="section" style="display: contents">
      <h2 part="section-label">Chorus</h2>
      <div part="row">...</div>                     <!-- ends at col 16; cols 17–20 empty -->
    </section>
  </div>
</div>
```

```css
[part="song-grid"] {
  display: grid;
  grid-template-columns: repeat(var(--beat-cols), minmax(var(--min-beat-width), 1fr));
  row-gap: var(--grigson-row-gap, 1.2em);
}

[part="section"] {
  display: contents;
}

[part="section-label"] {
  grid-column: 1 / -1;
  margin-top: var(--grigson-section-gap, 2em);
}

[part="song-grid"] > [part="section-label"]:first-child {
  margin-top: 0;
}

[part="row"] {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
}
```

### Beat columns and barline positioning

Grid columns represent beats. There are `--beat-cols + 1` columns total: `--beat-cols` beat columns plus one zero-width column at the end for the final barline.

```css
grid-template-columns:
  repeat(var(--beat-cols), minmax(var(--min-beat-width), 1fr))
  0fr;   /* column N+1: final barline anchor */
```

Barlines use `border-left` and sit at column `beatOffset + 1`:
- Open barline of a row → `grid-column: 1` (left edge of first beat)
- Barline after 4 beats → `grid-column: 5` (left edge of column 5 = right edge of beat 4)
- Final barline → `grid-column: var(--beat-cols) + 1` (the zero-width column)

```css
[part~="barline"] {
  width: 0;
  border-left: var(--grigson-barline-width) solid var(--grigson-barline-color);
  align-self: stretch;
}
```

---

## Global layout calculation (in `html.ts`)

Before rendering, a single pass over the entire song computes:

1. **Active time signature per bar**: default 4/4, updated when `bar.timeSignature` is set
2. **Beats per slot**:
   - Mode 1 (no dot slots in bar): `beatsPerSlot = timeSig.numerator / bar.slots.length` — always an integer in valid grigson
   - Mode 2 (any dot slot present): `beatsPerSlot = 1` for every slot
3. **Total beats per row**: sum of `bar.slots.length × beatsPerSlot` across all bars in the row, plus 1 for the final barline anchor column
4. **`globalMaxBeats`**: maximum total beats across all rows in the song → `--beat-cols`
5. **`globalMinBeatWidth`**: `max(estimatedChordWidth / beatsPerSlot)` across all chord slots in the song, in `em` units (≈ 0.55em per character; dot slots contribute zero; slash chords use `max(topWidth, bassWidth)`)

These are emitted once on `part="song"`:
```html
<div part="song" style="--beat-cols: 20; --min-beat-width: 1.8em">
```

The renderer also builds a layout table: for each row, each slot and barline gets `{ col, span }` values for `grid-column`.

---

## HTML structure

### Song header

```html
<div part="song" style="--beat-cols: 20; --min-beat-width: 1.8em">
  <header part="song-header">
    <h1 part="song-title">A Man's a Man for A' That</h1>
    <p part="song-artist">Robert Burns</p>       <!-- omitted if null -->
    <p part="song-key">F major</p>               <!-- omitted if null; normalised form -->
  </header>
  <div part="song-grid">
    ...
  </div>
</div>
```

Key is shown in normalised form ("F major", "A♭ major") — self-explanatory without a label. All three header elements are individually hideable via CSS.

### Section and rows

```html
<section part="section" style="display: contents">
  <h2 part="section-label">Chorus</h2>   <!-- omitted entirely when section.label is null -->

  <div part="row">
    <!-- open barline: beat offset 0 → grid-column: 1 -->
    <span part="barline barline-single" style="grid-column: 1"></span>

    <!-- bar 1: 4/4, 2 slots (F, Dm) → 2 beats each -->
    <!-- time sig shown because bar.timeSignature is set -->
    <span part="slot" style="grid-column: 2 / span 2">
      <span part="time-sig">
        <span part="time-sig-num">4</span>
        <span part="time-sig-den">4</span>
      </span>
      <span part="chord"><span part="chord-root">F</span></span>
    </span>
    <span part="slot" style="grid-column: 4 / span 2">
      <span part="chord"><span part="chord-root">D</span><span part="chord-quality">m</span></span>
    </span>

    <!-- barline after bar 1: beat offset 4 → grid-column: 5 -->
    <span part="barline barline-single" style="grid-column: 5"></span>
    ...

    <!-- final barline: grid-column: 17 (beat-cols + 1) -->
    <span part="barline barline-single" style="grid-column: 17"></span>
  </div>

  <!-- Row 2: 2×4/4 + 1×2/4 = 10 beats; columns 11–16 empty -->
  <div part="row">
    ...
    <span part="slot" style="grid-column: 9 / span 2">
      <span part="time-sig">
        <span part="time-sig-num">2</span>
        <span part="time-sig-den">4</span>
      </span>
      <span part="chord"><span part="chord-root">C</span></span>
    </span>
    <!-- final barline: grid-column: 11 (beat offset 10 + 1) -->
    <span part="barline barline-single" style="grid-column: 11"></span>
  </div>
</section>
```

### Chord with accidental

```html
<span part="chord-root">B<span part="chord-accidental">♭</span></span>
```

### Slash chord (fraction layout)

```html
<span part="chord chord-slash">
  <span part="chord-top">
    <span part="chord-root">A<span part="chord-accidental">♭</span></span>
  </span>
  <span part="chord-fraction-line"></span>
  <span part="chord-bass">E<span part="chord-accidental">♭</span></span>
</span>
```

### Dot slot

```html
<span part="dot" style="grid-column: 5 / span 1">/</span>
```

### Barline with repeat count

```html
<span part="barline barline-endRepeat">
  <span part="barline-repeat-count">×3</span>
</span>
```

### Barline kinds

| `part` value | Symbol |
|---|---|
| `barline barline-single` | `\|` |
| `barline barline-double` | `\|\|` |
| `barline barline-final` | `\|\|.` |
| `barline barline-startRepeat` | `\|\|:` |
| `barline barline-endRepeat` | `:\|\|` |
| `barline barline-endRepeatStartRepeat` | `:\|\|:` |

---

## Typography

### Unicode symbol mapping (HTML renderer defaults)

| Source | Rendered | Unicode |
|--------|----------|---------|
| `b` (flat in root) | `♭` | U+266D |
| `#` (sharp in root) | `♯` | U+266F |
| major 7 | `△` | U+25B3 |
| diminished | `°` | U+00B0 |
| half-diminished | `ø` | U+00F8 |
| minor | `m` (default) or `-` (symbolic preset) | — |

### Quality suffix styling

```css
[part="chord-quality"] {
  font-size: 0.75em;
  vertical-align: 0.25em;
  line-height: 0;
}

[part="chord-accidental"] {
  font-size: 0.8em;
  vertical-align: 0.15em;
  line-height: 0;
}
```

---

## CSS in `html-element.ts`

```css
:host {
  --grigson-font-family: Georgia, 'Times New Roman', serif;
  --grigson-font-size: 1rem;
  --grigson-color: inherit;
  --grigson-background: transparent;
  --grigson-row-gap: 1.2em;
  --grigson-section-gap: 2em;
  --grigson-barline-width: 1.5px;
  --grigson-barline-color: currentColor;
  --grigson-repeat-dot-size: 0.3em;
  --grigson-title-font-size: 1.4em;
  --grigson-section-label-font-size: 0.9em;
  --grigson-time-sig-font-size: 0.7em;
}
```

Barline CSS:
```css
[part~="barline"] {
  width: 0;
  border-left: var(--grigson-barline-width) solid var(--grigson-barline-color);
  align-self: stretch;
}
[part~="barline-double"] {
  box-shadow: 3px 0 0 var(--grigson-barline-color);
}
[part~="barline-final"] {
  border-left-width: calc(var(--grigson-barline-width) * 3);
  box-shadow: calc(var(--grigson-barline-width) * 3 + 2px) 0 0 var(--grigson-barline-color);
}
[part~="barline-startRepeat"]::after {
  content: '•\A•';
  white-space: pre;
  font-size: var(--grigson-repeat-dot-size);
  line-height: 1.8;
  position: absolute;
}
[part~="barline-endRepeat"]::before {
  content: '•\A•';
  white-space: pre;
  font-size: var(--grigson-repeat-dot-size);
  line-height: 1.8;
  position: absolute;
}
[part~="barline-endRepeatStartRepeat"]::before { /* same as endRepeat */ }
[part~="barline-endRepeatStartRepeat"]::after  { /* same as startRepeat */ }

[part="barline-repeat-count"] {
  position: absolute;
  top: -1em;
  font-size: 0.7em;
}
```

Slash chord CSS:
```css
[part="chord-slash"] {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
[part="chord-fraction-line"] {
  width: 100%;
  height: 1px;
  background: var(--grigson-color, currentColor);
}
[part="chord-bass"] {
  font-size: 0.85em;
}
```

Time signature CSS:
```css
[part="time-sig"] {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: var(--grigson-time-sig-font-size, 0.7em);
  font-weight: bold;
  line-height: 1.1;
  margin-right: 0.25em;
  vertical-align: middle;
}
[part="time-sig-num"],
[part="time-sig-den"] {
  display: block;
}
```

---

## Implementation steps

### Step 1 — Update `html.ts`

1. Add `computeGlobalLayout(song)`:
   - Walk all sections → rows → bars, tracking active time sig (default 4/4)
   - Detect Mode 1 vs Mode 2 per bar
   - Build per-row layout arrays: `{ col, span }` for each barline and slot
   - Compute `globalMaxBeats` and `globalMinBeatWidth`
   - Return layout map + `{ beatCols: globalMaxBeats, minBeatWidth: globalMinBeatWidth }`

2. Update `render()`:
   - Call `computeGlobalLayout` first
   - Emit `--beat-cols` and `--min-beat-width` on `part="song"`
   - Pass layout map into section/row rendering functions

3. Rewrite `renderRow()` using layout map:
   - Emit `style="grid-column: C"` on barlines (using `border-left`)
   - Emit `style="grid-column: C / span S"` on slots

4. Update `renderChord()`:
   - Split root into note + accidental; wrap accidental in `chord-accidental` span with ♭/♯
   - Map quality to Unicode symbol; wrap in `chord-quality` span
   - Handle `chord.bass` → fraction layout

5. Emit `/` for dot slots with `part="dot"`

6. Emit time sig in first slot of bar when `bar.timeSignature` is set

7. Update `renderFrontMatter()` → `<header part="song-header">` with title, artist (if present), key (if present, normalised form)

8. Emit section labels as `<h2 part="section-label">` (omit when `section.label === null`)

9. Wrap sections in `<section part="section" style="display: contents">`

10. Remove comment rendering entirely

### Step 2 — Update `html-element.ts`

1. Replace monospace/pre-wrap styles with CSS Grid layout
2. Add `part="song-grid"` styles: global grid, row-gap, subgrid rows
3. Add section spacing: margin-top on section-label, zero for first-child
4. Update all CSS custom properties
5. Add barline variant CSS (double, final, startRepeat, endRepeat, endRepeatStartRepeat)
6. Add chord-quality, chord-accidental, slash chord, dot, time-sig, repeat-count styles
7. Change default font to serif
8. Update dark mode

### Step 3 — Tests

Update existing HTML renderer unit tests. Add tests for:
- Global layout calculation: `globalMaxBeats` and `globalMinBeatWidth` from a multi-section song
- Grid column assignment for rows with mixed beat counts (A Man's A Man chorus: 16/10/12 beat rows)
- Slash chord fraction HTML structure
- Dot slot renders as `/` with `part="dot"`
- Time signature annotation in first slot when `bar.timeSignature` is set
- Unicode symbol output (♭, ♯, △, °, ø)
- `display: contents` on section elements

### Step 4 — Documentation

Update `packages/grigson/documentation/renderer.md`:
- New HTML structure and `part` names reference
- CSS custom properties reference
- Note that HTML renderer uses Unicode notation defaults
- Note font-size adjustment as the mechanism for handling narrow containers

Also note the new normalizer dependency as a separate task to track.

---

## Verification

1. `pnpm test` — all tests pass

2. **`a-mans-a-man-for-all-that.chart`** — time sig changes:
   - Barlines at beats 4, 8, 12, 16 align across all three Chorus rows
   - Row 2 (10 beats) and Row 3 (12 beats) leave trailing empty columns
   - Time sig annotations appear at the correct bars

3. **`disappear.chart`** — 2/4 mid-row:
   - Both Chorus rows are 30 beats; all barlines align
   - The 2/4 bar occupies 2 columns; surrounding 4/4 bars occupy 4

4. **`dont-stop-me-now.chart`** — variable phrase lengths, global beat width:
   - Verse rows (5 bars = 20 beats) fill the full width
   - Chorus rows (4 bars = 16 beats) fill 80% of the width
   - Barlines at beat 4 align between verse and chorus (cross-section alignment)
   - Bars with 4 single-beat chords (`Gm . F C`) constrain `--min-beat-width`

5. **`bones-in-the-ocean.chart`** — 6/8 time and slash chords:
   - 6/8 bars are 6 columns wide; correct proportional width vs 4/4
   - `F/C` renders as fraction layout

6. **`whisper-not.chart`** — complex chords and slash chords:
   - `Am7b5`, `Em7b5` render correctly with `ø` or `m7♭5` suffix
   - `C-/B♭`, `G-/F` render as fraction layout with minor quality

7. **`only-you.chart`** — Mode 2 dot notation:
   - `Eb7 . Ab Abm` renders with `/` for the dot slot
   - Beat spacing correct: each of the 4 slots occupies 1 column

8. Typography across all charts:
   - Accidentals (♭/♯) slightly raised
   - Quality suffixes slightly raised and smaller
   - Time signatures compact stacked fractions
   - Barline variants visually distinct

---

## Out of scope for v1

- **Automatic font scaling** — if the widest row overflows at the default font size, the user adjusts `--grigson-font-size`. Auto-scaling via ResizeObserver is a future enhancement.
- **Music fonts** (e.g. Bravura/SMuFL) — Georgia serif is the default; music fonts are configurable via `--grigson-font-family`.
- **Volta bracket rendering** — not yet in scope.
- **Cross-section box styling** — `display: contents` on sections means section backgrounds/borders are not available. Section spacing is controlled via `--grigson-section-gap` on the label instead.
