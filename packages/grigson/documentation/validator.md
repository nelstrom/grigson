# Validator

`packages/grigson/src/validator.ts` exports a pure `validate()` function that maps a `.chart` source string to a list of structured diagnostics.

## API

```typescript
import { validate, Diagnostic, DiagnosticRange } from 'grigson';

const diagnostics = validate(source);
```

### `DiagnosticRange`

```typescript
interface DiagnosticRange {
  start: { line: number; character: number }; // 0-indexed (LSP convention)
  end:   { line: number; character: number };
}
```

### `Diagnostic`

```typescript
interface Diagnostic {
  range: DiagnosticRange;
  severity: 'error' | 'warning';
  message: string;
  source: 'grigson';
}
```

### `validate(source: string): Diagnostic[]`

- Returns `[]` for valid input.
- Returns one `Diagnostic` with `severity: 'error'` for each parse error.
- Returns one `Diagnostic` with `severity: 'warning'` for each semantic issue (e.g. beat-balance mismatches).
- Returns key-fit diagnostics (`error` or `warning`) for declared keys that don't match their chords — see [Key fit](#key-fit).
- Has **no LSP dependency** — it is a plain TypeScript function usable in the CLI, language servers, pre-commit hooks, and CI pipelines.

## Usage examples

### Check a file in the CLI

```bash
grigson validate song.chart
```

### Programmatic use

```typescript
import { readFileSync } from 'fs';
import { validate } from 'grigson';

const source = readFileSync('song.chart', 'utf8');
const errors = validate(source);

if (errors.length > 0) {
  for (const d of errors) {
    const { line, character } = d.range.start;
    // Note: line/character are 0-indexed; add 1 for human-readable output
    console.error(`${line + 1}:${character + 1}: ${d.severity}: ${d.message}`);
  }
  process.exit(1);
}
```

## Range coordinates

`Diagnostic.range` uses **0-indexed** line and character values following the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#range) convention. This makes the output directly usable by LSP-based tooling without coordinate conversion.

Peggy's thrown errors expose 1-indexed `line` and `column` values; `validate()` subtracts 1 from each when constructing the range.

## Semantic checks

After a successful parse, `validate()` runs a semantic pass that inspects the AST for logical issues. Current checks:

### Beat balance

For bars written in **mode 2** (containing at least one dot cell), the total cell count must match the effective time signature's numerator.

- The effective time signature is carried forward from the last bar that declared one; the default is `(4/4)`.
- A warning is emitted for both **underfilled** bars (cell count < numerator) and **overfilled** bars (cell count > numerator).
- **Mode-1 bars** (no dot cells) are never warned about — the even-split rule is always unambiguous.

Example:

```
| (3/4) C . G |      → OK — 3 cells in 3/4
| (4/4) C . . G |    → OK — 4 cells in 4/4
| (5/4) C . . G |    → warning: 4 cells, expected 5
| (4/4) C . . . . . G | → warning: 7 cells, expected 4
| (3/4) C | Am . G | → OK — second bar inherits 3/4
```

### Key fit

`validate()` checks every **explicitly declared** key — the front-matter `key:` and each section-header `key:` — against the chords it governs.

- A **governed region** is the run of sections a declared key applies to: from the declaring section (or from section 0, for the front-matter key) up to — but not including — the next section that declares its own key. Blank / inherited sections are folded into the preceding region and are **never flagged on their own**.
- For each region, every in-scope key is scored against the region's chords. `ratio = declaredScore / bestScore`:

  | ratio        | result    |
  | ------------ | --------- |
  | `≥ 0.85`     | silent    |
  | `0.5`–`0.85` | `warning` |
  | `< 0.5`      | `error`   |

- **Exemptions** (never flagged, regardless of ratio): the declared key and the best-scoring key are a **relative** pair (`A minor` / `C major`), a **parallel** pair (`C major` / `C minor`), or a **modal reading** of the same tonic (`E minor` declared for an E-dorian tune whose chords score best as `D major`). These ambiguities cannot be resolved from chords alone.
- The diagnostic underlines the exact `key:` line (via the parser's `keyLoc`; see [source-locations.md](source-locations.md)). The message names the better-fitting key.

The thresholds are a deliberate tuning knob — they were calibrated so none of the bundled example charts produce a false positive.

## Design

The validator is the single source of truth for what constitutes a valid `.chart` file. All other tooling — the CLI `validate` subcommand, the language server, and any future integrations — imports the same function rather than duplicating parse-error handling logic.
