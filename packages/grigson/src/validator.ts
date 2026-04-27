import { parseSong } from './parser/parser.js';
import { Song, Bar, TimeSignature, DotSlot } from './parser/types.js';

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
        const hasDot = bar.slots.some((s): s is DotSlot => s.type === 'dot');
        if (hasDot) {
          const slotCount = bar.slots.length;
          const expected = effectiveTimeSig.numerator;
          if (slotCount !== expected) {
            diagnostics.push({
              range: barRange(bar),
              severity: 'warning',
              message: `Bar has ${slotCount} slot${slotCount === 1 ? '' : 's'} but time signature is ${effectiveTimeSig.numerator}/${effectiveTimeSig.denominator} (expected ${expected})`,
              source: 'grigson',
            });
          }
        }
      }
    }
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
 * // Semantic warning — beat balance mismatch in mode-2 bar
 * const warnings = validate('| (4/4) C . . G . |');
 * // → [{ severity: 'warning', message: 'Bar has 5 slots but time signature is 4/4 (expected 4)', ... }]
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
    return semanticChecks(song);
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
