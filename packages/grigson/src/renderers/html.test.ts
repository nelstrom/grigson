// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseSong } from '../parser/parser.js';
import {
  computeGlobalLayout,
  HtmlRenderer,
  chordAriaLabel,
  DEFAULT_SPOKEN_PRESET,
} from './html.js';
import type { Song } from '../parser/types.js';

describe('computeGlobalLayout', () => {
  describe('globalMaxBeats', () => {
    it('single 4/4 bar with 1 chord slot = 4 beats', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C |\n');
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(4);
    });

    it('row with two 4/4 bars = 8 beats', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C | Am |\n');
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(8);
    });

    it('4/4 bar with 2 slots → beatsPerSlot=2, row total=4', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C Am |\n');
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(4);
    });

    it('uses globalMaxBeats = max across all rows', () => {
      // Row 1: 2 bars of 4/4 with 1 chord each = 8 beats
      // Row 2: 1 bar of 4/4 with 1 chord = 4 beats
      const song = parseSong('---\nmeter: 4/4\n---\n| C | Am |\n| F |\n');
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(8);
    });

    it('uses globalMaxBeats = max across sections', () => {
      const song = parseSong(
        '---\nmeter: 4/4\n---\n[Verse]\n| C | Am | F | G |\n[Chorus]\n| C | Am |\n',
      );
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(16);
    });

    it('tracks time signature changes', () => {
      // 4/4 bar with 1 chord (4 beats) then 2/4 bar with 1 chord (2 beats) = 6 beats
      const song = parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n');
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(6);
    });

    it('4/4 bar with 3 slots → last slot absorbs remainder, row total=4', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C Am F |\n');
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(4);
    });

    it('proportional: | C . Am . | same beatCols as | C Am | (uniform dot pattern)', () => {
      // 2 chords in 4/4 → even division → proportional, 4 beats regardless of explicit dots
      const a = computeGlobalLayout(parseSong('---\nmeter: 4/4\n---\n| C Am |\n'));
      const b = computeGlobalLayout(parseSong('---\nmeter: 4/4\n---\n| C . Am . |\n'));
      expect(a.beatCols).toBe(4);
      expect(b.beatCols).toBe(4);
    });

    it('non-proportional: | C . . Am | forced to 1-beat-per-slot', () => {
      // 2 chords but dots NOT at uniform positions → non-proportional, 4 beats
      const song = parseSong('---\nmeter: 4/4\n---\n| C . . Am |\n');
      expect(computeGlobalLayout(song).beatCols).toBe(4);
    });

    it('proportional: | F . C | (uniform pattern after trailing pad) renders as 4 beats', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| F . C |\n');
      expect(computeGlobalLayout(song).beatCols).toBe(4);
    });

    it('non-proportional over-full: | F . G . . | truncated to 4 beats', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| F . G . . |\n');
      expect(computeGlobalLayout(song).beatCols).toBe(4);
    });

    it('non-proportional over-full: | F . G . A | truncated to 4 beats', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| F . G . A |\n');
      expect(computeGlobalLayout(song).beatCols).toBe(4);
    });

    it("mixed time signatures across sections — A Man's A Man-style rows", () => {
      // Verse: 4 bars of 4/4 with 1 slot each = 16 beats
      // Chorus row 1: 4 bars of 4/4 with 1 slot each = 16 beats
      // Chorus row 2: 2 bars of 4/4 + 1 bar of 2/4 = 4+4+2 = 10 beats
      const song = parseSong(
        '---\nmeter: 4/4\n---\n[Verse]\n| C | Am | F | G |\n[Chorus]\n| C | Am | F | G |\n| C | Am | (2/4) F |\n',
      );
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(16);
    });
  });

  describe('col and span layout', () => {
    it('single bar: open barline at col 1 (gap col), slot at col 2, close barline at col 9', () => {
      // 4/4, 1 chord → effectiveBeats=4, slot col=2, span=7 (2×4−1), close barline col=9 (2×4+1)
      const song = parseSong('---\nmeter: 4/4\n---\n| C |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      expect(layout.openBarlineCol).toBe(1);
      expect(layout.bars).toHaveLength(1);
      expect(layout.bars[0].slots[0]).toMatchObject({ col: 2, span: 7 });
      expect(layout.bars[0].closeBarlineCol).toBe(9);
    });

    it('two bars: second bar starts after first bar closes', () => {
      // 4/4, bar1=[C Am] (effectiveBeatsPerChord=2), bar2=[F G] (effectiveBeatsPerChord=2)
      // slot col = 2×beatOffset+2, span = 2×effectiveBeats−1
      const song = parseSong('---\nmeter: 4/4\n---\n| C Am | F G |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      expect(layout.bars[0].slots[0]).toMatchObject({ col: 2, span: 3 }); // beat 0 → col 2, 2 beats → span 3
      expect(layout.bars[0].slots[1]).toMatchObject({ col: 6, span: 3 }); // beat 2 → col 6
      expect(layout.bars[0].closeBarlineCol).toBe(9); // beat 4 → col 9

      expect(layout.bars[1].slots[0]).toMatchObject({ col: 10, span: 3 }); // beat 4 → col 10
      expect(layout.bars[1].slots[1]).toMatchObject({ col: 14, span: 3 }); // beat 6 → col 14
      expect(layout.bars[1].closeBarlineCol).toBe(17); // beat 8 → col 17
    });

    it('3-chord bar: all slots span=1, implicit dot appended for remainder beat', () => {
      // | C Am F | in 4/4 → non-proportional (3 chords, not even div of 4)
      // effectiveBeatsPerRawBeat=1, span=2×1−1=1; each slot at col 2×offset+2
      const song = parseSong('---\nmeter: 4/4\n---\n| C Am F |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const bar = rows.get(row)!.bars[0];

      expect(bar.slots[0]).toMatchObject({ col: 2, span: 1 }); // C at beat 0 → col 2
      expect(bar.slots[1]).toMatchObject({ col: 4, span: 1 }); // Am at beat 1 → col 4
      expect(bar.slots[2]).toMatchObject({ col: 6, span: 1 }); // F at beat 2 → col 6
      expect(bar.slots[3]).toMatchObject({ col: 8, span: 1, implicit: true }); // dot at beat 3 → col 8
      expect(bar.closeBarlineCol).toBe(9);
    });

    it('proportional: | C . Am . | renders as C:span3, Am:span3, no dot slots', () => {
      // Uniform dot pattern → proportional, dot slots skipped in layout
      // effectiveBeatsPerChord=2, span=2×2−1=3
      const song = parseSong('---\nmeter: 4/4\n---\n| C . Am . |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const bar = rows.get(row)!.bars[0];

      expect(bar.slots).toHaveLength(2); // only chord slots emitted
      expect(bar.slots[0]).toMatchObject({ col: 2, span: 3 }); // C at beat 0
      expect(bar.slots[1]).toMatchObject({ col: 6, span: 3 }); // Am at beat 2
      expect(bar.closeBarlineCol).toBe(9);
    });

    it('non-proportional: | C . . Am | renders as C(1), /(1), /(1), Am(1)', () => {
      // Dots NOT at uniform positions → non-proportional; span=2×1−1=1 each
      const song = parseSong('---\nmeter: 4/4\n---\n| C . . Am |\n');
      const bar = computeGlobalLayout(song).rows.get(song.sections[0].rows[0])!.bars[0];

      expect(bar.slots).toHaveLength(4);
      expect(bar.slots[0]).toMatchObject({ col: 2, span: 1 }); // C at beat 0
      expect(bar.slots[1]).toMatchObject({ col: 4, span: 1 }); // . at beat 1
      expect(bar.slots[2]).toMatchObject({ col: 6, span: 1 }); // . at beat 2
      expect(bar.slots[3]).toMatchObject({ col: 8, span: 1 }); // Am at beat 3
      expect(bar.closeBarlineCol).toBe(9);
    });

    it('proportional: | F . C | renders as F:span3, C:span3, no dot slots', () => {
      // Trailing pad makes | F . C . | which is uniform → proportional; span=2×2−1=3
      const song = parseSong('---\nmeter: 4/4\n---\n| F . C |\n');
      const bar = computeGlobalLayout(song).rows.get(song.sections[0].rows[0])!.bars[0];

      expect(bar.slots).toHaveLength(2); // only chord slots
      expect(bar.slots[0]).toMatchObject({ col: 2, span: 3 }); // F at beat 0
      expect(bar.slots[1]).toMatchObject({ col: 6, span: 3 }); // C at beat 2
      expect(bar.closeBarlineCol).toBe(9);
    });

    it('time signature change mid-row: bar entry has showTimeSig (rendered at open barline gap cell)', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      // Bar 0: shows 4/4 from song.meter at the row's open barline gap cell
      expect(layout.bars[0].showTimeSig).toEqual({ numerator: 4, denominator: 4 });

      // Bar 1: shows 2/4 at bar 0's close barline gap cell (= bar 1's open barline)
      expect(layout.bars[1].showTimeSig).toEqual({ numerator: 2, denominator: 4 });
      // beatUnit=4; bar 1 at beatOffset=4, 1 chord spanning 2 effective beats
      expect(layout.bars[1].slots[0]).toMatchObject({ col: 10, span: 3 });
      expect(layout.bars[1].closeBarlineCol).toBe(13);
    });

    it('multi-section: rows from different sections are all in the layout map', () => {
      const song = parseSong('[Verse]\n| C | Am |\n[Chorus]\n| F | G |\n');
      const { rows } = computeGlobalLayout(song);
      const verseRow = song.sections[0].rows[0];
      const chorusRow = song.sections[1].rows[0];

      expect(rows.has(verseRow)).toBe(true);
      expect(rows.has(chorusRow)).toBe(true);
    });

    it('cross-section beat alignment: rows of different length have correct columns', () => {
      // Verse row: 4 bars of 4/4 = 16 effective beats, final barline at 2×16+1=33
      // Chorus row: 2 bars of 4/4 = 8 effective beats, final barline at 2×8+1=17
      const song = parseSong('[Verse]\n| (4/4) C | Am | F | G |\n[Chorus]\n| (4/4) C | Am |\n');
      const { rows, beatCols } = computeGlobalLayout(song);

      expect(beatCols).toBe(16);

      const verseRow = song.sections[0].rows[0];
      const chorusRow = song.sections[1].rows[0];

      const verse = rows.get(verseRow)!;
      expect(verse.bars[3].closeBarlineCol).toBe(33); // 16 effective beats → 2×16+1=33

      const chorus = rows.get(chorusRow)!;
      expect(chorus.bars[1].closeBarlineCol).toBe(17); // 8 effective beats → 2×8+1=17
    });
  });

  describe('denominator-aware beat unit', () => {
    it('pure 4/4 song: beatUnit=4, effectiveBeats per bar = numerator', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C |\n');
      const { beatCols, beatUnit } = computeGlobalLayout(song);
      expect(beatUnit).toBe(4);
      expect(beatCols).toBe(4);
    });

    it('pure 6/8 song: beatUnit=8, effectiveBeats = 6', () => {
      const song = parseSong('---\nmeter: 6/8\n---\n| C |\n');
      const { beatCols, beatUnit } = computeGlobalLayout(song);
      expect(beatUnit).toBe(8);
      expect(beatCols).toBe(6);
    });

    it('pure 3/8 song: beatUnit=8, effectiveBeats = 3', () => {
      const song = parseSong('---\nmeter: 3/8\n---\n| C |\n');
      const { beatCols, beatUnit } = computeGlobalLayout(song);
      expect(beatUnit).toBe(8);
      expect(beatCols).toBe(3);
    });

    it('mixed 4/4 + 6/8: beatUnit=8, 4/4 bar gets 8 effective beats', () => {
      const song = parseSong('---\nmeter: mixed\n---\n| (4/4) C |\n| (6/8) Am |\n');
      const { beatUnit, rows } = computeGlobalLayout(song);
      expect(beatUnit).toBe(8);

      const row44 = song.sections[0].rows[0];
      const row68 = song.sections[0].rows[1];
      const layout44 = rows.get(row44)!;
      const layout68 = rows.get(row68)!;

      // 4/4 bar: effectiveBeats = 4 × (8÷4) = 8
      expect(layout44.bars[0].slots[0]).toMatchObject({ col: 2, span: 15 }); // span = 2×8−1=15
      expect(layout44.bars[0].closeBarlineCol).toBe(17); // 2×8+1=17

      // 6/8 bar: effectiveBeats = 6 × (8÷8) = 6
      expect(layout68.bars[0].slots[0]).toMatchObject({ col: 2, span: 11 }); // span = 2×6−1=11
      expect(layout68.bars[0].closeBarlineCol).toBe(13); // 2×6+1=13
    });

    it('mixed 3/4 + 3/8: beatUnit=8, 3/4 bar gets 6 effective beats, 3/8 gets 3', () => {
      const song = parseSong('---\nmeter: mixed\n---\n| (3/4) C |\n| (3/8) Am |\n');
      const { beatUnit, beatCols, rows } = computeGlobalLayout(song);
      expect(beatUnit).toBe(8);
      expect(beatCols).toBe(6); // max(6, 3)

      const row34 = song.sections[0].rows[0];
      const row38 = song.sections[0].rows[1];

      // 3/4 bar: effectiveBeats = 3 × (8÷4) = 6; 1 chord → span = 2×6−1=11
      expect(rows.get(row34)!.bars[0].slots[0]).toMatchObject({ col: 2, span: 11 });
      // 3/8 bar: effectiveBeats = 3 × (8÷8) = 3; 1 chord → span = 2×3−1=5
      expect(rows.get(row38)!.bars[0].slots[0]).toMatchObject({ col: 2, span: 5 });
    });

    it('mixed 4/4 + 6/8 in same row: consecutive bar columns are correct', () => {
      const song = parseSong('---\nmeter: mixed\n---\n| (4/4) C | (6/8) Am |\n');
      const { beatUnit, rows } = computeGlobalLayout(song);
      expect(beatUnit).toBe(8);

      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      // 4/4 bar: 8 effective beats → closes at col 17
      expect(layout.bars[0].closeBarlineCol).toBe(17);
      // 6/8 bar starts at beat 8 → col 2×8+2=18, span 11, closes at 2×14+1=29
      expect(layout.bars[1].slots[0]).toMatchObject({ col: 18, span: 11 });
      expect(layout.bars[1].closeBarlineCol).toBe(29);
    });
  });

  describe('minBeatWidth', () => {
    it('returns a string in em units', () => {
      const song = parseSong('| C |\n');
      const { minBeatWidth } = computeGlobalLayout(song);
      expect(minBeatWidth).toMatch(/^\d+\.\d+em$/);
    });

    it('longer chord names produce wider minBeatWidth', () => {
      // 4 slots in 4/4 → beatsPerSlot=1, so widthPerBeat = charWidth directly
      // "C" = 1 char × 0.55em = 0.55em → clamped to 1.0em
      // "Bbmaj7" = 3 chars × 0.55em = 1.65em > 1.0em
      const songShort = parseSong('| (4/4) C C C C |\n');
      const songLong = parseSong('| (4/4) Bbmaj7 Bbmaj7 Bbmaj7 Bbmaj7 |\n');
      const shortWidth = parseFloat(computeGlobalLayout(songShort).minBeatWidth);
      const longWidth = parseFloat(computeGlobalLayout(songLong).minBeatWidth);
      expect(longWidth).toBeGreaterThan(shortWidth);
    });

    it('has a minimum value of 1em', () => {
      // Even a very short chord (e.g. C in a 4-beat bar) should be at least 1em per beat
      const song = parseSong('---\nmeter: 4/4\n---\n| C |\n');
      const { minBeatWidth } = computeGlobalLayout(song);
      expect(parseFloat(minBeatWidth)).toBeGreaterThanOrEqual(1.0);
    });

    it('multi-section song: globalMaxBeats and globalMinBeatWidth computed across all sections', () => {
      // Verse: 4 bars of 4/4 = 16 beats; Chorus: 2 bars of 4/4 = 8 beats
      // Longest chord in verse is "Am" (2 chars), chorus has "Bbmaj7" (3 effective chars)
      const song = parseSong(
        '[Verse]\n| C | Am | F | G |\n[Chorus]\n| (4/4) Bbmaj7 Bbmaj7 Bbmaj7 Bbmaj7 |\n',
      );
      const { beatCols, minBeatWidth } = computeGlobalLayout(song);
      // globalMaxBeats = max(16, 4) = 16
      expect(beatCols).toBe(16);
      // minBeatWidth driven by Bbmaj7 in chorus
      expect(parseFloat(minBeatWidth)).toBeGreaterThan(1.0);
    });
  });
});

