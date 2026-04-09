# Plan: Merge FinaleJazz + FinaleJazzText into a single GrigsonJazz font

## Context

The Finale Jazz font system uses two complementary faces:

- **FinaleJazzText.otf** — Latin text glyphs (A–Z, digits, °, ø etc.), no accidentals at standard Unicode
- **FinaleJazz.otf** — Music symbols at SMuFL codepoints (U+E000+), no Latin text

The current tutorial workaround uses a CSS `unicode-range` composite (two `@font-face` declarations),
which is fragile and requires a local website asset alongside the CDN font. The goal is a single
`GrigsonJazz.otf` that contains both the Latin text glyphs from FinaleJazzText and the accidental
outlines from FinaleJazz mapped to standard Unicode positions.

Both source fonts use **CFF outlines** and **1000 UPM** — compatible for merging. Accidental glyph
bounds (flat top at 560 units) are ~68% of FinaleJazzText cap height (818 units), which is
visually appropriate for inline accidentals. No scaling is needed.

---

## Implementation

### Step 1 — Rewrite `scripts/reencode-finale-jazz.mjs`

Change the merge strategy:

- **Base**: open `FinaleJazzText.otf` (provides Latin text, metrics, cmap structure)
- **Source**: open `FinaleJazz.otf` (provides accidental/triangle glyph outlines)

For each target glyph (`uniE260` ♭, `uniE261` ♮, `uniE262` ♯, `uniE873` △):

1. Copy the CFF CharString from source into base's `CFF ` CharStrings dict using a
   **pen-based round-trip** (`RecordingPen` → `T2Pen`) to avoid subr-reference issues
2. Append the glyph name to base's `GlyphOrder`
3. Copy the `hmtx` entry (advance width + lsb) from source

Then add cmap entries at standard Unicode positions (same as before):

```
0x266D → uniE260,  0x266E → uniE261,  0x266F → uniE262,  0x25B3 → uniE873
```

Rename: replace `"Finale Jazz Text"` (and `"FinaleJazzText"`) → `"GrigsonJazz"` in all name records.

Save as `scripts/fonts/GrigsonJazz.otf`.

Critical files:

- `scripts/reencode-finale-jazz.mjs`
- `scripts/fonts/FinaleJazzText.otf` (base)
- `scripts/fonts/FinaleJazz.otf` (glyph source)

### Step 2 — Re-run `scripts/gen-jazz-subsets.mjs`

The GrigsonJazz entry's `unicodes` field (`U+0000-00FF,U+266D-266F,U+25B3`) is already correct —
the merged font now covers all those codepoints so pyftsubset will include them all. Re-running
regenerates:

- `packages/grigson-fonts/fonts/GrigsonJazz-subset.woff2` (was 1.3 KB broken; will be ~25 KB complete)
- `packages/grigson/src/renderers/grigson-jazz-subset.ts`

### Step 3 — Bump `packages/grigson-fonts/package.json` to v1.1.1

The v1.1.0 subset was broken (only 7 codepoints). Bump to v1.1.1 so the fixed subset is
served under a new CDN URL.

File: `packages/grigson-fonts/package.json`

### Step 4 — Re-run `scripts/gen-cdn-constants.mjs`

Updates all CDN URL constants to point at `grigson-fonts-v1.1.1`.

Files updated: `packages/grigson/src/renderers/*-cdn.ts`

### Step 5 — Simplify tutorial `packages/website/content/tutorial/06-typefaces.njk`

Replace the two-`@font-face` composite with a single declaration:

```css
@font-face {
  font-family: "FinaleJazz";
  src: url('https://cdn.jsdelivr.net/gh/nelstrom/grigson@grigson-fonts-v1.1.1/packages/grigson-fonts/fonts/GrigsonJazz-subset.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}
```

Remove `unicode-range` split. The `--grigson-font-family: 'FinaleJazz', cursive` on the chart
element stays the same.

Delete: `packages/website/assets/fonts/FinaleJazzText-subset.woff2`

---

## Commit strategy

1. `feat(scripts): merge FinaleJazzText + FinaleJazz into single GrigsonJazz font`
   — reencode-finale-jazz.mjs + scripts/fonts/GrigsonJazz.otf

2. `feat(grigson-fonts): regenerate complete GrigsonJazz subset, bump to v1.1.1`
   — gen-jazz-subsets.mjs output + package.json + cdn constants

3. `feat(website): simplify Finale Jazz tutorial to single @font-face`
   — 06-typefaces.njk + delete FinaleJazzText-subset.woff2

Then: tag `grigson-fonts-v1.1.1` and push.

---

## Verification

1. `node scripts/reencode-finale-jazz.mjs` — confirm no errors
2. `python3 -c "from fontTools.ttLib import TTFont; f = TTFont('scripts/fonts/GrigsonJazz.otf'); c = f.getBestCmap(); print([hex(k) for k in sorted(c) if k < 0xF000])"` — should include 0x41 (A), 0xf8 (ø), 0xb0 (°), 0x266d (♭), 0x25b3 (△)
3. `pnpm exec node scripts/gen-jazz-subsets.mjs` — GrigsonJazz subset should be ~25 KB
4. `pnpm build` — clean build
5. Open `http://localhost:8080/grigson/tutorial/typefaces/` — Finale Jazz section should match visual quality of Cursive section, with correct accidentals and no Apple Chancery fallback
