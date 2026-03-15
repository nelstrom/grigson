# Plan: Dorian Tonality

## Overview

Dorian is a mode of the major scale. It shares all seven notes with its relative major and relative
natural minor (aeolian), but has a distinct tonic (a minor chord) and a characteristic major IV
chord. This plan describes how to add first-class dorian support to grigson's key detection,
normalisation, and harmonic analysis layers.

This is the first of several planned modal extensions. The design deliberately uses a naming
convention and helper functions that generalise cleanly to other modes later.

---

## Theory primer

### The dorian scale

Dorian is built on the second degree of a major scale. Its interval pattern is:
`W-H-W-W-W-H-W` → semitones from root: `[0, 2, 3, 5, 7, 9, 10]`

Compared to natural minor (aeolian): dorian has a **raised 6th** (major 6th instead of minor 6th).

| Mode        | Intervals from root                      |
|-------------|------------------------------------------|
| Major       | 0 2 4 5 7 9 11                           |
| Harmonic minor | 0 2 3 5 7 8 11                        |
| Dorian      | 0 2 3 5 7 **9** 10                       |
| Aeolian     | 0 2 3 5 7 **8** 10                       |

### The key family (same key signature)

D dorian, C major, and A natural minor all share the same seven notes: C D E F G A B.
The difference is purely which note is the tonic and the harmonic function built on each degree.

### Characteristic chords and cadences

| Chord | Function | Significance |
|-------|----------|--------------|
| i     | minor tonic | Distinguishes dorian from its relative major |
| IV    | **major** IV | The single most distinctive dorian marker — major IV over a minor tonic |
| bVII  | major subtonic | Common in dorian/rock; also present in aeolian |
| V     | minor (not dominant7) | Absent raised 7th distinguishes dorian from harmonic minor |

The **plagal cadence IV → i** (e.g. G → Dm in D dorian) is the clearest dorian signal: a major
subdominant resolving to a minor tonic. No other mode in the relative family produces this pairing.

The **bVII → i** motion (e.g. C → Dm) is common but also present in aeolian, so it's a weaker
signal on its own.

The **absence** of V7 → i confirms dorian (or aeolian) vs harmonic minor.

### Worked examples from the .chart files

