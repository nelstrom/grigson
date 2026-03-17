export const version = '1.0.0';

// Parser
export { parseSong, parseChord, parseBar, parseRow, parseFrontMatter } from './parser/parser.js';
export type { Song, Section, Row, Bar, Chord, Quality, FrontMatter, TimeSignature, ChordSlot, DotSlot, BeatSlot } from './parser/parser.js';

// Renderer
export { TextRenderer } from './renderers/text.js';
export { HtmlRenderer } from './renderers/html.js';

// Normaliser
export { normaliseSong, normaliseSection } from './theory/normalise.js';
export type { DetectKeyConfig } from './theory/keyDetector.js';

// Transpose
export { transposeSong, transposeSongToKey, transposeSection } from './theory/transpose.js';

// Theory utilities
export { detectKey } from './theory/keyDetector.js';
export { diatonicNotes, getKeyMode, getKeyRoot, getSiblingModes, getRelativeMajor, resolveKey } from './theory/keys.js';
export type { KeyMode, ScaleFamily } from './theory/keys.js';
export { rootToPitchClass, ENHARMONIC_PAIRS } from './theory/pitchClass.js';
export { analyseHarmony, circleOfFifthsDistance } from './theory/harmonicAnalysis.js';
export type { AnnotatedChord } from './theory/harmonicAnalysis.js';

// Validator
export { validate } from './validator.js';
export type { Diagnostic, DiagnosticRange } from './validator.js';
