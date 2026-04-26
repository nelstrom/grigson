---
layout: base.njk
title: Validator
permalink: /developer/validator/
---

# Validator

The `validate` function maps a `.chart` source string to a list of structured diagnostics.

```typescript
import { validate, type Diagnostic } from 'grigson';

const diagnostics = validate(source);
```

---

## API

### `validate(source)`

```typescript
validate(source: string): Diagnostic[]
```

- Returns `[]` for valid input.
- Returns one `Diagnostic` with `severity: 'error'` for each parse error.
- Returns one `Diagnostic` with `severity: 'warning'` for each semantic issue (e.g. beat-balance mismatches).
- Has no LSP dependency — it is a plain TypeScript function usable in the CLI, language servers, pre-commit hooks, and CI pipelines.

### `Diagnostic`

```typescript
interface Diagnostic {
  range: DiagnosticRange;
  severity: 'error' | 'warning';
  message: string;
  source: 'grigson';
}

interface DiagnosticRange {
  start: { line: number; character: number }; // 0-indexed (LSP convention)
  end:   { line: number; character: number };
}
```

Range coordinates use **0-indexed** line and character values following the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#range) convention.

---

## Programmatic use

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

---

## Semantic checks

After a successful parse, `validate()` runs a semantic pass that inspects the AST for logical issues.

### Beat balance

For bars written in **mode 2** (containing at least one dot slot), the total slot count must match the effective time signature's numerator.

- The effective time signature is carried forward from the last bar that declared one; the default is `(4/4)`.
- A warning is emitted for both **underfilled** bars (slot count < numerator) and **overfilled** bars (slot count > numerator).
- **Mode-1 bars** (no dot slots) are never warned about.

```
| (3/4) C . G |      → OK — 3 slots in 3/4
| (4/4) C . . G |    → OK — 4 slots in 4/4
| (5/4) C . . G |    → warning: 4 slots, expected 5
| (4/4) C . . . . . G | → warning: 7 slots, expected 4
```

---

## CLI usage

```sh
grigson validate song.chart
grigson validate *.chart
grigson validate --format json song.chart
```

See the [CLI Reference](/cli/#grigson-validate) for full options.

---

## Design note

The validator is the single source of truth for what constitutes a valid `.chart` file. The CLI `validate` subcommand, the language server, and any future integrations all import this same function rather than duplicating parse-error handling logic.
