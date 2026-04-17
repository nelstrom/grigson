# Build-time chart rendering with Declarative Shadow DOM

## Context

The user asked whether Grigson's JavaScript renderer could be run at Eleventy build time to pre-render `<grigson-chart>` into a [Declarative Shadow DOM (DSD)](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom), so the chart renders in browsers with JavaScript disabled.

**Answer: yes, and with minimal work.** The key insight is that `HtmlRenderer.render(song): string` in `html.ts` is already a pure string function with no DOM dependencies — it works as-is in Node.js. The only DOM-dependent code is in `html-element.ts`: font injection into `document.head` and the styles getter. Both can be extracted as exported functions.

The plan is to:

1. Export the renderer CSS and font-face declarations from the `grigson` package
2. Add an Eleventy paired shortcode that pre-renders a chart into DSD HTML at build time
3. Create a demo page under `/renderers/`

---

## DSD output shape

The shortcode will produce:

```html
<grigson-chart normalise>
  <template shadowrootmode="open">
    <style>
      /* @font-face declarations (font data URIs from the grigson package) */
      /* component CSS from getRendererStyles() */
    </style>
    <!-- HTML string from HtmlRenderer.render(song) -->
  </template>
  <template>
    ---
    title: Blues in F
    ...
    ---
    [Head]
    ||: (4/4) F7 | ...
  </template>
</grigson-chart>
```

The browser reads the `<template shadowrootmode="open">` and immediately attaches it as a shadow root — no script required. If JS is enabled, the custom element upgrades later and may re-render, but the DSD provides the initial content.

Font-face rules are placed _inside_ the shadow template. Modern browsers (Chrome 118+, Safari 17.2+, Firefox 127+) support `@font-face` inside shadow roots. On older browsers, system font fallback applies — acceptable for a demo.

---

## Files to modify / create

| File                                             | Action                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `packages/grigson/src/renderers/html-element.ts` | Extract private `_getStyles()` and `_ensureFontFaces()` into exported functions |
| `packages/grigson/src/index.ts`                  | Export the two new functions                                                    |
| `packages/website/.eleventy.js`                  | Add `grigsonChartDSD` paired shortcode                                          |
| `packages/website/content/renderers/ssr.njk`     | New demo page                                                                   |
| `packages/website/content/renderers/index.md`    | Add link to new page                                                            |

---

## Step 1 — Export CSS helpers from the grigson package

In `packages/grigson/src/renderers/html-element.ts`:

**A. Extract font-face declarations**

Move the CSS string construction from `_ensureFontFaces()` into a new exported function:

```typescript
export function getRendererFontFaceCSS(): string {
  // Returns the @font-face rules as a CSS string (no DOM side effects)
  // Same strings that _ensureFontFaces() injects into document.head
}
```

The existing `_ensureFontFaces()` can call this and inject the result.

**B. Extract component styles**

Move the CSS string returned by `_getStyles()` into a new exported function:

```typescript
export function getRendererStyles(typeface?: string): string {
  // Same CSS as before, defaulting to 'sans' typeface
}
```

The existing `_getStyles()` becomes a thin wrapper: `return getRendererStyles(this.getAttribute('typeface') ?? 'sans')`.

**C. Export from `packages/grigson/src/index.ts`**

```typescript
export { getRendererStyles, getRendererFontFaceCSS } from './renderers/html-element.js';
```

---

## Step 2 — Add Eleventy shortcode

In `packages/website/.eleventy.js`, add an import and a paired shortcode:

```js
import { parseSong, normaliseSong, HtmlRenderer, getRendererStyles, getRendererFontFaceCSS } from 'grigson';

// Precompute once (large data URIs)
const fontFaceCSS = getRendererFontFaceCSS();
const defaultStyles = getRendererStyles('sans');

eleventyConfig.addPairedShortcode('grigsonChartDSD', (source, normalise = true) => {
  let song = parseSong(source.trim());
  if (normalise) song = normaliseSong(song);
  const chartHTML = new HtmlRenderer().render(song);
  const attrs = normalise ? ' normalise' : '';
  return [
    `<grigson-chart${attrs}>`,
    `  <template shadowrootmode="open">`,
    `    <style>${fontFaceCSS}\n${defaultStyles}</style>`,
    `    ${chartHTML}`,
    `  </template>`,
    `  <template>${source.trim()}</template>`,
    `</grigson-chart>`,
  ].join('\n');
});
```

---

## Step 3 — Create the demo page

**`packages/website/content/renderers/ssr.njk`**

```
---
layout: base.njk
title: Build-time rendering
permalink: /renderers/build-time/
---
```

Page sections:

1. **Introduction** — explain that charts can be pre-rendered at build time using Declarative Shadow DOM, making them visible without JavaScript
2. **Live demo** — a chart rendered at build time using `{% grigsonChartDSD %}...{% endGrigsonChartDSD %}`; suggest the reader disable JS to verify it still renders
3. **How it works** — brief explanation: Eleventy runs `parseSong` + `HtmlRenderer` at build time and places the result inside `<template shadowrootmode="open">`; the browser attaches this as the shadow root before any script runs
4. **Code example** — show the Eleventy shortcode usage and the resulting HTML (using the `{% highlight %}` shortcode for syntax-highlighting)
5. **Font note** — `@font-face` rules are embedded as data URIs inside the shadow template, so the custom notation fonts load without network requests; JS upgrade later is transparent

Use the Blues in F example from the user's question as the demo chart.

---

## Step 4 — Update renderers index

Add to the list in `packages/website/content/renderers/index.md`:

```
- [Build-time rendering](/grigson/renderers/build-time/) — pre-render charts into Declarative Shadow DOM at build time for zero-JS display
```

---

## Verification

1. `pnpm build` from repo root — should build without errors
2. `pnpm serve` inside `packages/website` — open `/renderers/build-time/`
3. Verify the chart renders immediately on page load
4. Open DevTools → disable JavaScript → reload — chart should still render with the pre-baked shadow DOM
5. View source — confirm `<template shadowrootmode="open">` is present in the static HTML with the chart content inside
