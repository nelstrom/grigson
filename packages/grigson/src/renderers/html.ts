import type { Song, Row, Bar, Chord, Barline } from '../parser/types.js';
import { type TextRendererConfig } from './text.js';

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

export class HtmlRenderer {
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
        html += `<div part="section-label">[${section.label}]</div>`;
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
