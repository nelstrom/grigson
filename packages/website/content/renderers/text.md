---
layout: base.njk
title: Text Renderer
permalink: /renderers/text/
---

# Text Renderer

The text renderer is the simplest renderer, and the best starting point for understanding the grigson pipeline. It takes a parsed song tree and produces a `.chart` file as output — making it, at its most basic, a round-trip identity function: parse a chart, then render it back to text.

This becomes genuinely useful combined with transposition. You can author a chart in one key, then use the text renderer to produce a transposed version as a new `.chart` file.

```javascript
import { parse } from 'grigson/parser';
import { TextRenderer } from 'grigson/renderers/text';

const source = `
---
title: "Autumn Leaves"
key: G
---

[A]
| (4/4) Cm7 | F7 | BbM7 | EbM7 |
| Am7b5 | D7 | Gm | Gm |
`;

const song = parse(source);

// Identity: renders back to the same .chart format
const inG = new TextRenderer().render(song);

// Transposed up a tone to A
const inA = new TextRenderer({ transpose: { toKey: 'A' } }).render(song);
```

The text renderer supports all the same configuration options as the SVG renderer, except for `layout` (which has no meaning for text output). See the [SVG renderer](/renderers/svg/) for the full configuration reference.

---

## CLI usage

The text renderer is also available as a terminal step in the CLI pipeline:

```sh
cat song.chart | grigson normalise | grigson transpose --to G
```

See the [CLI Reference](/cli/) for details.
