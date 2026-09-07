import { parseSong } from './parser/parser.js';
import { Song, Section, Bar, Chord, ChordCell, TimeSignature, DotCell } from './parser/types.js';
import { scoreAllKeys } from './theory/keyDetector.js';
import { resolveKey, toCanonicalKey, getKeyRoot, getRelativeMajor } from './theory/keys.js';
import { rootToPitchClass } from './theory/pitchClass.js';

/**
 * LSP-compatible source range (0-based line/character). Mirrors the `Range` type from the
 * Language Server Protocol.
 */
export interface DiagnosticRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

/** A single parse or semantic issue. `source` is always `'grigson'`. */
export interface Diagnostic {
  range: DiagnosticRange;
  /**
   * `'error'` for parse failures; `'warning'` for semantic issues such as beat-count
   * mismatches.
   */
  severity: 'error' | 'warning';
  message: string;
  source: 'grigson';
}

interface PeggyLocation {
  start: { offset: number; line: number; column: number };
  end: { offset: number; line: number; column: number };
}

interface PeggyError extends Error {
  location: PeggyLocation;
}

function isPeggyError(e: unknown): e is PeggyError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'location' in e &&
    typeof (e as PeggyError).location === 'object'
  );
}

function zeroRange(): DiagnosticRange {
  return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
}

function barRange(bar: Bar): DiagnosticRange {
  return bar.loc ?? zeroRange();
}

function parseMeterString(meter: string | null): TimeSignature | null {
  if (!meter || meter === 'mixed') return null;
  const match = /^(\d+)\/(\d+)$/.exec(meter);
  if (!match) return null;
  return { numerator: parseInt(match[1], 10), denominator: parseInt(match[2], 10) };
}

function semanticChecks(song: Song): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let effectiveTimeSig: TimeSignature = parseMeterString(song.meter) ?? {
    numerator: 4,
    denominator: 4,
  };

  for (const section of song.sections) {
    for (const row of section.rows) {
      const lastBar = row.bars[row.bars.length - 1];
      if (lastBar?.closeBarline.kind === 'endRepeatStartRepeat') {
        diagnostics.push({
          range: barRange(lastBar),
          severity: 'error',
          message: ':||: cannot appear at the end of a line; use :|| instead',
          source: 'grigson',
        });
      }
      for (const bar of row.bars) {
        if (bar.timeSignature) {
          effectiveTimeSig = bar.timeSignature;
        }
        const hasDot = bar.cells.some((s): s is DotCell => s.type === 'dot');
        if (hasDot) {
          const cellCount = bar.cells.length;
          const expected = effectiveTimeSig.numerator;
          if (cellCount !== expected) {
            diagnostics.push({
              range: barRange(bar),
              severity: 'warning',
              message: `Bar has ${cellCount} cell${cellCount === 1 ? '' : 's'} but time signature is ${effectiveTimeSig.numerator}/${effectiveTimeSig.denominator} (expected ${expected})`,
              source: 'grigson',
            });
          }
        } else {
          const chordCount = bar.cells.length; // no dots → all cells are ChordCells
          const beats = effectiveTimeSig.numerator;
          if (beats % chordCount !== 0) {
            diagnostics.push({
              range: barRange(bar),
              severity: 'warning',
              message: `Bar has ${chordCount} chord${chordCount === 1 ? '' : 's'} which cannot be divided equally across ${beats} beats (${effectiveTimeSig.numerator}/${effectiveTimeSig.denominator})`,
              source: 'grigson',
            });
          }
        }
      }
    }
  }

  return diagnostics;
}

function collectSectionChords(section: Section): Chord[] {
  return section.rows.flatMap((row) =>
    row.bars.flatMap((bar) =>
      bar.cells.filter((c): c is ChordCell => c.type === 'chord').map((c) => c.chord),
    ),
  );
}

const MODES = ['major', 'minor', 'dorian', 'aeolian', 'mixolydian'] as const;

function keyInMode(tonic: string, mode: (typeof MODES)[number]): string {
  if (mode === 'major') return tonic;
  if (mode === 'minor') return tonic + 'm';
  return `${tonic} ${mode}`;
}

/**
 * `true` when a key-fit mismatch between `declared` and `best` is an unbreakable ambiguity
 * that must never be flagged:
 *
 * - **Parallel** — same tonic pitch class, any mode (`C major` vs `C minor`).
 * - **Relative / modal** — the declared *tonic*, read in any mode, shares an ionian parent
 *   with `best`. This covers `A minor` vs `C major` (relative) and also `E minor` declared
 *   for an E-dorian tune whose chords score best as `D major` — natural-minor vs dorian is
 *   a reading choice, not a spelling error.
 */
