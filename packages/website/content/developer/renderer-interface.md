---
layout: base.njk
title: Renderer Interface
permalink: /developer/renderer-interface/
---

# Renderer Interface

A renderer is any object with a `render(song)` method. The method receives the parsed song tree and returns whatever output format the renderer targets.

```javascript
class MyRenderer {
  render(song) {
    // Walk the song tree and produce output.
    // song.sections    — array of Section objects
    //   section.label  — e.g. "Verse", or null
    //   section.key    — key override for this section, or null
    //   section.rows   — array of Row objects (chords only, no comment lines)
    //     row.bars     — array of Bar objects
    //       bar.slots  — array of BeatSlots (chord or dot)
    //       bar.closeBarline — closing barline descriptor
  }
}
```

There are no required base classes or interfaces to extend. Any object that responds to `render(song)` and returns the appropriate output is a valid renderer.

---

## Song tree structure

### `Song`

| Field      | Type                       | Description                                      |
| ---------- | -------------------------- | ------------------------------------------------ |
| `type`     | `'song'`                   | Discriminant                                     |
| `title`    | `string \| null`           | Title from front matter                          |
| `key`      | `string \| null`           | Global key from front matter (e.g. `"F# major"`) |
| `meter`    | `string \| null`           | Meter from front matter (e.g. `"4/4"`, `"6/8"`)  |
| `sections` | `Section[]`                | Ordered list of sections                         |
| `loc`      | `SourceRange \| undefined` | Source location                                  |

### `Section`

| Field      | Type                         | Description                                                                                                                                                                     |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | `'section'`                  | Discriminant                                                                                                                                                                    |
| `label`    | `string \| null`             | Section label (e.g. `"Verse"`), or `null` if there is no `[Label]` line                                                                                                         |
| `key`      | `string \| null`             | Per-section key override, or `null`                                                                                                                                             |
| `rows`     | `Row[]`                      | Rows only — comment lines excluded. Use this for rendering chords.                                                                                                              |
| `preamble` | `CommentLine[] \| undefined` | Comment lines appearing _before_ the section label                                                                                                                              |
| `content`  | `SectionItem[] \| undefined` | Rows and comment lines interleaved in document order, appearing _after_ the label. Use this when you need to faithfully reproduce the section (e.g. round-trip text rendering). |
| `loc`      | `SourceRange \| undefined`   | Source location                                                                                                                                                                 |

`rows` is a filtered view of `content` — the same rows in the same order, with comment lines removed. Most renderers should use `rows`; use `content` only when comment lines matter to your output.

### `Row`

| Field         | Type                       | Description                    |
| ------------- | -------------------------- | ------------------------------ |
| `type`        | `'row'`                    | Discriminant                   |
| `openBarline` | `Barline`                  | The barline that opens the row |
| `bars`        | `Bar[]`                    | Ordered list of bars           |
| `loc`         | `SourceRange \| undefined` | Source location                |

### `Bar`

| Field           | Type                         | Description                                                 |
| --------------- | ---------------------------- | ----------------------------------------------------------- |
| `type`          | `'bar'`                      | Discriminant                                                |
| `slots`         | `BeatSlot[]`                 | Beat slots — at least one chord, optionally mixed with dots |
| `timeSignature` | `TimeSignature \| undefined` | Explicit time signature annotation, if present              |
| `closeBarline`  | `Barline`                    | The barline that closes this bar                            |
| `loc`           | `SourceRange \| undefined`   | Source location                                             |

### `Barline`

| Field         | Type                  | Description                                     |
| ------------- | --------------------- | ----------------------------------------------- |
| `kind`        | `BarlineKind`         | Barline type                                    |
| `repeatCount` | `number \| undefined` | Explicit repeat count (e.g. `x3`), if specified |

```typescript
type BarlineKind =
  | 'single'               // |
  | 'double'               // ||
  | 'final'                // ||.
  | 'startRepeat'          // ||:
  | 'endRepeat'            // :||
  | 'endRepeatStartRepeat' // :||:
```

### `BeatSlot`

```typescript
type BeatSlot =
  | { type: 'chord'; chord: Chord; loc?: SourceRange }
  | { type: 'dot';               loc?: SourceRange }  // . — hold/sustain
```

### `Chord`

| Field     | Type                       | Description                                     |
| --------- | -------------------------- | ----------------------------------------------- |
| `type`    | `'chord'`                  | Discriminant                                    |
| `root`    | `string`                   | Root note, e.g. `"C"`, `"Bb"`, `"F#"`           |
| `quality` | `Quality`                  | Chord quality (see below)                       |
| `bass`    | `string \| undefined`      | Bass note for slash chords, e.g. `"G"` in `C/G` |
| `loc`     | `SourceRange \| undefined` | Source location                                 |

### `Quality`

```typescript
type Quality =
  | 'major'           //  (no suffix)
  | 'minor'           // m
  | 'dominant7'       // 7
  | 'maj7'            // maj7 or M7
  | 'min7'            // m7 or -
  | 'dim7'            // dim7
  | 'diminished'      // dim
  | 'halfDiminished'  // m7b5
  | 'dom7flat5'       // 7b5
```

### `TimeSignature`

| Field         | Type     | Description                      |
| ------------- | -------- | -------------------------------- |
| `numerator`   | `number` | Top number, e.g. `6` in `6/8`    |
| `denominator` | `number` | Bottom number, e.g. `8` in `6/8` |

### `CommentLine`

| Field  | Type                       | Description                                   |
| ------ | -------------------------- | --------------------------------------------- |
| `type` | `'comment'`                | Discriminant                                  |
| `text` | `string`                   | Full comment text including the `#` character |
| `loc`  | `SourceRange \| undefined` | Source location                               |

### `SourceRange`

All AST nodes carry an optional `loc` property with 0-based LSP-style positions.

```typescript
interface SourceRange {
  start: { line: number; character: number };
  end:   { line: number; character: number };
}
```

---

## Custom element renderer

To implement a custom renderer as a Web Component that works with `<grigson-chart>`, implement the `GrigsonRendererElement` contract:

```typescript
interface GrigsonRendererElement extends HTMLElement {
  renderChart(song: Song): Element;
}
```

`<grigson-chart>` calls `renderChart()` on every child element that implements this method, and places the returned element into its shadow root in DOM order. If no child renderer is present, it falls back to `GrigsonHtmlRenderer` automatically.

```javascript
class MyCustomRenderer extends HTMLElement {
  renderChart(song) {
    const div = document.createElement('div');
    // … populate div from song …
    return div;
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

When your element's configuration changes and `<grigson-chart>` should re-render, dispatch a `GrigsonRendererUpdateEvent`:

```javascript
import { GrigsonRendererUpdateEvent } from 'grigson';

this.dispatchEvent(new GrigsonRendererUpdateEvent());
```

`<grigson-chart>` also dispatches events you can listen to:

| Event                  | Class                     | When                                                                   |
| ---------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `grigson:parse-error`  | `GrigsonParseErrorEvent`  | The chart source failed to parse; `event.error` holds the thrown value |
| `grigson:render-error` | `GrigsonRenderErrorEvent` | `renderChart()` threw; `event.error` holds the thrown value            |
