# Extract grigson DSD transform into an Eleventy plugin package

## Context

The Eleventy transform in `packages/website/.eleventy.js` that injects Declarative Shadow DOM
(DSD) into `<grigson-chart>` elements at build time is useful beyond this website. Extracting it
into a standalone, publishable package (`eleventy-plugin-grigson`) lets any Eleventy site get
progressive enhancement for free with a single `addPlugin` call.

The plugin is **Node-only** — no browser bundle needed. It follows the same monorepo conventions
as `grigson-text-renderer` but without the Vite browser build steps.

---

## Package name

`eleventy-plugin-grigson` — follows the Eleventy community naming convention (`eleventy-plugin-*`),
which is important for npm discoverability.

---

## New package: `packages/eleventy-plugin-grigson/`

### File structure

```
packages/eleventy-plugin-grigson/
├── src/
│   └── index.ts        (plugin function + full transform logic)
├── package.json
├── tsconfig.json
└── README.md
```

### `package.json`

```json
{
  "name": "eleventy-plugin-grigson",
  "version": "1.0.0",
  "description": "Eleventy plugin: build-time grigson chart rendering via Declarative Shadow DOM",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "grigson": "workspace:*",
    "linkedom": "^0.18.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

`linkedom` moves here from `packages/website/package.json` devDependencies.

### `tsconfig.json`

Follow the standard monorepo pattern (same as `grigson-text-renderer`):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `src/index.ts`

Extract the full transform logic from `.eleventy.js`. Precompute expensive values (font data URIs)
at module load time, not on each transform call:

```typescript
import { parseHTML } from 'linkedom';
import {
  parseSong, normaliseSong, transposeSong, transposeSongToKey,
  HtmlRenderer, getRendererStyles, getRendererFontFaceCSS,
} from 'grigson';

const fontFaceCSS = getRendererFontFaceCSS();
const defaultStyles = getRendererStyles('sans');
const hostStyle = '<style>:host{display:block;container-type:inline-size}</style>';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function grigsonPlugin(eleventyConfig: any): void {
  eleventyConfig.addTransform('grigson-dsd', async function (content: string, outputPath: string) {
    // ... full transform body extracted verbatim from .eleventy.js
  });
}

export default grigsonPlugin;
```

The transform body is moved as-is from `.eleventy.js`. No logic changes — just a relocation.

---

## Changes to `packages/website/`

### `package.json`

- Add `"eleventy-plugin-grigson": "workspace:*"` to `dependencies`
- Remove `"linkedom": "^0.18.0"` from `devDependencies` (it's now a dep of the plugin)

### `.eleventy.js`

- Remove `import { parseHTML } from 'linkedom'` and the `grigson` imports used only by the transform
- Remove the `fontFaceCSS`, `defaultStyles`, `hostStyle` module-level constants (they move to the plugin)
- Remove the entire `eleventyConfig.addTransform('grigson-dsd', ...)` block
- Add `import grigsonPlugin from 'eleventy-plugin-grigson'`
- Add `eleventyConfig.addPlugin(grigsonPlugin)` (before or after existing shortcodes)
- The `grigsonChartDSD` shortcode, `readChart` filter, Shiki highlighter, and other site-specific
  configuration stay in `.eleventy.js` unchanged

The remaining grigson imports (`parseSong`, `normaliseSong`, `HtmlRenderer`, `getRendererStyles`,
`getRendererFontFaceCSS`) used by the `grigsonChartDSD` shortcode stay in place.

### `content/renderers/ssr.njk`

Update the "Transform registration" section to show the plugin API as the primary usage pattern.
The existing verbose transform code can be kept but presented as "what the plugin does internally":

```javascript
// Primary usage:
import grigsonPlugin from 'eleventy-plugin-grigson';
eleventyConfig.addPlugin(grigsonPlugin);
```

---

## Verification

1. `pnpm install` from repo root (links the new workspace package)
2. `pnpm build` — all 9 packages build successfully
3. `pnpm test` — 610 tests pass
4. `npx serve packages/website/_site` — view source of any page with `<grigson-chart>`:
   confirm `<template shadowrootmode="open">` is present
5. Disable JavaScript in DevTools — charts still render
6. Enable JavaScript — no flash, element adopts DSD
