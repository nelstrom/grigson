import type { Song, Row, Bar, Chord } from '../parser/types.js';
import { transposeSong } from '../theory/transpose.js';

export interface TextRendererConfig {
  notation?: {
    preset?: 'jazz' | 'pop' | 'symbolic';
    minor?: string;
    dominant7?: string;
    halfDim?: string;
  };
  transpose?: {
    toKey?: string;
    semitones?: number;
    accidentals?: 'sharps' | 'flats';
  };
}

const DEFAULT_NOTATION: Required<NonNullable<TextRendererConfig['notation']>> = {
  preset: 'jazz',
  minor: 'm',
  dominant7: '7',
  halfDim: 'm7b5',
};

const PRESETS: Record<string, Partial<NonNullable<TextRendererConfig['notation']>>> = {
  jazz: { minor: 'm', halfDim: 'm7b5' },
  pop: { minor: 'm', halfDim: 'm7b5' },
  symbolic: { minor: '-', halfDim: 'ø' },
};

function renderChord(chord: Chord, config: TextRendererConfig): string {
  const notation = {
    ...DEFAULT_NOTATION,
    ...PRESETS[config.notation?.preset ?? 'jazz'],
    ...config.notation,
  };

  const suffix =
    chord.quality === 'minor'
      ? notation.minor
      : chord.quality === 'dominant7'
        ? notation.dominant7
        : chord.quality === 'halfDiminished'
          ? notation.halfDim
          : '';
  return chord.root + suffix;
}

function renderBar(bar: Bar, config: TextRendererConfig): string {
  return renderChord(bar.chord, config);
}

function renderRow(row: Row, config: TextRendererConfig): string {
  return '| ' + row.bars.map((bar) => renderBar(bar, config)).join(' | ') + ' |';
}

function renderFrontMatter(title: string | null, key: string | null): string {
  const lines: string[] = ['---'];
  if (title !== null) lines.push(`title: "${title}"`);
  if (key !== null) lines.push(`key: ${key}`);
  lines.push('---');
  return lines.join('\n') + '\n';
}

export class TextRenderer {
  constructor(private config: TextRendererConfig = {}) {}

  render(song: Song): string {
    let targetSong = song;
    if (this.config.transpose) {
      targetSong = transposeSong(song, this.config.transpose);
    }

    const parts: string[] = [];

    if (targetSong.title !== null || targetSong.key !== null) {
      parts.push(renderFrontMatter(targetSong.title, targetSong.key));
    }

    for (const row of targetSong.rows) {
      parts.push(renderRow(row, this.config));
    }

    return parts.join('\n') + (parts.length > 0 ? '\n' : '');
  }
}
