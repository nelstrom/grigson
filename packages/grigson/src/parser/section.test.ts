import { describe, it, expect } from 'vitest';
import { parseSong } from './parser.js';
import { TextRenderer } from '../renderers/text.js';
import { normaliseSong } from '../theory/normalise.js';

const renderer = new TextRenderer();

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

describe('section parsing', () => {
  it('a song with no section labels has one section with label = null containing all rows', () => {
    const song = parseSong('| C | Am | F | G |\n| Dm | G7 | C | C |\n');
    expect(song.sections).toHaveLength(1);
    expect(song.sections[0].label).toBeNull();
    expect(song.sections[0].rows).toHaveLength(2);
  });

  it('parses two labelled sections with correct labels and rows', () => {
    const source = '[Verse]\n| C | Am |\n[Chorus]\n| F | G |\n';
    const song = parseSong(source);
    expect(song.sections).toHaveLength(2);
    expect(song.sections[0].label).toBe('Verse');
    expect(song.sections[0].rows).toHaveLength(1);
    const bar0slot0 = song.sections[0].rows[0].bars[0].slots[0];
    expect(bar0slot0.type === 'chord' && bar0slot0.chord.root).toBe('C');
    expect(song.sections[1].label).toBe('Chorus');
    expect(song.sections[1].rows).toHaveLength(1);
    const bar1slot0 = song.sections[1].rows[0].bars[0].slots[0];
    expect(bar1slot0.type === 'chord' && bar1slot0.chord.root).toBe('F');
  });

  it('blank lines between section label and rows do not produce extra section nodes', () => {
    const source = '[Verse]\n\n| C | Am |\n';
    const song = parseSong(source);
    expect(song.sections).toHaveLength(1);
    expect(song.sections[0].label).toBe('Verse');
    expect(song.sections[0].rows).toHaveLength(1);
  });

  it('blank lines between sections do not produce extra section nodes', () => {
    const source = '[Verse]\n| C | Am |\n\n[Chorus]\n| F | G |\n';
    const song = parseSong(source);
    expect(song.sections).toHaveLength(2);
    expect(song.sections[0].label).toBe('Verse');
    expect(song.sections[1].label).toBe('Chorus');
  });

  it('TextRenderer emits section labels on their own line', () => {
    const source = '[Verse]\n| C | Am |\n[Chorus]\n| F | G |\n';
    const song = parseSong(source);
    const output = renderer.render(song);
    expect(output).toContain('[Verse]');
    expect(output).toContain('[Chorus]');
    const lines = output.trim().split('\n');
    expect(lines[0]).toBe('[Verse]');
    expect(lines[1]).toBe('| C | Am |');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('[Chorus]');
    expect(lines[4]).toBe('| F | G |');
  });

  it('TextRenderer omits label line when label is null', () => {
    const source = '| C | Am |\n| F | G |\n';
    const song = parseSong(source);
    const output = renderer.render(song);
    expect(output).not.toContain('[');
    expect(output).not.toContain(']');
  });

  it('round-trip: parse → render → parse produces equal ASTs', () => {
    const source = '[Verse]\n| C | Am | F | G |\n[Chorus]\n| F | G | Am | C |\n';
    const ast1 = parseSong(source);
    const rendered = renderer.render(ast1);
    const ast2 = parseSong(rendered);
    expect(withoutLoc(ast2)).toEqual(withoutLoc(ast1));
  });
});

describe('section key annotation', () => {
  it('[Verse] key: E → section.key === "E"', () => {
    const song = parseSong('[Verse] key: E\n| E | A |\n');
    expect(song.sections[0].key).toBe('E');
  });

  it('[Chorus] key: Am → section.key === "Am"', () => {
    const song = parseSong('[Chorus] key: Am\n| Am | F |\n');
    expect(song.sections[0].key).toBe('Am');
  });

  it('[Bridge] key: F# dorian → section.key === "F# dorian"', () => {
    const song = parseSong('[Bridge] key: F# dorian\n| F#m | B |\n');
    expect(song.sections[0].key).toBe('F# dorian');
  });

  it('label with no annotation → section.key === null', () => {
    const song = parseSong('[Verse]\n| C | G |\n');
    expect(song.sections[0].key).toBeNull();
  });

  it('[Section] key: H → throws a parse error', () => {
    expect(() => parseSong('[Section] key: H\n| C | G |\n')).toThrow();
  });

  it('TextRenderer emits "[Chorus] key: Am" when key is present', () => {
    const song = parseSong('[Chorus] key: Am\n| Am | F | C | G |\n');
    const output = renderer.render(song);
    const lines = output.trim().split('\n');
    expect(lines[0]).toBe('[Chorus] key: Am');
  });

  it('round-trip with key annotation: parse → render → parse produces equal AST', () => {
    const source = '[Verse] key: E\n| E | A | B | E |\n[Chorus] key: Am\n| Am | F | C | G |\n';
    const ast1 = parseSong(source);
    const rendered = renderer.render(ast1);
    const ast2 = parseSong(rendered);
    expect(withoutLoc(ast2)).toEqual(withoutLoc(ast1));
  });

  it('normaliser uses declared key: [Chorus] key: Db with C#m7 → root normalised to Db', () => {
    // C# and Db are enharmonic; Db major's note set uses Db not C#
    const source = '[Chorus] key: Db\n| C#m7 | Ab7 | Db |\n';
    const song = parseSong(source);
    const normalised = normaliseSong(song);
    const slot = normalised.sections[0].rows[0].bars[0].slots[0];
    expect(slot.type === 'chord' && slot.chord.root).toBe('Db');
  });
});
