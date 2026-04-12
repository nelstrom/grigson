import type { Song, Row, Bar, Chord, Barline, BeatSlot } from '../parser/types.js';
import { type NotationPreset, resolvePreset } from '../notation/registry.js';

export interface GrigsonRenderer {
  render(song: Song): string;
}

export interface TextRendererConfig {
  notation?: {
    preset?: string | Partial<NotationPreset>;
  };
  simile?: {
    output?: 'shorthand' | 'longhand';
  };
  accidentals?: 'unicode' | 'ascii';
  slashStyle?: 'horizontal' | 'diagonal' | 'ascii';
}

// ASCII-safe defaults used when no preset is specified — values must round-trip
// through the parser.
const TEXT_DEFAULT: NotationPreset = {
  major: '',
  minor: 'm',
  dominant7: '7',
  halfDiminished: 'm7b5',
  diminished: 'dim',
  maj7: 'maj7',
  min7: 'm7',
  dim7: 'dim7',
  dom7flat5: '7b5',
};

const TEXT_FLAT = 'b';
const TEXT_SHARP = '#';

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

function renderChord(chord: Chord, config: TextRendererConfig): string {
  const userPreset = config.notation?.preset;
  const preset: NotationPreset =
    userPreset !== undefined ? resolvePreset(userPreset) : TEXT_DEFAULT;

  // Root from parser is always [A-G] followed by optional trailing b or #.
  // Only replace the accidental suffix, not letters in note names.
  const rootMatch = chord.root.match(/^([A-G])(b+|#+)?$/);
  let root: string;
  if (rootMatch) {
    const letter = rootMatch[1];
    const acc = rootMatch[2] ?? '';
    const renderedAcc = acc.replace(/b/g, TEXT_FLAT).replace(/#/g, TEXT_SHARP);
    root = letter + renderedAcc;
  } else {
    root = chord.root;
  }

  const suffix = stripTags(preset[chord.quality as keyof NotationPreset] ?? '')
    .replace(/♭/g, TEXT_FLAT)
    .replace(/♯/g, TEXT_SHARP);
  return root + suffix + (chord.bass ? '/' + chord.bass : '');
}

function renderBar(bar: Bar, config: TextRendererConfig): string {
  const ts = bar.timeSignature
    ? `(${bar.timeSignature.numerator}/${bar.timeSignature.denominator}) `
    : '';
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

function slotsEqual(a: BeatSlot[], b: BeatSlot[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((slot, i) => {
    const other = b[i];
    if (slot.type !== other.type) return false;
    if (slot.type === 'chord' && other.type === 'chord') {
      const ca = slot.chord;
      const cb = other.chord;
      return ca.root === cb.root && ca.quality === cb.quality && ca.bass === cb.bass;
    }
    return true; // both dots
  });
}

function renderRow(row: Row, config: TextRendererConfig): string {
  const open = barlineSymbol(row.openBarline);
  const useShorthand = (config.simile?.output ?? 'longhand') === 'shorthand';
  let prevSlots: BeatSlot[] | null = null;
  const parts: string[] = [];
  for (const bar of row.bars) {
    const isSimile = useShorthand && prevSlots !== null && slotsEqual(bar.slots, prevSlots);
    const barText = isSimile ? '%' : renderBar(bar, config);
    parts.push(barText + ' ' + barlineSymbol(bar.closeBarline));
    prevSlots = bar.slots;
  }
  return open + ' ' + parts.join(' ');
}

function renderFrontMatter(title: string | null, key: string | null, meter: string | null): string {
  const lines: string[] = ['---'];
  if (title !== null) lines.push(`title: "${title}"`);
  if (key !== null) lines.push(`key: ${key}`);
  if (meter !== null) lines.push(`meter: ${meter}`);
  lines.push('---');
  return lines.join('\n');
}

export class TextRenderer implements GrigsonRenderer {
  constructor(private config: TextRendererConfig = {}) {}

  render(song: Song): string {
    const blocks: string[] = [];

    if (song.title !== null || song.key !== null || song.meter !== null) {
      blocks.push(renderFrontMatter(song.title, song.key, song.meter));
    }

    for (const section of song.sections) {
      const lines: string[] = [];
      for (const comment of section.preamble ?? []) {
        lines.push(comment.text);
      }
      if (section.label !== null) {
        const keyPart = section.key !== null ? ` key: ${section.key}` : '';
        lines.push(`[${section.label}]${keyPart}`);
      }
      for (const item of section.content ?? section.rows) {
        if (item.type === 'comment') {
          lines.push(item.text);
        } else {
          lines.push(renderRow(item, this.config));
        }
      }
      if (lines.length > 0) {
        blocks.push(lines.join('\n'));
      }
    }

    return blocks.join('\n\n') + (blocks.length > 0 ? '\n' : '');
  }
}
