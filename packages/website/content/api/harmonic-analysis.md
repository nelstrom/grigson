---
layout: base.njk
title: Harmonic Analysis
permalink: /api/harmonic-analysis/
---

# Harmonic Analysis

The `analyseHarmony` function annotates a sequence of chords with their inferred harmonic context, detecting common jazz patterns (ii-V-I and V-I) to identify temporary key changes within a section.

---

## API

```typescript
import { analyseHarmony, type AnnotatedChord } from 'grigson';

const annotated: AnnotatedChord[] = analyseHarmony(chords, homeKey);
```

### `AnnotatedChord`

```typescript
interface AnnotatedChord {
  chord: Chord;              // The original chord
  homeKey: string;           // The key of the enclosing section
  currentKey: string;        // The inferred local key at this chord
  currentKeyCandidates: string[]; // All candidate keys (closest first)
}
```

---

## Pattern Detection

The function scans left-to-right and matches the following patterns, in priority order:

### ii–V7–I (2-5-1)

A chord with a ii quality followed by a dominant-7th chord (V7) a perfect fourth above, followed by a tonic chord (I) a perfect fifth below the V7. All three chords are assigned `currentKey` equal to the resolved tonic key.

Accepted ii qualities: `minor`, `min7`, `halfDiminished`, `diminished`.

```
Bbm   Eb7  Ab      → all three get currentKey = 'Ab'  (minor ii)
Bbm7  Eb7  Abmaj7  → all three get currentKey = 'Ab'  (min7 ii with maj7 I)
Bm7b5 E7   Am      → all three get currentKey = 'Am'  (half-diminished ii, minor 2-5-1)
Bdim  E7   Am      → all three get currentKey = 'Am'  (diminished ii in harmonic minor)
```

### V7–I (5-1)

A dominant-7th chord followed by a tonic chord a perfect fifth below. Both chords are assigned `currentKey` equal to the resolved tonic key.

```
G7  C      → both get currentKey = 'C'   (major tonic)
G7  Cmaj7  → both get currentKey = 'C'   (maj7 tonic)
E7  Am     → both get currentKey = 'Am'  (minor tonic)
E7  Am7    → both get currentKey = 'Am'  (min7 tonic)
```

### Aeolian bVII → i cadence

When `homeKey` is aeolian, a major chord at the flat-seventh degree followed by a minor chord at the tonic is recognised as the characteristic aeolian cadence.

```
G  Am   (homeKey = 'A aeolian')
```

### Mixolydian bVII → I cadence

When `homeKey` is mixolydian, a major chord at the flat-seventh degree followed by a major chord at the tonic is recognised as the characteristic mixolydian cadence.

```
C  D   (homeKey = 'D mixolydian')
```

### Circle-of-fifths fallback

A chord not captured by any pattern and **not diatonic to homeKey** receives a `currentKey` derived from the circle of fifths. All in-scope keys whose diatonic note set contains the chord's root are collected and ranked by `circleOfFifthsDistance` from `homeKey`. The closest key becomes `currentKey`.

Tie-breaking: parallel minor of `homeKey` is preferred, then major keys.

```
C  Ab  G    (homeKey = 'C')
   ↑
   Ab is not diatonic to C. Closest keys: Eb and Cm (both 3 CoF steps).
   Cm is the parallel minor of C → currentKey = 'Cm'
```

### Unmatched diatonic chords

A chord diatonic to homeKey and not captured by any pattern receives `currentKey = homeKey`.

---

## Example

```typescript
import { parseSong, analyseHarmony } from 'grigson';

const song = parseSong(`
---
key: C
---
| C | A7 | Dm | G7 | C |
`);

const chords = song.sections[0].rows.flatMap((r) => r.bars.map((b) => b.chord));
const annotated = analyseHarmony(chords, 'C');

// A7 and Dm → currentKey = 'Dm'  (A7 is V7 of D minor)
// G7 and C  → currentKey = 'C'   (G7 is V7 of C major)
```

---

## Circle-of-fifths distance

```typescript
import { circleOfFifthsDistance } from 'grigson';

circleOfFifthsDistance('C', 'G');   // 1
circleOfFifthsDistance('C', 'F');   // 1
circleOfFifthsDistance('C', 'Bb');  // 2
circleOfFifthsDistance('C', 'Am');  // 0  (Am is relative of C)
circleOfFifthsDistance('C', 'Dm');  // 1  (Dm is relative of F)
```

Minor, dorian, aeolian, and mixolydian keys are all mapped to their relative major before computing the distance.

---

## Integration with normalisation

`normaliseSong` uses `analyseHarmony` internally to determine the correct enharmonic spelling for each chord:

1. Detect the section's `homeKey` via `detectKey`.
2. Call `analyseHarmony(chords, homeKey)` to get a `currentKey` per chord.
3. For each chord, use `homeKey` if the pitch class is diatonic to it; otherwise use `currentKey`.

This means `normaliseSong` handles both diatonic enharmonic corrections (e.g. `C#` → `Db` in Db major) and borrowed-chord spelling (e.g. `Bb` staying `Bb` in C major) through a single mechanism.
