# Parser & Renderer — Example Chart Coverage

## Context

The example charts in `packages/grigson/documentation/examples/` use features that the parser and renderer do not yet support. The goal is to extend the grammar, types, and text renderer so that every example chart parses successfully and round-trips cleanly.

---

## Gaps by Chart

| Chart | Missing features |
|---|---|
| `a-mans-a-man-for-all-that.chart` | `\|\|:`, `:\|\|}` barlines |
| `ashes.chart` | `\|\|:`, `:\|\|}` barlines, `%` simile |
| `bones-in-the-ocean.chart` | `\|\|:`, `:\|\|}` barlines, slash chords (`F/C`) |
| `general-taylor.chart` | `#` comment lines |
| `heres-a-health-to-the-company.chart` | `\|\|:`, `:\|\|}` barlines, `#` comment lines |
| `row-me-bully-boys.chart` | `\|\|` double barline, `\|\|.` final barline, slash chords (`F#/A#`) |
| `whats-new.chart` | `-` minor suffix, `7b5` quality |
| `whisper-not.chart` | `-` minor suffix, slash chords (`C-/Bb`, `G-/F`) |
| `kodachrome.chart` | `-` minor suffix (`F#-`) |
| `sing-john-ball.chart` | `\|\|.` final barline, `%` simile |

Charts that already parse correctly (no action needed): `wicked-game`, `scarborough-fair`, `royals`, `john-anderson-my-jo`, `mad-world`, `syntax-test`.

---

## Tasks (in recommended order)

### Task 1 — Comment line parsing

**What:** Lines starting with `#` (outside front matter) should be silently ignored.

**Grammar change:** Add a `Comment` alternative in `SongBody`:
```
SongBody = items:(Newline / Comment / SectionLabel / Row)* { ... }
Comment  = "#" $[^\n\r]* Newline { return null; }
```
Filter nulls alongside newlines in the action.

**Type/renderer changes:** None.

**Charts fixed:** `general-taylor.chart`, `heres-a-health-to-the-company.chart` (partial — also needs barlines).

---

### Task 2 — Extended chord qualities: `-` minor and `7b5`

**What:** Add two missing chord qualities.

**Grammar changes in `Quality`:**
- Add `"-"  { return "min7"; }` — the `-` suffix denotes minor-seventh (`C-` = `Cm7`); must appear **before** `"m"` and before the empty fallback
- Add `"7b5" { return "dom7flat5"; }` — must appear **before** `"7"`

Final quality order (additions shown with `+`):
```
"m7b5"  → halfDiminished
"maj7"  → maj7
"M7"    → maj7
"dim7"  → dim7
"m7"    → min7
"dim"   → diminished
"m"     → minor
+ "7b5" → dom7flat5
"7"     → dominant7
+ "-"   → min7
""      → major
```

**Type change** in `types.ts`:
```typescript
export type Quality =
  | 'major' | 'minor' | 'dominant7' | 'halfDiminished'
  | 'diminished' | 'maj7' | 'min7' | 'dim7'
  | 'dom7flat5';      // ← new
```

**Renderer change** in `text.ts` — add a case to `renderChord`:
```typescript
case 'dom7flat5': suffix = '7b5'; break;
```

**Charts fixed:** `whats-new.chart`, `whisper-not.chart`, `kodachrome.chart` (partial — also needs slash chords / barlines).

---

### Task 3 — Slash chords (bass notes)

**What:** Chords like `F/C`, `F#/A#`, `C-/Bb` carry an explicit bass note.

**Type change** in `types.ts`:
```typescript
export interface Chord {
  type: 'chord';
  root: string;
  quality: Quality;
  bass?: string;   // ← new: bass note root (e.g. "C" in F/C)
}
```

**Grammar change:**
```
Chord
  = root:Root quality:Quality bass:SlashBass? {
      const chord = { type: "chord", root, quality };
      if (bass !== null) chord.bass = bass;
      return chord;
    }

SlashBass
  = "/" bass:Root { return bass; }
```

Note: `Root` already handles accidentals, so `F#/A#` correctly parses bass as `A#`.

**Renderer change** in `text.ts`:
```typescript
return chord.root + suffix + (chord.bass ? '/' + chord.bass : '');
```

**Charts fixed:** `bones-in-the-ocean.chart` (partial), `row-me-bully-boys.chart` (partial), `whisper-not.chart` (partial).

---

### Task 4 — Repeat and non-single barlines

**What:** Support `||`, `||.`, `||:`, `:||`, `:||x3`, `:||:` as barline tokens on row openings and bar closings.

**Type changes** in `types.ts`:

```typescript
export type BarlineKind =
  | 'single'              // |
  | 'double'              // ||
  | 'final'               // ||.
  | 'startRepeat'         // ||:
  | 'endRepeat'           // :||
  | 'endRepeatStartRepeat'; // :||:

export interface Barline {
  kind: BarlineKind;
  repeatCount?: number;  // only for endRepeat / endRepeatStartRepeat; defaults to 2
}

export interface Bar {
  type: 'bar';
  slots: BeatSlot[];
  timeSignature?: TimeSignature;
  closeBarline: Barline;   // ← replaces implicit single |
}

export interface Row {
  type: 'row';
  openBarline: Barline;    // ← new; was always single |
  bars: Bar[];
}
```

**Grammar changes:**

