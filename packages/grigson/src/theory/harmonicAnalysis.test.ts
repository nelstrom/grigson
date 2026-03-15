import { describe, it, expect } from 'vitest';
import { analyseHarmony, circleOfFifthsDistance } from './harmonicAnalysis.js';
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

describe('analyseHarmony', () => {
  it('all diatonic chords get homeKey when no patterns present', () => {
    const result = analyseHarmony([maj('C'), maj('F'), maj('G'), maj('C')], 'C');
    expect(result.map((a) => a.currentKey)).toEqual(['C', 'C', 'C', 'C']);
    expect(result.every((a) => a.homeKey === 'C')).toBe(true);
  });

  it('5-1: A7→Dm assigns both to Dm; G7→C assigns both to C', () => {
    const result = analyseHarmony([maj('C'), dom7('A'), min('D'), dom7('G'), maj('C')], 'C');
    expect(result[0].currentKey).toBe('C'); // C — no pattern
    expect(result[1].currentKey).toBe('Dm'); // A7 — V7 of Dm
    expect(result[2].currentKey).toBe('Dm'); // Dm — resolved tonic
    expect(result[3].currentKey).toBe('C'); // G7 — V7 of C
    expect(result[4].currentKey).toBe('C'); // C — resolved tonic
  });

  it('2-5-1: Bbm-Eb7-Abmaj7 assigned to Ab; G7-C assigned to C', () => {
    const result = analyseHarmony(
      [maj('C'), min('Bb'), dom7('Eb'), maj('Ab'), dom7('G'), maj('C')],
      'C',
    );
    expect(result[0].currentKey).toBe('C'); // C — no pattern
    expect(result[1].currentKey).toBe('Ab'); // Bbm — ii of Ab
    expect(result[2].currentKey).toBe('Ab'); // Eb7 — V7 of Ab
    expect(result[3].currentKey).toBe('Ab'); // Ab — I of Ab
    expect(result[4].currentKey).toBe('C'); // G7 — V7 of C
    expect(result[5].currentKey).toBe('C'); // C — I of C
  });

  it('2-5-1 in Db: Ebm-Ab7-Dbmaj7 assigned to Db', () => {
    const result = analyseHarmony(
      [maj('F'), min('Eb'), dom7('Ab'), maj('Db'), dom7('C'), maj('F')],
      'F',
    );
    expect(result[0].currentKey).toBe('F'); // F — no pattern
    expect(result[1].currentKey).toBe('Db'); // Ebm — ii of Db
    expect(result[2].currentKey).toBe('Db'); // Ab7 — V7 of Db
    expect(result[3].currentKey).toBe('Db'); // Db — I of Db
    expect(result[4].currentKey).toBe('F'); // C7 — V7 of F
    expect(result[5].currentKey).toBe('F'); // F — I of F
  });

  it('2-5-1 takes priority over 5-1 when patterns overlap at the same position', () => {
    // Dm-G7-C forms a 2-5-1 in C. With 2-5-1 priority, Dm also gets currentKey='C'.
    // Without it, only G7 and C would get 'C'; Dm would get homeKey='F'.
    const result = analyseHarmony([maj('F'), min('D'), dom7('G'), maj('C'), maj('F')], 'F');
    expect(result[1].currentKey).toBe('C'); // Dm — ii in 2-5-1 (not homeKey)
    expect(result[2].currentKey).toBe('C'); // G7 — V7 of C
    expect(result[3].currentKey).toBe('C'); // C — I of C
  });

  it('half-diminished ii works in 2-5-1', () => {
    // Bm7b5-E7-Am is a classic minor 2-5-1 in Am
    const result = analyseHarmony([hd('B'), dom7('E'), min('A')], 'C');
    expect(result[0].currentKey).toBe('Am');
    expect(result[1].currentKey).toBe('Am');
    expect(result[2].currentKey).toBe('Am');
  });

  it('homeKey is always preserved on each AnnotatedChord', () => {
    const result = analyseHarmony([maj('C'), dom7('G'), maj('C')], 'C');
    expect(result.every((a) => a.homeKey === 'C')).toBe(true);
  });
});

describe('analyseHarmony — tetrad quality support', () => {
  function min7(root: string): Chord {
    return { type: 'chord', root, quality: 'min7' };
  }
  function maj7(root: string): Chord {
    return { type: 'chord', root, quality: 'maj7' };
  }
  function dim(root: string): Chord {
    return { type: 'chord', root, quality: 'diminished' };
  }

  it('2-5-1 with min7 ii: Dm7-G7-Cmaj7 all assigned to C', () => {
    const result = analyseHarmony([min7('D'), dom7('G'), maj7('C')], 'C');
    expect(result[0].currentKey).toBe('C');
    expect(result[1].currentKey).toBe('C');
    expect(result[2].currentKey).toBe('C');
  });

  it('2-5-1 with halfDim ii and min7 I: Bm7b5-E7-Am7 all assigned to Am', () => {
    const result = analyseHarmony([hd('B'), dom7('E'), min7('A')], 'Am');
    expect(result[0].currentKey).toBe('Am');
    expect(result[1].currentKey).toBe('Am');
    expect(result[2].currentKey).toBe('Am');
  });

  it('5-1 with maj7 I: G7-Cmaj7 both assigned to C', () => {
    const result = analyseHarmony([dom7('G'), maj7('C')], 'C');
    expect(result[0].currentKey).toBe('C');
    expect(result[1].currentKey).toBe('C');
  });

  it('2-5-1 with diminished ii: Bdim-E7-Am all assigned to Am', () => {
    const result = analyseHarmony([dim('B'), dom7('E'), min('A')], 'Am');
    expect(result[0].currentKey).toBe('Am');
    expect(result[1].currentKey).toBe('Am');
    expect(result[2].currentKey).toBe('Am');
  });
});

