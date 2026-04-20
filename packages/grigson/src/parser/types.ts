export interface SourceRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface FrontMatter {
  type: 'frontMatter';
  title: string | null;
  key: string | null;
  meter: string | null;
  loc?: SourceRange;
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
  loc?: SourceRange;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface ChordSlot {
  type: 'chord';
  chord: Chord;
  loc?: SourceRange;
}

export interface DotSlot {
  type: 'dot';
  loc?: SourceRange;
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
  loc?: SourceRange;
}

export interface Row {
  type: 'row';
  openBarline: Barline;
  bars: Bar[];
  loc?: SourceRange;
}

export interface CommentLine {
  type: 'comment';
  text: string;
  loc?: SourceRange;
}

export type SectionItem = Row | CommentLine;

export interface Section {
  type: 'section';
  label: string | null;
  key: string | null;
  rows: Row[];
  preamble?: CommentLine[]; // comment lines appearing before the section label
  content?: SectionItem[]; // rows and inline comments appearing after the label
  loc?: SourceRange;
}

export interface Song {
  type: 'song';
  title: string | null;
  key: string | null;
  meter: string | null;
  sections: Section[];
  loc?: SourceRange;
}
