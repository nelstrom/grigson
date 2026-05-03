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

### Embedded fonts

The custom element embeds font subsets as base64-encoded WOFF2 data URIs in the injected `<style>` block. No network request is made and no font installation is required.

**Noto Sans / Noto Serif** (© Google LLC, SIL Open Font License 1.1) provide the default body typeface. A Latin-1 subset (U+0000–U+00FF) is embedded for each variant, covering all Western European characters needed for chord names, song titles, and section labels. These fonts use lining figures (digits that sit on the baseline), which is important for chord extensions and superscripted/subscripted numerals.

**Noto Sans Symbols 2** (© Google LLC, SIL Open Font License 1.1) supplies the △ glyph (U+25B3, used for major-seventh chords). Geometric shapes are typeface-agnostic, so a single Symbols 2 subset is shared between the sans and serif variants.

**Bravura** (© Steinberg Media Technologies, SIL Open Font License 1.1) supplies:

- ♭ and ♯ (U+266D, U+266F) for accidentals in chord names
- Math Bold digits (U+1D7CE–U+1D7D7, 𝟎–𝟗) used by `[part="time-sig"]` via the `GrigsonTimeSig` @font-face
- SMuFL simile marks (U+E1E7–U+E1E8) used by `[part="simile"]`

**PetalumaScript** (© Steinberg Media Technologies GmbH, SIL Open Font License 1.1) is a handwritten Real Book-style text font. A Latin-1 subset is embedded, including ♭ and ♯ which this font provides natively at standard Unicode positions.

The subsets are composed into logical font families (`GrigsonSans`, `GrigsonSerif`, `GrigsonJazz`) using CSS `unicode-range`, so each codepoint is served from the most appropriate source transparently. Users who supply their own font via `--grigson-font-family` bypass the embedded fonts entirely.

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
            <!-- Math Bold digits: U+1D7D2 = 𝟒, rendered via GrigsonTimeSig @font-face -->
            <span part="time-sig-num">𝟒</span>
            <span part="time-sig-den">𝟒</span>
          </span>
          <span part="chord"><span part="chord-root">C</span></span>
        </span>
        <span part="slot" style="grid-column: 4 / span 2">
          <span part="chord">
            <span part="chord-root">A<span part="chord-accidental" data-glyph="unicode">♭</span></span>
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
    <span part="chord-root">A<span part="chord-accidental" data-glyph="unicode">♭</span></span>
    <span part="chord-quality">m</span>
  </span>
  <span part="chord-fraction-line"></span>
  <span part="chord-bass">E<span part="chord-accidental" data-glyph="unicode">♭</span></span>
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

| Part value                     | Element     | Description                                                                                                        |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `song`                         | `<div>`     | Outermost container; carries `--beat-cols` and `--min-beat-width` CSS variables                                    |
| `song-header`                  | `<header>`  | Title, artist, and key block                                                                                       |
| `song-title`                   | `<h1>`      | Song title from front matter                                                                                       |
| `song-artist`                  | `<p>`       | Artist from front matter (omitted when null)                                                                       |
| `song-key`                     | `<p>`       | Key in normalised form, e.g. "F major", "A♭ major" (omitted when null)                                             |
| `song-grid`                    | `<div>`     | CSS Grid container for all rows                                                                                    |
| `section`                      | `<section>` | One section; always `display: contents` so children become direct grid items                                       |
| `section-label`                | `<h2>`      | Section heading, e.g. "Verse" (omitted when section has no label)                                                  |
| `row`                          | `<div>`     | One row of bars; uses `subgrid`                                                                                    |
| `barline`                      | `<span>`    | Any barline; always combined with a barline-kind part (see below)                                                  |
| `barline-single`               | —           | Plain barline `\|`                                                                                                 |
| `barline-double`               | —           | Double barline `\|\|`                                                                                              |
| `barline-final`                | —           | Final barline `\|\|.`                                                                                              |
| `barline-startRepeat`          | —           | Start-repeat barline `\|\|:`                                                                                       |
| `barline-endRepeat`            | —           | End-repeat barline `:\|\|`                                                                                         |
| `barline-endRepeatStartRepeat` | —           | Turn-around barline `:\|\|:`                                                                                       |
| `barline-repeat-count`         | `<span>`    | Repeat count label, e.g. "×3", inside an end-repeat barline                                                        |
| `slot`                         | `<span>`    | One chord slot; carries `grid-column` positioning                                                                  |
| `dot`                          | `<span>`    | A beat-continuation dot rendered as `/`                                                                            |
| `simile`                       | `<span>`    | Single-bar repeat mark (SMuFL U+E1E7 from Bravura); spans the full bar width                                       |
| `time-sig`                     | `<span>`    | Time signature stacked fraction; uses the `GrigsonTimeSig` @font-face for digit glyphs                             |
| `time-sig-num`                 | `<span>`    | Numerator of the time signature (Math Bold digits U+1D7CE–U+1D7D7, e.g. 𝟎–𝟗)                                       |
| `time-sig-den`                 | `<span>`    | Denominator of the time signature (Math Bold digits U+1D7CE–U+1D7D7, e.g. 𝟎–𝟗)                                     |
| `chord`                        | `<span>`    | A chord symbol; gains `chord-slash` when a bass note is present                                                    |
| `chord-slash`                  | —           | Additional part on `chord` when the chord has a bass note                                                          |
| `chord-top`                    | `<span>`    | Upper half of a slash chord (root + quality)                                                                       |
| `chord-root`                   | `<span>`    | Note name, e.g. "C" or "B"                                                                                         |
| `chord-accidental`             | `<span>`    | Accidental inside a root or bass note; carries `data-glyph="unicode"` or `data-glyph="ascii"`                      |
| `chord-quality`                | `<span>`    | Quality suffix, e.g. "m", "△", "ø"                                                                                 |
| `quality-accidental`           | `<span>`    | Accidental within a quality string (e.g. the ♭ in `7(♭5)`); carries `data-glyph="unicode"` or `data-glyph="ascii"` |
| `chord-fraction-line`          | `<span>`    | Separator between chord and bass; carries `data-slash-style` matching the renderer setting                         |
| `chord-bass`                   | `<span>`    | Bass note of a slash chord                                                                                         |

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

