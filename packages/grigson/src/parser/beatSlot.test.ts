import { describe, it, expect } from 'vitest';
import { parseBar, parseRow, parseSong } from './parser.js';
import { TextRenderer } from '../renderers/text.js';

describe('beat-slot parsing', () => {
  it('parse | C | → one ChordSlot with chord C major (single-chord backward compatibility)', () => {
    const bar = parseBar('| C |');
    expect(bar.slots).toHaveLength(1);
    expect(bar.slots[0]).toEqual({ type: 'chord', chord: { type: 'chord', root: 'C', quality: 'major' } });
  });

  it('parse | C G | → two ChordSlots in order', () => {
    const bar = parseBar('| C G |');
    expect(bar.slots).toHaveLength(2);
    expect(bar.slots[0]).toEqual({ type: 'chord', chord: { type: 'chord', root: 'C', quality: 'major' } });
    expect(bar.slots[1]).toEqual({ type: 'chord', chord: { type: 'chord', root: 'G', quality: 'major' } });
  });

  it('parse | C . . G | → ChordSlot(C), DotSlot, DotSlot, ChordSlot(G)', () => {
    const bar = parseBar('| C . . G |');
    expect(bar.slots).toHaveLength(4);
    expect(bar.slots[0]).toEqual({ type: 'chord', chord: { type: 'chord', root: 'C', quality: 'major' } });
    expect(bar.slots[1]).toEqual({ type: 'dot' });
    expect(bar.slots[2]).toEqual({ type: 'dot' });
    expect(bar.slots[3]).toEqual({ type: 'chord', chord: { type: 'chord', root: 'G', quality: 'major' } });
  });

  it('parse | C G . . | → ChordSlot(C), ChordSlot(G), DotSlot, DotSlot', () => {
    const bar = parseBar('| C G . . |');
    expect(bar.slots).toHaveLength(4);
    expect(bar.slots[0]).toEqual({ type: 'chord', chord: { type: 'chord', root: 'C', quality: 'major' } });
    expect(bar.slots[1]).toEqual({ type: 'chord', chord: { type: 'chord', root: 'G', quality: 'major' } });
    expect(bar.slots[2]).toEqual({ type: 'dot' });
    expect(bar.slots[3]).toEqual({ type: 'dot' });
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
      expect(song2).toEqual(song1);
    });

    it('round-trip: | C G . . | → render → parse produces equal AST', () => {
      const song1 = parseSong('| C G . . |\n');
      const rendered = renderer.render(song1);
      const song2 = parseSong(rendered);
      expect(song2).toEqual(song1);
    });

    it('round-trip: | Am . Dm G | → render → parse produces equal AST', () => {
      const song1 = parseSong('| Am . Dm G |\n');
      const rendered = renderer.render(song1);
      const song2 = parseSong(rendered);
      expect(song2).toEqual(song1);
    });
  });

  describe('multi-slot rendering', () => {
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

  describe('multi-slot in rows', () => {
    it('parses a row where bars have different slot counts', () => {
      const row = parseRow('| C . | Am | F . G . |');
      expect(row.bars[0].slots).toHaveLength(2);
      expect(row.bars[1].slots).toHaveLength(1);
      expect(row.bars[2].slots).toHaveLength(4);
    });
  });
});
