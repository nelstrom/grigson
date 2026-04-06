# Browser Bundle

The grigson library ships browser-ready bundles in two variants: **embedded** (fonts baked in as
base64 data URIs, zero network dependency) and **CDN** (fonts loaded from jsDelivr at runtime,
smaller download). Each variant comes as IIFE and ESM, plus an auto-registering `-register` build:

| File                                | Format                | Fonts    | Approx size |
| ----------------------------------- | --------------------- | -------- | ----------- |
| `dist/grigson.iife.js`              | IIFE (self-executing) | embedded | ~300 KB     |
| `dist/grigson.esm.js`               | ES module             | embedded | ~325 KB     |
| `dist/grigson-register.iife.js`     | IIFE (side-effect)    | embedded | ~300 KB     |
| `dist/grigson-register.esm.js`      | ES module             | embedded | ~325 KB     |
| `dist/grigson-cdn.iife.js`          | IIFE (self-executing) | CDN URLs | ~55 KB      |
| `dist/grigson-cdn.esm.js`           | ES module             | CDN URLs | ~60 KB      |
| `dist/grigson-cdn-register.iife.js` | IIFE (side-effect)    | CDN URLs | ~55 KB      |
| `dist/grigson-cdn-register.esm.js`  | ES module             | CDN URLs | ~60 KB      |

All are produced by Vite in library mode and are rebuilt automatically as part of `pnpm build`.

## Choosing a build

**Embedded builds** (`grigson.iife.js`, `grigson-register.iife.js`, …) bundle the font subsets
directly as base64 data URIs. They work with no network access and are the right choice when:

- You need offline or intranet support.
- You serve the script from a CDN or asset host yourself.
- You want a single-file deployment with no external dependencies.

**CDN builds** (`grigson-cdn.iife.js`, `grigson-cdn-register.iife.js`, …) replace the embedded
data URIs with jsDelivr URLs pointing to the
[`grigson-fonts`](../../grigson-fonts/README.md) package. The fonts are fetched from
`https://cdn.jsdelivr.net/gh/nelstrom/grigson@grigson-fonts-v{version}/packages/grigson-fonts/fonts/`
on first use and cached by the browser. Use these when:

- Bundle size is a priority and a network connection is available.
- You are already loading other assets from a CDN.

Both variants expose exactly the same JavaScript API.

## Exported API

The browser entry point (`src/index.browser.ts`) exports the browser-safe subset of the library:

- `parseSong(input: string): Song`
- `parseChord(input: string): Chord`
- `TextRenderer` class with `render(song: Song): string`
- `GrigsonChart` custom element class
- `GrigsonHtmlRenderer` custom element class (implements `GrigsonRendererElement`)
- `GrigsonRendererUpdateEvent`, `GrigsonParseErrorEvent`, `GrigsonRenderErrorEvent` event classes
- `normaliseSong(song: Song, config?: DetectKeyConfig): Song`
- All associated TypeScript types

The CLI code (`src/cli.ts`) is **not** included in the browser bundle.

## Custom Element

The library provides a `<grigson-chart>` custom element for declarative chart rendering. To use it, include the auto-registering bundle:

```html
<script src="/js/grigson-register.iife.js"></script>
<grigson-chart>
  <template>
    | C | Am | F | G |
  </template>
</grigson-chart>
```

### Attributes

The `<grigson-chart>` element supports the following attributes for configuration:

| Attribute             | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `template`            | ID of an external `<template>` element to use as the chart source. Ignored when an inline `<template>` child is present. |
| `transpose-key`       | Target key for transposition (e.g., `A`).                                                                                |
| `transpose-semitones` | Number of semitones to transpose (e.g., `2` for a whole step up).                                                        |
| `normalise`           | Presence attribute — normalise enharmonic spellings before rendering.                                                    |

Changing these attributes via the DOM will automatically re-render the chart.

### External template

