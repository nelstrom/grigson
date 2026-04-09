# Plan: Phase A — Simile mark via font glyph (U+E500/E501)

## Context

The simile mark is currently rendered as a custom inline SVG (two circles + diagonal bar).
Switching to the SMuFL glyph at U+E500 (repeat1Bar) enables per-typeface visual variation via
the same `unicode-range` @font-face composition pattern used for time signatures. U+E500 and
U+E501 are already in the Bravura subset, so no Bravura regeneration is needed.

The key difference from time signatures: these are SMuFL Private Use Area codepoints with no
standard Unicode meaning. The browser renders blank without a covering font — but since
GrigsonTimeSig (Bravura) is always injected as fallback, coverage is guaranteed.

---

## Files to change

| File                                             | Change                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `packages/grigson/src/renderers/html.ts`         | Replace `SIMILE_SVG` with `SIMILE_CHAR`; update render call                                                         |
| `packages/grigson/src/renderers/html.test.ts`    | Update simile test that asserts `<svg`                                                                              |
| `packages/grigson/src/renderers/html-element.ts` | Extend GrigsonTimeSig unicode-range; add GrigsonCursive U+E500-E501 @font-face; update simile CSS; add CSS variable |
| `scripts/gen-jazz-subsets.mjs`                   | Add U+E500-E501 to Petaluma and GrigsonJazz unicodes                                                                |
| `scripts/reencode-finale-jazz.mjs`               | Add uniE500/uniE501 to IMPORT dict                                                                                  |
| `packages/grigson/documentation/renderer.md`     | Document `--grigson-simile-font-size`                                                                               |

---

## Step 1 — `html.ts`: replace SIMILE_SVG

Remove the `SIMILE_SVG` constant (lines 407–412) and replace with:

```typescript
const SIMILE_CHAR = String.fromCodePoint(0xe500); // SMuFL repeatOneBar
```

Update the render call (line 454) from:

```typescript
html += `<span part="simile" style="grid-column: ${startCol} / span ${span}">${SIMILE_SVG}</span>`;
```

to:

```typescript
html += `<span part="simile" style="grid-column: ${startCol} / span ${span}">${SIMILE_CHAR}</span>`;
```

---

## Step 2 — `html.test.ts`: update simile test

The test at line 462 asserts `expect(html).toContain('<svg')`. Change to:

```typescript
expect(html).toContain(String.fromCodePoint(0xe500));
```

---

## Step 3 — `html-element.ts`: font faces

### 3a. Extend GrigsonTimeSig unicode-range

The `GrigsonTimeSig` @font-face (line 31) is the Bravura fallback — extend its unicode-range
to cover U+E500-E501 (both are already in Bravura-subset.woff2, no regeneration needed):

```typescript
// before:
unicode-range:U+1D7CE-1D7D7

// after:
unicode-range:U+1D7CE-1D7D7,U+E500-E501
```

### 3b. Extend GrigsonCursive @font-face for simile marks

In `_ensureFontFaces()`, the GrigsonCursive Petaluma time-sig rule (currently line 66) covers
`unicode-range:U+1D7CE-1D7D7`. After regenerating the Petaluma subset to include U+E500-E501
(Step 5), extend this rule's unicode-range:

```typescript
// before:
`@font-face{font-family:"GrigsonCursive";src:url("${grigsonPetalumaTimeSigWoff2}") format("woff2");unicode-range:U+1D7CE-1D7D7;...}`,

// after:
`@font-face{font-family:"GrigsonCursive";src:url("${grigsonPetalumaTimeSigWoff2}") format("woff2");unicode-range:U+1D7CE-1D7D7,U+E500-E501;...}`,
```

No new import needed — `grigsonPetalumaTimeSigWoff2` is already imported. After regeneration
the same WOFF2 will contain both the Math Bold digits and the simile glyphs.

### 3c. GrigsonJazz: no @font-face change needed

The tutorial page declares `@font-face { font-family: "FinaleJazz"; src: GrigsonJazz-subset.woff2 }`
with no unicode-range restriction — it covers all codepoints in the file. After we add
U+E500-E501 to GrigsonJazz-subset.woff2 (Step 5), FinaleJazz automatically covers them.

---

## Step 4 — `html-element.ts`: CSS

### 4a. Add CSS variable to `:host`

