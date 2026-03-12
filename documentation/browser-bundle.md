# Browser Bundle

The grigson library ships two browser-ready bundles alongside the Node.js CommonJS/ESM build:

| File | Format | Global |
|---|---|---|
| `dist/grigson.iife.js` | IIFE (self-executing) | `grigson` |
| `dist/grigson.esm.js` | ES module | — |

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
