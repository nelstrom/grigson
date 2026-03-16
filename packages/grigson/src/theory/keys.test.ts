import { describe, it, expect } from 'vitest';
import { diatonicNotes, getKeyMode, getKeyRoot, getRelativeMajor, getSiblingModes, KEYS } from './keys.js';

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
  it('contains exactly 39 entries (13 major + 14 minor + 12 dorian)', () => {
    expect(Object.keys(KEYS)).toHaveLength(39);
  });

  it('all entries have scaleFamily, degree, and parent fields', () => {
    for (const [key, info] of Object.entries(KEYS)) {
      expect(info.scaleFamily, `${key} missing scaleFamily`).toMatch(/^(major|harmonic_minor)$/);
      expect(info.degree, `${key} missing degree`).toBeGreaterThanOrEqual(1);
      expect(info.parent, `${key} missing parent`).toBeTruthy();
    }
  });

  it('major keys have scaleFamily=major, degree=1, parent=key name', () => {
    expect(KEYS['C']).toMatchObject({ scaleFamily: 'major', degree: 1, parent: 'C' });
    expect(KEYS['G']).toMatchObject({ scaleFamily: 'major', degree: 1, parent: 'G' });
    expect(KEYS['F']).toMatchObject({ scaleFamily: 'major', degree: 1, parent: 'F' });
  });

  it('harmonic minor keys have scaleFamily=harmonic_minor, degree=1, parent=root note', () => {
    expect(KEYS['Am']).toMatchObject({ scaleFamily: 'harmonic_minor', degree: 1, parent: 'A' });
    expect(KEYS['Em']).toMatchObject({ scaleFamily: 'harmonic_minor', degree: 1, parent: 'E' });
    expect(KEYS['Dm']).toMatchObject({ scaleFamily: 'harmonic_minor', degree: 1, parent: 'D' });
  });

  it('dorian keys have scaleFamily=major, degree=2, parent=major key a whole step below', () => {
    expect(KEYS['D dorian']).toMatchObject({ scaleFamily: 'major', degree: 2, parent: 'C' });
    expect(KEYS['E dorian']).toMatchObject({ scaleFamily: 'major', degree: 2, parent: 'D' });
    expect(KEYS['A dorian']).toMatchObject({ scaleFamily: 'major', degree: 2, parent: 'G' });
    expect(KEYS['Bb dorian']).toMatchObject({ scaleFamily: 'major', degree: 2, parent: 'Ab' });
  });
});

describe('dorian keys', () => {
  it('diatonicNotes returns correct set for E dorian', () => {
    expect(diatonicNotes('E dorian')).toEqual(new Set(['E', 'F#', 'G', 'A', 'B', 'C#', 'D']));
  });

  it('diatonicNotes returns correct set for B dorian', () => {
    expect(diatonicNotes('B dorian')).toEqual(new Set(['B', 'C#', 'D', 'E', 'F#', 'G#', 'A']));
  });

  it('getKeyMode returns dorian for dorian keys', () => {
    expect(getKeyMode('E dorian')).toBe('dorian');
  });

  it('getKeyRoot returns root note for dorian keys', () => {
    expect(getKeyRoot('E dorian')).toBe('E');
    expect(getKeyRoot('F# dorian')).toBe('F#');
    expect(getKeyRoot('Bb dorian')).toBe('Bb');
  });
});

describe('getSiblingModes', () => {
  it('returns only currently defined siblings for D dorian (C and D dorian)', () => {
    const siblings = getSiblingModes('D dorian');
    expect(siblings.sort()).toEqual(['C', 'D dorian'].sort());
  });

  it('returns only C for the C major key (no other major-family siblings defined yet)', () => {
    const siblings = getSiblingModes('C');
    expect(siblings.sort()).toEqual(['C', 'D dorian'].sort());
  });

  it('returns only Am for the Am key (no other harmonic_minor A-family siblings defined)', () => {
    const siblings = getSiblingModes('Am');
    expect(siblings).toEqual(['Am']);
  });

  it('returns empty array for unknown key', () => {
    expect(getSiblingModes('X')).toEqual([]);
  });
});

describe('getRelativeMajor', () => {
  it('major key returns itself', () => {
    expect(getRelativeMajor('C')).toBe('C');
    expect(getRelativeMajor('G')).toBe('G');
    expect(getRelativeMajor('F')).toBe('F');
    expect(getRelativeMajor('Bb')).toBe('Bb');
  });

  it('harmonic minor key returns relative major (3 semitones up)', () => {
    expect(getRelativeMajor('Am')).toBe('C');
    expect(getRelativeMajor('Em')).toBe('G');
    expect(getRelativeMajor('Dm')).toBe('F');
    expect(getRelativeMajor('Bm')).toBe('D');
    expect(getRelativeMajor('F#m')).toBe('A');
    expect(getRelativeMajor('C#m')).toBe('E');
    expect(getRelativeMajor('Gm')).toBe('Bb');
    expect(getRelativeMajor('Cm')).toBe('Eb');
    expect(getRelativeMajor('Fm')).toBe('Ab');
    expect(getRelativeMajor('Bbm')).toBe('Db');
    expect(getRelativeMajor('G#m')).toBe('B');
    expect(getRelativeMajor('Ebm')).toBe('Gb');
    expect(getRelativeMajor('D#m')).toBe('F#');
  });

  it('dorian key returns its parent major', () => {
    expect(getRelativeMajor('D dorian')).toBe('C');
    expect(getRelativeMajor('E dorian')).toBe('D');
    expect(getRelativeMajor('A dorian')).toBe('G');
    expect(getRelativeMajor('B dorian')).toBe('A');
    expect(getRelativeMajor('Bb dorian')).toBe('Ab');
    expect(getRelativeMajor('F# dorian')).toBe('E');
  });

  it('returns undefined for unknown key', () => {
    expect(getRelativeMajor('X')).toBeUndefined();
  });
});
