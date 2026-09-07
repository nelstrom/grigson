/**
 * LSP-style source location (0-based line/character). Present on most tree nodes when the input
 * was parsed with location tracking.
 */
export interface SourceRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

/** Parsed front-matter block from the top of a `.chart` file. */
export interface FrontMatter {
  type: 'frontMatter';
  title: string | null;
  key: string | null;
  /** Raw meter string from front matter (e.g. `'4/4'`, `'mixed'`, or `null`). */
  meter: string | null;
  loc?: SourceRange;
  /** Source range of the `key:` line, when a key was declared. Useful for diagnostics. */
  keyLoc?: SourceRange;
}

/**
 * Chord quality. The source syntax that maps to each variant is shown in the
 * renderer-interface guide.
 */
export type Quality =
  | 'major'
  | 'minor'
  | 'dominant7'
  | 'halfDiminished'
  | 'diminished'
  | 'maj7'
  | 'min7'
  | 'dim7'
  | 'dom7flat5'
  | 'dom9'
  | 'dom11'
  | 'dom13'
  | 'dom7flat9'
  | 'dom7sharp9'
  | 'dom7sharp5'
  | 'dom7flat13'
  | 'sus4'
  | 'sus2'
  | 'add6';

/**
 * A single chord as parsed. `root` is the letter name including any accidentals (e.g. `'Bb'`,
 * `'F#'`). `bass` is the optional slash-chord bass note.
 */
export interface Chord {
  type: 'chord';
  /** Letter name including any accidentals (e.g. `'Bb'`, `'F#'`). */
  root: string;
  quality: Quality;
  /** Optional slash-chord bass note. */
  bass?: string;
  loc?: SourceRange;
}

/** Numerator/denominator pair (e.g. 6/8 → `{ numerator: 6, denominator: 8 }`). */
export interface TimeSignature {
  numerator: number;
  denominator: number;
}

/** A chord occupying one beat cell within a bar. */
export interface ChordCell {
  type: 'chord';
  chord: Chord;
  loc?: SourceRange;
}

/** `type: 'dot'` — a sustain mark (`.`) that holds the previous chord for one beat. */
export interface DotCell {
  type: 'dot';
  loc?: SourceRange;
}

/** Discriminated union of the two cell kinds inside a bar. */
export type BeatCell = ChordCell | DotCell;

/**
 * Barline variant.
 * - `'single'` — plain `|`
 * - `'double'` — `||`
 * - `'final'` — `||.`
 * - `'startRepeat'` — `||:`
 * - `'endRepeat'` — `:||`
 * - `'endRepeatStartRepeat'` — `:||:`
 */
export type BarlineKind =
  | 'single'
  | 'double'
  | 'final'
  | 'startRepeat'
  | 'endRepeat'
  | 'endRepeatStartRepeat';

/**
 * A barline with an optional explicit repeat count. `repeatCount` is only set when the source
 * carries an explicit `x3`-style count.
 */
export interface Barline {
  kind: BarlineKind;
  /** Explicit repeat count (e.g. `3` from `x3`). Only present when the source includes a count. */
  repeatCount?: number;
}

/**
 * Inline key annotation in the source (e.g. `[Am]`), placed between beat cells.
 * `beforeCellIndex` is the cell index the hint precedes.
 */
export interface TonalityHintItem {
  /** Index of the cell this hint precedes. */
  beforeCellIndex: number;
  key: string;
  loc?: SourceRange;
}

/**
 * A bar containing beat cells. `cells` always contains at least one chord cell.
 * `timeSignature` is set only when the bar carries an explicit `(n/d)` annotation.
 */
export interface Bar {
  type: 'bar';
  cells: BeatCell[];
  /** Explicit time-signature annotation on this bar, e.g. `(6/8)`. */
  timeSignature?: TimeSignature;
  tonalityHints?: TonalityHintItem[];
  closeBarline: Barline;
  loc?: SourceRange;
}

/** A horizontal line of bars sharing an opening barline. */
export interface Row {
  type: 'row';
  openBarline: Barline;
  bars: Bar[];
  loc?: SourceRange;
}

/** A comment line in the source. `text` includes the leading `#` character. */
export interface CommentLine {
  type: 'comment';
  /** Raw comment text including the leading `#` character. */
  text: string;
  loc?: SourceRange;
}

export type SectionItem = Row | CommentLine;

/**
 * A labelled section of the chart. `rows` contains only `Row` nodes; `content`
 * interleaves rows and comment lines in document order and is more useful for display.
 */
export interface Section {
  type: 'section';
  label: string | null;
  key: string | null;
  rows: Row[];
  /** Comment lines appearing before the section label. */
  preamble?: CommentLine[];
  /** Rows and inline comments in document order (more useful for display than `rows` alone). */
  content?: SectionItem[];
  loc?: SourceRange;
  /** Source range of the section header's `key:` annotation, when one was declared. */
  keyLoc?: SourceRange;
}

/**
 * Top-level parse result for a `.chart` file. `key` comes from front matter;
 * `meter` is the raw string from front matter (e.g. `'4/4'`, `'mixed'`, or `null`).
 */
export interface Song {
  type: 'song';
  title: string | null;
  /** Key string from front matter (e.g. `'Am'`, `'G mixolydian'`). */
  key: string | null;
  /** Raw meter string from front matter (e.g. `'4/4'`, `'mixed'`, or `null`). */
  meter: string | null;
  sections: Section[];
  loc?: SourceRange;
  /** Source range of the front-matter `key:` line, copied from `FrontMatter.keyLoc`. */
  keyLoc?: SourceRange;
}
