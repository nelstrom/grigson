# Plan: Fix Validator Meter Bug and Improve Warning Locations

## Context

Two related bugs in `packages/grigson/src/validator.ts`:

1. **False beat-balance warnings after normalisation.** `semanticChecks` initialises `effectiveTimeSig` to 4/4 and only updates it when a bar carries an inline `timeSignature` field. However, `normaliseSong` hoists a uniform inline meter (e.g., `(6/8)`) into `song.meter` and **strips** `bar.timeSignature` from every bar. After this hoisting, the validator sees no inline time signatures and falls back to 4/4 — producing spurious warnings like "Bar has 6 slots but time signature is 4/4 (expected 4)".

2. **Warnings always point to line 0, character 0.** `semanticChecks` uses `zeroRange()` for every beat-balance warning because the `Bar` AST has no stored location. Peggy's `location()` function is available inside grammar rule actions and can capture the precise source range of each bar. The challenge is storing that location without breaking existing round-trip `toEqual` tests (which compare full ASTs from source vs rendered text — the renderer adds extra blank lines between sections, changing bar line numbers). The solution: store location as a **non-enumerable** property so `Object.keys`, `JSON.stringify`, and vitest's `toEqual` are all blind to it.

## Critical Files

| File | Role |
|------|------|
| `packages/grigson/src/validator.ts` | `semanticChecks` and `validate` — both bugs live here |
| `packages/grigson/src/parser/grammar.pegjs` | `BarTail` rule — location capture goes here |
| `packages/grigson/src/parser/generated.js` | Regenerated output — never edit directly |
| `packages/grigson/src/validator.test.ts` | New tests for both fixes |

## Implementation Steps

### 1. Fix Bug 1 — read `song.meter` in `validator.ts`

Add a helper above `semanticChecks`:

```typescript
function parseMeterString(meter: string | null): TimeSignature | null {
  if (!meter || meter === 'mixed') return null;
  const match = /^(\d+)\/(\d+)$/.exec(meter);
  if (!match) return null;
  return { numerator: parseInt(match[1], 10), denominator: parseInt(match[2], 10) };
}
```

Change the initialisation of `effectiveTimeSig` inside `semanticChecks`:

```typescript
// Before:
let effectiveTimeSig: TimeSignature = { numerator: 4, denominator: 4 };

// After:
let effectiveTimeSig: TimeSignature = parseMeterString(song.meter) ?? { numerator: 4, denominator: 4 };
```

The existing `if (bar.timeSignature)` branch continues to handle per-bar overrides (needed for `meter: "mixed"` charts where each section has different meters — normalisation leaves inline tokens in place for that case).

### 2. Fix Bug 2, Part A — capture location in `grammar.pegjs`

Modify **both** alternatives of `BarTail` to attach location as a non-enumerable property:

**Alternative 1** (the normal bar):
```peggy
BarTail
  = ts:TimeSignatureToken? slots:BeatSlotList close:CloseBarline _ {
      if (!slots.some(s => s.type === "chord")) {
        error("A bar must contain at least one chord");
      }
      const bar = { type: "bar", slots, closeBarline: close };
      if (ts) bar.timeSignature = ts;
      const loc = location();
      Object.defineProperty(bar, '_sourceRange', {
        value: {
          start: { line: loc.start.line - 1, character: loc.start.column - 1 },
          end:   { line: loc.end.line - 1,   character: loc.end.column - 1   },
        },
        enumerable: false, writable: false, configurable: false,
      });
      return bar;
    }
```

**Alternative 2** (simile `%` bar):
```peggy
  / "%" _ close:CloseBarline _ {
      const bar = { type: "bar", simile: true, slots: [], closeBarline: close };
      const loc = location();
      Object.defineProperty(bar, '_sourceRange', {
        value: {
          start: { line: loc.start.line - 1, character: loc.start.column - 1 },
          end:   { line: loc.end.line - 1,   character: loc.end.column - 1   },
        },
        enumerable: false, writable: false, configurable: false,
      });
      return bar;
    }
```

