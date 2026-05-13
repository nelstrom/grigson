import type { Song, Section, Row, Bar, Chord, ChordCell } from '../parser/types.js';
import { rootToPitchClass } from './pitchClass.js';
import { normaliseSection, toCanonicalKey } from './normalise.js';
import { detectKey } from './keyDetector.js';
import { KEYS, getKeyMode, getKeyRoot, resolveKey } from './keys.js';

// Flat-side chromatic scale used as a neutral intermediate spelling before normalisation
const PC_TO_FLAT: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

function shiftChord(chord: Chord, semitones: number): Chord {
  let pc: number;
  try {
    pc = rootToPitchClass(chord.root);
  } catch {
    return chord;
  }
  const newPC = (((pc + semitones) % 12) + 12) % 12;
  const shifted: Chord = { ...chord, root: PC_TO_FLAT[newPC] };
  if (chord.bass !== undefined) {
    try {
      const bassPC = rootToPitchClass(chord.bass);
      const newBassPC = (((bassPC + semitones) % 12) + 12) % 12;
      shifted.bass = PC_TO_FLAT[newBassPC];
    } catch {
      // leave bass unchanged if unrecognised
    }
  }
  return shifted;
}

// Shift a key string (e.g. "C major", "F# minor") by semitones, preserving the mode suffix and
// choosing the enharmonic spelling that matches how chord normalisation spells notes when key
// detection fails: flat-side first, falling back to the KEYS table for sharp-canonical keys.
function shiftKeyString(key: string, semitones: number): string {
  const tonic = getKeyRoot(key);
  const modeSuffix = key.slice(tonic.length); // e.g. ' major', ' minor', ' dorian'
  const mode = getKeyMode(key);
  try {
    const pc = rootToPitchClass(tonic);
    const targetPC = (((pc + semitones) % 12) + 12) % 12;
    // Prefer the flat-side spelling when it is a valid canonical key — this matches the default
    // chord spelling used by normaliseSection when key detection fails, keeping the key
    // declaration consistent with the chart (e.g. both "Gb major" rather than "F# major" / Gb).
    const flatTonic = PC_TO_FLAT[targetPC];
    if (KEYS[resolveKey(flatTonic + modeSuffix)]) {
      return flatTonic + modeSuffix;
    }
    // Flat side is not canonical for this mode/PC (e.g. Ab minor vs G# minor) — find the
    // sharp-side entry in KEYS.
    for (const [shortKey, info] of Object.entries(KEYS)) {
      if (getKeyMode(shortKey) !== mode) continue;
      try {
        if (rootToPitchClass(info.notes[0]) === targetPC) {
          return info.notes[0] + modeSuffix;
        }
      } catch {
        continue;
      }
    }
    return flatTonic + modeSuffix;
  } catch {
    return key;
  }
}

function transposeSectionInternal(
  chords: Chord[],
  semitones: number,
): { chords: Chord[]; homeKey: string | null } {
  const shifted = chords.map((chord) => shiftChord(chord, semitones));
  return normaliseSection(shifted);
}

/**
 * Shift each chord root by `semitones` (positive = up, negative = down) and re-normalise
 * enharmonic spelling. Returns a new array; does not mutate input.
 *
 * @example
 * ```typescript
 * import { transposeSection } from 'grigson';
 *
 * const chords = [
 *   { type: 'chord', root: 'C', quality: 'major' },
 *   { type: 'chord', root: 'F', quality: 'major' },
 *   { type: 'chord', root: 'G', quality: 'dominant7' },
 *   { type: 'chord', root: 'A', quality: 'minor' },
 * ] as Chord[];
 *
 * const up7 = transposeSection(chords, 7);
 * // → roots: ['G', 'C', 'D', 'E']  (C major → G major, up a perfect fifth)
 * ```
 */
export function transposeSection(chords: Chord[], semitones: number): Chord[] {
  return transposeSectionInternal(chords, semitones).chords;
}

