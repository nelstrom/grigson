import { describe, it, expect } from 'vitest';
import { parseBar, parseRow, parseSong } from './parser.js';
import { TextRenderer } from '../renderers/text.js';

describe('extended barlines', () => {
  describe('OpenBarline parsing', () => {
    it('parses a single | opening barline', () => {
      const row = parseRow('| C |');
      expect(row.openBarline).toEqual({ kind: 'single' });
    });

    it('parses a || double opening barline', () => {
      const row = parseRow('|| C |');
      expect(row.openBarline).toEqual({ kind: 'double' });
    });

    it('parses a ||: startRepeat opening barline', () => {
      const row = parseRow('||: C |');
      expect(row.openBarline).toEqual({ kind: 'startRepeat' });
    });

    it('parses a :|| endRepeat opening barline', () => {
      const row = parseRow(':|| C |');
      expect(row.openBarline).toEqual({ kind: 'endRepeat' });
    });

    it('parses a :||: endRepeatStartRepeat opening barline', () => {
      const row = parseRow(':||: C |');
      expect(row.openBarline).toEqual({ kind: 'endRepeatStartRepeat' });
    });
  });

  describe('CloseBarline parsing', () => {
    it('parses a single | closing barline on a bar', () => {
      const bar = parseBar('| C |');
      expect(bar.closeBarline).toEqual({ kind: 'single' });
    });

    it('parses a || double closing barline', () => {
      const bar = parseBar('| C ||');
      expect(bar.closeBarline).toEqual({ kind: 'double' });
    });

    it('parses a ||. final closing barline', () => {
      const bar = parseBar('| C ||.');
      expect(bar.closeBarline).toEqual({ kind: 'final' });
    });

    it('parses a ||: startRepeat closing barline', () => {
      const bar = parseBar('| C ||:');
      expect(bar.closeBarline).toEqual({ kind: 'startRepeat' });
    });

    it('parses a :|| endRepeat closing barline', () => {
      const bar = parseBar('| C :||');
      expect(bar.closeBarline).toEqual({ kind: 'endRepeat' });
    });

    it('parses a :||x3 endRepeat with repeatCount=3', () => {
      const bar = parseBar('| C :||x3');
      expect(bar.closeBarline).toEqual({ kind: 'endRepeat', repeatCount: 3 });
    });

    it('parses a :||: endRepeatStartRepeat closing barline', () => {
      const bar = parseBar('| C :||:');
      expect(bar.closeBarline).toEqual({ kind: 'endRepeatStartRepeat' });
    });

    it('parses a :||x2: endRepeatStartRepeat with repeatCount=2', () => {
      const bar = parseBar('| C :||x2:');
      expect(bar.closeBarline).toEqual({ kind: 'endRepeatStartRepeat', repeatCount: 2 });
    });
  });

  describe('CloseBarline in rows', () => {
    it('final bar in a row can have ||. barline', () => {
      const row = parseRow('| C | Am ||.');
      expect(row.bars[0].closeBarline).toEqual({ kind: 'single' });
      expect(row.bars[1].closeBarline).toEqual({ kind: 'final' });
    });

    it('mid-row :||: signals end-and-restart repeat', () => {
      const row = parseRow('||: C | Am :||: F | G :||');
      expect(row.openBarline).toEqual({ kind: 'startRepeat' });
      expect(row.bars[0].closeBarline).toEqual({ kind: 'single' });
      expect(row.bars[1].closeBarline).toEqual({ kind: 'endRepeatStartRepeat' });
      expect(row.bars[2].closeBarline).toEqual({ kind: 'single' });
      expect(row.bars[3].closeBarline).toEqual({ kind: 'endRepeat' });
    });
  });

  describe('TextRenderer barline output', () => {
    const renderer = new TextRenderer();
    const render = (src: string) => renderer.render(parseSong(src)).trim();

    it('renders single barlines as |', () => {
      expect(render('| C | Am |\n')).toBe('| C | Am |');
    });

    it('renders || double barline', () => {
      expect(render('|| C |\n')).toBe('|| C |');
    });

    it('renders ||. final barline', () => {
      expect(render('| C ||.\n')).toBe('| C ||.');
    });

    it('renders ||: startRepeat barline', () => {
      expect(render('||: C |\n')).toBe('||: C |');
    });

    it('renders :|| endRepeat barline', () => {
      expect(render('| C :||')).toBe('| C :||');
    });

    it('renders :||x3 endRepeat with repeatCount', () => {
      expect(render('| C :||x3')).toBe('| C :||x3');
    });

    it('renders :||: endRepeatStartRepeat barline', () => {
      expect(render('| C :||:')).toBe('| C :||:');
    });

    it('round-trips ||: / :|| repeat barlines', () => {
      const source = '||: C | Am | F | G :||';
      const ast1 = parseSong(source);
      const ast2 = parseSong(renderer.render(ast1));
      expect(ast2).toEqual(ast1);
    });

    it('round-trips ||. final barline', () => {
      const source = '| C | Am | F | G ||.';
      const ast1 = parseSong(source);
      const ast2 = parseSong(renderer.render(ast1));
      expect(ast2).toEqual(ast1);
    });

    it('round-trips :||x3 repeat count', () => {
      const source = '||: C | Am | F | G :||x3';
      const ast1 = parseSong(source);
      const ast2 = parseSong(renderer.render(ast1));
      expect(ast2).toEqual(ast1);
    });
  });
});
