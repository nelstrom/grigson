import { describe, it, expect } from 'vitest';
import { parseRow, parseSong } from './parser.js';
import { TextRenderer } from '../renderers/text.js';

function chord(root: string, quality = 'major') {
  return { type: 'chord', chord: { type: 'chord', root, quality } };
}

describe('simile mark (%)', () => {
  it('resolves % to the previous bar slots', () => {
    const row = parseRow('| Am | % |');
    expect(row.bars[0].slots).toMatchObject([chord('A', 'minor')]);
    expect(row.bars[1].slots).toMatchObject([chord('A', 'minor')]);
  });

  it('resolves multiple consecutive % bars', () => {
    const row = parseRow('| C | % | % | % |');
    for (const bar of row.bars) {
      expect(bar.slots).toMatchObject([chord('C')]);
    }
  });

  it('resolves % to the most recent non-simile bar', () => {
    const row = parseRow('| G | D | % |');
    expect(row.bars[0].slots).toMatchObject([chord('G')]);
    expect(row.bars[1].slots).toMatchObject([chord('D')]);
    expect(row.bars[2].slots).toMatchObject([chord('D')]);
  });

  it('resolves % when last real bar has multiple slots', () => {
    const row = parseRow('| C . G | % |');
    const expected = [
      { type: 'chord', chord: { type: 'chord', root: 'C', quality: 'major' } },
      { type: 'dot' },
      { type: 'chord', chord: { type: 'chord', root: 'G', quality: 'major' } },
    ];
    expect(row.bars[0].slots).toMatchObject(expected);
    expect(row.bars[1].slots).toMatchObject(expected);
  });

  it('% does not carry the time signature of the preceding bar', () => {
    const row = parseRow('| (3/4) C | % |');
    expect(row.bars[0].timeSignature).toEqual({ numerator: 3, denominator: 4 });
    expect(row.bars[1].timeSignature).toBeUndefined();
  });

  it('% with a non-single closing barline preserves that barline', () => {
    const row = parseRow('| C | % ||.');
    expect(row.bars[1].closeBarline).toEqual({ kind: 'final' });
    expect(row.bars[1].slots).toMatchObject([chord('C')]);
  });

  it('% with a repeat-end closing barline', () => {
    const row = parseRow('||: C | % :||');
    expect(row.bars[1].closeBarline).toEqual({ kind: 'endRepeat' });
    expect(row.bars[1].slots).toMatchObject([chord('C')]);
  });

  it('resolved % bar has no simile property in the AST', () => {
    const row = parseRow('| C | % |');
    expect((row.bars[1] as { simile?: unknown }).simile).toBeUndefined();
  });

  it('parses a full song with simile marks', () => {
    const source = '| G | D | % |\n| C | % | % |\n';
    const song = parseSong(source);
    const rows = song.sections[0].rows;
    expect(rows[0].bars[2].slots).toMatchObject([chord('D')]);
    expect(rows[1].bars[1].slots).toMatchObject([chord('C')]);
    expect(rows[1].bars[2].slots).toMatchObject([chord('C')]);
  });

  it('renderer emits resolved chord content (longhand) by default', () => {
    const source = '| G | D | % |\n';
    const song = parseSong(source);
    const rendered = new TextRenderer().render(song);
    expect(rendered).toBe('| G | D | D |\n');
  });

  it('renderer emits % for repeated bars when simile.output is shorthand', () => {
    const source = '| G | D | D |\n';
    const song = parseSong(source);
    const rendered = new TextRenderer({ simile: { output: 'shorthand' } }).render(song);
    expect(rendered).toBe('| G | D | % |\n');
  });

  it('shorthand never emits % for the first bar of a row', () => {
    const source = '| G | G | G |\n';
    const song = parseSong(source);
    const rendered = new TextRenderer({ simile: { output: 'shorthand' } }).render(song);
    expect(rendered).toBe('| G | % | % |\n');
  });

  it('shorthand round-trip: source with % parses and re-renders as %', () => {
    const source = '| Am | G | % | % |\n';
    const song = parseSong(source);
    const rendered = new TextRenderer({ simile: { output: 'shorthand' } }).render(song);
    expect(rendered).toBe('| Am | G | % | % |\n');
  });
});