/**
 * Transpose all sections of a song and update the front-matter key to the home key of the first
 * transposed section. Returns a new `Song`; does not mutate.
 *
 * @example
 * ```typescript
 * import { parseSong, transposeSong, TextRenderer } from 'grigson';
 *
 * const song = parseSong(`
 * ---
 * key: C major
 * ---
 * | C | F | G | Am |
 * `);
 *
 * const inG = transposeSong(song, 7); // up a perfect fifth → G major
 * console.log(new TextRenderer().render(inG));
 * // ---
 * // key: G major
 * // ---
 * // | G | C | D | Em |
 * ```
 */
export function transposeSong(song: Song, semitones: number): Song {
  let firstSectionKey: string | null = null;

  const newSections: Section[] = song.sections.map((sec, secIndex) => {
    const chords = sec.rows.flatMap((row) =>
      row.bars.flatMap((bar) =>
        bar.cells.filter((s): s is ChordCell => s.type === 'chord').map((s) => s.chord),
      ),
    );
    const { chords: transposedChords, homeKey } = transposeSectionInternal(chords, semitones);

    if (secIndex === 0) {
      firstSectionKey = homeKey;
    }

    let chordIndex = 0;
    const newRows: Row[] = sec.rows.map((row) => ({
      ...row,
      bars: row.bars.map(
        (bar): Bar => ({
          ...bar,
          cells: bar.cells.map((cell) =>
            cell.type === 'chord'
              ? { type: 'chord' as const, chord: transposedChords[chordIndex++] }
              : cell,
          ),
        }),
      ),
    }));

    let rowIdx = 0;
    const newContent = (sec.content ?? sec.rows).map((item) =>
      item.type === 'row' ? newRows[rowIdx++] : item,
    );

    return { ...sec, rows: newRows, content: newContent };
  });

  const detectedKey = toCanonicalKey(firstSectionKey);
  const transposedKey =
    detectedKey !== null
      ? detectedKey
      : song.key !== null
        ? shiftKeyString(song.key, semitones)
        : null;
  return { ...song, key: transposedKey, sections: newSections };
}

/**
 * Compute the semitone interval from the detected home tonic to `targetKey` (a tonic note name,
 * e.g. `'G'`, `'Bb'`), then call `transposeSong`. The mode of the song is preserved — only the
 * tonic shifts. Equivalent to computing the interval yourself and calling
 * `transposeSong(song, semitones)`.
 *
 * @example
 * ```typescript
 * import { parseSong, transposeSongToKey, TextRenderer } from 'grigson';
 *
 * const song = parseSong('| C | F | G | Am |');
 *
 * // Shift tonic to G (major mode preserved)
 * const inG = transposeSongToKey(song, 'G');
 * console.log(new TextRenderer().render(inG));
 * // | G | C | D | Em |
 *
 * // Common use case: Bb instrument part (sounds a major 2nd lower, so write up 2 semitones)
 * const bbPart = transposeSongToKey(song, 'D');
 * // | D | G | A | Bm |
 * ```
 */
export function transposeSongToKey(song: Song, targetKey: string): Song {
  const firstSectionChords =
    song.sections[0]?.rows.flatMap((row) =>
      row.bars.flatMap((bar) =>
        bar.cells.filter((s): s is ChordCell => s.type === 'chord').map((s) => s.chord),
      ),
    ) ?? [];
  const homeKey = detectKey(firstSectionChords, song.key) ?? 'C';

  const homeTonicNote = KEYS[resolveKey(homeKey)]?.notes[0] ?? getKeyRoot(homeKey);
  const targetTonicNote = KEYS[resolveKey(targetKey)]?.notes[0] ?? getKeyRoot(targetKey);

  const homeTonicPC = rootToPitchClass(homeTonicNote);
  const targetTonicPC = rootToPitchClass(targetTonicNote);
  const semitones = (targetTonicPC - homeTonicPC + 12) % 12;

  return transposeSong(song, semitones);
}
