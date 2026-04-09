---
layout: base.njk
title: HTML Renderer
permalink: /renderers/html/
---

# HTML Renderer

The HTML renderer produces an HTML string using CSS Grid for layout. It is the default renderer used by the `<grigson-chart>` custom element. Beats are proportionally spaced, barlines align vertically across all rows, and musical Unicode symbols are used throughout.

```javascript
import { parseSong } from 'grigson';
import { HtmlRenderer } from 'grigson/renderers/html';

const song = parseSong(`
---
title: "Autumn Leaves"
key: G
---

[A]
| (4/4) Cm7 | F7 | BbM7 | EbM7 |
| Am7b5 | D7 | Gm | Gm |
`);

const html = new HtmlRenderer().render(song);
document.getElementById('chart').setHTMLUnsafe(html);
```

The config object is a plain JavaScript object. All fields are optional.

---

## Grid layout

### Beat columns and gap columns

The `song-grid` element uses a CSS Grid whose columns follow this template:

```
auto  [beat] [gap]  [beat] [gap]  [beat] [gap] …
```

Specifically, the `grid-template-columns` is:

```css
auto repeat(var(--beat-cols), minmax(var(--min-beat-width), 1fr) auto)
```

This creates two interleaved kinds of column:

- **Beat columns** (even-indexed: 2, 4, 6, …) — hold chord slots. Sized `minmax(--min-beat-width, 1fr)`, so they share available space equally while respecting a per-song minimum width computed from the widest chord.
- **Gap columns** (odd-indexed: 1, 3, 5, …) — hold barlines and time signatures. Sized `auto`, so they collapse to zero when empty and expand to fit their content when filled.

Each row uses `grid-template-columns: subgrid` so all rows share the same column grid. Barlines therefore align vertically across every section, regardless of how the bars are distributed between rows.

### Column addressing

Given a beat offset `k` (0-indexed, measured in beat units), the CSS grid positions are:

| Item                      | CSS column |
| ------------------------- | ---------- |
| Slot starting at beat `k` | `2k + 2`   |
| Barline after beat `k`    | `2k + 1`   |

The slot's `grid-column` span is `2b − 1`, where `b` is the number of beat units the slot occupies. This makes the slot cover its beat columns plus the inner gap columns between them, stopping just before the trailing gap that holds the close barline.

### Barlines and time signatures

Barlines are placed in gap columns as natural-width flex containers. A simple `|` barline is roughly 1.5 px wide; complex glyphs (`:||:`, etc.) are inline SVGs that expand the gap column to their natural width. A time signature annotation, when present, appears as a flex sibling of the barline SVG inside the same gap cell — so a `||: 3/4` opening never overlaps.

### Denominator-aware beat units

The renderer normalises bar widths across mixed-denominator songs. It scans every time signature in the song and picks:

```
beatUnit = max(denominator)  across all time signatures
```

Each bar then gets an effective beat count of `numerator × (beatUnit ÷ denominator)`. This makes bar widths proportional to their actual duration:

| Song contains | `beatUnit` | 4/4 effective beats | 6/8 effective beats | 3/8 effective beats |
| ------------- | ---------- | ------------------- | ------------------- | ------------------- |
| only 4/4      | 4          | 4                   | —                   | —                   |
| only 6/8      | 8          | —                   | 6                   | —                   |
| 4/4 + 6/8     | 8          | **8**               | 6                   | —                   |
| 3/4 + 3/8     | 8          | —                   | 6 (3/4)             | 3                   |

In a purely 4/4 chart nothing changes. In a chart mixing 4/4 and 6/8, the 4/4 bars become eight eighth-note columns wide and the 6/8 bars become six eighth-note columns wide — so the grid accurately represents the relative durations.

### Minimum beat width

`--min-beat-width` is computed from the widest chord in the song. The renderer estimates each chord's display width in `em` units (`EM_PER_CHAR = 0.55`), divides by the number of beat units that chord spans, and takes the maximum across all chords. The result is clamped to a minimum of `1em`. Setting `--min-beat-width` on the `part="song"` element overrides this.

---

## HTML structure

```html
<div part="song" style="--beat-cols: 8; --min-beat-width: 1.80em">

  <header part="song-header">
    <h1 part="song-title">Autumn Leaves</h1>
    <p part="song-key">G major</p>
  </header>

  <div part="song-grid">

    <section part="section" style="display: contents">
      <h2 part="section-label">A</h2>

      <div part="row">

        <!-- gap col 1: open barline + time sig for this bar -->
        <span part="barline barline-single" style="grid-column: 1">
          <span part="time-sig">
            <span part="time-sig-num">𝟒</span>
            <span part="time-sig-den">𝟒</span>
          </span>
        </span>

        <!-- beat col 2–8: Cm7 spanning 4 effective beats (col 2, span 7) -->
        <span part="slot" style="grid-column: 2 / span 7">
          <span part="chord">
            <span part="chord-root">C</span>
            <span part="chord-quality"><small>m</small><sup>7</sup></span>
          </span>
        </span>

        <!-- gap col 9: barline between bars -->
        <span part="barline barline-single" style="grid-column: 9"></span>

        <!-- beat col 10–16: F7 -->
        <span part="slot" style="grid-column: 10 / span 7">…</span>

        <!-- gap col 17: final barline -->
        <span part="barline barline-final" style="grid-column: 17"></span>

      </div>
    </section>

  </div>
</div>
```

