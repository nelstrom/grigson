# Plan: Harmonic Analysis, Normalisation, and Transposition

## Overview

This plan describes how grigson should handle three related capabilities:

1. **Normalisation** — spell every chord root consistently, using the key context to choose between enharmonic equivalents (e.g. Ab vs G#)
2. **Harmonic analysis** — annotate each chord with a *current key* that reflects tonicisations and borrowed chords, not just the section's home key
3. **Transposition** — shift a song or section to a new key, producing correctly-spelled output

### Core mental model

- Every key contains 7 diatonic notes. Chords built on those notes belong to the key.
- Chords outside the key are *borrowed* from another key. Their correct spelling depends on which key they're borrowed from.
- A standalone function that transposes a chord without key context (`transposeChord(chord, semitones)`) is the wrong abstraction. Spelling decisions require context.

### Files affected

**Delete** (wrong abstraction, embodies the chromatic mental model):
- `packages/grigson/src/theory/transpose.ts`
- `packages/grigson/src/theory/transpose.test.ts`

**Keep** (valid improvement, independent of transposition):
- The tie-breaking addition to `keyDetector.ts` from commit 2f29151 (prefer tonic match on equal scores)

**Extend**:
- `normalise.ts` — currently operates at the song level with a single detected key; needs to operate per-section

**Create**:
- `harmonicAnalysis.ts` — assigns a `currentKey` to each chord
- `transpose.ts` — re-implemented with correct section-level approach

---

## Part 1: Normalisation

### Current state

`normaliseSong` flattens all chords across all rows into one sequence, detects a single key for the whole song, and spells every chord root against that key. For simple songs with no modulation this works well. It falls short when sections are in different keys (e.g. Kodachrome: verse in E, chorus in A) or when a section's ending key differs from its opening key (e.g. Whisper Not: A section starts on Cm, ends on Dm).

### Needed improvement: section-level normalisation

Normalisation should operate on sections (groups of rows sharing a label, or the entire song when no sections exist). Each section gets its own home key, detected independently.

```
normaliseSection(chords: Chord[]): { homeKey: string | null; chords: Chord[] }
normaliseSong(song: Song): Song   // calls normaliseSection per section
```

### Home key detection: ending key wins

The current `detectKey` gives equal weight to all chords. For normalisation, when a section starts in one key and ends in another, the ending key should be treated as the home key — the opening chords are a tonicisation or approach. This is a tie-breaking adjustment to `detectKey`, not a replacement.

**Test case — ending key wins (Whisper Not A section excerpt):**
```
Input:  [Cm, D7, Gm, A7, Dm]
Result: homeKey = 'Dm'
Rationale: Dm is the final tonic cadence. Cm would score for C minor or Eb major,
           but the section closes on Dm, establishing D minor as home.
```

---

## Part 2: Harmonic Analysis

### Motivation

Once the home key is known, most chords can be spelled using its diatonic notes. But some chords don't belong to the home key. To spell these correctly we need to know which key they're *borrowed from* — their **current key**.

For a single isolated borrowed chord, the current key is ambiguous. Context (surrounding chords) resolves the ambiguity. A dominant seventh chord one semitone above the next chord's root (a V7→I motion) strongly implies a local tonic.

### Data model

```typescript
interface AnnotatedChord {
  chord: Chord;
  homeKey: string;
  currentKey: string;         // may differ from homeKey for borrowed chords
  currentKeyCandidates: string[]; // ordered by likelihood; first is chosen
}
```

`currentKey` is always the first element of `currentKeyCandidates`. The candidates list is surfaced for debugging and future use.

### Algorithm: sliding window scan

The analysis pass scans the chord sequence with lookahead, looking for patterns that imply a local tonic:

1. **2-5-1** (strongest signal): three consecutive chords where chord 1 is minor/half-diminished a whole step below chord 2, chord 2 is dominant seventh, chord 3 is major or minor a fifth below chord 2. Assigns `currentKey = chord3.root + (chord3 quality minor ? 'm' : '')` to all three chords.
2. **5-1** (moderate signal): a dominant seventh followed by a chord a fifth below. Assigns current key based on chord 2.
3. **2-5** (weak signal, lookahead only): a minor chord followed by a dominant seventh a fifth above. Candidates favour the implied resolution.
4. **Isolated borrowed chord** (no pattern match): candidates are all keys that contain this pitch class as a diatonic note, sorted by circle-of-fifths distance from homeKey. Closest wins.

### Tie-breaking for borrowed chords: circle of fifths

When a borrowed chord could come from multiple keys, prefer the key that is fewest steps from the home key on the circle of fifths. Relative major/minor counts as zero additional steps (they are enharmonic neighbours on the circle).

```
homeKey = C major (0 sharps/flats)
borrowed chord pitch class 8 (G#/Ab)

Candidate keys containing pitch class 8:
  Ab major (4 flats) — 4 steps flat-side from C
  E major  (4 sharps) — 4 steps sharp-side from C
  C minor  (3 flats, relative of Eb) — 3 steps flat-side
  Am       (relative of C) — 0 steps

Am doesn't contain pitch class 8 as a diatonic note in natural minor,
but harmonic minor Am does (G# is the raised 7th).

→ Choose Am (harmonic minor), spelling: G#
→ currentKey = 'Am'
```

**Test case — borrowed bVI in C major, isolated:**
```
Input:  [C, Ab, G]
homeKey: C
Ab candidates: [Ab (bVI of C, borrowed from C minor/parallel minor)] → Eb major is 3 flats,
               Ab major is 4 flats, C minor is 3 flats.
               Prefer C minor (relative minor is 0 steps from C major).
Result: Ab spelled 'Ab', currentKey = 'Cm' (or 'Eb', depending on scoring)
```

**Test case — 2-5-1 to Ab within C major section:**
```
Input:  [C, Bbm, Eb7, Abmaj7, G7, C]
Pattern match: Bbm-Eb7-Abmaj7 is a 2-5-1 in Ab major
Result:
  C       → currentKey: C
  Bbm     → currentKey: Ab (spelled Bb, not A#)
  Eb7     → currentKey: Ab (spelled Eb, not D#)
  Abmaj7  → currentKey: Ab (spelled Ab, not G#)
  G7      → currentKey: C
  C       → currentKey: C
```

**Test case — 2-5-1 to Db within Bb major section (What's New B section excerpt):**
```
Input:  [F, Ebm, Ab7, Dbmaj7, C7, F]
homeKey: F major
Pattern match: Ebm-Ab7-Dbmaj7 is a 2-5-1 in Db major
Result:
  F       → currentKey: F
  Ebm     → currentKey: Db (spelled Eb, not D#)
  Ab7     → currentKey: Db (spelled Ab, not G#)
  Dbmaj7  → currentKey: Db (spelled Db, not C#)
  C7      → currentKey: F
  F       → currentKey: F
```

**Test case — secondary dominant 5-1:**
```
Input:  [C, A7, Dm, G7, C]   (A7 is V7/ii)
homeKey: C major
Pattern match: A7→Dm is a 5-1 in D minor
Result:
  A7 → currentKey: Dm (C# spelled as C#, diatonic to D harmonic minor)
  Dm → currentKey: Dm (diatonic to C major, currentKey reverts to C)
```

**Test case — isolated dominant seventh, ambiguous:**
```
Input:  [C, Bb7, C]
homeKey: C major
Bb7 candidates: Eb major (bVII7 of C, borrowed from C minor) — 3 flats, 3 steps from C
                F major (V7 of F) — 1 flat, 1 step from C
→ Prefer F major (closer on circle of fifths)
Result: Bb7 currentKey = F, spelled 'Bb'
Note: this is a heuristic and may be wrong in some contexts
```

---

## Part 3: Transposition

### Algorithm

Transposition is a two-step operation applied at the **section level**:

1. **Shift**: add the semitone delta to every chord root's pitch class (mod 12). Chord quality is unchanged.
2. **Normalise**: run the full normalisation + harmonic analysis on the shifted sequence to produce correctly-spelled output.

This means transposition never needs to decide how to spell a note. That decision belongs entirely to normalisation.

```typescript
function transposeSection(chords: Chord[], semitones: number): Chord[]
function transposeSong(song: Song, semitones: number): Song
function transposeSongToKey(song: Song, targetKey: string): Song
```

`transposeSongToKey` computes the semitone interval from the detected home key of the first section to the target key, then calls `transposeSong`.

### Test cases

**Diatonic transposition:**
```
Input:  [C, F, G, Am] in C, +7 semitones
Shift:  [G, C, D, Em]  (all diatonic to G major)
Result: [G, C, D, Em], homeKey = G
Note: D chord correctly uses no accidental (F# is implied by key, not a chord root here)
```

```
Input:  [Bb, Eb, F, Gm] in Bb, +2 semitones
Shift:  [C, F, G, Am]
Result: [C, F, G, Am], homeKey = C
```

**Borrowed bVII preserved:**
```
Input:  [C, Bb, F, G] in C  (Bb is bVII, borrowed from C minor)
Shift +7: pitch classes [0,10,5,7] → [7,5,0,2] → [G, F, C, D]
Normalise in G major:
  F is not diatonic to G. Borrowed bVII of G.
  Spelled 'F' (not E#).
Result: [G, F, C, D], homeKey = G
```

**Borrowed bVI preserved:**
```
Input:  [C, Ab, F, G] in C  (Ab is bVI)
Shift +7: [0,8,5,7] → [7,3,0,2] → [G, Eb, C, D]
Normalise in G major:
  Eb is not diatonic to G. Borrowed bVI of G.
  Spelled 'Eb' (not D#).
Result: [G, Eb, C, D], homeKey = G
```

**Enharmonic correctness across key families:**
```
Input:  [F#, B, C#m, D#m] in F# major, -6 semitones
Shift:  pitch classes [6,11,1,3] → [0,5,7,9] → [C, F, G, Am]
Normalise in C major: all diatonic.
Result: [C, F, G, Am], homeKey = C
Note: F# → C, not B# → C. The shift produces pitch class 0 = C.
```

**2-5-1 enharmonic spelling preserved through transposition:**
```
Input:  [C, Bbm, Eb7, Abmaj7, G7, C] in C, +2 semitones
Shift:  [D, Cm, F7, Bbmaj7, A7, D]
Normalise:
  Cm-F7-Bbmaj7 is a 2-5-1 in Bb major
  Cm spelled Cm (not B#m), F7 spelled F7 (not E#7), Bb spelled Bb (not A#)
Result: [D, Cm, F7, Bbmaj7, A7, D], homeKey = D
```

**Kodachrome section transposition:**
```
Verse input:  [E, A, F#m, B7] in E
Chorus input: [A, C#7, F#, Bm, E7, D, B7] in A

Transposing verse +5 (to A):
  Shift: [A, D, Bm, E7] — all diatonic to A major
  Result: [A, D, Bm, E7], homeKey = A

Transposing chorus +5 (to D):
  Shift: [D, F#7, B, Em, A7, G, E7]
  Normalise in D major:
    F#7 is V7/B — secondary dominant, currentKey = Bm
    B major is the III chord (borrowed from D Lydian or D major with chromatic III)
  Result: [D, F#7, B, Em, A7, G, E7], homeKey = D
```

**Whisper Not A section (ending-key-wins + transposition):**
```
Input:  [Cm, D7, Gm, A7, Dm]
homeKey: Dm  (ending key wins over Cm)

Transposing +2 (to Em):
  Shift pitch classes [0,2,7,9,2] → [2,4,9,11,4]
             → [D, E, A, B, E] (chord roots after shift)
  Chords with quality: [Dm, E7, Am, B7, Em]
  Normalise:
    Dm-E7-Am is 2-5-1 in... wait, E7→Am is a 5-1. A7→Dm was the 5-1 in original.
    After shift: B7→Em is 5-1 in Em. A7→Dm was V7/IV originally.
    Normalise in Em: Dm is bVII of Em, borrowed from E minor natural.
    D spelled D (not C##), E7 is secondary dominant (V7/Am? or V7/IV of Em?)
  homeKey = Em (ending key = Em)
```

---

## What's New: The Reference Case

The A section of *What's New* is the most harmonically complex case in the test suite and exercises all three capabilities together.

Simplified A section: `[C, Bbm, Eb7, Abmaj7, Dm7b5, G7, Cmaj7]`

Analysis:
- homeKey: C (the section opens and closes on C)
- Bbm-Eb7-Abmaj7: 2-5-1 in Ab major. All three chords get currentKey = Ab.
- Dm7b5-G7-Cmaj7: 2-5-1 in C major. All three chords get currentKey = C.

Transposing +5 (C → F) should produce the B section:
`[F, Ebm, Ab7, Dbmaj7, Gm7b5, C7, Fmaj7]`

- homeKey: F
- Ebm-Ab7-Dbmaj7: 2-5-1 in Db major (Eb spelled Eb not D#, Ab not G#, Db not C#)
- Gm7b5-C7-Fmaj7: 2-5-1 in F major

This makes the A→B relationship a transposition test: `transposeSection(Asection, +5)` should equal the B section chord sequence. This is a high-confidence end-to-end test because the correct answer is in the score.

---

## Implementation order

1. Extend `normalise.ts` to operate per-section with section-level home key detection
2. Implement `harmonicAnalysis.ts`: sliding window pattern detection (2-5-1, 5-1, isolated fallback), returning `AnnotatedChord[]`
3. Wire harmonic analysis into normalisation: use `currentKey` for spelling non-diatonic chords
4. Implement `transpose.ts`: shift-then-normalise, section by section
5. Drive each step with the test cases above before moving to the next
