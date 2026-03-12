---
layout: base.njk
title: grigson
permalink: /
---

# grigson

A plain-text format and toolkit for writing chord charts.

Grigson is named after Lionel Grigson, author of *The Jazz Chord Book*. Source files use the `.chart` extension and look like the charts they describe — pipe characters for bar lines, standard chord names, YAML front matter for metadata.

```
---
title: "Blues in F"
key: F
feel: "swing"
---

[Head]
||: (4/4) F7 | % | % | % |
| Bb7 | % | F7 | % |
| C7 | Bb7 | F7 | C7 :||
```

## Documentation

- [Chart Format](/format/) — the `.chart` file format reference
- [CLI Reference](/cli/) — the `grigson` command-line tool
- [Renderer](/renderer/) — plain-text and SVG renderers, configuration, and custom renderers
- [Testing](/testing/) — test strategy, conventions, and coverage
