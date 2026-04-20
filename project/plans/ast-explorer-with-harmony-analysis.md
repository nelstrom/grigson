# Plan: AnalysedSong — structured harmonic analysis with inline tonality hints

## Context

`analyseHarmony(chords, homeKey)` already infers a `currentKey` for each chord, but it works on a flat array and returns a flat `AnnotatedChord[]`. This makes it awkward to use when you need the original section/row/bar structure (e.g. for rendering, or for studying analysis in the AST Explorer). It also has no way for the chart author to override an ambiguous inference.

This plan adds:

1. An inline **tonality hint** syntax `{Ab major}` or `{D dorian}` that can appear anywhere in the chord stream — between chords within a bar, or at the start of a bar. Set-and-continue model: the hint takes effect at its position and remains active until the next hint or the end of the section. Section boundary is always an implicit reset; an explicit `{}` or `{home}` token resets to the section home key mid-section (useful for controlling pivot chord interpretation).
2. A structured **`AnalysedSong`** type that mirrors `Song` but with `AnnotatedChord` at the leaves.
3. An **`analyseSong(song)`** function that produces an `AnalysedSong`, respecting per-section keys and inline hints.
4. A **mode toggle** in the AST Explorer to switch between the raw parsed tree and the analysed tree.

---

## Critical files

| File                                              | Change                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/grigson/src/parser/grammar.pegjs`       | Add `TonalityHint` rule; inline in `BeatSlotList`                                      |
| `packages/grigson/src/parser/types.ts`            | Add `TonalityHint` interface; add `tonalityHints?` to `Bar`                            |
| `packages/grigson/src/theory/harmonicAnalysis.ts` | Add `loc` to `AnnotatedChord`; add `AnalysedSong` family of types; add `analyseSong()` |
| `packages/grigson/src/index.ts`                   | Export new types and `analyseSong`                                                     |
| `packages/grigson/src/index.browser.ts`           | Export `analyseSong` and new types                                                     |
| `packages/website/content/ast-explorer.njk`       | Add "Analysed" mode toggle                                                             |

Test files to extend:

- `packages/grigson/src/parser/parser.test.ts` — tonality hint parsing
- `packages/grigson/src/theory/harmonicAnalysis.test.ts` — `analyseSong` and hint override

---

## Step 1 — Grammar: `TonalityHint`

### Global initializer block

Extract the key validation currently duplicated in `FrontMatter` and `SectionLabel` into the `{{ }}` block at the top of `grammar.pegjs`, alongside `makeLoc`:

```js
{{
  function makeLoc(l) { ... } // existing

  const VALID_NOTES = ["C#","Db","D#","Eb","F#","Gb","G#","Ab","A#","Bb","C","D","E","F","G","A","B"];
  const VALID_SUFFIXES = ["m"," dorian"," aeolian"," mixolydian"," major"," minor"," ionian",""];

  function isValidKey(k) {
    return VALID_NOTES.some(n => VALID_SUFFIXES.some(s => k === n + s));
  }

  function normalizeKey(k) {
    if (k.endsWith(' ionian')) return k.slice(0, -7) + ' major';
    if (k.includes(' ')) return k;
    if (k.endsWith('m')) return k.slice(0, -1) + ' minor';
    return k + ' major';
  }
}}
```

Replace the duplicated inline validation in `FrontMatter` and `SectionLabel` with calls to these helpers.

### New grammar rules

```pegjs
// Add after TimeSignatureToken

TonalityHint
  = "{" _ key:TonalityHintKey _ "}" {
      return { type: "tonalityHint", key, loc: makeLoc(location()) };
    }

