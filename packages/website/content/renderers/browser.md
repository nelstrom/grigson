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

Add a `<script defer>` tag pointing to the IIFE file. The `grigson` global is available once the script has executed. Because `defer` delays execution until after HTML parsing, any inline script that uses the global must wait for `DOMContentLoaded` (which fires after all deferred scripts have run):

```html
<script defer src="/js/grigson.iife.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const song = grigson.parseSong('| C | Am | F | G |');
    const normalised = grigson.normaliseSong(song);
    const output = new grigson.TextRenderer().render(normalised);
    console.log(output);
  });
</script>
```

Alternatively, use the ESM bundle with `type="module"` — modules are deferred by default and can import directly without a global:

```js
import { parseSong, normaliseSong, TextRenderer } from './grigson.esm.js';

const song = parseSong('| C | Am | F | G |');
const normalised = normaliseSong(song);
const output = new TextRenderer().render(normalised);
console.log(output);
```

---

## Using the ESM bundle

Import named exports directly in an ES module context:

```js
import { parseSong, normaliseSong, TextRenderer } from './grigson.esm.js';
```

---

## Loading the custom elements

To use `<grigson-chart>` and `<grigson-html-renderer>`, load the auto-registering bundle with `defer`:

```html
<script defer src="/js/grigson-register.iife.js"></script>
<grigson-chart normalise>
  <template>
    | C | Am | F | G |
  </template>
</grigson-chart>
```

`defer` is important: without it the script blocks HTML parsing, so the custom element is registered before the browser has parsed the elements in the page. Deferred scripts run after parsing completes, which ensures the element upgrades correctly.

If you use `type="module"` instead of IIFE, `defer` is implicit — no attribute needed.

See [Custom Elements](/renderers/custom-elements/) for the full element documentation.
