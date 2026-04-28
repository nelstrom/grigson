---
layout: base.njk
title: Accessibility
permalink: /usage/accessibility/
---

# Accessibility

Grigson charts are visual objects, but the HTML renderer emits full ARIA markup by default — no configuration needed. Screen reader users hear a complete spoken rendition of each chart: chord names, qualities, durations, repeat markers, and time signatures, all without any extra setup.

---

## What screen readers hear

The strategy is simple: put a human-readable `aria-label` on each meaningful boundary (a chord, a repeat barline, a time signature), then mark everything inside it with `aria-hidden="true"`. This prevents the internal glyphs — SMuFL Private Use Area characters, mathematical bold digits, symbols like △ or ø — from being announced with unhelpful names.

Here is a concrete example. Given this source:

```grigson
||: (4/4) Cm7 | F7 | Bbmaj7 | % :||x3
```

A screen reader navigating the rendered chart would hear, roughly:

> "start repeat"
> "4/4 time"
> "C minor 7, whole bar"
> "F dominant 7, whole bar"
> "B flat major 7, whole bar"
> "repeat bar"
> "end repeat, play 3 times"

Chord duration is included because blind musicians rely on it the way sighted readers rely on spatial width. A bar with a single chord is announced as "whole bar"; a bar split between two chords says "2 crotchets" (or "2 quavers" in 6/8 time).

---

## Enabling and disabling

ARIA is on by default. To disable it — for example in server-side rendering where you control the AT layer separately, or in test fixtures where leaner markup is preferable:

```js
import { HtmlRenderer } from 'grigson';

const renderer = new HtmlRenderer({ aria: false });
```

When `aria` is `false`, no `aria-label` or `aria-hidden` attributes are emitted anywhere in the output.

---

## Spoken presets

All spoken labels come from a `SpokenPreset` object. The built-in preset is English. The interface is:

| Field       | Type                                         | Purpose                                                                                                                                                                       |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qualities` | `Record<string, string>`                     | Spoken suffix for each chord quality. Empty string = root only (used for major chords).                                                                                       |
| `note`      | `(letter, accidental) => string`             | Spoken name for a note. `letter` is one of A–G; `accidental` is an already-expanded word (`'flat'`, `'sharp'`, `'double flat'`, `'double sharp'`) or `''` for a natural note. |
| `duration`  | `(beats, isWholeBar, denominator) => string` | Formats the duration part of a chord label. `denominator` is the time-signature denominator (e.g. 4 for 4/4, 8 for 6/8).                                                      |
| `barline`   | `(kind, repeatCount?) => string \| null`     | Returns a label for a repeat barline, or `null` to hide decorative barlines with `aria-hidden`.                                                                               |
| `timeSig`   | `(numerator, denominator) => string`         | Returns a label for a time signature span.                                                                                                                                    |
| `simile`    | `string`                                     | Label for a simile (bar repeat) mark.                                                                                                                                         |

The default English preset (`DEFAULT_SPOKEN_PRESET`, exported from `grigson`) is:

```js
import { DEFAULT_SPOKEN_PRESET } from 'grigson';

