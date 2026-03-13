// Browser entry point — no CLI imports
export { parseSong, parseChord } from './parser/parser.js';
export type { Song, Section, Row, Bar, Chord, Quality, FrontMatter } from './parser/parser.js';

export { TextRenderer } from './renderers/text.js';
export { HtmlRenderer } from './renderers/html.js';

export { GrigsonChart } from './element.js';

export { normaliseSong } from './theory/normalise.js';
export type { DetectKeyConfig } from './theory/keyDetector.js';
