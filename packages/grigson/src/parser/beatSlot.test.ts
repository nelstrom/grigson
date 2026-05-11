import { describe, it, expect } from 'vitest';
import { parseBar, parseRow, parseSong } from './parser.js';
import { TextRenderer } from '../renderers/text.js';

function withoutLoc(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(withoutLoc);
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as object)) {
      if (k !== 'loc') result[k] = withoutLoc(v);
    }
    return result;
  }
  return obj;
}

describe('beat-cell parsing', () => {
  it('parse | C | → one ChordCell with chord C major (single-chord backward compatibility)', () => {
    const bar = parseBar('| C |');
    expect(bar.cells).toHaveLength(1);
    expect(bar.cells[0]).toMatchObject({
      type: 'chord',
      chord: { type: 'chord', root: 'C', quality: 'major' },
    });
  });

  it('parse | C G | → two ChordCells in order', () => {
    const bar = parseBar('| C G |');
    expect(bar.cells).toHaveLength(2);
    expect(bar.cells[0]).toMatchObject({
      type: 'chord',
      chord: { type: 'chord', root: 'C', quality: 'major' },
    });
    expect(bar.cells[1]).toMatchObject({
      type: 'chord',
      chord: { type: 'chord', root: 'G', quality: 'major' },
    });
  });

  it('parse | C . . G | → ChordCell(C), DotCell, DotCell, ChordCell(G)', () => {
    const bar = parseBar('| C . . G |');
    expect(bar.cells).toHaveLength(4);
    expect(bar.cells[0]).toMatchObject({
      type: 'chord',
      chord: { type: 'chord', root: 'C', quality: 'major' },
    });
    expect(bar.cells[1]).toMatchObject({ type: 'dot' });
    expect(bar.cells[2]).toMatchObject({ type: 'dot' });
    expect(bar.cells[3]).toMatchObject({
      type: 'chord',
      chord: { type: 'chord', root: 'G', quality: 'major' },
    });
  });

  it('parse | C G . . | → ChordCell(C), ChordCell(G), DotCell, DotCell', () => {
    const bar = parseBar('| C G . . |');
    expect(bar.cells).toHaveLength(4);
    expect(bar.cells[0]).toMatchObject({
      type: 'chord',
      chord: { type: 'chord', root: 'C', quality: 'major' },
    });
    expect(bar.cells[1]).toMatchObject({
      type: 'chord',
      chord: { type: 'chord', root: 'G', quality: 'major' },
    });
    expect(bar.cells[2]).toMatchObject({ type: 'dot' });
    expect(bar.cells[3]).toMatchObject({ type: 'dot' });
  });

  it('parse | . | (dot only, no chord) → parser rejects it', () => {
    expect(() => parseBar('| . |')).toThrow();
  });

  describe('round-trip tests', () => {
    const renderer = new TextRenderer();

    it('round-trip: | C . . G | → render → parse produces equal AST', () => {
      const song1 = parseSong('| C . . G |\n');
      const rendered = renderer.render(song1);
      const song2 = parseSong(rendered);
      expect(withoutLoc(song2)).toEqual(withoutLoc(song1));
    });

    it('round-trip: | C G . . | → render → parse produces equal AST', () => {
      const song1 = parseSong('| C G . . |\n');
      const rendered = renderer.render(song1);
      const song2 = parseSong(rendered);
      expect(withoutLoc(song2)).toEqual(withoutLoc(song1));
    });

    it('round-trip: | Am . Dm G | → render → parse produces equal AST', () => {
      const song1 = parseSong('| Am . Dm G |\n');
      const rendered = renderer.render(song1);
      const song2 = parseSong(rendered);
      expect(withoutLoc(song2)).toEqual(withoutLoc(song1));
    });
  });

  describe('multi-cell rendering', () => {
    const renderer = new TextRenderer();

    it('renders | C . . G | as "| C . . G |"', () => {
      const song = parseSong('| C . . G |\n');
      expect(renderer.render(song).trim()).toBe('| C . . G |');
    });

    it('renders | C G | as "| C G |"', () => {
      const song = parseSong('| C G |\n');
      expect(renderer.render(song).trim()).toBe('| C G |');
    });
  });

  describe('multi-cell in rows', () => {
    it('parses a row where bars have different cell counts', () => {
      const row = parseRow('| C . | Am | F . G . |');
      expect(row.bars[0].cells).toHaveLength(2);
      expect(row.bars[1].cells).toHaveLength(1);
      expect(row.bars[2].cells).toHaveLength(4);
    });
  });
});
