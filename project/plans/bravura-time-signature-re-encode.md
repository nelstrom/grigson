# Plan: Re-encode Bravura time-sig digits to Math Bold Unicode range

## Context

The HTML renderer currently outputs time signature digits as SMuFL characters U+E080–E089
(Private Use Area), which appear as tofu in raw HTML source. The goal is to move to Math Bold
Unicode digits U+1D7CE–1D7D7 (𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗), which are readable in source and visually
appropriate (bold numerals suit time signatures). The SMuFL positions will be retained in the
subset for backward compatibility, but the renderer will emit Math Bold going forward.

A `GrigsonTimeSig` @font-face family is injected as a named fallback so that custom
`--grigson-font-family` values (e.g. Kaushan Script) can't accidentally pick up Math Bold
glyphs from system fonts like Cambria Math.

---

## Files to change

| File                                                | Change                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `scripts/gen-bravura-subset.mjs`                    | Add Python pre-processing step to add Math Bold cmap aliases; add U+1D7CE-1D7D7 to UNICODES |
| `packages/grigson/src/renderers/html.ts`            | Change `SMUFL_DIGITS` codepoints to U+1D7CE–1D7D7                                           |
| `packages/grigson/src/renderers/html-element.ts`    | Add `GrigsonTimeSig` @font-face; update `[part="time-sig"]` font-family                     |
| `packages/grigson/src/renderers/bravura-subset.ts`  | Regenerated — do not edit manually                                                          |
| `packages/grigson-fonts/fonts/Bravura-subset.woff2` | Regenerated — do not edit manually                                                          |

---

## Step 1 — Add Math Bold cmap entries in `gen-bravura-subset.mjs`

Before running `pyftsubset`, insert a Python preprocessing step that opens `Bravura.otf`,
adds cmap aliases for U+1D7CE–1D7D7 pointing to the same glyph names as U+E080–E089, then
saves a temp file for subsetting. No new glyphs are created — the Math Bold codepoints are
just additional cmap entries referencing the same outlines.

```python
# Pseudocode for the embedded Python step:
from fontTools.ttLib import TTFont

font = TTFont("Bravura.otf")
for table in font['cmap'].tables:
    for i in range(10):
        gname = table.cmap.get(0xE080 + i)
        if gname:
            table.cmap[0x1D7CE + i] = gname
font.save("GrigsonBravura-tmp.otf")
```

Then update the UNICODES constant to include the new range:

```
const UNICODES = 'U+266D,U+266F,U+E080-E08B,U+E500,U+E501,U+1D7CE-1D7D7';
```

The subset now contains the Math Bold digits (pointing to the same outlines as U+E080–E089),
so one set of outlines serves both codepoint ranges.

---

## Step 2 — Update `html.ts`

In `packages/grigson/src/renderers/html.ts` (line 381), change the digit string from SMuFL
to Math Bold:

```typescript
// Before:
const SMUFL_DIGITS = '\uE080\uE081\uE082\uE083\uE084\uE085\uE086\uE087\uE088\uE089';

// After:
const TIME_SIG_DIGITS = '\uD835\uDFCE\uD835\uDFCF\uD835\uDFD0\uD835\uDFD1\uD835\uDFD2\uD835\uDFD3\uD835\uDFD4\uD835\uDFD5\uD835\uDFD6\uD835\uDFD7';
```

Note: U+1D7CE–1D7D7 are outside the BMP, so they need UTF-16 surrogate pairs in a JS string
literal. Alternatively use `String.fromCodePoint()`:

```typescript
const TIME_SIG_DIGITS = Array.from({ length: 10 }, (_, i) =>
  String.fromCodePoint(0x1D7CE + i)
).join('');
```

Rename the constant and update its one call site in `smuflDigits()`.

---

## Step 3 — Update `html-element.ts`

### 3a. Add `GrigsonTimeSig` @font-face in `_ensureFontFaces()`

After the existing Bravura injection, add a second injection for `GrigsonTimeSig`:

```typescript
const timeSigId = 'grigson-time-sig-font-face';
if (!document.getElementById(timeSigId)) {
  const style = document.createElement('style');
  style.id = timeSigId;
  style.textContent = `@font-face { font-family: "GrigsonTimeSig"; src: url("${bravuraWoff2}") format("woff2"); unicode-range: U+1D7CE-1D7D7; font-weight: normal; font-style: normal; }`;
  document.head.appendChild(style);
}
```

This ensures that even when `--grigson-font-family` is set to an external font (e.g. Kaushan
Script), `GrigsonTimeSig` in the font stack catches U+1D7CE–1D7D7 before system fonts like
Cambria Math can.

### 3b. Update `[part="time-sig"]` font-family in `_getStyles()`

```typescript
// Before (line 272):
font-family: "Bravura", serif;

// After:
font-family: var(--grigson-time-sig-font-family), "GrigsonTimeSig", serif;
```

The standalone `grigson-bravura-font-face` injection (used only by `[part="time-sig"]`) can
be removed since GrigsonTimeSig now handles the time-sig digits, and the composite families
already inject Bravura for U+266D/266F.

---

## Step 4 — Regenerate the subset

```bash
node scripts/gen-bravura-subset.mjs
```

This regenerates `bravura-subset.ts` and `packages/grigson-fonts/fonts/Bravura-subset.woff2`
with the Math Bold range included.

---

## Step 5 — Build and test

```bash
pnpm build
```

Verify in browser:

1. View HTML source of a chart with a time signature — digits should appear as `𝟒/𝟒` (Math
   Bold), not tofu.
2. A 4/4 time sig renders visually correctly (same appearance as before).
3. The `pnpm test` suite passes (html.test.ts covers time signature output).
4. With a custom `--grigson-font-family` that lacks Math Bold glyphs, time signatures still
   render from GrigsonTimeSig (Bravura), not system fonts.
