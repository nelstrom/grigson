import { describe, it, expect } from 'vitest';
import { validate } from './validator.js';

describe('validate', () => {
  it('returns [] for an empty file', () => {
    expect(validate('')).toEqual([]);
  });

  it('returns [] for a minimal valid chart', () => {
    expect(validate('| C |')).toEqual([]);
  });

  it('returns one error for an unsupported quality (Cm7 is now valid — use a truly unsupported suffix)', () => {
    // 'sus4' is not a supported quality
    const result = validate('| Csus4 |');
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
    const result = validate('| Csus4 |');
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
    const source = '| C |\n| Csus4 |';
    const result = validate(source);
    expect(result).toHaveLength(1);
    // The error should be on line 1 (0-indexed), not line 0
    expect(result[0].range.start.line).toBeGreaterThanOrEqual(1);
  });
});
