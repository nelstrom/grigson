# grigson-grille-harmonique-renderer

A grille harmonique renderer for grigson-chart. Renders `.chart` files as French jazz-style chord grids — each bar is a square subdivided diagonally to show chord density.

**Constraints:** 4/4 time only, quarter-note granularity.

## CLI

```sh
# HTML fragment
grigson-grille-harmonique-renderer song.chart

# Standalone page
grigson-grille-harmonique-renderer --format standalone song.chart > chart.html

# Options
grigson-grille-harmonique-renderer --help
```

## Browser (custom element)

```html
<script src="grigson-grille-harmonique-renderer-register.iife.js"></script>
<grigson-chart src="song.chart">
  <grigson-grille-harmonique-renderer bars-per-line="4"></grigson-grille-harmonique-renderer>
</grigson-chart>
```

Observed attributes: `notation-preset`, `bars-per-line`, `accidentals`.

## JavaScript API

```js
import render from 'grigson-grille-harmonique-renderer/render';

const html = render(song, {
  barsPerLine: 4,
  accidentals: 'unicode', // or 'ascii'
  notation: { preset: 'realbook' },
});
```

## CSS custom properties

| Property          | Default  | Description                                   |
| ----------------- | -------- | --------------------------------------------- |
| `--cg-grid-width` | `2px`    | Outer border and gap between bars             |
| `--cg-diag-width` | `2px`    | Thickness of diagonal dividing lines          |
| `--cg-diag-style` | `solid`  | Border style for diagonals (`dashed`, etc.)   |
| `--cg-bar-w`      | `6.5rem` | Bar width                                     |
| `--cg-bar-h`      | `6.5rem` | Bar height (set independently for rectangles) |

`--cg-diag-style` requires border-based rendering to take effect; with the default `background`-based lines only `solid` renders correctly.

See the [full documentation](/renderers/grille-harmonique/) on the website.

## Development

```sh
pnpm install
pnpm build
pnpm test
```
