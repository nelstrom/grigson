# Design: Chord Notation Dialects — Configurable Boundaries

## Background

Grigson currently has partial configurability for chord notation: the TextRenderer and HtmlRenderer
support three presets (jazz, pop, symbolic) that vary the suffixes for `minor` and `halfDiminished`
only. Several problems exist with the current design:

- The `symbolic` preset emits `-` and `ø` — which the parser does **not** accept — silently
  breaking the round-trip guarantee.
- The remaining five qualities (dominant7, diminished, maj7, min7, dim7) have no configurable
  output and are hardcoded in both renderers.
- HtmlRenderer silently drops the suffix for maj7, min7, dim7, and diminished (a rendering bug).
- The CLI `grigson render` command has no way to select a notation preset.

This plan proposes a clean three-layer model, a canonical suffix table, and concrete implementation
steps.

---

## The Three-Layer Model

Chord notation decisions belong at three distinct layers, each with different constraints:

### Layer 1 — Source files: strict but alias-tolerant

The `.chart` format is a language and needs a canonical form. The normaliser's job is to produce
that form. But the *parser* can be permissive on *input*, accepting common aliases and mapping them
to the internal `Quality` enum at parse time — just as the parser already normalises `CM7` → `maj7`.

**Fixed (never make configurable):**
- The `Quality` enum (8 members). This is the internal representation used by all theory code.
- The canonical output suffix for each quality (see table below).
- The rule that after normalisation, source files contain only canonical suffixes.

**Extend (accept more input aliases):**

| Input alias  | Maps to Quality  |
|--------------|-----------------|
| `-`          | minor            |
| `min`        | minor            |
| `ø`, `Ø`    | halfDiminished   |
| `°`          | diminished       |
| `Δ`, `△`    | maj7             |
| `min7`       | min7             |

This is "dialect-tolerant input": permissive on read, canonical on write.

### Layer 2 — Normaliser: always writes canonical

