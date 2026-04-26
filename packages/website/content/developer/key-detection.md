---
layout: base.njk
title: Key Detection
permalink: /developer/key-detection/
---

# Key Detection

The `detectKey` function infers the tonic key from a sequence of chords.

```typescript
import { detectKey } from 'grigson';

const key = detectKey(chords, declaredKey?, config?);
// returns a key string like 'C', 'Am', 'G mixolydian', or null
```

---

## API

```typescript
detectKey(
  chords: Chord[],
  declaredKey?: string | null,
  config?: DetectKeyConfig
): string | null
```

- **`declaredKey`** — if provided and scores > 0 against the chord sequence, it is returned unchanged. The declared key is preserved unless it has zero diatonic overlap.
- **`config.fSharpOrGFlat`** — `'f-sharp'` (default) or `'g-flat'` — controls the F♯/G♭ tie.
- **`config.forceKey`** — bypasses detection entirely and returns the given key (used by `normalise --key`).

Returns `null` when the progression is too chromatic or sparse to identify a key (average score below 1.5 points per chord).

---

## Scoring

Each of the 63 in-scope keys (13 major + 14 harmonic minor + 12 dorian + 12 aeolian + 12 mixolydian) is scored against the chord sequence:

- **+1** for each chord whose root is diatonic to the key
- **+1** quality bonus when the chord quality matches the expected scale-degree quality (e.g. a minor chord on the VI degree of a major key)
- `dominant7` chords count as matching `major` for quality purposes (they are the V chord)

A key must average at least **1.5 points per chord** to be considered; below this threshold `detectKey` returns `null`.

### Mode scoring

Modes are distinguished from their parent major key by degree-specific quality sets:

- **Aeolian** (natural minor): iv is minor, v is minor (no leading tone)
- **Mixolydian** (dominant): v is minor, bVII is major

---

## Tiebreaking

Applied in order:

1. **Relative major/minor** — when a major key and its harmonic minor relative score within 1 point:
   - V7 of harmonic minor present → minor wins
   - V7 of major present → major wins
   - Last chord's root matches a tonic → that key wins
   - First chord's root matches a tonic → that key wins
   - Fallback: major

2. **Dorian/parent-major** — when dorian and parent major score equally:
   - V7 of parent major present → major wins
   - IV→i plagal cadence → dorian wins
   - First/last chord quality at tonic → winner
   - Default: major

3. **Aeolian/parent-major** — when aeolian and parent major score equally:
   - V7 of parent major present → major wins
   - First/last chord quality at tonic → winner
   - Default: major

4. **Mixolydian/parent-major** — when mixolydian and parent major score equally:
   - V7 of parent major present → major wins (authentic cadence confirms ionian)
   - First/last chord quality at tonic → winner
   - Default: major

5. **F♯/G♭ enharmonic pair** — resolved by chord-root spelling or `config.fSharpOrGFlat`.

6. **Ending-key-wins** — if the progression ends with a V7→tonic cadence and that tonic belongs to a candidate key that scored within 1 point of the winner, it is promoted. This handles progressions that modulate to a new key by the final bar.