describe('HtmlRenderer', () => {
  const renderer = new HtmlRenderer();

  describe('Unicode notation', () => {
    it('renders flat accidental as ♭ with data-glyph="unicode"', () => {
      const html = renderer.render(parseSong('| Bb |\n'));
      expect(html).toContain('♭');
      expect(html).toContain('data-glyph="unicode"');
      expect(html).not.toContain('<span part="chord-accidental">b</span>');
    });

    it('renders sharp accidental as ♯ with data-glyph="unicode"', () => {
      const html = renderer.render(parseSong('| F# |\n'));
      expect(html).toContain('♯');
      expect(html).toContain('data-glyph="unicode"');
      expect(html).not.toContain('<span part="chord-accidental">#</span>');
    });

    it('accidentals="ascii" renders flat as b with data-glyph="ascii"', () => {
      const r = new HtmlRenderer({ accidentals: 'ascii' });
      const html = r.render(parseSong('| Bb |\n'));
      expect(html).toContain('data-glyph="ascii"');
      expect(html).toContain('>b<');
      expect(html).not.toContain('♭');
    });

    it('accidentals="ascii" renders sharp as # with data-glyph="ascii"', () => {
      const r = new HtmlRenderer({ accidentals: 'ascii' });
      const html = r.render(parseSong('| F# |\n'));
      expect(html).toContain('data-glyph="ascii"');
      expect(html).toContain('>#<');
      expect(html).not.toContain('♯');
    });

    it('renders major7 quality as △', () => {
      const html = renderer.render(parseSong('| Cmaj7 |\n'));
      expect(html).toContain('△');
    });

    it('renders diminished quality as o (in superscript)', () => {
      const html = renderer.render(parseSong('| Cdim |\n'));
      expect(html).toContain('<sup><small>o</small></sup>');
    });

    it('renders half-diminished quality as ø (in superscript)', () => {
      const html = renderer.render(parseSong('| Cm7b5 |\n'));
      expect(html).toContain('<sup><small>ø</small></sup>');
    });
  });

  describe('slash chord', () => {
    it('renders slash chord with chord-top, chord-fraction-line, and chord-bass parts', () => {
      const html = renderer.render(parseSong('| G/B |\n'));
      expect(html).toContain('part="chord chord-slash"');
      expect(html).toContain('part="chord-top"');
      expect(html).toContain('part="chord-fraction-line"');
      expect(html).toContain('part="chord-bass"');
    });

    it('renders bass note inside chord-bass', () => {
      const html = renderer.render(parseSong('| G/B |\n'));
      // chord-bass should contain "B"
      expect(html).toMatch(/part="chord-bass"[^>]*>B</);
    });

    it('renders bass accidental in chord-bass for flat bass', () => {
      const html = renderer.render(parseSong('| C/Bb |\n'));
      expect(html).toContain('♭');
      expect(html).toMatch(/part="chord-bass"/);
    });

    it('accidentals="ascii" renders bass accidental as b', () => {
      const r = new HtmlRenderer({ accidentals: 'ascii' });
      const html = r.render(parseSong('| C/Bb |\n'));
      expect(html).not.toContain('♭');
      expect(html).toMatch(/part="chord-bass"/);
    });

    it('slashStyle="horizontal" adds data-slash-style="horizontal"', () => {
      const r = new HtmlRenderer({ slashStyle: 'horizontal' });
      const html = r.render(parseSong('| G/B |\n'));
      expect(html).toContain('data-slash-style="horizontal"');
    });

    it('slashStyle="diagonal" adds data-slash-style="diagonal"', () => {
      const r = new HtmlRenderer({ slashStyle: 'diagonal' });
      const html = r.render(parseSong('| G/B |\n'));
      expect(html).toContain('data-slash-style="diagonal"');
    });

    it('slashStyle="ascii" adds data-slash-style="ascii"', () => {
      const r = new HtmlRenderer({ slashStyle: 'ascii' });
      const html = r.render(parseSong('| G/B |\n'));
      expect(html).toContain('data-slash-style="ascii"');
    });

    it('default (no slashStyle) uses diagonal', () => {
      const html = renderer.render(parseSong('| G/B |\n'));
      expect(html).toContain('data-slash-style="diagonal"');
    });
  });

  describe('quality-accidental wrapping', () => {
    it('unicode mode: wraps ♭ in quality string with quality-accidental span', () => {
      const r = new HtmlRenderer({ notation: { preset: 'realbook' } });
      const html = r.render(parseSong('| Cm7b5 |\n'));
      expect(html).toContain('part="quality-accidental" data-glyph="unicode"');
      expect(html).toContain('♭');
    });

    it('ascii mode: replaces ♭ in quality string with b, wrapped in quality-accidental span', () => {
      const r = new HtmlRenderer({ notation: { preset: 'realbook' }, accidentals: 'ascii' });
      const html = r.render(parseSong('| Cm7b5 |\n'));
      expect(html).toContain('part="quality-accidental" data-glyph="ascii"');
      expect(html).toContain('>b<');
      expect(html).not.toContain('♭');
    });

    it('default preset: dom7flat5 quality wraps ♭ in unicode mode', () => {
      const html = renderer.render(parseSong('| C7b5 |\n'));
      expect(html).toContain('part="quality-accidental" data-glyph="unicode"');
    });
  });

  describe('implicit dot (remainder beats)', () => {
    it('3-chord 4/4 bar renders identically to explicit trailing dot', () => {
      const renderer = new HtmlRenderer();
      const implicit = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C Am F |\n'));
      const explicit = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C Am F . |\n'));
      expect(implicit).toBe(explicit);
    });

    it('proportional: | C . Am . | renders identically to | C Am |', () => {
      const renderer = new HtmlRenderer();
      const withDots = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C . Am . |\n'));
      const withoutDots = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C Am |\n'));
      expect(withDots).toBe(withoutDots);
    });
  });

  describe('dot slot', () => {
    it('renders dot slot as <span part="dot"> containing "/"', () => {
      // Use a non-proportional bar so dots are rendered
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C . . Am |\n'));
      expect(html).toContain('part="dot"');
      // dot content is "/"
      expect(html).toMatch(/part="dot"[^>]*><span aria-hidden="true">\/</);
    });

    it('dot slot has correct grid-column (col 4 for second slot)', () => {
      // | C . . Am | → C at beat 0 → col 2, first dot at beat 1 → col 4
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C . . Am |\n'));
      const dotMatches = [...html.matchAll(/part="dot" style="grid-column: (\d+)/g)];
      expect(dotMatches.length).toBeGreaterThan(0);
      expect(dotMatches[0][1]).toBe('4');
    });
  });

  describe('time signature annotation', () => {
    it('shows time-sig block when bar.timeSignature is set', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n'));
      expect(html).toContain('part="time-sig"');
      expect(html).toContain('part="time-sig-num"');
      expect(html).toContain('part="time-sig-den"');
    });

    it('time-sig is rendered inside a slot span, not inside a barline span', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n'));
      // The time-sig span must appear inside a slot span.
      // Check by ensuring 'part="time-sig"' follows 'part="slot"' without an intervening 'part="barline'
      const slotPos = html.indexOf('part="slot');
      const timeSigPos = html.indexOf('part="time-sig"');
      expect(timeSigPos).toBeGreaterThan(slotPos);
    });

    it('time-sig-num and time-sig-den contain the correct Math Bold digits', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n'));
      // Time sig digits are rendered as Math Bold codepoints: U+1D7D0 = '2', U+1D7D2 = '4'
      expect(html).toContain(
        `part="time-sig-num" aria-hidden="true">${String.fromCodePoint(0x1d7d0)}<`,
      );
      expect(html).toContain(
        `part="time-sig-den" aria-hidden="true">${String.fromCodePoint(0x1d7d2)}<`,
      );
    });

    it('shows time-sig on bar 0 when song.meter is set and bar has no explicit timeSignature', () => {
      // Frontmatter meter only — time sig should appear at bar 0 without inline (x/y) token
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C | Am |\n'));
      expect(html).toContain('part="time-sig"');
    });

    it('does not show time-sig on bar 0 when song.meter is null', () => {
      const song: Song = {
        type: 'song',
        title: null,
        key: null,
        meter: null,
        sections: [
          {
            type: 'section',
            label: null,
            rows: [
              {
                type: 'row',
                openBarline: { kind: 'single' },
                bars: [
                  {
                    type: 'bar',
                    slots: [{ type: 'chord', chord: { root: 'C', quality: null, bass: null } }],
                    closeBarline: { kind: 'single' },
                  },
                ],
              },
            ],
          },
        ],
      };
      const html = renderer.render(song);
      expect(html).not.toContain('part="time-sig"');
    });
  });

  describe('simile marks', () => {
    it('longhand (default): renders identical consecutive bars as full chords', () => {
      const r = new HtmlRenderer();
      const html = r.render(parseSong('---\nmeter: 4/4\n---\n| C | C |\n'));
      expect(html).not.toContain('part="simile');
      // Both bars should render as chord slots
      expect(html.match(/part="slot[ "]/g)?.length).toBe(2);
    });

    it('shorthand: renders second identical bar as simile mark (glyph)', () => {
      const r = new HtmlRenderer({ simile: { output: 'shorthand' } });
      const html = r.render(parseSong('---\nmeter: 4/4\n---\n| C | C |\n'));
      expect(html).toContain('part="simile');
      expect(html).toContain(String.fromCodePoint(0xe500));
      // Only the first bar renders as a chord slot
      expect(html.match(/part="slot[ "]/g)?.length).toBe(1);
    });

    it('shorthand: first bar of a row is never rendered as simile', () => {
      const r = new HtmlRenderer({ simile: { output: 'shorthand' } });
      // Two rows, each starting with C — the first bar of each row must not be simile
      const html = r.render(parseSong('---\nmeter: 4/4\n---\n| C | C |\n| C | C |\n'));
      // Each row has 2 bars; second bar of each row is simile = 2 simile marks
      expect(html.match(/part="simile[ "]/g)?.length).toBe(2);
      // Each row's first bar is a chord slot = 2 chord slots
      expect(html.match(/part="slot[ "]/g)?.length).toBe(2);
    });

    it('shorthand: non-identical bars do not trigger simile', () => {
      const r = new HtmlRenderer({ simile: { output: 'shorthand' } });
      const html = r.render(parseSong('---\nmeter: 4/4\n---\n| C | Am |\n'));
      expect(html).not.toContain('part="simile');
      expect(html.match(/part="slot[ "]/g)?.length).toBe(2);
    });
  });

  describe('barline glyphs', () => {
    it('startRepeat barline contains part="barline-glyph" span', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n||: C |\n'));
      expect(html).toContain('part="barline-glyph"');
    });

    it('endRepeat barline contains part="barline-glyph" span', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C :||'));
      expect(html).toContain('part="barline-glyph"');
    });

    it('barline-glyph-inner span contains the SMuFL codepoint for startRepeat', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n||: C |\n'));
      expect(html).toContain(`part="barline-glyph-inner">${String.fromCodePoint(0xe040)}`);
    });

    it('single barline also contains part="barline-glyph" span', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C |\n'));
      expect(html).toContain('part="barline-glyph"');
      expect(html).toContain(`part="barline-glyph-inner">${String.fromCodePoint(0xe030)}`);
    });
  });

  describe('section structure', () => {
    it('section element has part="section" and display:contents style', () => {
      const html = renderer.render(parseSong('[Verse]\n| C |\n'));
      expect(html).toContain('part="section"');
      expect(html).toContain('display: contents');
    });

    it('section label is rendered inside section element', () => {
      const html = renderer.render(parseSong('[Verse]\n| C |\n'));
      expect(html).toContain('part="section-label"');
      expect(html).toContain('Verse');
    });
  });

  describe('preset sanitization', () => {
    it('strips <script> tags from preset values', () => {
      const maliciousPreset = { dominant7: "<script>alert('xss')</script>" };
      const xssRenderer = new HtmlRenderer({ notation: { preset: maliciousPreset } });
      const html = xssRenderer.render(parseSong('| G7 |\n'));
      expect(html).not.toContain('<script>');
      expect(html).not.toContain("alert('xss')");
    });

    it('allows <sup> in preset values', () => {
      const html = new HtmlRenderer({ notation: { preset: { dominant7: '<sup>7</sup>' } } }).render(
        parseSong('| G7 |\n'),
      );
      expect(html).toContain('<sup>7</sup>');
    });

    it('allows <sub> in preset values', () => {
      const html = new HtmlRenderer({ notation: { preset: { dominant7: '<sub>7</sub>' } } }).render(
        parseSong('| G7 |\n'),
      );
      expect(html).toContain('<sub>7</sub>');
    });

    it('allows <small> in preset values', () => {
      const html = new HtmlRenderer({
        notation: { preset: { dominant7: '<small>7</small>' } },
      }).render(parseSong('| G7 |\n'));
      expect(html).toContain('<small>7</small>');
    });

    it('strips attributes from allowed tags', () => {
      const html = new HtmlRenderer({
        notation: { preset: { dominant7: '<sup class="x" onclick="bad()">7</sup>' } },
      }).render(parseSong('| G7 |\n'));
      expect(html).toContain('<sup>7</sup>');
      expect(html).not.toContain('onclick');
      expect(html).not.toContain('class');
    });
  });

  describe('song wrapper', () => {
    it('outer div has --beat-cols and --min-beat-width CSS variables', () => {
      const html = renderer.render(parseSong('| C |\n'));
      expect(html).toMatch(/--beat-cols: \d+/);
      expect(html).toMatch(/--min-beat-width: \d+\.\d+em/);
    });

    it('song-grid div is present', () => {
      const html = renderer.render(parseSong('| C |\n'));
      expect(html).toContain('part="song-grid"');
    });

    it('renders song title and key in header when present', () => {
      const html = renderer.render(parseSong('---\ntitle: My Song\nkey: C\n---\n| C |\n'));
      expect(html).toContain('part="song-header"');
      expect(html).toContain('part="song-title"');
      expect(html).toContain('My Song');
      expect(html).toContain('part="song-key"');
    });
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('chordAriaLabel', () => {
  const preset = DEFAULT_SPOKEN_PRESET;

  describe('all 9 quality values', () => {
    it('major: "C, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'major' }, 4, true, preset, 4),
      ).toBe('C, whole bar');
    });

    it('minor: "Ay minor, whole bar" (A spelled phonetically to avoid article misreading)', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'A', quality: 'minor' }, 4, true, preset, 4),
      ).toBe('Ay minor, whole bar');
    });

    it('dominant7: "G dominant 7, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'G', quality: 'dominant7' }, 4, true, preset, 4),
      ).toBe('G dominant 7, whole bar');
    });

    it('halfDiminished: "B half diminished 7, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'B', quality: 'halfDiminished' }, 4, true, preset, 4),
      ).toBe('B half diminished 7, whole bar');
    });

    it('diminished: "D diminished, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'D', quality: 'diminished' }, 4, true, preset, 4),
      ).toBe('D diminished, whole bar');
    });

    it('maj7: "C major 7, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'maj7' }, 4, true, preset, 4),
      ).toBe('C major 7, whole bar');
    });

    it('min7: "F minor 7, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'F', quality: 'min7' }, 4, true, preset, 4),
      ).toBe('F minor 7, whole bar');
    });

    it('dim7: "B diminished 7, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'B', quality: 'dim7' }, 4, true, preset, 4),
      ).toBe('B diminished 7, whole bar');
    });

    it('dom7flat5: "C dominant 7 flat 5, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'dom7flat5' }, 4, true, preset, 4),
      ).toBe('C dominant 7 flat 5, whole bar');
    });
  });

  describe('accidentals in root', () => {
    it('flat root: Bb → "B flat, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'Bb', quality: 'major' }, 4, true, preset, 4),
      ).toBe('B flat, whole bar');
    });

    it('sharp root: F# → "F sharp minor, whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'F#', quality: 'minor' }, 4, true, preset, 4),
      ).toBe('F sharp minor, whole bar');
    });
  });

  describe('slash chord', () => {
    it('G/B → "G over B, whole bar"', () => {
      expect(
        chordAriaLabel(
          { type: 'chord', root: 'G', quality: 'major', bass: 'B' },
          4,
          true,
          preset,
          4,
        ),
      ).toBe('G over B, whole bar');
    });

    it('Bb7/F → "B flat dominant 7 over F, 2 crotchets"', () => {
      expect(
        chordAriaLabel(
          { type: 'chord', root: 'Bb', quality: 'dominant7', bass: 'F' },
          2,
          false,
          preset,
          4,
        ),
      ).toBe('B flat dominant 7 over F, 2 crotchets');
    });
  });

  describe('duration', () => {
    it('isWholeBar=true → "whole bar"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'major' }, 4, true, preset, 4),
      ).toContain('whole bar');
    });

    it('denominator=4 (crotchet), 2 beats → "2 crotchets"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'major' }, 2, false, preset, 4),
      ).toBe('C, 2 crotchets');
    });

    it('denominator=8 (quaver), 3 beats → "3 quavers"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'major' }, 3, false, preset, 8),
      ).toBe('C, 3 quavers');
    });

    it('denominator=4, 1 beat → "1 crotchet" (singular)', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'major' }, 1, false, preset, 4),
      ).toBe('C, 1 crotchet');
    });

    it('denominator=8, 1 beat → "1 quaver" (singular)', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'major' }, 1, false, preset, 8),
      ).toBe('C, 1 quaver');
    });

    it('unknown denominator falls back to "beat(s)"', () => {
      expect(
        chordAriaLabel({ type: 'chord', root: 'C', quality: 'major' }, 3, false, preset, 16),
      ).toBe('C, 3 beats');
    });
  });
});

