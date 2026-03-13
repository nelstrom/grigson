import { Chord, Song } from '../parser/types.js';
import { rootToPitchClass, PitchClass } from './pitchClass.js';
import { KEYS } from './keys.js';
import { detectKey } from './keyDetector.js';

export interface TransposeOptions {
  accidentals?: 'sharps' | 'flats';
  toKey?: string;
}

const SHARP_NAMES: Record<number, string> = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F', 6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
};

const FLAT_NAMES: Record<number, string> = {
  0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F', 6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
};

export function transposeChord(chord: Chord, semitones: number, options: TransposeOptions = {}): Chord {
  const currentPc = rootToPitchClass(chord.root);
  const nextPc = (((currentPc + semitones) % 12) + 12) % 12 as PitchClass;

  let newRoot: string | undefined;

  // 1. Try target key diatonic spelling
  if (options.toKey) {
    const keyInfo = KEYS[options.toKey];
    if (keyInfo) {
      for (const diatonicRoot of keyInfo.notes) {
        if (rootToPitchClass(diatonicRoot) === nextPc) {
          newRoot = diatonicRoot;
          break;
        }
      }
    }
  }

  // 2. Fall back to preferred accidentals
  if (!newRoot) {
    const names = options.accidentals === 'sharps' ? SHARP_NAMES : FLAT_NAMES;
    newRoot = names[nextPc];
  }

  return {
    ...chord,
    root: newRoot
  };
}

export function transposeSong(song: Song, interval: { semitones?: number, toKey?: string }): Song {
  let semitones = interval.semitones ?? 0;
  let targetKey: string | undefined = interval.toKey;

  // Determine source key
  const sourceKey = song.key ?? detectKey(song.rows.flatMap(r => r.bars.map(b => b.chord))) ?? 'C';

  if (interval.toKey) {
    const sourcePc = rootToPitchClass(sourceKey.replace(/m$/, ''));
    const targetPc = rootToPitchClass(interval.toKey.replace(/m$/, ''));
    semitones = (((targetPc - sourcePc) % 12) + 12) % 12;
  } else if (interval.semitones !== undefined) {
    const sourcePc = rootToPitchClass(sourceKey.replace(/m$/, ''));
    const targetPc = (((sourcePc + interval.semitones) % 12) + 12) % 12 as PitchClass;
    
    // Pick target key name based on interval.semitones and sourceKey
    const names = sourceKey.includes('#') || sourceKey.includes('E') || sourceKey.includes('B') ? SHARP_NAMES : FLAT_NAMES;
    targetKey = names[targetPc];
    if (sourceKey.endsWith('m')) {
      targetKey += 'm';
    }
  }

  const transposedRows = song.rows.map(row => ({
    ...row,
    bars: row.bars.map(bar => ({
      ...bar,
      chord: transposeChord(bar.chord, semitones, { toKey: targetKey })
    }))
  }));

  return {
    ...song,
    key: targetKey ?? song.key,
    rows: transposedRows
  };
}
