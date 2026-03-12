# Browser Bundle

The grigson library ships two browser-ready bundles alongside the Node.js CommonJS/ESM build:

| File                   | Format                | Global    |
| ---------------------- | --------------------- | --------- |
| `dist/grigson.iife.js` | IIFE (self-executing) | `grigson` |
| `dist/grigson.esm.js`  | ES module             | —         |

Both are produced by Vite in library mode and are rebuilt automatically as part of `pnpm build`.

## Exported API

The browser entry point (`src/index.browser.ts`) exports the browser-safe subset of the library:

- `parseSong(input: string): Song`
- `parseChord(input: string): Chord`
- `TextRenderer` class with `render(song: Song): string`
- `normaliseSong(song: Song, config?: DetectKeyConfig): Song`
- All associated TypeScript types

The CLI code (`src/cli.ts`) is **not** included in the browser bundle.

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

A live playground (at `/playground/`) is also available for testing arbitrary charts.

## Build configuration

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
