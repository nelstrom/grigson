# Key Detection

The `detectKey` function in `src/theory/keyDetector.ts` infers the tonic key from a sequence of chords.

## Scoring

Each of the 63 in-scope keys (13 major + 14 harmonic minor + 12 dorian + 12 aeolian + 12 mixolydian) is scored against the chord sequence:

- **+1** for each chord whose root is diatonic to the key
- **+1** quality bonus when the chord quality matches the expected scale-degree quality (e.g. a minor chord on the VI degree of a major key)
- `dominant7` chords count as matching `major` for quality purposes (they are the V chord with an added seventh)

A key must average at least **1.5 points per chord** to be returned; below this threshold `detectKey` returns `null` (the progression is too chromatic or sparse to identify a key).

### Mode scoring differences

Modes are distinguished from their parent major key by degree-specific quality sets:

- **Aeolian** (natural minor, degree 6): iv is minor (vs IV major in dorian), v is minor (no leading tone). Aeolian separates naturally from dorian when the 6th degree appears.
- **Mixolydian** (dominant, degree 5): v is minor, bVII is major (vs dominant V and VII° in ionian). Mixolydian separates naturally from major when a dominant7 chord would otherwise confirm ionian.

## Tiebreaking (applied in order)

1. **Relative major/minor**: when a major key and its harmonic minor relative score within 1 point of each other, the following heuristics decide:
   1. V7 of the harmonic minor is present → minor wins
   2. V7 of the major is present → major wins
   3. Last chord's root matches a tonic → that key wins
   4. First chord's root matches a tonic → that key wins
   5. Prefer major as a final fallback

2. **Dorian/parent-major**: when a dorian key and its parent major score equally:
   1. V7 of the parent major is present → major wins
   2. IV→i plagal cadence (major chord on IV, minor chord on i) → dorian wins
   3. First chord quality at tonic → winner
   4. Last chord quality at tonic → winner
   5. Default: major

3. **Aeolian/parent-major**: when an aeolian key and its parent major score equally:
   1. V7 of the parent major is present → major wins
   2. First chord quality at tonic → winner (minor tonic → aeolian; major tonic → major)
   3. Last chord quality at tonic → winner
   4. Default: major

4. **Mixolydian/parent-major**: when a mixolydian key and its parent major score equally:
   1. V7 of the parent major is present → major wins (authentic cadence confirms ionian — mixolydian has a minor v, not dominant)
   2. First chord quality at tonic → winner (major tonic → mixolydian; major tonic → major)
   3. Last chord quality at tonic → winner
   4. Default: major

5. **F♯/G♭ enharmonic pair**: resolved by chord-root spelling (G♭-spelled roots win for G♭, F♯-spelled roots win for F♯), or by the optional `config.fSharpOrGFlat` parameter.

6. **Ending-key-wins**: if the progression ends with a **V7→tonic cadence** (dominant-7th penultimate chord resolving to a major or minor final chord), and the cadence tonic belongs to a candidate key (major or minor only) that scored within 1 point of the overall winner, that cadence key is promoted. This handles progressions that open in one key and modulate to another by the final bar (e.g. `[Cm, D7, Gm, A7, Dm]` → `'Dm'`).

## Optional parameters

```typescript
detectKey(chords: Chord[], declaredKey?: string | null, config?: DetectKeyConfig): string | null
```

- **`declaredKey`**: if provided and scores > 0 against the chord sequence, it is returned unchanged (the declared key is preserved unless it has zero diatonic overlap).
- **`config.fSharpOrGFlat`**: `'f-sharp'` (default) or `'g-flat'` — controls the F♯/G♭ tie.
- **`config.forceKey`**: bypasses detection entirely and returns the given key (used by `normaliseSong --key`).
