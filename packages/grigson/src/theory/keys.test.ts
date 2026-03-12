import { describe, it, expect } from 'vitest';
import { diatonicNotes, KEYS } from './keys.js';

describe('diatonicNotes', () => {
  it('returns the correct set for C major', () => {
    expect(diatonicNotes('C')).toEqual(new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']));
  });

  it('returns the correct set for F major', () => {
    expect(diatonicNotes('F')).toEqual(new Set(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']));
  });

  it('returns the correct set for G major', () => {
    expect(diatonicNotes('G')).toEqual(new Set(['G', 'A', 'B', 'C', 'D', 'E', 'F#']));
  });

  it('returns the correct set for Am (harmonic minor with raised 7th)', () => {
    expect(diatonicNotes('Am')).toEqual(new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G#']));
  });

  it('returns the correct set for Dm (harmonic minor with raised 7th)', () => {
    expect(diatonicNotes('Dm')).toEqual(new Set(['D', 'E', 'F', 'G', 'A', 'Bb', 'C#']));
  });

  it('returns the correct set for F# major (including E#)', () => {
    expect(diatonicNotes('F#')).toEqual(new Set(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']));
  });

  it('returns the correct set for Db major', () => {
    expect(diatonicNotes('Db')).toEqual(new Set(['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']));
  });

  it('throws for an unknown key', () => {
    expect(() => diatonicNotes('X')).toThrow();
  });
});

describe('KEYS', () => {
  it('contains exactly 23 entries (12 major including Gb + 10 minor)', () => {
    expect(Object.keys(KEYS)).toHaveLength(23);
  });
});