function isRelativeOrParallel(declared: string, best: string): boolean {
  try {
    if (rootToPitchClass(getKeyRoot(declared)) === rootToPitchClass(getKeyRoot(best))) {
      return true;
    }
  } catch {
    /* unrecognised root — fall through to the relative check */
  }

  const bestParent = getRelativeMajor(best);
  if (bestParent === undefined) return false;

  const tonic = getKeyRoot(declared);
  return MODES.some((mode) => getRelativeMajor(keyInMode(tonic, mode)) === bestParent);
}

interface GovernedRegion {
  declared: string;
  range: DiagnosticRange;
  /** Inclusive section-index span this declared key governs. */
  from: number;
  to: number;
}

/**
 * Check every *explicitly declared* key (front matter + section headers) against the chords
 * it governs. Blank/inherited sections are never independently flagged.
 *
 * `ratio = declaredScore / bestScore` over the governed chords: `< 0.5` → error,
 * `0.5–0.85` → warning, `≥ 0.85` → silent. Relative / parallel major-minor pairs are exempt.
 */
function keyFitChecks(song: Song): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sections = song.sections;
  const regions: GovernedRegion[] = [];

  const spanEnd = (start: number): number => {
    let end = start;
    while (end + 1 < sections.length && sections[end + 1].key == null) end++;
    return end;
  };

  // Front-matter region: only when the song declares a key and section 0 does not.
  if (song.key != null && sections.length > 0 && sections[0].key == null) {
    regions.push({
      declared: song.key,
      range: song.keyLoc ?? zeroRange(),
      from: 0,
      to: spanEnd(0),
    });
  }

  // Section-header regions: each section that declares its own key.
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].key == null) continue;
    regions.push({
      declared: sections[i].key!,
      range: sections[i].keyLoc ?? zeroRange(),
      from: i,
      to: spanEnd(i),
    });
  }

  for (const region of regions) {
    const chords: Chord[] = [];
    for (let i = region.from; i <= region.to; i++) {
      chords.push(...collectSectionChords(sections[i]));
    }
    if (chords.length === 0) continue;

    const scores = scoreAllKeys(chords);
    let bestShort = '';
    let bestScore = 0;
    for (const [key, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestShort = key;
      }
    }
    if (bestScore === 0) continue;

    const declaredScore = scores.get(resolveKey(region.declared)) ?? 0;
    const ratio = declaredScore / bestScore;
    if (ratio >= 0.85) continue;
    if (isRelativeOrParallel(region.declared, bestShort)) continue;

    const betterKey = toCanonicalKey(bestShort);
    diagnostics.push({
      range: region.range,
      severity: ratio < 0.5 ? 'error' : 'warning',
      message: `Declared key ${region.declared} does not fit the chords it governs; did you mean ${betterKey}?`,
      source: 'grigson',
    });
  }

  return diagnostics;
}

/**
 * Map a `.chart` source string to a list of structured diagnostics. Returns `[]` for valid
 * input. Does not depend on the LSP — usable in CLI tools, pre-commit hooks, and CI pipelines.
 *
 * @example
 * ```typescript
 * import { validate } from 'grigson';
 *
 * // Valid chart — returns empty array
 * validate('| C | Am | F | G |');  // → []
 *
 * // Parse error — unrecognised chord root
 * const errors = validate('| C | Pm | F | G |');
 * // → [{ severity: 'error', message: 'Expected ...', range: { start: { line: 0, character: 6 }, ... } }]
 *
 * // Semantic warning — beat balance mismatch (dots present, wrong cell count)
 * const warnings = validate('| (4/4) C . . G . |');
 * // → [{ severity: 'warning', message: 'Bar has 5 cells but time signature is 4/4 (expected 4)', ... }]
 *
 * // Semantic warning — chord count doesn't divide beat count evenly (no dots)
 * const warnings2 = validate('| (4/4) C G Am |');
 * // → [{ severity: 'warning', message: 'Bar has 3 chords which cannot be divided equally across 4 beats (4/4)', ... }]
 *
 * // Programmatic use in a CI pipeline
 * import { readFileSync } from 'fs';
 * const source = readFileSync('song.chart', 'utf8');
 * const diagnostics = validate(source);
 * if (diagnostics.length > 0) {
 *   for (const d of diagnostics) {
 *     const { line, character } = d.range.start;
 *     console.error(`${line + 1}:${character + 1}: ${d.severity}: ${d.message}`);
 *   }
 *   process.exit(1);
 * }
 * ```
 */
export function validate(source: string): Diagnostic[] {
  try {
    const song = parseSong(source);
    return [...semanticChecks(song), ...keyFitChecks(song)];
  } catch (e: unknown) {
    if (isPeggyError(e)) {
      const { start, end } = e.location;
      return [
        {
          range: {
            start: { line: start.line - 1, character: start.column - 1 },
            end: { line: end.line - 1, character: end.column - 1 },
          },
          severity: 'error',
          message: e.message,
          source: 'grigson',
        },
      ];
    }
    return [{ range: zeroRange(), severity: 'error', message: String(e), source: 'grigson' }];
  }
}
