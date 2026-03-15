export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

const NOTE_MAP: Record<string, PitchClass> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  'B#': 0,
  Cb: 11,
  'E#': 5,
  Fb: 4,
};

export const ENHARMONIC_PAIRS: Record<string, string> = {
  'C#': 'Db',
  Db: 'C#',
  'D#': 'Eb',
  Eb: 'D#',
  'F#': 'Gb',
  Gb: 'F#',
  'G#': 'Ab',
  Ab: 'G#',
  'A#': 'Bb',
  Bb: 'A#',
  'G#m': 'Abm',
  Abm: 'G#m',
  'D#m': 'Ebm',
  Ebm: 'D#m',
};

export function rootToPitchClass(root: string): PitchClass {
  const pc = NOTE_MAP[root];
  if (pc === undefined) {
    throw new Error(`Unrecognised note: ${root}`);
  }
  return pc;
}
