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

Observed attributes: `notation-preset`, `bars-per-line`, `accidentals`, `no-auto-size`.

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

| Property            | Default | Description                                           |
| ------------------- | ------- | ----------------------------------------------------- |
| `--cg-grid-width`   | `2px`   | Outer border and gap between bars                     |
| `--cg-diag-width`   | `0.5px` | Thickness of diagonal dividing lines                  |
| `--cg-diag-style`   | `solid` | Border style for diagonals (`dashed`, etc.)           |
| `--cg-chart-width`  | `100%`  | Fraction of its container the grid occupies           |
| `--cg-aspect-ratio` | `1`     | Bar height ÷ bar width (1 = square, 0.75 = landscape) |
| `--cg-font-size`    | `1rem`  | Base chord font size; overridden by auto-size         |

`--cg-diag-style` requires border-based rendering to take effect; with the default `background`-based lines only `solid` renders correctly.

Bars fill available width proportionally based on `bars-per-line`. The chart occupies `--cg-chart-width` of its container (default 100%). Set `--cg-aspect-ratio` to values other than 1 for non-square bars.

## Auto-size

The renderer runs a binary search to fit chord labels within their triangular zones on every render and container resize. To disable this, add the `no-auto-size` attribute:

```html
<grigson-grille-harmonique-renderer no-auto-size></grigson-grille-harmonique-renderer>
```

See the [full documentation](/renderers/grille-harmonique/) on the website.

## Development

```sh
pnpm install
pnpm build
pnpm test
```
