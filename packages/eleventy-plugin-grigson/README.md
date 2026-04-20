# eleventy-plugin-grigson

Eleventy plugin that injects [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom) into `<grigson-chart>` elements at build time.

Charts are fully visible before any JavaScript runs — useful for static sites and environments where JS may be slow to load or disabled.

## Usage

```js
import grigsonPlugin from 'eleventy-plugin-grigson';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(grigsonPlugin);
}
```

## What it does

The plugin registers an Eleventy transform (`grigson-dsd`) that post-processes every `.html` output file. For each `<grigson-chart>` element without an existing `<template shadowrootmode>`, it:

1. Resolves the chart source from an inline `<template>` or an external template referenced by `id`
2. Parses and renders the chart using `parseSong` and `HtmlRenderer` from `grigson`
3. Respects the `normalise`, `transpose-key`, and `transpose-semitones` attributes
4. Supports explicit `<grigson-html-renderer>` children with per-renderer configuration
5. Injects the rendered HTML as `<template shadowrootmode="open">` inside the element
6. Emits `@font-face` CSS into `<head>` (once per page) so notation fonts load correctly

Charts with unrecognised renderer children (e.g. `<grigson-text-renderer>`) are skipped.
