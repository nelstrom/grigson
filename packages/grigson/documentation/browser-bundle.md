# Browser Bundle

The grigson library ships two browser-ready bundles alongside the Node.js CommonJS/ESM build:

| File                           | Format                | Global             |
| ------------------------------ | --------------------- | ------------------ |
| `dist/grigson.iife.js`         | IIFE (self-executing) | `grigson`          |
| `dist/grigson.esm.js`          | ES module             | —                  |
| `dist/grigson-register.iife.js`| IIFE (side-effect)    | `grigsonRegister`  |
| `dist/grigson-register.esm.js` | ES module             | —                  |

Both are produced by Vite in library mode and are rebuilt automatically as part of `pnpm build`.

## Exported API

The browser entry point (`src/index.browser.ts`) exports the browser-safe subset of the library:

- `parseSong(input: string): Song`
- `parseChord(input: string): Chord`
- `TextRenderer` class with `render(song: Song): string`
- `GrigsonChart` custom element class
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

The `grigson-register` bundle is separate from the core `grigson` bundle to allow for side-effect-free imports of the library when the custom element is not needed.

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
  theme: 'vs-light',
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
