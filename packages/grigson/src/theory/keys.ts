export interface KeyInfo {
  notes: ReadonlyArray<string>;
  relative?: string;
}

export type KeyMode = 'major' | 'minor' | 'dorian';

export function getKeyMode(key: string): KeyMode {
  if (key.endsWith(' dorian')) return 'dorian';
  if (key.endsWith('m')) return 'minor';
  return 'major';
}

export function getKeyRoot(key: string): string {
  if (key.endsWith(' dorian')) return key.slice(0, -7);
  if (key.endsWith('m')) return key.slice(0, -1);
  return key;
}

export const KEYS: Readonly<Record<string, KeyInfo>> = {
  // Major keys
  C: { notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], relative: 'Am' },
  G: { notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'], relative: 'Em' },
  D: { notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'], relative: 'Bm' },
  A: { notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'], relative: 'F#m' },
  E: { notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'], relative: 'C#m' },
  B: { notes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  'F#': { notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
  Gb: { notes: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'] },
  Db: { notes: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'], relative: 'Bbm' },
  Ab: { notes: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'], relative: 'Fm' },
  Eb: { notes: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'], relative: 'Cm' },
  Bb: { notes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'], relative: 'Gm' },
  F: { notes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], relative: 'Dm' },
  // Harmonic minor keys (natural minor with raised 7th)
  Am: { notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'], relative: 'C' },
  Em: { notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'], relative: 'G' },
  Bm: { notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A#'], relative: 'D' },
  'F#m': { notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E#'], relative: 'A' },
  'C#m': { notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B#'], relative: 'E' },
  Dm: { notes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C#'], relative: 'F' },
  Gm: { notes: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F#'], relative: 'Bb' },
  Cm: { notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'], relative: 'Eb' },
  Fm: { notes: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'E'], relative: 'Ab' },
  Bbm: { notes: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'A'], relative: 'Db' },
  Abm: { notes: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'G'] },
  'G#m': { notes: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'G'], relative: 'B' },
  Ebm: { notes: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'D'], relative: 'Gb' },
  'D#m': { notes: ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'D'], relative: 'F#' },
};

export function diatonicNotes(key: string): ReadonlySet<string> {
  const info = KEYS[key];
  if (!info) {
    throw new Error(`Unknown key: ${key}`);
  }
  return new Set(info.notes);
}
