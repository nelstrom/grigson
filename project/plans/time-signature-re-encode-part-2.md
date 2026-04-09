# Plan: Re-encode Petaluma and FinaleJazz time-sig digits to Math Bold range

## Context

Following the Bravura re-encoding plan, the HTML renderer outputs time signature digits as
Math Bold (U+1D7CE–1D7D7) and a `GrigsonTimeSig` @font-face (backed by Bravura) serves as
the fallback. This plan adds typeface-specific overrides so that:

- **GrigsonCursive** (the built-in cursive typeface) uses Petaluma's time-sig digit glyphs
- **FinaleJazz** (loaded externally via CDN) uses FinaleJazz's own time-sig digit glyphs

The mechanism is a small change to `[part="time-sig"]`'s `font-family` that prepends the
active composite family / custom font. Since each composite family will declare a
`unicode-range` block for U+1D7CE–1D7D7, the right glyphs win automatically.

**Assume already complete:** Bravura re-encoding plan (Math Bold cmap in Bravura subset,
`GrigsonTimeSig` font face, renderer outputs U+1D7CE–1D7D7).

---

## Files to change

| File                                                                | Change                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `scripts/reencode-finale-jazz.mjs`                                  | Add 10 time-sig glyph imports (U+1D7CE–1D7D7) from FinaleJazz.otf                          |
| `scripts/gen-jazz-subsets.mjs`                                      | Add GrigsonPetaluma-timesig entry; add U+1D7CE-1D7D7 to GrigsonJazz unicodes               |
| `packages/grigson/src/renderers/html-element.ts`                    | New import; add GrigsonCursive time-sig @font-face; update `[part="time-sig"]` font-family |
| `packages/grigson-fonts/package.json`                               | Bump version (1.1.1 → 1.1.2)                                                               |
| `packages/grigson/src/renderers/grigson-petaluma-timesig-subset.ts` | Auto-generated                                                                             |
| `packages/grigson-fonts/fonts/GrigsonPetaluma-timesig-subset.woff2` | Auto-generated                                                                             |
| `packages/grigson-fonts/fonts/GrigsonJazz-subset.woff2`             | Regenerated with new range                                                                 |
| `packages/grigson/src/renderers/grigson-jazz-subset.ts`             | Regenerated with new range                                                                 |

---

## Step 1 — Add Petaluma time-sig subset to `gen-jazz-subsets.mjs`

`Petaluma.otf` already has glyphs at U+E080–E089 — no outline copying is needed, only cmap
aliases. Add a new entry to the FONTS array that:

1. Uses `Petaluma.otf` as source (download URL:
   `https://github.com/steinbergmedia/petaluma/raw/master/redist/otf/Petaluma.otf`)
2. Runs an inline Python preprocessing step before `pyftsubset` that opens the font, adds
   cmap entries U+1D7CE–1D7D7 → same glyph names as U+E080–E089, and saves a temp file:
   ```python
   from fontTools.ttLib import TTFont
   font = TTFont("Petaluma.otf")
   for table in font['cmap'].tables:
       for i in range(10):
           gname = table.cmap.get(0xE080 + i)
           if gname:
               table.cmap[0x1D7CE + i] = gname
   font.save("GrigsonPetaluma-tmp.otf")
   ```
3. Subsets the temp file to `U+1D7CE-1D7D7` only
4. Outputs:
   - TS constant: `grigsonPetalumaTimeSigWoff2` in `grigson-petaluma-timesig-subset.ts`
   - Package WOFF2: `GrigsonPetaluma-timesig-subset.woff2`

---

## Step 2 — Add time-sig digits to GrigsonJazz

### 2a. `scripts/reencode-finale-jazz.mjs`

Extend the `IMPORT` dict with the 10 time-sig digit glyphs. These exist in `FinaleJazz.otf`
(the SMuFL notation font, which is already the `source` in this script) at glyph names
`uniE080`–`uniE089`:

