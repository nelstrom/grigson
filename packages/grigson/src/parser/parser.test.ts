import { describe, it, expect } from 'vitest';
import { parseChord, parseBar, parseRow, parseFrontMatter, parseSong } from './parser.js';

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

  describe('diminished chords', () => {
    it('parses Cdim', () => {
      expect(parseChord('Cdim')).toEqual({ type: 'chord', root: 'C', quality: 'diminished' });
    });

    it('parses Bdim', () => {
      expect(parseChord('Bdim')).toEqual({ type: 'chord', root: 'B', quality: 'diminished' });
    });
  });

  describe('maj7 chords', () => {
    it('parses Cmaj7', () => {
      expect(parseChord('Cmaj7')).toEqual({ type: 'chord', root: 'C', quality: 'maj7' });
    });

    it('parses CM7 as maj7', () => {
      expect(parseChord('CM7')).toEqual({ type: 'chord', root: 'C', quality: 'maj7' });
    });

    it('parses Fmaj7', () => {
      expect(parseChord('Fmaj7')).toEqual({ type: 'chord', root: 'F', quality: 'maj7' });
    });
  });

  describe('min7 chords', () => {
    it('parses Dm7', () => {
      expect(parseChord('Dm7')).toEqual({ type: 'chord', root: 'D', quality: 'min7' });
    });

    it('parses Am7', () => {
      expect(parseChord('Am7')).toEqual({ type: 'chord', root: 'A', quality: 'min7' });
    });

    it('parses Bm7', () => {
      expect(parseChord('Bm7')).toEqual({ type: 'chord', root: 'B', quality: 'min7' });
    });
  });

  describe('dim7 chords', () => {
    it('parses Bdim7', () => {
      expect(parseChord('Bdim7')).toEqual({ type: 'chord', root: 'B', quality: 'dim7' });
    });

    it('parses G#dim7', () => {
      expect(parseChord('G#dim7')).toEqual({ type: 'chord', root: 'G#', quality: 'dim7' });
    });
  });

  describe('dom7flat5 chords', () => {
    it('parses G7b5', () => {
      expect(parseChord('G7b5')).toEqual({ type: 'chord', root: 'G', quality: 'dom7flat5' });
    });

    it('parses F#7b5', () => {
      expect(parseChord('F#7b5')).toEqual({ type: 'chord', root: 'F#', quality: 'dom7flat5' });
    });
  });

  describe('dash minor chords', () => {
    it('parses C- as min7', () => {
      expect(parseChord('C-')).toEqual({ type: 'chord', root: 'C', quality: 'min7' });
    });

    it('parses F#- as min7', () => {
      expect(parseChord('F#-')).toEqual({ type: 'chord', root: 'F#', quality: 'min7' });
    });

    it('parses Bb- as min7', () => {
      expect(parseChord('Bb-')).toEqual({ type: 'chord', root: 'Bb', quality: 'min7' });
    });
  });

  describe('bar parsing', () => {
    const cMajor = { type: 'chord', root: 'C', quality: 'major' };
    const aMinor = { type: 'chord', root: 'A', quality: 'minor' };
    const g7 = { type: 'chord', root: 'G', quality: 'dominant7' };
    const single = { kind: 'single' };

    it('parses | C |', () => {
      expect(parseBar('| C |')).toEqual({
        type: 'bar',
        slots: [{ type: 'chord', chord: cMajor }],
        closeBarline: single,
      });
    });

    it('parses | Am |', () => {
      expect(parseBar('| Am |')).toEqual({
        type: 'bar',
        slots: [{ type: 'chord', chord: aMinor }],
        closeBarline: single,
      });
    });

    it('parses |C| with no spaces', () => {
      expect(parseBar('|C|')).toEqual({
        type: 'bar',
        slots: [{ type: 'chord', chord: cMajor }],
        closeBarline: single,
      });
    });

    it('parses |  G7  | with extra spaces', () => {
      expect(parseBar('|  G7  |')).toEqual({
        type: 'bar',
        slots: [{ type: 'chord', chord: g7 }],
        closeBarline: single,
      });
    });

    it('rejects an empty bar | |', () => {
      expect(() => parseBar('| |')).toThrow();
    });

    it('parses | C G | as two ChordSlots', () => {
      const bar = parseBar('| C G |');
      expect(bar.slots).toHaveLength(2);
      expect(bar.slots[0]).toEqual({ type: 'chord', chord: cMajor });
      expect(bar.slots[1]).toEqual({
        type: 'chord',
        chord: { type: 'chord', root: 'G', quality: 'major' },
      });
    });
  });

  describe('song parsing', () => {
    const chord = (root: string, quality: string) => ({ type: 'chord', root, quality });
    const bar = (root: string, quality: string) => ({
      type: 'bar',
      slots: [{ type: 'chord', chord: chord(root, quality) }],
      closeBarline: { kind: 'single' },
    });
    const row = (...bars: ReturnType<typeof bar>[]) => ({
      type: 'row',
      openBarline: { kind: 'single' },
      bars,
    });

    it('parses a minimal song with no front matter', () => {
      const song = parseSong('| C | Am | F | G |\n');
      expect(song.type).toBe('song');
      expect(song.title).toBeNull();
      expect(song.key).toBeNull();
      expect(song.sections).toHaveLength(1);
      expect(song.sections[0].label).toBeNull();
      expect(song.sections[0].rows).toHaveLength(1);
      expect(song.sections[0].rows[0]).toEqual(
        row(bar('C', 'major'), bar('A', 'minor'), bar('F', 'major'), bar('G', 'major')),
      );
    });

    it('parses a song with front matter and multiple rows', () => {
      const source =
        [
          '---',
          'title: "My Song"',
          'key: G',
          '---',
          '| G | Am | C | D |',
          '| Em | C | G | D |',
        ].join('\n') + '\n';

      const song = parseSong(source);
      expect(song.title).toBe('My Song');
      expect(song.key).toBe('G major');
      expect(song.sections[0].rows).toHaveLength(2);
    });

    it('ignores blank lines between rows', () => {
      const source = '| C | Am |\n\n| F | G |\n';
      const song = parseSong(source);
      expect(song.sections[0].rows).toHaveLength(2);
    });

    it('parses a song with front matter only (no rows)', () => {
      const song = parseSong('---\ntitle: "Empty"\n---\n');
      expect(song.title).toBe('Empty');
      expect(song.sections[0].rows).toHaveLength(0);
    });
  });

  describe('front matter parsing', () => {
    it('parses title and key', () => {
      const fm = parseFrontMatter('---\ntitle: "Autumn Leaves"\nkey: G\n---\n');
      expect(fm).toEqual({
        type: 'frontMatter',
        title: 'Autumn Leaves',
        key: 'G major',
        meter: null,
      });
    });

    it('parses title without key', () => {
      const fm = parseFrontMatter('---\ntitle: "My Song"\n---\n');
      expect(fm).toEqual({ type: 'frontMatter', title: 'My Song', key: null, meter: null });
    });

    it('parses key without title', () => {
      const fm = parseFrontMatter('---\nkey: Bb\n---\n');
      expect(fm).toEqual({ type: 'frontMatter', title: null, key: 'Bb major', meter: null });
    });

    it('parses empty front matter', () => {
      const fm = parseFrontMatter('---\n---\n');
      expect(fm).toEqual({ type: 'frontMatter', title: null, key: null, meter: null });
    });

    it('accepts all 17 valid key spellings and normalizes to canonical form', () => {
      const validKeys = [
        'C',
        'C#',
        'Db',
        'D',
        'D#',
        'Eb',
        'E',
        'F',
        'F#',
        'Gb',
        'G',
        'G#',
        'Ab',
        'A',
        'A#',
        'Bb',
        'B',
      ];
      for (const key of validKeys) {
        const fm = parseFrontMatter(`---\nkey: ${key}\n---\n`);
        expect(fm.key).toBe(key + ' major');
      }
    });

    it('rejects an invalid key (H)', () => {
      expect(() => parseFrontMatter('---\nkey: H\n---\n')).toThrow();
    });

    it('accepts a minor key (Am) and normalizes to "A minor"', () => {
      const result = parseFrontMatter('---\nkey: Am\n---\n');
      expect(result.key).toBe('A minor');
    });

    it('accepts a dorian key (A dorian)', () => {
      const result = parseFrontMatter('---\nkey: A dorian\n---\n');
      expect(result.key).toBe('A dorian');
    });

    it('accepts an aeolian key (E aeolian)', () => {
      const result = parseFrontMatter('---\nkey: E aeolian\n---\n');
      expect(result.key).toBe('E aeolian');
    });

    it('accepts a mixolydian key (D mixolydian)', () => {
      const result = parseFrontMatter('---\nkey: D mixolydian\n---\n');
      expect(result.key).toBe('D mixolydian');
    });

    it('accepts "C major" and keeps it as-is', () => {
      const result = parseFrontMatter('---\nkey: C major\n---\n');
      expect(result.key).toBe('C major');
    });

    it('accepts "A minor" and keeps it as-is', () => {
      const result = parseFrontMatter('---\nkey: A minor\n---\n');
      expect(result.key).toBe('A minor');
    });

    it('accepts "C ionian" and normalizes to "C major"', () => {
      const result = parseFrontMatter('---\nkey: C ionian\n---\n');
      expect(result.key).toBe('C major');
    });

    it('parses meter: 2/4', () => {
      const fm = parseFrontMatter('---\nmeter: 2/4\n---\n');
      expect(fm.meter).toBe('2/4');
    });

    it('parses meter: mixed', () => {
      const fm = parseFrontMatter('---\nmeter: mixed\n---\n');
      expect(fm.meter).toBe('mixed');
    });

    it('parses meter: 6/8', () => {
      const fm = parseFrontMatter('---\nmeter: 6/8\n---\n');
      expect(fm.meter).toBe('6/8');
    });

    it('rejects an invalid meter', () => {
      expect(() => parseFrontMatter('---\nmeter: waltz\n---\n')).toThrow();
    });

    it('propagates meter to Song', () => {
      const song = parseSong('---\nmeter: 3/4\n---\n| C | Am |\n');
      expect(song.meter).toBe('3/4');
    });

    it('song with no meter field has meter: null', () => {
      const song = parseSong('| C | Am |\n');
      expect(song.meter).toBeNull();
    });
  });

  describe('row parsing', () => {
    const bar = (root: string, quality: string) => ({
      type: 'bar',
      slots: [{ type: 'chord', chord: { type: 'chord', root, quality } }],
      closeBarline: { kind: 'single' },
    });

    it('parses a four-bar row', () => {
      const row = parseRow('| C | Am | F | G |');
      expect(row.type).toBe('row');
      expect(row.openBarline).toEqual({ kind: 'single' });
      expect(row.bars).toHaveLength(4);
      expect(row.bars[0]).toEqual(bar('C', 'major'));
      expect(row.bars[1]).toEqual(bar('A', 'minor'));
      expect(row.bars[2]).toEqual(bar('F', 'major'));
      expect(row.bars[3]).toEqual(bar('G', 'major'));
    });

    it('parses a single-bar row', () => {
      const row = parseRow('| C |');
      expect(row.type).toBe('row');
      expect(row.openBarline).toEqual({ kind: 'single' });
      expect(row.bars).toHaveLength(1);
      expect(row.bars[0]).toEqual(bar('C', 'major'));
    });

    it('parses chord qualities correctly across bars', () => {
      const row = parseRow('| G7 | C | Am | F |');
      expect(row.bars[0]).toEqual(bar('G', 'dominant7'));
      expect(row.bars[1]).toEqual(bar('C', 'major'));
      expect(row.bars[2]).toEqual(bar('A', 'minor'));
      expect(row.bars[3]).toEqual(bar('F', 'major'));
    });

    it('rejects a row not starting with |', () => {
      expect(() => parseRow('C | Am | F | G |')).toThrow();
    });

    it('rejects a row not ending with |', () => {
      expect(() => parseRow('| C | Am | F | G')).toThrow();
    });
  });

  describe('half-diminished chords', () => {
    it('parses Bm7b5', () => {
      expect(parseChord('Bm7b5')).toEqual({ type: 'chord', root: 'B', quality: 'halfDiminished' });
    });

    it('parses Am7b5', () => {
      expect(parseChord('Am7b5')).toEqual({ type: 'chord', root: 'A', quality: 'halfDiminished' });
    });

    it('parses C#m7b5', () => {
      expect(parseChord('C#m7b5')).toEqual({
        type: 'chord',
        root: 'C#',
        quality: 'halfDiminished',
      });
    });
  });

  describe('comment lines', () => {
    it('stores a comment before the first row in preamble', () => {
      const source = '# This is a comment\n| C | Am |\n';
      const song = parseSong(source);
      expect(song.sections[0].rows).toHaveLength(1);
      expect(song.sections[0].preamble).toEqual([{ type: 'comment', text: '# This is a comment' }]);
      expect(song.sections[0].content).toHaveLength(1); // only the row
    });

    it("stores a comment before a section label in that section's preamble", () => {
      const source = '# intro\n[Verse]\n| C | Am |\n';
      const song = parseSong(source);
      expect(song.sections).toHaveLength(1);
      expect(song.sections[0].label).toBe('Verse');
      expect(song.sections[0].rows).toHaveLength(1);
      expect(song.sections[0].preamble).toEqual([{ type: 'comment', text: '# intro' }]);
    });

    it('stores a comment after a section label in content, not preamble', () => {
      const source = '[Verse]\n# after label\n| C | Am |\n';
      const song = parseSong(source);
      expect(song.sections[0].preamble).toEqual([]);
      expect(song.sections[0].content).toHaveLength(2);
      expect(song.sections[0].content![0]).toEqual({ type: 'comment', text: '# after label' });
    });

    it('preserves comment ordering between rows in content', () => {
      const source = '| C | Am |\n# between rows\n| F | G |\n';
      const song = parseSong(source);
      expect(song.sections[0].rows).toHaveLength(2);
      expect(song.sections[0].content).toHaveLength(3);
      expect(song.sections[0].content![1]).toEqual({ type: 'comment', text: '# between rows' });
    });
  });

  describe('slash chords', () => {
    it('parses F/C', () => {
      expect(parseChord('F/C')).toEqual({ type: 'chord', root: 'F', quality: 'major', bass: 'C' });
    });

    it('parses F#/A#', () => {
      expect(parseChord('F#/A#')).toEqual({
        type: 'chord',
        root: 'F#',
        quality: 'major',
        bass: 'A#',
      });
    });

    it('parses C-/Bb (dash minor with slash bass)', () => {
      expect(parseChord('C-/Bb')).toEqual({
        type: 'chord',
        root: 'C',
        quality: 'min7',
        bass: 'Bb',
      });
    });

    it('parses G7/B', () => {
      expect(parseChord('G7/B')).toEqual({
        type: 'chord',
        root: 'G',
        quality: 'dominant7',
        bass: 'B',
      });
    });

    it('parses Am/C', () => {
      expect(parseChord('Am/C')).toEqual({ type: 'chord', root: 'A', quality: 'minor', bass: 'C' });
    });

    it('does not include bass field for plain chords', () => {
      const chord = parseChord('C');
      expect(chord).not.toHaveProperty('bass');
    });
  });

  describe('unsupported qualities are rejected', () => {
    it('rejects Csus4', () => {
      expect(() => parseChord('Csus4')).toThrow();
    });

    it('rejects Caug', () => {
      expect(() => parseChord('Caug')).toThrow();
    });
  });
});
