---
layout: base.njk
title: Grille harmonique renderer
permalink: /renderers/grille-harmonique/
---

# Grille harmonique renderer

The `grigson-grille-harmonique-renderer` package renders `.chart` files as French jazz-style _grilles harmoniques_ — each bar is a square, subdivided diagonally to show how many chords fall within it.

A visual proof-of-concept with labelled subdivision examples is available at [/grille-harmonique/](/grille-harmonique/).

## Constraints

- **4/4 only.** Non-4/4 time signatures cause a render error.
- **Quarter-note granularity.** Chord durations must be whole quarter notes (1, 2, 3, or 4 beats).
- **8 bar patterns** are supported: `1`, `2+2`, `3+1`, `1+3`, `2+1+1`, `1+2+1`, `1+1+2`, and `1+1+1+1`.
- Simile bars (same chord slots as the previous bar) render as a `%` glyph in a plain square.

---

## CLI

```sh
# HTML fragment (default)
grigson-grille-harmonique-renderer my-chart.chart

# Standalone HTML page, open in browser
grigson-grille-harmonique-renderer --format standalone my-chart.chart > chart.html
open chart.html

# From stdin
cat my-chart.chart | grigson-grille-harmonique-renderer
```

### CLI options

| Option                          | Default   | Description                                   |
| ------------------------------- | --------- | --------------------------------------------- |
| `--format <fmt>`                | `html`    | `html` (fragment) or `standalone` (full page) |
| `--notation-preset <name>`      | —         | Named preset, e.g. `realbook`                 |
| `--notation-preset-file <path>` | —         | JSON file with partial `NotationPreset`       |
| `--bars-per-line <n>`           | `4`       | Bars per row                                  |
| `--accidentals <mode>`          | `unicode` | `unicode` (♭♯) or `ascii` (b#)                |

---

## Custom element

The package registers the `grigson-grille-harmonique-renderer` custom element, which implements the `GrigsonRendererElement` interface and can be used with `<grigson-chart>`.

```html
<script type="module" src="grigson-grille-harmonique-renderer.esm.js"></script>

<grigson-chart src="my-chart.chart">
  <grigson-grille-harmonique-renderer bars-per-line="4"></grigson-grille-harmonique-renderer>
</grigson-chart>
```

### Observed attributes

| Attribute         | Default   | Description           |
| ----------------- | --------- | --------------------- |
| `notation-preset` | —         | Named notation preset |
| `bars-per-line`   | `4`       | Bars per row          |
| `accidentals`     | `unicode` | `unicode` or `ascii`  |

---

## CSS custom properties

These properties can be set on any ancestor of the chart element:

| Property   | Default  | Description                           |
| ---------- | -------- | ------------------------------------- |
| `--cg-gap` | `3px`    | Line thickness between zones          |
| `--cg-bar` | `5.5rem` | Width (and height) of each bar square |

---

## `part` attributes

Every rendered element carries a `part` attribute so you can style it from outside a shadow root or via plain CSS selectors:

| Part                                                                                                                                     | Element                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `chart`                                                                                                                                  | Outer chart container (`<div>`) |
| `row`                                                                                                                                    | Row of bars (`<div>`)           |
| `section`                                                                                                                                | Section wrapper (`<div>`)       |
| `section-label`                                                                                                                          | Section label text (`<span>`)   |
| `bar`                                                                                                                                    | Individual bar square (`<div>`) |
| `bar-1`, `bar-2-2`, `bar-3-1`, `bar-1-3`, `bar-2-1-1`, `bar-1-2-1`, `bar-1-1-2`, `bar-1-1-1-1`                                           | Pattern-specific bar modifier   |
| `bar-simile`                                                                                                                             | Simile bar (shows `%`)          |
| `zone`                                                                                                                                   | White zone fill (`<div>`)       |
| `zone-tl`, `zone-br`, `zone-top`, `zone-right`, `zone-bottom`, `zone-left`, `zone-main`, `zone-corner`, `zone-mid`, `zone-tr`, `zone-bl` | Zone position modifiers         |
| `chord`                                                                                                                                  | Chord label (`<span>`)          |
| `chord-root`                                                                                                                             | Root note letter                |
| `chord-accidental`                                                                                                                       | Accidental symbol (♭ or ♯)      |
| `chord-quality`                                                                                                                          | Quality symbol (m, 7, △, etc.)  |
| `chord-bass`                                                                                                                             | Bass note for slash chords      |
| `song-header`                                                                                                                            | Header block (`<header>`)       |
| `song-title`                                                                                                                             | Song title (`<p>`)              |
| `song-key`                                                                                                                               | Song key (`<p>`)                |

### Example: larger bars with thicker lines

```css
grigson-grille-harmonique-renderer {
  --cg-bar: 7rem;
  --cg-gap: 4px;
}
```
