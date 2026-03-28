---
layout: base.njk
title: Renderer Interface
permalink: /api/renderer-interface/
---

# Renderer Interface

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

There are no required base classes or interfaces to extend. Any object that responds to `render(song)` and returns the appropriate output is a valid renderer.

---

## Song tree structure

### `Song`

| Field      | Type        | Description              |
| ---------- | ----------- | ------------------------ |
| `meta`     | `SongMeta`  | Front matter fields      |
| `sections` | `Section[]` | Ordered list of sections |

### `SongMeta`

| Field    | Type     | Description                         |
| -------- | -------- | ----------------------------------- |
| `title`  | `string` | Title from front matter             |
| `artist` | `string` | Artist / composer from front matter |
| `key`    | `string` | Global key from front matter        |
| `tempo`  | `number` | Tempo in BPM                        |
| `feel`   | `string` | e.g. `"swing"`, `"latin"`           |

### `Section`

| Field  | Type    | Description                                        |
| ------ | ------- | -------------------------------------------------- |
| `name` | string  | Section label, e.g. `"A"`, `"Verse"`               |
| `key`  | string  | Per-section key override (or inherited global key) |
| `rows` | `Row[]` | Ordered list of rows                               |

### `Row`

| Field  | Type    | Description          |
| ------ | ------- | -------------------- |
| `bars` | `Bar[]` | Ordered list of bars |

### `Bar`

| Field           | Type                 | Description                                            |
| --------------- | -------------------- | ------------------------------------------------------ |
| `type`          | `BarlineType`        | Barline type at the start of this bar                  |
| `beats`         | `BeatSlot[]`         | Beat slots (chords and holds)                          |
| `timeSignature` | `TimeSig\|undefined` | Explicit time signature annotation, if present         |
| `volta`         | `string\|undefined`  | Volta bracket label, if this bar opens a volta bracket |

### `BarlineType`

```typescript
type BarlineType =
  | 'single'      // |
  | 'double'      // ||
  | 'final'       // ||.
  | 'startRepeat' // ||:
  | 'endRepeat'   // :||
  | 'endStartRepeat' // :||:
```

### `BeatSlot`

```typescript
type BeatSlot =
  | { type: 'chord'; chord: Chord }
  | { type: 'hold' }    // dot (.)
  | { type: 'rest' }    // dash (-)
  | { type: 'simile' }  // percent (%)
```

### `Chord`

| Field     | Type                | Description                                     |
| --------- | ------------------- | ----------------------------------------------- |
| `root`    | string              | Root note, e.g. `"C"`, `"Bb"`, `"F#"`           |
| `quality` | `ChordQuality`      | Chord quality                                   |
| `bass`    | `string\|undefined` | Bass note for slash chords, e.g. `"G"` in `C/G` |

### `ChordQuality`

```typescript
type ChordQuality =
  | 'major' | 'minor' | 'dominant7' | 'maj7' | 'min7'
  | 'minMaj7' | 'halfDiminished' | 'diminished' | 'diminished7'
  | 'augmented' | 'sus4' | 'add9'
  | 'dominant9' | 'dominant11' | 'dominant13'
  | 'maj9' | 'maj11' | 'maj13'
  | 'min9' | 'min11' | 'min13'
  // ... altered tensions
```

---

## Custom element renderer

To implement a custom renderer as a Web Component that works with `<grigson-chart>`, your element needs to implement the renderer contract:

```typescript
interface GrigsonRendererElement extends HTMLElement {
  renderChart(song: Song): void;
}
```

`<grigson-chart>` calls `renderChart()` on **every** child element that has this method, and places all outputs into its shadow root in DOM order. If no child renderer is found, it falls back to `GrigsonHtmlRenderer` automatically.

```javascript
class MyCustomRenderer extends HTMLElement {
  renderChart(song) {
    const output = /* produce your output */;
    this.setHTMLUnsafe(output);
  }
}

customElements.define('my-custom-renderer', MyCustomRenderer);
```

```html
<grigson-chart>
  <my-custom-renderer></my-custom-renderer>
  <template>| C | Am | F | G |</template>
</grigson-chart>
```

When your element's configuration changes, dispatch a `grigson:renderer-update` event to trigger a re-render:

```javascript
this.dispatchEvent(new CustomEvent('grigson:renderer-update', { bubbles: true }));
```

See also the [`grigson generate-renderer`](/cli/#grigson-generate-renderer) CLI command, which scaffolds a complete renderer package with all required boilerplate.