TonalityHintKey
  = "home" { return ""; }
  / note:$([A-G][#b]?) " " mode:$("major" / "minor" / "dorian" / "aeolian" / "mixolydian") {
      const k = note + " " + mode;
      if (!isValidKey(k)) error(`Invalid tonality hint: "${k}".`);
      return k;
    }
  / "" { return ""; }  // empty {} = reset to home
```

Valid hint forms:

- `{Ab major}`, `{D minor}`, `{D dorian}`, `{E aeolian}`, `{G mixolydian}` — mode is always required
- `{home}` or `{}` — explicit reset to section home key

No shorthands: every hint must state the mode explicitly. `{D}` and `{Dm}` are both rejected — tonality hints are not chord names.

### Inline in BeatSlotList

`TonalityHint` is **not** a beat — it doesn't occupy a position in the grid. Parse it inline alongside `BeatSlot`, then separate in the action:

```pegjs
BeatSlotList
  = items:(_ BeatSlotItem)+ _ {
      const slots = [];
      const hints = [];
      let slotIdx = 0;
      for (const [, item] of items) {
        if (item.type === "tonalityHint") {
          hints.push({ beforeSlotIndex: slotIdx, key: item.key, loc: item.loc });
        } else {
          slots.push(item);
          slotIdx++;
        }
      }
      if (!slots.some(s => s.type === "chord")) {
        error("A bar must contain at least one chord");
      }
      return { slots, hints };
    }

BeatSlotItem
  = TonalityHint
  / BeatSlot
```

Update `BarTail` to destructure `{ slots, hints }` from `BeatSlotList`, and set `bar.tonalityHints = hints` if `hints.length > 0`.

Remove the `if (!slots.some(...))` check from `BarTail` (it's now in `BeatSlotList`).

Rebuild: `cd packages/grigson && pnpm run build:grammar`

---

## Step 2 — Types

In `types.ts`:

```typescript
export interface TonalityHintItem {
  beforeSlotIndex: number;  // hint applies to chord slots from this index onward within the bar
  key: string;              // normalised key string, e.g. "Ab major", "D dorian"; "" = reset to home
  loc?: SourceRange;
}

export interface Bar {
  type: 'bar';
  slots: BeatSlot[];
  timeSignature?: TimeSignature;
  tonalityHints?: TonalityHintItem[];   // ← new; absent when no hints in this bar
  closeBarline: Barline;
  loc?: SourceRange;
}
```

`BeatSlot` is **unchanged** (`ChordSlot | DotSlot`). `TonalityHintItem` lives on `Bar` as a side-channel, keeping the beat grid clean.

---

## Step 3 — `AnnotatedChord`: add `loc`

In `harmonicAnalysis.ts`:

```typescript
export interface AnnotatedChord {
  chord: Chord;
  homeKey: string;
  currentKey: string;
  currentKeyCandidates: string[];
  loc?: SourceRange;    // ← new: mirrors chord.loc — enables AST Explorer hover
}
```

Update `annotate()` and the one direct `AnnotatedChord` construction (borrowed-chord branch ~line 303) to copy `chord.loc` if present.

---

## Step 4 — `AnalysedSong` types

Add to `harmonicAnalysis.ts`:

```typescript
export interface AnnotatedChordSlot {
  type: 'chord';
  chord: AnnotatedChord;
  loc?: SourceRange;
}

export type AnalysedBeatSlot = AnnotatedChordSlot | DotSlot;

export interface AnalysedBar {
  type: 'bar';
  slots: AnalysedBeatSlot[];
  timeSignature?: TimeSignature;
  tonalityHints?: TonalityHintItem[];
  closeBarline: Barline;
  loc?: SourceRange;
}

export interface AnalysedRow {
  type: 'row';
  openBarline: Barline;
  bars: AnalysedBar[];
  loc?: SourceRange;
}

export type AnalysedSectionItem = AnalysedRow | CommentLine;

export interface AnalysedSection {
  type: 'section';
  label: string | null;
  key: string | null;
  rows: AnalysedRow[];
  preamble?: CommentLine[];
  content?: AnalysedSectionItem[];
  loc?: SourceRange;
}

export interface AnalysedSong {
  type: 'song';
  title: string | null;
  key: string | null;
  meter: string | null;
  sections: AnalysedSection[];
  loc?: SourceRange;
}
```

---

## Step 5 — `analyseSong()` function

```typescript
export function analyseSong(song: Song): AnalysedSong {
  const sections = song.sections.map(sec => analyseSection(sec, song.key ?? 'C major'));
  return { ...song, sections };
}
```

### `analyseSection` implementation

The key insight: tonality hints split the chord stream into **key regions**. Each region is analysed independently with its own `homeKey`. `analyseHarmony` is called once per region and results are concatenated.

```
homeKey = section.key ?? songKey

Walk bars in order, tracking:
  - currentRegionKey: string  (starts as homeKey)
  - currentRegionChords: Chord[]
  - regions: { key, chords }[]

For each bar:
  For each slot/hint in order (interleaved by beforeSlotIndex):
    - If hint encountered: flush currentRegionChords as a region; start new region
      - key = hint.key || homeKey  (empty = reset to home)
    - If chord slot: push chord to currentRegionChords

Flush final region.
Call analyseHarmony(region.chords, region.key) for each region.
Concatenate → flat AnnotatedChord[].
```

Then rebuild the tree (walk sections → rows → bars → slots), consuming `AnnotatedChord` entries in order, replacing `ChordSlot` with `AnnotatedChordSlot`. `DotSlot` passes through unchanged.

The `content` array (which may include `CommentLine` items) is rebuilt analogously, replacing `Row` items with `AnalysedRow`.

---

## Step 6 — Exports

`index.ts` — add:

```typescript
export { analyseSong } from './theory/harmonicAnalysis.js';
export type {
  AnnotatedChord, AnnotatedChordSlot, AnalysedBeatSlot,
  AnalysedBar, AnalysedRow, AnalysedSection, AnalysedSectionItem, AnalysedSong,
} from './theory/harmonicAnalysis.js';
```

`index.browser.ts` — same additions (no node-only concerns here).

---

## Step 7 — AST Explorer toggle

Add a `<select>` to the editor toolbar in `ast-explorer.njk`:

```html
<select id="ast-mode">
  <option value="parsed">Parsed AST</option>
  <option value="analysed">Analysed AST</option>
</select>
```

In `update()`:

```javascript
const ast = grigson.parseSong(editor.getValue());
const obj = document.getElementById('ast-mode').value === 'analysed'
  ? grigson.analyseSong(ast)
  : ast;
// pass obj to JSONFormatter and buildLocMap as before
```

Wire `addEventListener('change', update)` on the select. No other changes needed — `buildLocMap` and the hover delegation already handle any object shape. `AnnotatedChordSlot.loc` (= `chord.loc`) is picked up automatically.

---

## Tests to add/update

**Parser** (`parser.test.ts`):

- `{D minor}` on a bar → `tonalityHints: [{ beforeSlotIndex: 0, key: 'D minor' }]`
- `{Ab major}` between chords → `beforeSlotIndex` reflects position after preceding chords
- `{D dorian}`, `{E aeolian}`, `{G mixolydian}` — all modes parse correctly
- `{}` and `{home}` → `key: ''`
- Invalid hint `{Hb major}` → throws
- `{Dm}` → throws (no m-suffix shorthand)
- `{D}` → throws (bare note without mode rejected)
- Bar with both time sig and hint: `(4/4){D minor} C Am` → both fields present, `slots` has 2 chords
- Hint at bar start vs. mid-bar → correct `beforeSlotIndex`

**Harmonic analysis** (`harmonicAnalysis.test.ts`):

- `AnnotatedChord.loc` mirrors `chord.loc`
- `analyseSong` on a simple chart: correct tree structure, `AnnotatedChordSlot` at leaves
- Per-section key: sections with different `key` fields each get the correct `homeKey` on all their annotated chords
- Tonality hint overrides `currentKey` for subsequent chords in that bar
- Hint persists across bar boundaries until next hint or section end
- `{}` / `{home}` resets to section key mid-section
- Section boundary is always an implicit reset (hint from section A does not affect section B)

---

## Verification

```bash
# After grammar changes:
cd packages/grigson && pnpm run build:grammar

# Full build + tests:
pnpm build && pnpm test

# Manual in dev server:
# - Toggle to "Analysed AST": AnnotatedChordSlots visible with homeKey/currentKey
# - Add {Ab major} between chords: tonalityHints appear in bar, currentKey changes
# - Add {} reset: subsequent chords revert to home key
# - [Verse] key: F# → all chords in that section show homeKey: "F# major"
# - Hover annotated chord slots → source range highlights correctly
```