describe('analyseHarmony — dorian plagal cadence', () => {
  it('G→Dm in D dorian: plagal cadence assigns both to D dorian', () => {
    // G is IV of D dorian (D tonic, IV = G); Dm is the dorian i
    const result = analyseHarmony(
      [maj('G'), min('D'), maj('C'), min('D')],
      'D dorian',
    );
    expect(result[0].currentKey).toBe('D dorian'); // G — IV, plagal cadence
    expect(result[1].currentKey).toBe('D dorian'); // Dm — i, plagal cadence
    expect(result[2].currentKey).toBe('D dorian'); // C — diatonic homeKey
    expect(result[3].currentKey).toBe('D dorian'); // Dm — diatonic homeKey
  });

  it('A→Em in E dorian: plagal cadence assigns both to E dorian', () => {
    // A is IV of E dorian (E tonic, IV = A); Em is the dorian i
    const result = analyseHarmony(
      [maj('A'), min('E'), maj('D'), min('E')],
      'E dorian',
    );
    expect(result[0].currentKey).toBe('E dorian'); // A — IV, plagal cadence
    expect(result[1].currentKey).toBe('E dorian'); // Em — i, plagal cadence
    expect(result[2].currentKey).toBe('E dorian'); // D — diatonic homeKey
    expect(result[3].currentKey).toBe('E dorian'); // Em — diatonic homeKey
  });

  it('F→C in C major: IV→I does NOT trigger dorian plagal cadence (gate check)', () => {
    // F→C is diatonic in C major; no dorian pattern should fire
    const result = analyseHarmony([maj('F'), maj('C'), maj('G')], 'C');
    expect(result[0].currentKey).toBe('C');
    expect(result[1].currentKey).toBe('C');
    expect(result[2].currentKey).toBe('C');
  });
});

describe('analyseHarmony — dorian home key', () => {
  it('all diatonic chords in E dorian get currentKey E dorian', () => {
    // E dorian: E F# G A B C# D — Em, A, D, Em are all diatonic
    const result = analyseHarmony(
      [
        { type: 'chord', root: 'E', quality: 'minor' },
        { type: 'chord', root: 'A', quality: 'major' },
        { type: 'chord', root: 'D', quality: 'major' },
        { type: 'chord', root: 'E', quality: 'minor' },
      ],
      'E dorian',
    );
    expect(result.map((a) => a.currentKey)).toEqual([
      'E dorian',
      'E dorian',
      'E dorian',
      'E dorian',
    ]);
    expect(result.every((a) => a.homeKey === 'E dorian')).toBe(true);
  });
});

describe('circle-of-fifths fallback for isolated borrowed chords', () => {
  it('isolated bVI: Ab in C major gets currentKey from closest key containing Ab', () => {
    // Ab is not diatonic to C major; closest keys by CoF are Eb and Cm (both distance 3).
    // Parallel minor (Cm) is preferred when tied.
    const result = analyseHarmony([maj('C'), maj('Ab'), maj('G')], 'C');
    expect(result[0].currentKey).toBe('C');
    expect(['Cm', 'Ab']).toContain(result[1].currentKey);
    expect(result[2].currentKey).toBe('C');
  });

  it('isolated bVII: Bb in C major gets currentKey = F (1 step from C on the circle)', () => {
    const result = analyseHarmony([maj('C'), maj('Bb'), maj('F'), maj('G')], 'C');
    expect(result[0].currentKey).toBe('C');
    expect(result[1].currentKey).toBe('F');
    expect(result[2].currentKey).toBe('C'); // F is diatonic to C
    expect(result[3].currentKey).toBe('C'); // G is diatonic to C
  });

  it('isolated Bb7 in C major gets currentKey = F (closest key containing Bb)', () => {
    const result = analyseHarmony([maj('C'), dom7('Bb'), maj('C')], 'C');
    expect(result[0].currentKey).toBe('C');
    expect(result[1].currentKey).toBe('F');
    expect(result[2].currentKey).toBe('C');
  });

  it('diatonic chords always keep homeKey regardless of circle-of-fifths logic', () => {
    // G, Am, F, Em are all diatonic to C major
    const result = analyseHarmony(
      [maj('C'), maj('G'), min('A'), maj('F'), min('E')],
      'C',
    );
    expect(result.every((a) => a.currentKey === 'C')).toBe(true);
  });

  it('circleOfFifthsDistance returns correct distances', () => {
    expect(circleOfFifthsDistance('C', 'C')).toBe(0);
    expect(circleOfFifthsDistance('C', 'G')).toBe(1);
    expect(circleOfFifthsDistance('C', 'F')).toBe(1);
    expect(circleOfFifthsDistance('C', 'Bb')).toBe(2);
    expect(circleOfFifthsDistance('C', 'Eb')).toBe(3);
    expect(circleOfFifthsDistance('C', 'Ab')).toBe(4);
    // Minor keys use relative major position
    expect(circleOfFifthsDistance('C', 'Am')).toBe(0); // Am relative of C
    expect(circleOfFifthsDistance('C', 'Dm')).toBe(1); // Dm relative of F
    expect(circleOfFifthsDistance('C', 'Cm')).toBe(3); // Cm relative of Eb
    // Dorian keys use relative major position (same as minor keys)
    expect(circleOfFifthsDistance('E dorian', 'D')).toBe(0); // E dorian relative is D
    expect(circleOfFifthsDistance('E dorian', 'G')).toBe(1); // G is 1 step from D on COF
    expect(circleOfFifthsDistance('E dorian', 'C')).toBe(2); // C is 2 steps from D on COF
  });
});
