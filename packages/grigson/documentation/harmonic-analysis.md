# Harmonic Analysis

The `analyseHarmony` function annotates a sequence of chords with their inferred harmonic context, detecting common jazz patterns (ii-V-I and V-I) to identify temporary key changes within a section.

## API

```typescript
import { analyseHarmony, type AnnotatedChord } from 'grigson';

const annotated: AnnotatedChord[] = analyseHarmony(chords, homeKey);
```

### `AnnotatedChord`

Each element of the returned array is an `AnnotatedChord`:

```typescript
interface AnnotatedChord {
  chord: Chord;              // The original chord
  homeKey: string;           // The key of the enclosing section
  currentKey: string;        // The inferred local key at this chord
  currentKeyCandidates: string[]; // All candidate keys (closest first)
}
```

## Pattern Detection

The function scans left-to-right and matches the following patterns, in priority order:

### 2-5-1 (ii–V7–I)

A minor or half-diminished chord (ii) followed by a dominant-7th chord (V7) a perfect fourth above, followed by any chord (I) a perfect fifth below the V7. All three chords are assigned `currentKey` equal to the resolved tonic key.

```
Bbm  Eb7  Ab      → all three get currentKey = 'Ab'
ii   V7   I
```

### 5-1 (V7–I)

A dominant-7th chord followed by a chord a perfect fifth below. Both chords are assigned `currentKey` equal to the resolved tonic key.

```
G7  C    → both get currentKey = 'C'
V7  I
```

### Unmatched chords

Any chord not captured by a pattern receives `currentKey = homeKey`.

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

## Key Resolution

When a pattern resolves to a tonic chord, the key name is determined by:

- **Major tonic** (quality `major` or `dominant7`): maps to the major key (e.g., PC 8 → `'Ab'`)
- **Minor tonic** (quality `minor` or `halfDiminished`): maps to the minor key (e.g., PC 2 → `'Dm'`)

For pitch class 6 (F#/Gb), the flat-side spelling `'Gb'` is preferred by default.
