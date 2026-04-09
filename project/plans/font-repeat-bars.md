# Plan: Phase B — Barlines and repeat signs via font glyphs

## Context

Following Phase A (simile mark), this plan switches barlines and repeat signs from custom
inline SVG to SMuFL PUA font glyphs. Petaluma's barline glyphs (U+E030–E033) are
characterfully handwritten; Bravura's are clean and geometric. The same `unicode-range`
@font-face composition pattern provides per-typeface variation automatically.

---

## Grid architecture: no change required

The user proposed reserving dedicated grid cells for barline gaps (interleaved beats +
barline columns). This would make barlines more semantic in the HTML, but it's a larger
architectural change that:

- Requires emitting an explicit `grid-template-columns` string per song (can't use a simple
  `repeat(N, 1fr)` anymore)
- Complicates the `subgrid` approach that lets all rows share the parent grid
- Has non-trivial interactions with mixed time signatures

The current zero-width trick (`width: 0; position: relative`) works equally well for font
glyphs as it does for SVGs. Glyphs are absolutely positioned within the zero-width barline
span — same anchoring (left/right/centred) as today. The grid architecture change is deferred
as a separate future task.

---

## SMuFL codepoints

| BarlineKind          | Codepoint | Glyph name      | Petaluma | Bravura | GrigsonJazz             |
| -------------------- | --------- | --------------- | -------- | ------- | ----------------------- |
| single               | U+E030    | barlineSingle   | ✓        | ✓       | ✓ (FinaleJazz has this) |
| double               | U+E031    | barlineDouble   | ✓        | ✓       | ✗ → Bravura fallback    |
| final                | U+E032    | barlineFinal    | ✓        | ✓       | ✗ → Bravura fallback    |
| startRepeat          | U+E040    | repeatLeft      | ✓        | ✓       | ✓ (FinaleJazz has this) |
| endRepeat            | U+E041    | repeatRight     | ✓        | ✓       | ✓ (FinaleJazz has this) |
| endRepeatStartRepeat | U+E042    | repeatRightLeft | ✓        | ✓       | ✓ (FinaleJazz has this) |

FinaleJazz.otf has U+E030 (single barline) and U+E040–E042 (repeat signs), but not
U+E031/E032 (double/final). GrigsonJazz users get Bravura glyphs for double and final
barlines via the `GrigsonNotation` fallback.

---

## Files to change

| File                                             | Change                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `packages/grigson/src/renderers/html.ts`         | Replace SVG constants with PUA chars; add `part="barline-glyph"` inner span                              |
| `packages/grigson/src/renderers/html-element.ts` | New `GrigsonNotation` @font-face; add barline-glyph CSS; expose CSS variables; update single-barline CSS |
| `scripts/gen-bravura-subset.mjs`                 | Add U+E030-E033,U+E040-E042 to UNICODES                                                                  |
| `scripts/gen-jazz-subsets.mjs`                   | Add U+E030-E033,U+E040-E042 to Petaluma unicodes; add U+E030 to GrigsonJazz unicodes                     |
| `scripts/reencode-finale-jazz.mjs`               | Add uniE030 to IMPORT dict                                                                               |
| `packages/grigson/documentation/renderer.md`     | Document new CSS custom properties                                                                       |

---

## Step 1 — `html.ts`: replace SVG with glyph characters

### 1a. Remove SVG constants and add glyph map

Remove `BARLINE_DOUBLE_SVG`, `BARLINE_FINAL_SVG`, `BARLINE_START_REPEAT_SVG`,
`BARLINE_END_REPEAT_SVG`, `BARLINE_END_START_REPEAT_SVG`, `BARLINE_SVG_ATTRS`, and
`BARLINE_SVGS`. Replace with:

```typescript
// SMuFL PUA codepoints for barline/repeat glyphs (Bravura fallback always present)
const BARLINE_GLYPHS: Partial<Record<BarlineKind, string>> = {
  single: String.fromCodePoint(0xe030),             // barlineSingle (shown only for cursive via CSS)
  double: String.fromCodePoint(0xe031),             // barlineDouble
  final: String.fromCodePoint(0xe032),              // barlineFinal
  startRepeat: String.fromCodePoint(0xe040),        // repeatLeft
  endRepeat: String.fromCodePoint(0xe041),          // repeatRight
  endRepeatStartRepeat: String.fromCodePoint(0xe042), // repeatRightLeft
};
```

### 1b. Update `renderBarline()`

```typescript
function renderBarline(barline: Barline, col: number): string {
  const kindPart = `barline-${barline.kind}`;
  const style = `style="grid-column: ${col}"`;
  const glyph = BARLINE_GLYPHS[barline.kind] ?? '';
  const glyphHtml = glyph ? `<span part="barline-glyph">${glyph}</span>` : '';
  const repeatCountHtml =
    barline.repeatCount !== undefined && barline.repeatCount > 2
      ? `<span part="barline-repeat-count">×${barline.repeatCount}</span>`
      : '';
  return `<span part="barline ${kindPart}" ${style}>${glyphHtml}${repeatCountHtml}</span>`;
}
```

