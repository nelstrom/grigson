import type { Song, Row, Bar, Chord } from '../parser/types.js';
import { type TextRendererConfig } from './text.js';
import { transposeSong } from '../theory/transpose.js';

const DEFAULT_NOTATION = {
  preset: 'jazz',
  minor: 'm',
  dominant7: '7',
  halfDim: 'm7b5',
};

const PRESETS: Record<string, any> = {
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
  return renderChord(bar.chord, config);
}

function renderRow(row: Row, config: TextRendererConfig): string {
  const barline = '<span part="barline">|</span>';
  return (
    `<div part="row">` +
    barline +
    ' ' +
    row.bars.map((bar) => renderBar(bar, config)).join(` ${barline} `) +
    ' ' +
    barline +
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

export class HtmlRenderer {
  constructor(private config: TextRendererConfig = {}) {}

  render(song: Song): string {
    let targetSong = song;
    if (this.config.transpose) {
      targetSong = transposeSong(song, this.config.transpose);
    }

    let html = '<div part="song">';

    if (targetSong.title !== null || targetSong.key !== null) {
      html += renderFrontMatter(targetSong.title, targetSong.key);
    }

    for (const row of targetSong.rows) {
      html += renderRow(row, this.config);
    }

    html += '</div>';
    return html;
  }
}
