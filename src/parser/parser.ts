import { parse as rawParse } from './generated.js';
import type { Chord, Bar, Row } from './types.js';

export type { Chord, Bar, Row, Quality } from './types.js';

export function parseChord(input: string): Chord {
  return rawParse(input, { startRule: 'Chord' }) as Chord;
}

export function parseBar(input: string): Bar {
  return rawParse(input, { startRule: 'Bar' }) as Bar;
}

export function parseRow(input: string): Row {
  return rawParse(input, { startRule: 'Row' }) as Row;
}
