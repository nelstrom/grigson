import { describe, it, expect } from 'vitest';
import { transposeChord, transposeSong } from './transpose.js';
import { Chord, Song } from '../parser/types.js';

describe('transposeChord', () => {
  const cMaj: Chord = { root: 'C', quality: 'major' };
  const aMin: Chord = { root: 'A', quality: 'minor' };
  const g7: Chord = { root: 'G', quality: 'dominant7' };

  it('transposes up a whole step', () => {
    expect(transposeChord(cMaj, 2)).toEqual({ root: 'D', quality: 'major' });
    expect(transposeChord(aMin, 2)).toEqual({ root: 'B', quality: 'minor' });
  });

  it('transposes down a minor third', () => {
    expect(transposeChord(cMaj, -3)).toEqual({ root: 'A', quality: 'major' });
  });

  it('handles sharp/flat preference for non-diatonic notes', () => {
    // C up 6 semitones is F# or Gb
    expect(transposeChord({ root: 'C', quality: 'major' }, 6, { accidentals: 'sharps' }))
      .toEqual({ root: 'F#', quality: 'major' });
    expect(transposeChord({ root: 'C', quality: 'major' }, 6, { accidentals: 'flats' }))
      .toEqual({ root: 'Gb', quality: 'major' });
  });

  it('respects target key for enharmonic spelling', () => {
    // Transpose C to Db major (1 semitone)
    // In Db major, the 4th is Gb, not F#
    expect(transposeChord({ root: 'F', quality: 'major' }, 1, { toKey: 'Db' }))
      .toEqual({ root: 'Gb', quality: 'major' });
  });
});

describe('transposeSong', () => {
  it('transposes a song by semitones', () => {
    const song: Song = {
      title: 'Test',
      key: 'C',
      rows: [
        {
          bars: [
            { chord: { root: 'C', quality: 'major' } },
            { chord: { root: 'F', quality: 'major' } },
          ],
        },
      ],
    };

    const transposed = transposeSong(song, { semitones: 2 });
    expect(transposed.key).toBe('D');
    expect(transposed.rows[0].bars[0].chord.root).toBe('D');
    expect(transposed.rows[0].bars[1].chord.root).toBe('G');
  });

  it('transposes a song to a specific key', () => {
    const song: Song = {
      title: 'Test',
      key: 'C',
      rows: [
        {
          bars: [{ chord: { root: 'C', quality: 'major' } }],
        },
      ],
    };

    const transposed = transposeSong(song, { toKey: 'G' });
    expect(transposed.key).toBe('G');
    expect(transposed.rows[0].bars[0].chord.root).toBe('G');
  });

  it('detects key if not provided in front matter', () => {
    const song: Song = {
      title: 'Test',
      key: null,
      rows: [
        {
          bars: [{ chord: { root: 'F', quality: 'major' } }],
        },
      ],
    };

    // Detected key should be F. Transpose up 2 semitones to G.
    const transposed = transposeSong(song, { semitones: 2 });
    expect(transposed.key).toBe('G');
    expect(transposed.rows[0].bars[0].chord.root).toBe('G');
  });
});
