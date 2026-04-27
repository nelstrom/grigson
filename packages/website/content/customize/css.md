---
layout: base.njk
title: CSS Custom Properties
permalink: /customize/css/
---

# CSS Custom Properties

Grigson charts are fully themeable via CSS custom properties. Set these on the `<grigson-chart>` element or any ancestor.

For information about the HTML structure these properties target, see the [HTML renderer](/usage/html-renderer/) page.

---

## Typography and colour

| Property                              | Default                        | Description                                     |
| ------------------------------------- | ------------------------------ | ----------------------------------------------- |
| `--grigson-font-family`               | embedded Noto (see `typeface`) | Overrides the entire chart font                 |
| `--grigson-title-font-family`         | inherits                       | Font for the song title                         |
| `--grigson-section-label-font-family` | inherits                       | Font for section labels                         |
| `--grigson-font-size`                 | `1rem`                         | Base font size; reduce to fit narrow containers |
| `--grigson-color`                     | `inherit`                      | Text and barline colour                         |
| `--grigson-background`                | `transparent`                  | Background of the host element                  |

## Layout

| Property                     | Default        | Description                                                                 |
| ---------------------------- | -------------- | --------------------------------------------------------------------------- |
| `--grigson-row-gap`          | `1.2em`        | Vertical gap between rows                                                   |
| `--grigson-row-border-width` | `0px`          | Width of the top and bottom border on each row; set to e.g. `1px` to enable |
| `--grigson-row-border-color` | `currentColor` | Colour of the row top/bottom border                                         |
| `--grigson-section-gap`      | `2em`          | Top margin before each section label                                        |

## Barlines

| Property                         | Default        | Description                                                                                    |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `--grigson-barline-width`        | `1.5px`        | Barline stroke width                                                                           |
| `--grigson-barline-color`        | `currentColor` | Barline colour                                                                                 |
| `--grigson-barline-glyph-offset` | `0.15em`       | Vertical nudge for repeat/complex barline glyphs; corrects for Bravura's ascent-biased metrics |

## Font sizes

| Property                            | Default | Description                                                                                  |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `--grigson-title-font-size`         | `1.4em` | Font size of the song title                                                                  |
| `--grigson-section-label-font-size` | `0.9em` | Font size of section headings                                                                |
| `--grigson-time-sig-font-size`      | `1.1em` | Font size of time signature annotations                                                      |
| `--grigson-time-sig-line-height`    | `0.55`  | Line height between numerator and denominator                                                |
| `--grigson-time-sig-offset`         | `0`     | Vertical nudge via `translateY`; percentage is relative to the time-sig element's own height |

---

## Grid geometry variables

Two additional variables are set by the renderer on `part="song"` and control the grid geometry. You can override them, but the renderer computes the right values automatically:

| Variable           | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `--beat-cols`      | Total beat columns in the grid (beat count of the longest row)  |
| `--min-beat-width` | Minimum width of one beat column, derived from the widest chord |

---

## Handling narrow containers

The renderer does not auto-scale. If the chart overflows its container, reduce the font size:

```css
grigson-chart {
  --grigson-font-size: 0.8rem;
}
```

All spacing is expressed in `em` units, so the rendered output scales proportionally.

---

## Example: dark theme

```css
grigson-chart {
  --grigson-color: #e0e0e0;
  --grigson-background: #1a1a1a;
  --grigson-barline-color: #888;
}
```

## Example: editorial style

```css
grigson-chart {
  --grigson-font-family: 'Playfair Display', serif;
  --grigson-title-font-size: 1.8em;
  --grigson-section-label-font-family: 'Playfair Display SC', serif;
  --grigson-row-border-width: 1px;
  --grigson-row-border-color: #ccc;
  --grigson-row-gap: 1.8em;
}
```
