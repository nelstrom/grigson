export type Quality = 'major' | 'minor' | 'dominant7';

export interface Chord {
  type: 'chord';
  root: string;
  quality: Quality;
}

export interface Bar {
  type: 'bar';
  chord: Chord;
}
