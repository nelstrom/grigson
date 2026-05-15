import type { Song, Bar, Chord, TimeSignature, Section, Row, ChordCell } from 'grigson';
import {
  reflowSong,
  resolvePreset,
  DEFAULT_SPOKEN_PRESET,
  chordAriaLabel,
  getRendererFontFaceCSS,
} from 'grigson';
import type { NotationPreset } from 'grigson';
import { detectPattern, type BarPattern } from './patterns.js';
import { getGrilleStyles } from './styles.js';

export interface GrilleConfig {
  notation?: { preset?: string | Partial<NotationPreset> };
  barsPerLine?: number;
  accidentals?: 'unicode' | 'ascii';
  typeface?: 'sans' | 'serif' | 'cursive';
}

// ---------------------------------------------------------------------------
// Chord rendering
// ---------------------------------------------------------------------------

function renderAccidental(acc: string, flat: string, sharp: string): string {
  return acc.replace(/b/g, flat).replace(/#/g, sharp);
}

function wrapQualityAccidentals(html: string, mode: 'unicode' | 'ascii'): string {
  return html.replace(/[♭♯]/g, (ch) => {
    const glyph = mode === 'ascii' ? (ch === '♭' ? 'b' : '#') : ch;
    return `<span part="quality-accidental" data-glyph="${mode}">${glyph}</span>`;
  });
}

function renderChordHtml(chord: Chord, preset: NotationPreset, mode: 'unicode' | 'ascii'): string {
  const flat = mode === 'unicode' ? '♭' : 'b';
  const sharp = mode === 'unicode' ? '♯' : '#';

  const rootMatch = chord.root.match(/^([A-G])(b+|#+)?$/);
  let rootHtml: string;
  if (rootMatch) {
    const letter = rootMatch[1];
    const acc = rootMatch[2] ?? '';
    rootHtml = acc
      ? `${letter}<span part="chord-accidental" data-glyph="${mode}">${renderAccidental(acc, flat, sharp)}</span>`
      : letter;
  } else {
    rootHtml = renderAccidental(chord.root, flat, sharp);
  }

  const qualityRaw = preset[chord.quality as keyof NotationPreset] ?? '';
  const qualityHtml = qualityRaw
    ? `<span part="chord-quality">${wrapQualityAccidentals(qualityRaw, mode)}</span>`
    : '';

  const inner = `<span part="chord-root">${rootHtml}</span>${qualityHtml}`;

  if (chord.bass) {
    const bassMatch = chord.bass.match(/^([A-G])(b+|#+)?$/);
    const bassHtml = bassMatch
      ? bassMatch[2]
        ? `${bassMatch[1]}<span part="chord-accidental" data-glyph="${mode}">${renderAccidental(bassMatch[2], flat, sharp)}</span>`
        : bassMatch[1]
      : renderAccidental(chord.bass, flat, sharp);
    return (
      `<span part="chord-top">${inner}</span>` +
      `<span part="chord-fraction-line"></span>` +
      `<span part="chord-bass">${bassHtml}</span>`
    );
  }
  return inner;
}

function ariaLabel(chord: Chord, beats: number, isWhole: boolean): string {
  return chordAriaLabel(chord, beats, isWhole, DEFAULT_SPOKEN_PRESET, 4);
}

// ---------------------------------------------------------------------------
// Simile detection
// ---------------------------------------------------------------------------

function cellsEqual(a: Bar, b: Bar): boolean {
  if (a.cells.length !== b.cells.length) return false;
  for (let i = 0; i < a.cells.length; i++) {
    const sa = a.cells[i];
    const sb = b.cells[i];
    if (sa.type !== sb.type) return false;
    if (sa.type === 'chord' && sb.type === 'chord') {
      if (sa.chord.root !== sb.chord.root) return false;
      if (sa.chord.quality !== sb.chord.quality) return false;
      if ((sa.chord.bass ?? null) !== (sb.chord.bass ?? null)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Effective time signature tracking
// ---------------------------------------------------------------------------

function rowsOfSection(section: Section): Row[] {
  if (section.content) {
    return section.content.filter((item): item is Row => item.type === 'row');
  }
  return section.rows;
}

// ---------------------------------------------------------------------------
// Zone + chord label HTML per pattern
// ---------------------------------------------------------------------------

interface ChordZone {
  zone: string;
  diagonal?: string;
}

interface ZoneSpec {
  lineParts: string[];
  chordParts: string[];
  // Maps each chordParts entry to a chord cell index. Defaults to [0,1,2,...].
  // Allows a cell to be rendered in multiple positions (e.g. 1+2+1 duplicates the middle chord into N and S).
  cellIndices?: number[];
  // Geometric zone for each chord, used by runAutoSize() overflow detection.
  chordZones: ChordZone[];
}

const PATTERN_ZONES: Record<BarPattern, ZoneSpec> = {
  '1': {
    lineParts: [],
    chordParts: ['chord'],
    chordZones: [{ zone: 'full' }],
  },
  '2+2': {
    lineParts: ['line line-diag'],
    chordParts: ['chord chord-tl', 'chord chord-br'],
    chordZones: [
      { zone: 'top-left', diagonal: 'anti' },
      { zone: 'bottom-right', diagonal: 'anti' },
    ],
  },
  '3+1': {
    // Beat order: W+N+S (main) | E (corner).
    // E-triangle boundaries: "/" from center→top-right + "\" from center→bottom-right.
    lineParts: ['line line-diag-tr', 'line line-anti-br'],
    chordParts: ['chord chord-main', 'chord chord-corner'],
    chordZones: [{ zone: 'full' }, { zone: 'full' }],
  },
  '1+3': {
    // Beat order: W (corner) | N+S+E (main).
    // W-triangle boundaries: "\" from top-left→center + "/" from bottom-left→center.
    lineParts: ['line line-anti-tl', 'line line-diag-bl'],
    chordParts: ['chord chord-corner', 'chord chord-main'],
    chordZones: [{ zone: 'full' }, { zone: 'full' }],
  },
  '2+1+1': {
    // Beat order: W+N (tl) | S (bottom) | E (right). "/" splits left from right; "\" half splits S from E.
    lineParts: ['line line-diag', 'line line-anti-br'],
    chordParts: ['chord chord-tl', 'chord chord-bottom', 'chord chord-right'],
    chordZones: [
      { zone: 'top-left', diagonal: 'anti' },
      { zone: 'bottom-right', diagonal: 'anti' },
      { zone: 'full' },
    ],
  },
  '1+2+1': {
    // Beat order: W | N+S | E. Rendered as four quadrants with the spanning chord duplicated into N and S.
    lineParts: ['line line-diag', 'line line-anti'],
    chordParts: ['chord chord-left', 'chord chord-top', 'chord chord-bottom', 'chord chord-right'],
    cellIndices: [0, 1, 1, 2],
    chordZones: [
      { zone: 'left', diagonal: 'anti' },
      { zone: 'top', diagonal: 'main' },
      { zone: 'bottom', diagonal: 'main' },
      { zone: 'right', diagonal: 'anti' },
    ],
  },
  '1+1+2': {
    // Beat order: W (left) | N (top) | S+E (br). "/" splits W+N from S+E; "\" half splits W from N.
    lineParts: ['line line-diag', 'line line-anti-tl'],
    chordParts: ['chord chord-left', 'chord chord-top', 'chord chord-br'],
    chordZones: [
      { zone: 'left', diagonal: 'anti' },
      { zone: 'top', diagonal: 'main' },
      { zone: 'bottom-right', diagonal: 'anti' },
    ],
  },
  '1+1+1+1': {
    // Beat order: W (left) | N (top) | S (bottom) | E (right).
    lineParts: ['line line-diag', 'line line-anti'],
    chordParts: ['chord chord-left', 'chord chord-top', 'chord chord-bottom', 'chord chord-right'],
    chordZones: [
      { zone: 'left', diagonal: 'anti' },
      { zone: 'top', diagonal: 'main' },
      { zone: 'bottom', diagonal: 'main' },
      { zone: 'right', diagonal: 'anti' },
    ],
  },
};

const PATTERN_BEATS: Record<BarPattern, number[]> = {
  '1': [4],
  '2+2': [2, 2],
  '3+1': [3, 1],
  '1+3': [1, 3],
  '2+1+1': [2, 1, 1],
  '1+2+1': [1, 1, 1, 1],
  '1+1+2': [1, 1, 2],
  '1+1+1+1': [1, 1, 1, 1],
};

function barPartClass(pattern: BarPattern): string {
  return `bar bar-${pattern.replace(/\+/g, '-')}`;
}

function renderBar(
  bar: Bar,
  activeTSig: TimeSignature,
  preset: NotationPreset,
  mode: 'unicode' | 'ascii',
  prevBar: Bar | null,
): string {
  const isSimile = prevBar !== null && cellsEqual(bar, prevBar);

  if (isSimile) {
    return `<div part="bar bar-simile"><span part="chord chord-simile" aria-label="repeat bar">\u{E500}</span></div>`;
  }

  const pattern = detectPattern(bar, activeTSig);
  const spec = PATTERN_ZONES[pattern];
  const beats = PATTERN_BEATS[pattern];
  const chordCells = bar.cells.filter((s): s is ChordCell => s.type === 'chord');

  const zones = spec.lineParts.map((p) => `<div part="${p}"></div>`).join('');

  const chords = spec.chordParts
    .map((chordPart, i) => {
      const cellIdx = spec.cellIndices ? spec.cellIndices[i] : i;
      const cell = chordCells[cellIdx ?? i];
      if (!cell) return '';
      const cellBeats = beats[i] ?? 1;
      const isWhole = cellBeats === 4;
      const label = ariaLabel(cell.chord, cellBeats, isWhole);
      const html = renderChordHtml(cell.chord, preset, mode);
      const hasBass = cell.chord.bass != null;
      const partStr = hasBass ? `${chordPart} chord-slash` : chordPart;
      const zoneSpec = spec.chordZones[i];
      const zoneAttr = zoneSpec
        ? ` data-zone="${zoneSpec.zone}"${zoneSpec.diagonal ? ` data-diagonal="${zoneSpec.diagonal}"` : ''}`
        : '';
      return `<span part="${partStr}" aria-label="${label}"${zoneAttr}>${html}</span>`;
    })
    .join('');

  return `<div part="${barPartClass(pattern)}">${zones}${chords}</div>`;
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export default function render(song: Song, config: GrilleConfig = {}): string {
  const barsPerLine = config.barsPerLine ?? 4;
  const mode = config.accidentals ?? 'unicode';
  const typeface = config.typeface ?? 'sans';
  const preset = resolvePreset(config.notation?.preset);

  // Validate: all bars must be 4/4
  const defaultTSig: TimeSignature = { numerator: 4, denominator: 4 };
  if (song.meter && song.meter !== 'mixed') {
    const [n, d] = song.meter.split('/').map(Number);
    if (!isNaN(n) && !isNaN(d) && (n !== 4 || d !== 4)) {
      throw new Error(
        `Grille harmonique renderer only supports 4/4 time; song meter is ${song.meter}`,
      );
    }
  }

  const reflowed = reflowSong(song, barsPerLine);

  const parts: string[] = [];
  parts.push(`<style>${getRendererFontFaceCSS()}\n${getGrilleStyles(typeface)}</style>`);

  // Header
  if (song.title || song.key) {
    const titleHtml = song.title ? `<p part="song-title">${escapeHtml(song.title)}</p>` : '';
    const keyHtml = song.key ? `<p part="song-key">${escapeHtml(song.key)}</p>` : '';
    parts.push(`<header part="song-header">${titleHtml}${keyHtml}</header>`);
  }

  parts.push(`<div part="chart">`);

  let prevBar: Bar | null = null;
  let activeTSig: TimeSignature = { ...defaultTSig };

  for (const section of reflowed.sections) {
    const rows = rowsOfSection(section);
    if (rows.length === 0) continue;

    parts.push(`<div part="section">`);
    if (section.label) {
      parts.push(`<span part="section-label">${escapeHtml(section.label)}</span>`);
    }
    parts.push(`<div part="section-rows">`);

    for (const row of rows) {
      parts.push(`<div part="row">`);
      for (const bar of row.bars) {
        if (bar.timeSignature) {
          activeTSig = bar.timeSignature;
        }
        parts.push(renderBar(bar, activeTSig, preset, mode, prevBar));
        prevBar = bar;
      }
      parts.push(`</div>`);
    }

    parts.push(`</div></div>`);
  }

  parts.push(`</div>`);

  return parts.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
