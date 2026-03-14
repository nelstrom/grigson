import { describe, it, expect } from 'vitest';
import { parseBar, parseRow, parseSong } from './parser.js';
import { TextRenderer } from '../renderers/text.js';

describe('time signature parsing', () => {
  it('parses (4/4) in a bar', () => {
    const bar = parseBar('| (4/4) C |');
    expect(bar.timeSignature).toEqual({ numerator: 4, denominator: 4 });
  });

  it('parses (3/4) in a bar', () => {
    const bar = parseBar('| (3/4) Am |');
    expect(bar.timeSignature).toEqual({ numerator: 3, denominator: 4 });
  });

  it('parses (6/8) in a bar', () => {
    const bar = parseBar('| (6/8) G7 |');
    expect(bar.timeSignature).toEqual({ numerator: 6, denominator: 8 });
  });

  it('leaves timeSignature undefined when absent', () => {
    const bar = parseBar('| C |');
    expect(bar.timeSignature).toBeUndefined();
  });

  it('first bar has time signature, second bar does not', () => {
    const row = parseRow('| (4/4) C | Am |');
    expect(row.bars[0].timeSignature).toEqual({ numerator: 4, denominator: 4 });
    expect(row.bars[1].timeSignature).toBeUndefined();
  });

  describe('TextRenderer', () => {
    const renderer = new TextRenderer();

    it('emits (N/D) before chord when time signature is present', () => {
      const song = parseSong('| (3/4) Am |\n');
      expect(renderer.render(song)).toContain('(3/4) Am');
    });

    it('does not emit time signature prefix when absent', () => {
      const song = parseSong('| C |\n');
      expect(renderer.render(song)).not.toContain('(');
    });

    it('round-trip: parse → render → parse produces equal ASTs', () => {
      const source = '| (3/4) Am |\n';
      const song1 = parseSong(source);
      const rendered = renderer.render(song1);
      const song2 = parseSong(rendered);
      expect(song2).toEqual(song1);
    });
  });
});
