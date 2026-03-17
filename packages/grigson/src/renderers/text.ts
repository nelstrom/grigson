import type { Song, Row, Bar, Chord, Barline } from '../parser/types.js';

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
    case 'dom7flat5':
      suffix = '7b5';
      break;
    default:
      suffix = '';
  }
  return chord.root + suffix + (chord.bass ? '/' + chord.bass : '');
}

function renderBar(bar: Bar, config: TextRendererConfig): string {
  const ts = bar.timeSignature ? `(${bar.timeSignature.numerator}/${bar.timeSignature.denominator}) ` : '';
  const slotsText = bar.slots
    .map((slot) => (slot.type === 'chord' ? renderChord(slot.chord, config) : '.'))
    .join(' ');
  return ts + slotsText;
}

function barlineSymbol(b: Barline): string {
  const suffix = b.repeatCount && b.repeatCount > 2 ? `x${b.repeatCount}` : '';
  switch (b.kind) {
    case 'single':
      return '|';
    case 'double':
      return '||';
    case 'final':
      return '||.';
    case 'startRepeat':
      return '||:';
    case 'endRepeat':
      return ':||' + suffix;
    case 'endRepeatStartRepeat':
      return ':||:' + suffix;
  }
}

function renderRow(row: Row, config: TextRendererConfig): string {
  const open = barlineSymbol(row.openBarline);
  const bars = row.bars.map((bar) => renderBar(bar, config) + ' ' + barlineSymbol(bar.closeBarline)).join(' ');
  return open + ' ' + bars;
}

function renderFrontMatter(title: string | null, key: string | null, meter: string | null): string {
  const lines: string[] = ['---'];
  if (title !== null) lines.push(`title: "${title}"`);
  if (key !== null) lines.push(`key: ${key}`);
  if (meter !== null) lines.push(`meter: ${meter}`);
  lines.push('---');
  return lines.join('\n') + '\n';
}

export class TextRenderer {
  constructor(private config: TextRendererConfig = {}) {}

  render(song: Song): string {
    const blocks: string[] = [];

    if (song.title !== null || song.key !== null || song.meter !== null) {
      blocks.push(renderFrontMatter(song.title, song.key, song.meter));
    }

    for (const section of song.sections) {
      const lines: string[] = [];
      if (section.label !== null) {
        lines.push(`[${section.label}]`);
      }
      for (const row of section.rows) {
        lines.push(renderRow(row, this.config));
      }
      if (lines.length > 0) {
        blocks.push(lines.join('\n'));
      }
    }

    return blocks.join('\n\n') + (blocks.length > 0 ? '\n' : '');
  }
}
