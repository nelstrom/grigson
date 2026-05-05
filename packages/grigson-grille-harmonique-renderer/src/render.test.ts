import { describe, it, expect } from 'vitest';
import type { Bar, Song, TimeSignature } from 'grigson';
import { detectPattern } from './patterns.js';
import render from './render.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIG_44: TimeSignature = { numerator: 4, denominator: 4 };
const SIG_34: TimeSignature = { numerator: 3, denominator: 4 };

function chord(root: string): Bar['slots'][number] {
  return { type: 'chord', chord: { type: 'chord', root, quality: 'major' } };
}
const dot = (): Bar['slots'][number] => ({ type: 'dot' });

function bar(...slots: Bar['slots']): Bar {
  return { type: 'bar', slots, closeBarline: { kind: 'single' } };
}

function simpleSong(bars: Bar[]): Song {
  return {
    type: 'song',
    title: null,
    key: null,
    meter: '4/4',
    sections: [
      {
        type: 'section',
        label: null,
        key: null,
        rows: [{ type: 'row', openBarline: { kind: 'single' }, bars }],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// detectPattern tests
// ---------------------------------------------------------------------------

describe('detectPattern', () => {
  it('detects pattern 1 (whole bar)', () => {
    expect(detectPattern(bar(chord('C')), SIG_44)).toBe('1');
  });

  it('detects pattern 2+2 (equal halves)', () => {
    expect(detectPattern(bar(chord('C'), chord('G')), SIG_44)).toBe('2+2');
  });

  it('detects pattern 1+1+1+1 (four chords)', () => {
    expect(detectPattern(bar(chord('C'), chord('D'), chord('E'), chord('F')), SIG_44)).toBe(
      '1+1+1+1',
    );
  });

  it('detects pattern 3+1 (chord then dot dot chord)', () => {
    // C... → '1', but C..C → '3+1'
    expect(detectPattern(bar(chord('C'), dot(), dot(), chord('G')), SIG_44)).toBe('3+1');
  });

  it('detects pattern 1+3 (chord chord-dot-dot)', () => {
    // CC.. → '1+3'
    expect(detectPattern(bar(chord('C'), chord('G')), SIG_44)).not.toBe('1+3'); // 2 proportional chords = '2+2'
    // Use explicit dot to make asymmetric
    expect(detectPattern(bar(chord('C'), chord('G'), dot(), dot()), SIG_44)).toBe('1+3');
  });

  it('detects pattern 2+1+1', () => {
    // C.CC → '2+1+1'
    expect(detectPattern(bar(chord('C'), dot(), chord('G'), chord('A')), SIG_44)).toBe('2+1+1');
  });

  it('detects pattern 1+2+1', () => {
    // CC.C → '1+2+1'
    expect(detectPattern(bar(chord('C'), chord('G'), dot(), chord('A')), SIG_44)).toBe('1+2+1');
  });

  it('detects pattern 1+1+2', () => {
    // CCC. → '1+1+2'
    expect(detectPattern(bar(chord('C'), chord('G'), chord('A'), dot()), SIG_44)).toBe('1+1+2');
  });

  it('throws for non-4/4 time signature', () => {
    expect(() => detectPattern(bar(chord('C')), SIG_34)).toThrow('4/4');
  });

  it('throws for unsupported slot pattern', () => {
    // .C.. — dot-first slot pattern has no valid mapping
    expect(() => detectPattern(bar(dot(), chord('G'), dot(), dot()), SIG_44)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// render() tests
// ---------------------------------------------------------------------------

describe('render', () => {
  it('includes a style block', () => {
    const html = render(simpleSong([bar(chord('C'))]), {});
    expect(html).toContain('<style>');
    expect(html).toContain('--cg-gap');
  });

  it('renders a bar-1 zone for a single-chord bar', () => {
    const html = render(simpleSong([bar(chord('C'))]), {});
    expect(html).toContain('part="bar bar-1"');
    expect(html).toContain('part="zone"');
  });

  it('renders a bar-2 zone for a two-chord bar', () => {
    const html = render(simpleSong([bar(chord('C'), chord('G'))]), {});
    expect(html).toContain('part="bar bar-2-2"');
    expect(html).toContain('zone-tl');
    expect(html).toContain('zone-br');
  });

  it('renders a bar-4 zone for a four-chord bar', () => {
    const html = render(simpleSong([bar(chord('C'), chord('D'), chord('E'), chord('F'))]), {});
    expect(html).toContain('part="bar bar-1-1-1-1"');
    expect(html).toContain('zone-top');
    expect(html).toContain('zone-right');
    expect(html).toContain('zone-bottom');
    expect(html).toContain('zone-left');
  });

  it('renders a title when present', () => {
    const song: Song = { ...simpleSong([bar(chord('C'))]), title: 'Blue Bossa' };
    const html = render(song, {});
    expect(html).toContain('Blue Bossa');
    expect(html).toContain('song-title');
  });

  it('renders simile bar with % glyph', () => {
    const b = bar(chord('C'));
    const html = render(simpleSong([b, b]), {});
    expect(html).toContain('bar-simile');
    expect(html).toContain('%');
  });

  it('throws for non-4/4 song meter', () => {
    const song: Song = {
      ...simpleSong([bar(chord('C'))]),
      meter: '3/4',
    };
    expect(() => render(song, {})).toThrow('4/4');
  });

  it('uses ascii accidentals when configured', () => {
    const song: Song = { ...simpleSong([bar(chord('Bb'))]), meter: '4/4' };
    const html = render(song, { accidentals: 'ascii' });
    // Root accidental 'b' appears inside a span, not as bare '♭'
    expect(html).not.toContain('♭');
  });

  it('uses unicode accidentals by default', () => {
    const song: Song = { ...simpleSong([bar(chord('Bb'))]), meter: '4/4' };
    const html = render(song, {});
    expect(html).toContain('♭');
  });
});
