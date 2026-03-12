---
layout: base.njk
title: Renderer
permalink: /renderer/
---

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
```

The plain text renderer supports all the same configuration options as the SVG renderer, except for `layout` (which has no meaning for text output).

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

| Element | Class |
|---|---|
| Chord root (e.g. the "C" in "Cm7") | `.grigson-chord-root` |
| Chord suffix (e.g. "m7" in "Cm7") | `.grigson-chord-suffix` |
| Section label (e.g. "Verse") | `.grigson-section-label` |
| Time signature | `.grigson-time-signature` |
| Volta bracket label (e.g. "1.") | `.grigson-volta-label` |

Example:

```css
.grigson-chord-root   { font-family: serif; font-size: 18px; font-weight: bold; }
.grigson-chord-suffix { font-family: serif; font-size: 14px; }
.grigson-section-label { font-family: sans-serif; font-size: 13px; font-weight: bold; }
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
{ transpose: { toKey: 'A' } }

// Option 2: specify the interval
{ transpose: { semitones: 2 } }
```

If the source chart has per-section key overrides, transposition applies to each section independently. For example, if verse is in `Eb` and chorus is in `Ab`, and you transpose `toKey: 'F'`, the verse will render in F and the chorus in Bb.

#### Common transposition use cases

| Use case | Config |
|---|---|
| Concert pitch (no transposition) | *(omit `transpose`)* |
| Bb instrument (e.g. trumpet, clarinet) | `{ semitones: 2 }` |
| Eb instrument (e.g. alto sax) | `{ semitones: -3 }` |
| Guitar capo 2 | `{ semitones: -2 }` |
| Guitar capo 4 | `{ semitones: -4 }` |

---

### `notation`

Controls how chord symbols are written in the output. You can use a named preset or override individual symbols.

```javascript
notation: {
  // Named preset. Overrides below take precedence over the preset.
  preset: 'jazz', // 'jazz' | 'pop' | 'symbolic'

  // How to write minor chords.
  minor: 'm',   // 'm' → Cm   |  '-' → C-

  // How to write major seventh.
  major7: 'M7', // 'M7' → CM7  |  'maj7' → Cmaj7  |  'Δ' → CΔ

  // How to write dominant seventh (usually just '7', but listed for completeness).
  dominant7: '7',

  // How to write half-diminished (minor seventh flat five).
  halfDim: 'm7b5', // 'm7b5' → Cm7b5  |  'ø' → Cø

  // How to write diminished.
  diminished: 'dim', // 'dim' → Cdim  |  '°' → C°

  // How to write diminished seventh.
  diminished7: 'dim7', // 'dim7' → Cdim7  |  '°7' → C°7

  // How to write augmented.
  augmented: '+', // '+' → C+  |  'aug' → Caug

  // How to write suspended fourth.
  sus4: 'sus4', // 'sus4' → Csus4  |  'sus' → Csus (shorthand)

  // Flat and sharp symbols in chord names.
  flat: 'b',    // 'b' → Bb   |  '♭' → B♭  (Unicode)
  sharp: '#',   // '#' → C#   |  '♯' → C♯  (Unicode)
}
```

#### Built-in presets

| Preset | Minor | Maj7 | Half-dim | Dim |
|---|---|---|---|---|
| `jazz` (default) | `m` | `M7` | `m7b5` | `dim` |
| `pop` | `m` | `maj7` | `m7b5` | `dim` |
| `symbolic` | `-` | `Δ` | `ø` | `°` |

---

### `simile`

Controls whether repeated bars are rendered as simile symbols (`%`) or written out in full.

The source format and the rendered output are independent. Both of the following parse to the same AST:

```
| C | C | C | C |     ← longhand
| C | % | % | % |     ← shorthand
```

The renderer then decides which form to use in the output, regardless of which form was in the source. One fixed rule always applies: **the first bar of a new row is always rendered in full — never as `%`**. Simile symbols may only appear from the second bar of a row onwards.

```javascript
simile: {
  // 'shorthand' — use % for consecutive identical bars (after the first bar of each row).
  // 'longhand'  — always write chords out in full, never use %.
  output: 'shorthand', // default
}
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
const concertSvg = new SvgRenderer({ notation: { preset: 'jazz' } }).render(song);

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
    // song.meta        — front matter fields (title, artist, key, ...)
    // song.sections    — array of Section objects
    //   section.name   — e.g. "Verse"
    //   section.key    — key override for this section, if any
    //   section.rows   — array of Row objects
    //     row.bars     — array of Bar objects
    //       bar.beats  — array of beat slots (chord or hold)
    //       bar.type   — barline type at start of bar
  }
}
```

The song tree API will be documented separately once the parser is implemented.
