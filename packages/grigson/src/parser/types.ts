export interface FrontMatter {
  type: 'frontMatter';
  title: string | null;
  key: string | null;
  meter: string | null;
}

export type Quality =
  | 'major'
  | 'minor'
  | 'dominant7'
  | 'halfDiminished'
  | 'diminished'
  | 'maj7'
  | 'min7'
  | 'dim7'
  | 'dom7flat5';

export interface Chord {
  type: 'chord';
  root: string;
  quality: Quality;
  bass?: string;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface ChordSlot {
  type: 'chord';
  chord: Chord;
}

export interface DotSlot {
  type: 'dot';
}

export type BeatSlot = ChordSlot | DotSlot;

export type BarlineKind =
  | 'single'
  | 'double'
  | 'final'
  | 'startRepeat'
  | 'endRepeat'
  | 'endRepeatStartRepeat';

export interface Barline {
  kind: BarlineKind;
  repeatCount?: number;
}

export interface Bar {
  type: 'bar';
  slots: BeatSlot[];
  timeSignature?: TimeSignature;
  closeBarline: Barline;
}

export interface Row {
  type: 'row';
  openBarline: Barline;
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
  meter: string | null;
  sections: Section[];
}