| Property                              | Default                        | Description                                                                    |
| ------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `--grigson-font-family`               | embedded Noto (see `typeface`) | Overrides the entire chart font; bypasses the embedded Noto fonts              |
| `--grigson-title-font-family`         | inherits chart font            | Font family for the song title; inherits from `--grigson-font-family` if unset |
| `--grigson-section-label-font-family` | inherits chart font            | Font family for section labels; inherits from `--grigson-font-family` if unset |
| `--grigson-font-size`                 | `1rem`                         | Base font size; reduce to fit narrow containers                                |
| `--grigson-color`                     | `inherit`                      | Text and barline colour                                                        |
| `--grigson-background`                | `transparent`                  | Background of the host element                                                 |
| `--grigson-row-gap`                   | `1.2em`                        | Vertical gap between rows within a section                                     |
| `--grigson-section-gap`               | `2em`                          | Top margin before each section label                                           |
| `--grigson-barline-width`             | `1.5px`                        | Stroke width of barlines                                                       |
| `--grigson-barline-color`             | `currentColor`                 | Colour of barlines                                                             |
| `--grigson-repeat-dot-size`           | `0.3em`                        | Size of repeat dots                                                            |
| `--grigson-title-font-size`           | `1.4em`                        | Font size of the song title                                                    |
| `--grigson-section-label-font-size`   | `0.9em`                        | Font size of section headings                                                  |
| `--grigson-time-sig-font-size`        | `1.1em`                        | Font size of time signature annotations                                        |
| `--grigson-time-sig-line-height`      | `0.55`                         | Line height between numerator and denominator digits                           |
| `--grigson-time-sig-top`              | `37%`                          | Vertical position: `50%` = centred, lower values shift up                      |
| `--grigson-simile-font-size`          | `1.2em`                        | Font size of the simile glyph (U+E1E7) inside `[part="simile"]`                |
| `--grigson-barline-font-size`         | `2em`                          | Font size of barline glyphs (SMuFL U+E030–E042) inside `[part^="barline"]`     |

The time-sig variables have typeface-specific defaults: cursive uses `0.6em` / `1.1` / `40%`. They can be overridden on `grigson-html-renderer` for custom fonts:

