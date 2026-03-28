---
layout: base.njk
title: Browser Bundles
permalink: /renderers/browser/
---

# Browser Bundles

The grigson library ships browser-ready bundles alongside the Node.js build:

| File                            | Format                | Global    |
| ------------------------------- | --------------------- | --------- |
| `dist/grigson.iife.js`          | IIFE (self-executing) | `grigson` |
| `dist/grigson.esm.js`           | ES module             | —         |
| `dist/grigson-register.iife.js` | IIFE (side-effect)    | —         |
| `dist/grigson-register.esm.js`  | ES module             | —         |

The `grigson-register` bundle registers both `<grigson-chart>` and `<grigson-html-renderer>` as custom elements. It is separate from the core `grigson` bundle so you can import the library without the custom element side effects.

---

## Exported browser API

The browser entry point exports the browser-safe subset of the library:

- `parseSong(input: string): Song`
- `parseChord(input: string): Chord`
- `TextRenderer` class with `render(song: Song): string`
- `GrigsonChart` custom element class
- `GrigsonHtmlRenderer` custom element class
- `normaliseSong(song: Song, config?: DetectKeyConfig): Song`
- All associated TypeScript types

The CLI code is **not** included in the browser bundle.

---

## Using the IIFE bundle

Add a `<script>` tag pointing to the IIFE file. The `grigson` global is then available on the page:

```html
<script src="/js/grigson.iife.js"></script>
<script>
  const song = grigson.parseSong('| C | Am | F | G |');
  const normalised = grigson.normaliseSong(song);
  const output = new grigson.TextRenderer().render(normalised);
  console.log(output);
</script>
```

---

## Using the ESM bundle

Import named exports directly in an ES module context:

```js
import { parseSong, normaliseSong, TextRenderer } from './grigson.esm.js';
```

---

## Loading the custom elements

To use `<grigson-chart>` and `<grigson-html-renderer>`, load the auto-registering bundle:

```html
<script src="/js/grigson-register.iife.js"></script>
<grigson-chart normalise>
  <template>
    | C | Am | F | G |
  </template>
</grigson-chart>
```

See [Custom Elements](/renderers/custom-elements/) for the full element documentation.
