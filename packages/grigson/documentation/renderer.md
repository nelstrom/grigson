# Renderer Documentation

Grigson separates parsing from rendering. The parser reads a `.chart` source file and produces an abstract song tree. A renderer takes that tree and produces output — plain text, SVG, or other formats. Other renderers can be created by implementing the same interface.

---

## The Plain Text Renderer

The plain text renderer is the simplest renderer, and the best starting point for understanding the grigson pipeline. It takes a parsed song tree and produces a `.chart` file as output — making it, at its most basic, a round-trip identity function: parse a chart, then render it back to text.

This becomes genuinely useful when combined with transposition. You can author a chart in one key, then use the plain text renderer to produce a transposed version as a new `.chart` file:

```javascript
import { parse } from 'grigson/parser';
import { TextRenderer } from 'grigson/renderers/text';

const source = `
---
title: "Autumn Leaves"
key: G
---

[A]
| (4/4) Cm7 | F7 | BbM7 | EbM7 |
| Am7b5 | D7 | Gm | Gm |
`;

const song = parse(source);

// Identity: renders back to the same .chart format
const inG = new TextRenderer().render(song);

// Transposed up a tone to A
const inA = new TextRenderer({ transpose: { toKey: 'A' } }).render(song);

// Using an inline notation preset
const ascii = new TextRenderer({ notation: { preset: { flat: 'b', sharp: '#', halfDiminished: 'm7b5' } } }).render(song);
```