The `part="barline-glyph"` inner span mirrors how `part="barline-repeat-count"` is already
a child span — absolutely positioned, styleable via CSS.

---

## Step 2 — `html-element.ts`: font faces

### 2a. New `GrigsonNotation` @font-face

Add a new named font alongside `GrigsonTimeSig` in `_ensureFontFaces()`. This covers all
SMuFL notation glyphs from Bravura that are not already in `GrigsonTimeSig`:

```typescript
`@font-face{font-family:"GrigsonNotation";src:url("${bravuraWoff2}") format("woff2");unicode-range:U+E030-E033,U+E040-E042;font-weight:normal;font-style:normal}`
```

(Alternatively, extend `GrigsonTimeSig`'s unicode-range — but a separate named family is
clearer about purpose.)

### 2b. Add barline codepoints to GrigsonCursive

The GrigsonCursive Petaluma @font-face already covers U+1D7CE-1D7D7,U+E500-E501 (from Phase A).
Add U+E030-E033,U+E040-E042:

```typescript
`@font-face{font-family:"GrigsonCursive";src:url("${grigsonPetalumaNotationWoff2}") format("woff2");unicode-range:U+1D7CE-1D7D7,U+E030-E033,U+E040-E042,U+E500-E501;...}`
```

Note: this requires a new or expanded Petaluma subset WOFF2 that includes these ranges. Two
options:

- **Option A**: Expand the existing `grigson-petaluma-timesig-subset.ts` to include all
  notation glyphs (rename to `grigson-petaluma-notation-subset.ts` for clarity)
- **Option B**: Create a separate `grigson-petaluma-barline-subset.ts` and a separate
  `@font-face` rule covering only U+E030-E033,U+E040-E042

Option A is simpler (one import, one WOFF2 file). Recommend Option A.

### 2c. GrigsonJazz: add U+E030 and U+E040–E042

FinaleJazz has E030 (single barline) and E040–E042 (repeat signs), but not E031/E032
(double/final). After adding them to the reencode script and gen-jazz-subsets, the
"FinaleJazz" @font-face on the tutorial page will serve these glyphs automatically.
No @font-face change in html-element.ts — the tutorial page's unrestricted @font-face already
covers all codepoints in the WOFF2.

---

## Step 3 — `html-element.ts`: CSS

### 3a. Add CSS variables to `:host`

```css
:host {
  /* existing ... */
  --grigson-barline-font-size: 2em;
}
```

### 3b. Add to per-typeface blocks

```css
:host([typeface="cursive"]) {
  /* existing time-sig and simile vars ... */
  --grigson-barline-font-size: 2em;  /* tune visually after implementation */
}
:host([typeface="serif"]) {
  /* existing ... */
  --grigson-barline-font-size: 2em;
}
```

### 3c. `[part="barline-glyph"]` positioning CSS

Replace `[part~="barline"] svg` rules with `[part="barline-glyph"]` rules. The anchoring
logic (left/right/centred) is the same:

```css
[part="barline-glyph"] {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--grigson-barline-font-family, var(--grigson-font-family, ${defaultFamily})), "GrigsonNotation", serif;
  font-size: var(--grigson-barline-font-size);
  font-weight: normal;
  line-height: 1;
}

/* startRepeat: thick part on left, dots extend right */
[part~="barline-startRepeat"] [part="barline-glyph"] {
  left: 0;
}

/* double, final, endRepeat: thick part on right */
[part~="barline-double"] [part="barline-glyph"],
[part~="barline-final"] [part="barline-glyph"],
[part~="barline-endRepeat"] [part="barline-glyph"] {
  right: 0;
}

/* endRepeatStartRepeat: centred on the column boundary */
[part~="barline-endRepeatStartRepeat"] [part="barline-glyph"] {
  left: 0;
  transform: translate(-50%, -50%);
}
```

### 3d. Single barline: keep CSS border for sans/serif, use glyph for cursive

```css
/* Default: CSS border, glyph hidden */
[part~="barline-single"] {
  border-left: var(--grigson-barline-width) solid var(--grigson-barline-color);
}
[part~="barline-single"] [part="barline-glyph"] {
  display: none;
}

/* Cursive: no border, glyph shown */
:host([typeface="cursive"]) [part~="barline-single"] {
  border-left: none;
}
:host([typeface="cursive"]) [part~="barline-single"] [part="barline-glyph"] {
  display: revert;
  left: 0;  /* single barline glyph: left-anchored */
}
```

