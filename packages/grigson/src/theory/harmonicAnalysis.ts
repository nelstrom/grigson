import { KEYS } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';
import type { Chord } from '../parser/types.js';

export interface AnnotatedChord {
  chord: Chord;
  homeKey: string;
  currentKey: string;
  currentKeyCandidates: string[];
}

// Build lookup maps: pitch class → key name (major and minor separately)
function buildKeyMaps(): { majorByPC: Map<number, string>; minorByPC: Map<number, string> } {
  const majorByPC = new Map<number, string>();
  const minorByPC = new Map<number, string>();

  for (const key of Object.keys(KEYS)) {
    const isMinor = key.endsWith('m');
    const rootName = isMinor ? key.slice(0, -1) : key;
    let pc: number;
    try {
      pc = rootToPitchClass(rootName);
    } catch {
      continue;
    }
    if (isMinor) {
      if (!minorByPC.has(pc)) minorByPC.set(pc, key);
    } else {
      if (!majorByPC.has(pc)) {
        majorByPC.set(pc, key);
      } else if (key === 'Gb') {
        // Prefer flat-side: Gb overrides F# for pitch class 6
        majorByPC.set(pc, 'Gb');
      }
    }
  }
  return { majorByPC, minorByPC };
}

const { majorByPC: MAJOR_BY_PC, minorByPC: MINOR_BY_PC } = buildKeyMaps();

function getPC(chord: Chord): number | null {
  try {
    return rootToPitchClass(chord.root);
  } catch {
    return null;
  }
}

function resolveKey(tonicPC: number, iChordIsMinor: boolean): string | null {
  return iChordIsMinor ? (MINOR_BY_PC.get(tonicPC) ?? null) : (MAJOR_BY_PC.get(tonicPC) ?? null);
}

function annotate(
  chord: Chord,
  homeKey: string,
  currentKey: string,
): AnnotatedChord {
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

  while (i < chords.length) {
    const chord = chords[i];
    const pc = getPC(chord);

    // Try 2-5-1 pattern: ii (minor/halfDim) → V7 (dom7) → I
    if (
      pc !== null &&
      (chord.quality === 'minor' || chord.quality === 'halfDiminished') &&
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
        const iIsMinor = iChord.quality === 'minor' || iChord.quality === 'halfDiminished';
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
        const iIsMinor = iChord.quality === 'minor' || iChord.quality === 'halfDiminished';
        const resolvedKey = resolveKey(iPC, iIsMinor) ?? homeKey;
        result.push(annotate(chord, homeKey, resolvedKey));
        result.push(annotate(iChord, homeKey, resolvedKey));
        i += 2;
        continue;
      }
    }

    // No pattern matched — assign home key
    result.push(annotate(chord, homeKey, homeKey));
    i += 1;
  }

  return result;
}
