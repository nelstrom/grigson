import { describe, it, expect } from 'vitest';
import { analyseHarmony, circleOfFifthsDistance, analyseSong } from './harmonicAnalysis.js';
import type { Chord, Song, Bar, Row, Section, SourceRange } from '../parser/types.js';

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

describe('analyseHarmony — aeolian bVII → i cadence', () => {
  it('D→Em in E aeolian: assigns both to E aeolian', () => {
    const result = analyseHarmony([maj('D'), min('E')], 'E aeolian');
    expect(result[0].currentKey).toBe('E aeolian'); // D — bVII, cadence
    expect(result[1].currentKey).toBe('E aeolian'); // Em — i, cadence
  });

  it('G→Am in A aeolian: assigns both to A aeolian', () => {
    const result = analyseHarmony([maj('G'), min('A')], 'A aeolian');
    expect(result[0].currentKey).toBe('A aeolian'); // G — bVII
    expect(result[1].currentKey).toBe('A aeolian'); // Am — i
  });

  it('F→C in C major: IV→I does NOT trigger aeolian cadence (gate check)', () => {
    const result = analyseHarmony([maj('F'), maj('C'), maj('G')], 'C');
    expect(result[0].currentKey).toBe('C');
    expect(result[1].currentKey).toBe('C');
    expect(result[2].currentKey).toBe('C');
  });
});

describe('analyseHarmony — mixolydian bVII → I cadence', () => {
  it('C→D in D mixolydian: assigns both to D mixolydian', () => {
    const result = analyseHarmony([maj('C'), maj('D')], 'D mixolydian');
    expect(result[0].currentKey).toBe('D mixolydian'); // C — bVII
    expect(result[1].currentKey).toBe('D mixolydian'); // D — I
  });

  it('F→G in G mixolydian: assigns both to G mixolydian', () => {
    const result = analyseHarmony([maj('F'), maj('G')], 'G mixolydian');
    expect(result[0].currentKey).toBe('G mixolydian'); // F — bVII
    expect(result[1].currentKey).toBe('G mixolydian'); // G — I
  });

  it('F→Gm does NOT trigger mixolydian bVII→I (tonic must be major)', () => {
    // In G mixolydian, I is major; Gm should not trigger the pattern
    const result = analyseHarmony([maj('F'), min('G')], 'G mixolydian');
    expect(result[0].currentKey).toBe('G mixolydian'); // F is diatonic to G mixolydian
    expect(result[1].currentKey).toBe('G mixolydian'); // Gm is diatonic to G mixolydian
  });
});

