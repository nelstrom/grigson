// Browser entry point — no CLI imports
export { parseSong, parseChord } from './parser/parser.js';
export type { Song, Section, Row, Bar, Chord, Quality, FrontMatter, TimeSignature, ChordSlot, DotSlot, BeatSlot } from './parser/parser.js';

export { TextRenderer } from './renderers/text.js';
export { HtmlRenderer } from './renderers/html.js';

export { GrigsonChart } from './element.js';

export { normaliseSong, normaliseSection } from './theory/normalise.js';
export type { DetectKeyConfig } from './theory/keyDetector.js';

export { transposeSong, transposeSongToKey, transposeSection } from './theory/transpose.js';
