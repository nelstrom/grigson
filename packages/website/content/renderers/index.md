---
layout: base.njk
title: Renderers
permalink: /renderers/
---

# Renderers

Grigson separates parsing from rendering. The parser reads a `.chart` source file and produces a song tree. A renderer takes that tree and produces output — HTML, plain text, SVG, or other formats.

## The pipeline

```
.chart source  →  parse()  →  Song tree  →  Renderer  →  output
```

Because transposition and notation style are renderer concerns, the same parsed song tree can be rendered into multiple output variations without re-parsing:

```javascript
import { parse } from 'grigson/parser';
import { TextRenderer } from 'grigson/renderers/text';
import { SvgRenderer } from 'grigson/renderers/svg';

const song = parse(source);

// Transposed .chart file for a Bb instrument
const bbChart = new TextRenderer({ transpose: { semitones: 2 } }).render(song);

// Concert pitch SVG for the music stand
const concertSvg = new SvgRenderer().render(song);

// Transposed SVG for a guitarist with capo 2
const capoSvg = new SvgRenderer({ transpose: { semitones: -2 } }).render(song);
```

## Available renderers

- [HTML renderer](/grigson/renderers/html/) — produces an HTML string using CSS Grid; used by the `<grigson-chart>` custom element
- [Text renderer](/grigson/renderers/text/) — produces `.chart` output; useful for transposition pipelines and CLI use
- [SVG renderer](/grigson/renderers/svg/) — produces an SVG string for embedding in HTML
- [Custom elements](/grigson/renderers/custom-elements/) — `<grigson-chart>` and `<grigson-html-renderer>` for declarative HTML embedding
- [Browser bundles](/grigson/renderers/browser/) — loading grigson in a browser via IIFE or ES module
- [Notation presets](/grigson/renderers/presets/) — customising chord symbol rendering with `definePreset()`

For building your own renderer, see the [API Reference](/api/renderer-interface/).
