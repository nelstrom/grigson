# grigson-svg-renderer

A stub SVG renderer custom element for use with `<grigson-chart>`.

## Status

Under construction. The `renderChart()` method currently returns a placeholder `<svg>` element containing the text "Under construction".

## Usage

```html
<script type="module" src="grigson-svg-renderer-register.esm.js"></script>

<grigson-chart>
  <template>
    title: My Chart
    key: C
    ---
    | Cmaj7 | Fmaj7 | G7 | Cmaj7 |
  </template>
  <grigson-svg-renderer></grigson-svg-renderer>
</grigson-chart>
```

## API

### `GrigsonSvgRenderer`

Extends `HTMLElement` and implements `GrigsonRendererElement`.

| Method | Description |
|--------|-------------|
| `renderChart(song: Song): Element` | Returns a stub `<svg>` element. |

## Build outputs

| File | Description |
|------|-------------|
| `dist/index.js` | ESM module (TypeScript consumers) |
| `dist/grigson-svg-renderer.esm.js` | Browser ESM bundle |
| `dist/grigson-svg-renderer.iife.js` | Browser IIFE bundle |
| `dist/grigson-svg-renderer-register.esm.js` | Auto-registers `<grigson-svg-renderer>` (ESM) |
| `dist/grigson-svg-renderer-register.iife.js` | Auto-registers `<grigson-svg-renderer>` (IIFE) |