Why non-enumerable: vitest's `toEqual` and `JSON.stringify` only traverse enumerable properties, so existing round-trip tests remain unaffected even when the same chart text re-parses to bars with different line numbers.

The `_sourceRange` survives the simile-resolution step in the `Row` action (which mutates `bar.slots` in place on the same object) because `Object.defineProperty` sets the property on the bar before the mutation.

Peggy uses 1-indexed line/column; subtract 1 to produce 0-indexed LSP-style ranges.

### 3. Fix Bug 2, Part B — use `_sourceRange` in `validator.ts`

Add a helper below `zeroRange`:

```typescript
function barRange(bar: Bar): DiagnosticRange {
  const desc = Object.getOwnPropertyDescriptor(bar, '_sourceRange');
  return (desc?.value as DiagnosticRange | undefined) ?? zeroRange();
}
```

Replace `zeroRange()` in the `diagnostics.push(...)` call inside `semanticChecks`:

```typescript
diagnostics.push({
  range: barRange(bar),   // was: zeroRange()
  severity: 'warning',
  message: `Bar has ${slotCount} slot${slotCount === 1 ? '' : 's'} but time signature is ${effectiveTimeSig.numerator}/${effectiveTimeSig.denominator} (expected ${expected})`,
  source: 'grigson',
});
```

No changes to `types.ts` are needed — `Bar` keeps its existing interface.

### 4. Rebuild the generated parser

```bash
cd packages/grigson && pnpm build:grammar
```

### 5. New tests in `validator.test.ts`

Add imports at the top (alongside the existing `validate` import):
```typescript
import { parseSong } from './parser/parser.js';
import { normaliseSong } from './theory/normalise.js';
import { TextRenderer } from './renderers/text.js';
```

**Bug 1 tests** — add to the `'validate — beat balance'` describe block:

```typescript
it('returns [] for a chart with front-matter meter "6/8" and 6-slot bars', () => {
  // Front-matter meter with no inline tokens — song.meter = "6/8", bar.timeSignature undefined
  const source = '---\nmeter: 6/8\n---\n| C . . . . G |';
  expect(validate(source)).toEqual([]);
});

it('returns [] when validating the rendered output of a normalised 6/8 chart', () => {
  // Round-trip that exercises the hoisting path: (6/8) inline → song.meter hoisted
  const source = '| (6/8) C . . . . G |';
  const normalised = normaliseSong(parseSong(source));
  const rendered = new TextRenderer().render(normalised);
  // rendered has "meter: 6/8" in front matter; bar has no inline (6/8) token
  expect(validate(rendered)).toEqual([]);
});
```

**Bug 2 tests** — add to the `'validate — beat balance'` describe block:

```typescript
it('warning range.start.line is 1 when the bad bar is on the second line', () => {
  const source = '| C . . G |\n| (5/4) C . G |';
  const result = validate(source);
  expect(result).toHaveLength(1);
  expect(result[0].range.start.line).toBe(1);
});

it('warning range.start.line is 0 when the bad bar is on the first line', () => {
  const source = '| (5/4) C . G |';
  const result = validate(source);
  expect(result).toHaveLength(1);
  expect(result[0].range.start.line).toBe(0);
});

it('warning range.start.character is > 0 (bar content starts after opening barline)', () => {
  // BarTail starts after OpenBarline + whitespace, so character >= 2
  const source = '| (5/4) C . G |';
  const result = validate(source);
  expect(result).toHaveLength(1);
  expect(result[0].range.start.character).toBeGreaterThan(0);
});
```

### 6. Run tests

```bash
pnpm test
```

All existing tests should continue to pass; the 5 new tests should pass.

## Verification

- The user's example chart (6/8 with dots, after normalisation) → `validate(rendered)` returns `[]`
- A bar on line 2 of a multi-line chart → warning `range.start.line === 1`
- Front-matter-only `meter: 3/4` chart with correct 3-slot dotted bars → no warnings
- All 417 existing tests still pass
