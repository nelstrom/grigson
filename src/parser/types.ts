export interface FrontMatter {
  type: 'frontMatter';
  title: string | null;
  key: string | null;
}

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

export interface Row {
  type: 'row';
  bars: Bar[];
}
