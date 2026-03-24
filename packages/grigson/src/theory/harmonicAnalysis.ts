import { KEYS, diatonicNotes, getKeyMode, getKeyRoot, getRelativeMajor } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';
import type { Chord } from '../parser/types.js';

// Circle-of-fifths positions indexed by major key root pitch class
const COF_POSITIONS: Readonly<Record<number, number>> = {
  0: 0, // C
  7: 1, // G
  2: 2, // D
  9: 3, // A
  4: 4, // E
  11: 5, // B
  6: 6, // F#/Gb
  1: 7, // Db/C#
  8: 8, // Ab/G#
  3: 9, // Eb/D#
  10: 10, // Bb/A#
  5: 11, // F
};

/**
 * Returns the circle-of-fifths distance between two keys.
 * Minor keys are mapped to their relative major before computing distance,
 * so relative major/minor pairs have distance 0 from each other.
 */
export function circleOfFifthsDistance(keyA: string, keyB: string): number {
  const getPosition = (key: string): number => {
    const majorKey = getRelativeMajor(key) ?? key;
    const root = getKeyRoot(majorKey);
    let pc: number;
    try {
      pc = rootToPitchClass(root);
    } catch {
      return -1;
    }
    const pos = COF_POSITIONS[pc];
    return pos !== undefined ? pos : -1;
  };

  const posA = getPosition(keyA);
  const posB = getPosition(keyB);
  if (posA === -1 || posB === -1) return Infinity;

  const diff = Math.abs(posA - posB);
  return Math.min(diff, 12 - diff);
}

export interface AnnotatedChord {
  chord: Chord;
  homeKey: string;
  currentKey: string;
  currentKeyCandidates: string[];
}

// Build lookup maps: pitch class → key name (major, minor, dorian, aeolian, mixolydian separately)
function buildKeyMaps(): {
  majorByPC: Map<number, string>;
  minorByPC: Map<number, string>;
  dorianByPC: Map<number, string>;
  aeolianByPC: Map<number, string>;
  mixolydianByPC: Map<number, string>;
} {
  const majorByPC = new Map<number, string>();
  const minorByPC = new Map<number, string>();
  const dorianByPC = new Map<number, string>();
  const aeolianByPC = new Map<number, string>();
  const mixolydianByPC = new Map<number, string>();

  for (const key of Object.keys(KEYS)) {
    const mode = getKeyMode(key);
    const rootName = getKeyRoot(key);
    let pc: number;
    try {
      pc = rootToPitchClass(rootName);
    } catch {
      continue;
    }
    if (mode === 'minor') {
      if (!minorByPC.has(pc)) minorByPC.set(pc, key);
    } else if (mode === 'dorian') {
      if (!dorianByPC.has(pc)) dorianByPC.set(pc, key);
    } else if (mode === 'aeolian') {
      if (!aeolianByPC.has(pc)) aeolianByPC.set(pc, key);
    } else if (mode === 'mixolydian') {
      if (!mixolydianByPC.has(pc)) mixolydianByPC.set(pc, key);
    } else {
      if (!majorByPC.has(pc)) {
        majorByPC.set(pc, key);
      } else if (key === 'Gb') {
        // Prefer flat-side: Gb overrides F# for pitch class 6
        majorByPC.set(pc, 'Gb');
      }
    }
  }
  return { majorByPC, minorByPC, dorianByPC, aeolianByPC, mixolydianByPC };
}

const {
  majorByPC: MAJOR_BY_PC,
  minorByPC: MINOR_BY_PC,
  dorianByPC: DORIAN_BY_PC,
  aeolianByPC: AEOLIAN_BY_PC,
  mixolydianByPC: MIXOLYDIAN_BY_PC,
} = buildKeyMaps();

export { MAJOR_BY_PC, MINOR_BY_PC, DORIAN_BY_PC, AEOLIAN_BY_PC, MIXOLYDIAN_BY_PC };

