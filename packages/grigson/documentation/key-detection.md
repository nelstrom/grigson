# Key Detection

The `detectKey` function in `src/theory/keyDetector.ts` infers the tonic key from a sequence of chords.

## Scoring

Each of the 22 in-scope keys (12 major + 10 harmonic minor) is scored against the chord sequence:

- **+1** for each chord whose root is diatonic to the key
- **+1** quality bonus when the chord quality matches the expected scale-degree quality (e.g. a minor chord on the VI degree of a major key)
- `dominant7` chords count as matching `major` for quality purposes (they are the V chord with an added seventh)

A key must average at least **1.5 points per chord** to be returned; below this threshold `detectKey` returns `null` (the progression is too chromatic or sparse to identify a key).

## Tiebreaking (applied in order)

1. **Relative major/minor**: when a major key and its harmonic minor relative score within 1 point of each other, the following heuristics decide:
   1. V7 of the harmonic minor is present → minor wins
   2. V7 of the major is present → major wins
   3. Last chord's root matches a tonic → that key wins
   4. First chord's root matches a tonic → that key wins
   5. Prefer major as a final fallback

2. **F♯/G♭ enharmonic pair**: resolved by chord-root spelling (G♭-spelled roots win for G♭, F♯-spelled roots win for F♯), or by the optional `config.fSharpOrGFlat` parameter.

3. **Ending-key-wins**: if the progression ends with a **V7→tonic cadence** (dominant-7th penultimate chord resolving to a major or minor final chord), and the cadence tonic belongs to a candidate key that scored within 1 point of the overall winner, that cadence key is promoted. This handles progressions that open in one key and modulate to another by the final bar (e.g. `[Cm, D7, Gm, A7, Dm]` → `'Dm'`).

## Optional parameters

```typescript
detectKey(chords: Chord[], declaredKey?: string | null, config?: DetectKeyConfig): string | null
```

- **`declaredKey`**: if provided and scores > 0 against the chord sequence, it is returned unchanged (the declared key is preserved unless it has zero diatonic overlap).
- **`config.fSharpOrGFlat`**: `'f-sharp'` (default) or `'g-flat'` — controls the F♯/G♭ tie.
- **`config.forceKey`**: bypasses detection entirely and returns the given key (used by `normaliseSong --key`).