```css
/* Tune time-sig layout for a custom font loaded via --grigson-font-family */
grigson-html-renderer {
  --grigson-time-sig-font-size: 1.0em;
  --grigson-time-sig-line-height: 0.6;
  --grigson-time-sig-top: 48%;
}
```

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
  preset: { minor: '-' },

  // Or a named preset registered via definePreset().
  preset: 'myPreset',
}
```

#### `NotationPreset` schema

The keys of `NotationPreset` correspond to the parser's `Quality` enum names. Each value is the string suffix appended after the chord root. Values may contain `<sup>`, `<sub>`, or `<small>` tags for the HTML renderer; the text renderer strips tags automatically.

**Accidentals within quality strings** (e.g. the ♭ in `7(♭5)`) must be written as unicode symbols — ♭ (U+266D) and ♯ (U+266F). The renderer transforms them at render time according to the `accidentals` setting.

| Field            | Type     | Description                                              |
| ---------------- | -------- | -------------------------------------------------------- |
| `major`          | `string` | Suffix for plain major triads (e.g. `C`)                 |
| `minor`          | `string` | Suffix for minor chords (e.g. `Cm`)                      |
| `dominant7`      | `string` | Suffix for dominant seventh chords (e.g. `C7`)           |
| `halfDiminished` | `string` | Suffix for half-diminished / min7♭5 (e.g. `Cø`)          |
| `diminished`     | `string` | Suffix for diminished triads (e.g. `C°`)                 |
| `maj7`           | `string` | Suffix for major seventh chords (e.g. `C△`)              |
| `min7`           | `string` | Suffix for minor seventh chords (e.g. `Cm7`)             |
| `dim7`           | `string` | Suffix for diminished seventh chords (e.g. `C°7`)        |
| `dom7flat5`      | `string` | Suffix for dominant seventh flat-five (e.g. `C7♭5`)      |
| `dom9`           | `string` | Suffix for dominant ninth chords (e.g. `C9`)             |
| `dom11`          | `string` | Suffix for dominant eleventh chords (e.g. `C11`)         |
| `dom13`          | `string` | Suffix for dominant thirteenth chords (e.g. `C13`)       |
| `dom7flat9`      | `string` | Suffix for dominant 7♭9 (e.g. `C7♭9`)                    |
| `dom7sharp9`     | `string` | Suffix for dominant 7♯9 (e.g. `C7♯9`)                    |
| `dom7sharp5`     | `string` | Suffix for dominant 7♯5 / augmented seventh (e.g. `C+7`) |
| `dom7flat13`     | `string` | Suffix for dominant 7♭13 (e.g. `C7♭13`)                  |
| `sus4`           | `string` | Suffix for suspended fourth chords (e.g. `Csus4`)        |
| `sus2`           | `string` | Suffix for suspended second chords (e.g. `Csus2`)        |
| `add6`           | `string` | Suffix for added sixth chords (e.g. `C6`)                |

#### `DEFAULT_PRESET` values

| Field            | Default value                      |
| ---------------- | ---------------------------------- |
| `major`          | `''`                               |
| `minor`          | `'<small>m</small>'`               |
| `dominant7`      | `'<sup>7</sup>'`                   |
| `halfDiminished` | `'<sup><small>ø</small></sup>'`    |
| `diminished`     | `'<sup><small>o</small></sup>'`    |
| `maj7`           | `'<sup><small>△</small></sup>'`    |
| `min7`           | `'<small>m</small><sup>7</sup>'`   |
| `dim7`           | `'<sup><small>o</small>7</sup>'`   |
| `dom7flat5`      | `'<sup>7♭5</sup>'`                 |
| `dom9`           | `'<sup>9</sup>'`                   |
| `dom11`          | `'<sup>11</sup>'`                  |
| `dom13`          | `'<sup>13</sup>'`                  |
| `dom7flat9`      | `'<sup>7♭9</sup>'`                 |
| `dom7sharp9`     | `'<sup>7♯9</sup>'`                 |
| `dom7sharp5`     | `'<sup>7♯5</sup>'`                 |
| `dom7flat13`     | `'<sup>7♭13</sup>'`                |
| `sus4`           | `'<sup><small>sus4</small></sup>'` |
| `sus2`           | `'<sup><small>sus2</small></sup>'` |
| `add6`           | `'<sup>6</sup>'`                   |

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

// Custom m7b5 spelling
const text = new TextRenderer({
  notation: {
    preset: {
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
definePreset('custom', {
  halfDiminished: 'm7b5',
  diminished: 'dim',
  dim7: 'dim7',
});

// Use by name in a renderer
import { HtmlRenderer } from 'grigson/renderers/html';
const html = new HtmlRenderer({ notation: { preset: 'custom' } }).render(song);
```

```html
<!-- Or use by name in the custom element attribute -->
<grigson-chart>
  <grigson-html-renderer notation-preset="custom"></grigson-html-renderer>
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
  "halfDiminished": "m7b5",
  "diminished": "dim"
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

### `typeface`

Controls which embedded font is used for chart text. Set the `typeface` attribute on `<grigson-html-renderer>`.

| Value       | Font                | Description                                               |
| ----------- | ------------------- | --------------------------------------------------------- |
| `"sans"`    | Noto Sans (default) | Clean sans-serif; omitting the attribute defaults to this |
| `"serif"`   | Noto Serif          | Traditional serif style                                   |
| `"cursive"` | PetalumaScript      | Handwritten Real Book style (Steinberg, SIL OFL)          |

```html
<!-- Sans-serif (default — attribute may be omitted) -->
<grigson-chart>
  <grigson-html-renderer typeface="sans"></grigson-html-renderer>
  | C△ | Am7 | Dm7 | G7 |
