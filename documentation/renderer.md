# Renderer Documentation

Grigson separates parsing from rendering. The parser reads a `.chart` source file and produces an abstract song tree. A renderer takes that tree and produces output — SVG, canvas, PDF, plain text, etc.

The default renderer targets SVG, for embedding in HTML pages. Other renderers can be created by implementing the same interface.

---

## Basic Usage

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
  fonts:     { ... },
  layout:    { ... },
};
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

If `toKey` matches the source key (or `semitones` is 0), no transposition occurs.

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

Controls when and how the "repeat previous bar" (`%`) symbol is used in the output.

Note that `%` marks written explicitly in the source are always rendered as simile symbols. These settings only govern whether the renderer *additionally* replaces repeated bars with simile symbols automatically.

```javascript
simile: {
  // Automatically replace runs of identical consecutive bars with simile symbols.
  // Applies to bars that are written out in full in the source (not already `%`).
  autoInsert: false,

  // Minimum number of consecutive identical bars before auto-inserting simile.
  // Only relevant when autoInsert is true.
  minRun: 2,
}
```

---

### `fonts`

Controls typeface and sizing. All font settings are optional; unset values fall back to the renderer's built-in defaults.

```javascript
fonts: {
  // Font for the chord root (e.g. the "C" in "Cm7")
  chordRoot: {
    family: 'serif',
    size: 18,        // in points
    weight: 'bold',
  },

  // Font for the chord quality and extensions (e.g. "m7" in "Cm7")
  chordSuffix: {
    family: 'serif',
    size: 14,
    weight: 'normal',
  },

  // Font for section labels (e.g. "[Verse]")
  sectionLabel: {
    family: 'sans-serif',
    size: 13,
    weight: 'bold',
  },

  // Font for time signatures
  timeSignature: {
    family: 'serif',
    size: 14,
    weight: 'normal',
  },

  // Font for volta bracket labels (e.g. "1.", "2.")
  voltaLabel: {
    family: 'sans-serif',
    size: 11,
    weight: 'normal',
  },
}
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

Because transposition and notation are renderer concerns, the same parsed song tree can be rendered into multiple output variations without re-parsing:

```javascript
const song = parse(source);

// Concert pitch, jazz notation
const concertSvg = new SvgRenderer({
  notation: { preset: 'jazz' },
}).render(song);

// Bb instrument (up 2 semitones), same notation
const bbSvg = new SvgRenderer({
  transpose: { semitones: 2 },
  notation: { preset: 'jazz' },
}).render(song);

// Guitar with capo 2 (down 2 semitones)
const capoSvg = new SvgRenderer({
  transpose: { semitones: -2 },
}).render(song);
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
