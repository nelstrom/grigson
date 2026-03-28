---
layout: base.njk
title: Time Signatures
permalink: /api/time-signatures/
---

# Time Signatures

Time signatures in grigson flow through three layers: the source format, the bar data model, and the renderer layout. Each layer has a specific responsibility.

---

## Source format

A time signature annotation is written in parentheses before the first chord of a bar:

```
| (4/4) C | Am | F | G |
| (3/4) Am | F | C | G |
```

Mid-song changes are written on the bar where the meter changes:

```
| (4/4) F  | Dm | Bb | C |
| F  | Dm | (2/4) Bb | C ||.
```

---

## Bar data model

The parser sets `bar.timeSignature` on any bar that carries an explicit inline annotation. Bars without an annotation have `bar.timeSignature === undefined`, even if a meter is in effect from an earlier bar.

The normalizer adds one additional annotation: if the song's front matter declares a `meter:` field and no bar already carries an inline time signature on the very first bar, the normalizer sets `bar.timeSignature` on that bar. This ensures the declared meter appears as a visible annotation at the start of the chart.

---

## HTML renderer layout

The `computeGlobalLayout` function tracks the currently active time signature as it walks bars in order. When it encounters a bar with `bar.timeSignature` set, it:

1. Updates `activeTSig` to the new value.
2. Sets `showTimeSig` on the layout object for that bar's **first slot only**.

`showTimeSig` is `undefined` on every other slot in the bar, and on all slots of bars that carry no annotation. The renderer uses `showTimeSig` to decide whether to emit a `[part="time-sig"]` element inside a slot.

---

## CSS layout

The time signature is rendered as an absolutely-positioned element inside its chord slot, so it occupies no space in the flex layout and does not displace the chord.

The first slot after each barline receives extra left padding via the adjacent-sibling selector:

```css
[part~="barline"] + [part="slot"] {
  padding-left: 1em;
}
```

This creates a reserved zone to the left of every first chord. The time signature floats in this zone:

```css
[part="time-sig"] {
  position: absolute;
  left: 0.75em;
  top: 50%;
  transform: translate(-50%, -50%);
}
```

The result is that the time signature sits visually between the barline and the chord, and the chord's horizontal position is identical whether or not a time signature is present.

---

## Summary of responsibilities

| Layer                          | Responsibility                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Parser                         | Sets `bar.timeSignature` on bars with an inline `(n/d)` annotation                                       |
| Normalizer                     | Sets `bar.timeSignature` on the first bar when a `meter:` front-matter field is declared                 |
| Layout (`computeGlobalLayout`) | Sets `showTimeSig` on the first slot of each annotated bar                                               |
| HTML renderer                  | Emits `[part="time-sig"]` inside the slot when `showTimeSig` is set                                      |
| CSS                            | Reserves space with `padding-left` on post-barline slots; positions time-sig absolutely within that zone |
