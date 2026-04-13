# Plan: ARIA Accessibility for the HTML Renderer

## Context

The HTML renderer emits chord charts with no ARIA attributes at all. SMuFL characters in the Private Use Area (e.g. barline glyphs U+E030–E042, simile glyph U+E500) are invisible to screen readers, and musical symbols like `△` (U+25B3) or `ø` (U+00F8) are announced with unhelpful names ("white up-pointing triangle", "latin small letter o with stroke"). Time signature numerals use Mathematical Bold digits (U+1D7CE–U+1D7D7) whose announcement is inconsistent across AT.

The goal is one consistent strategy: **put a human-readable `aria-label` on the highest meaningful semantic boundary, then `aria-hidden="true"` everything inside it.**

Chord duration matters too. Blind musicians need to hear "C, whole bar" vs "F, 2 beats, G, 2 beats" — the spatial width that sighted readers use to infer duration. This is encoded in `slotLayout.span` but isn't currently surfaced.

---

## Critical files

- `packages/grigson/src/renderers/html.ts` — renderer implementation
- `packages/grigson/src/renderers/text.ts` — `TextRendererConfig` (add new config fields + `SpokenPreset` type here)
- `packages/website/content/index.njk` — homepage (add accessibility mention)
- `packages/website/content/accessibility.md` — new dedicated page (create)
- `packages/website/_includes/base.njk` — site navigation (add Accessibility link)

---

## Part 1 — Config additions (text.ts)

### `SpokenPreset` interface

Add to `text.ts` so `html.ts` can import it without circularity:

```typescript
export interface SpokenPreset {
  /** Spoken suffix for each quality. Empty string = root only (major chord). */
  qualities: Record<string, string>;
  /** Format the duration part of a chord label. */
  duration(beats: number, isWholeBar: boolean): string;
  /** Label for a barline (null = hide with aria-hidden). */
  barline(kind: BarlineKind, repeatCount?: number): string | null;
  /** Label for a time signature. */
  timeSig(numerator: number, denominator: number): string;
  /** Label for a simile (bar repeat) mark. */
  simile: string;
}
```

> `BarlineKind` is already imported by `html.ts` from `parser/types.js`; add the same import to `text.ts` only if needed. Alternatively, typing `barline(kind: string, repeatCount?: number)` avoids the import at the cost of type precision — prefer importing the type.

### New fields on `TextRendererConfig`

```typescript
export interface TextRendererConfig {
  // … existing fields …
  /** Set false to suppress all aria-* attributes (e.g. for test fixtures or leaner markup). Default: true. */
  aria?: boolean;
  /** Override the spoken-word labels used in aria attributes. Defaults to English. */
  spokenPreset?: SpokenPreset;
}
```

### `DEFAULT_SPOKEN_PRESET`

Define in `html.ts` (near the aria helpers) and **export** it so integrators can spread-and-override:

```typescript
export const DEFAULT_SPOKEN_PRESET: SpokenPreset = {
  qualities: {
    major: '', minor: 'minor', dominant7: 'dominant 7',
    halfDiminished: 'half diminished 7', diminished: 'diminished',
    maj7: 'major 7', min7: 'minor 7', dim7: 'diminished 7',
    dom7flat5: 'dominant 7 flat 5',
  },
  duration: (beats, isWholeBar) =>
    isWholeBar ? 'whole bar' : `${beats} beat${beats !== 1 ? 's' : ''}`,
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
};
```

### Resolving the preset in `render()`

```typescript
const spoken = this.config.aria === false
  ? null
  : (this.config.spokenPreset ?? DEFAULT_SPOKEN_PRESET);
```

Pass `spoken` (or just the `aria === false` flag) through to `renderRow` and other helpers. When `spoken` is `null`, all aria attributes are omitted.

---

## Part 2 — Surface duration data through the layout

### Step 1A: Add `activeTSig` to `RowLayout.bars`

`renderRow` currently doesn't know the active time signature per bar — only when a new one should be _displayed_ (`showTimeSig`). Duration calculation requires the numerator to detect "whole bar".

Add a required field alongside `showTimeSig`:

```typescript
// RowLayout.bars items — add:
activeTSig: TimeSignature;
```

In `computeGlobalLayout` (line ~232), when building `rowLayout.bars.push(...)`, include the `activeTSig` that was current when that bar was computed. (The variable `activeTSig` is already maintained in the loop.)

### Step 1B: Pass `beatUnit` into `renderRow`

