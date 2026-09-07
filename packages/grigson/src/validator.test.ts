import { describe, it, expect } from 'vitest';
import { validate } from './validator.js';
import { parseSong } from './parser/parser.js';
import { normaliseSong } from './theory/normalise.js';
import { TextRenderer } from './renderers/text.js';

describe('validate — beat balance', () => {
  it('returns [] for 3 cells in 3/4 (balanced)', () => {
    expect(validate('| (3/4) C . G |')).toEqual([]);
  });

  it('returns [] for 4 cells in 4/4 (balanced)', () => {
    expect(validate('| (4/4) C . . G |')).toEqual([]);
  });

  it('returns one warning for 4 cells in 5/4 (underfilled)', () => {
    const result = validate('| (5/4) C . . G |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].source).toBe('grigson');
  });

  it('returns one warning for 7 cells in 4/4 (overfilled)', () => {
    const result = validate('| (4/4) C . . . . . G |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
  });

  it('returns [] for a no-dot bar where chord count divides beat count evenly', () => {
    expect(validate('| C G |')).toEqual([]);
  });

  it('returns one warning for 5 chords in 4/4 (5 does not divide 4)', () => {
    const result = validate('| (4/4) C G F G C |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].source).toBe('grigson');
  });

  it('returns one warning for 3 chords in 4/4 (3 does not divide 4)', () => {
    const result = validate('| (4/4) C G Am |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].source).toBe('grigson');
  });

  it('returns [] for 4 chords in 4/4 (4 divides 4)', () => {
    expect(validate('| (4/4) C G Am F |')).toEqual([]);
  });

  it('returns one warning for 4 chords in 6/8 (4 does not divide 6)', () => {
    const result = validate('| (6/8) C G Am F |');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].source).toBe('grigson');
  });

  it('returns [] for 2 chords in 6/8 (2 divides 6)', () => {
    expect(validate('| (6/8) C G |')).toEqual([]);
  });

  it('returns [] when second bar is mode-2 with exactly 3 cells in 3/4', () => {
    expect(validate('| (4/4) C | (3/4) Am . G |')).toEqual([]);
  });

  it('returns [] when second bar inherits 3/4 and has 3 cells', () => {
    expect(validate('| (3/4) C | Am . G |')).toEqual([]);
  });

  it('returns [] for a chart with front-matter meter "6/8" and 6-cell bars', () => {
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

describe('validate — declared key fit', () => {
  it('error tier: a declared key with (almost) no diatonic overlap', () => {
    const result = validate('---\nkey: F# major\n---\n| C | F | G | C |\n| Am | Dm | G | C |\n');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('error');
    expect(result[0].message).toContain('F# major');
    expect(result[0].message).toContain('C major');
    expect(result[0].source).toBe('grigson');
  });

  it('warning tier: a declared key that fits, but a clearly better key exists', () => {
    const result = validate('---\nkey: C major\n---\n| D | A | Bm | G |\n| D | A | G | D |\n');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].message).toContain('D major');
  });

  it('silent when the ratio is ≥ 0.85 even though another key scores higher', () => {
    // C major declared; the passage scores best as G major but C major still fits at ratio ~0.87.
    expect(validate('---\nkey: C major\n---\n| D | G | A | D | Em | Am | C | G |\n')).toEqual([]);
  });

  it('relative major/minor pair is exempt', () => {
    expect(validate('---\nkey: A minor\n---\n| C | F | G | C |\n| Am | F | C | G |\n')).toEqual([]);
  });

  it('parallel major/minor pair is exempt', () => {
    expect(validate('---\nkey: C minor\n---\n| C | F | G | C |\n')).toEqual([]);
  });

  it('natural-minor declared for a dorian tune is exempt (modal reading)', () => {
    // Em G D A — the A major (major IV) reads as E dorian ≡ D major; "E minor" is not an error.
    expect(validate('---\nkey: E minor\n---\n| Em | G | D | A |\n| Em | D | Em | G |\n')).toEqual(
      [],
    );
  });

  it('a section-header key is flagged on its own line', () => {
    const result = validate('[A] key: F# major\n| C | F | G | C |\n');
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('error');
    expect(result[0].range.start.line).toBe(0);
    expect(result[0].range.start.character).toBeGreaterThan(0);
  });

  it('an inherited (keyless) section produces no diagnostic of its own', () => {
    // [B] has no key: header. Only [A]'s declared C major is checked (over the bars it
    // governs); [B] is never independently flagged even though its chords lean elsewhere.
    const result = validate('[A] key: C major\n| C | F | G | C |\n\n[B]\n| C | Am | F | G |\n');
    expect(result).toEqual([]);
    // sanity: exactly one governed region exists (the section-header key), not two
    const flagged = validate('[A] key: F# major\n| C | F | G | C |\n\n[B]\n| C | F | G | C |\n');
    expect(flagged).toHaveLength(1);
  });

  it('the front-matter region stops at the first section that declares its own key', () => {
    // song key F# major governs only section [A]; section [B] declares its own good key.
    const result = validate(
      '---\nkey: F# major\n---\n\n[A]\n| C | F | G | C |\n\n[B] key: C major\n| C | F | G | C |\n',
    );
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('error');
    expect(result[0].range.start.line).toBe(1); // the front-matter key: line
  });

  it('diagnostic range has the LSP shape (0-based start/end line & character)', () => {
    const [d] = validate('---\nkey: F# major\n---\n| C | F | G | C |\n');
    expect(d.range).toMatchObject({
      start: { line: expect.any(Number), character: expect.any(Number) },
      end: { line: expect.any(Number), character: expect.any(Number) },
    });
    expect(d.range.start.line).toBeGreaterThanOrEqual(0);
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
    const source = '---\ntitle: My Song\nkey: C major\n---\n| C | Am | F | G |';
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
