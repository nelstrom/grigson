import { describe, it, expect } from 'vitest';
import { normaliseSong } from './normalise.js';
import type { Song, Chord, Bar, Row } from '../parser/types.js';

function ch(root: string, quality: Chord['quality'] = 'major'): Chord {
  return { type: 'chord', root, quality };
}

function bar(c: Chord): Bar {
  return { type: 'bar', chord: c };
}

function row(...chords: Chord[]): Row {
  return { type: 'row', bars: chords.map(bar) };
}

function song(rows: Row[], key: string | null = null, title: string | null = null): Song {
  return { type: 'song', title, key, rows };
}

describe('normaliseSong — Category 2: enharmonic correction of diatonic chord roots', () => {
  it('T2-a: A# → Bb in F major', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result.rows[0].bars[0].chord.root).toBe('F');
    expect(result.rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.rows[0].bars[2].chord.root).toBe('F');
    expect(result.rows[0].bars[3].chord.root).toBe('C');
  });

  it('T2-b: D# → Eb in Bb major', () => {
    const s = song([row(ch('Bb'), ch('D#'), ch('F'), ch('Bb'))]);
    const result = normaliseSong(s);
    expect(result.rows[0].bars[1].chord.root).toBe('Eb');
  });

  it('T2-c: A# → Bb across two rows in F major', () => {
    const s = song([row(ch('F'), ch('A#'), ch('C')), row(ch('A#'), ch('F'))]);
    const result = normaliseSong(s);
    expect(result.rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.rows[1].bars[0].chord.root).toBe('Bb');
  });

  it('T2-d: A# → Bb; existing Bb left unchanged', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('Bb'))]);
    const result = normaliseSong(s);
    expect(result.rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.rows[0].bars[3].chord.root).toBe('Bb');
  });

  it('T2-e: C# F# G# C# → Db Gb Ab Db in Db major', () => {
    const s = song([row(ch('C#'), ch('F#'), ch('G#'), ch('C#'))]);
    const result = normaliseSong(s);
    expect(result.rows[0].bars[0].chord.root).toBe('Db');
    expect(result.rows[0].bars[1].chord.root).toBe('Gb');
    expect(result.rows[0].bars[2].chord.root).toBe('Ab');
    expect(result.rows[0].bars[3].chord.root).toBe('Db');
  });

  it('T2-f: D# A# F D# → Eb Bb F Eb in Bb major', () => {
    const s = song([row(ch('D#'), ch('A#'), ch('F'), ch('D#'))]);
    const result = normaliseSong(s);
    expect(result.rows[0].bars[0].chord.root).toBe('Eb');
    expect(result.rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.rows[0].bars[2].chord.root).toBe('F');
    expect(result.rows[0].bars[3].chord.root).toBe('Eb');
  });

  it('returns a new Song object, not the same reference', () => {
    const s = song([row(ch('C'), ch('F'), ch('G'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result).not.toBe(s);
  });

  it('is idempotent: calling twice gives the same result as calling once', () => {
    const s = song([row(ch('F'), ch('A#'), ch('C'))]);
    const once = normaliseSong(s);
    const twice = normaliseSong(once);
    expect(twice).toEqual(once);
  });
});