The global `beatUnit` is needed to convert effective beat columns back to time-signature beats:

```
effectiveBeatsPerChord = (slotLayout.span + 1) / 2   // in beatUnit subdivisions
tsBeats = effectiveBeatsPerChord × (activeTSig.denominator / beatUnit)
```

Add a `beatUnit: number` parameter to `renderRow`. The caller in `render()` already has `layout.beatUnit`.

### Duration calculation (in `renderRow`, per chord slot)

```typescript
const effectiveBeats = (slotLayout.span + 1) / 2;
const tsBeats = effectiveBeats * (barLayout.activeTSig.denominator / beatUnit);
const isWholeBar = tsBeats === barLayout.activeTSig.numerator;
```

`tsBeats` is always an integer (the layout ensures this). Pass both to `renderChord`.

---

## Part 2 — Element-by-element aria decisions

| Element                                                                                                                                        | Treatment                                                                                      | Notes                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `<div part="song">`                                                                                                                            | none                                                                                           | outer container                                                       |
| `<header>`, `<h1>`, `<h2>`, `<p>`                                                                                                              | none                                                                                           | native semantics fine; key text `B♭` acceptable ("musical flat sign") |
| `<section part="section">`                                                                                                                     | none                                                                                           | native section landmark                                               |
| `<div part="row">`                                                                                                                             | none                                                                                           | transparent `<span>` equivalent                                       |
| Barline `single/double/final`                                                                                                                  | `aria-hidden="true"` on outer span                                                             | purely decorative separators                                          |
| Barline `startRepeat`                                                                                                                          | `aria-label="start repeat"` on outer; children `aria-hidden`                                   | performance-critical                                                  |
| Barline `endRepeat` (count ≤ 2)                                                                                                                | `aria-label="end repeat"` on outer; children `aria-hidden`                                     |                                                                       |
| Barline `endRepeat` (count > 2)                                                                                                                | `aria-label="end repeat, play N times"` on outer; children `aria-hidden`                       |                                                                       |
| Barline `endRepeatStartRepeat`                                                                                                                 | `aria-label="end repeat, start repeat"` (with optional "play N times"); children `aria-hidden` |                                                                       |
| `<span part="barline-glyph">` etc.                                                                                                             | `aria-hidden="true"` when inside labelled barline                                              | PUA chars unpronounceable                                             |
| `<span part="slot …">`                                                                                                                         | none                                                                                           | transparent `<span>`, no implicit ARIA role                           |
| `<span part="dot …">`                                                                                                                          | wrap `"/"` in `<span aria-hidden="true">`                                                      | "slash" is meaningless                                                |
| `<span part="chord">` / `chord chord-slash`                                                                                                    | `aria-label="[spoken chord], [duration]"`                                                      | primary content                                                       |
| All chord children (`chord-root`, `chord-accidental`, `chord-quality`, `quality-accidental`, `chord-top`, `chord-fraction-line`, `chord-bass`) | `aria-hidden="true"`                                                                           | covered by parent label                                               |
| `<span part="time-sig">`                                                                                                                       | `aria-label="N/D time"`                                                                        | Math Bold digits unreliable                                           |
| `<span part="time-sig-num/den">`                                                                                                               | `aria-hidden="true"`                                                                           |                                                                       |
| `<span part="simile bar-start">`                                                                                                               | `aria-label="repeat bar"`; inner glyph `aria-hidden="true"`                                    | U+E500 unpronounceable                                                |

---

## Part 3 — New helpers to add

### `spokenNote` and `chordAriaLabel` (add above `renderChordInner`, ~line 293)

`QUALITY_SPOKEN` is gone — quality labels come from the preset. `spokenNote` is a pure utility.

```typescript
function spokenNote(note: string): string {
  const m = note.match(/^([A-G])(b+|#+)?$/);
  if (!m) return note;
  const acc = (m[2] ?? '')
    .replace(/bb/g, 'double flat').replace(/b/g, 'flat')
    .replace(/##/g, 'double sharp').replace(/#/g, 'sharp');
  return acc ? `${m[1]} ${acc}` : m[1];
}

function chordAriaLabel(
  chord: Chord,
  tsBeats: number,
  isWholeBar: boolean,
  spoken: SpokenPreset,
): string {
  const root = spokenNote(chord.root);
  const quality = spoken.qualities[chord.quality] ?? '';
  const base = quality ? `${root} ${quality}` : root;
  const named = chord.bass ? `${base} over ${spokenNote(chord.bass)}` : base;
  return `${named}, ${spoken.duration(tsBeats, isWholeBar)}`;
}
```

