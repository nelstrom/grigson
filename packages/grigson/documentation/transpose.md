# Transposition

The `transpose` module shifts every chord in a song by a given number of semitones, then delegates all enharmonic spelling to the normalisation layer so that the output always uses conventional note names.

## API

### `transposeSection(chords: Chord[], semitones: number): Chord[]`

Shifts each chord root's pitch class by `semitones` (mod 12), preserving chord quality. Enharmonic spelling is handled entirely by `normaliseSection` — no spelling logic lives in this function.

```ts
import { transposeSection } from 'grigson';

const chords = [ch('C'), ch('F'), ch('G'), ch('A', 'minor')];
transposeSection(chords, 7);
// → [{ root: 'G' }, { root: 'C' }, { root: 'D' }, { root: 'E', quality: 'minor' }]
```

### `transposeSong(song: Song, semitones: number): Song`

Applies `transposeSection` to each section independently and updates the front-matter `key` field to the home key of the first transposed section. Returns a new `Song`; the input is not mutated.

```ts
import { parseSong, transposeSong, TextRenderer } from 'grigson';

const song = parseSong(`
---
key: C
---
| C | F | G | Am |
`);

const transposed = transposeSong(song, 7); // up a perfect fifth → G major
console.log(new TextRenderer().render(transposed));
// ---
// key: G
// ---
// | G | C | D | Em |
```

### `transposeSongToKey(song: Song, targetKey: string): Song`

Computes the semitone interval from the detected home key of the first section to `targetKey`, then calls `transposeSong`. Equivalent to computing the interval yourself and calling `transposeSong`.

```ts
import { parseSong, transposeSongToKey, TextRenderer } from 'grigson';

const song = parseSong('| C | F | G | Am |');
const inG = transposeSongToKey(song, 'G');
// same result as transposeSong(song, 7)
```

## Custom element attributes

The `<grigson-chart>` custom element supports two transposition attributes:

| Attribute            | Effect                                               |
|----------------------|------------------------------------------------------|
| `transpose-key`      | Transposes to the named key (e.g. `transpose-key="G"`) |
| `transpose-semitones`| Transposes by the given number of semitones (integer) |

```html
<grigson-chart transpose-key="Bb">
  <template>| C | F | G | Am |</template>
</grigson-chart>

<grigson-chart transpose-semitones="-2">
  <template>| D | G | A | Bm |</template>
</grigson-chart>
```

If both attributes are present, `transpose-key` takes precedence. Transposition is applied after normalisation (if the `normalise` attribute is also set).

## Spelling guarantees

- Diatonic chord roots are spelled according to the target key (e.g. transposing C major up 7 gives G major; F# appears as F#, not Gb).
- Borrowed / non-diatonic chord roots are spelled according to harmonic analysis (circle-of-fifths fallback), matching the behaviour of `normaliseSong`.
- Intermediate pitch-class values are always expressed as flat-side spellings before normalisation, so the normaliser starts from a consistent baseline regardless of the source spelling.