</grigson-chart>

<!-- Serif -->
<grigson-chart>
  <grigson-html-renderer typeface="serif"></grigson-html-renderer>
  | C△ | Am7 | Dm7 | G7 |
</grigson-chart>

<!-- Cursive (handwritten Real Book style) -->
<grigson-chart>
  <grigson-html-renderer typeface="cursive"></grigson-html-renderer>
  | C△ | Am7 | Dm7 | G7 |
</grigson-chart>
```

The `typeface` attribute only affects the embedded fonts. Setting `--grigson-font-family` overrides the font entirely and ignores `typeface`.

To use a separate font for song titles or section labels while keeping Noto for chord content, set `--grigson-title-font-family` or `--grigson-section-label-font-family` on the chart element.

### `accidentals`

Controls whether flat and sharp symbols are rendered as unicode glyphs (♭♯) or ASCII characters (b#). Applies to all accidentals in the chart: chord roots, bass notes, and accidentals within quality strings (e.g. the ♭ in `7(♭5)`).

| Value       | Root/bass | Quality strings | CSS kerning |
| ----------- | --------- | --------------- | ----------- |
| `"unicode"` | ♭ ♯       | ♭ ♯             | applied     |
| `"ascii"`   | b #       | b #             | not applied |

The default is `"unicode"`. Use `"ascii"` when the active typeface does not have good-looking ♭/♯ glyphs (e.g. a handwritten or display font).

```html
<!-- Unicode accidentals (default) -->
<grigson-chart>
  <grigson-html-renderer></grigson-html-renderer>
  | Bb7 | Ebmaj7 |
</grigson-chart>

<!-- ASCII accidentals — useful with display fonts -->
<grigson-chart style="--grigson-font-family: 'Kaushan Script', cursive;">
  <grigson-html-renderer accidentals="ascii"></grigson-html-renderer>
  | Bb7 | Ebmaj7 |
</grigson-chart>
```

In the `HtmlRenderer` config object, set `accidentals: 'ascii'`:

```javascript
const html = new HtmlRenderer({ accidentals: 'ascii' }).render(song);
```

CSS kerning (negative `margin-left`/`margin-right`) is applied automatically to unicode accidentals via `[data-glyph="unicode"]` selectors on `[part="chord-accidental"]` and `[part="quality-accidental"]` spans. ASCII glyphs do not receive kerning.

### `slashStyle`

Controls how slash chords (e.g. `C/E`) are rendered. The style is recorded as a `data-slash-style` attribute on the `[part="chord chord-slash"]` span and drives the CSS layout.

| Value                    | Appearance                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `"diagonal"` _(default)_ | Chord and bass sit inline separated by a diagonal line, styled after the Real Book |
| `"horizontal"`           | Chord stacked above a horizontal rule, bass below (fraction style)                 |
| `"ascii"`                | Chord and bass sit inline separated by a plain `/` character                       |

```html
<!-- Diagonal — Real Book style (default) -->
<grigson-chart>
  <grigson-html-renderer></grigson-html-renderer>
  | Cm7/Bb | G/B |
</grigson-chart>

<!-- Horizontal — classic Chord Book fraction style -->
<grigson-chart>
  <grigson-html-renderer slash-style="horizontal"></grigson-html-renderer>
  | Cm7/Bb | G/B |
</grigson-chart>

<!-- ASCII — plain text slash -->
<grigson-chart>
  <grigson-html-renderer slash-style="ascii"></grigson-html-renderer>
  | Cm7/Bb | G/B |