function getPC(chord: Chord): number | null {
  try {
    return rootToPitchClass(chord.root);
  } catch {
    return null;
  }
}

function resolveKey(tonicPC: number, iChordIsMinor: boolean): string | null {
  if (iChordIsMinor) {
    return MINOR_BY_PC.get(tonicPC) ?? DORIAN_BY_PC.get(tonicPC) ?? null;
  }
  return MAJOR_BY_PC.get(tonicPC) ?? null;
}

function annotate(chord: Chord, homeKey: string, currentKey: string): AnnotatedChord {
  return { chord, homeKey, currentKey, currentKeyCandidates: [currentKey] };
}

/**
 * Analyses a chord sequence and annotates each chord with its home key and
 * inferred current key based on 2-5-1 and 5-1 harmonic patterns.
 *
 * Pattern priority (highest first):
 *   1. 2-5-1: minor/half-diminished ii, followed by dom7 V a 4th above, followed by tonic I a
 *      5th below the V7. All three chords are assigned the resolved tonic key.
 *   2. 5-1: dom7 V followed by a tonic I a 5th below. Both chords are assigned the resolved tonic
 *      key.
 *
 * Unmatched chords receive currentKey = homeKey.
 */
export function analyseHarmony(chords: Chord[], homeKey: string): AnnotatedChord[] {
  const result: AnnotatedChord[] = [];
  let i = 0;

  // Pre-compute home key diatonic note set for borrowed-chord detection
  let homeNotes: ReadonlySet<string>;
  try {
    homeNotes = diatonicNotes(homeKey);
  } catch {
    homeNotes = new Set<string>();
  }

  while (i < chords.length) {
    const chord = chords[i];
    const pc = getPC(chord);

    // Try 2-5-1 pattern: ii (minor/halfDim) → V7 (dom7) → I
    if (
      pc !== null &&
      (chord.quality === 'minor' ||
        chord.quality === 'halfDiminished' ||
        chord.quality === 'min7' ||
        chord.quality === 'diminished') &&
      i + 2 < chords.length
    ) {
      const v7Chord = chords[i + 1];
      const iChord = chords[i + 2];
      const v7PC = getPC(v7Chord);
      const iPC = getPC(iChord);

      if (
        v7Chord.quality === 'dominant7' &&
        v7PC !== null &&
        iPC !== null &&
        (v7PC - pc + 12) % 12 === 5 && // V7 is a perfect 4th above ii
        (v7PC + 5) % 12 === iPC // I is a perfect 5th below V7
      ) {
        const iIsMinor =
          iChord.quality === 'minor' ||
          iChord.quality === 'halfDiminished' ||
          iChord.quality === 'min7';
        const resolvedKey = resolveKey(iPC, iIsMinor) ?? homeKey;
        result.push(annotate(chord, homeKey, resolvedKey));
        result.push(annotate(v7Chord, homeKey, resolvedKey));
        result.push(annotate(iChord, homeKey, resolvedKey));
        i += 3;
        continue;
      }
    }

    // Try 5-1 pattern: V7 (dom7) → I
    if (pc !== null && chord.quality === 'dominant7' && i + 1 < chords.length) {
      const iChord = chords[i + 1];
      const iPC = getPC(iChord);

      if (iPC !== null && (pc + 5) % 12 === iPC) {
        const iIsMinor =
          iChord.quality === 'minor' ||
          iChord.quality === 'halfDiminished' ||
          iChord.quality === 'min7';
        const resolvedKey = resolveKey(iPC, iIsMinor) ?? homeKey;
        result.push(annotate(chord, homeKey, resolvedKey));
        result.push(annotate(iChord, homeKey, resolvedKey));
        i += 2;
        continue;
      }
    }

    // Try dorian plagal cadence: IV (major) → i (minor) — only when homeKey is dorian
    if (
      pc !== null &&
      chord.quality === 'major' &&
      getKeyMode(homeKey) === 'dorian' &&
      i + 1 < chords.length
    ) {
      const tonicPC = rootToPitchClass(getKeyRoot(homeKey));
      const ivPC = (tonicPC + 5) % 12;

      if (pc === ivPC) {
        const iChord = chords[i + 1];
        const iPC = getPC(iChord);
        if (iPC !== null && iPC === tonicPC && iChord.quality === 'minor') {
          result.push(annotate(chord, homeKey, homeKey));
          result.push(annotate(iChord, homeKey, homeKey));
          i += 2;
          continue;
        }
      }
    }

    // Try aeolian bVII → i cadence: bVII (major) → i (minor) — only when homeKey is aeolian
    if (
      pc !== null &&
      chord.quality === 'major' &&
      getKeyMode(homeKey) === 'aeolian' &&
      i + 1 < chords.length
    ) {
      const tonicPC = rootToPitchClass(getKeyRoot(homeKey));
      const bVIIPC = (tonicPC + 10) % 12;

      if (pc === bVIIPC) {
        const iChord = chords[i + 1];
        const iPC = getPC(iChord);
        if (iPC !== null && iPC === tonicPC && iChord.quality === 'minor') {
          result.push(annotate(chord, homeKey, homeKey));
          result.push(annotate(iChord, homeKey, homeKey));
          i += 2;
          continue;
        }
      }
    }

    // Try mixolydian bVII → I cadence: bVII (major) → I (major) — only when homeKey is mixolydian
    if (
      pc !== null &&
      chord.quality === 'major' &&
      getKeyMode(homeKey) === 'mixolydian' &&
      i + 1 < chords.length
    ) {
      const tonicPC = rootToPitchClass(getKeyRoot(homeKey));
      const bVIIPC = (tonicPC + 10) % 12;

      if (pc === bVIIPC) {
        const iChord = chords[i + 1];
        const iPC = getPC(iChord);
        if (iPC !== null && iPC === tonicPC && iChord.quality === 'major') {
          result.push(annotate(chord, homeKey, homeKey));
          result.push(annotate(iChord, homeKey, homeKey));
          i += 2;
          continue;
        }
      }
    }

    // No pattern matched — check if chord is diatonic to homeKey
    if (pc !== null && !homeNotes.has(chord.root)) {
      // Non-diatonic borrowed chord: find closest key via circle of fifths
      const candidateKeys = Object.keys(KEYS).filter((key) => KEYS[key].notes.includes(chord.root));

      if (candidateKeys.length > 0) {
        candidateKeys.sort(
          (a, b) => circleOfFifthsDistance(homeKey, a) - circleOfFifthsDistance(homeKey, b),
        );
        const minDist = circleOfFifthsDistance(homeKey, candidateKeys[0]);
        const closestCandidates = candidateKeys.filter(
          (k) => circleOfFifthsDistance(homeKey, k) === minDist,
        );

        // Prefer the parallel minor of homeKey if it's among the closest candidates,
        // then fall back to preferring major keys over minor keys.
        let pickedKey: string;
        if (getKeyMode(homeKey) === 'major') {
          const parallelMinor = homeKey + 'm';
          if (closestCandidates.includes(parallelMinor)) {
            pickedKey = parallelMinor;
          } else {
            const majors = closestCandidates.filter((k) => getKeyMode(k) !== 'minor');
            pickedKey = majors.length > 0 ? majors[0] : closestCandidates[0];
          }
        } else {
          const majors = closestCandidates.filter((k) => getKeyMode(k) !== 'minor');
          pickedKey = majors.length > 0 ? majors[0] : closestCandidates[0];
        }

        result.push({
          chord,
          homeKey,
          currentKey: pickedKey,
          currentKeyCandidates: closestCandidates,
        });
        i += 1;
        continue;
      }
    }

    // Diatonic chord or unrecognised root — assign home key
    result.push(annotate(chord, homeKey, homeKey));
    i += 1;
  }

  return result;
}
