# Chord Qualities Expansion

## Motivation

The current `Quality` union is `'major' | 'minor' | 'dominant7' | 'halfDiminished'`.
This covers the bare minimum for three-note (triad) and four-note (tetrad) chords but
conflates triads with tetrads at the same scale degree, making key detection weaker:

```
| C | G | C | G |
```

This is genuinely ambiguous — it could be I–V–I–V in C major, or IV–I–IV–I in G major.
The triad-only scorer cannot distinguish them. But:

```
| Cmaj7 | Gmaj7 | Cmaj7 | Gmaj7 |
```

…is unambiguous. In G major, Cmaj7 = IVmaj7 ✓ and Gmaj7 = Imaj7 ✓. In C major,
Gmaj7 cannot be the diatonic V — the V tetrad in a major key is a dominant 7th, not a
maj7. The tetrad quality pins the key.

Similarly:

```
| Cmaj7 | G7 | Cmaj7 | G7 |
```

…is definitively C major: Cmaj7 = Imaj7 ✓, G7 = V7 ✓. In G major the I tetrad is
Gmaj7, not G7, so the quality bonus for G7 is lost.

The goal of this work is to add the chord qualities needed to express the full diatonic
vocabulary of major and harmonic minor keys — both as triads and tetrads — and to update
the key detector so it benefits from this richer information.

---

## Scope

### In scope (this plan)

Qualities sufficient to represent all functional scale degrees in major and harmonic
minor:

| Quality          | Suffix   | Structure                       | Example  |
| ---------------- | -------- | ------------------------------- | -------- |
| `major`          | _(none)_ | root, 3, 5                      | C        |
| `minor`          | `m`      | root, ♭3, 5                     | Cm       |
| `diminished`     | `dim`    | root, ♭3, ♭5                    | Cdim     |
| `dominant7`      | `7`      | root, 3, 5, ♭7                  | C7       |
| `maj7`           | `maj7`   | root, 3, 5, 7                   | Cmaj7    |
| `min7`           | `m7`     | root, ♭3, 5, ♭7                 | Cm7      |
| `halfDiminished` | `m7b5`   | root, ♭3, ♭5, ♭7                | Cm7b5    |
| `dim7`           | `dim7`   | root, ♭3, ♭5, ♭♭7 (= 6)        | Cdim7    |

`major`, `minor`, `dominant7`, and `halfDiminished` are already implemented.
**New additions: `diminished`, `maj7`, `min7`, `dim7`.**

The `maj7` quality accepts both the `maj7` and `M7` suffixes on input (common
shorthands). The canonical rendered form is `maj7`.

### Placeholders (out of scope for now)

The following qualities are noted here for future expansion. They add colour without
changing harmonic function in the analyses implemented so far:

| Quality        | Suffix(es)           | Notes                                        |
| -------------- | -------------------- | -------------------------------------------- |
| `augmented`    | `aug`, `+`           | III in harmonic minor; rare as a chord root  |
| `minMaj7`      | `mM7`, `m(maj7)`     | Im(maj7) in harmonic minor; very jazz-specific |
| `sus4`         | `sus4`, `sus`        | Suspended fourth; no 3rd, ambiguous function |
| `sus2`         | `sus2`               | Suspended second                             |
| `add9`         | `add9`               | Triad with added 9th, no 7th                 |
| `dom9`         | `9`                  | Dominant 9th extension                       |
| `dom11`        | `11`                 | Dominant 11th extension                      |
| `dom13`        | `13`                 | Dominant 13th extension                      |
| `maj9`         | `maj9`, `M9`         | Major 9th extension                          |
| `alteredDom`   | `7b9`, `7#9`, `7#11` | Altered dominant; implies harmonic minor V   |

---

## Degree Quality Tables

The key detector maps each scale degree's pitch class to its expected quality. With the
new types we can be precise: a scale degree has both a **triad quality** and a **tetrad
quality**. Both should award the quality bonus when a chord's quality matches.

### Major scale

| Degree | Triad quality | Tetrad quality   |
| ------ | ------------- | ---------------- |
| I      | `major`       | `maj7`           |
| II     | `minor`       | `min7`           |
| III    | `minor`       | `min7`           |
| IV     | `major`       | `maj7`           |
| V      | `major`       | `dominant7`      |
| VI     | `minor`       | `min7`           |
| VII    | `diminished`  | `halfDiminished` |

### Harmonic minor scale

