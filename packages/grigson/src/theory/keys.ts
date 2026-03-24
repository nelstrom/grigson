import { rootToPitchClass } from './pitchClass.js';

export type ScaleFamily = 'major' | 'harmonic_minor';

export interface KeyInfo {
  notes: ReadonlyArray<string>;
  scaleFamily: ScaleFamily;
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  parent: string; // root note of the scale family (e.g. 'C' for C-major family)
}

export type KeyMode = 'major' | 'minor' | 'dorian' | 'aeolian' | 'mixolydian';

export function getKeyMode(key: string): KeyMode {
  if (key.endsWith(' dorian')) return 'dorian';
  if (key.endsWith(' aeolian')) return 'aeolian';
  if (key.endsWith(' mixolydian')) return 'mixolydian';
  if (key.endsWith(' major')) return 'major';
  if (key.endsWith(' minor')) return 'minor';
  if (key.endsWith('m')) return 'minor';
  return 'major';
}

export function getKeyRoot(key: string): string {
  if (key.endsWith(' dorian')) return key.slice(0, -7);
  if (key.endsWith(' aeolian')) return key.slice(0, -8);
  if (key.endsWith(' mixolydian')) return key.slice(0, -11);
  if (key.endsWith(' major')) return key.slice(0, -6);
  if (key.endsWith(' minor')) return key.slice(0, -6);
  if (key.endsWith('m')) return key.slice(0, -1);
  return key;
}

/**
 * Converts a canonical key string (e.g. 'C major', 'A minor') to the
 * short KEYS-object key (e.g. 'C', 'Am'). Leaves modal keys unchanged.
 * Safe to call with already-short keys.
 */
export function resolveKey(key: string): string {
  if (key.endsWith(' major')) return key.slice(0, -6);
  if (key.endsWith(' minor')) return key.slice(0, -6) + 'm';
  return key;
}

