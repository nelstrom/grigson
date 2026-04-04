# Plan: Noto Font Integration for HTML Renderer

## Context

Georgia (the current default) has descending digits (3, 4, 5, 7, 9 dip below the baseline), making chord extensions look subscripted and superscripted numbers look un-raised. Noto fonts have proper lining figures, better suiting chord chart typography. The goal is to embed Noto Sans and Noto Serif as the default house style — self-contained, portable, with no network dependency — while preserving full user customisation via CSS variables.

---

## Design decisions (from planning session)

- **Typeface switching**: `typeface` attribute on `<grigson-html-renderer>` (not `<grigson-chart>`, since font theming is HTML/CSS-specific — text and SVG renderers don't use it)
- **Values**: `typeface="sans"` (default when attribute is absent) | `typeface="serif"`
- **Font compositing**: CSS `unicode-range` — multiple `@font-face` blocks share one logical family name (`GrigsonText`), each covering a non-overlapping codepoint range. No physical font merging needed.
- **Noto Music**: dropped — Bravura covers ♭♯ better (standard Unicode positions U+266D/266F are present in Bravura)
- **△ (U+25B3)**: from Noto Sans/Serif Symbols 2 (Bravura doesn't cover geometric shapes)
- **Latin coverage**: Latin-1 (U+0000–U+00FF) — covers Western European accented characters for song titles/section labels
- **Title/label font vars**: new `--grigson-title-font-family` and `--grigson-section-label-font-family` variables, defaulting to `var(--grigson-font-family)`, so headings can be independently overridden
- **Bundle approach**: both sans and serif variants always included (option A) — simplicity over size
- **Font source files**: committed to `scripts/fonts/` with OFL license files, fetched by generation scripts from there (not from network)
- **Generated TS files**: checked in as build artifacts (same pattern as `bravura-subset.ts`)

---

## Font stack per variant

Each variant composes three `@font-face` blocks under the `GrigsonText` family name:

| Block             | Source                                | unicode-range                                                             |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| Latin body        | Noto Sans (or Serif) Latin-1 subset   | U+0000–U+00FF                                                             |
| Geometric symbols | Noto Sans (or Serif) Symbols 2 subset | U+25B3 (△)                                                                |
| Music notation    | Bravura extended subset               | U+266D (♭), U+266F (♯), U+E080–U+E08B (time sigs), U+E1E7–U+E1E8 (simile) |

The Bravura and Symbols 2 blocks are shared data between sans and serif — the generated TS files are imported by both.

The renderer's CSS uses `font-family: var(--grigson-font-family, 'GrigsonText', serif)` so `--grigson-font-family` remains a working override.

---

## Files to create / modify

### New font source files (committed, not generated)

- `scripts/fonts/NotoSans-Regular.ttf` + `OFL.txt`
- `scripts/fonts/NotoSerif-Regular.ttf` + `OFL.txt`
- `scripts/fonts/NotoSansSymbols2-Regular.ttf` + `OFL.txt`
- `scripts/fonts/NotoSerifSymbols2-Regular.ttf` + `OFL.txt`

### Updated generation scripts

- `scripts/gen-bravura-subset.mjs` — extend subset to include U+266D, U+266F (♭♯) in addition to existing codepoints
- `scripts/gen-noto-subsets.mjs` — new script; reads from `scripts/fonts/`, uses `pyftsubset` to produce:
  - `noto-sans-subset.ts` (Latin-1 range from Noto Sans)
  - `noto-serif-subset.ts` (Latin-1 range from Noto Serif)
  - `noto-symbols2-subset.ts` (U+25B3 from Noto Sans Symbols 2 — shared between variants)

### Regenerated font data

- `packages/grigson/src/renderers/bravura-subset.ts` — regenerated to include ♭♯

### New generated font data (checked in)

- `packages/grigson/src/renderers/noto-sans-subset.ts`
- `packages/grigson/src/renderers/noto-serif-subset.ts`
- `packages/grigson/src/renderers/noto-symbols2-subset.ts`

### Core renderer changes

- `packages/grigson/src/renderers/html-element.ts`
  - Add `typeface` to `observedAttributes` and `attributeChangedCallback`
  - Import all font data modules
  - Modify `_getStyles()` to inject the three `@font-face` blocks for the active variant under `GrigsonText`
  - Update `:host` default `font-family` to `'GrigsonText', serif`
  - Add `--grigson-title-font-family` CSS variable (default: `var(--grigson-font-family)`)
  - Add `--grigson-section-label-font-family` CSS variable (default: `var(--grigson-font-family)`)
  - Apply these variables to `[part="title"]` and `[part="section-label"]` elements

### Documentation

- `packages/grigson/documentation/renderer.md` — document `typeface` attribute and new CSS variables
- `packages/grigson/README.md` — update font/theming section if present

---

## Implementation steps

1. **Source fonts**: Download Noto Sans, Noto Serif, Noto Sans Symbols 2, Noto Serif Symbols 2 from Google Fonts GitHub; place in `scripts/fonts/` with OFL license files.

2. **Update Bravura script**: Add U+266D and U+266F to the codepoint list in `gen-bravura-subset.mjs`, regenerate `bravura-subset.ts`.

3. **Write Noto generation script**: `gen-noto-subsets.mjs` — subset each Noto font to its target codepoint range, base64-encode as WOFF2, write TS exports. Follow the same pattern as `gen-bravura-subset.mjs`.

4. **Generate and commit Noto subset TS files**: run the new script, commit all three generated files.

5. **Update html-element.ts**:
   - Import the four font data modules (sans, serif, symbols2, bravura)
   - Add `typeface` attribute handling
   - Build a `_getFontFaces(typeface)` helper that returns the three `@font-face` declarations for the active variant
   - Prepend the output of `_getFontFaces()` to the injected `<style>` block
   - Update default `font-family` in `:host`
   - Add `--grigson-title-font-family` and `--grigson-section-label-font-family` and apply them

6. **Update docs**: renderer.md and README.md.

---

## Verification

- Run `pnpm build` — should produce no type errors and complete successfully
- Open the playground; confirm charts render with Noto Sans by default (lining figures — no descending digits)
- Add `typeface="serif"` to `<grigson-html-renderer>` in the playground; confirm Noto Serif is applied
- Verify ♭, ♯, △, °, Ø all render correctly in both variants
- Verify time signatures still render correctly (Bravura)
- Verify simile marks still render correctly
- Set `--grigson-font-family` on the host; confirm it overrides the bundled font
- Set `--grigson-title-font-family` independently; confirm title uses the override while chart body uses Noto
- Run `pnpm test`