A chart mixing 4/4 and 6/8 (beatUnit = 8) would show a 4/4 bar spanning 15 columns (span = 2×8−1) and a 6/8 bar spanning 11 columns (span = 2×6−1), with the beat columns the same width in both rows.

### Slash chord

```html
<span part="chord chord-slash">
  <span part="chord-top">
    <span part="chord-root">A<span part="chord-accidental" data-glyph="unicode">♭</span></span>
    <span part="chord-quality">m</span>
  </span>
  <span part="chord-fraction-line"></span>
  <span part="chord-bass">E<span part="chord-accidental" data-glyph="unicode">♭</span></span>
</span>
```

### Dot slot (beat continuation)

```html
<span part="dot" style="grid-column: 4 / span 1">/</span>
```

### End-repeat with count

```html
<span part="barline barline-endRepeat" style="grid-column: 9">
  <svg …>…</svg>
  <span part="barline-repeat-count">×3</span>
</span>
```

---

## Part names reference

| Part                           | Element     | Description                                                            |
| ------------------------------ | ----------- | ---------------------------------------------------------------------- |
| `song`                         | `<div>`     | Outermost container; carries `--beat-cols` and `--min-beat-width`      |
| `song-header`                  | `<header>`  | Title and key block                                                    |
| `song-title`                   | `<h1>`      | Song title                                                             |
| `song-key`                     | `<p>`       | Key in normalised form (e.g. "F major")                                |
| `song-grid`                    | `<div>`     | CSS Grid container for all rows                                        |
| `section`                      | `<section>` | One section; `display: contents` so children are direct grid items     |
| `section-label`                | `<h2>`      | Section heading (omitted when no label)                                |
| `row`                          | `<div>`     | One row; uses `subgrid`                                                |
| `barline`                      | `<span>`    | Any barline; always combined with a kind part (see below)              |
| `barline-single`               | —           | Plain barline `\|`                                                     |
| `barline-double`               | —           | Double barline `\|\|`                                                  |
| `barline-final`                | —           | Final barline `\|\|.`                                                  |
| `barline-startRepeat`          | —           | Start-repeat `\|\|:`                                                   |
| `barline-endRepeat`            | —           | End-repeat `:\|\|`                                                     |
| `barline-endRepeatStartRepeat` | —           | Turn-around `:\|\|:`                                                   |
| `barline-repeat-count`         | `<span>`    | Repeat count label (e.g. "×3") inside an end-repeat                    |
| `slot`                         | `<span>`    | One chord slot; carries `grid-column` positioning                      |
| `dot`                          | `<span>`    | Beat-continuation mark rendered as `/`                                 |
| `simile`                       | `<span>`    | Single-bar repeat mark; spans the full bar width                       |
| `time-sig`                     | `<span>`    | Stacked time signature fraction                                        |
| `time-sig-num`                 | `<span>`    | Numerator (Math Bold digits U+1D7CE–U+1D7D7)                           |
| `time-sig-den`                 | `<span>`    | Denominator (Math Bold digits U+1D7CE–U+1D7D7)                         |
| `chord`                        | `<span>`    | Chord symbol; gains `chord-slash` when a bass note is present          |
| `chord-root`                   | `<span>`    | Note name                                                              |
| `chord-accidental`             | `<span>`    | Accidental in a root or bass note; `data-glyph="unicode"` or `"ascii"` |
| `chord-quality`                | `<span>`    | Quality suffix                                                         |
| `quality-accidental`           | `<span>`    | Accidental within a quality string                                     |
| `chord-top`                    | `<span>`    | Upper half of a slash chord                                            |
| `chord-fraction-line`          | `<span>`    | Dividing line in a slash chord                                         |
| `chord-bass`                   | `<span>`    | Bass note of a slash chord                                             |

---

## CSS custom properties

Set these on the `<grigson-chart>` element or any ancestor.

