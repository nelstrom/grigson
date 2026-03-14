import { describe, it, expect } from 'vitest';
import { normaliseSong, normaliseSection } from './normalise.js';
import type { Song, Chord, Bar, Row, Section } from '../parser/types.js';

function ch(root: string, quality: Chord['quality'] = 'major'): Chord {
  return { type: 'chord', root, quality };
}

function bar(c: Chord): Bar {
  return { type: 'bar', chord: c };
}

function row(...chords: Chord[]): Row {
  return { type: 'row', bars: chords.map(bar) };
}

function section(rows: Row[], label: string | null = null): Section {
  return { type: 'section', label, rows };
}

function song(rows: Row[], key: string | null = null, title: string | null = null): Song {
  return { type: 'song', title, key, sections: [section(rows)] };
}

describe('normaliseSong — Category 2: enharmonic correction of diatonic chord roots', () => {
  it('T2-a: A# → Bb in F major', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[0].chord.root).toBe('F');
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.sections[0].rows[0].bars[2].chord.root).toBe('F');
    expect(result.sections[0].rows[0].bars[3].chord.root).toBe('C');
  });

  it('T2-b: D# → Eb in Bb major', () => {
    const s = song([row(ch('Bb'), ch('D#'), ch('F'), ch('Bb'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Eb');
  });

  it('T2-c: A# → Bb across two rows in F major', () => {
    const s = song([row(ch('F'), ch('A#'), ch('C')), row(ch('A#'), ch('F'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.sections[0].rows[1].bars[0].chord.root).toBe('Bb');
  });

  it('T2-d: A# → Bb; existing Bb left unchanged', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('Bb'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.sections[0].rows[0].bars[3].chord.root).toBe('Bb');
  });

  it('T2-e: C# F# G# C# → Db Gb Ab Db in Db major', () => {
    const s = song([row(ch('C#'), ch('F#'), ch('G#'), ch('C#'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[0].chord.root).toBe('Db');
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Gb');
    expect(result.sections[0].rows[0].bars[2].chord.root).toBe('Ab');
    expect(result.sections[0].rows[0].bars[3].chord.root).toBe('Db');
  });

  it('T2-f: D# A# F D# → Eb Bb F Eb in Bb major', () => {
    const s = song([row(ch('D#'), ch('A#'), ch('F'), ch('D#'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[0].chord.root).toBe('Eb');
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb');
    expect(result.sections[0].rows[0].bars[2].chord.root).toBe('F');
    expect(result.sections[0].rows[0].bars[3].chord.root).toBe('Eb');
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
      row(ch('C'), ch('Bb', 'minor'), ch('Eb', 'dominant7'), ch('Ab'), ch('G', 'dominant7'), ch('C')),
    ]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(bars[1].chord.root).toBe('Bb'); // not A#
    expect(bars[2].chord.root).toBe('Eb'); // not D#
    expect(bars[3].chord.root).toBe('Ab'); // not G#
  });

  it('2-5-1 Ebm-Ab7-Db in F (What\'s New B): roots spelled Eb, Ab, Db', () => {
    const s = song([
      row(ch('F'), ch('Eb', 'minor'), ch('Ab', 'dominant7'), ch('Db'), ch('C', 'dominant7'), ch('F')),
    ]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(bars[1].chord.root).toBe('Eb');
    expect(bars[2].chord.root).toBe('Ab');
    expect(bars[3].chord.root).toBe('Db');
  });

  it('borrowed bVII Bb in C: stays Bb (not A#)', () => {
    const s = song([row(ch('C'), ch('Bb'), ch('F'), ch('G'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb');
  });

  it('A7 secondary dominant in C: root A not rewritten', () => {
    const s = song([
      row(ch('C'), ch('A', 'dominant7'), ch('D', 'minor'), ch('G', 'dominant7'), ch('C')),
    ]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('A');
  });

  it('Dm7b5-G7-Am-Am: root D not mangled (not C##)', () => {
    const s = song([
      row(ch('D', 'halfDiminished'), ch('G', 'dominant7'), ch('A', 'minor'), ch('A', 'minor')),
    ]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[0].chord.root).toBe('D');
  });
});

describe('normaliseSong — Category 8: borrowed chords and secondary dominants', () => {
  it('T8-a: Eb7 as V7 of Ab stays Eb7 (not rewritten to D#7)', () => {
    const s = song([row(ch('F'), ch('Bb'), ch('Eb', 'dominant7'), ch('Ab'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[2].chord.root).toBe('Eb');
  });

  it('T8-b: A7 (secondary dominant V7/ii in C major) root stays A', () => {
    const s = song([
      row(ch('C'), ch('A', 'dominant7'), ch('Dm', 'minor'), ch('G', 'dominant7'), ch('C')),
    ]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('A');
  });

  it('T8-c: Bb borrowed bVII in C major stays Bb (not rewritten to A#)', () => {
    const s = song([row(ch('C'), ch('Bb'), ch('F'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb');
  });

  it('T8-d: Ab and Bb borrowed bVI/bVII in C major; both flat spellings preserved', () => {
    const s = song([row(ch('C'), ch('G'), ch('Ab'), ch('Bb'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[2].chord.root).toBe('Ab');
    expect(result.sections[0].rows[0].bars[3].chord.root).toBe('Bb');
  });
});

describe('normaliseSong — Category 5: front matter key field read and write', () => {
  it('T5-a: correct key: F preserved; no chord changes', () => {
    const s = song([row(ch('F'), ch('Bb'), ch('C'), ch('F'))], 'F');
    const result = normaliseSong(s);
    expect(result.key).toBe('F');
    expect(result.sections[0].rows[0].bars[0].chord.root).toBe('F');
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb');
  });

  it('T5-b: wrong key: G corrected to F', () => {
    const s = song([row(ch('F'), ch('Bb'), ch('C'), ch('F'))], 'G');
    const result = normaliseSong(s);
    expect(result.key).toBe('F');
  });

  it('T5-c: no key in front matter; key: G added', () => {
    const s = song([row(ch('G'), ch('D'), ch('Em', 'minor'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result.key).toBe('G');
  });

  it('T5-d: wrong key: C corrected to F (Bb and Gm not diatonic to C)', () => {
    const s = song([row(ch('Bb'), ch('F'), ch('C'), ch('Gm', 'minor'))], 'C');
    const result = normaliseSong(s);
    expect(result.key).toBe('F');
  });
});

describe('normaliseSong — chord-qualities smoke tests', () => {
  it('Dm7 G7 Cmaj7 in C: all roots already correct, no rewrites', () => {
    const s = song([row(ch('D', 'min7'), ch('G', 'dominant7'), ch('C', 'maj7'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(bars[0].chord.root).toBe('D');
    expect(bars[0].chord.quality).toBe('min7');
    expect(bars[1].chord.root).toBe('G');
    expect(bars[1].chord.quality).toBe('dominant7');
    expect(bars[2].chord.root).toBe('C');
    expect(bars[2].chord.quality).toBe('maj7');
    expect(result.key).toBe('C');
  });

  it('D#m7 G#7 C#maj7: detected key Db, roots rewritten to Ebm7 Ab7 Dbmaj7', () => {
    const s = song([row(ch('D#', 'min7'), ch('G#', 'dominant7'), ch('C#', 'maj7'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(bars[0].chord.root).toBe('Eb');
    expect(bars[0].chord.quality).toBe('min7');
    expect(bars[1].chord.root).toBe('Ab');
    expect(bars[1].chord.quality).toBe('dominant7');
    expect(bars[2].chord.root).toBe('Db');
    expect(bars[2].chord.quality).toBe('maj7');
    expect(result.key).toBe('Db');
  });

  it('Bm7b5 E7 Am7: identifies Am, all roots unchanged', () => {
    const s = song([row(ch('B', 'halfDiminished'), ch('E', 'dominant7'), ch('A', 'min7'))]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(bars[0].chord.root).toBe('B');
    expect(bars[1].chord.root).toBe('E');
    expect(bars[2].chord.root).toBe('A');
    expect(result.key).toBe('Am');
  });

  it('Am7 Dm7 G#dim7 Am7: identifies Am, G# (raised VII) preserved as G#', () => {
    const s = song([
      row(ch('A', 'min7'), ch('D', 'min7'), ch('G#', 'dim7'), ch('A', 'min7')),
    ]);
    const result = normaliseSong(s);
    const bars = result.sections[0].rows[0].bars;
    expect(bars[0].chord.root).toBe('A');
    expect(bars[1].chord.root).toBe('D');
    expect(bars[2].chord.root).toBe('G#');
    expect(bars[2].chord.quality).toBe('dim7');
    expect(bars[3].chord.root).toBe('A');
    expect(result.key).toBe('Am');
  });
});

describe('normaliseSong — per-section key detection', () => {
  it('two-section song: each section normalised independently', () => {
    // Verse: E major (no rewrites needed — E A B E)
    // Chorus: Bb major with wrong enharmonics (A# D# F A#)
    const verse = section([row(ch('E'), ch('A'), ch('B'), ch('E'))], 'Verse');
    const chorus = section([row(ch('A#'), ch('D#'), ch('F'), ch('A#'))], 'Chorus');
    const s: Song = { type: 'song', title: null, key: null, sections: [verse, chorus] };
    const result = normaliseSong(s);
    // Verse stays in E major
    expect(result.sections[0].rows[0].bars[0].chord.root).toBe('E');
    expect(result.sections[0].rows[0].bars[2].chord.root).toBe('B');
    // Chorus normalised to Bb major
    expect(result.sections[1].rows[0].bars[0].chord.root).toBe('Bb'); // A# → Bb
    expect(result.sections[1].rows[0].bars[1].chord.root).toBe('Eb'); // D# → Eb
    expect(result.sections[1].rows[0].bars[3].chord.root).toBe('Bb'); // A# → Bb
  });

  it('single-section song produces same result as before', () => {
    const s = song([row(ch('F'), ch('A#'), ch('F'), ch('C'))]);
    const result = normaliseSong(s);
    expect(result.sections[0].rows[0].bars[1].chord.root).toBe('Bb'); // A# → Bb
  });

  it('front-matter key is set to home key of first section', () => {
    const verse = section([row(ch('G'), ch('D'), ch('Em', 'minor'), ch('C'))], 'Verse');
    const chorus = section([row(ch('F'), ch('Bb'), ch('C'), ch('F'))], 'Chorus');
    const s: Song = { type: 'song', title: null, key: null, sections: [verse, chorus] };
    const result = normaliseSong(s);
    expect(result.key).toBe('G'); // first section is G major
  });

  it('normaliseSection returns homeKey and normalised chords', () => {
    const chords = [ch('A#'), ch('D#'), ch('F'), ch('A#')];
    const { homeKey, chords: out } = normaliseSection(chords);
    expect(homeKey).toBe('Bb');
    expect(out[0].root).toBe('Bb'); // A# → Bb
    expect(out[1].root).toBe('Eb'); // D# → Eb
  });
});
