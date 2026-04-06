# Plan: Re-encode FinaleJazzText with correct Unicode music symbol positions

## Context

FinaleJazzText.otf contains beautiful jazz-style glyphs for ♭, ♯, △ and other music symbols, but
stores them in the Unicode Private Use Area (U+F720–U+F74B) using Finale's legacy encoding scheme.
Grigson outputs standard Unicode codepoints (U+266D ♭, U+266F ♯, U+25B3 △), so those glyphs are
unreachable.

The fix: create a re-encoded derivative font ("GrigsonJazzText") that adds standard Unicode cmap
entries pointing to the same glyph outlines. Since FinaleJazzText is SIL OFL, derivatives are
permitted provided the reserved font name "Finale Jazz Text" is not used.

This is a two-phase task requiring user input between phases.

---

## Phase 1 — Visual identification of PUA glyphs

### Step 1: Generate `scripts/identify-finale-jazz-glyphs.html`

A self-contained HTML file that:

- Embeds FinaleJazzText.otf as a base64 data URI in an `@font-face` rule, covering the full font
  including the PUA range (no subsetting — we need all glyphs visible)
- Renders a **reference panel** showing known-good symbols for comparison:
  ° (U+00B0), ø (U+00F8), and standard Latin letters
- Renders a **PUA glyph table** with one row per codepoint U+F720–U+F74B, showing:
  - Hex codepoint
  - The glyph rendered at ~48px in FinaleJazzText
  - An empty "Looks like" column for the user to fill in mentally
- Renders a **standard-Latin reference** row showing a–z, A–Z, 0–9 so the user can see
  what "normal" characters look like in this font

Open the file in a browser (`open scripts/identify-finale-jazz-glyphs.html`) and ask the user to
identify which PUA slots correspond to: ♭, ♯, ♮, △ (and any others that look useful).

### User input required

Report back which codepoints map to which symbols. Expected minimum mappings:

- ♭ flat → U+266D
- ♯ sharp → U+266F
- △ major-7 triangle → U+25B3 (if present)
- ♮ natural → U+266E (nice to have)

---

## Phase 2 — Re-encode, subset, and integrate

### Step 2: Write `scripts/reencode-finale-jazz.mjs`

A Node.js script (shelling out to Python/fonttools) that:

1. Opens `scripts/fonts/FinaleJazzText.otf`
2. Adds new cmap entries mapping each identified glyph name to its correct Unicode codepoint
   (leaves existing PUA entries intact — adds to the cmap, doesn't replace)
3. Updates the font name table to replace "Finale Jazz Text" with "GrigsonJazzText" in all
   nameID fields (required by SIL OFL for derivatives using reserved font names)
4. Saves to `scripts/fonts/GrigsonJazzText.otf`

The Python fonttools operations:

```python
from fontTools.ttLib import TTFont

font = TTFont('scripts/fonts/FinaleJazzText.otf')
cmap = font.getBestCmap()      # read existing map

# Add new Unicode → glyph entries (example — filled in after Phase 1):
new_mappings = {
    0x266D: cmap[0xF7XX],   # ♭ → whatever PUA glyph name the user identified
    0x266F: cmap[0xF7YY],   # ♯
    0x25B3: cmap[0xF7ZZ],   # △ (if found)
}

# Add to every cmap subtable
for table in font['cmap'].tables:
    table.cmap.update(new_mappings)

# Rename (OFL reserved name requirement)
for record in font['name'].names:
    s = record.toUnicode()
    if 'Finale Jazz Text' in s:
        record.string = s.replace('Finale Jazz Text', 'GrigsonJazzText').encode(...)

font.save('scripts/fonts/GrigsonJazzText.otf')
```

### Step 3: Update `scripts/gen-jazz-subsets.mjs`

Add a new entry for GrigsonJazzText to the `FONTS` array, following the same pattern as the
existing PetalumaScript entry. The new entry needs:

- `pkgWoff2Name: 'GrigsonJazzText-subset.woff2'` — the script now writes each WOFF2 to
  `packages/grigson-fonts/fonts/` alongside generating the TS constant
- `outTs`: `packages/grigson/src/renderers/grigson-jazz-text-subset.ts`
- `exportName`: `grigsonJazzTextWoff2`

Subset unicodes:

- `U+0000-00FF` — Latin-1 (text, ° at U+00B0, ø at U+00F8)
- `U+266D,U+266F` — ♭♯ (now present at standard positions)
- `U+25B3` — △ (if identified in Phase 1)

### Step 4: Regenerate CDN constants

After the new WOFF2 is written to `packages/grigson-fonts/fonts/`, add the new file to the
`FILES` array in `scripts/gen-cdn-constants.mjs`:

```js
{
  file: 'GrigsonJazzText-subset.woff2',
  exportName: 'grigsonJazzTextWoff2',
  outTs: join(ROOT, 'packages/grigson/src/renderers/grigson-jazz-text-cdn.ts'),
  regenerate: 'node scripts/gen-jazz-subsets.mjs && node scripts/gen-cdn-constants.mjs',
},
```

Then run `node scripts/gen-cdn-constants.mjs` to generate the CDN constant file.

### Step 5: Integration (TBD after seeing the result)

Options — to be decided once the font is re-encoded and visually verified:

**A. New embedded typeface** — add `typeface="finale-jazz"` alongside `typeface="cursive"` (Petaluma),
wiring up `GrigsonJazzText` as a third composite font family in `html-element.ts`. Also:

- Add a CDN alias in `vite.config.ts`:
  `'./grigson-jazz-text-subset.js'` → `./grigson-jazz-text-cdn.ts`
- The font will be included in the embedded builds (~300 KB) but not the CDN builds (~75 KB),
  which will fetch it from jsDelivr instead.

**B. Replace Petaluma** — if the Finale Jazz style is preferred overall, swap it in as `typeface="cursive"`.
Same `vite.config.ts` alias update as option A applies.

**C. Tutorial only** — use the re-encoded font just for the website tutorial example via
`--grigson-font-family`, without embedding it in the grigson bundle at all. The WOFF2 can be
served either as a local website asset (`packages/website/assets/fonts/GrigsonJazzText.woff2`)
or from jsDelivr via `packages/grigson-fonts/fonts/GrigsonJazzText-subset.woff2` once the
`grigson-fonts` package is tagged and pushed.

### Step 6: Update `06-typefaces.njk` tutorial example

If option A or C: update the Finale Jazz Text section to use `--grigson-font-family` with the
re-encoded font, removing `accidentals="ascii"` and `notation-preset="realbook"` if △ is now
available at U+25B3.

---

## Verification

After Phase 1 (identification page):

- Open `scripts/identify-finale-jazz-glyphs.html` in a browser and confirm all PUA glyphs render

After Phase 2 (re-encoding):

- Run `node scripts/gen-jazz-subsets.mjs` and confirm the new subset generates cleanly
- Run `node scripts/gen-cdn-constants.mjs` and confirm the CDN constant is generated
- `pnpm build && pnpm test`
- View the tutorial page and confirm ♭/♯/△ render in the Finale Jazz style throughout
