export const version = '1.0.0';

// Parser
export { parseSong, parseChord, parseBar, parseRow, parseFrontMatter } from './parser/parser.js';
export type {
  Song,
  Section,
  Row,
  Bar,
  TonalityHintItem,
  Chord,
  Quality,
  FrontMatter,
  TimeSignature,
  ChordSlot,
  DotSlot,
  BeatSlot,
  BarlineKind,
  Barline,
  CommentLine,
  SectionItem,
  SourceRange,
} from './parser/parser.js';

// Renderer
export type { GrigsonRenderer, SpokenPreset } from './renderers/text.js';
export { TextRenderer } from './renderers/text.js';
export {
  HtmlRenderer,
  DEFAULT_SPOKEN_PRESET,
  chordAriaLabel,
  reflowSong,
} from './renderers/html.js';
export { getRendererStyles, getRendererFontFaceCSS } from './renderers/renderer-css.js';

// Normaliser
export { normaliseSong, normaliseSection } from './theory/normalise.js';
export type { DetectKeyConfig } from './theory/keyDetector.js';

// Transpose
export { transposeSong, transposeSongToKey, transposeSection } from './theory/transpose.js';

// Theory utilities
export { detectKey } from './theory/keyDetector.js';
export {
  diatonicNotes,
  getKeyMode,
  getKeyRoot,
  getSiblingModes,
  getRelativeMajor,
  resolveKey,
} from './theory/keys.js';
export type { KeyMode, ScaleFamily } from './theory/keys.js';
export { rootToPitchClass, ENHARMONIC_PAIRS } from './theory/pitchClass.js';
export { analyseHarmony, circleOfFifthsDistance, analyseSong } from './theory/harmonicAnalysis.js';
export type {
  AnnotatedChord,
  AnnotatedChordSlot,
  AnalysedBeatSlot,
  AnalysedBar,
  AnalysedRow,
  AnalysedSectionItem,
  AnalysedSection,
  AnalysedSong,
} from './theory/harmonicAnalysis.js';

// Validator
export { validate } from './validator.js';
export type { Diagnostic, DiagnosticRange } from './validator.js';

// Custom element contract
export type { GrigsonRendererElement } from './renderers/contract.js';
export {
  GrigsonRendererUpdateEvent,
  GrigsonParseErrorEvent,
  GrigsonRenderErrorEvent,
} from './events.js';

// Notation presets
export { definePreset, resolvePreset } from './notation/index.js';
export type { NotationPreset } from './notation/index.js';
export { DEFAULT_PRESET, REALBOOK_PRESET } from './notation/index.js';

// CLI helpers
export { runRenderer } from './run-renderer.js';
export type { RunRendererOptions } from './run-renderer.js';
