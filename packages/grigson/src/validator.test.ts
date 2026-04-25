import { describe, it, expect } from 'vitest';
import { validate } from './validator.js';
import { parseSong } from './parser/parser.js';
import { normaliseSong } from './theory/normalise.js';
import { TextRenderer } from './renderers/text.js';

describe('validate — beat balance', () => {
  it('returns [] for 3 slots in 3/4 (balanced)', () => {
    expect(validate('| (3/4) C . G |')).toEqual([]);
  });

  it('returns [] for 4 slots in 4/4 (balanced)', () => {
    expect(validate('| (4/4) C . . G |')).toEqual([]);
  });

  it('returns one warning for 4 slots in 5/4 (underfilled)', () => {
    const result = validate('| (5/4) C . . G |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].source).toBe('grigson');
  });

  it('returns one warning for 7 slots in 4/4 (overfilled)', () => {
    const result = validate('| (4/4) C . . . . . G |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
  });

  it('returns [] for mode-1 bar (no dots), no warning regardless of chord count', () => {
    expect(validate('| C G |')).toEqual([]);
  });

  it('returns [] when second bar is mode-2 with exactly 3 slots in 3/4', () => {
    expect(validate('| (4/4) C | (3/4) Am . G |')).toEqual([]);
  });

  it('returns [] when second bar inherits 3/4 and has 3 slots', () => {
    expect(validate('| (3/4) C | Am . G |')).toEqual([]);
  });

  it('returns [] for a chart with front-matter meter "6/8" and 6-slot bars', () => {
    const source = '---\nmeter: 6/8\n---\n| C . . . . G |';
    expect(validate(source)).toEqual([]);
  });

  it('returns [] when validating the rendered output of a normalised 6/8 chart', () => {
    const source = '| (6/8) C . . . . G |';
    const normalised = normaliseSong(parseSong(source));
    const rendered = new TextRenderer().render(normalised);
    expect(validate(rendered)).toEqual([]);
  });

  it('warning range.start.line is 1 when the bad bar is on the second line', () => {
    const source = '| C . . G |\n| (5/4) C . G |';
    const result = validate(source);
    expect(result).toHaveLength(1);
    expect(result[0].range.start.line).toBe(1);
  });

  it('warning range.start.line is 0 when the bad bar is on the first line', () => {
    const source = '| (5/4) C . G |';
    const result = validate(source);
    expect(result).toHaveLength(1);
    expect(result[0].range.start.line).toBe(0);
  });

  it('warning range.start.character is > 0 (bar content starts after opening barline)', () => {
    const source = '| (5/4) C . G |';
    const result = validate(source);
    expect(result).toHaveLength(1);
    expect(result[0].range.start.character).toBeGreaterThan(0);
  });
});

describe('validate', () => {
  it('returns [] for an empty file', () => {
    expect(validate('')).toEqual([]);
  });

  it('returns [] for a minimal valid chart', () => {
    expect(validate('| C |')).toEqual([]);
  });

  it('returns one error for an unsupported quality', () => {
    // 'aug' is not a supported quality
    const result = validate('| Caug |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('error');
    expect(result[0].message.length).toBeGreaterThan(0);
    expect(result[0].source).toBe('grigson');
  });

  it('returns one error for garbage input', () => {
    const result = validate('garbage');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('error');
  });

  it('range.start.line and character are non-negative integers (0-indexed)', () => {
    const result = validate('| Caug |');
    expect(result).toHaveLength(1);
    const { line, character } = result[0].range.start;
    expect(Number.isInteger(line)).toBe(true);
    expect(Number.isInteger(character)).toBe(true);
    expect(line).toBeGreaterThanOrEqual(0);
    expect(character).toBeGreaterThanOrEqual(0);
  });

  it('returns [] for a valid chart with front matter', () => {
    const source = '---\ntitle: My Song\nkey: C\n---\n| C | Am | F | G |';
    expect(validate(source)).toEqual([]);
  });

  it('error range reflects parse error location (not always line 0)', () => {
    // A valid first line then an invalid second line
    const source = '| C |\n| Caug |';
    const result = validate(source);
    expect(result).toHaveLength(1);
    // The error should be on line 1 (0-indexed), not line 0
    expect(result[0].range.start.line).toBeGreaterThanOrEqual(1);
  });
});