| Property                              | Default                        | Description                                     |
| ------------------------------------- | ------------------------------ | ----------------------------------------------- |
| `--grigson-font-family`               | embedded Noto (see `typeface`) | Overrides the entire chart font                 |
| `--grigson-title-font-family`         | inherits                       | Font for the song title                         |
| `--grigson-section-label-font-family` | inherits                       | Font for section labels                         |
| `--grigson-font-size`                 | `1rem`                         | Base font size; reduce to fit narrow containers |
| `--grigson-color`                     | `inherit`                      | Text and barline colour                         |
| `--grigson-background`                | `transparent`                  | Background of the host element                  |
| `--grigson-row-gap`                   | `1.2em`                        | Vertical gap between rows                       |
| `--grigson-section-gap`               | `2em`                          | Top margin before each section label            |
| `--grigson-barline-width`             | `1.5px`                        | Barline stroke width                            |
| `--grigson-barline-color`             | `currentColor`                 | Barline colour                                  |
| `--grigson-title-font-size`           | `1.4em`                        | Font size of the song title                     |
| `--grigson-section-label-font-size`   | `0.9em`                        | Font size of section headings                   |
| `--grigson-time-sig-font-size`        | `1.1em`                        | Font size of time signature annotations         |
| `--grigson-time-sig-line-height`      | `0.55`                         | Line height between numerator and denominator   |
| `--grigson-time-sig-top`              | `50%`                          | Vertical position of the time signature         |

Two additional variables are set by the renderer on `part="song"` and control the grid geometry. You can override them, but the renderer computes the right values automatically:

| Variable           | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `--beat-cols`      | Total beat columns in the grid (beat count of the longest row)  |
| `--min-beat-width` | Minimum width of one beat column, derived from the widest chord |

### Handling narrow containers

The renderer does not auto-scale. If the chart overflows its container, reduce the font size:

```css
grigson-chart {
  --grigson-font-size: 0.8rem;
}
```

All spacing is expressed in `em` units, so the rendered output scales proportionally.

---

## Configuration

```javascript
const config = {
  notation:    { … },
  simile:      { … },
  accidentals: 'unicode',  // 'unicode' | 'ascii'
};
```

### `notation`

Controls chord symbol rendering. Pass an inline partial preset (merged on top of the defaults) or a named preset registered via `definePreset()`.

```javascript
notation: {
  preset: { minor: '-', halfDiminished: 'm7b5' },
  // or a named preset:
  preset: 'realbook',
}
```

See [Notation presets](/grigson/renderers/presets/) for the full reference and built-in presets.

### `simile`

Controls whether consecutive identical bars are collapsed to a repeat mark.

```javascript
simile: {
  // 'longhand'  — always write chords in full (default)
  // 'shorthand' — use a simile mark for repeated bars (after the first bar of each row)
  output: 'longhand',
}
```

The simile mark is an inline SVG. Enable it via config or the `simile-output="shorthand"` attribute on `<grigson-chart>`.

### `accidentals`

Controls whether accidentals are rendered as Unicode glyphs or ASCII characters.

| Value                 | Accidentals | Note                                              |
| --------------------- | ----------- | ------------------------------------------------- |
| `'unicode'` (default) | ♭ ♯         | CSS kerning applied automatically                 |
| `'ascii'`             | b #         | Useful with display fonts lacking good ♭/♯ glyphs |

```javascript
const html = new HtmlRenderer({ accidentals: 'ascii' }).render(song);
```

Or via the custom element attribute:

```html
<grigson-chart>
  <grigson-html-renderer accidentals="ascii"></grigson-html-renderer>
  | Bb7 | Ebmaj7 |
</grigson-chart>
```

### Typeface

Set the `typeface` attribute on `<grigson-html-renderer>` to choose the embedded font.

| Value              | Font           | Style                       |
| ------------------ | -------------- | --------------------------- |
| `"sans"` (default) | Noto Sans      | Clean sans-serif            |
| `"serif"`          | Noto Serif     | Traditional serif           |
| `"cursive"`        | PetalumaScript | Handwritten Real Book style |

```html
<grigson-chart>
  <grigson-html-renderer typeface="cursive"></grigson-html-renderer>
  | C△ | Am7 | Dm7 | G7 |
</grigson-chart>
```

Setting `--grigson-font-family` overrides the font entirely and ignores `typeface`.

---

## Embedded fonts

The custom element injects font subsets as base64 WOFF2 data URIs — no network request, no installation required.

| Family                         | Source                                      | Codepoints                                            |
| ------------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| `GrigsonSans`                  | Noto Sans (© Google, SIL OFL 1.1)           | Latin-1 (U+0000–00FF)                                 |
| `GrigsonSerif`                 | Noto Serif (© Google, SIL OFL 1.1)          | Latin-1 (U+0000–00FF)                                 |
| `GrigsonSans` / `GrigsonSerif` | Noto Sans Symbols 2 (© Google, SIL OFL 1.1) | △ (U+25B3)                                            |
| `GrigsonSans` / `GrigsonSerif` | Bravura (© Steinberg, SIL OFL 1.1)          | ♭ ♯ (U+266D, U+266F)                                  |
| `GrigsonTimeSig`               | Bravura                                     | Math Bold digits U+1D7CE–U+1D7D7 (used by `time-sig`) |
| `GrigsonCursive`               | PetalumaScript (© Steinberg, SIL OFL 1.1)   | Latin-1, ♭ ♯, Math Bold digits                        |

The families are composed using CSS `unicode-range`, so each codepoint is served from the most appropriate source. Users who supply their own font via `--grigson-font-family` bypass the embedded fonts entirely.
