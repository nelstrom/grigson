import { describe, it, expect } from 'vitest';
import { normaliseSong, normaliseSection } from './normalise.js';
import type { Song, Chord, Bar, Row, Section, ChordSlot } from '../parser/types.js';

function ch(root: string, quality: Chord['quality'] = 'major'): Chord {
  return { type: 'chord', root, quality };
}

function bar(c: Chord, timeSignature?: { numerator: number; denominator: number }): Bar {
  const b: Bar = {
    type: 'bar',
    slots: [{ type: 'chord', chord: c }],
    closeBarline: { kind: 'single' },
  };
  if (timeSignature) b.timeSignature = timeSignature;
  return b;
}

function barWithTS(c: Chord, numerator: number, denominator: number): Bar {
  return bar(c, { numerator, denominator });
}

function row(...chords: Chord[]): Row {
  return { type: 'row', openBarline: { kind: 'single' }, bars: chords.map((c) => bar(c)) };
}

function section(rows: Row[], label: string | null = null): Section {
  return { type: 'section', label, rows };
}

function song(rows: Row[], key: string | null = null, title: string | null = null): Song {
  return { type: 'song', title, key, meter: null, sections: [section(rows)] };
}

function chordOf(b: Bar): Chord {
  const slot = b.slots[0] as ChordSlot;
  return slot.chord;
}

