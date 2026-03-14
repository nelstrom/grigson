import type { Song, Row, Bar, Chord } from '../parser/types.js';

export interface TextRendererConfig {
  notation?: {
    preset?: 'jazz' | 'pop' | 'symbolic';
    minor?: string;
    dominant7?: string;
    halfDim?: string;
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

  let suffix: string;
  switch (chord.quality) {
    case 'minor':
      suffix = notation.minor;
      break;
    case 'dominant7':
      suffix = notation.dominant7;
      break;
    case 'halfDiminished':
      suffix = notation.halfDim;
      break;
    case 'diminished':
      suffix = 'dim';
      break;
    case 'maj7':
      suffix = 'maj7';
      break;
    case 'min7':
      suffix = 'm7';
      break;
    case 'dim7':
      suffix = 'dim7';
      break;
    default:
      suffix = '';
  }
  return chord.root + suffix;
}

function renderBar(bar: Bar, config: TextRendererConfig): string {
  const ts = bar.timeSignature ? `(${bar.timeSignature.numerator}/${bar.timeSignature.denominator}) ` : '';
  return ts + renderChord(bar.chord, config);
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
    const parts: string[] = [];

    if (song.title !== null || song.key !== null) {
      parts.push(renderFrontMatter(song.title, song.key));
    }

    for (const section of song.sections) {
      if (section.label !== null) {
        parts.push(`[${section.label}]`);
      }
      for (const row of section.rows) {
        parts.push(renderRow(row, this.config));
      }
    }

    return parts.join('\n') + (parts.length > 0 ? '\n' : '');
  }
}