### 3e. Remove `[part~="barline"] svg` rules

Remove the old SVG-specific rules (`[part~="barline"] svg`, `[part~="barline-startRepeat"] svg`,
etc.) which are no longer needed.

---

## Step 4 — Regenerate subsets

### 4a. `scripts/gen-bravura-subset.mjs`

```javascript
// before:
const UNICODES = 'U+266D,U+266F,U+E080-E08B,U+E500,U+E501,U+1D7CE-1D7D7';

// after:
const UNICODES = 'U+266D,U+266F,U+E030-E033,U+E040-E042,U+E080-E08B,U+E500-E501,U+1D7CE-1D7D7';
```

Run: `node scripts/gen-bravura-subset.mjs`

### 4b. `scripts/reencode-finale-jazz.mjs`

Add to IMPORT dict:

```javascript
// barline and repeat glyphs available in FinaleJazz.otf
0xE030: 'uniE030',  // barlineSingle
0xE040: 'uniE040',  // repeatLeft
0xE041: 'uniE041',  // repeatRight
0xE042: 'uniE042',  // repeatRightLeft
```

Run: `node scripts/reencode-finale-jazz.mjs`

### 4c. `scripts/gen-jazz-subsets.mjs`

**Petaluma.otf entry** — extend unicodes (and rename outTs/pkgWoff2Name if going with Option A):

```javascript
// outTs: rename to grigson-petaluma-notation-subset.ts
// pkgWoff2Name: rename to GrigsonPetaluma-notation-subset.woff2
// exportName: rename to grigsonPetalumaNotationWoff2
unicodes: 'U+1D7CE-1D7D7,U+E030-E033,U+E040-E042,U+E500-E501',
```

**GrigsonJazz.otf entry** — add U+E030 and U+E040-E042:

```javascript
unicodes: 'U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7,U+E030,U+E040-E042,U+E500-E501',
```

Run: `node scripts/gen-jazz-subsets.mjs`

### 4d. Update import in `html-element.ts`

If Option A (rename), update the import:

```typescript
// before:
import { grigsonPetalumaTimeSigWoff2 } from './grigson-petaluma-timesig-subset.js';
// after:
import { grigsonPetalumaNotationWoff2 } from './grigson-petaluma-notation-subset.js';
```

---

## Step 5 — Test updates

`html.test.ts` tests for barlines check `part="barline"` and `part="barline-{kind}"` in the
HTML — these don't change. Remove or update any test that asserts on the SVG content of
barlines (check for `<svg` in barline context). Add a test that confirms `part="barline-glyph"`
is present inside repeat barline spans.

---

## Step 6 — Documentation

Add `--grigson-barline-font-size` to the CSS custom properties table in `renderer.md`.

---

## Font cascade per typeface

| Typeface   | U+E030 (single)           | U+E031/E032 (double/final) | U+E040-E042 (repeats)     |
| ---------- | ------------------------- | -------------------------- | ------------------------- |
| sans       | GrigsonNotation → Bravura | GrigsonNotation → Bravura  | GrigsonNotation → Bravura |
| serif      | GrigsonNotation → Bravura | GrigsonNotation → Bravura  | GrigsonNotation → Bravura |
| cursive    | GrigsonCursive → Petaluma | GrigsonCursive → Petaluma  | GrigsonCursive → Petaluma |
| FinaleJazz | FinaleJazz @font-face     | GrigsonNotation → Bravura  | FinaleJazz @font-face     |

---

## Verification

1. `pnpm build` and `pnpm test` pass
2. Browser at `localhost:8080/grigson/tutorial/typefaces/`:
   - Cursive: single barline shows Petaluma handwritten single line; double/final show Petaluma glyphs; repeats show Petaluma repeat glyphs
   - Sans/serif: barlines visually unchanged (Bravura glyphs match current SVG geometry)
   - FinaleJazz: single barline and repeat signs show FinaleJazz glyphs; double/final barlines fall back to Bravura
   - Tune `--grigson-barline-font-size` per typeface until proportions match or improve on the SVG
3. Check that `×3` repeat count still renders correctly (absolutely positioned above the glyph)
4. Bump `grigson-fonts` to 1.1.4; push new CDN tag for Bravura and GrigsonJazz subset changes

---

## Open questions

1. **Option A vs B for Petaluma subset**: rename `grigson-petaluma-timesig-subset` to
   `grigson-petaluma-notation-subset` (broader scope) or create a separate barline subset?
   Recommend Option A to keep the number of WOFF2 files manageable. - Yes, good call.

2. **`barline-glyph` vs inline text in barline span**: this plan uses a dedicated
   `part="barline-glyph"` inner span. An alternative is to emit the glyph character directly
   into the barline span and make the barline span itself `position: absolute`. Evaluate
   during implementation. - agree.
