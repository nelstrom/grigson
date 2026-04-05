// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseSong } from '../parser/parser.js';
import { computeGlobalLayout, HtmlRenderer } from './html.js';
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
    it('single bar: open barline at col 1, slot at col 1, close barline at col 5', () => {
      // 4/4, 1 chord → beatsPerSlot=4, slot col=1, span=4, close barline col=5
      const song = parseSong('---\nmeter: 4/4\n---\n| C |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      expect(layout.openBarlineCol).toBe(1);
      expect(layout.bars).toHaveLength(1);
      expect(layout.bars[0].slots[0]).toMatchObject({ col: 1, span: 4 });
      expect(layout.bars[0].closeBarlineCol).toBe(5);
    });

    it('two bars: second bar starts after first bar closes', () => {
      // 4/4, bar1=[C Am] (beatsPerSlot=2), bar2=[F G] (beatsPerSlot=2)
      const song = parseSong('---\nmeter: 4/4\n---\n| C Am | F G |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      expect(layout.bars[0].slots[0]).toMatchObject({ col: 1, span: 2 });
      expect(layout.bars[0].slots[1]).toMatchObject({ col: 3, span: 2 });
      expect(layout.bars[0].closeBarlineCol).toBe(5);

      expect(layout.bars[1].slots[0]).toMatchObject({ col: 5, span: 2 });
      expect(layout.bars[1].slots[1]).toMatchObject({ col: 7, span: 2 });
      expect(layout.bars[1].closeBarlineCol).toBe(9);
    });

    it('3-chord bar: all slots span=1, implicit dot appended for remainder beat', () => {
      // | C Am F | in 4/4 → floor(4/3)=1, remainder=1 → C:span1, Am:span1, F:span1, implicit-dot:span1
      const song = parseSong('---\nmeter: 4/4\n---\n| C Am F |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const bar = rows.get(row)!.bars[0];

      expect(bar.slots[0]).toMatchObject({ col: 1, span: 1 }); // C
      expect(bar.slots[1]).toMatchObject({ col: 2, span: 1 }); // Am
      expect(bar.slots[2]).toMatchObject({ col: 3, span: 1 }); // F
      expect(bar.slots[3]).toMatchObject({ col: 4, span: 1, implicit: true }); // synthesized dot
      expect(bar.closeBarlineCol).toBe(5);
    });

    it('proportional: | C . Am . | renders as C:span2, Am:span2, no dot slots', () => {
      // Uniform dot pattern → proportional, dot slots skipped in layout
      const song = parseSong('---\nmeter: 4/4\n---\n| C . Am . |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const bar = rows.get(row)!.bars[0];

      expect(bar.slots).toHaveLength(2); // only chord slots emitted
      expect(bar.slots[0]).toMatchObject({ col: 1, span: 2 }); // C
      expect(bar.slots[1]).toMatchObject({ col: 3, span: 2 }); // Am
      expect(bar.closeBarlineCol).toBe(5);
    });

    it('non-proportional: | C . . Am | renders as C(1), /(1), /(1), Am(1)', () => {
      // Dots NOT at uniform positions → non-proportional
      const song = parseSong('---\nmeter: 4/4\n---\n| C . . Am |\n');
      const bar = computeGlobalLayout(song).rows.get(song.sections[0].rows[0])!.bars[0];

      expect(bar.slots).toHaveLength(4);
      expect(bar.slots[0]).toMatchObject({ col: 1, span: 1 }); // C
      expect(bar.slots[1]).toMatchObject({ col: 2, span: 1 }); // .
      expect(bar.slots[2]).toMatchObject({ col: 3, span: 1 }); // .
      expect(bar.slots[3]).toMatchObject({ col: 4, span: 1 }); // Am
      expect(bar.closeBarlineCol).toBe(5);
    });

    it('proportional: | F . C | renders as F:span2, C:span2, no dot slots', () => {
      // Trailing pad makes | F . C . | which is uniform → proportional
      const song = parseSong('---\nmeter: 4/4\n---\n| F . C |\n');
      const bar = computeGlobalLayout(song).rows.get(song.sections[0].rows[0])!.bars[0];

      expect(bar.slots).toHaveLength(2); // only chord slots
      expect(bar.slots[0]).toMatchObject({ col: 1, span: 2 }); // F
      expect(bar.slots[1]).toMatchObject({ col: 3, span: 2 }); // C
      expect(bar.closeBarlineCol).toBe(5);
    });

    it('time signature change mid-row: first slot of changed bar has showTimeSig', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      // Bar 0: shows 4/4 from song.meter (no explicit bar.timeSignature needed)
      expect(layout.bars[0].slots[0].showTimeSig).toEqual({ numerator: 4, denominator: 4 });

      // Bar 1: has time sig annotation because bar.timeSignature is set (change to 2/4)
      expect(layout.bars[1].slots[0].showTimeSig).toEqual({ numerator: 2, denominator: 4 });
      expect(layout.bars[1].slots[0]).toMatchObject({ col: 5, span: 2 });
      expect(layout.bars[1].closeBarlineCol).toBe(7);
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
      // Verse row: 4 bars of 4/4 with 1 slot each = 16 beats, barlines at 1,5,9,13,17
      // Chorus row: 2 bars of 4/4 with 1 slot each = 8 beats, final barline at col 9
      const song = parseSong('[Verse]\n| (4/4) C | Am | F | G |\n[Chorus]\n| (4/4) C | Am |\n');
      const { rows, beatCols } = computeGlobalLayout(song);

      expect(beatCols).toBe(16);

      const verseRow = song.sections[0].rows[0];
      const chorusRow = song.sections[1].rows[0];

      const verse = rows.get(verseRow)!;
      expect(verse.bars[3].closeBarlineCol).toBe(17); // 4 bars * 4 beats = 16, +1 = 17

      const chorus = rows.get(chorusRow)!;
      expect(chorus.bars[1].closeBarlineCol).toBe(9); // 2 bars * 4 beats = 8, +1 = 9
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

    it('renders diminished quality as °', () => {
      const html = renderer.render(parseSong('| Cdim |\n'));
      expect(html).toContain('°');
    });

    it('renders half-diminished quality as Ø (capital, in superscript)', () => {
      const html = renderer.render(parseSong('| Cm7b5 |\n'));
      expect(html).toContain('<sup>Ø</sup>');
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
      expect(html).toMatch(/part="chord-bass">B</);
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
      expect(html).toMatch(/part="dot"[^>]*>\/</);
    });

    it('dot slot has correct grid-column (col 2 for second slot)', () => {
      // | C . . Am | → C at col 1, first dot at col 2
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C . . Am |\n'));
      const dotMatches = [...html.matchAll(/part="dot" style="grid-column: (\d+)/g)];
      expect(dotMatches.length).toBeGreaterThan(0);
      expect(dotMatches[0][1]).toBe('2');
    });
  });

  describe('time signature annotation', () => {
    it('shows time-sig block on first slot when bar.timeSignature is set', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n'));
      expect(html).toContain('part="time-sig"');
      expect(html).toContain('part="time-sig-num"');
      expect(html).toContain('part="time-sig-den"');
    });

    it('time-sig-num and time-sig-den contain the correct SMuFL digits', () => {
      const html = renderer.render(parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n'));
      // Time sig digits are rendered as SMuFL codepoints: U+E082 = '2', U+E084 = '4'
      expect(html).toContain(`part="time-sig-num">\uE082<`);
      expect(html).toContain(`part="time-sig-den">\uE084<`);
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
      expect(html).not.toContain('part="simile"');
      // Both bars should render as chord slots
      expect(html.match(/part="slot"/g)?.length).toBe(2);
    });

    it('shorthand: renders second identical bar as simile mark (SVG)', () => {
      const r = new HtmlRenderer({ simile: { output: 'shorthand' } });
      const html = r.render(parseSong('---\nmeter: 4/4\n---\n| C | C |\n'));
      expect(html).toContain('part="simile"');
      expect(html).toContain('<svg');
      // Only the first bar renders as a chord slot
      expect(html.match(/part="slot"/g)?.length).toBe(1);
    });

    it('shorthand: first bar of a row is never rendered as simile', () => {
      const r = new HtmlRenderer({ simile: { output: 'shorthand' } });
      // Two rows, each starting with C — the first bar of each row must not be simile
      const html = r.render(parseSong('---\nmeter: 4/4\n---\n| C | C |\n| C | C |\n'));
      // Each row has 2 bars; second bar of each row is simile = 2 simile marks
      expect(html.match(/part="simile"/g)?.length).toBe(2);
      // Each row's first bar is a chord slot = 2 chord slots
      expect(html.match(/part="slot"/g)?.length).toBe(2);
    });

    it('shorthand: non-identical bars do not trigger simile', () => {
      const r = new HtmlRenderer({ simile: { output: 'shorthand' } });
      const html = r.render(parseSong('---\nmeter: 4/4\n---\n| C | Am |\n'));
      expect(html).not.toContain('part="simile"');
      expect(html.match(/part="slot"/g)?.length).toBe(2);
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
