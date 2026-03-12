import { describe, it, expect } from 'vitest';
import { detectKey } from './keyDetector.js';
import type { Chord } from '../parser/types.js';

function maj(root: string): Chord {
  return { type: 'chord', root, quality: 'major' };
}

function min(root: string): Chord {
  return { type: 'chord', root, quality: 'minor' };
}

function dom7(root: string): Chord {
  return { type: 'chord', root, quality: 'dominant7' };
}

function hd(root: string): Chord {
  return { type: 'chord', root, quality: 'halfDiminished' };
}

describe('detectKey — Category 1: unambiguous major keys', () => {
  it('T1-a: F major I-IV-V-I', () => {
    expect(detectKey([maj('F'), maj('Bb'), maj('C'), maj('F')])).toBe('F');
  });

  it('T1-b: G major I-V-vi-IV', () => {
    expect(detectKey([maj('G'), maj('D'), min('E'), maj('C')])).toBe('G');
  });

  it('T1-c: Bb major I-IV-V', () => {
    expect(detectKey([maj('Bb'), maj('Eb'), maj('F'), maj('Bb')])).toBe('Bb');
  });

  it('T1-d: E major I-IV-V; B must not become Cb', () => {
    expect(detectKey([maj('E'), maj('A'), maj('B'), maj('E')])).toBe('E');
  });

  it('T1-e: F# major I-IV-V', () => {
    expect(detectKey([maj('F#'), maj('B'), maj('C#'), maj('F#')])).toBe('F#');
  });
});

describe('detectKey — Category 3: major/minor disambiguation', () => {
  it('T3-a: G7 = V7 of C major → C', () => {
    expect(detectKey([min('A'), maj('F'), maj('C'), dom7('G')])).toBe('C');
  });

  it('T3-b: E7 = V7 of A harmonic minor → Am', () => {
    expect(detectKey([min('A'), min('D'), dom7('E'), min('A')])).toBe('Am');
  });

  it('T3-c: last chord G → C major via last-chord heuristic', () => {
    expect(detectKey([min('A'), maj('F'), maj('C'), maj('G')])).toBe('C');
  });

  it('T3-d: last chord Am → A minor', () => {
    expect(detectKey([maj('C'), min('A'), maj('F'), min('A')])).toBe('Am');
  });

  it('T3-e: first and last both Am → Am', () => {
    expect(detectKey([min('A'), maj('F'), maj('C'), min('A')])).toBe('Am');
  });

  it('T3-f: first C, last Am — last wins → Am', () => {
    expect(detectKey([maj('C'), min('A'), maj('F'), min('A')])).toBe('Am');
  });

  it('T3-g: ii° + V7 = strongest minor signal → Am', () => {
    expect(detectKey([hd('B'), dom7('E'), min('A'), min('A')])).toBe('Am');
  });
});