```css
:host {
  /* existing ... */
  --grigson-simile-font-size: 1.2em;
}
```

### 4b. Add to `:host([typeface="cursive"])` and `:host([typeface="serif"])` blocks

```css
:host([typeface="cursive"]) {
  /* existing time-sig vars ... */
  --grigson-simile-font-size: 1.2em;  /* tune visually after implementation */
}

:host([typeface="serif"]) {
  /* existing time-sig vars ... */
  --grigson-simile-font-size: 1.2em;  /* tune if Noto Serif needs adjusting */
}
```

### 4c. Update `[part="simile"]` CSS

```css
/* before: */
[part="simile"] {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 1em;
}

[part="simile"] svg {
  height: 1.2em;
  width: 1.2em;
}

/* after: */
[part="simile"] {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 1em;
  font-family: var(--grigson-simile-font-family, var(--grigson-font-family, ${defaultFamily})), "GrigsonTimeSig", serif;
  font-size: var(--grigson-simile-font-size);
}
```

Remove the `[part="simile"] svg` rule entirely.

**Font cascade per typeface:**
| Typeface | `defaultFamily` | U+E500 lookup result |
|---|---|---|
| sans | GrigsonSans | not covered → GrigsonTimeSig → Bravura |
| serif | GrigsonSerif | not covered → GrigsonTimeSig → Bravura |
| cursive | GrigsonCursive | matches new @font-face → Petaluma |
| `--grigson-font-family: 'FinaleJazz'` | (overridden) | matches FinaleJazz @font-face → GrigsonJazz |

---

## Step 5 — Regenerate subsets

### 5a. `scripts/reencode-finale-jazz.mjs`

Add two entries to the IMPORT dict:

```python
# simile marks at native SMuFL PUA codepoints
0xE500: 'uniE500',  # repeat1Bar
0xE501: 'uniE501',  # repeat2Bars
```

These are BMP codepoints (≤ U+FFFF) so they go into `bmp_import` and will be added to all
cmap tables automatically by the existing logic.

Then run: `node scripts/reencode-finale-jazz.mjs`

### 5b. `scripts/gen-jazz-subsets.mjs`

Two changes:

**Petaluma.otf entry** — extend unicodes:

```javascript
// before:
unicodes: 'U+1D7CE-1D7D7',

// after:
unicodes: 'U+1D7CE-1D7D7,U+E500-E501',
```

U+E500-E501 are native Petaluma codepoints — no cmap aliasing needed, `pyftsubset` will
find them directly in the preprocessed font (which still has all original Petaluma glyphs).

**GrigsonJazz.otf entry** — extend unicodes:

```javascript
// before:
unicodes: 'U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7',

// after:
unicodes: 'U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7,U+E500-E501',
```

Then run: `node scripts/gen-jazz-subsets.mjs`

This regenerates:

- `grigson-petaluma-timesig-subset.ts` / `GrigsonPetaluma-timesig-subset.woff2`
- `grigson-jazz-subset.ts` / `GrigsonJazz-subset.woff2`

---

## Step 6 — Documentation (`renderer.md`)

Add `--grigson-simile-font-size` to the CSS custom properties table.

---

## Verification

1. `pnpm build` — all packages build cleanly
2. `pnpm test` — all 520 tests pass (simile test updated in Step 2)
3. Browser at `localhost:8080/grigson/tutorial/typefaces/`:
   - Verify simile mark renders visually in each typeface
   - Tune `--grigson-simile-font-size` per typeface in `:host([typeface])` blocks until the
     size matches the previous SVG (or looks better)
   - Verify FinaleJazz example shows FinaleJazz-style simile marks
4. Inspect HTML source — simile element should contain U+E500 (𛟎... appears as a glyph
   character, not `<svg>`)
5. Bump `grigson-fonts` package.json version (1.1.2 → 1.1.3) since GrigsonJazz-subset.woff2
   changes; push new tag so CDN URL on tutorial page stays current

---

## Phase B note

Phase B (repeat barlines and plain/double/final barlines via font glyphs) is deferred. The
grid architecture question (reserving cells for barline gaps) needs to be resolved first, as
it affects how barline characters are positioned relative to the column boundary. The Petaluma
barline glyphs (U+E030-E033) shown in the screenshot are very characterful and worth the
additional effort.