Example outputs (with default English preset):

- `"C, whole bar"`
- `"F, 2 beats"`
- `"B flat dominant 7 over G, 3 beats"`
- `"F sharp minor 7, whole bar"`

---

## Part 4 — Changes to existing functions

### `render()` — resolve spoken preset (~line 515)

```typescript
const spoken = this.config.aria === false
  ? null
  : (this.config.spokenPreset ?? DEFAULT_SPOKEN_PRESET);
```

Pass `spoken` to `renderRow`. All aria logic is skipped when `spoken` is `null`.

### `computeGlobalLayout` (~line 233)

Add `activeTSig` to the object pushed to `rowLayout.bars`:

```typescript
rowLayout.bars.push({
  slots,
  closeBarlineCol: ...,
  showTimeSig: barTimeSig,
  activeTSig,           // ← add this
});
```

Update `RowLayout.bars` type to include `activeTSig: TimeSignature`.

### `renderRow` signature (~line 418)

Add `beatUnit: number` and `spoken: SpokenPreset | null` parameters.

### `renderRow` — chord slot rendering (~line 462)

Compute duration and pass to `renderChord`:

```typescript
const effectiveBeats = (slotLayout.span + 1) / 2;
const tsBeats = effectiveBeats * (barLayout.activeTSig.denominator / beatUnit);
const isWholeBar = tsBeats === barLayout.activeTSig.numerator;
// pass tsBeats, isWholeBar, and spoken to renderChord
```

### `renderChord` signature (~line 307)

Add `tsBeats: number, isWholeBar: boolean, spoken: SpokenPreset | null` parameters. When `spoken` is not null, compute `aria-label` via `chordAriaLabel`. Apply as `aria-label` on the outer chord span. Add `aria-hidden="true"` to `chord-top`, `chord-fraction-line`, `chord-bass` (always, since they are visual-only — the aria-label on the parent still covers them even when `spoken` is null, and they have no standalone meaning).

### `renderChordRoot` (~line 274)

Add `aria-hidden="true"` to `<span part="chord-root">` and `<span part="chord-accidental">`.

### `wrapQualityAccidentals` (~line 266)

Add `aria-hidden="true"` to the `<span part="quality-accidental">` it produces.

### `renderChordInner` (~line 293)

Add `aria-hidden="true"` to `<span part="chord-quality">`.

### `renderBarline` (~line 355)

Add `spoken: SpokenPreset | null` parameter. When not null, call `spoken.barline(barline.kind, barline.repeatCount)`. If result is `null` → `aria-hidden="true"` on outer span. If a string → `aria-label="${label}"` on outer span + `aria-hidden="true"` on `barline-glyph` and `barline-repeat-count` children. When `spoken` is `null`, no aria attributes at all.

### `renderTimeSig` (~line 388)

Add `spoken: SpokenPreset | null` parameter. When not null, add `aria-label="${spoken.timeSig(ts.numerator, ts.denominator)}"` to outer span and `aria-hidden="true"` to both inner spans.

### `renderRow` — simile span (~line 448)

When `spoken` is not null:

```typescript
// before:
html += `<span part="simile bar-start" ...>${SIMILE_CHAR}</span>`;
// after:
html += `<span part="simile bar-start" ... aria-label="${spoken.simile}"><span aria-hidden="true">${SIMILE_CHAR}</span></span>`;
```

### `renderRow` — dot slots (~line 461)

The `"/"` is visual-only regardless of aria mode — always wrap it:

```typescript
html += `<span part="${dotPart}" ...>${timeSigPrefix}<span aria-hidden="true">/</span></span>`;
```

### `render()` — call site for `renderRow` (~line 553)

Pass `layout.beatUnit` and `spoken` as new parameters.

---

## Part 5 — What NOT to change

- `<p part="song-key">` — U+266D/U+266F announce as "musical flat/sharp sign", acceptable
- `role="group"` on `<div part="row">` — low value, heading structure is sufficient
- Screen-reader skip links — separate concern

---

## Part 6 — Website documentation

### 6A: Homepage (`packages/website/content/index.njk`)

Two edits:

1. Add a bullet to the "What's in the toolkit" `<ul>` (after the existing custom elements bullet, since accessibility applies to the HTML renderer):

