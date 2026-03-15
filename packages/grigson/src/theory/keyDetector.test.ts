import { describe, it, expect } from 'vitest';
import { detectKey, type DetectKeyConfig } from './keyDetector.js';
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

function maj7(root: string): Chord {
  return { type: 'chord', root, quality: 'maj7' };
}

function min7(root: string): Chord {
  return { type: 'chord', root, quality: 'min7' };
}

function dim7(root: string): Chord {
  return { type: 'chord', root, quality: 'dim7' };
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

describe('detectKey — Category 4: V7 as a strong tonic anchor', () => {
  it('T4-a: ii-V-I; G7 = V7 of C', () => {
    expect(detectKey([min('D'), dom7('G'), maj('C')])).toBe('C');
  });

  it('T4-b: C7 = V7 of F major', () => {
    expect(detectKey([maj('F'), maj('Bb'), dom7('C'), maj('F')])).toBe('F');
  });

  it('T4-c: F7 = V7 of Bb; D#→Eb, A#→Bb after key confirmed', () => {
    expect(detectKey([maj('D#'), maj('A#'), dom7('F'), maj('A#')])).toBe('Bb');
  });
});

describe('detectKey — Category 6: graceful degradation with sparse data', () => {
  it('T6-a: single chord, no declared key; best-guess C major', () => {
    expect(detectKey([maj('C')])).toBe('C');
  });

  it('T6-b: declared key D is a valid candidate — preserve it', () => {
    expect(detectKey([maj('G'), maj('D')], 'D')).toBe('D');
  });

  it('T6-c: E scores zero — correct the declared key to G or D', () => {
    const result = detectKey([maj('G'), maj('D')], 'E');
    expect(['G', 'D']).toContain(result);
    expect(result).not.toBe('E');
  });

  it('T6-d: three chords uniquely identifying F major', () => {
    expect(detectKey([maj('F'), min('G'), maj('C')])).toBe('F');
  });
});

describe('detectKey — Category 7: robustness to non-diatonic and chromatic chords', () => {
  it('T7-a: Ab is chromatic bVI in C; C F G anchor C major', () => {
    expect(detectKey([maj('C'), maj('F'), maj('Ab'), maj('G')])).toBe('C');
  });

  it('T7-b: A7 is secondary dominant V7/ii; overall key C', () => {
    expect(detectKey([maj('C'), dom7('A'), min('D'), dom7('G'), maj('C')])).toBe('C');
  });

  it('T7-c: chromatic ascent — no key fits majority → null', () => {
    expect(detectKey([maj('C'), maj('Db'), maj('D'), maj('Eb')])).toBeNull();
  });
});

describe('detectKey — Category 9: enharmonic boundary keys (Db/C#, Gb/F#)', () => {
  it('T9-a: all chords diatonic to Db major; stay on flat side', () => {
    expect(detectKey([maj('Db'), maj('Ab'), min('Bb'), maj('Gb')])).toBe('Db');
  });

  it('T9-b: prefer Gb flat spelling over F# major when chords are spelled flat', () => {
    // Gb(I), Db(V), Ebm(VIm), Abm(IIm) in Gb major; Gb/F# tie on score, Gb root in chord wins
    expect(detectKey([maj('Gb'), maj('Db'), min('Eb'), min('Ab')])).toBe('Gb');
  });

  it('T9-c default: detectKey([F#, C#, D#m, B]) === F# (default fSharpOrGFlat = f-sharp)', () => {
    expect(detectKey([maj('F#'), maj('C#'), min('D#'), maj('B')])).toBe('F#');
  });

  it('T9-c config: fSharpOrGFlat g-flat overrides spelling preference → Gb', () => {
    const cfg: DetectKeyConfig = { fSharpOrGFlat: 'g-flat' };
    expect(detectKey([maj('F#'), maj('C#'), min('D#'), maj('B')], null, cfg)).toBe('Gb');
  });
});

describe('detectKey — ending-key-wins: cadential tonic overrides global winner', () => {
  it('Whisper Not A-section: opens in Gm, cadences A7→Dm → Dm', () => {
    expect(detectKey([min('C'), dom7('D'), min('G'), dom7('A'), min('D')])).toBe('Dm');
  });

  it('last chord G is V, not a tonic match — C major stays', () => {
    expect(detectKey([min('A'), maj('F'), maj('C'), maj('G')])).toBe('C');
  });

  it('last chord Am → minor wins over C major', () => {
    expect(detectKey([maj('C'), min('A'), maj('F'), min('A')])).toBe('Am');
  });
});

describe('detectKey — tetrad quality disambiguation', () => {
  it('Cmaj7/Gmaj7 alternation → G (Gmaj7=I scores better than Gmaj7=V of C)', () => {
    // In G major both Cmaj7(IV) and Gmaj7(I) match maj7 quality; in C major Gmaj7 misses V set {major,dominant7}
    expect(detectKey([maj7('C'), maj7('G'), maj7('C'), maj7('G')])).toBe('G');
  });

  it('Cmaj7/G7 alternation → C (Cmaj7=I, G7=V; G7 misses I-maj7 set of G)', () => {
    expect(detectKey([maj7('C'), dom7('G'), maj7('C'), dom7('G')])).toBe('C');
  });

  it('ii-V-I-vi in C with tetrads → C', () => {
    expect(detectKey([min7('D'), dom7('G'), maj7('C'), min7('A')])).toBe('C');
  });

  it('ii-V-I in D major with tetrads → D', () => {
    expect(detectKey([min7('E'), dom7('A'), maj7('D')])).toBe('D');
  });

  it('iiø-V7-i in A harmonic minor with tetrads → Am', () => {
    expect(detectKey([hd('B'), dom7('E'), min7('A')])).toBe('Am');
  });

  it('Am harmonic minor with G#dim7 (VIIdim7) as dominant substitute → Am', () => {
    expect(detectKey([min7('A'), min7('D'), dim7('G#'), min7('A')])).toBe('Am');
  });
});

describe('detectKey — G#m/Abm enharmonic tiebreak', () => {
  it('sharp-spelled roots → G#m', () => {
    expect(detectKey([min('G#'), dom7('D#'), min('G#')])).toBe('G#m');
  });

  it('flat-spelled roots → Abm', () => {
    expect(detectKey([min('Ab'), dom7('Eb'), min('Ab')])).toBe('Abm');
  });
});

describe('detectKey — D#m/Ebm enharmonic tiebreak', () => {
  it('sharp-spelled roots → D#m', () => {
    expect(detectKey([min('D#'), dom7('A#'), min('D#')])).toBe('D#m');
  });

  it('flat-spelled roots → Ebm', () => {
    expect(detectKey([min('Eb'), dom7('Bb'), min('Eb')])).toBe('Ebm');
  });
});