(Built on: root, 2, ♭3, 4, 5, ♭6, 7)

| Degree | Triad quality | Tetrad quality   | Notes                          |
| ------ | ------------- | ---------------- | ------------------------------ |
| I      | `minor`       | _(minMaj7 — placeholder)_ | Raised 7th produces minMaj7; out of scope |
| II     | `diminished`  | `halfDiminished` |                                |
| III    | _(augmented — placeholder)_ | _(augMaj7 — placeholder)_ | Out of scope |
| IV     | `minor`       | `min7`           |                                |
| V      | `major`       | `dominant7`      | The defining chord of harmonic minor |
| VI     | `major`       | `maj7`           |                                |
| VII    | `diminished`  | `dim7`           | Fully diminished; common dom7 substitute |

### Scoring model

`buildKeyScoreMap` currently maps each degree's pitch class to a single `Quality | null`.
It should be changed to map each pitch class to a `Set<Quality>` — the union of triad
and tetrad expected qualities for that degree. The quality bonus is awarded when the
chord's quality appears anywhere in that set.

```typescript
// Conceptually:
const MAJOR_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set(['major', 'maj7']),           // I
  new Set(['minor', 'min7']),           // II
  new Set(['minor', 'min7']),           // III
  new Set(['major', 'maj7']),           // IV
  new Set(['major', 'dominant7']),      // V
  new Set(['minor', 'min7']),           // VI
  new Set(['diminished', 'halfDiminished']), // VII
];

const HARMONIC_MINOR_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set(['minor']),                   // I  (minMaj7 placeholder omitted)
  new Set(['diminished', 'halfDiminished']), // II
  new Set(),                            // III (augmented — placeholder)
  new Set(['minor', 'min7']),           // IV
  new Set(['major', 'dominant7']),      // V
  new Set(['major', 'maj7']),           // VI
  new Set(['diminished', 'dim7']),      // VII
];
```

---

## Implementation Phases

### Phase 1 — Extend the type system, parser, and renderer

1. Add `'diminished' | 'maj7' | 'min7' | 'dim7'` to the `Quality` union in
   `src/parser/types.ts`.

2. Extend the `Quality` rule in `src/parser/grammar.pegjs`. Order matters in PEG
   (longer alternatives must precede shorter ones):

   ```pegjs
   Quality
     = "m7b5"  { return "halfDiminished"; }
     / "maj7"  { return "maj7"; }
     / "M7"    { return "maj7"; }
     / "m7"    { return "min7"; }
     / "m"     { return "minor"; }
     / "dim7"  { return "dim7"; }
     / "dim"   { return "diminished"; }
     / "7"     { return "dominant7"; }
     / ""      { return "major"; }
   ```

3. Extend `TextRenderer.renderChord()` with the new suffix mappings. `maj7` should
   render as `maj7` (not `M7`). Round-trip tests must pass.

4. Run `pnpm build` to regenerate the parser. Add parser tests for each new quality
   (parsing and round-trip rendering).

### Phase 2 — Update key detector degree tables

1. Replace `MAJOR_DEGREE_QUALITIES` and `HARMONIC_MINOR_DEGREE_QUALITIES` arrays with
   `MAJOR_DEGREE_QUALITY_SETS` and `HARMONIC_MINOR_DEGREE_QUALITY_SETS` (Set-based, as
   above).

2. Update `buildKeyScoreMap` to store `Set<Quality>` values.

3. Update `qualityMatches` (or inline its logic) to check set membership rather than
   a single expected value:

   ```typescript
   function qualityMatchesSet(chordQuality: Quality, expected: Set<Quality>): boolean {
     return expected.has(chordQuality);
   }
   ```

4. The existing special case `dominant7 → major` is now handled by the V degree's set
   `{ 'major', 'dominant7' }` — the explicit override in `qualityMatches` can be removed.

5. Run all existing key detector tests to confirm no regressions.

### Phase 3 — New key detection tests with tetrads

Add a new test suite `key-detector-tetrads` covering cases where four-note chord
qualities provide stronger evidence than triads alone:

**Disambiguation: maj7 vs dominant7 identifies key**

```typescript
// | Cmaj7 | Gmaj7 | → G major (Gmaj7 = I, Cmaj7 = IV; in C the V tetrad is G7 not Gmaj7)
detectKey([Cmaj7, Gmaj7, Cmaj7, Gmaj7]) === 'G'

// | Cmaj7 | G7 | → C major (Cmaj7 = I, G7 = V7; in G the I tetrad is Gmaj7 not G7)
detectKey([Cmaj7, G7, Cmaj7, G7]) === 'C'
```

