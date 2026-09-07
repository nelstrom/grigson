import { parseSong } from './parser/parser.js';
import { rankKeys, type RankedKey } from './theory/keyDetector.js';
import type { Chord, ChordCell, Section } from './parser/types.js';

/** Result of {@link keyCompletions}. */
export interface KeyCompletionResult {
  /** Ranked `key:` candidates, best first. Empty when the cursor is not on a `key:` line. */
  candidates: RankedKey[];
  /**
   * `'front-matter'` when the cursor is on a front-matter `key:` line, `'section'` when it is
   * on a `[Label] key:` header line, `null` when the line is not a `key:` line at all.
   */
  context: 'front-matter' | 'section' | null;
}

// A `key:` line, optionally prefixed with a `[Section]` label, with the cursor anywhere
// after the colon.
const KEY_LINE_RE = /^\s*(?:\[[^\]\r\n]*\]\s*)?key\s*:\s*[^\r\n]*$/;
const SECTION_PREFIX_RE = /^\s*\[[^\]\r\n]*\]/;

function sectionChords(section: Section): Chord[] {
  return section.rows.flatMap((row) =>
    row.bars.flatMap((bar) =>
      bar.cells.filter((c): c is ChordCell => c.type === 'chord').map((c) => c.chord),
    ),
  );
}

/**
 * Pure cursor-context + candidate logic for `key:` autocomplete. Given the full document
 * source and a 0-based cursor position, decide whether the cursor sits after a `key:` token
 * (front matter or section header) and, if so, return the top key candidates detected from
 * the chords that key would govern.
 *
 * Never throws — an unparseable document yields `{ candidates: [], context }`.
 */
export function keyCompletions(
  source: string,
  line: number,
  character: number,
): KeyCompletionResult {
  const lines = source.split(/\r\n|\r|\n/);
  const prefix = (lines[line] ?? '').slice(0, character);

  if (!KEY_LINE_RE.test(prefix)) return { candidates: [], context: null };
  const context: 'front-matter' | 'section' = SECTION_PREFIX_RE.test(prefix)
    ? 'section'
    : 'front-matter';

  let chords: Chord[];
  try {
    const song = parseSong(source);
    if (context === 'front-matter') {
      chords = song.sections[0] ? sectionChords(song.sections[0]) : [];
    } else {
      const section = song.sections.find(
        (s) => s.loc != null && s.loc.start.line <= line && line <= s.loc.end.line,
      );
      chords = section ? sectionChords(section) : [];
    }
  } catch {
    return { candidates: [], context };
  }

  return { candidates: rankKeys(chords, 3), context };
}
