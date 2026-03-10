import type { Song, Row, Bar, Chord } from '../parser/types.js';

function renderChord(chord: Chord): string {
  const suffix =
    chord.quality === 'minor'     ? 'm' :
    chord.quality === 'dominant7' ? '7' :
    '';
  return chord.root + suffix;
}

function renderBar(bar: Bar): string {
  return renderChord(bar.chord);
}

function renderRow(row: Row): string {
  return '| ' + row.bars.map(renderBar).join(' | ') + ' |';
}

function renderFrontMatter(title: string | null, key: string | null): string {
  const lines: string[] = ['---'];
  if (title !== null) lines.push(`title: "${title}"`);
  if (key   !== null) lines.push(`key: ${key}`);
  lines.push('---');
  return lines.join('\n') + '\n';
}

export class TextRenderer {
  render(song: Song): string {
    const parts: string[] = [];

    if (song.title !== null || song.key !== null) {
      parts.push(renderFrontMatter(song.title, song.key));
    }

    for (const row of song.rows) {
      parts.push(renderRow(row));
    }

    return parts.join('\n') + (parts.length > 0 ? '\n' : '');
  }
}