</grigson-chart>
```

In the `HtmlRenderer` config object:

```javascript
const html = new HtmlRenderer({ slashStyle: 'horizontal' }).render(song);
```

The diagonal style exposes three CSS custom properties for fine-tuning:

| Property                       | Default   | Effect                                                    |
| ------------------------------ | --------- | --------------------------------------------------------- |
| `--grigson-slash-angle`        | `35deg`   | Rotation of the diagonal line (positive = `/` lean)       |
| `--grigson-slash-chord-offset` | `-0.25em` | Vertical nudge applied to the chord part (negative = up)  |
| `--grigson-slash-bass-offset`  | `0.25em`  | Vertical nudge applied to the bass note (positive = down) |

### `barsPerLine` and `maxBarsPerLine` (HTML renderer only)

These two options reflow bars independently of the source row breaks in the `.chart` file. They are mutually exclusive — if both are set, `barsPerLine` takes precedence.

| Config key       | Attribute           | Behaviour                                                                                                                          |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `barsPerLine`    | `bars-per-line`     | **Flat reflow.** Flatten all bars in each section into one pool and rechunk into rows of exactly N. Source row breaks are ignored. |
| `maxBarsPerLine` | `max-bars-per-line` | **Phrase-aware split.** Split source rows that exceed N bars, but never merge across source-row boundaries.                        |

Use `barsPerLine` when the song has uniform bar lengths and you want a fixed layout (e.g. 8 bars per row on a wide screen). Use `maxBarsPerLine` when source rows represent musical phrases (e.g. 5-bar phrases) and you want to split them for narrow screens without mixing phrase content across display rows.

```javascript
// Flat reflow: always 4 bars per display row
const html = new HtmlRenderer({ barsPerLine: 4 }).render(song);

// Phrase-aware split: never more than 2 bars per row, phrase boundaries preserved
const html = new HtmlRenderer({ maxBarsPerLine: 2 }).render(song);
```

```html
<!-- Responsive layout pattern: wide = 8 per row, narrow = 4 per row -->
<grigson-chart>
  <grigson-html-renderer bars-per-line="8"></grigson-html-renderer>
  | C | Am | F | G | C | Am | F | G |
</grigson-chart>

<!-- Phrase-aware: split 5-bar phrases without merging them -->
<grigson-chart>
  <grigson-html-renderer max-bars-per-line="2"></grigson-html-renderer>
  | C | Am | F | G | C |
</grigson-chart>
```

---

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

### `aria` and `spokenPreset` (HTML renderer only)

The HTML renderer emits ARIA attributes by default so screen readers can announce chord names, durations, repeat markers, time signatures, and simile marks without any extra configuration.

#### Disabling ARIA output

```javascript
const renderer = new HtmlRenderer({ aria: false });
```

Use `aria: false` when you are managing the accessibility layer yourself, generating test fixtures where leaner markup is preferable, or embedding the HTML in a context where ARIA attributes would interfere with an outer accessible component.

#### Customising spoken labels (`spokenPreset`)

Spoken labels come from a `SpokenPreset` object. The built-in English preset is exported as `DEFAULT_SPOKEN_PRESET`:

```typescript
import { DEFAULT_SPOKEN_PRESET } from 'grigson';
```

To override specific labels — for example to support a different language — spread the default and replace what you need:

```typescript
import { HtmlRenderer, DEFAULT_SPOKEN_PRESET } from 'grigson';

const frenchPreset = {
  ...DEFAULT_SPOKEN_PRESET,
  qualities: {
    major: '',
    minor: 'mineur',
    dominant7: 'septième de dominante',
    halfDiminished: 'demi-diminué',
    diminished: 'diminué',
    maj7: 'majeur septième',
    min7: 'mineur septième',
    dim7: 'diminué septième',
    dom7flat5: 'septième bémol cinq',
  },
  duration: (beats: number, isWholeBar: boolean, _denominator: number) =>
    isWholeBar ? 'mesure entière' : `${beats} temps`,
  simile: 'répéter la mesure',
};

const renderer = new HtmlRenderer({ spokenPreset: frenchPreset });
```

#### `SpokenPreset` interface

| Field       | Type                                         | Description                                                                                                                     |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `qualities` | `Record<string, string>`                     | Spoken suffix for each quality (empty string = root only, i.e. major)                                                           |
| `duration`  | `(beats, isWholeBar, denominator) => string` | Formats the duration part of a chord label; `denominator` is the active time-signature denominator (4 for 4/4, 8 for 6/8, etc.) |
| `barline`   | `(kind, repeatCount?) => string \| null`     | Label for a barline; `null` hides it with `aria-hidden`                                                                         |
| `timeSig`   | `(numerator, denominator) => string`         | Label for a time signature                                                                                                      |
| `simile`    | `string`                                     | Label for a simile (bar repeat) mark                                                                                            |

#### `chordAriaLabel` helper

`chordAriaLabel` is exported for use in custom renderers or tests:

```typescript
import { chordAriaLabel, DEFAULT_SPOKEN_PRESET } from 'grigson';

chordAriaLabel({ type: 'chord', root: 'Bb', quality: 'dominant7', bass: 'F' }, 2, false, DEFAULT_SPOKEN_PRESET, 4);
// → "B flat dominant 7 over F, 2 crotchets"
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