The `template` attribute lets multiple `<grigson-chart>` elements share one `<template>` definition. An inline `<template>` child always takes precedence when both are present; if the referenced ID does not exist the chart renders nothing.

```html
<template id="my-chart">
  | C | Am | F | G |
</template>

<!-- Concert pitch -->
<grigson-chart template="my-chart"></grigson-chart>

<!-- Transposed for Bb instruments -->
<grigson-chart template="my-chart" transpose-semitones="2"></grigson-chart>

<!-- Transposed for Eb instruments -->
<grigson-chart template="my-chart" transpose-semitones="9"></grigson-chart>
```

### Renderer discovery

`<grigson-chart>` calls `renderChart()` on **every** child element that implements the renderer contract (`typeof el.renderChart === 'function'`), and places all outputs into its shadow root in DOM order. If no child renderer is found, it falls back to `GrigsonHtmlRenderer` automatically.

This makes it possible to place multiple renderer configurations inside one chart, with CSS controlling which is visible.

```html
<!-- Implicit fallback renderer (GrigsonHtmlRenderer) -->
<grigson-chart>
  <template>| C | Am | F | G |</template>
</grigson-chart>

<!-- Explicit renderer child (same result, but configurable) -->
<grigson-chart>
  <grigson-html-renderer notation-preset="symbolic"></grigson-html-renderer>
  <template>| C | Am | F | G |</template>
</grigson-chart>
```

### Responsive layout with container queries

`<grigson-chart>` sets `container-type: inline-size` on itself by default, so `@container` rules targeting its children work without any extra CSS. Place multiple renderer configurations inside one chart and use container queries to show the appropriate one:

```html
<grigson-chart>
  <template>| C | Am | F | G |</template>
  <grigson-html-renderer class="narrow"></grigson-html-renderer>
  <grigson-html-renderer class="wide"></grigson-html-renderer>
</grigson-chart>

<style>
  .narrow { display: block; }
  .wide   { display: none;  }

  @container (min-width: 600px) {
    .narrow { display: none;  }
    .wide   { display: block; }
  }
</style>
```

Authors can opt out of containment with `container-type: normal` on the element if needed.

### `<grigson-html-renderer>`

The built-in renderer element. Accepts:

| Attribute         | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `notation-preset` | Chord notation style: `jazz` (default), `pop`, or `symbolic`. |

When `notation-preset` changes, `<grigson-html-renderer>` dispatches a `grigson:renderer-update` event which causes `<grigson-chart>` to re-render.

### CSS API

CSS Custom Properties and Shadow Parts belong to the **renderer element** (`<grigson-html-renderer>` or a custom renderer), not to `<grigson-chart>` itself. The rendered output is placed in `<grigson-chart>`'s shadow root, so parts can be styled via the `<grigson-chart>` host.

#### Custom Properties

| Property                       | Description                               | Default           |
| ------------------------------ | ----------------------------------------- | ----------------- | ----------------- |
| `--grigson-font-family`        | Font family for the entire chart.         | `monospace`       |
| `--grigson-color`              | Base text color.                          | `inherit`         |
| `--grigson-background`         | Background color.                         | `transparent`     |
| `--grigson-line-height`        | Line height for the chart rows.           | `1.5`             |
| `--grigson-barline-color`      | Color of the barlines (`                  | `).               | `--grigson-color` |
| `--grigson-chord-root-color`   | Color of the chord roots (e.g., `C`).     | `--grigson-color` |
| `--grigson-chord-suffix-color` | Color of the chord suffixes (e.g., `m7`). | `--grigson-color` |
| `--grigson-frontmatter-color`  | Color of the YAML front matter block.     | `#888`            |

#### Shadow Parts

The following elements can be styled using the `::part()` pseudo-element:

| Part                | Description                            |
| ------------------- | -------------------------------------- |
| `song`              | The container for the entire song.     |
| `frontmatter`       | The YAML front matter block.           |
| `frontmatter-value` | Values within the front matter fields. |
| `row`               | A single row of bars.                  |
| `barline`           | A single barline.                      |
| `chord`             | A complete chord symbol.               |
| `chord-root`        | The root note of a chord.              |
| `chord-suffix`      | The quality suffix of a chord.         |