describe('normaliseSong — Category 2: enharmonic correction of diatonic chord roots', () => {
  it('T2-a: A# → Bb in F major', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('C'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('F');
    expect(chordOf(bars[1]).root).toBe('Bb');
    expect(chordOf(bars[2]).root).toBe('F');
    expect(chordOf(bars[3]).root).toBe('C');
  });

  it('T2-b: D# → Eb in Bb major', () => {
    const s = song([row(ch('Bb'), ch('D#'), ch('F'), ch('Bb'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('Eb');
  });

  it('T2-c: A# → Bb across two rows in F major', () => {
    const s = song([row(ch('F'), ch('A#'), ch('C')), row(ch('A#'), ch('F'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('Bb');
    expect(chordOf(result.sections[0].rows[1].bars[0]).root).toBe('Bb');
  });

  it('T2-d: A# → Bb; existing Bb left unchanged', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('Bb'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('Bb');
    expect(chordOf(result.sections[0].rows[0].bars[3]).root).toBe('Bb');
  });

  it('T2-e: C# F# G# C# → Db Gb Ab Db in Db major', () => {
    const s = song([row(ch('C#'), ch('F#'), ch('G#'), ch('C#'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('Db');
    expect(chordOf(bars[1]).root).toBe('Gb');
    expect(chordOf(bars[2]).root).toBe('Ab');
    expect(chordOf(bars[3]).root).toBe('Db');
  });

  it('T2-f: D# A# F D# → Eb Bb F Eb in Bb major', () => {
    const s = song([row(ch('D#'), ch('A#'), ch('F'), ch('D#'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('Eb');
    expect(chordOf(bars[1]).root).toBe('Bb');
    expect(chordOf(bars[2]).root).toBe('F');
    expect(chordOf(bars[3]).root).toBe('Eb');
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

describe('normaliseSong — harmonic-analysis-based spelling', () => {
  it('2-5-1 Bbm-Eb7-Ab in C: roots spelled Bb, Eb, Ab (not A#m, D#7, G#)', () => {
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
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[1]).root).toBe('Bb'); // not A#
    expect(chordOf(bars[2]).root).toBe('Eb'); // not D#
    expect(chordOf(bars[3]).root).toBe('Ab'); // not G#
  });

  it("2-5-1 Ebm-Ab7-Db in F (What's New B): roots spelled Eb, Ab, Db", () => {
    const s = song([
      row(
        ch('F'),
        ch('Eb', 'minor'),
        ch('Ab', 'dominant7'),
        ch('Db'),
        ch('C', 'dominant7'),
        ch('F'),
      ),
    ]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[1]).root).toBe('Eb');
    expect(chordOf(bars[2]).root).toBe('Ab');
    expect(chordOf(bars[3]).root).toBe('Db');
  });

  it('borrowed bVII Bb in C: stays Bb (not A#)', () => {
    const s = song([row(ch('C'), ch('Bb'), ch('F'), ch('G'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('Bb');
  });

  it('A7 secondary dominant in C: root A not rewritten', () => {
    const s = song([
      row(ch('C'), ch('A', 'dominant7'), ch('D', 'minor'), ch('G', 'dominant7'), ch('C')),
    ]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('A');
  });

  it('Dm7b5-G7-Am-Am: root D not mangled (not C##)', () => {
    const s = song([
      row(ch('D', 'halfDiminished'), ch('G', 'dominant7'), ch('A', 'minor'), ch('A', 'minor')),
    ]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[0]).root).toBe('D');
  });
});

describe('normaliseSong — Category 8: borrowed chords and secondary dominants', () => {
  it('T8-a: Eb7 as V7 of Ab stays Eb7 (not rewritten to D#7)', () => {
    const s = song([row(ch('F'), ch('Bb'), ch('Eb', 'dominant7'), ch('Ab'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[2]).root).toBe('Eb');
  });

  it('T8-b: A7 (secondary dominant V7/ii in C major) root stays A', () => {
    const s = song([
      row(ch('C'), ch('A', 'dominant7'), ch('Dm', 'minor'), ch('G', 'dominant7'), ch('C')),
    ]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('A');
  });

  it('T8-c: Bb borrowed bVII in C major stays Bb (not rewritten to A#)', () => {
    const s = song([row(ch('C'), ch('Bb'), ch('F'), ch('C'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('Bb');
  });

  it('T8-d: Ab and Bb borrowed bVI/bVII in C major; both flat spellings preserved', () => {
    const s = song([row(ch('C'), ch('G'), ch('Ab'), ch('Bb'), ch('C'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[2]).root).toBe('Ab');
    expect(chordOf(result.sections[0].rows[0].bars[3]).root).toBe('Bb');
  });
});

describe('normaliseSong — Category 5: front matter key field read and write', () => {
  it('T5-a: correct key: F preserved; no chord changes', () => {
    const s = song([row(ch('F'), ch('Bb'), ch('C'), ch('F'))], 'F');
    const result = normaliseSong(s);
    expect(result.key).toBe('F major');
    expect(chordOf(result.sections[0].rows[0].bars[0]).root).toBe('F');
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('Bb');
  });

  it('T5-b: wrong key: G corrected to F', () => {
    const s = song([row(ch('F'), ch('Bb'), ch('C'), ch('F'))], 'G');
    const result = normaliseSong(s);
    expect(result.key).toBe('F major');
  });

  it('T5-c: no key in front matter; key: G added', () => {
    const s = song([row(ch('G'), ch('D'), ch('Em', 'minor'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result.key).toBe('G major');
  });

  it('T5-d: wrong key: C corrected to F (Bb and Gm not diatonic to C)', () => {
    const s = song([row(ch('Bb'), ch('F'), ch('C'), ch('Gm', 'minor'))], 'C');
    const result = normaliseSong(s);
    expect(result.key).toBe('F major');
  });
});

describe('normaliseSong — chord-qualities smoke tests', () => {
  it('Dm7 G7 Cmaj7 in C: all roots already correct, no rewrites', () => {
    const s = song([row(ch('D', 'min7'), ch('G', 'dominant7'), ch('C', 'maj7'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('D');
    expect(chordOf(bars[0]).quality).toBe('min7');
    expect(chordOf(bars[1]).root).toBe('G');
    expect(chordOf(bars[1]).quality).toBe('dominant7');
    expect(chordOf(bars[2]).root).toBe('C');
    expect(chordOf(bars[2]).quality).toBe('maj7');
    expect(result.key).toBe('C major');
  });

  it('D#m7 G#7 C#maj7: detected key Db, roots rewritten to Ebm7 Ab7 Dbmaj7', () => {
    const s = song([row(ch('D#', 'min7'), ch('G#', 'dominant7'), ch('C#', 'maj7'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('Eb');
    expect(chordOf(bars[0]).quality).toBe('min7');
    expect(chordOf(bars[1]).root).toBe('Ab');
    expect(chordOf(bars[1]).quality).toBe('dominant7');
    expect(chordOf(bars[2]).root).toBe('Db');
    expect(chordOf(bars[2]).quality).toBe('maj7');
    expect(result.key).toBe('Db major');
  });

  it('Bm7b5 E7 Am7: identifies Am, all roots unchanged', () => {
    const s = song([row(ch('B', 'halfDiminished'), ch('E', 'dominant7'), ch('A', 'min7'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('B');
    expect(chordOf(bars[1]).root).toBe('E');
    expect(chordOf(bars[2]).root).toBe('A');
    expect(result.key).toBe('A minor');
  });

  it('Am7 Dm7 G#dim7 Am7: identifies Am, G# (raised VII) preserved as G#', () => {
    const s = song([row(ch('A', 'min7'), ch('D', 'min7'), ch('G#', 'dim7'), ch('A', 'min7'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('A');
    expect(chordOf(bars[1]).root).toBe('D');
    expect(chordOf(bars[2]).root).toBe('G#');
    expect(chordOf(bars[2]).quality).toBe('dim7');
    expect(chordOf(bars[3]).root).toBe('A');
    expect(result.key).toBe('A minor');
  });
});

describe('normaliseSong — exotic minor key normalisation (G#m/Abm and D#m/Ebm)', () => {
  it('chart in G#m: Ab chord (wrong spelling of G#) rewritten to G#', () => {
    // G#m = [G#, A#, B, C#, D#, E, G]; V7 = D#7 disambiguates from F# major
    // Input has 'Ab' (enharmonic G#) which should be normalised to 'G#'
    const s = song([
      row(ch('Ab', 'minor'), ch('C#', 'minor'), ch('D#', 'dominant7'), ch('G#', 'minor')),
    ]);
    const result = normaliseSong(s);
    expect(result.key).toBe('G# minor');
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('G#'); // Ab → G#
    expect(chordOf(bars[1]).root).toBe('C#');
    expect(chordOf(bars[2]).root).toBe('D#');
    expect(chordOf(bars[3]).root).toBe('G#');
  });

  it('chart in Abm: G# chord (wrong spelling of Ab) rewritten to Ab', () => {
    // Abm = [Ab, Bb, Cb, Db, Eb, Fb, G]; forceKey used because G#m/Abm
    // auto-detection tiebreak is handled in the minor-keys-detection task.
    // Input has 'G#' (enharmonic Ab) which should be normalised to 'Ab'.
    const s = song([
      row(ch('G#', 'minor'), ch('Db', 'minor'), ch('Eb', 'dominant7'), ch('Ab', 'minor')),
    ]);
    const result = normaliseSong(s, { forceKey: 'Abm' });
    expect(result.key).toBe('Ab minor');
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('Ab'); // G# → Ab
    expect(chordOf(bars[1]).root).toBe('Db');
    expect(chordOf(bars[2]).root).toBe('Eb');
    expect(chordOf(bars[3]).root).toBe('Ab');
  });

  it('chart in D#m: Eb chord (wrong spelling of D#) rewritten to D#', () => {
    // D#m = [D#, E#, F#, G#, A#, B, D]; V7 = A#7 disambiguates from F# major
    // Input has 'Eb' (enharmonic D#) which should be normalised to 'D#'
    const s = song([
      row(ch('Eb', 'minor'), ch('G#', 'minor'), ch('A#', 'dominant7'), ch('D#', 'minor')),
    ]);
    const result = normaliseSong(s);
    expect(result.key).toBe('D# minor');
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('D#'); // Eb → D#
    expect(chordOf(bars[1]).root).toBe('G#');
    expect(chordOf(bars[2]).root).toBe('A#');
    expect(chordOf(bars[3]).root).toBe('D#');
  });

  it('chart in Ebm: D# chord (wrong spelling of Eb) rewritten to Eb', () => {
    // Ebm = [Eb, F, Gb, Ab, Bb, Cb, D]; forceKey used because D#m/Ebm
    // auto-detection tiebreak is handled in the minor-keys-detection task.
    // Input has 'D#' (enharmonic Eb) which should be normalised to 'Eb'.
    const s = song([
      row(ch('D#', 'minor'), ch('Ab', 'minor'), ch('Bb', 'dominant7'), ch('Eb', 'minor')),
    ]);
    const result = normaliseSong(s, { forceKey: 'Ebm' });
    expect(result.key).toBe('Eb minor');
    const bars = result.sections[0].rows[0].bars;
    expect(chordOf(bars[0]).root).toBe('Eb'); // D# → Eb
    expect(chordOf(bars[1]).root).toBe('Ab');
    expect(chordOf(bars[2]).root).toBe('Bb');
    expect(chordOf(bars[3]).root).toBe('Eb');
  });
});

describe('normaliseSong — per-section key detection', () => {
  it('two-section song: each section normalised independently', () => {
    // Verse: E major (no rewrites needed — E A B E)
    // Chorus: Bb major with wrong enharmonics (A# D# F A#)
    const verse = section([row(ch('E'), ch('A'), ch('B'), ch('E'))], 'Verse');
    const chorus = section([row(ch('A#'), ch('D#'), ch('F'), ch('A#'))], 'Chorus');
    const s: Song = {
      type: 'song',
      title: null,
      key: null,
      meter: null,
      sections: [verse, chorus],
    };
    const result = normaliseSong(s);
    // Verse stays in E major
    expect(chordOf(result.sections[0].rows[0].bars[0]).root).toBe('E');
    expect(chordOf(result.sections[0].rows[0].bars[2]).root).toBe('B');
    // Chorus normalised to Bb major
    expect(chordOf(result.sections[1].rows[0].bars[0]).root).toBe('Bb'); // A# → Bb
    expect(chordOf(result.sections[1].rows[0].bars[1]).root).toBe('Eb'); // D# → Eb
    expect(chordOf(result.sections[1].rows[0].bars[3]).root).toBe('Bb'); // A# → Bb
  });

  it('single-section song produces same result as before', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('C'))]);
    const result = normaliseSong(s);
    expect(chordOf(result.sections[0].rows[0].bars[1]).root).toBe('Bb'); // A# → Bb
  });

  it('front-matter key is set to home key of first section', () => {
    const verse = section([row(ch('G'), ch('D'), ch('Em', 'minor'), ch('C'))], 'Verse');
    const chorus = section([row(ch('F'), ch('Bb'), ch('C'), ch('F'))], 'Chorus');
    const s: Song = {
      type: 'song',
      title: null,
      key: null,
      meter: null,
      sections: [verse, chorus],
    };
    const result = normaliseSong(s);
    expect(result.key).toBe('G major'); // first section is G major
  });

  it('normaliseSection returns homeKey and normalised chords', () => {
    const chords = [ch('A#'), ch('D#'), ch('F'), ch('A#')];
    const { homeKey, chords: out } = normaliseSection(chords);
    expect(homeKey).toBe('Bb');
    expect(out[0].root).toBe('Bb'); // A# → Bb
    expect(out[1].root).toBe('Eb'); // D# → Eb
  });
});

describe('normaliseSong — meter hoisting', () => {
  it('uniform inline meter is hoisted to front-matter and stripped from bars', () => {
    const r: Row = {
      type: 'row',
      openBarline: { kind: 'single' },
      bars: [barWithTS(ch('C'), 2, 4), barWithTS(ch('Am'), 2, 4)],
    };
    const s: Song = { type: 'song', title: null, key: null, meter: null, sections: [section([r])] };
    const result = normaliseSong(s);
    expect(result.meter).toBe('2/4');
    // All bars have inline tokens stripped — meter lives in frontmatter only
    for (const b of result.sections[0].rows[0].bars) {
      expect(b.timeSignature).toBeUndefined();
    }
  });

  it('mixed inline meters result in meter: "mixed" with inline tokens preserved', () => {
    const r: Row = {
      type: 'row',
      openBarline: { kind: 'single' },
      bars: [barWithTS(ch('C'), 3, 4), barWithTS(ch('Am'), 4, 4)],
    };
    const s: Song = { type: 'song', title: null, key: null, meter: null, sections: [section([r])] };
    const result = normaliseSong(s);
    expect(result.meter).toBe('mixed');
    // Inline time signatures preserved
    expect(result.sections[0].rows[0].bars[0].timeSignature).toEqual({
      numerator: 3,
      denominator: 4,
    });
    expect(result.sections[0].rows[0].bars[1].timeSignature).toEqual({
      numerator: 4,
      denominator: 4,
    });
  });

  it('song with no inline time signatures and no front-matter meter defaults to meter: 4/4', () => {
    const s = song([row(ch('C'), ch('Am'), ch('F'), ch('G'))]);
    const result = normaliseSong(s);
    expect(result.meter).toBe('4/4');
  });

  it('song with front-matter meter and no inline TS preserves the front-matter meter', () => {
    const r: Row = {
      type: 'row',
      openBarline: { kind: 'single' },
      bars: [bar(ch('C')), bar(ch('G'))],
    };
    const s: Song = {
      type: 'song',
      title: null,
      key: null,
      meter: '3/4',
      sections: [section([r])],
    };
    const result = normaliseSong(s);
    expect(result.meter).toBe('3/4');
  });
});

describe('normaliseSong — bar timeSignature stripping', () => {
  it('uniform meter from inline TS: all bars have timeSignature stripped', () => {
    const r: Row = {
      type: 'row',
      openBarline: { kind: 'single' },
      bars: [barWithTS(ch('C'), 3, 4), barWithTS(ch('G'), 3, 4), barWithTS(ch('Am'), 3, 4)],
    };
    const s: Song = { type: 'song', title: null, key: null, meter: null, sections: [section([r])] };
    const result = normaliseSong(s);
    expect(result.meter).toBe('3/4');
    // All inline tokens stripped — meter lives in frontmatter only
    expect(result.sections[0].rows[0].bars[0].timeSignature).toBeUndefined();
    expect(result.sections[0].rows[0].bars[1].timeSignature).toBeUndefined();
    expect(result.sections[0].rows[0].bars[2].timeSignature).toBeUndefined();
  });

  it('front-matter meter with no inline TS: no bars have timeSignature', () => {
    const r: Row = {
      type: 'row',
      openBarline: { kind: 'single' },
      bars: [bar(ch('C')), bar(ch('G')), bar(ch('Am'))],
    };
    const s: Song = {
      type: 'song',
      title: null,
      key: null,
      meter: '3/4',
      sections: [section([r])],
    };
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[0].timeSignature).toBeUndefined();
    expect(result.sections[0].rows[0].bars[1].timeSignature).toBeUndefined();
  });

  it('no declared meter: first bar has no timeSignature', () => {
    const s = song([row(ch('C'), ch('Am'), ch('F'), ch('G'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[0].timeSignature).toBeUndefined();
  });

  it('mixed meter: all bars keep their inline timeSignature tokens', () => {
    const r: Row = {
      type: 'row',
      openBarline: { kind: 'single' },
      bars: [barWithTS(ch('C'), 3, 4), barWithTS(ch('Am'), 4, 4)],
    };
    const s: Song = { type: 'song', title: null, key: null, meter: null, sections: [section([r])] };
    const result = normaliseSong(s);
    expect(result.meter).toBe('mixed');
    // inline tokens preserved as-is
    expect(result.sections[0].rows[0].bars[0].timeSignature).toEqual({
      numerator: 3,
      denominator: 4,
    });
    expect(result.sections[0].rows[0].bars[1].timeSignature).toEqual({
      numerator: 4,
      denominator: 4,
    });
  });
});
