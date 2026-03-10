import { parse as rawParse } from './generated.js';
import type { Chord, Bar } from './types.js';

export type { Chord, Bar, Quality } from './types.js';

export function parseChord(input: string): Chord {
  return rawParse(input, { startRule: 'Chord' }) as Chord;
}

export function parseBar(input: string): Bar {
  return rawParse(input, { startRule: 'Bar' }) as Bar;
}