```python
IMPORT = {
    # existing accidentals…
    0x266D: 'uniE260',
    0x266E: 'uniE261',
    0x266F: 'uniE262',
    0x25B3: 'uniE873',
    # time-sig digits at Math Bold codepoints
    0x1D7CE: 'uniE080',   # 𝟎
    0x1D7CF: 'uniE081',   # 𝟏
    0x1D7D0: 'uniE082',   # 𝟐
    0x1D7D1: 'uniE083',   # 𝟑
    0x1D7D2: 'uniE084',   # 𝟒
    0x1D7D3: 'uniE085',   # 𝟓
    0x1D7D4: 'uniE086',   # 𝟔
    0x1D7D5: 'uniE087',   # 𝟕
    0x1D7D6: 'uniE088',   # 𝟖
    0x1D7D7: 'uniE089',   # 𝟗
}
```

### 2b. `scripts/gen-jazz-subsets.mjs`

Add `U+1D7CE-1D7D7` to the GrigsonJazz unicodes string:

```
// before:  'U+0000-00FF,U+266D-266F,U+25B3'
// after:   'U+0000-00FF,U+266D-266F,U+25B3,U+1D7CE-1D7D7'
```

### 2c. Bump `packages/grigson-fonts/package.json` to `1.1.2`

---

## Step 3 — Update `html-element.ts`

### 3a. New import

```typescript
import { grigsonPetalumaTimeSigWoff2 } from './grigson-petaluma-timesig-subset.js';
```

### 3b. Add @font-face for GrigsonCursive time-sig range

Inside the existing `jazzId` block in `_ensureFontFaces()`, append a third line to
`style.textContent`:

```typescript
`@font-face{font-family:"GrigsonCursive";src:url("${grigsonPetalumaTimeSigWoff2}") format("woff2");unicode-range:U+1D7CE-1D7D7;font-weight:normal;font-style:normal}`,
```

### 3c. Update `[part="time-sig"]` font-family

The current CSS from the Bravura plan:

```css
font-family: var(--grigson-time-sig-font-family), "GrigsonTimeSig", serif;
```

Change to (in `_getStyles()`):

```css
font-family: var(--grigson-time-sig-font-family), var(--grigson-font-family, ${defaultFamily}), "GrigsonTimeSig", serif;
```

**How this resolves per typeface:**

| Typeface                              | `defaultFamily` | U+1D7CE lookup result                       |
| ------------------------------------- | --------------- | ------------------------------------------- |
| sans                                  | GrigsonSans     | no match → GrigsonTimeSig (Bravura)         |
| serif                                 | GrigsonSerif    | no match → GrigsonTimeSig (Bravura)         |
| cursive                               | GrigsonCursive  | matches new @font-face → Petaluma           |
| `--grigson-font-family: 'FinaleJazz'` | (overridden)    | matches FinaleJazz @font-face → GrigsonJazz |

---

## Step 4 — Regenerate subsets and rebuild

```bash
node scripts/reencode-finale-jazz.mjs          # rebuild GrigsonJazz.otf with time-sig digits
node scripts/gen-jazz-subsets.mjs              # regenerates grigson-jazz-subset.ts, grigson-petaluma-timesig-subset.ts
pnpm build
```

Then push a new `grigson-fonts-v1.1.2` tag so the CDN URL for the FinaleJazz tutorial
page serves the updated GrigsonJazz-subset.woff2.

---

## Verification

1. **GrigsonCursive**: Render a chart with `typeface="cursive"` — time sig digits should
   visually match Petaluma's style.
2. **FinaleJazz**: Load the tutorial typefaces page — time sig digits on the Finale Jazz
   example should use Finale's own style, not Bravura.
3. **Sans/Serif**: Time sig digits unchanged (still Bravura via GrigsonTimeSig).
4. **HTML source**: Time sig digits appear as readable `𝟒/𝟒` characters in all cases.
5. `pnpm test` passes.
