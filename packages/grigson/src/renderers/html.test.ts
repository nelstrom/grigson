import { describe, it, expect } from 'vitest';
import { parseSong } from '../parser/parser.js';
import { computeGlobalLayout } from './html.js';

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

    it('mode 2 (dot slots): each slot = 1 beat', () => {
      // 4 slots (1 chord + 1 dot + 1 chord + 1 dot) → 4 beats for the bar
      const song = parseSong('---\nmeter: 4/4\n---\n| C . Am . |\n');
      const { beatCols } = computeGlobalLayout(song);
      expect(beatCols).toBe(4);
    });

    it('mixed time signatures across sections — A Man\'s A Man-style rows', () => {
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

    it('mode 2 (dot): each slot has span=1', () => {
      // | C . Am . | → 4 slots each 1 beat
      const song = parseSong('---\nmeter: 4/4\n---\n| C . Am . |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;
      const bar = layout.bars[0];

      expect(bar.slots[0]).toMatchObject({ col: 1, span: 1 }); // C
      expect(bar.slots[1]).toMatchObject({ col: 2, span: 1 }); // .
      expect(bar.slots[2]).toMatchObject({ col: 3, span: 1 }); // Am
      expect(bar.slots[3]).toMatchObject({ col: 4, span: 1 }); // .
      expect(bar.closeBarlineCol).toBe(5);
    });

    it('time signature change mid-row: first slot of changed bar has showTimeSig', () => {
      const song = parseSong('---\nmeter: 4/4\n---\n| C | (2/4) Am |\n');
      const { rows } = computeGlobalLayout(song);
      const row = song.sections[0].rows[0];
      const layout = rows.get(row)!;

      // Bar 0: no time sig annotation on first slot (4/4 is default/inherited)
      expect(layout.bars[0].slots[0].showTimeSig).toBeUndefined();

      // Bar 1: has time sig annotation because bar.timeSignature is set
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
      const song = parseSong(
        '[Verse]\n| (4/4) C | Am | F | G |\n[Chorus]\n| (4/4) C | Am |\n',
      );
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
  });
});
