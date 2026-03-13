export const version = '1.0.0';

// Parser
export { parseSong, parseChord, parseBar, parseRow, parseFrontMatter } from './parser/parser.js';
export type { Song, Row, Bar, Chord, Quality, FrontMatter } from './parser/parser.js';

// Renderer
export { TextRenderer } from './renderers/text.js';
export { HtmlRenderer } from './renderers/html.js';

// Normaliser
export { normaliseSong } from './theory/normalise.js';
export type { DetectKeyConfig } from './theory/keyDetector.js';

// Transposition
export { transposeSong, transposeChord } from './theory/transpose.js';

// Theory utilities
export { detectKey } from './theory/keyDetector.js';
export { diatonicNotes } from './theory/keys.js';
export { rootToPitchClass, ENHARMONIC_PAIRS } from './theory/pitchClass.js';
