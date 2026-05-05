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

| Property   | Default  | Description                  |
| ---------- | -------- | ---------------------------- |
| `--cg-gap` | `3px`    | Line thickness between zones |
| `--cg-bar` | `5.5rem` | Bar square size              |

See the [full documentation](/renderers/grille-harmonique/) on the website.

## Development

```sh
pnpm install
pnpm build
pnpm test
```
