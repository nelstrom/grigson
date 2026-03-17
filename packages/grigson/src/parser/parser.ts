import { parse as rawParse } from './generated.js';
import type { FrontMatter, Chord, Bar, Row, Song } from './types.js';

export type { FrontMatter, Chord, Bar, Row, Section, Song, Quality, TimeSignature, ChordSlot, DotSlot, BeatSlot, BarlineKind, Barline } from './types.js';

export function parseChord(input: string): Chord {
  return rawParse(input, { startRule: 'Chord' }) as Chord;
}

export function parseBar(input: string): Bar {
  return rawParse(input, { startRule: 'Bar' }) as Bar;
}

export function parseRow(input: string): Row {
  return rawParse(input, { startRule: 'Row' }) as Row;
}

export function parseFrontMatter(input: string): FrontMatter {
  return rawParse(input, { startRule: 'FrontMatter' }) as FrontMatter;
}

export function parseSong(input: string): Song {
  return rawParse(input, { startRule: 'Song' }) as Song;
}
