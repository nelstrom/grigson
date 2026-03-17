import { describe, it, expect } from 'vitest';
import { parseSong } from '../parser/parser.js';
import { TextRenderer } from './text.js';

const renderer = new TextRenderer();
const render = (source: string) => renderer.render(parseSong(source));

describe('text renderer', () => {
  describe('front matter', () => {
    it('renders title and key in a --- block', () => {
      const out = render('---\ntitle: "My Song"\nkey: G\n---\n');
      expect(out).toContain('---');
      expect(out).toContain('title: "My Song"');
      expect(out).toContain('key: G');
    });

    it('omits front matter block when title and key are both absent', () => {
      const out = render('| C | Am |\n');
      expect(out).not.toContain('---');
    });

    it('renders meter in front matter', () => {
      const out = render('---\nmeter: 3/4\n---\n| C | Am |\n');
      expect(out).toContain('meter: 3/4');
    });

    it('renders front matter block when only meter is present', () => {
      const out = render('---\nmeter: 2/4\n---\n| C | Am |\n');
      expect(out).toContain('---');
      expect(out).toContain('meter: 2/4');
    });

    it('omits meter line when meter is null', () => {
      const out = render('---\ntitle: "My Song"\n---\n| C | Am |\n');
      expect(out).not.toContain('meter');
    });
  });

  describe('bars and rows', () => {
    it('renders a single bar with normalised spacing', () => {
      const out = render('|Am|\n');
      expect(out).toContain('| Am |');
    });

    it('renders a row of four bars on one line', () => {
      const out = render('| C | Am | F | G |\n');
      expect(out.trim()).toBe('| C | Am | F | G |');
    });

    it('renders each row on its own line', () => {
      const out = render('| C | Am |\n| F | G |\n');
      const lines = out.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('| C | Am |');
      expect(lines[1]).toBe('| F | G |');
    });
  });

  describe('half-diminished chords', () => {
    it('renders a half-diminished chord with m7b5 suffix', () => {
      const out = render('| Bm7b5 | E7 | Am |\n');
      expect(out).toContain('| Bm7b5 |');
    });

    it('round-trips a half-diminished chord', () => {
      const source = '| Bm7b5 | E7 | Am |\n';
      const ast1 = parseSong(source);
      const ast2 = parseSong(render(source));
      expect(ast2).toEqual(ast1);
    });
  });

  describe('new chord qualities', () => {
    it('renders diminished chord with dim suffix', () => {
      const out = render('| Cdim |\n');
      expect(out).toContain('| Cdim |');
    });

    it('renders maj7 chord with maj7 suffix', () => {
      const out = render('| Cmaj7 |\n');
      expect(out).toContain('| Cmaj7 |');
    });

    it('renders CM7 as maj7', () => {
      const out = render('| CM7 |\n');
      expect(out).toContain('| Cmaj7 |');
    });

    it('renders min7 chord with m7 suffix', () => {
      const out = render('| Dm7 |\n');
      expect(out).toContain('| Dm7 |');
    });

    it('renders dim7 chord with dim7 suffix', () => {
      const out = render('| Bdim7 |\n');
      expect(out).toContain('| Bdim7 |');
    });

    it('round-trips diminished', () => {
      const source = '| Cdim |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });

    it('round-trips maj7', () => {
      const source = '| Cmaj7 |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });

    it('round-trips min7', () => {
      const source = '| Dm7 |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });

    it('round-trips dim7', () => {
      const source = '| Bdim7 |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });

    it('renders dom7flat5 chord with 7b5 suffix', () => {
      const out = render('| G7b5 |\n');
      expect(out).toContain('| G7b5 |');
    });

    it('round-trips dom7flat5', () => {
      const source = '| G7b5 |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });

    it('renders C- as m7 (dash min7)', () => {
      const out = render('| C- |\n');
      expect(out).toContain('| Cm7 |');
    });

    it('round-trips dash minor via m7 canonical form', () => {
      // C- parses to min7, which renders as Cm7, which parses to the same AST
      const ast1 = parseSong('| C- |\n');
      const ast2 = parseSong(render('| C- |\n'));
      expect(ast2).toEqual(ast1);
    });
  });

  describe('slash chords', () => {
    it('renders F/C', () => {
      const out = render('| F/C |\n');
      expect(out).toContain('| F/C |');
    });

    it('renders F#/A#', () => {
      const out = render('| F#/A# |\n');
      expect(out).toContain('| F#/A# |');
    });

    it('renders C-/Bb as Cm7/Bb', () => {
      const out = render('| C-/Bb |\n');
      expect(out).toContain('| Cm7/Bb |');
    });

    it('round-trips F/C', () => {
      const source = '| F/C |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });

    it('round-trips F#/A#', () => {
      const source = '| F#/A# |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });

    it('round-trips G7/B', () => {
      const source = '| G7/B |\n';
      expect(parseSong(render(source))).toEqual(parseSong(source));
    });
  });

  describe('round-trip', () => {
    it('parse → render → parse produces an equal AST', () => {
      const source =
        '---\ntitle: "Autumn Leaves"\nkey: G\n---\n| G7 | C | Am | F |\n| Dm | G7 | C | C |\n';
      const ast1 = parseSong(source);
      const ast2 = parseSong(render(source));
      expect(ast2).toEqual(ast1);
    });

    it('round-trip with no front matter', () => {
      const source = '| C | Am | F | G |\n';
      const ast1 = parseSong(source);
      const ast2 = parseSong(render(source));
      expect(ast2).toEqual(ast1);
    });

    it('preserves comment lines through render', () => {
      const source = '# intro comment\n[Verse]\n| C | Am |\n# between rows\n| F | G |\n';
      const rendered = render(source);
      // preamble comment should appear before the section label
      expect(rendered.indexOf('# intro comment')).toBeLessThan(rendered.indexOf('[Verse]'));
      // inline comment should appear between the two rows
      expect(rendered).toContain('# between rows');
      const ast1 = parseSong(source);
      const ast2 = parseSong(rendered);
      expect(ast2).toEqual(ast1);
    });
  });
});
