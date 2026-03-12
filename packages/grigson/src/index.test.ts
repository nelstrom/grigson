import { describe, it, expect } from 'vitest';
import { version } from './index.js';

describe('grigson', () => {
  it('exports a version string', () => {
    expect(version).toBe('1.0.0');
  });
});
