import type {
  Song,
  Row,
  Bar,
  Chord,
  Barline,
  TimeSignature,
  Section,
  BeatSlot,
} from '../parser/types.js';
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
  minor: 1, // "m"
  dominant7: 1, // "7"
  halfDiminished: 1, // "ø"
  diminished: 1, // "°"
  maj7: 1, // "△"
  min7: 2, // "m7"
  dim7: 2, // "°7"
  dom7flat5: 3, // "7b5"
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
// Chord rendering
// ---------------------------------------------------------------------------

function normalizeAccidentals(text: string): string {
  return text.replace(/b/g, '♭').replace(/#/g, '♯');
}

function renderChordRoot(root: string): string {
  // Root is like "C", "Bb", "F#", "Ab"
  // Split into note letter(s) and accidental
  const match = root.match(/^([A-G])(b+|#+)?$/);
  if (!match) {
    // Fallback: just output with accidental normalization
    return `<span part="chord-root">${normalizeAccidentals(root)}</span>`;
  }
  const note = match[1];
  const acc = match[2] ?? '';
  if (acc === '') {
    return `<span part="chord-root">${note}</span>`;
  }
  const unicodeAcc = normalizeAccidentals(acc);
  return `<span part="chord-root">${note}<span part="chord-accidental">${unicodeAcc}</span></span>`;
}

const QUALITY_SYMBOL: Record<string, string> = {
  major: '',
  minor: 'm',
  dominant7: '7',
  halfDiminished: 'ø',
  diminished: '°',
  maj7: '△',
  min7: 'm7',
  dim7: '°7',
  dom7flat5: '7♭5',
};

function renderChordInner(chord: Chord): string {
  const rootHtml = renderChordRoot(chord.root);
  const qualitySymbol = QUALITY_SYMBOL[chord.quality] ?? '';
  const qualityHtml = qualitySymbol ? `<span part="chord-quality">${qualitySymbol}</span>` : '';
  return rootHtml + qualityHtml;
}

function renderChord(chord: Chord): string {
  if (chord.bass) {
    const bassMatch = chord.bass.match(/^([A-G])(b+|#+)?$/);
    let bassHtml: string;
    if (bassMatch) {
      const bassNote = bassMatch[1];
      const bassAcc = bassMatch[2] ?? '';
      if (bassAcc === '') {
        bassHtml = bassNote;
      } else {
        bassHtml = `${bassNote}<span part="chord-accidental">${normalizeAccidentals(bassAcc)}</span>`;
      }
    } else {
      bassHtml = normalizeAccidentals(chord.bass);
    }
    return (
      `<span part="chord chord-slash">` +
      `<span part="chord-top">${renderChordInner(chord)}</span>` +
      `<span part="chord-fraction-line"></span>` +
      `<span part="chord-bass">${bassHtml}</span>` +
      `</span>`
    );
  }
  return `<span part="chord">${renderChordInner(chord)}</span>`;
}

// ---------------------------------------------------------------------------
// Barline rendering
// ---------------------------------------------------------------------------

function renderBarline(barline: Barline, col: number): string {
  const kindPart = `barline-${barline.kind}`;
  const style = `style="grid-column: ${col}"`;
  const repeatCountHtml =
    barline.repeatCount !== undefined && barline.repeatCount > 2
      ? `<span part="barline-repeat-count">×${barline.repeatCount}</span>`
      : '';
  return `<span part="barline ${kindPart}" ${style}>${repeatCountHtml}</span>`;
}

// ---------------------------------------------------------------------------
// Time signature rendering
// ---------------------------------------------------------------------------

function renderTimeSig(ts: TimeSignature): string {
  return (
    `<span part="time-sig">` +
    `<span part="time-sig-num">${ts.numerator}</span>` +
    `<span part="time-sig-den">${ts.denominator}</span>` +
    `</span>`
  );
}

// ---------------------------------------------------------------------------
// Row rendering
// ---------------------------------------------------------------------------

function renderRow(row: Row, rowLayout: RowLayout): string {
  let html = `<div part="row">`;

  // Open barline
  html += renderBarline(row.openBarline, rowLayout.openBarlineCol);

  // Bars
  for (let barIdx = 0; barIdx < row.bars.length; barIdx++) {
    const bar: Bar = row.bars[barIdx];
    const barLayout = rowLayout.bars[barIdx];

    for (let slotIdx = 0; slotIdx < bar.slots.length; slotIdx++) {
      const slot: BeatSlot = bar.slots[slotIdx];
      const slotLayout = barLayout.slots[slotIdx];
      const { col, span } = slotLayout;

      if (slot.type === 'dot') {
        html += `<span part="dot" style="grid-column: ${col} / span 1">/</span>`;
      } else {
        // chord slot
        let slotContent = '';
        if (slotLayout.showTimeSig) {
          slotContent += renderTimeSig(slotLayout.showTimeSig);
        }
        slotContent += renderChord(slot.chord);
        html += `<span part="slot" style="grid-column: ${col} / span ${span}">${slotContent}</span>`;
      }
    }

    // Close barline
    html += renderBarline(bar.closeBarline, barLayout.closeBarlineCol);
  }

  html += `</div>`;
  return html;
}

// ---------------------------------------------------------------------------
// Front matter rendering
// ---------------------------------------------------------------------------

function normalizeKey(key: string): string {
  return normalizeAccidentals(key);
}

function renderFrontMatter(song: Song): string {
  let html = `<header part="song-header">`;
  if (song.title !== null) {
    html += `<h1 part="song-title">${song.title}</h1>`;
  }
  if (song.key !== null) {
    html += `<p part="song-key">${normalizeKey(song.key)}</p>`;
  }
  html += `</header>`;
  return html;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export class HtmlRenderer implements GrigsonRenderer {
  constructor(private config: TextRendererConfig = {}) {}

  render(song: Song): string {
    const layout = computeGlobalLayout(song);
    const { beatCols, minBeatWidth } = layout;

    let html = `<div part="song" style="--beat-cols: ${beatCols}; --min-beat-width: ${minBeatWidth}">`;

    if (song.title !== null || song.key !== null) {
      html += renderFrontMatter(song);
    }

    html += `<div part="song-grid">`;

    for (const section of song.sections) {
      html += `<section part="section" style="display: contents">`;

      if (section.label !== null) {
        html += `<h2 part="section-label">${section.label}</h2>`;
      }

      for (const item of section.content ?? section.rows) {
        if (item.type === 'row') {
          const rowLayout = layout.rows.get(item)!;
          html += renderRow(item, rowLayout);
        }
        // comments are intentionally omitted
      }

      html += `</section>`;
    }

    html += `</div>`;
    html += `</div>`;
    return html;
  }
}
