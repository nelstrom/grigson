// Browser entry point — no CLI imports
export { parseSong, parseChord } from './parser/parser.js';
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

export type { GrigsonRenderer } from './renderers/text.js';
export { TextRenderer } from './renderers/text.js';
export { HtmlRenderer } from './renderers/html.js';

export { GrigsonChart } from './element.js';
export { GrigsonHtmlRenderer } from './renderers/html-element.js';

export type { GrigsonRendererElement } from './renderers/contract.js';
export {
  GrigsonRendererUpdateEvent,
  GrigsonParseErrorEvent,
  GrigsonRenderErrorEvent,
} from './events.js';

export { normaliseSong, normaliseSection } from './theory/normalise.js';
export type { DetectKeyConfig } from './theory/keyDetector.js';

export { transposeSong, transposeSongToKey, transposeSection } from './theory/transpose.js';

export { validate } from './validator.js';
export type { Diagnostic, DiagnosticRange } from './validator.js';
