---
layout: base.njk
title: Testing
permalink: /testing/
---

# Testing Strategy

## Overview

Grigson uses [Vitest](https://vitest.dev/) as its test runner. Vitest is chosen over Jest for its native ESM support, first-class TypeScript support, and built-in snapshot testing — all without complex transform configuration.

[fast-check](https://fast-check.io/) is used for property-based testing, primarily in the transposition layer.

## Running Tests

```bash
pnpm test          # watch mode (development)
pnpm test:run      # run once and exit (CI)
pnpm coverage      # run once with coverage report
```

## Test File Conventions

Test files are co-located with the source they test, using the `.test.ts` suffix:

```
src/
  parser/
    parser.ts
    parser.test.ts
    grammar.pegjs
  renderers/
    text.ts
    text.test.ts
    svg.ts
    svg.test.ts
  transposition/
    transpose.ts
    transpose.test.ts
```

Snapshot files are stored in `__snapshots__/` directories alongside their test files (Vitest's default behaviour).

## Testing Layers

### Parser

The parser is the highest-value layer to test. Tests cover each grammar rule in isolation and complete `.chart` files end-to-end.

**Unit tests** verify that individual grammar constructs parse correctly and produce the right AST nodes:

```typescript
// Chord symbol parsing
expect(parseChord('Cm7')).toEqual({ root: 'C', quality: 'minor', extensions: ['7'] });
expect(parseChord('F#/A#')).toEqual({ root: 'F#', quality: 'major', bass: 'A#' });

// Beat slot notation
expect(parseBar('C . . G')).toEqual([
  { type: 'chord', value: 'C', beats: 3 },
  { type: 'chord', value: 'G', beats: 1 },
]);

// Simile equivalence: both produce the same AST
expect(parseRow('| C | C | C |')).toEqual(parseRow('| C | % | % |'));
```

**Integration tests** parse the complete example `.chart` files from `packages/grigson/documentation/examples/` and assert the resulting AST matches a stored snapshot. These act as regression tests for the full grammar.

**Error cases** verify that malformed input produces useful error messages rather than silent failures or cryptic crashes.

### Transposition

Transposition logic is self-contained and well-suited to both example-based and property-based testing.

**Example-based tests** cover known cases:

```typescript
expect(transpose('C', 2)).toBe('D');
expect(transpose('Bb', 2)).toBe('C');
expect(transpose('B', 1)).toBe('C');
expect(transpose('F', 6, { accidentals: 'sharps' })).toBe('B');
expect(transpose('F', 6, { accidentals: 'flats' })).toBe('Gb');
```

**Property-based tests** with fast-check verify invariants that must hold for all inputs:

```typescript
// Round-trip: transposing up N then down N is the identity
fc.assert(
  fc.property(
    fc.constantFrom(...ALL_CHORD_NAMES),
    fc.integer({ min: 0, max: 11 }),
    (chord, semitones) => {
      const up = transpose(chord, semitones);
      const down = transpose(up, 12 - semitones);
      expect(enharmonicEquals(down, chord)).toBe(true);
    },
  ),
);

// Octave equivalence: transposing by 12 semitones is the identity
fc.assert(
  fc.property(fc.constantFrom(...ALL_CHORD_NAMES), (chord) =>
    expect(enharmonicEquals(transpose(chord, 12), chord)).toBe(true),
  ),
);
```

**Per-section key tests** verify that transposition applies correctly when a chart has different keys per section:

```typescript
// Verse in Eb, chorus in Ab, transpose toKey: F
// → verse renders in F, chorus renders in Bb
```

### Text Renderer

**Snapshot tests** parse a known input, render to text, and compare against a stored expected output. Run across all example `.chart` files.

**Round-trip tests** are the most important correctness property for the text renderer: parse a source, render it back to text, parse that text, and assert the two ASTs are equal.

```typescript
const ast1 = parse(source);
const rendered = new TextRenderer().render(ast1);
const ast2 = parse(rendered);
expect(ast2).toEqual(ast1);
```

This test is run with both `simile: 'shorthand'` and `simile: 'longhand'` renderer configurations, and with various transposition settings.

### SVG Renderer

SVG snapshot tests are kept minimal because full SVG string snapshots are verbose and brittle. Instead:

- **Structural assertions** verify that the right number of elements are present (e.g. the correct number of bar groups, section labels, etc.)
- **Light snapshots** cover a small number of representative inputs to catch regressions

### End-to-End Tests

A small suite of tests exercises the full pipeline — source text → parse → render — using the `packages/grigson/documentation/examples/*.chart` files as input. These exist to catch integration bugs that unit tests miss.

## Coverage

Coverage is measured with V8 and reported via `pnpm coverage`. Coverage targets are not enforced in CI at this stage, but the report is useful for identifying untested paths in the transposition and chord notation logic.
