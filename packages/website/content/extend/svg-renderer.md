---
layout: base.njk
title: SVG Renderer
permalink: /extend/svg-renderer/
---

# SVG Renderer

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

---

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

| Use case                               | Config               |
| -------------------------------------- | -------------------- |
| Concert pitch (no transposition)       | _(omit `transpose`)_ |
| Bb instrument (e.g. trumpet, clarinet) | `{ semitones: 2 }`   |
| Eb instrument (e.g. alto sax)          | `{ semitones: -3 }`  |
| Guitar capo 2                          | `{ semitones: -2 }`  |
| Guitar capo 4                          | `{ semitones: -4 }`  |

---

### `notation`

Controls how chord symbols are written in the output. Pass a `NotationPreset` object inline (merged on top of the defaults), or pass a named preset registered via `definePreset()` from `grigson/presets`.

```javascript
notation: {
  // Inline partial preset — merged on top of DEFAULT_PRESET.
  preset: { minor: '-', flat: 'b', sharp: '#' },

  // Or a named preset registered via definePreset().
  preset: 'myPreset',
}
```

#### `NotationPreset` fields

| Field            | Default | Description                           |
| ---------------- | ------- | ------------------------------------- |
| `major`          | `''`    | Suffix for plain major triads         |
| `minor`          | `'m'`   | Suffix for minor chords               |
| `dominant7`      | `'7'`   | Suffix for dominant seventh chords    |
| `halfDiminished` | `'ø'`   | Suffix for half-diminished / min7♭5   |
| `diminished`     | `'°'`   | Suffix for diminished triads          |
| `maj7`           | `'△'`   | Suffix for major seventh chords       |
| `min7`           | `'m7'`  | Suffix for minor seventh chords       |
| `dim7`           | `'°7'`  | Suffix for diminished seventh chords  |
| `dom7flat5`      | `'7♭5'` | Suffix for dominant seventh flat-five |
| `flat`           | `'♭'`   | Symbol for flat accidentals in roots  |
| `sharp`          | `'♯'`   | Symbol for sharp accidentals in roots |

Unspecified fields fall back to the defaults shown above.

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