The plain text renderer supports notation presets to control chord symbols. See the [Notation Presets](#notation) section for details.

---

## The HTML Renderer

The HTML renderer produces an HTML string using CSS Grid for layout. It is the default renderer used by the `<grigson-chart>` custom element. Beats are equally spaced, barlines align vertically across all rows in the song, and musical Unicode symbols are used throughout.

### Embedded font

The custom element embeds a subset of [Bravura](https://github.com/steinbergmedia/bravura) (© Steinberg Media Technologies, SIL Open Font License 1.1) as a base64-encoded WOFF2 in the injected `<style>` block. This subset covers the SMuFL time-signature glyphs and simile marks only; no network request is made and no font installation is required. The Bravura font family is applied only to `[part="time-sig"]` and `[part="simile"]` elements — all other text continues to use the host-page font stack.

```javascript
import { parseSong } from 'grigson';
import { HtmlRenderer } from 'grigson/renderers/html';

const song = parseSong('| C | Am |');
const renderer = new HtmlRenderer({ notation: { preset: { minor: '-' } } });
const html = renderer.render(song);
```

Elements use `part` attributes so they can be styled via the CSS `::part()` pseudo-element.

### HTML structure

The renderer produces a hierarchy of elements, each with a `part` attribute:

```html
<div part="song" style="--beat-cols: 8; --min-beat-width: 1.8em">

  <header part="song-header">
    <h1 part="song-title">Autumn Leaves</h1>
    <p part="song-artist">Joseph Kosma</p>   <!-- omitted when null -->
    <p part="song-key">G major</p>           <!-- omitted when null; normalised form -->
  </header>

  <div part="song-grid">

    <section part="section" style="display: contents">
      <h2 part="section-label">Verse</h2>   <!-- omitted when section has no label -->

      <div part="row">
        <!-- open barline -->
        <span part="barline barline-single" style="grid-column: 1"></span>

        <!-- bar 1: 4/4, 2 chords → 2 beats each -->
        <!-- time-sig shown because bar.timeSignature is set on this bar -->
        <span part="slot" style="grid-column: 2 / span 2">
          <span part="time-sig">
            <!-- SMuFL digits: U+E084 = 4, rendered in Bravura font -->
            <span part="time-sig-num">&#xE084;</span>
            <span part="time-sig-den">&#xE084;</span>
          </span>
          <span part="chord"><span part="chord-root">C</span></span>
        </span>
        <span part="slot" style="grid-column: 4 / span 2">
          <span part="chord">
            <span part="chord-root">A<span part="chord-accidental">♭</span></span>
            <span part="chord-quality">m</span>
          </span>
        </span>

        <!-- barline after bar 1 -->
        <span part="barline barline-single" style="grid-column: 5"></span>

        <!-- final barline -->
        <span part="barline barline-final" style="grid-column: 9"></span>
      </div>
    </section>

  </div>
</div>
```

The `song-grid` element defines a CSS Grid whose column count equals the longest row in the song (`--beat-cols`). All rows use `subgrid`, so barlines align vertically across every section.

#### Slash chord

```html
<span part="chord chord-slash">
  <span part="chord-top">
    <span part="chord-root">A<span part="chord-accidental">♭</span></span>
    <span part="chord-quality">m</span>
  </span>
  <span part="chord-fraction-line"></span>
  <span part="chord-bass">E<span part="chord-accidental">♭</span></span>
</span>
```

#### Dot slot (beat continuation)

```html
<span part="dot" style="grid-column: 5 / span 1">/</span>
```

#### Barline with repeat count

```html
<span part="barline barline-endRepeat">
  <span part="barline-repeat-count">×3</span>
</span>
```

### Part names reference

| Part value                     | Element     | Description                                                                     |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| `song`                         | `<div>`     | Outermost container; carries `--beat-cols` and `--min-beat-width` CSS variables |
| `song-header`                  | `<header>`  | Title, artist, and key block                                                    |
| `song-title`                   | `<h1>`      | Song title from front matter                                                    |
| `song-artist`                  | `<p>`       | Artist from front matter (omitted when null)                                    |
| `song-key`                     | `<p>`       | Key in normalised form, e.g. "F major", "A♭ major" (omitted when null)          |
| `song-grid`                    | `<div>`     | CSS Grid container for all rows                                                 |
| `section`                      | `<section>` | One section; always `display: contents` so children become direct grid items    |
| `section-label`                | `<h2>`      | Section heading, e.g. "Verse" (omitted when section has no label)               |
| `row`                          | `<div>`     | One row of bars; uses `subgrid`                                                 |
| `barline`                      | `<span>`    | Any barline; always combined with a barline-kind part (see below)               |
| `barline-single`               | —           | Plain barline `\|`                                                              |
| `barline-double`               | —           | Double barline `\|\|`                                                           |
| `barline-final`                | —           | Final barline `\|\|.`                                                           |
| `barline-startRepeat`          | —           | Start-repeat barline `\|\|:`                                                    |
| `barline-endRepeat`            | —           | End-repeat barline `:\|\|`                                                      |
| `barline-endRepeatStartRepeat` | —           | Turn-around barline `:\|\|:`                                                    |
| `barline-repeat-count`         | `<span>`    | Repeat count label, e.g. "×3", inside an end-repeat barline                     |
| `slot`                         | `<span>`    | One chord slot; carries `grid-column` positioning                               |
| `dot`                          | `<span>`    | A beat-continuation dot rendered as `/`                                         |
| `simile`                       | `<span>`    | Single-bar repeat mark (SMuFL U+E1E7 from Bravura); spans the full bar width    |
| `time-sig`                     | `<span>`    | Time signature stacked fraction; uses Bravura font for SMuFL digit glyphs       |
| `time-sig-num`                 | `<span>`    | Numerator of the time signature (SMuFL codepoints U+E080–E089)                  |
| `time-sig-den`                 | `<span>`    | Denominator of the time signature (SMuFL codepoints U+E080–E089)                |
| `chord`                        | `<span>`    | A chord symbol; gains `chord-slash` when a bass note is present                 |
| `chord-slash`                  | —           | Additional part on `chord` when the chord has a bass note                       |
| `chord-top`                    | `<span>`    | Upper half of a slash chord (root + quality)                                    |
| `chord-root`                   | `<span>`    | Note name, e.g. "C" or "B"                                                      |
| `chord-accidental`             | `<span>`    | Accidental inside a root, rendered as ♭ or ♯                                    |
| `chord-quality`                | `<span>`    | Quality suffix, e.g. "m", "△", "ø"                                              |
| `chord-fraction-line`          | `<span>`    | Horizontal rule between numerator and bass in a slash chord                     |
| `chord-bass`                   | `<span>`    | Bass note of a slash chord                                                      |

### Unicode notation defaults

The HTML renderer uses Unicode symbols by default regardless of the `notation` config:

| Symbol type      | Rendered as | Unicode |
| ---------------- | ----------- | ------- |
| Flat accidental  | ♭           | U+266D  |
| Sharp accidental | ♯           | U+266F  |
| Major seventh    | △           | U+25B3  |
| Diminished       | °           | U+00B0  |
| Half-diminished  | ø           | U+00F8  |

Minor chords use `m` by default; passing `{ minor: '-' }` as an inline preset changes this to `-`.

### Handling narrow containers

The renderer does not auto-scale. If the chart overflows its container, reduce the font size:

```css
grigson-chart {
  --grigson-font-size: 0.8rem;
}
```

Decreasing `--grigson-font-size` shrinks the rendered output proportionally since all spacing is expressed in `em` units.

### CSS custom properties

These properties can be set on the `<grigson-chart>` element (or any ancestor) to control the appearance:

| Property                            | Default                             | Description                                                    |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `--grigson-font-family`             | `Georgia, 'Times New Roman', serif` | Font family for the entire chart                               |
| `--grigson-font-size`               | `1rem`                              | Base font size; reduce to fit narrow containers                |
| `--grigson-color`                   | `inherit`                           | Text and barline colour                                        |
| `--grigson-background`              | `transparent`                       | Background of the host element                                 |
| `--grigson-row-gap`                 | `1.2em`                             | Vertical gap between rows within a section                     |
| `--grigson-section-gap`             | `2em`                               | Top margin before each section label                           |
| `--grigson-barline-width`           | `1.5px`                             | Stroke width of barlines                                       |
| `--grigson-barline-color`           | `currentColor`                      | Colour of barlines                                             |
| `--grigson-repeat-dot-size`         | `0.3em`                             | Size of repeat dots                                            |
| `--grigson-title-font-size`         | `1.4em`                             | Font size of the song title                                    |
| `--grigson-section-label-font-size` | `0.9em`                             | Font size of section headings                                  |
| `--grigson-time-sig-font-size`      | `1.1em`                             | Font size of time signature annotations (Bravura SMuFL glyphs) |

Two additional variables are emitted by the renderer onto `part="song"` and control the grid geometry. You can override them, but normally the renderer computes the right values automatically:

| Variable           | Description                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `--beat-cols`      | Total number of beat columns in the global grid (equals the beat count of the longest row) |
| `--min-beat-width` | Minimum width of one beat column, computed from the widest chord in the song               |

### Normalizer requirement

Time signature annotations are shown only when `bar.timeSignature` is set on a bar. For songs with a uniform declared meter (e.g. `meter: 4/4` in the front matter), the normalizer sets `bar.timeSignature` on the first bar of the song so that the time signature annotation appears at the start of the chart. Without this, no time signature is shown even if the song has a declared meter.

---

## The SVG Renderer

The SVG renderer produces an SVG string suitable for embedding in an HTML page.

```javascript
import { parse } from 'grigson/parser';
import { SvgRenderer } from 'grigson/renderers/svg';

const source = `
---
title: "Autumn Leaves"
key: G
---

[A]
| (4/4) Cm7 | F7 | BbM7 | EbM7 |
| Am7b5 | D7 | Gm | Gm |
`;

const song = parse(source);
const renderer = new SvgRenderer(config);
const svg = renderer.render(song);

document.getElementById('chart').setHTMLUnsafe(svg);
```

The `config` object is a plain JavaScript object (POJO). All fields are optional; omitting a field uses the default value.

---

## Configuration Reference

```javascript
const config = {
  transpose: { ... },
  notation:  { ... },
  simile:    { ... },
  repeats:   { ... },
  layout:    { ... },
};
```

### Styling with CSS

Because the output is SVG, fonts and colours are controlled via CSS rather than through renderer configuration. The SVG renderer applies class names to its elements so they can be targeted from a stylesheet:

| Element                            | Class                     |
| ---------------------------------- | ------------------------- |
| Chord root (e.g. the "C" in "Cm7") | `.grigson-chord-root`     |
| Chord suffix (e.g. "m7" in "Cm7")  | `.grigson-chord-suffix`   |
| Section label (e.g. "Verse")       | `.grigson-section-label`  |
| Time signature                     | `.grigson-time-signature` |
| Volta bracket label (e.g. "1.")    | `.grigson-volta-label`    |

Example:

```css
.grigson-chord-root {
  font-family: serif;
  font-size: 18px;
  font-weight: bold;
}
.grigson-chord-suffix {
  font-family: serif;
  font-size: 14px;
}
.grigson-section-label {
  font-family: sans-serif;
  font-size: 13px;
  font-weight: bold;
}
```

### `transpose`

Controls transposition. Transposition is a renderer concern: the source file always describes the song in its original key, and the renderer is responsible for shifting the output.

The source key is read from the chart's front matter (`key:` field) and from per-section `key:` annotations. If no source key is specified, chords are rendered as written.

```javascript
transpose: {
  // Transpose to a named target key.
  // Grigson computes the interval from the source key automatically.
  // Either 'toKey' or 'semitones' may be specified, not both.
  toKey: 'A',

  // Or: transpose by a fixed interval in semitones.
  // Positive = up, negative = down.
  semitones: 2,

  // When the transposed key is ambiguous (e.g. F# vs Gb),
  // prefer flats or sharps in the output.
  // 'auto' uses the key signature of the target key.
  accidentals: 'auto', // 'auto' | 'flats' | 'sharps'
}
```

#### Transposition examples

Suppose the source chart is in G. All of the following renderer configs produce the same chart, written in A:

```javascript
// Option 1: name the target key
{
  transpose: {
    toKey: 'A';
  }
}

// Option 2: specify the interval
{
  transpose: {
    semitones: 2;
  }
}
```

If the source chart has per-section key overrides, transposition applies to each section independently. For example, if verse is in `Eb` and chorus is in `Ab`, and you transpose `toKey: 'F'`, the verse will render in F and the chorus in Bb.

If `toKey` matches the source key (or `semitones` is 0), no transposition occurs.

#### Common transposition use cases

| Use case                               | Config               |
| -------------------------------------- | -------------------- |
| Concert pitch (no transposition)       | _(omit `transpose`)_ |
| Bb instrument (e.g. trumpet, clarinet) | `{ semitones: 2 }`   |
| Eb instrument (e.g. alto sax)          | `{ semitones: -3 }`  |
| Guitar capo 2                          | `{ semitones: -2 }`  |
| Guitar capo 4                          | `{ semitones: -4 }`  |

---

### `notation`

Controls how chord symbols are written in the output. A `NotationPreset` object maps each chord quality to a string suffix. You can pass a preset inline as an object (merged on top of the defaults), or pass a named preset registered via `definePreset()`.

```javascript
notation: {
  // Inline partial preset — merged on top of DEFAULT_PRESET.
  preset: { minor: '-', flat: 'b', sharp: '#' },

  // Or a named preset registered via definePreset().
  preset: 'myPreset',
}
```

#### `NotationPreset` schema

The keys of `NotationPreset` correspond exactly to the parser's `Quality` enum names, plus `flat` and `sharp` for accidentals.

| Field            | Type     | Description                                           |
| ---------------- | -------- | ----------------------------------------------------- |
| `major`          | `string` | Suffix for plain major triads (e.g. `C`)              |
| `minor`          | `string` | Suffix for minor chords (e.g. `Cm`)                   |
| `dominant7`      | `string` | Suffix for dominant seventh chords (e.g. `C7`)        |
| `halfDiminished` | `string` | Suffix for half-diminished / min7♭5 (e.g. `Cø`)       |
| `diminished`     | `string` | Suffix for diminished triads (e.g. `C°`)              |
| `maj7`           | `string` | Suffix for major seventh chords (e.g. `C△`)           |
| `min7`           | `string` | Suffix for minor seventh chords (e.g. `Cm7`)          |
| `dim7`           | `string` | Suffix for diminished seventh chords (e.g. `C°7`)     |
| `dom7flat5`      | `string` | Suffix for dominant seventh flat-five (e.g. `C7♭5`)   |
| `flat`           | `string` | Symbol used for flat accidentals in roots (e.g. `♭`)  |
| `sharp`          | `string` | Symbol used for sharp accidentals in roots (e.g. `♯`) |

#### `DEFAULT_PRESET` values

| Field            | Default value    |
| ---------------- | ---------------- |
| `major`          | `''`             |
| `minor`          | `'m'`            |
| `dominant7`      | `'7'`            |
| `halfDiminished` | `'<sup>Ø</sup>'` |
| `diminished`     | `'°'`            |
| `maj7`           | `'△'`            |
| `min7`           | `'m7'`           |
| `dim7`           | `'°7'`           |
| `dom7flat5`      | `'7♭5'`          |
| `flat`           | `'♭'`            |
| `sharp`          | `'♯'`            |

#### HTML renderer and `<sup>`/`<sub>` tags

The HTML renderer passes preset suffix values directly into the rendered HTML, so suffixes may contain `<sup>` and `<sub>` tags for superscript and subscript notation. For example, a preset value of `'m<sup>7</sup>'` renders as `Cm` with a superscript 7.

The text renderer strips any HTML tags from preset values before output, so the same preset works across both renderers.

> **Security note:** preset values are interpolated into HTML output without sanitization. Only use preset values from trusted sources. See the [Named presets](#named-presets-via-grigsonpresets) section for how to register presets safely in a browser context.

#### Inline preset example

An inline preset is a plain object with any subset of `NotationPreset` fields. Unspecified fields fall back to `DEFAULT_PRESET`.

```javascript
import { parseSong } from 'grigson';
import { TextRenderer } from 'grigson/renderers/text';

const song = parseSong('| Cm7 | F7 | BbM7 | Dm7b5 |');

// ASCII accidentals, m7b5 spelling
const text = new TextRenderer({
  notation: {
    preset: {
      flat: 'b',
      sharp: '#',
      halfDiminished: 'm7b5',
    },
  },
}).render(song);
// → | Cm7 | F7 | BbM7 | Dm7b5 |
```

#### Named presets via `grigson/presets`

For browser and custom-element contexts, you can register a named preset once and refer to it by name from any renderer or `<grigson-chart>` element.

```javascript
import { definePreset } from 'grigson/presets';

// Register a custom preset at app startup
definePreset('ascii', {
  flat: 'b',
  sharp: '#',
  halfDiminished: 'm7b5',
  diminished: 'dim',
  dim7: 'dim7',
});

// Use by name in a renderer
import { HtmlRenderer } from 'grigson/renderers/html';
const html = new HtmlRenderer({ notation: { preset: 'ascii' } }).render(song);
```

```html
<!-- Or use by name in the custom element attribute -->
<grigson-chart notation-preset="ascii">
  | Cm7 | F7 | BbM7 |
</grigson-chart>
```

Two presets are built-in and always available without registration:

| Name         | Description                                                                     |
| ------------ | ------------------------------------------------------------------------------- |
| `'default'`  | Unicode glyphs (♭ ♯ ø ° △) — corresponds to `DEFAULT_PRESET`                    |
| `'realbook'` | Real Book dialect: `MI`, `MA7`, `DIM.`, etc. — corresponds to `REALBOOK_PRESET` |

#### CLI flags

The `grigson-html-renderer` CLI accepts the following flags for controlling notation and simile rendering:

```bash
# Use a named preset (must be pre-registered — useful when extending the CLI)
grigson-html-renderer --notation-preset myPreset chart.chart

# Load a partial NotationPreset from a JSON file (merged on top of DEFAULT_PRESET)
grigson-html-renderer --notation-preset-file ./my-preset.json chart.chart

# Render repeated bars as simile marks instead of writing them out in full
grigson-html-renderer --simile-output shorthand chart.chart
```

The `--notation-preset-file` flag reads a JSON file whose contents are treated as a `Partial<NotationPreset>`. Only the fields you specify are overridden; all others fall back to `DEFAULT_PRESET`.

Example `my-preset.json`:

```json
{
  "flat": "b",
  "sharp": "#",
  "halfDiminished": "m7b5"
}
```

---

### `simile`

Controls whether repeated bars are rendered as simile symbols or written out in full.

The source format and the rendered output are independent. Both of the following parse to the same AST:

```
| C | C | C | C |     ← longhand
| C | % | % | % |     ← shorthand
```

The renderer then decides which form to use in the output, regardless of which form was in the source. One fixed rule always applies: **the first bar of a new row is always rendered in full — never as a simile mark**. Simile marks may only appear from the second bar of a row onwards.

```javascript
simile: {
  // 'shorthand' — use a simile mark for consecutive identical bars (after the first bar of each row).
  // 'longhand'  — always write chords out in full (default).
  output: 'longhand',
}
```

**Text renderer**: simile marks are rendered as `%`.

**HTML renderer**: simile marks are rendered using the Bravura SMuFL glyph U+E1E7 (the standard one-bar repeat slash mark). The bar is replaced by a `<span part="simile">` element spanning the full bar width. Enable it with `simile: { output: 'shorthand' }` in the renderer config, or with the `simile-output="shorthand"` attribute on `<grigson-chart>`.

```html
<grigson-chart simile-output="shorthand">
  | C | Am | C | Am |
</grigson-chart>
```

### `repeats`

Controls whether repeat barlines and volta brackets are rendered as written or expanded into linear (through-composed) form.

```javascript
repeats: {
  // 'repeat'  — render ||: :|| and volta brackets as written.
  // 'expand'  — unroll all repeats into a fully written-out linear sequence.
  output: 'repeat', // default
}
```

When `output: 'expand'`, a passage like:

```
||: Am | G |[1.] F | G :||
[2.] F | C ||.
```

is rendered as:

```
| Am | G | F | G |
| Am | G | F | C ||.
```

---

### `layout`

Controls spacing and geometry.

```javascript
layout: {
  // Width of the rendered output in pixels.
  // The renderer fits as much content as possible into this width.
  width: 800,

  // Padding inside the outer boundary of the chart.
  padding: { top: 24, right: 24, bottom: 24, left: 24 },

  // Height of each measure row.
  rowHeight: 64,

  // Vertical gap between rows within the same section.
  rowGap: 8,

  // Vertical gap between sections.
  sectionGap: 24,

  // Minimum width of a single bar (in pixels).
  // Bars will never be narrower than this, regardless of content.
  minBarWidth: 48,
}
```

---

## Rendering the Same Chart Multiple Ways

Because transposition and notation are renderer concerns, the same parsed song tree can be rendered into multiple output variations without re-parsing. This works across renderer types too — you can produce a transposed `.chart` file with the text renderer and an SVG with the SVG renderer from the same parse result:

```javascript
const song = parse(source);

// Transposed .chart file for a Bb instrument
const bbChart = new TextRenderer({ transpose: { semitones: 2 } }).render(song);

// Concert pitch SVG for the music stand
const concertSvg = new SvgRenderer({ notation: { preset: 'default' } }).render(song);

// Transposed SVG for a guitarist with capo 2
const capoSvg = new SvgRenderer({ transpose: { semitones: -2 } }).render(song);
```

---

## Creating a Custom Renderer

A renderer is any object with a `render(song)` method. The method receives the parsed song tree and returns whatever output format the renderer targets.

```javascript
class MyRenderer {
  constructor(config = {}) {
    this.config = config;
  }

  render(song) {
    // Walk the song tree and produce output.
    // song.title       — from front matter, or null
    // song.key         — from front matter, or null
    // song.sections    — array of Section objects
    //   section.label  — e.g. "Verse", or null if unlabelled
    //   section.rows   — array of Row objects
    //     row.bars     — array of Bar objects
    //       bar.slots           — array of BeatSlot (ChordSlot | DotSlot)
    //       bar.timeSignature   — { numerator, denominator } or undefined
  }
}
```
