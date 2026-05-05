import type { Song, Bar, Chord, TimeSignature, Section, Row, ChordSlot } from 'grigson';
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

function slotsEqual(a: Bar, b: Bar): boolean {
  if (a.slots.length !== b.slots.length) return false;
  for (let i = 0; i < a.slots.length; i++) {
    const sa = a.slots[i];
    const sb = b.slots[i];
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

interface ZoneSpec {
  zoneParts: string[];
  chordParts: string[];
}

const PATTERN_ZONES: Record<BarPattern, ZoneSpec> = {
  '1': { zoneParts: ['zone'], chordParts: ['chord'] },
  '2+2': {
    zoneParts: ['zone zone-tl', 'zone zone-br'],
    chordParts: ['chord chord-tl', 'chord chord-br'],
  },
  '3+1': {
    zoneParts: ['zone zone-main', 'zone zone-corner'],
    chordParts: ['chord chord-main', 'chord chord-corner'],
  },
  '1+3': {
    zoneParts: ['zone zone-corner', 'zone zone-main'],
    chordParts: ['chord chord-corner', 'chord chord-main'],
  },
  '2+1+1': {
    zoneParts: ['zone zone-left', 'zone zone-tr', 'zone zone-br'],
    chordParts: ['chord chord-left', 'chord chord-tr', 'chord chord-br'],
  },
  '1+2+1': {
    zoneParts: ['zone zone-top', 'zone zone-mid', 'zone zone-bottom'],
    chordParts: ['chord chord-top', 'chord chord-mid', 'chord chord-bottom'],
  },
  '1+1+2': {
    zoneParts: ['zone zone-tl', 'zone zone-bl', 'zone zone-right'],
    chordParts: ['chord chord-tl', 'chord chord-bl', 'chord chord-right'],
  },
  '1+1+1+1': {
    zoneParts: ['zone zone-top', 'zone zone-right', 'zone zone-bottom', 'zone zone-left'],
    chordParts: ['chord chord-top', 'chord chord-right', 'chord chord-bottom', 'chord chord-left'],
  },
};

const PATTERN_BEATS: Record<BarPattern, number[]> = {
  '1': [4],
  '2+2': [2, 2],
  '3+1': [3, 1],
  '1+3': [1, 3],
  '2+1+1': [2, 1, 1],
  '1+2+1': [1, 2, 1],
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
  const isSimile = prevBar !== null && slotsEqual(bar, prevBar);

  if (isSimile) {
    return `<div part="bar bar-simile"><div part="zone zone-simile"></div><span part="chord chord-simile" aria-label="repeat bar">%</span></div>`;
  }

  const pattern = detectPattern(bar, activeTSig);
  const spec = PATTERN_ZONES[pattern];
  const beats = PATTERN_BEATS[pattern];
  const chordSlots = bar.slots.filter((s): s is ChordSlot => s.type === 'chord');

  const zones = spec.zoneParts.map((p) => `<div part="${p}"></div>`).join('');

  const chords = chordSlots
    .map((slot, i) => {
      const chordPart = spec.chordParts[i] ?? 'chord';
      const slotBeats = beats[i] ?? 1;
      const isWhole = slotBeats === 4;
      const label = ariaLabel(slot.chord, slotBeats, isWhole);
      const html = renderChordHtml(slot.chord, preset, mode);
      const hasBass = slot.chord.bass != null;
      const partStr = hasBass ? `${chordPart} chord-slash` : chordPart;
      return `<span part="${partStr}" aria-label="${label}">${html}</span>`;
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

    if (section.label) {
      parts.push(`<div part="section">`);
      parts.push(`<span part="section-label">${escapeHtml(section.label)}</span>`);
      parts.push(`<div part="section-rows">`);
    }

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

    if (section.label) {
      parts.push(`</div></div>`);
    }
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