Example:

```css
grigson-chart::part(chord-root) {
  color: #d33;
  font-weight: bold;
}

grigson-chart {
  --grigson-font-family: 'Fira Code', monospace;
}
```

The `grigson-register` bundle registers both `grigson-chart` and `grigson-html-renderer` and is separate from the core `grigson` bundle to allow for side-effect-free imports when the custom element is not needed.

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

## Using the ESM bundle

Import named exports directly in an ES module context:

```js
import { parseSong, normaliseSong, TextRenderer } from './grigson.esm.js';
```

## Website integration

The Eleventy website (in `packages/website/`) loads the IIFE bundle on every page via the pnpm workspace symlink. In `packages/website/.eleventy.js`:

```js
eleventyConfig.addPassthroughCopy({
  'node_modules/grigson/dist/grigson.iife.js': 'js/grigson.iife.js',
});
```

`node_modules/grigson` is a symlink to `packages/grigson`, so the copy always reflects the latest `pnpm build` output. The layout at `packages/website/_includes/base.njk` includes:

```html
<script src="/js/grigson.iife.js"></script>
```

This makes the `grigson` global available to all inline scripts on the site.

## Interactive Demo

The website includes an interactive demo page (at `/demo/`) that illustrates real-time normalisation using the browser bundle. It loads a "badly spelled" chord chart, parses it, normalises it, and renders the result into a `<pre>` element on page load.

A live playground (at `/playground/`) is also available for testing arbitrary charts. The playground uses **Monaco Editor** for the input area, providing a rich editing experience with automatic layout and monospace font. The editor's content is linked to the live-normalisation logic via the `onDidChangeModelContent` event.

The playground also uses **Shiki** for syntax highlighting of the normalised output, leveraging the project's TextMate grammar for consistent styling with VS Code.

## Monaco Editor Integration

The playground integrates the Monaco Editor (the core of VS Code) for the input area. The editor is loaded from the `node_modules/monaco-editor` package via Eleventy's passthrough copy:

```js
eleventyConfig.addPassthroughCopy({
  'node_modules/monaco-editor/min/vs': 'js/monaco/vs',
});
```

The playground script initializes the editor and hooks it into the grigson library:

```js
const editor = monaco.editor.create(document.getElementById('input-editor'), {
  value: initialContent,
  language: 'plaintext',
  theme: 'vs',
  minimap: { enabled: false },
  automaticLayout: true,
});

editor.onDidChangeModelContent(() => {
  const value = editor.getValue();
  const song = grigson.parseSong(value);
  const normalised = grigson.normaliseSong(song);
  const text = new grigson.TextRenderer().render(normalised);
  // ... update output with Shiki
});
```

## Syntax Highlighting

The playground integrates Shiki in the browser to provide live syntax highlighting for the `.chart` format in the **output** area. It loads the Grigson TextMate grammar (copied to `_site/js/grigson.tmLanguage.json` during the website build) and registers it as a language:

```js
const response = await fetch('/js/grigson.tmLanguage.json');
const grammar = await response.json();

const highlighter = await createHighlighter({
  themes: ['nord'],
  langs: [{
    name: 'grigson',
    ...grammar
  }]
});

const html = highlighter.codeToHtml(text, { lang: 'grigson', theme: 'nord' });
```

The grammar is maintained in `packages/textmate-grammar/` and shared between the website and the VS Code extension.

The bundle is configured in `vite.config.ts`:

```ts
lib: {
  entry: 'src/index.browser.ts',
  name: 'grigson',
  formats: ['iife', 'es'],
  fileName: (format) => (format === 'es' ? 'grigson.esm.js' : `grigson.${format}.js`),
}
```

`emptyOutDir: false` prevents Vite from deleting the TypeScript compiler output (`dist/`) before writing the bundles.