describe('HtmlRenderer – aria integration', () => {
  describe('chord aria-label', () => {
    it('single-chord 4/4 bar gets aria-label="C, whole bar"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n| C |\n'));
      expect(html).toContain('aria-label="C, whole bar"');
    });

    it('two-chord 4/4 bar: F gets "F, 2 crotchets" and G gets "G, 2 crotchets"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n| F G |\n'));
      expect(html).toContain('aria-label="F, 2 crotchets"');
      expect(html).toContain('aria-label="G, 2 crotchets"');
    });

    it('two-chord 6/8 bar: each chord gets "3 quavers"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 6/8\n---\n| F G |\n'));
      expect(html).toContain('aria-label="F, 3 quavers"');
      expect(html).toContain('aria-label="G, 3 quavers"');
    });

    it('mixed 4/4 and 6/8: crotchets in 4/4 bars, quavers in 6/8 bars', () => {
      const html = new HtmlRenderer().render(
        parseSong('---\nmeter: 4/4\n---\n| F G | (6/8) C D |\n'),
      );
      expect(html).toContain('aria-label="F, 2 crotchets"');
      expect(html).toContain('aria-label="C, 3 quavers"');
    });
  });

  describe('barline aria attributes', () => {
    it('single barline gets aria-hidden="true"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n| C |\n'));
      expect(html).toMatch(/part="barline barline-single[^"]*"[^>]*aria-hidden="true"/);
    });

    it('startRepeat barline gets aria-label="start repeat"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n||: C |\n'));
      expect(html).toContain('aria-label="start repeat"');
    });

    it('endRepeat barline (count ≤ 2) gets aria-label="end repeat"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n| C :||'));
      expect(html).toContain('aria-label="end repeat"');
    });

    it('endRepeat barline with count 3 gets aria-label="end repeat, play 3 times"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n| C :||x3'));
      expect(html).toContain('aria-label="end repeat, play 3 times"');
    });
  });

  describe('time signature aria-label', () => {
    it('time-sig span gets aria-label="4/4 time"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n| C |\n'));
      expect(html).toContain('aria-label="4/4 time"');
    });

    it('time-sig-num and time-sig-den have aria-hidden="true"', () => {
      const html = new HtmlRenderer().render(parseSong('---\nmeter: 4/4\n---\n| C |\n'));
      expect(html).toContain('part="time-sig-num" aria-hidden="true"');
      expect(html).toContain('part="time-sig-den" aria-hidden="true"');
    });
  });

  describe('simile aria-label', () => {
    it('simile span gets aria-label="repeat bar"', () => {
      const html = new HtmlRenderer({ simile: { output: 'shorthand' } }).render(
        parseSong('---\nmeter: 4/4\n---\n| C | C |\n'),
      );
      expect(html).toContain('aria-label="repeat bar"');
    });

    it('simile glyph is wrapped in aria-hidden span', () => {
      const html = new HtmlRenderer({ simile: { output: 'shorthand' } }).render(
        parseSong('---\nmeter: 4/4\n---\n| C | C |\n'),
      );
      expect(html).toContain(`<span aria-hidden="true">${String.fromCodePoint(0xe500)}</span>`);
    });
  });

  describe('aria: false config', () => {
    it('produces no aria-label attributes', () => {
      const html = new HtmlRenderer({ aria: false }).render(
        parseSong('---\nmeter: 4/4\n---\n||: C | F :||x3\n'),
      );
      expect(html).not.toContain('aria-label');
    });

    it('barline outer spans have no aria attributes (neither label nor hidden)', () => {
      const html = new HtmlRenderer({ aria: false }).render(
        parseSong('---\nmeter: 4/4\n---\n| C |\n'),
      );
      // Barline spans should have no aria-label and no aria-hidden on the outer span
      expect(html).not.toMatch(/part="barline[^"]*"[^>]*aria-/);
    });

    it('chord spans have no aria-label', () => {
      const html = new HtmlRenderer({ aria: false }).render(
        parseSong('---\nmeter: 4/4\n---\n| C |\n'),
      );
      expect(html).not.toMatch(/part="chord[^"]*"[^>]*aria-label/);
    });
  });

  describe('custom spokenPreset', () => {
    it('overridden quality labels appear in rendered chord aria-label', () => {
      const frenchPreset = {
        ...DEFAULT_SPOKEN_PRESET,
        qualities: {
          ...DEFAULT_SPOKEN_PRESET.qualities,
          minor: 'mineur',
        },
      };
      const html = new HtmlRenderer({ spokenPreset: frenchPreset }).render(
        parseSong('---\nmeter: 4/4\n---\n| Am |\n'),
      );
      expect(html).toContain('aria-label="Ay mineur, whole bar"');
    });

    it('overridden note function uses fixed-do solfège names', () => {
      const SOLFEGE: Record<string, string> = {
        C: 'do',
        D: 'ré',
        E: 'mi',
        F: 'fa',
        G: 'sol',
        A: 'la',
        B: 'si',
      };
      const frenchPreset = {
        ...DEFAULT_SPOKEN_PRESET,
        qualities: { ...DEFAULT_SPOKEN_PRESET.qualities, minor: 'mineur' },
        note: (letter: string, accidental: string) => {
          const name = SOLFEGE[letter] ?? letter;
          return accidental ? `${name} ${accidental}` : name;
        },
      };
      const html = new HtmlRenderer({ spokenPreset: frenchPreset }).render(
        parseSong('---\nmeter: 4/4\n---\n| Am |\n'),
      );
      expect(html).toContain('aria-label="la mineur, whole bar"');
    });

    it('overridden note function handles accidentals (Bb → "si bémol")', () => {
      const frenchPreset = {
        ...DEFAULT_SPOKEN_PRESET,
        note: (letter: string, accidental: string) => {
          const solfege: Record<string, string> = {
            C: 'do',
            D: 'ré',
            E: 'mi',
            F: 'fa',
            G: 'sol',
            A: 'la',
            B: 'si',
          };
          const frAcc: Record<string, string> = { flat: 'bémol', sharp: 'dièse' };
          const name = solfege[letter] ?? letter;
          return accidental ? `${name} ${frAcc[accidental] ?? accidental}` : name;
        },
      };
      const html = new HtmlRenderer({ spokenPreset: frenchPreset }).render(
        parseSong('---\nmeter: 4/4\n---\n| Bbm |\n'),
      );
      expect(html).toContain('aria-label="si bémol minor, whole bar"');
    });

    it('overridden simile label appears in rendered simile span', () => {
      const frenchPreset = {
        ...DEFAULT_SPOKEN_PRESET,
        simile: 'répéter la mesure',
      };
      const html = new HtmlRenderer({
        simile: { output: 'shorthand' },
        spokenPreset: frenchPreset,
      }).render(parseSong('---\nmeter: 4/4\n---\n| C | C |\n'));
      expect(html).toContain('aria-label="répéter la mesure"');
    });
  });
});