Replace the hardcoded `"|"` tokens in `Row` and `BarTail` with a `Barline` rule:

```
Row
  = open:OpenBarline _ bars:BarTail+ {
      return { type: "row", openBarline: open, bars };
    }

BarTail
  = ts:TimeSignatureToken? slots:BeatSlotList close:CloseBarline _ {
      // ... existing chord check ...
      const bar = { type: "bar", slots, closeBarline: close };
      if (ts) bar.timeSignature = ts;
      return bar;
    }

// A barline that can open a row
OpenBarline
  = ":||:"  { return { kind: "endRepeatStartRepeat" }; }
  / ":||"   { return { kind: "endRepeat" }; }
  / "||:"   { return { kind: "startRepeat" }; }
  / "||"    { return { kind: "double" }; }
  / "|"     { return { kind: "single" }; }

// A barline that closes a bar
CloseBarline
  = ":||x" n:$[0-9]+ ":"  { return { kind: "endRepeatStartRepeat", repeatCount: parseInt(n,10) }; }
  / ":||:"                  { return { kind: "endRepeatStartRepeat" }; }
  / ":||x" n:$[0-9]+       { return { kind: "endRepeat", repeatCount: parseInt(n,10) }; }
  / ":||"                   { return { kind: "endRepeat" }; }
  / "||:"                   { return { kind: "startRepeat" }; }
  / "||."                   { return { kind: "final" }; }
  / "||"                    { return { kind: "double" }; }
  / "|"                     { return { kind: "single" }; }
```

**Renderer change** in `text.ts`:

Replace `renderRow` with a version that emits the real barline symbols:

```typescript
function barlineSymbol(b: Barline): string {
  const suffix = (b.repeatCount && b.repeatCount > 2) ? `x${b.repeatCount}` : '';
  switch (b.kind) {
    case 'single':               return '|';
    case 'double':               return '||';
    case 'final':                return '||.';
    case 'startRepeat':          return '||:';
    case 'endRepeat':            return ':||' + suffix;
    case 'endRepeatStartRepeat': return ':||:' + suffix;
  }
}

function renderRow(row: Row, config: TextRendererConfig): string {
  const open = barlineSymbol(row.openBarline);
  const bars = row.bars
    .map(bar => renderBar(bar, config) + ' ' + barlineSymbol(bar.closeBarline))
    .join(' ');
  return open + ' ' + bars;
}
```

**Note on existing tests:** The existing parser and renderer tests use the old `Row` shape (no `openBarline`, bars with no `closeBarline`). These will need to be updated to match the new AST structure. The `parseBar` and `parseRow` helper entry-points will also need updating.

**Charts fixed:** `a-mans-a-man-for-all-that.chart`, `ashes.chart` (partial), `bones-in-the-ocean.chart`, `heres-a-health-to-the-company.chart`, `row-me-bully-boys.chart`, `sing-john-ball.chart` (partial).

---

### Task 5 — Simile marks (`%`)

**What:** `%` in a bar resolves at parse time to the previous bar's slot content (per the README: "Both forms parse to the same AST").

**Grammar change:** Add `%` as a valid `BarTail`:

```
BarTail
  = ts:TimeSignatureToken? slots:BeatSlotList close:CloseBarline _ {
      // normal bar
      ...
    }
  / "%" _ close:CloseBarline _ {
      // simile — slots resolved by post-processor; store a simile marker
      return { type: "bar", simile: true, slots: [], closeBarline: close };
    }
```

Then, in the `Row` action (or in a `normaliseSong`-style post-pass), resolve simile bars to their predecessor's slots:

```javascript
// Inside Row action, after bars array is built:
let lastSlots = [];
for (const bar of bars) {
  if (bar.simile) {
    bar.slots = lastSlots.map(s => ({ ...s }));
    delete bar.simile;
  } else {
    lastSlots = bar.slots;
  }
}
```

**Type changes:** None needed (simile is an internal parse-time concept; the resolved AST only contains `BeatSlot[]`).

**Renderer change:** The renderer may optionally emit `%` for consecutive identical bars. Add an opt-in config flag `simile: boolean` (default `false`). When enabled, detect adjacent bars with identical chord sequences and render the closing ones as `%`.

**Charts fixed:** `ashes.chart`, `sing-john-ball.chart`.

---

## Verification

After each task, run:

```bash
pnpm test
```

Add a test file `packages/grigson/src/parser/examples.test.ts` that automatically parses every `.chart` in the examples directory and asserts no parse errors — this becomes a regression guard:

```typescript
import { describe, it } from 'vitest';
import { parseSong } from './parser.js';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, '../../../documentation/examples');

describe('example charts', () => {
  const files = globSync('*.chart', { cwd: examplesDir });
  for (const file of files) {
    it(`parses ${file} without errors`, () => {
      const source = readFileSync(join(examplesDir, file), 'utf8');
      parseSong(source); // should not throw
    });
  }
});
```

---

## Key files

- `packages/grigson/src/parser/grammar.pegjs` — PEG grammar (source of truth)
- `packages/grigson/src/parser/types.ts` — AST type definitions
- `packages/grigson/src/parser/generated.js` — compiled grammar (regenerated via `pnpm build`)
- `packages/grigson/src/renderers/text.ts` — text renderer
- `packages/grigson/src/parser/parser.test.ts` — parser tests
- `packages/grigson/src/renderers/text.test.ts` — renderer tests