**E dorian** (`mad-world.chart`): `Em G D A`
- Em: i (minor tonic) ✓
- G: bIII major
- D: bVII major
- A: **IV major** ← decisive dorian signal (contains C#, diatonic to E dorian but not E aeolian or E harmonic minor)

**B dorian** (`wicked-game.chart`): `Bm A E`
- Bm: i (minor tonic) ✓
- A: bVII major
- E: **IV major** ← decisive (contains G#, diatonic to B dorian but not B aeolian or B harmonic minor)

**D dorian** (Drunken Sailor): `Dm C`
- Dm: i ✓
- C: bVII major — ambiguous between D dorian, D aeolian, and F major
- Without a clear IV, the tonic chord + declared key is the primary signal here

### Why dorian and harmonic minor don't compete

Dorian and harmonic minor for the same root have genuinely different note sets — they differ on
both the 6th and 7th degrees. A chord sequence will naturally score higher for one than the other.
For example, `A major` (containing C#) is diatonic to E dorian but scores zero for E harmonic minor
(which has C natural). Scoring alone handles this separation; no special tiebreaking is needed.

### The hard case: dorian vs relative major

D dorian and C major share all seven notes. Scoring cannot separate them. Tiebreaking is required
and mirrors the existing `breakRelativeTie` logic between major and harmonic minor.

---

## Key naming convention

The key string in KEYS and throughout the system uses the suffix ` dorian` (space + word):
`"D dorian"`, `"E dorian"`, `"B dorian"`, etc.

This matches the format already used in the example `.chart` files and is human-readable. The
space makes it unambiguous — no note name ends in `" dorian"`.

### Helper functions (`keys.ts` or a new `keyUtils.ts`)

All code that currently does `key.endsWith('m')` / `key.slice(0, -1)` should migrate to:

```ts
export type KeyMode = 'major' | 'minor' | 'dorian';

export function getKeyMode(key: string): KeyMode {
  if (key.endsWith(' dorian')) return 'dorian';
  if (key.endsWith('m')) return 'minor';
  return 'major';
}

export function getKeyRoot(key: string): string {
  if (key.endsWith(' dorian')) return key.slice(0, -7); // strip " dorian"
  if (key.endsWith('m')) return key.slice(0, -1);
  return key;
}
```

Using a `KeyMode` type (rather than more `endsWith` checks spread across files) makes future mode
additions (mixolydian, phrygian, etc.) a matter of extending the type and the two helper functions.

---

## Changes by file

### `keys.ts`

**Add dorian entries.** Start with the 12 practical dorian keys (avoiding double sharps / double
flats):

```ts
// Dorian mode
'C dorian':  { notes: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'], relative: 'Bb' },
'D dorian':  { notes: ['D', 'E', 'F', 'G', 'A', 'B', 'C'],   relative: 'C' },
'E dorian':  { notes: ['E', 'F#', 'G', 'A', 'B', 'C#', 'D'], relative: 'D' },
'F dorian':  { notes: ['F', 'G', 'Ab', 'Bb', 'C', 'D', 'Eb'], relative: 'Eb' },
'G dorian':  { notes: ['G', 'A', 'Bb', 'C', 'D', 'E', 'F'],   relative: 'F' },
'A dorian':  { notes: ['A', 'B', 'C', 'D', 'E', 'F#', 'G'],   relative: 'G' },
'B dorian':  { notes: ['B', 'C#', 'D', 'E', 'F#', 'G#', 'A'], relative: 'A' },
'Bb dorian': { notes: ['Bb', 'C', 'Db', 'Eb', 'F', 'G', 'Ab'], relative: 'Ab' },
'Eb dorian': { notes: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'C', 'Db'], relative: 'Db' },
'F# dorian': { notes: ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'E'], relative: 'E' },
'Ab dorian': { notes: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F', 'Gb'], relative: 'Gb' },
'C# dorian': { notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B'], relative: 'B' },
```

The `relative` field points to the relative major (the major key one whole step below the dorian
root). This is used by circle-of-fifths distance calculations.

**Export `getKeyMode` and `getKeyRoot`** from `keys.ts` (or a new `keyUtils.ts`).

### `keyDetector.ts`

**Add dorian interval and quality tables:**

```ts
const DORIAN_INTERVALS = [0, 2, 3, 5, 7, 9, 10];

const DORIAN_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set<Quality>(['minor', 'min7']),                         // i
  new Set<Quality>(['minor', 'min7']),                         // ii
  new Set<Quality>(['major', 'maj7']),                         // bIII
  new Set<Quality>(['major', 'dominant7', 'maj7']),            // IV (IV7 is diatonic)
  new Set<Quality>(['minor', 'min7']),                         // v
  new Set<Quality>(['diminished', 'halfDiminished']),          // vi°
  new Set<Quality>(['major', 'dominant7', 'maj7']),            // bVII
];
```

Note: IV7 (e.g. G7 in D dorian) is included as diatonic because the minor 7th of IV is the 3rd
scale degree of the dorian mode.

**Update `buildKeyScoreMap`** to use `getKeyMode`/`getKeyRoot`:

```ts
function buildKeyScoreMap(key: string): Map<number, Set<Quality>> {
  const mode = getKeyMode(key);
  const rootName = getKeyRoot(key);
  const rootPC = rootToPitchClass(rootName);
  const intervals =
    mode === 'dorian' ? DORIAN_INTERVALS :
    mode === 'minor'  ? HARMONIC_MINOR_INTERVALS :
                        MAJOR_INTERVALS;
  const qualitySets =
    mode === 'dorian' ? DORIAN_DEGREE_QUALITY_SETS :
    mode === 'minor'  ? HARMONIC_MINOR_DEGREE_QUALITY_SETS :
                        MAJOR_DEGREE_QUALITY_SETS;
  ...
}
```

**Add `breakDorianMajorTie`:**

D dorian and C major score identically for the same chord sequence. The tiebreaker:

1. **V7 → I cadence where I is major** → relative major wins (a dominant seventh resolving to a
   major chord is the hallmark of the major key, not dorian).
2. **Major IV → minor i** (dorian plagal cadence) → dorian wins (scan for a major chord at the
   perfect 4th above the minor tonic root).
3. **Declared key (front matter)** → already handled upstream, but the resolved key here should
   be consistent.
4. **Quality of the last chord** → if minor, dorian; if major, relative major.
5. **Quality of the first chord** → same.
6. **Default** → relative major (conservative; prefers the more common case).

```ts
function breakDorianMajorTie(dorian: string, major: string, chords: Chord[]): string {
  const dorianRootPC = rootToPitchClass(getKeyRoot(dorian));
  const majorRootPC  = rootToPitchClass(major);

  // 1. V7 → I (major) cadence → major wins
  const v7OfMajorPC = (majorRootPC + 7) % 12;
  if (chords.some((c) => c.quality === 'dominant7' && rootToPitchClass(c.root) === v7OfMajorPC)) {
    // Check if the V7 is immediately followed by the major tonic
    for (let i = 0; i < chords.length - 1; i++) {
      try {
        if (
          chords[i].quality === 'dominant7' &&
          rootToPitchClass(chords[i].root) === v7OfMajorPC &&
          rootToPitchClass(chords[i + 1].root) === majorRootPC &&
          chords[i + 1].quality === 'major'
        ) return major;
      } catch { /* skip */ }
    }
  }

  // 2. Major IV → minor i (dorian plagal cadence)
  const ivPC = (dorianRootPC + 5) % 12; // perfect 4th above dorian root
  for (let i = 0; i < chords.length - 1; i++) {
    try {
      if (
        rootToPitchClass(chords[i].root) === ivPC &&
        chords[i].quality === 'major' &&
        rootToPitchClass(chords[i + 1].root) === dorianRootPC &&
        chords[i + 1].quality === 'minor'
      ) return dorian;
    } catch { /* skip */ }
  }

  // 3. Last chord quality
  const last = chords[chords.length - 1];
  try {
    const lastPC = rootToPitchClass(last.root);
    if (lastPC === dorianRootPC && last.quality === 'minor') return dorian;
    if (lastPC === majorRootPC && last.quality === 'major') return major;
  } catch { /* skip */ }

  // 4. First chord quality
  const first = chords[0];
  try {
    const firstPC = rootToPitchClass(first.root);
    if (firstPC === dorianRootPC && first.quality === 'minor') return dorian;
    if (firstPC === majorRootPC && first.quality === 'major') return major;
  } catch { /* skip */ }

  // 5. Default to relative major
  return major;
}
```

**Wire the tiebreaker into `detectKey`:** after the existing F#/Gb enharmonic block, add a block
that checks whether `bestKey` is a dorian key whose relative major scored equally, and vice versa —
whether `bestKey` is a major key whose 2nd-degree dorian scored equally:

```ts
// Handle dorian/relative-major tiebreak
if (getKeyMode(bestKey) === 'dorian') {
  const relMajor = KEYS[bestKey]?.relative;
  if (relMajor && scores.get(relMajor) === maxScore) {
    bestKey = breakDorianMajorTie(bestKey, relMajor, chords);
  }
} else if (getKeyMode(bestKey) === 'major') {
  // Check if any dorian whose relative is this major key tied
  const dorianKey = Object.keys(KEYS).find(
    (k) => getKeyMode(k) === 'dorian' && KEYS[k].relative === bestKey && scores.get(k) === maxScore
  );
  if (dorianKey) {
    bestKey = breakDorianMajorTie(dorianKey, bestKey, chords);
  }
}
```

### `harmonicAnalysis.ts`

**Update `buildKeyMaps`** to include dorian keys in a `dorianByPC` map (alongside `majorByPC` and
`minorByPC`). This is used by `resolveKey` to find the right key name for a resolved tonic.

**Update `resolveKey`** to handle dorian resolution. A V7 → i motion in a dorian context would
still resolve to a minor key (since the dorian tonic IS minor). So `resolveKey(tonicPC, true)`
could return either a harmonic minor key or a dorian key. For now, the default is harmonic minor
(current behaviour); returning a dorian key would require knowing the home key context to prefer
dorian's relative spelling. This is a known limitation: harmonic analysis will label tonicisations
to dorian centres as their harmonic minor equivalent. Acceptable for v1.

**Add the dorian plagal cadence as a pattern** (optional for v1, but valuable):

The pattern `IV → i` in dorian context (major chord a perfect 4th above a minor tonic) is
characteristic but is not a functional V7 resolution. It should be recognised to set `currentKey`
correctly for the IV chord:

```
Pattern: chord at interval +5 from tonic root, quality major → next chord at tonic root, quality minor
Assignment: both chords get currentKey = dorianKey
```

This is weaker than 2-5-1 / 5-1 (it's a 2-chord pattern with no dominant), so it should be added
after the existing patterns and only fire when the home key is already identified as dorian.

### `circleOfFifthsDistance`

The `getPosition` helper currently maps minor keys to their relative major (handling the 0-step
relationship). Extend it to handle dorian the same way — dorian keys also map to their relative
major for distance computation:

```ts
const getPosition = (key: string): number => {
  const mode = getKeyMode(key);
  const majorKey =
    mode === 'minor' && KEYS[key]?.relative ? KEYS[key].relative! :
    mode === 'dorian' && KEYS[key]?.relative ? KEYS[key].relative! :
    key;
  ...
};
```

---

## Ambiguous case: Drunken Sailor (Dm + C only)

`Dm C` is genuinely ambiguous among: D dorian, D aeolian, F major, Bb major.

- D dorian: i and bVII — consistent, weak evidence
- D aeolian: same chords, same ambiguity
- F major: VII and VI — less likely as a resting key
- Bb major: III and II — even less likely

With no IV chord present, dorian vs aeolian cannot be distinguished from chords alone. In this
case, the declared `key: D dorian` in frontmatter must be respected — and after this change it
will be, because `detectKey` preserves any declared key that scores > 0 against the chords.

---

## Test cases

### Key detection

```
Input: [Em, G, D, A] declared key: 'E dorian'
Expected: 'E dorian'
Rationale: A contains C#, diatonic to E dorian; declared key has diatonic overlap → preserved
```

```
Input: [Bm, A, E] declared key: 'B dorian'
Expected: 'B dorian'
Rationale: E contains G#, diatonic to B dorian only (not B harmonic minor, not A major)
```

```
Input: [Bm, A, E] (no declared key)
Expected: 'B dorian'
Rationale: E major scores 2 points for B dorian (diatonic root + quality match for IV)
           but only 0 for B harmonic minor (G# not in scale) — scoring distinguishes them
```

```
Input: [Em, G, D, A] (no declared key)
Expected: 'E dorian'
Rationale: A major (with C#) is diatonic to E dorian; breakDorianMajorTie fires vs D major
           because the A→Em motion is a IV→i dorian plagal cadence
```

```
Input: [C, Em, Am, G] (no declared key)
Expected: 'C' (major)
Rationale: D dorian and C major tie on notes; G→C is V→I in C major; dorian tiebreaker
           finds no IV→i, and last chord (G) is major → C major wins
```

```
Input: [Dm, C] declared key: 'D dorian'
Expected: 'D dorian'
Rationale: Both Dm and C are diatonic to D dorian (score > 0) → declared key preserved
```

### Normalisation

```
Input:  | Bm | A | E |   key: B dorian
Output: | Bm | A | E |
Notes:  E contains G# (diatonic to B dorian); no respelling needed
```

```
Input:  | Bm | A | E |   (no declared key, auto-detected as B dorian)
Output: | Bm | A | E |
```

### Harmonic analysis (dorian plagal cadence)

```
Input:  [Am, G, D, Am]  homeKey: A dorian
Pattern: D (IV of A dorian) → Am (i) is a dorian plagal cadence
Result:
  Am → currentKey: A dorian
  G  → currentKey: A dorian (bVII, diatonic)
  D  → currentKey: A dorian (IV, diatonic)
  Am → currentKey: A dorian
```

---

## Implementation order

1. **Add `getKeyMode` and `getKeyRoot` helpers** to `keys.ts`; update all existing call sites
   (`key.endsWith('m')` → `getKeyMode(key) === 'minor'`, etc.)
2. **Add dorian entries to `KEYS`** (12 keys listed above)
3. **Update `buildKeyScoreMap`** in `keyDetector.ts` to use the new helpers and add dorian intervals
4. **Update `buildKeyMaps`** in `harmonicAnalysis.ts` to include dorianByPC
5. **Add `breakDorianMajorTie`** and wire it into `detectKey`
6. **Update `circleOfFifthsDistance`** to handle dorian mode
7. **Add dorian plagal cadence pattern** to `analyseHarmony` (fires only when homeKey is dorian)
8. Drive each step with the test cases above before moving on

---

## Out of scope for this plan

- **Natural minor / aeolian**: overlaps with dorian (same bVII chord) but has a minor iv instead
  of major IV. Should be added as the next mode after dorian, using the same helper-function
  infrastructure established here.
- **Mixolydian**: mode on degree 5 of major; major tonic with b7. Similar scope to dorian.
- **Phrygian, Lydian**: less common in popular music; defer.
- **Dorian enharmonic pairs**: e.g. `C# dorian` / `Db dorian`. As with the major/minor keys,
  these can be added later if needed.
- **`transposeSong` to a dorian target key**: `transposeSongToKey(song, 'D dorian')` currently
  looks up the tonic note in `KEYS[targetKey]?.notes[0]`. Once dorian keys are in KEYS this will
  work automatically. No extra work required.
- **CLI `--key` flag with dorian argument**: already works if the value matches a KEYS entry.
  Document in `cli.md` once the keys are added.
