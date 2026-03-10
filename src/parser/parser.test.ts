import { describe, it, expect } from 'vitest';
import { parseChord } from './parser.js';

describe('chord parsing', () => {
  describe('major chords', () => {
    it('parses C', () => {
      expect(parseChord('C')).toEqual({ type: 'chord', root: 'C', quality: 'major' });
    });

    it('parses F#', () => {
      expect(parseChord('F#')).toEqual({ type: 'chord', root: 'F#', quality: 'major' });
    });

    it('parses Bb', () => {
      expect(parseChord('Bb')).toEqual({ type: 'chord', root: 'Bb', quality: 'major' });
    });
  });

  describe('minor chords', () => {
    it('parses Am', () => {
      expect(parseChord('Am')).toEqual({ type: 'chord', root: 'A', quality: 'minor' });
    });

    it('parses C#m', () => {
      expect(parseChord('C#m')).toEqual({ type: 'chord', root: 'C#', quality: 'minor' });
    });

    it('parses Bbm', () => {
      expect(parseChord('Bbm')).toEqual({ type: 'chord', root: 'Bb', quality: 'minor' });
    });
  });

  describe('dominant seventh chords', () => {
    it('parses G7', () => {
      expect(parseChord('G7')).toEqual({ type: 'chord', root: 'G', quality: 'dominant7' });
    });

    it('parses Bb7', () => {
      expect(parseChord('Bb7')).toEqual({ type: 'chord', root: 'Bb', quality: 'dominant7' });
    });

    it('parses F#7', () => {
      expect(parseChord('F#7')).toEqual({ type: 'chord', root: 'F#', quality: 'dominant7' });
    });
  });

  describe('unsupported qualities are rejected', () => {
    it('rejects Cm7', () => {
      expect(() => parseChord('Cm7')).toThrow();
    });

    it('rejects CM7', () => {
      expect(() => parseChord('CM7')).toThrow();
    });

    it('rejects Cdim', () => {
      expect(() => parseChord('Cdim')).toThrow();
    });
  });
});