```html
<li><a href="{{ '/accessibility/' | url }}">Accessibility</a> — screen-reader support built in; every chord is announced with its name, quality, and duration; fully customisable spoken labels for any language</li>
```

2. Optionally add a short sentence in the opening paragraph, or leave the bullet as the only mention — keep it understated, the dedicated page does the selling.

### 6B: Navigation (`packages/website/_includes/base.njk`)

Add an Accessibility link to the primary nav, between "Renderers" and "CLI" (proximity to renderers since the feature lives there):

```html
<a href="{{ '/accessibility/' | url }}">Accessibility</a>
|
```

### 6C: New page (`packages/website/content/accessibility.md`)

**Frontmatter:**

```yaml
---
layout: base.njk
title: Accessibility
permalink: /accessibility/
---
```

**Page outline** (Markdown, `base.njk` layout):

```
# Accessibility

Intro paragraph: grigson charts are visual objects, but the HTML renderer emits
full ARIA markup by default so screen reader users hear a complete spoken
rendition — chord names, qualities, durations, and repeat markers — without
any extra configuration.

---

## What screen readers hear

Short prose explanation of the strategy (aria-label on the chord span, aria-hidden
on internal glyphs). Then a concrete example showing source → spoken output:

Source:
  ||: (4/4) Cm7 | F7 | Bbmaj7 | % :||x3

A screen reader navigating this chart would hear, roughly:
  "start repeat"
  "C minor 7, whole bar"
  "F dominant 7, whole bar"
  "B flat major 7, whole bar"
  "repeat bar"
  "end repeat, play 3 times"

## Enabling and disabling

Brief note that aria is on by default. Code snippet showing opt-out:

  new HtmlRenderer({ aria: false })

Use cases: server-side rendering where you control the AT layer separately,
test fixtures where leaner markup is preferable.

## Spoken presets

Explanation that the spoken labels come from a SpokenPreset object, and that
the built-in one is English. List the SpokenPreset interface fields with a
one-line description of each.

Show DEFAULT_SPOKEN_PRESET in full as a reference point.

### Creating a preset for another language

Prose: "If your audience uses a language other than English, create a
SpokenPreset and pass it as spokenPreset in the renderer config."

Concrete example — a French preset:

  import { DEFAULT_SPOKEN_PRESET } from 'grigson';

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
    duration: (beats, isWholeBar) =>
      isWholeBar ? 'mesure entière' : `${beats} temps`,
    simile: 'répéter la mesure',
  };

  const renderer = new HtmlRenderer({ spokenPreset: frenchPreset });

Note: you only need to override the fields you want to change; spread
DEFAULT_SPOKEN_PRESET to inherit the rest.

### Using a preset with the custom element

Show how to pass a spokenPreset when using the <grigson-chart> web component
(via the renderChart() method, or via a subclass if the user controls the
element). Keep this brief and link to the custom elements page for full API.

---

## Notes for assistive technology authors

Short section noting: which elements carry aria-label (chord spans, repeat
barlines, time-sig spans, simile spans), which are aria-hidden (barline glyphs,
chord internals, dot slots, time-sig digit spans). Useful for AT developers
building music-specific navigation.
```

Keep the tone warm and practical — this page is both documentation and a
demonstration that grigson takes accessibility seriously.

---

## Verification

1. `pnpm build` — no type errors
2. `pnpm test` — existing tests pass
3. Add unit tests to `html.test.ts`:
   - `chordAriaLabel` for all 9 qualities, flat/sharp roots, bass notes, whole-bar vs partial (using default preset)
   - Integration assertions: rendered HTML for a sample 4/4 song includes `aria-label="C, whole bar"` on a single-chord bar; `aria-label="F, 2 beats"` and `aria-label="G, 2 beats"` on a two-chord bar
   - `aria-hidden="true"` on single barline; `aria-label="start repeat"` on start-repeat barline; `aria-label="end repeat, play 3 times"` on a count-3 end-repeat
   - `aria-label="4/4 time"` on time-sig span; `aria-label="repeat bar"` on simile span
   - `aria: false` config: rendered HTML contains no `aria-` attributes and no `aria-hidden`
   - Custom `spokenPreset`: rendered HTML uses overridden label strings
4. Manual spot-check with VoiceOver: open playground, navigate a chart, verify announcements like "C, whole bar", "F sharp minor 7, 2 beats", "end repeat, play 3 times"
5. `pnpm build` in `packages/website` — site builds without errors, `/accessibility/` page renders, nav link appears, homepage bullet links correctly