**Full diatonic progression with tetrads**

```typescript
// ii–V–I–VI with tetrads in C major
detectKey([Dm7, G7, Cmaj7, Am7]) === 'C'

// ii–V–I in D major
detectKey([Em7, A7, Dmaj7]) === 'D'
```

**Harmonic minor tetrads**

```typescript
// ii∅–V7–i in A minor (all tetrads)
detectKey([Bm7b5, E7, Am7]) === 'Am'

// VII°7 as dominant substitute in A minor
// G#dim7 functions as E7b9 (same pitches minus root), strong minor signal
detectKey([Am7, Dm7, Gdim7, Am7]) === 'Am'   // Gdim7 = VIIdim7 of Am
```

**Triad ambiguity resolved by tetrads**

```typescript
// Triad-only: ambiguous between C and G
detectKey([C, G, C, G]) // could be either

// Tetrad: unambiguous
detectKey([Cmaj7, G7, Cmaj7, G7]) === 'C'
detectKey([Cmaj7, Gmaj7, Cmaj7, Gmaj7]) === 'G'
```

### Phase 4 — Update harmonic analysis

`analyseHarmony` in `src/theory/harmonicAnalysis.ts` pattern-matches on chord quality
to identify 2-5-1 and 5-1 progressions. The ii chord in a 2-5-1 is currently expected
to have quality `'minor'` or `'halfDiminished'`. It should also accept `'min7'` and
keep `'halfDiminished'` (which represents the iiø in harmonic minor contexts):

- ii in major: `minor` or `min7`
- ii in harmonic minor: `halfDiminished` or `diminished`
- V7: `dominant7` (unchanged)
- I: `major`, `minor`, `maj7`, `min7` (accept tetrads as tonic resolution)

`circleOfFifthsDistance` and the isolated-chord fallback should be unaffected, as they
operate on pitch class and key membership rather than quality directly.

### Phase 5 — Normalisation smoke test

`normaliseSection` calls `analyseHarmony` and uses the `currentKey` for spelling. The
normaliser looks at chord roots, not qualities, for enharmonic decisions — so the main
risk is that new quality values pass through `normaliseChord` without issues. Verify
that all existing normalise tests continue to pass, and add one or two charts that use
the new qualities (e.g. `Dm7 | G7 | Cmaj7`) to confirm no regressions.

---

## Key Design Decisions

**Why `maj7` not `M7` as the canonical internal name?**
`M7` is already used as a common written suffix, but as an identifier `M7` is
all-uppercase and inconsistent with the rest of the `Quality` union (`camelCase`).
`maj7` matches the spoken name ("major seven") and is unambiguous.

**Why store a Set per degree rather than two separate arrays (triads/tetrads)?**
A given chord is always one thing — you don't need to know whether the degree table
is "triad mode" or "tetrad mode". The set approach is simpler: "does this chord's
quality belong to the expected qualities at this pitch class?" The triad/tetrad
distinction is a conceptual framing for the tables, not a runtime branching condition.

**Why does `dim7` belong on degree VII of harmonic minor, not as a separate dominant?**
In tonal harmony, `G#dim7` in the key of Am is heard as a rootless `E7b9` (it shares
three of the four pitches of `E7b9`). It is therefore a dominant function chord, and
scoring it as diatonic to Am (at degree VII) reflects that function correctly. A future
`alteredDom` quality could provide finer-grained analysis.

---

## Open Questions

- **`minMaj7` (Im(maj7) in harmonic minor):** The tonic tetrad of harmonic minor is
  technically a minor-major 7th. In practice it appears rarely. Leave as a placeholder
  until there is a real chart that requires it.

- **Altered dominants (`7b9`, `7#9`, `7#11`):** These are dominant-function chords that
  imply harmonic minor borrowing. They could be modelled as a separate `alteredDom`
  quality that matches the V position in both major and harmonic minor. Defer until
  harmonic analysis is expanded.

- **`dim7` as a borrowed dominant substitute outside its home key:** A `Bdim7` in
  C major is often heard as a rootless `G7b9`. The circle-of-fifths fallback in
  `analyseHarmony` may already handle this approximately, but it has not been tested
  with `dim7` chords. Worth revisiting once Phase 4 is done.
