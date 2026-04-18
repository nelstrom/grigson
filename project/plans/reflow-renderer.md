# Plan: `bars-per-line` and `max-bars-per-line` reflow for HTML renderer

## Context

The HTML renderer currently honours the row breaks written in `.chart` source files. This is correct for songs with irregular phrase lengths or changing time signatures. But there are two distinct cases where reflowing bars is useful:

1. **Regular, uniform songs** — reflow all bars in a section into rows of exactly N, completely ignoring source line breaks (e.g. 8 bars wide on desktop, 4 on mobile).
2. **Irregular-phrase songs** — source rows represent musical phrases (e.g. Don't Stop Me Now has 5-bar phrases). For narrow screens, split those phrases into shorter display rows but always restart at each phrase boundary, so phrases never bleed into each other visually.

These are genuinely different operations and neither replaces the other. The responsive layout example needs both:

- Wide breakpoint: `bars-per-line="8"` to merge several 4-bar source rows into one display row
- Narrow breakpoint: `max-bars-per-line="2"` on a 5-bar-phrase song to get `[2][2][1]` hard-break `[2][2][1]`

---

## Two new attributes

| Attribute               | Config key       | Behaviour                                                                                                                                |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `bars-per-line="N"`     | `barsPerLine`    | Flatten all bars in each section into one pool; reflow into rows of exactly N. Source row breaks are ignored.                            |
| `max-bars-per-line="N"` | `maxBarsPerLine` | Treat each source row as a hard line-break boundary. Split within a source row if it exceeds N bars, but never merge across source rows. |

Using both on the same element is undefined — the renderer should apply `barsPerLine` first if both are present, or we can document that they're mutually exclusive.

---

## Implementation

### 1. `TextRendererConfig` — add two new keys

**File:** `packages/grigson/src/renderers/text.ts`

```ts
/** Reflow bars into rows of exactly this many bars (HTML only). Ignores source row breaks. */
barsPerLine?: number;
/** Split source rows that exceed this many bars (HTML only). Source row breaks are preserved as hard boundaries. */
maxBarsPerLine?: number;
```

`slashStyle` is also HTML-only in this shared config; this follows the same precedent.

---

### 2. Two reflow functions in `html.ts`

**File:** `packages/grigson/src/renderers/html.ts`

Both are exported (like `computeGlobalLayout`) for direct unit testing.

#### `reflowSong(song, barsPerLine)` — Mode A: flat reflow

```ts
export function reflowSong(song: Song, barsPerLine: number): Song
```

Per section:

1. Collect all bars from all rows in order via `rowsOfSection(section)`.
2. Save the first row's `openBarline` for the first virtual row.
3. Slice the flat bar list into chunks of `barsPerLine`.
4. Each chunk becomes a new `Row`: `openBarline` is the saved barline for the first chunk, `{ kind: 'single' }` for the rest.
5. Return a new section with `rows: newRows`, `content: undefined`.

#### `splitRows(song, maxBarsPerLine)` — Mode B: phrase-aware split

```ts
export function splitRows(song: Song, maxBarsPerLine: number): Song
```

Per section, per source row:

1. If `row.bars.length <= maxBarsPerLine`, keep the row unchanged.
2. Otherwise, slice `row.bars` into chunks of `maxBarsPerLine`.
3. First chunk inherits `row.openBarline`; subsequent chunks get `{ kind: 'single' }`.
4. All chunks together replace the original row.

The section boundary between source rows is always preserved — chunks from row N and row N+1 are never merged.

**Shared edge cases (both functions):**

- Last chunk may be shorter than N — handled naturally by `sectionMaxCol` / `isFullRow`.
- Sections with zero bars pass through unchanged.
- Repeat barlines mid-split: not prevented; documented as designed for use on songs without complex mid-phrase repeat structures.

---

### 3. `HtmlRenderer.render()` — apply reflow before layout

**File:** `packages/grigson/src/renderers/html.ts`

```ts
let source = song;
if (this.config.barsPerLine) {
  source = reflowSong(source, this.config.barsPerLine);
} else if (this.config.maxBarsPerLine) {
  source = splitRows(source, this.config.maxBarsPerLine);
}
const layout = computeGlobalLayout(source);
```

Replace `song.sections` with `source.sections` in the render loop. `computeGlobalLayout` needs no changes.

---

### 4. `GrigsonHtmlRenderer` — add both attributes

**File:** `packages/grigson/src/renderers/html-element.ts`

- Add `'bars-per-line'` and `'max-bars-per-line'` to `observedAttributes`.
- In `renderChart()`, parse both:

  ```ts
  const barsPerLine = parseInt(this.getAttribute('bars-per-line') ?? '', 10);
  if (barsPerLine > 0) config.barsPerLine = barsPerLine;

  const maxBarsPerLine = parseInt(this.getAttribute('max-bars-per-line') ?? '', 10);
  if (maxBarsPerLine > 0) config.maxBarsPerLine = maxBarsPerLine;
  ```

---

## Tests

**File:** `packages/grigson/src/renderers/html.test.ts`

#### `describe('reflowSong')` — Mode A

| Test                                    | Source             | N   | Expected rows                     |
| --------------------------------------- | ------------------ | --- | --------------------------------- |
| No-op when already N bars per row       | 2 × 4-bar rows     | 4   | `[4][4]`                          |
| Merges rows                             | 2 × 4-bar rows     | 8   | `[8]`                             |
| Splits a long row                       | 1 × 8-bar row      | 4   | `[4][4]`                          |
| Short last row                          | 6 bars total       | 4   | `[4][2]`                          |
| First virtual row inherits open barline | `startRepeat` open | 4   | first row has `startRepeat`       |
| Subsequent rows get `single` barline    | 8 bars             | 4   | rows 2+ have `{ kind: 'single' }` |

#### `describe('splitRows')` — Mode B

| Test                              | Source                       | N   | Expected rows                                  |
| --------------------------------- | ---------------------------- | --- | ---------------------------------------------- |
| No-op when row ≤ N                | 2 × 4-bar rows               | 4   | `[4][4]` (unchanged)                           |
| No-op when row ≤ N (wider limit)  | 2 × 4-bar rows               | 8   | `[4][4]` (not merged)                          |
| Splits a 5-bar phrase             | 1 × 5-bar row                | 2   | `[2][2][1]`                                    |
| Phrase boundaries preserved       | 2 × 5-bar rows               | 2   | `[2][2][1][2][2][1]` (no cross-phrase merging) |
| First chunk inherits open barline | `startRepeat` open 5-bar row | 2   | first chunk has `startRepeat`                  |

#### Smoke test for `HtmlRenderer`

Confirm `part="row"` count changes correctly for both `barsPerLine` and `maxBarsPerLine`.

---

## Verification

```bash
pnpm test
```

Manual check: update a website example chart to use both attributes at different breakpoints and confirm row layout is correct at each width.