export const KEYS: Readonly<Record<string, KeyInfo>> = {
  // Major keys (scaleFamily: 'major', degree: 1, parent = key root)
  C: { notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], scaleFamily: 'major', degree: 1, parent: 'C' },
  G: { notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'], scaleFamily: 'major', degree: 1, parent: 'G' },
  D: { notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'], scaleFamily: 'major', degree: 1, parent: 'D' },
  A: {
    notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'A',
  },
  E: {
    notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'E',
  },
  B: {
    notes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'B',
  },
  'F#': {
    notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'F#',
  },
  Gb: {
    notes: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'Gb',
  },
  Db: {
    notes: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'Db',
  },
  Ab: {
    notes: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'Ab',
  },
  Eb: {
    notes: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'Eb',
  },
  Bb: {
    notes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    scaleFamily: 'major',
    degree: 1,
    parent: 'Bb',
  },
  F: { notes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], scaleFamily: 'major', degree: 1, parent: 'F' },
  // Harmonic minor keys (scaleFamily: 'harmonic_minor', degree: 1, parent = root note)
  Am: {
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'A',
  },
  Em: {
    notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'E',
  },
  Bm: {
    notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A#'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'B',
  },
  'F#m': {
    notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E#'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'F#',
  },
  'C#m': {
    notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B#'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'C#',
  },
  Dm: {
    notes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C#'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'D',
  },
  Gm: {
    notes: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F#'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'G',
  },
  Cm: {
    notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'C',
  },
  Fm: {
    notes: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'E'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'F',
  },
  Bbm: {
    notes: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'A'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'Bb',
  },
  Abm: {
    notes: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'G'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'Ab',
  },
  'G#m': {
    notes: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'G'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'G#',
  },
  Ebm: {
    notes: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'D'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'Eb',
  },
  'D#m': {
    notes: ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'D'],
    scaleFamily: 'harmonic_minor',
    degree: 1,
    parent: 'D#',
  },
  // Aeolian mode (scaleFamily: 'major', degree: 6, parent = major key 3 semitones above root)
  'A aeolian': {
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'C',
  },
  'E aeolian': {
    notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'G',
  },
  'B aeolian': {
    notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'D',
  },
  'F# aeolian': {
    notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'A',
  },
  'C# aeolian': {
    notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'E',
  },
  'G# aeolian': {
    notes: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'B',
  },
  'D aeolian': {
    notes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'F',
  },
  'G aeolian': {
    notes: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'Bb',
  },
  'C aeolian': {
    notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'Eb',
  },
  'F aeolian': {
    notes: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'Ab',
  },
  'Bb aeolian': {
    notes: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'Db',
  },
  'Eb aeolian': {
    notes: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],
    scaleFamily: 'major',
    degree: 6,
    parent: 'Gb',
  },
  // Mixolydian mode (scaleFamily: 'major', degree: 5, parent = major key 5 semitones above root)
  'G mixolydian': {
    notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'C',
  },
  'D mixolydian': {
    notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'G',
  },
  'A mixolydian': {
    notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'D',
  },
  'E mixolydian': {
    notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'A',
  },
  'B mixolydian': {
    notes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'E',
  },
  'F# mixolydian': {
    notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'B',
  },
  'C mixolydian': {
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'F',
  },
  'F mixolydian': {
    notes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'Eb'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'Bb',
  },
  'Bb mixolydian': {
    notes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'Ab'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'Eb',
  },
  'Eb mixolydian': {
    notes: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'Db'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'Ab',
  },
  'Ab mixolydian': {
    notes: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'Gb'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'Db',
  },
  'Db mixolydian': {
    notes: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb'],
    scaleFamily: 'major',
    degree: 5,
    parent: 'Gb',
  },
  // Dorian mode (scaleFamily: 'major', degree: 2, parent = major key a whole step below root)
  'C dorian': {
    notes: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'Bb',
  },
  'D dorian': {
    notes: ['D', 'E', 'F', 'G', 'A', 'B', 'C'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'C',
  },
  'E dorian': {
    notes: ['E', 'F#', 'G', 'A', 'B', 'C#', 'D'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'D',
  },
  'F dorian': {
    notes: ['F', 'G', 'Ab', 'Bb', 'C', 'D', 'Eb'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'Eb',
  },
  'G dorian': {
    notes: ['G', 'A', 'Bb', 'C', 'D', 'E', 'F'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'F',
  },
  'A dorian': {
    notes: ['A', 'B', 'C', 'D', 'E', 'F#', 'G'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'G',
  },
  'B dorian': {
    notes: ['B', 'C#', 'D', 'E', 'F#', 'G#', 'A'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'A',
  },
  'Bb dorian': {
    notes: ['Bb', 'C', 'Db', 'Eb', 'F', 'G', 'Ab'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'Ab',
  },
  'Eb dorian': {
    notes: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'C', 'Db'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'Db',
  },
  'F# dorian': {
    notes: ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'E'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'E',
  },
  'Ab dorian': {
    notes: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F', 'Gb'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'Gb',
  },
  'C# dorian': {
    notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B'],
    scaleFamily: 'major',
    degree: 2,
    parent: 'B',
  },
};

export function diatonicNotes(key: string): ReadonlySet<string> {
  const info = KEYS[resolveKey(key)];
  if (!info) {
    throw new Error(`Unknown key: ${key}`);
  }
  return new Set(info.notes);
}

/**
 * Returns all keys in KEYS that belong to the same scale family
 * (same parent root + same scaleFamily).
 */
export function getSiblingModes(key: string): string[] {
  const info = KEYS[resolveKey(key)];
  if (!info) return [];
  return Object.keys(KEYS).filter(
    (k) => KEYS[k].parent === info.parent && KEYS[k].scaleFamily === info.scaleFamily,
  );
}

/**
 * Maps any key to its ionian (major) sibling:
 * - major key (degree 1): returns itself
 * - dorian or other major-scale modes: returns the degree-1 entry with the same parent
 * - harmonic_minor: returns the major key whose root is a minor third (3 semitones) above
 */
export function getRelativeMajor(key: string): string | undefined {
  const info = KEYS[resolveKey(key)];
  if (!info) return undefined;

  if (info.scaleFamily === 'major') {
    if (info.degree === 1) return key;
    // Find the degree-1 key in the same major scale family
    return Object.keys(KEYS).find(
      (k) =>
        KEYS[k].scaleFamily === 'major' && KEYS[k].degree === 1 && KEYS[k].parent === info.parent,
    );
  }

  // harmonic_minor: relative major root is 3 semitones above the minor root
  const root = getKeyRoot(key);
  let rootPC: number;
  try {
    rootPC = rootToPitchClass(root);
  } catch {
    return undefined;
  }
  const relativeMajorPC = (rootPC + 3) % 12;
  const candidates = Object.keys(KEYS).filter((k) => {
    const kInfo = KEYS[k];
    if (kInfo.scaleFamily !== 'major' || kInfo.degree !== 1) return false;
    try {
      return rootToPitchClass(kInfo.parent) === relativeMajorPC;
    } catch {
      return false;
    }
  });
  if (candidates.length === 1) return candidates[0];
  // Enharmonic ambiguity (e.g. F#/Gb): prefer the key whose root appears in the minor key's notes
  const minorNotes = info.notes;
  return candidates.find((k) => minorNotes.includes(KEYS[k].parent)) ?? candidates[0];
}