The normaliser fixes root spelling (C# → Db in flat keys). Since quality is already stored as a
typed enum, the normaliser writes back using the canonical source suffix for each quality. No
configuration knob is needed or appropriate here — `grigson normalise` is an opinionated formatter.

**Rule:** `grigson normalise` always produces the canonical source dialect. Like `gofmt` or
`prettier`, it is not configurable.

### Layer 3 — Renderers: fully configurable for display

Renderers are the display layer. They may emit any notation, including non-parseable forms like
`-` and `ø`. Their output is **not guaranteed to round-trip** unless using the canonical (jazz)
preset. This should be explicitly documented rather than engineered around.

---

## Canonical Suffix Table

| Quality        | Canonical suffix | jazz preset | pop preset | symbolic preset |
|----------------|-----------------|-------------|------------|-----------------|
| major          | (empty)         | (empty)     | (empty)    | (empty)         |
| minor          | `m`             | `m`         | `m`        | `-`             |
| dominant7      | `7`             | `7`         | `7`        | `7`             |
| halfDiminished | `m7b5`          | `m7b5`      | `m7b5`     | `ø`             |
| diminished     | `dim`           | `dim`       | `dim`      | `°`             |
| maj7           | `maj7`          | `maj7`      | `maj7`     | `Δ`             |
| min7           | `m7`            | `m7`        | `m7`       | `-7`            |
| dim7           | `dim7`          | `dim7`      | `dim7`     | `°7`            |

A future `nashville` or `roman` preset could follow the same extensible pattern.

---

## Concrete Implementation Steps

### 1. Extend grammar aliases
**File:** `packages/grigson/src/parser/grammar.pegjs`

Add new alternatives to the `Quality` rule. PEG ordering matters — longer/more specific
alternatives must precede shorter ones:

```
Quality
  = "m7b5" { return "halfDiminished"; }
  / "min7"  { return "min7"; }           ← new (before "min")
  / "maj7"  { return "maj7"; }
  / "M7"    { return "maj7"; }
  / "dim7"  { return "dim7"; }
  / "m7"    { return "min7"; }
  / "dim"   { return "diminished"; }
  / "min"   { return "minor"; }          ← new
  / "m"     { return "minor"; }
  / "7"     { return "dominant7"; }
  / "ø"     { return "halfDiminished"; } ← new
  / "Ø"     { return "halfDiminished"; } ← new
  / "°"     { return "diminished"; }     ← new
  / "Δ"     { return "maj7"; }           ← new
  / "△"     { return "maj7"; }           ← new
  / "-"     { return "minor"; }          ← new (needs care: avoid matching barline context)
  / ""      { return "major"; }
```

The `-` alias needs care: it must not match in a context where it could be confused with
other grammar elements. A negative lookahead or placing it after a chord root with no
ambiguous context should work, but test carefully. If problematic, omit `-` as an alias.

Rebuild: `pnpm build:grammar`

### 2. Expand TextRendererConfig to all 8 qualities
**File:** `packages/grigson/src/renderers/text.ts`

```typescript
export interface NotationConfig {
  preset?: 'jazz' | 'pop' | 'symbolic';
  minor?: string;       // canonical: 'm'
  dominant7?: string;   // canonical: '7'
  halfDim?: string;     // canonical: 'm7b5'
  diminished?: string;  // canonical: 'dim'
  maj7?: string;        // canonical: 'maj7'
  min7?: string;        // canonical: 'm7'
  dim7?: string;        // canonical: 'dim7'
}
```

Update `DEFAULT_NOTATION` and `PRESETS` to cover all 8 qualities. Replace the `switch`
statement in `renderChord` to use the config object for every quality.

### 3. Fix HtmlRenderer quality coverage bug
**File:** `packages/grigson/src/renderers/html.ts`

HtmlRenderer currently falls through to an empty string for maj7, min7, dim7, and diminished.
Align its rendering logic with TextRenderer so all 8 qualities are handled. The simplest fix
is to share a single chord suffix resolution function imported from text.ts.

### 4. Add `--preset` to `grigson render`
**File:** `packages/grigson/src/cli.ts`

```
grigson render [--preset jazz|pop|symbolic] [--format text] [file]
```

Pass the preset through to `TextRenderer({ notation: { preset } })`.

Do **not** add `--preset` to `grigson normalise`. The normaliser is intentionally opinionated.

### 5. Document the round-trip contract
**File:** `packages/grigson/documentation/renderer.md`

Add a section explaining:
- The jazz (canonical) preset is the only preset whose output is accepted by the parser.
- Symbolic and other display presets are for human-readable or typeset output.
- `grigson normalise` always writes canonical notation regardless of renderer settings.

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/grigson/src/parser/grammar.pegjs` | Add input aliases |
| `packages/grigson/src/parser/generated.js` | Rebuild (pnpm build:grammar) |
| `packages/grigson/src/renderers/text.ts` | Full NotationConfig + PRESETS for all 8 qualities |
| `packages/grigson/src/renderers/html.ts` | Fix quality coverage bug |
| `packages/grigson/src/cli.ts` | Add --preset to render subcommand |
| `packages/grigson/documentation/renderer.md` | Round-trip contract documentation |

---

## What Stays Fixed

- The `Quality` enum (8 members) — stable internal representation
- The normaliser's output dialect — always canonical, no config knob
- The canonical suffix per quality — defines what a "clean" source file looks like
- The `.chart` extension and overall file structure

---

## Verification

1. `pnpm build:grammar` — compiles without error
2. `parseChord('E-')` → `{ root: 'E', quality: 'minor' }`
3. `parseChord('BØ')` → `{ root: 'B', quality: 'halfDiminished' }`
4. `parseChord('EΔ')` → `{ root: 'E', quality: 'maj7' }`
5. `new TextRenderer({ notation: { preset: 'symbolic' } })` renders all 8 qualities correctly
6. `HtmlRenderer` renders all 8 qualities — no empty suffixes for maj7/min7/dim7/dim
7. `grigson render --preset symbolic input.chart` emits symbolic output
8. `grigson normalise input.chart` always emits canonical suffixes (even if input used aliases)
9. Round-trip: parse canonical output → re-parse → ASTs strictly equal
10. `pnpm test` — all existing + new tests pass
