import { parseSong } from './parser/parser.js';
import { Song, TimeSignature, DotSlot } from './parser/types.js';

export interface DiagnosticRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface Diagnostic {
  range: DiagnosticRange;
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

function semanticChecks(song: Song): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let effectiveTimeSig: TimeSignature = { numerator: 4, denominator: 4 };

  for (const section of song.sections) {
    for (const row of section.rows) {
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
              range: zeroRange(),
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