// DEFAULT_SPOKEN_PRESET:
{
  qualities: {
    major: '',
    minor: 'minor',
    dominant7: 'dominant 7',
    halfDiminished: 'half diminished 7',
    diminished: 'diminished',
    maj7: 'major 7',
    min7: 'minor 7',
    dim7: 'diminished 7',
    dom7flat5: 'dominant 7 flat 5',
  },
  // 'A' reads as the article "a" (ah) before a quality word, so spell it phonetically.
  note: (letter, accidental) => {
    const name = letter === 'A' ? 'Ay' : letter;
    return accidental ? `${name} ${accidental}` : name;
  },
  duration: (beats, isWholeBar, denominator) => {
    if (isWholeBar) return 'whole bar';
    const name = denominator === 4 ? 'crotchet' : denominator === 8 ? 'quaver' : 'beat';
    return `${beats} ${name}${beats !== 1 ? 's' : ''}`;
  },
  barline: (kind, repeatCount) => {
    const playN = repeatCount !== undefined && repeatCount > 2
      ? `, play ${repeatCount} times` : '';
    if (kind === 'startRepeat') return 'start repeat';
    if (kind === 'endRepeat') return `end repeat${playN}`;
    if (kind === 'endRepeatStartRepeat') return `end repeat${playN}, start repeat`;
    return null;
  },
  timeSig: (n, d) => `${n}/${d} time`,
  simile: 'repeat bar',
}
```

### Creating a preset for another language

If your audience uses a language other than English, create a `SpokenPreset` and pass it as `spokenPreset` in the renderer config. You only need to override the fields you want to change — spread `DEFAULT_SPOKEN_PRESET` to inherit the rest.

Here is a French example. French uses fixed-do solfège for note names (do, ré, mi, fa, sol, la, si) and its own words for accidentals:

```js
import { HtmlRenderer, DEFAULT_SPOKEN_PRESET } from 'grigson';

const SOLFEGE = { C: 'do', D: 'ré', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' };
const FR_ACC = { flat: 'bémol', sharp: 'dièse', 'double flat': 'double bémol', 'double sharp': 'double dièse' };

const frenchPreset = {
  ...DEFAULT_SPOKEN_PRESET,
  qualities: {
    major: '',
    minor: 'mineur',
    dominant7: 'septième de dominante',
    halfDiminished: 'demi-diminué',
    diminished: 'diminué',
    maj7: 'majeur septième',
    min7: 'mineur septième',
    dim7: 'diminué septième',
    dom7flat5: 'septième bémol cinq',
  },
  note: (letter, accidental) => {
    const name = SOLFEGE[letter] ?? letter;
    return accidental ? `${name} ${FR_ACC[accidental] ?? accidental}` : name;
  },
  duration: (beats, isWholeBar) =>
    isWholeBar ? 'mesure entière' : `${beats} temps`,
  simile: 'répéter la mesure',
};

const renderer = new HtmlRenderer({ spokenPreset: frenchPreset });
```

The result: a C minor chord lasting a whole bar is announced "do mineur, mesure entière".

### Using a preset with the custom element

The `<grigson-chart>` custom element uses `HtmlRenderer` internally. To supply a custom preset, call `renderChart()` directly on the element after the DOM is ready:

```js
import { DEFAULT_SPOKEN_PRESET } from 'grigson';

const chart = document.querySelector('grigson-chart');
chart.renderChart({ spokenPreset: frenchPreset });
```

See the [custom elements page]({{ '/usage/custom-elements/' | url }}) for the full element API.

---

## Notes for assistive technology authors

The following summarises which elements carry which ARIA attributes in the rendered HTML, for AT developers building music-specific navigation or testing tools.

**Elements with `aria-label`:**

- `<span part="chord">` and `<span part="chord chord-slash">` — the chord label, e.g. `"F sharp minor 7, 2 crotchets"`
- `<span part="barline-…">` — repeat barlines only (start repeat, end repeat, end-and-start repeat); decorative barlines get `aria-hidden` instead
- `<span part="time-sig">` — e.g. `"4/4 time"`
- `<span part="simile bar-start">` — `"repeat bar"` (or the preset's `simile` string)

**Elements with `aria-hidden="true"`:**

- All chord child spans: `chord-root`, `chord-accidental`, `chord-quality`, `quality-accidental`, `chord-top`, `chord-fraction-line`, `chord-bass` — covered by the parent chord label
- `<span part="barline-glyph">` and `<span part="barline-repeat-count">` inside labelled repeat barlines
- `<span part="time-sig-num">` and `<span part="time-sig-den">` — Math Bold digits whose AT announcement is inconsistent
- The glyph span inside `<span part="simile bar-start">` — U+E500 is unpronounceable
- `<span aria-hidden="true">/</span>` inside dot slots — the slash is visual-only
