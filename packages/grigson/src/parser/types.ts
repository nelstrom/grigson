export interface FrontMatter {
  type: 'frontMatter';
  title: string | null;
  key: string | null;
}

export type Quality =
  | 'major'
  | 'minor'
  | 'dominant7'
  | 'halfDiminished'
  | 'diminished'
  | 'maj7'
  | 'min7'
  | 'dim7';

export interface Chord {
  type: 'chord';
  root: string;
  quality: Quality;
}

export interface Bar {
  type: 'bar';
  chord: Chord;
}

export interface Row {
  type: 'row';
  bars: Bar[];
}

export interface Section {
  type: 'section';
  label: string | null;
  rows: Row[];
}

export interface Song {
  type: 'song';
  title: string | null;
  key: string | null;
  sections: Section[];
}
