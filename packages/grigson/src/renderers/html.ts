import type { Song, Row, Bar, Chord, Barline, TimeSignature, Section } from '../parser/types.js';
import { type GrigsonRenderer, type TextRendererConfig } from './text.js';

// ---------------------------------------------------------------------------
// Global layout calculation
// ---------------------------------------------------------------------------

export interface SlotLayout {
  col: number;
  span: number;
  showTimeSig?: TimeSignature;
}

export interface RowLayout {
  openBarlineCol: number;
  bars: Array<{
    slots: SlotLayout[];
    closeBarlineCol: number;
  }>;
}

export interface GlobalLayout {
  rows: Map<Row, RowLayout>;
  beatCols: number;
  minBeatWidth: string;
}

const EM_PER_CHAR = 0.55;

const QUALITY_CHARS: Record<string, number> = {
  major: 0,
  minor: 1,       // "m"
  dominant7: 1,   // "7"
  halfDiminished: 1, // "ø"
  diminished: 1,  // "°"
  maj7: 1,        // "△"
  min7: 2,        // "m7"
  dim7: 2,        // "°7"
  dom7flat5: 3,   // "7b5"
};

function estimateChordDisplayWidthEm(chord: Chord): number {
  const rootChars = chord.root.length; // b and # are each 1 char (Unicode accidentals)
  const qualityChars = QUALITY_CHARS[chord.quality] ?? 0;
  const topChars = rootChars + qualityChars;
  if (chord.bass) {
    return Math.max(topChars, chord.bass.length) * EM_PER_CHAR;
  }
  return topChars * EM_PER_CHAR;
}

function rowsOfSection(section: Section): Row[] {
  if (section.content) {
    return section.content.filter((item): item is Row => item.type === 'row');
  }
  return section.rows;
}

export function computeGlobalLayout(song: Song): GlobalLayout {
  let activeTSig: TimeSignature = { numerator: 4, denominator: 4 };
  const rowLayouts = new Map<Row, RowLayout>();
  let globalMaxBeats = 0;
  let globalMinBeatWidthEm = 0;

  for (const section of song.sections) {
    for (const row of rowsOfSection(section)) {
      const rowLayout: RowLayout = { openBarlineCol: 1, bars: [] };
      let beatOffset = 0;

      for (const bar of row.bars) {
        if (bar.timeSignature) {
          activeTSig = bar.timeSignature;
        }

        const isMode2 = bar.slots.some((s) => s.type === 'dot');
        const beatsPerSlot = isMode2 ? 1 : activeTSig.numerator / bar.slots.length;

        const slots: SlotLayout[] = [];
        let isFirstSlot = true;

        for (const slot of bar.slots) {
          slots.push({
            col: beatOffset + 1,
            span: beatsPerSlot,
            showTimeSig: isFirstSlot && bar.timeSignature ? bar.timeSignature : undefined,
          });

          if (slot.type === 'chord') {
            const widthPerBeatEm = estimateChordDisplayWidthEm(slot.chord) / beatsPerSlot;
            if (widthPerBeatEm > globalMinBeatWidthEm) {
              globalMinBeatWidthEm = widthPerBeatEm;
            }
          }

          beatOffset += beatsPerSlot;
          isFirstSlot = false;
        }

        rowLayout.bars.push({ slots, closeBarlineCol: beatOffset + 1 });
      }

      rowLayouts.set(row, rowLayout);
      if (beatOffset > globalMaxBeats) {
        globalMaxBeats = beatOffset;
      }
    }
  }

  const minBeatWidth = `${Math.max(globalMinBeatWidthEm, 1.0).toFixed(2)}em`;
  return { rows: rowLayouts, beatCols: globalMaxBeats, minBeatWidth };
}

// ---------------------------------------------------------------------------

const DEFAULT_NOTATION = {
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

  return `<span part="chord"><span part="chord-root">${chord.root}</span><span part="chord-suffix">${suffix}</span></span>`;
}

function renderBar(bar: Bar, config: TextRendererConfig): string {
  return bar.slots
    .map((slot) =>
      slot.type === 'chord'
        ? renderChord(slot.chord, config)
        : '<span part="dot">.</span>',
    )
    .join(' ');
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
  const bl = (b: Barline) => `<span part="barline">${barlineSymbol(b)}</span>`;
  return (
    `<div part="row">` +
    bl(row.openBarline) +
    ' ' +
    row.bars.map((bar) => renderBar(bar, config) + ` ${bl(bar.closeBarline)}`).join(' ') +
    `</div>`
  );
}

function renderFrontMatter(title: string | null, key: string | null): string {
  let html = '<div part="frontmatter">---\n';
  if (title !== null) {
    html += `title: <span part="frontmatter-value">"${title}"</span>\n`;
  }
  if (key !== null) {
    html += `key: <span part="frontmatter-value">${key}</span>\n`;
  }
  html += '---</div>';
  return html;
}

export class HtmlRenderer implements GrigsonRenderer {
  constructor(private config: TextRendererConfig = {}) {}

  render(song: Song): string {
    let html = '<div part="song">';

    if (song.title !== null || song.key !== null) {
      html += renderFrontMatter(song.title, song.key);
    }

    for (const section of song.sections) {
      html += '<div part="section">';
      for (const comment of (section.preamble ?? [])) {
        html += `<div part="comment">${comment.text}</div>`;
      }
      if (section.label !== null) {
        const keySpan = section.key !== null ? ` <span part="section-key">${section.key}</span>` : '';
        html += `<div part="section-label">[${section.label}]${keySpan}</div>`;
      }
      for (const item of (section.content ?? section.rows)) {
        if (item.type === 'comment') {
          html += `<div part="comment">${item.text}</div>`;
        } else {
          html += renderRow(item, this.config);
        }
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }
}