describe('analyseHarmony — dorian plagal cadence', () => {
  it('G→Dm in D dorian: plagal cadence assigns both to D dorian', () => {
    // G is IV of D dorian (D tonic, IV = G); Dm is the dorian i
    const result = analyseHarmony([maj('G'), min('D'), maj('C'), min('D')], 'D dorian');
    expect(result[0].currentKey).toBe('D dorian'); // G — IV, plagal cadence
    expect(result[1].currentKey).toBe('D dorian'); // Dm — i, plagal cadence
    expect(result[2].currentKey).toBe('D dorian'); // C — diatonic homeKey
    expect(result[3].currentKey).toBe('D dorian'); // Dm — diatonic homeKey
  });

  it('A→Em in E dorian: plagal cadence assigns both to E dorian', () => {
    // A is IV of E dorian (E tonic, IV = A); Em is the dorian i
    const result = analyseHarmony([maj('A'), min('E'), maj('D'), min('E')], 'E dorian');
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
    const result = analyseHarmony([maj('C'), maj('G'), min('A'), maj('F'), min('E')], 'C');
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

// ─── Helpers for analyseSong tests ───────────────────────────────────────────

function makeBar(chords: Chord[], hints?: Bar['tonalityHints']): Bar {
  return {
    type: 'bar',
    slots: chords.map((chord) => ({ type: 'chord' as const, chord })),
    closeBarline: { kind: 'single' },
    ...(hints ? { tonalityHints: hints } : {}),
  };
}

function makeRow(bars: Bar[]): Row {
  return {
    type: 'row',
    openBarline: { kind: 'single' },
    bars,
  };
}

function makeSection(rows: Row[], key?: string | null, label?: string | null): Section {
  return {
    type: 'section',
    label: label ?? null,
    key: key ?? null,
    rows,
  };
}

function makeSong(sections: Section[], key?: string | null): Song {
  return {
    type: 'song',
    title: null,
    key: key ?? null,
    meter: null,
    sections,
  };
}

// ─── analyseSong tests ────────────────────────────────────────────────────────

describe('AnnotatedChord.loc propagation', () => {
  it('loc is copied from chord.loc via annotate()', () => {
    const loc: SourceRange = { start: { line: 1, character: 2 }, end: { line: 1, character: 3 } };
    const chord: Chord = { type: 'chord', root: 'C', quality: 'major', loc };
    const [annotated] = analyseHarmony([chord], 'C');
    expect(annotated.loc).toEqual(loc);
  });

  it('loc is copied from chord.loc via borrowed-chord branch', () => {
    const loc: SourceRange = { start: { line: 1, character: 5 }, end: { line: 1, character: 7 } };
    // Ab is a borrowed chord in C major (non-diatonic)
    const chord: Chord = { type: 'chord', root: 'Ab', quality: 'major', loc };
    const [, annotated] = analyseHarmony([maj('C'), chord], 'C');
    expect(annotated.loc).toEqual(loc);
  });

  it('loc is undefined when chord has no loc', () => {
    const chord: Chord = { type: 'chord', root: 'C', quality: 'major' };
    const [annotated] = analyseHarmony([chord], 'C');
    expect(annotated.loc).toBeUndefined();
  });
});

describe('analyseSong — tree structure', () => {
  it('produces AnnotatedChordSlots at leaves', () => {
    const chord = maj('C');
    const song = makeSong([makeSection([makeRow([makeBar([chord])])])], 'C major');
    const result = analyseSong(song);

    const slot = result.sections[0].rows[0].bars[0].slots[0];
    expect(slot.type).toBe('chord');
    if (slot.type === 'chord') {
      expect(slot.chord.chord).toBe(chord);
      expect(slot.chord.homeKey).toBe('C major');
      expect(slot.chord.currentKey).toBe('C major');
    }
  });

  it('preserves DotSlots unchanged', () => {
    const bar: Bar = {
      type: 'bar',
      slots: [{ type: 'chord', chord: maj('C') }, { type: 'dot' }],
      closeBarline: { kind: 'single' },
    };
    const song = makeSong([makeSection([makeRow([bar])])], 'C major');
    const result = analyseSong(song);

    const slots = result.sections[0].rows[0].bars[0].slots;
    expect(slots[0].type).toBe('chord');
    expect(slots[1].type).toBe('dot');
  });

  it('song type and metadata are preserved', () => {
    const song = makeSong([], 'G major');
    song.title = 'Test Song';
    song.meter = '4/4';
    const result = analyseSong(song);
    expect(result.type).toBe('song');
    expect(result.title).toBe('Test Song');
    expect(result.key).toBe('G major');
    expect(result.meter).toBe('4/4');
  });
});

describe('analyseSong — per-section homeKey', () => {
  it('sections with different keys each get the correct homeKey', () => {
    const sectionC = makeSection([makeRow([makeBar([maj('C')])])], 'C major', 'Verse');
    const sectionF = makeSection([makeRow([makeBar([maj('F')])])], 'F major', 'Chorus');
    const song = makeSong([sectionC, sectionF], 'C major');
    const result = analyseSong(song);

    const cSlot = result.sections[0].rows[0].bars[0].slots[0];
    const fSlot = result.sections[1].rows[0].bars[0].slots[0];
    expect(cSlot.type).toBe('chord');
    expect(fSlot.type).toBe('chord');
    if (cSlot.type === 'chord') expect(cSlot.chord.homeKey).toBe('C major');
    if (fSlot.type === 'chord') expect(fSlot.chord.homeKey).toBe('F major');
  });

  it('section inherits song key when section.key is null', () => {
    const section = makeSection([makeRow([makeBar([maj('G')])])], null);
    const song = makeSong([section], 'D major');
    const result = analyseSong(song);

    const slot = result.sections[0].rows[0].bars[0].slots[0];
    expect(slot.type).toBe('chord');
    if (slot.type === 'chord') expect(slot.chord.homeKey).toBe('D major');
  });

  it('falls back to C major when both section and song key are null', () => {
    const section = makeSection([makeRow([makeBar([maj('C')])])], null);
    const song = makeSong([section], null);
    const result = analyseSong(song);

    const slot = result.sections[0].rows[0].bars[0].slots[0];
    expect(slot.type).toBe('chord');
    if (slot.type === 'chord') expect(slot.chord.homeKey).toBe('C major');
  });
});

describe('analyseSong — tonality hint override', () => {
  it('hint overrides currentKey for subsequent chords', () => {
    // Bar: {Ab major} C (chord at slot 0, hint before it)
    const bar = makeBar([maj('C')], [{ beforeSlotIndex: 0, key: 'Ab major' }]);
    const song = makeSong([makeSection([makeRow([bar])])], 'C major');
    const result = analyseSong(song);

    const slot = result.sections[0].rows[0].bars[0].slots[0];
    expect(slot.type).toBe('chord');
    // C is analysed in context of Ab major (as a borrowed chord from Ab major's region)
    if (slot.type === 'chord') {
      expect(slot.chord.homeKey).toBe('Ab major');
    }
  });

  it('hint persists across bar boundaries', () => {
    // Bar 1: {Ab major} C  —  Bar 2: C (no reset, so still Ab major)
    const bar1 = makeBar([maj('C')], [{ beforeSlotIndex: 0, key: 'Ab major' }]);
    const bar2 = makeBar([maj('Eb')]);
    const song = makeSong([makeSection([makeRow([bar1, bar2])])], 'C major');
    const result = analyseSong(song);

    const slot1 = result.sections[0].rows[0].bars[0].slots[0];
    const slot2 = result.sections[0].rows[0].bars[1].slots[0];
    expect(slot1.type).toBe('chord');
    expect(slot2.type).toBe('chord');
    if (slot1.type === 'chord') expect(slot1.chord.homeKey).toBe('Ab major');
    if (slot2.type === 'chord') expect(slot2.chord.homeKey).toBe('Ab major');
  });

  it('{} resets to section home key', () => {
    // Bar 1: {Ab major} Ab  Bar 2: {} C (reset to home)
    const bar1 = makeBar([maj('Ab')], [{ beforeSlotIndex: 0, key: 'Ab major' }]);
    const bar2 = makeBar([maj('C')], [{ beforeSlotIndex: 0, key: '' }]);
    const song = makeSong([makeSection([makeRow([bar1, bar2])])], 'C major');
    const result = analyseSong(song);

    const slot2 = result.sections[0].rows[0].bars[1].slots[0];
    expect(slot2.type).toBe('chord');
    if (slot2.type === 'chord') expect(slot2.chord.homeKey).toBe('C major');
  });

  it('section boundary resets key — hint from section A does not affect section B', () => {
    // Section A: {Ab major} Ab  Section B: C (should use song key)
    const bar1 = makeBar([maj('Ab')], [{ beforeSlotIndex: 0, key: 'Ab major' }]);
    const sectionA = makeSection([makeRow([bar1])], null);
    const bar2 = makeBar([maj('C')]);
    const sectionB = makeSection([makeRow([bar2])], null);
    const song = makeSong([sectionA, sectionB], 'C major');
    const result = analyseSong(song);

    const slotB = result.sections[1].rows[0].bars[0].slots[0];
    expect(slotB.type).toBe('chord');
    if (slotB.type === 'chord') {
      expect(slotB.chord.homeKey).toBe('C major');
    }
  });

  it('mid-bar hint applies from that slot index onward', () => {
    // Bar: C {Ab major} Ab  — hint is beforeSlotIndex: 1
    const bar = makeBar([maj('C'), maj('Ab')], [{ beforeSlotIndex: 1, key: 'Ab major' }]);
    const song = makeSong([makeSection([makeRow([bar])])], 'C major');
    const result = analyseSong(song);

    const slots = result.sections[0].rows[0].bars[0].slots;
    expect(slots[0].type).toBe('chord');
    expect(slots[1].type).toBe('chord');
    if (slots[0].type === 'chord') {
      // First chord is in C major region
      expect(slots[0].chord.homeKey).toBe('C major');
    }
    if (slots[1].type === 'chord') {
      // Second chord is in Ab major region
      expect(slots[1].chord.homeKey).toBe('Ab major');
    }
  });
});

describe('currentKeyCandidates — passage-level ambiguity', () => {
  it('ambiguous diatonic passage: F C F C in F includes both F and C as candidates, F first', () => {
    // F and C major both score 8/8 for this passage (every chord diatonic + quality in both keys).
    // Several other keys (A aeolian, D dorian, G mixolydian) also tie — we only assert the key
    // facts: F and C are present, and F (homeKey, CoF distance 0) sorts before C (distance 1).
    const result = analyseHarmony([maj('F'), maj('C'), maj('F'), maj('C')], 'F');
    for (const annotated of result) {
      expect(annotated.currentKeyCandidates).toContain('F');
      expect(annotated.currentKeyCandidates).toContain('C');
      // F is the homeKey — CoF distance 0 — must sort before C (distance 1)
      expect(annotated.currentKeyCandidates[0]).toBe('F');
      const fIdx = annotated.currentKeyCandidates.indexOf('F');
      const cIdx = annotated.currentKeyCandidates.indexOf('C');
      expect(fIdx).toBeLessThan(cIdx);
    }
  });

  it('unambiguous passage: G7 makes C the sole highest-scoring key', () => {
    // G7 as dominant7 only earns full 2pts in C major (V7 quality match).
    // In all other keys containing G, the dominant7 quality mismatches → those keys score < 8.
    // Result: passageCandidates = ['C'] for every chord.
    const result = analyseHarmony([maj('C'), min('A'), min('D'), dom7('G')], 'C');
    for (const annotated of result) {
      expect(annotated.currentKeyCandidates).toEqual(['C']);
    }
  });

  it('homeKey sorts before equally-distant candidates: F C with homeKey C has C before F', () => {
    // C and F major both score 4/4 here. C has CoF distance 0 from homeKey C; F has distance 1.
    // (Other keys like A aeolian / D dorian / G mixolydian also tie but all have distance 0.)
    // Assert: both 'C' and 'F' are present, and 'C' precedes 'F'.
    const result = analyseHarmony([maj('F'), maj('C')], 'C');
    for (const annotated of result) {
      expect(annotated.currentKeyCandidates).toContain('C');
      expect(annotated.currentKeyCandidates).toContain('F');
      const cIdx = annotated.currentKeyCandidates.indexOf('C');
      const fIdx = annotated.currentKeyCandidates.indexOf('F');
      expect(cIdx).toBeLessThan(fIdx);
    }
  });

  it('pattern chords (2-5-1) are unaffected: each gets [resolvedKey]', () => {
    // The 2-5-1 pattern consumes all three chords via annotate(), which hardcodes
    // currentKeyCandidates: [currentKey]. passageCandidates is never consulted.
    const result = analyseHarmony([min('D'), dom7('G'), maj('C')], 'C');
    for (const annotated of result) {
      expect(annotated.currentKeyCandidates).toEqual(['C']);
    }
  });
});
