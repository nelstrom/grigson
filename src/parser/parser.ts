import { parse as rawParse } from './generated.js';
import type { Chord } from './types.js';

export type { Chord, Quality } from './types.js';

export function parseChord(input: string): Chord {
  return rawParse(input, { startRule: 'Chord' }) as Chord;
}
