# Slash Chord Visual Styles — Design Plan

## Context

The HTML renderer currently renders slash chords (e.g. `Cm7/Bb`) in a "Grigson" fraction
style: chord stacked above a 1px horizontal rule, bass below. We want to support two
additional visual styles modelled on the Real Book (diagonal line) and plain ASCII (`/`
character), while keeping the markup structure identical across all three.

The `accidentals` config option (→ `data-glyph` attribute) sets a precedent: a renderer
option adds a single attribute to the chord markup, and CSS uses that attribute to drive
the visual difference. We follow the same pattern here.

---

## Current markup — unchanged across all styles (html.ts:328–332)

```html
<span part="chord chord-slash" data-slash-style="diagonal">
  <span part="chord-top">Cm7</span>
  <span part="chord-fraction-line"></span>   ← empty span, used differently per style
  <span part="chord-bass">Bb</span>
</span>
```

The only markup change is adding `data-slash-style` to the outer span. All three styles
use the same four elements.

---

## The three styles

### 1. Horizontal (default — `data-slash-style="horizontal"` or absent)

The current behaviour. No layout changes needed from today's CSS.

### 2. Real Book diagonal (`data-slash-style="diagonal"`)

The outer container switches to a row layout. The `chord-fraction-line` span becomes a
thin rotated line implemented via its `::before` pseudo-element:

```
Cm7 ╱ Bb
```

The separator is a `1px`-wide element, initially vertical (`height: ~1.2em`), rotated by
a CSS custom property `--grigson-slash-angle` (default roughly `-25deg`, which produces a
line at ~65° from horizontal — close to Real Book proportions). Negative = leans like `/`.

Because the element's box doesn't change size on rotation, we give the `chord-fraction-line`
a small fixed width (e.g. `0.5em`) so it occupies appropriate space in the row, and use
`overflow: visible` so the rotated pseudo-element can protrude beyond its box.

`chord-top` gets `align-self: flex-start` (slightly raised) and `chord-bass` gets
`align-self: flex-end` (slightly lowered) to recreate the diagonal feel of the Real Book.

### 3. ASCII (`data-slash-style="ascii"`)

Row layout, both parts sit on the same baseline. The `chord-fraction-line` hides its
rotated line and instead renders a plain `/` character via `::before { content: "/"; }`.
No size or alignment tricks needed — the slash sits naturally in text flow.

---

## Why not pure CSS custom properties (no attribute)?

You can toggle `flex-direction` via a custom property (`flex-direction: var(--slash-dir, column)`),
but you can't conditionally activate multiple property changes together from a single
consumer-side custom property without CSS container style queries (too experimental). The
`data-slash-style` attribute approach mirrors the existing `data-glyph` pattern, keeps the
CSS readable, and is straightforward to expose as a renderer config option.

---

## CSS sketch (html-element.ts:296–316)

```css
/* ── Horizontal (default / "horizontal") ───────────────────────── */
[part="chord-slash"] {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
[part="chord-top"]          { display: flex; align-items: baseline; }
[part="chord-fraction-line"]{ width: 100%; height: 1px; background: var(--grigson-barline-color); }
[part="chord-bass"]         { font-size: 0.85em; }

/* ── Diagonal (Real Book) ───────────────────────────────────────── */
[part="chord-slash"][data-slash-style="diagonal"] {
  flex-direction: row;
  align-items: center;
  gap: 0;
}
[part="chord-slash"][data-slash-style="diagonal"] [part="chord-top"] {
  align-self: flex-start;
}
[part="chord-slash"][data-slash-style="diagonal"] [part="chord-fraction-line"] {
  position: relative;
  display: inline-block;
  width: 0.5em;
  height: 1.2em;
  background: none;   /* suppress the horizontal-bar style */
  overflow: visible;
}
[part="chord-slash"][data-slash-style="diagonal"] [part="chord-fraction-line"]::before {
  content: "";
  position: absolute;
  top: 0; bottom: 0;
  left: 50%;
  width: 1px;
  background: currentColor;
  transform: rotate(var(--grigson-slash-angle, -25deg));
  transform-origin: center;
}
[part="chord-slash"][data-slash-style="diagonal"] [part="chord-bass"] {
  align-self: flex-end;
}

/* ── ASCII ──────────────────────────────────────────────────────── */
[part="chord-slash"][data-slash-style="ascii"] {
  flex-direction: row;
  align-items: baseline;
  gap: 0;
}
[part="chord-slash"][data-slash-style="ascii"] [part="chord-fraction-line"] {
  width: auto;
  height: auto;
  background: none;
}
[part="chord-slash"][data-slash-style="ascii"] [part="chord-fraction-line"]::before {
  content: "/";
}
```

**Angle control:** consumers tweak `--grigson-slash-angle` on the host or any ancestor.
`-25deg` ≈ Real Book proportions; `-45deg` = true 45°; `0deg` = vertical.

---

## Renderer changes (html.ts + config type)

Following the `accidentals` → `mode` → `data-glyph` precedent:

1. Add `SlashStyle = 'horizontal' | 'diagonal' | 'ascii'` type.
2. In `GrigsonHtmlRenderer` (`html-element.ts`), add `'slash-style'` to `observedAttributes`
   and read it alongside `accidentals` (~line 361): if the value is `'diagonal'` or `'ascii'`,
   set `config.slashStyle` accordingly (default: `'horizontal'`).
3. In `renderChord()` (`html.ts`, ~line 328), emit `data-slash-style="${slashStyle}"` on the
   outer span — either always, or only when non-default (omitting it for `'horizontal'` keeps
   markup minimal and CSS defaults handle it).
4. Expose `slashStyle` in the renderer config type and docs.

The attribute therefore lives on `<grigson-html-renderer slash-style="diagonal">`, consistent
with `<grigson-html-renderer accidentals="ascii">`. It does not go on `<grigson-chart>`.

---

## Files to modify

- `packages/grigson/src/renderers/html.ts` — add `SlashStyle` type; thread option through `renderChord()` (~line 308); emit `data-slash-style` attribute
- `packages/grigson/src/renderers/html-element.ts` — replace slash-chord CSS block (~lines 296–316) with the three-style rules above
- Config type (wherever the renderer options interface lives) — add `slashStyle?: SlashStyle`
- `packages/grigson/src/renderers/html.test.ts` — add/update tests for diagonal and ascii variants
- README / documentation — document the new option and `--grigson-slash-angle` custom property

---

## Verification

1. Render a chart containing slash chords (`Cm7/Bb`, `G/B`, `C/E`) with each of the three
   `slashStyle` options and visually confirm:
   - `grigson`: stacked fraction with horizontal rule (unchanged)
   - `diagonal`: inline with a rotated line separator; tweak `--grigson-slash-angle` and
     confirm the angle changes without touching markup
   - `ascii`: inline `Cm7/Bb` with a plain `/` character
2. Run `pnpm test` — existing snapshot tests should pass unchanged for the default style.
