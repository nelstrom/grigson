# grigson-text-renderer

A plain-text renderer custom element for [`<grigson-chart>`](../grigson/README.md). This package is a reference implementation demonstrating how to build a renderer entirely outside the core `grigson` package.

## Usage

### Auto-register (IIFE)

```html
<script src="grigson-register.iife.js"></script>
<script src="grigson-text-renderer-register.iife.js"></script>

<grigson-chart>
  <grigson-text-renderer></grigson-text-renderer>
  <template>| C | G | Am | F |</template>
</grigson-chart>
```

### ESM

```javascript
import { GrigsonChart } from 'grigson';
import { GrigsonTextRenderer } from 'grigson-text-renderer';

customElements.define('grigson-chart', GrigsonChart);
customElements.define('grigson-text-renderer', GrigsonTextRenderer);
```

## How it works

`GrigsonTextRenderer` implements the `GrigsonRendererElement` interface from `grigson`. Its `renderChart(song)` method uses `TextRenderer` to produce plain text and wraps the result in a `<pre>` element.

## Package structure

```
src/
  element.ts        — GrigsonTextRenderer class (side-effect-free)
  register.ts       — calls customElements.define('grigson-text-renderer', ...)
  index.ts          — Node/ESM exports
  index.browser.ts  — browser ESM exports
```
