import { describe, it, expect } from 'vitest';
import { rootToPitchClass, ENHARMONIC_PAIRS } from './pitchClass.js';

describe('rootToPitchClass', () => {
  it('maps natural notes to correct pitch classes', () => {
    expect(rootToPitchClass('C')).toBe(0);
    expect(rootToPitchClass('D')).toBe(2);
    expect(rootToPitchClass('E')).toBe(4);
    expect(rootToPitchClass('F')).toBe(5);
    expect(rootToPitchClass('G')).toBe(7);
    expect(rootToPitchClass('A')).toBe(9);
    expect(rootToPitchClass('B')).toBe(11);
  });

  it('maps sharp spellings to correct pitch classes', () => {
    expect(rootToPitchClass('C#')).toBe(1);
    expect(rootToPitchClass('D#')).toBe(3);
    expect(rootToPitchClass('F#')).toBe(6);
    expect(rootToPitchClass('G#')).toBe(8);
    expect(rootToPitchClass('A#')).toBe(10);
  });

  it('maps flat spellings to correct pitch classes', () => {
    expect(rootToPitchClass('Db')).toBe(1);
    expect(rootToPitchClass('Eb')).toBe(3);
    expect(rootToPitchClass('Gb')).toBe(6);
    expect(rootToPitchClass('Ab')).toBe(8);
    expect(rootToPitchClass('Bb')).toBe(10);
  });

  it('returns the same pitch class for enharmonic equivalents', () => {
    expect(rootToPitchClass('A#')).toBe(rootToPitchClass('Bb'));
  });

  it('throws for unrecognised input', () => {
    expect(() => rootToPitchClass('X')).toThrow();
  });
});

describe('ENHARMONIC_PAIRS', () => {
  it('maps sharps to their flat equivalents', () => {
    expect(ENHARMONIC_PAIRS['C#']).toBe('Db');
    expect(ENHARMONIC_PAIRS['D#']).toBe('Eb');
    expect(ENHARMONIC_PAIRS['F#']).toBe('Gb');
    expect(ENHARMONIC_PAIRS['G#']).toBe('Ab');
    expect(ENHARMONIC_PAIRS['A#']).toBe('Bb');
  });

  it('maps flats to their sharp equivalents', () => {
    expect(ENHARMONIC_PAIRS['Db']).toBe('C#');
    expect(ENHARMONIC_PAIRS['Eb']).toBe('D#');
    expect(ENHARMONIC_PAIRS['Gb']).toBe('F#');
    expect(ENHARMONIC_PAIRS['Ab']).toBe('G#');
    expect(ENHARMONIC_PAIRS['Bb']).toBe('A#');
  });
});
