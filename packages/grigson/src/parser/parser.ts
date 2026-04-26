import { parse as rawParse } from './generated.js';
import type { FrontMatter, Chord, Bar, Row, Song } from './types.js';

export type {
  FrontMatter,
  Chord,
  Bar,
  TonalityHintItem,
  Row,
  Section,
  Song,
  Quality,
  TimeSignature,
  ChordSlot,
  DotSlot,
  BeatSlot,
  BarlineKind,
  Barline,
  CommentLine,
  SectionItem,
  SourceRange,
} from './types.js';

/**
 * Parse a single chord token (e.g. `'Bbm7'`). Useful for one-off chord parsing outside of a
 * full chart.
 */
export function parseChord(input: string): Chord {
  return rawParse(input, { startRule: 'Chord' }) as Chord;
}

/** Parse a single bar expression (e.g. `'| C . G |'`). */
export function parseBar(input: string): Bar {
  return rawParse(input, { startRule: 'Bar' }) as Bar;
}

/** Parse a single row (one line of bars). */
export function parseRow(input: string): Row {
  return rawParse(input, { startRule: 'Row' }) as Row;
}

/** Parse only the front-matter block of a `.chart` file. */
export function parseFrontMatter(input: string): FrontMatter {
  return rawParse(input, { startRule: 'FrontMatter' }) as FrontMatter;
}

/**
 * Parse a complete `.chart` source string into a `Song` tree. Throws a `PeggyError` on parse
 * failure.
 */
export function parseSong(input: string): Song {
  return rawParse(input, { startRule: 'Song' }) as Song;
}
