import { describe, it, expect } from 'vitest';
import { keyCompletions } from './completion.js';

describe('keyCompletions', () => {
  it('front-matter context: cursor after `key:` in front matter returns ranked candidates', () => {
    const source = ['---', 'key: C major', '---', '| C | F | G | C |', ''].join('\n');
    // cursor at end of the `key: C major` line (line index 1)
    const result = keyCompletions(source, 1, 'key: C major'.length);
    expect(result.context).toBe('front-matter');
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].key).toBe('C major');
  });

  it('section context: cursor after `[Label] key:` returns candidates for that section', () => {
    const source = ['[Verse] key: C major', '| G | D | Em | C |', ''].join('\n');
    const result = keyCompletions(source, 0, '[Verse] key: '.length);
    expect(result.context).toBe('section');
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it('null context: cursor on a non-key line', () => {
    const source = ['---', 'key: C major', '---', '| C | F | G | C |', ''].join('\n');
    const result = keyCompletions(source, 3, 5);
    expect(result.context).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('unparseable source does not throw', () => {
    const source = ['[Verse] key: ', '| C | Zz nonsense'].join('\n');
    expect(() => keyCompletions(source, 0, '[Verse] key: '.length)).not.toThrow();
    const result = keyCompletions(source, 0, '[Verse] key: '.length);
    expect(result.context).toBe('section');
    expect(result.candidates).toEqual([]);
  });
});
