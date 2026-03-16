import { describe, it, expect } from 'vitest';
import { transposeSong, transposeSongToKey } from './transpose.js';
import type { Song, Chord, Bar, Row, Section, ChordSlot } from '../parser/types.js';

function ch(root: string, quality: Chord['quality'] = 'major'): Chord {
  return { type: 'chord', root, quality };
}

function bar(c: Chord): Bar {
  return { type: 'bar', slots: [{ type: 'chord', chord: c }] };
}

function row(...chords: Chord[]): Row {
  return { type: 'row', bars: chords.map(bar) };
}

function section(rows: Row[], label: string | null = null): Section {
  return { type: 'section', label, rows };
}

function song(rows: Row[], key: string | null = null): Song {
  return { type: 'song', title: null, key, meter: null, sections: [section(rows)] };
}

function getRoots(result: Song): string[] {
  return result.sections.flatMap((sec) =>
    sec.rows.flatMap((r) =>
      r.bars.flatMap((b) =>
        b.slots.filter((s): s is ChordSlot => s.type === 'chord').map((s) => s.chord.root),
      ),
    ),
  );
}

function getQualities(result: Song): Chord['quality'][] {
  return result.sections.flatMap((sec) =>
    sec.rows.flatMap((r) =>
      r.bars.flatMap((b) =>
        b.slots.filter((s): s is ChordSlot => s.type === 'chord').map((s) => s.chord.quality),
      ),
    ),
  );
}

describe('transpose-rewrite', () => {
  describe('transposeSong', () => {
    it('T1: [C, F, G, Am] +7 → [G, C, D, Em] with homeKey G', () => {
      const s = song([row(ch('C'), ch('F'), ch('G'), ch('A', 'minor'))]);
      const result = transposeSong(s, 7);
      expect(getRoots(result)).toEqual(['G', 'C', 'D', 'E']);
      expect(getQualities(result)).toEqual(['major', 'major', 'major', 'minor']);
      expect(result.key).toBe('G');
    });

    it('T2: [Bb, Eb, F, Gm] +2 → [C, F, G, Am] with homeKey C', () => {
      const s = song([row(ch('Bb'), ch('Eb'), ch('F'), ch('G', 'minor'))]);
      const result = transposeSong(s, 2);
      expect(getRoots(result)).toEqual(['C', 'F', 'G', 'A']);
      expect(getQualities(result)).toEqual(['major', 'major', 'major', 'minor']);
      expect(result.key).toBe('C');
    });

    it('T3: [C, Bb, F, G] +7 → [G, F, C, D] — borrowed bVII stays F not E#', () => {
      const s = song([row(ch('C'), ch('Bb'), ch('F'), ch('G'))]);
      const result = transposeSong(s, 7);
      expect(getRoots(result)).toEqual(['G', 'F', 'C', 'D']);
    });

    it('T4: [C, Ab, F, G] +7 → [G, Eb, C, D] — bVI shifts to Eb not D#', () => {
      const s = song([row(ch('C'), ch('Ab'), ch('F'), ch('G'))]);
      const result = transposeSong(s, 7);
      expect(getRoots(result)).toEqual(['G', 'Eb', 'C', 'D']);
    });

    it('T5: [C, Bbm, Eb7, Ab, G7, C] +2 → [D, Cm, F7, Bb, A7, D] — Bb not A#', () => {
      const s = song([
        row(
          ch('C'),
          ch('Bb', 'minor'),
          ch('Eb', 'dominant7'),
          ch('Ab'),
          ch('G', 'dominant7'),
          ch('C'),
        ),
      ]);
      const result = transposeSong(s, 2);
      expect(getRoots(result)).toEqual(['D', 'C', 'F', 'Bb', 'A', 'D']);
      expect(getQualities(result)).toEqual([
        'major',
        'minor',
        'dominant7',
        'major',
        'dominant7',
        'major',
      ]);
    });
  });

  describe('transposeSongToKey', () => {
    it('T6: transposeSongToKey(C, "G") === transposeSong(C, +7)', () => {
      const s = song([row(ch('C'), ch('F'), ch('G'), ch('A', 'minor'))]);
      const byKey = transposeSongToKey(s, 'G');
      const bySemitones = transposeSong(s, 7);
      expect(getRoots(byKey)).toEqual(getRoots(bySemitones));
      expect(byKey.key).toBe(bySemitones.key);
    });
  });
});
