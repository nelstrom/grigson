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

  describe('bar parsing', () => {
    const cMajor = { type: 'chord', root: 'C', quality: 'major' };
    const aMinor = { type: 'chord', root: 'A', quality: 'minor' };
    const g7 = { type: 'chord', root: 'G', quality: 'dominant7' };

    it('parses | C |', () => {
      expect(parseBar('| C |')).toEqual({ type: 'bar', chord: cMajor });
    });

    it('parses | Am |', () => {
      expect(parseBar('| Am |')).toEqual({ type: 'bar', chord: aMinor });
    });

    it('parses |C| with no spaces', () => {
      expect(parseBar('|C|')).toEqual({ type: 'bar', chord: cMajor });
    });

    it('parses |  G7  | with extra spaces', () => {
      expect(parseBar('|  G7  |')).toEqual({ type: 'bar', chord: g7 });
    });

    it('rejects an empty bar | |', () => {
      expect(() => parseBar('| |')).toThrow();
    });

    it('rejects a bar with two chords | C G |', () => {
      expect(() => parseBar('| C G |')).toThrow();
    });
  });

  describe('song parsing', () => {
    const chord = (root: string, quality: string) => ({ type: 'chord', root, quality });
    const bar = (root: string, quality: string) => ({ type: 'bar', chord: chord(root, quality) });
    const row = (...bars: ReturnType<typeof bar>[]) => ({ type: 'row', bars });

    it('parses a minimal song with no front matter', () => {
      const song = parseSong('| C | Am | F | G |\n');
      expect(song.type).toBe('song');
      expect(song.title).toBeNull();
      expect(song.key).toBeNull();
      expect(song.rows).toHaveLength(1);
      expect(song.rows[0]).toEqual(
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
      expect(song.key).toBe('G');
      expect(song.rows).toHaveLength(2);
    });

    it('ignores blank lines between rows', () => {
      const source = '| C | Am |\n\n| F | G |\n';
      const song = parseSong(source);
      expect(song.rows).toHaveLength(2);
    });

    it('parses a song with front matter only (no rows)', () => {
      const song = parseSong('---\ntitle: "Empty"\n---\n');
      expect(song.title).toBe('Empty');
      expect(song.rows).toHaveLength(0);
    });
  });

  describe('front matter parsing', () => {
    it('parses title and key', () => {
      const fm = parseFrontMatter('---\ntitle: "Autumn Leaves"\nkey: G\n---\n');
      expect(fm).toEqual({ type: 'frontMatter', title: 'Autumn Leaves', key: 'G' });
    });

    it('parses title without key', () => {
      const fm = parseFrontMatter('---\ntitle: "My Song"\n---\n');
      expect(fm).toEqual({ type: 'frontMatter', title: 'My Song', key: null });
    });

    it('parses key without title', () => {
      const fm = parseFrontMatter('---\nkey: Bb\n---\n');
      expect(fm).toEqual({ type: 'frontMatter', title: null, key: 'Bb' });
    });

    it('parses empty front matter', () => {
      const fm = parseFrontMatter('---\n---\n');
      expect(fm).toEqual({ type: 'frontMatter', title: null, key: null });
    });

    it('accepts all 17 valid key spellings', () => {
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
        expect(fm.key).toBe(key);
      }
    });

    it('rejects an invalid key (H)', () => {
      expect(() => parseFrontMatter('---\nkey: H\n---\n')).toThrow();
    });

    it('rejects a key with a mode suffix (Am)', () => {
      expect(() => parseFrontMatter('---\nkey: Am\n---\n')).toThrow();
    });
  });

  describe('row parsing', () => {
    const bar = (root: string, quality: string) => ({
      type: 'bar',
      chord: { type: 'chord', root, quality },
    });

    it('parses a four-bar row', () => {
      const row = parseRow('| C | Am | F | G |');
      expect(row.type).toBe('row');
      expect(row.bars).toHaveLength(4);
      expect(row.bars[0]).toEqual(bar('C', 'major'));
      expect(row.bars[1]).toEqual(bar('A', 'minor'));
      expect(row.bars[2]).toEqual(bar('F', 'major'));
      expect(row.bars[3]).toEqual(bar('G', 'major'));
    });

    it('parses a single-bar row', () => {
      const row = parseRow('| C |');
      expect(row.type).toBe('row');
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

  describe('unsupported qualities are rejected', () => {
    it('rejects Cm7', () => {
      expect(() => parseChord('Cm7')).toThrow();
    });

    it('rejects CM7', () => {
      expect(() => parseChord('CM7')).toThrow();
    });

    it('rejects Cdim', () => {
      expect(() => parseChord('Cdim')).toThrow();
    });
  });
});
