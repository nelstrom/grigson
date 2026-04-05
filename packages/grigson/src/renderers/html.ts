import DOMPurify from 'dompurify';
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
import { type NotationPreset, resolvePreset } from '../notation/registry.js';

const PRESET_ALLOWED_TAGS = ['sup', 'sub', 'small'];

function sanitizePresetValue(value: string): string {
  // DOMPurify requires a DOM to initialize. In browser contexts it is always
  // available; in Node (e.g. the CLI) it is not, so sanitize is not a function
  // and preset values are returned unchanged. See cli.md for the CLI trust model.
  if (typeof DOMPurify.sanitize !== 'function') return value;
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: PRESET_ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

function sanitizePreset(preset: NotationPreset): NotationPreset {
  const result = {} as NotationPreset;
  for (const key of Object.keys(preset) as Array<keyof NotationPreset>) {
    result[key] = sanitizePresetValue(preset[key]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Global layout calculation
// ---------------------------------------------------------------------------

export interface SlotLayout {
  col: number;
  span: number;
  showTimeSig?: TimeSignature;
  /** True for synthesized dot slots (remainder beats with no explicit dot in the source) */
  implicit?: boolean;
  /** Index into bar.slots for this layout entry. Undefined means 1:1 with layout index. */
  sourceSlotIdx?: number;
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

function parseMeterToTimeSig(meter: string | null): TimeSignature {
  if (meter && meter !== 'mixed') {
    const [n, d] = meter.split('/').map(Number);
    if (!isNaN(n) && !isNaN(d)) return { numerator: n, denominator: d };
  }
  return { numerator: 4, denominator: 4 };
}

export function computeGlobalLayout(song: Song): GlobalLayout {
  let activeTSig: TimeSignature = parseMeterToTimeSig(song.meter);
  const rowLayouts = new Map<Row, RowLayout>();
  let globalMaxBeats = 0;
  let globalMinBeatWidthEm = 0;
  // Track whether we're still on the first bar of the song, so we can show the
  // initial time signature there even when it comes only from song.meter frontmatter.
  let isSongFirstBar = song.meter !== null && song.meter !== 'mixed';

  for (const section of song.sections) {
    for (const row of rowsOfSection(section)) {
      const rowLayout: RowLayout = { openBarlineCol: 1, bars: [] };
      let beatOffset = 0;

      for (const bar of row.bars) {
        if (bar.timeSignature) {
          activeTSig = bar.timeSignature;
        }

        // For the very first bar, synthesize showTimeSig from activeTSig (i.e. song.meter)
        // when the bar doesn't carry its own explicit timeSignature token.
        const barTimeSig = bar.timeSignature ?? (isSongFirstBar ? activeTSig : undefined);
        isSongFirstBar = false;

        const chordCount = bar.slots.filter((s) => s.type === 'chord').length;
        const hasDots = bar.slots.some((s) => s.type === 'dot');
        const isEvenDivision = activeTSig.numerator % chordCount === 0;
        const beatsPerChord = isEvenDivision ? activeTSig.numerator / chordCount : 1;

        // Proportional if chords divide evenly AND (no explicit dots, OR the effective
        // slots — source slots up to `numerator`, with missing trailing positions treated
        // as dots — follow the uniform pattern: chords at multiples of beatsPerChord,
        // dots everywhere else). This means | F . C | and | F . C . | both qualify.
        const isProportional =
          isEvenDivision &&
          (!hasDots ||
            (() => {
              for (let i = 0; i < activeTSig.numerator; i++) {
                const slot = bar.slots[i]; // undefined past end → treated as trailing dot
                const expectChord = i % beatsPerChord === 0;
                const isChord = slot !== undefined && slot.type === 'chord';
                if (expectChord !== isChord) return false;
              }
              return true;
            })());

        const slots: SlotLayout[] = [];

        if (isProportional) {
          let isFirstSlot = true;
          for (let srcIdx = 0; srcIdx < bar.slots.length; srcIdx++) {
            const slot = bar.slots[srcIdx];
            if (slot.type !== 'chord') continue;
            slots.push({
              col: beatOffset + 1,
              span: beatsPerChord,
              showTimeSig: isFirstSlot && barTimeSig ? barTimeSig : undefined,
              // Only needed when dots are present (breaks the 1:1 layout-to-source mapping)
              sourceSlotIdx: hasDots ? srcIdx : undefined,
            });
            const widthPerBeatEm = estimateChordDisplayWidthEm(slot.chord) / beatsPerChord;
            if (widthPerBeatEm > globalMinBeatWidthEm) {
              globalMinBeatWidthEm = widthPerBeatEm;
            }
            beatOffset += beatsPerChord;
            isFirstSlot = false;
          }
        } else {
          const effectiveCount = Math.min(bar.slots.length, activeTSig.numerator);
          let isFirstSlot = true;
          for (let i = 0; i < effectiveCount; i++) {
            const slot = bar.slots[i];
            slots.push({
              col: beatOffset + 1,
              span: 1,
              showTimeSig: isFirstSlot && barTimeSig ? barTimeSig : undefined,
            });
            if (slot.type === 'chord') {
              const widthPerBeatEm = estimateChordDisplayWidthEm(slot.chord);
              if (widthPerBeatEm > globalMinBeatWidthEm) {
                globalMinBeatWidthEm = widthPerBeatEm;
              }
            }
            beatOffset += 1;
            isFirstSlot = false;
            // After the last real slot, synthesize implicit dot slots for remainder beats
            if (i === effectiveCount - 1) {
              const padding = activeTSig.numerator - effectiveCount;
              for (let r = 0; r < padding; r++) {
                slots.push({ col: beatOffset + 1, span: 1, implicit: true });
                beatOffset += 1;
              }
            }
          }
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

type AccidentalsMode = 'unicode' | 'ascii';

function renderAccidental(acc: string, flatChar: string, sharpChar: string): string {
  return acc.replace(/b/g, flatChar).replace(/#/g, sharpChar);
}

function wrapQualityAccidentals(html: string, mode: AccidentalsMode): string {
  if (mode === 'ascii') {
    return html.replace(/♭/g, 'b').replace(/♯/g, '#');
  }
  return html.replace(
    /[♭♯]/g,
    (ch) => `<span part="quality-accidental" data-glyph="unicode">${ch}</span>`,
  );
}

function renderChordRoot(
  root: string,
  flatChar: string,
  sharpChar: string,
  mode: AccidentalsMode,
): string {
  const match = root.match(/^([A-G])(b+|#+)?$/);
  if (!match) {
    return `<span part="chord-root">${renderAccidental(root, flatChar, sharpChar)}</span>`;
  }
  const note = match[1];
  const acc = match[2] ?? '';
  if (acc === '') {
    return `<span part="chord-root">${note}</span>`;
  }
  const renderedAcc = renderAccidental(acc, flatChar, sharpChar);
  return `<span part="chord-root">${note}<span part="chord-accidental" data-glyph="${mode}">${renderedAcc}</span></span>`;
}

function renderChordInner(
  chord: Chord,
  preset: NotationPreset,
  flatChar: string,
  sharpChar: string,
  mode: AccidentalsMode,
): string {
  const rootHtml = renderChordRoot(chord.root, flatChar, sharpChar, mode);
  const rawQuality = preset[chord.quality as keyof NotationPreset] ?? '';
  const qualitySymbol = rawQuality ? wrapQualityAccidentals(rawQuality, mode) : '';
  const qualityHtml = qualitySymbol ? `<span part="chord-quality">${qualitySymbol}</span>` : '';
  return rootHtml + qualityHtml;
}

function renderChord(
  chord: Chord,
  preset: NotationPreset,
  flatChar: string,
  sharpChar: string,
  mode: AccidentalsMode,
): string {
  if (chord.bass) {
    const bassMatch = chord.bass.match(/^([A-G])(b+|#+)?$/);
    let bassHtml: string;
    if (bassMatch) {
      const bassNote = bassMatch[1];
      const bassAcc = bassMatch[2] ?? '';
      if (bassAcc === '') {
        bassHtml = bassNote;
      } else {
        bassHtml = `${bassNote}<span part="chord-accidental" data-glyph="${mode}">${renderAccidental(bassAcc, flatChar, sharpChar)}</span>`;
      }
    } else {
      bassHtml = renderAccidental(chord.bass, flatChar, sharpChar);
    }
    return (
      `<span part="chord chord-slash">` +
      `<span part="chord-top">${renderChordInner(chord, preset, flatChar, sharpChar, mode)}</span>` +
      `<span part="chord-fraction-line"></span>` +
      `<span part="chord-bass">${bassHtml}</span>` +
      `</span>`
    );
  }
  return `<span part="chord">${renderChordInner(chord, preset, flatChar, sharpChar, mode)}</span>`;
}

// ---------------------------------------------------------------------------
// Barline rendering
// ---------------------------------------------------------------------------

// Inline SVG barlines. ViewBox height=100; width sets the aspect ratio.
// Proportions traced from Noto Music reference images in inspiration/symbols/.
// All shapes use fill="currentColor".
//
// Coordinate constants (in viewBox units, calibrated so that at a 2em row
// height the thin bar ≈ 1.6 px — matching --grigson-barline-width: 1.5px):
//   thin bar = 5 wide, thick bar = 11 wide, gap = 4
//   dot radius = 8, dot y-centres = 34 and 66

const BARLINE_SVG_ATTRS = 'xmlns="http://www.w3.org/2000/svg" aria-hidden="true"';

// || — two thin lines, left-anchored
const BARLINE_DOUBLE_SVG =
  `<svg ${BARLINE_SVG_ATTRS} viewBox="0 0 16 100">` +
  '<rect x="0" y="0" width="5" height="100" fill="currentColor"/>' +
  '<rect x="11" y="0" width="5" height="100" fill="currentColor"/>' +
  '</svg>';

// ||. — thin + thick, left-anchored
const BARLINE_FINAL_SVG =
  `<svg ${BARLINE_SVG_ATTRS} viewBox="0 0 22 100">` +
  '<rect x="0" y="0" width="5" height="100" fill="currentColor"/>' +
  '<rect x="11" y="0" width="11" height="100" fill="currentColor"/>' +
  '</svg>';

// ||: — thick | gap | thin | gap | dots, left-anchored (thick at column boundary)
const BARLINE_START_REPEAT_SVG =
  `<svg ${BARLINE_SVG_ATTRS} viewBox="0 0 40 100">` +
  '<rect x="0" y="0" width="11" height="100" fill="currentColor"/>' +
  '<rect x="15" y="0" width="5" height="100" fill="currentColor"/>' +
  '<circle cx="32" cy="34" r="8" fill="currentColor"/>' +
  '<circle cx="32" cy="66" r="8" fill="currentColor"/>' +
  '</svg>';

// :|| — dots | gap | thin | gap | thick, right-anchored (thick right edge at column boundary)
const BARLINE_END_REPEAT_SVG =
  `<svg ${BARLINE_SVG_ATTRS} viewBox="0 0 40 100">` +
  '<circle cx="8" cy="34" r="8" fill="currentColor"/>' +
  '<circle cx="8" cy="66" r="8" fill="currentColor"/>' +
  '<rect x="20" y="0" width="5" height="100" fill="currentColor"/>' +
  '<rect x="29" y="0" width="11" height="100" fill="currentColor"/>' +
  '</svg>';

// :||: — dots | thin | thick | thin | dots, centred on column boundary
// thick bar centre = viewBox x 34.5, viewBox width = 69 → centre at 34.5 ✓
const BARLINE_END_START_REPEAT_SVG =
  `<svg ${BARLINE_SVG_ATTRS} viewBox="0 0 69 100">` +
  '<circle cx="8" cy="34" r="8" fill="currentColor"/>' +
  '<circle cx="8" cy="66" r="8" fill="currentColor"/>' +
  '<rect x="20" y="0" width="5" height="100" fill="currentColor"/>' +
  '<rect x="29" y="0" width="11" height="100" fill="currentColor"/>' +
  '<rect x="44" y="0" width="5" height="100" fill="currentColor"/>' +
  '<circle cx="61" cy="34" r="8" fill="currentColor"/>' +
  '<circle cx="61" cy="66" r="8" fill="currentColor"/>' +
  '</svg>';

const BARLINE_SVGS: Partial<Record<string, string>> = {
  double: BARLINE_DOUBLE_SVG,
  final: BARLINE_FINAL_SVG,
  startRepeat: BARLINE_START_REPEAT_SVG,
  endRepeat: BARLINE_END_REPEAT_SVG,
  endRepeatStartRepeat: BARLINE_END_START_REPEAT_SVG,
};

function renderBarline(barline: Barline, col: number): string {
  const kindPart = `barline-${barline.kind}`;
  const style = `style="grid-column: ${col}"`;
  const svg = BARLINE_SVGS[barline.kind] ?? '';
  const repeatCountHtml =
    barline.repeatCount !== undefined && barline.repeatCount > 2
      ? `<span part="barline-repeat-count">×${barline.repeatCount}</span>`
      : '';
  return `<span part="barline ${kindPart}" ${style}>${svg}${repeatCountHtml}</span>`;
}

// ---------------------------------------------------------------------------
// Time signature rendering
// ---------------------------------------------------------------------------

// SMuFL time-signature digits: U+E080 = '0', U+E081 = '1', …, U+E089 = '9'
const SMUFL_DIGITS = '\uE080\uE081\uE082\uE083\uE084\uE085\uE086\uE087\uE088\uE089';

function smuflDigits(n: number): string {
  return String(n)
    .split('')
    .map((ch) => SMUFL_DIGITS[Number(ch)])
    .join('');
}

function renderTimeSig(ts: TimeSignature): string {
  return (
    `<span part="time-sig">` +
    `<span part="time-sig-num">${smuflDigits(ts.numerator)}</span>` +
    `<span part="time-sig-den">${smuflDigits(ts.denominator)}</span>` +
    `</span>`
  );
}

// ---------------------------------------------------------------------------
// Row rendering
// ---------------------------------------------------------------------------

// Inline SVG simile mark: two filled circles connected by a diagonal slash.
// Bravura's U+E1E7 (repeat1Bar) is a tiny dot component designed for engraving
// software canvas composition — it cannot be used as a scalable CSS character.
// Proportions traced from Noto Music (inspiration/symbols/simile.svg), scaled from 280×280.
const SIMILE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">' +
  '<circle cx="28" cy="36" r="8" fill="currentColor"/>' +
  '<circle cx="72" cy="64" r="8" fill="currentColor"/>' +
  '<path d="M64 19 L85 19 L35 81 L14 81 Z" fill="currentColor"/>' +
  '</svg>';

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

function renderRow(
  row: Row,
  rowLayout: RowLayout,
  preset: NotationPreset,
  config: TextRendererConfig,
  flatChar: string,
  sharpChar: string,
  mode: AccidentalsMode,
): string {
  let html = `<div part="row">`;

  // Open barline
  html += renderBarline(row.openBarline, rowLayout.openBarlineCol);

  const useShorthand = (config.simile?.output ?? 'longhand') === 'shorthand';
  let prevSlots: BeatSlot[] | null = null;

  // Bars
  for (let barIdx = 0; barIdx < row.bars.length; barIdx++) {
    const bar: Bar = row.bars[barIdx];
    const barLayout = rowLayout.bars[barIdx];
    const isSimile = useShorthand && prevSlots !== null && slotsEqual(bar.slots, prevSlots);

    if (isSimile) {
      const startCol = barLayout.slots[0]?.col ?? barLayout.closeBarlineCol - 1;
      const span = barLayout.closeBarlineCol - startCol;
      html += `<span part="simile" style="grid-column: ${startCol} / span ${span}">${SIMILE_SVG}</span>`;
    } else {
      for (let slotIdx = 0; slotIdx < barLayout.slots.length; slotIdx++) {
        const slotLayout = barLayout.slots[slotIdx];
        const { col, span } = slotLayout;
        const srcIdx = slotLayout.sourceSlotIdx ?? slotIdx;
        const slot: BeatSlot | undefined = bar.slots[srcIdx];

        if (slotLayout.implicit || slot?.type === 'dot') {
          html += `<span part="dot" style="grid-column: ${col} / span 1">/</span>`;
        } else if (slot) {
          // chord slot
          let slotContent = '';
          if (slotLayout.showTimeSig) {
            slotContent += renderTimeSig(slotLayout.showTimeSig);
          }
          slotContent += renderChord(slot.chord, preset, flatChar, sharpChar, mode);
          html += `<span part="slot" style="grid-column: ${col} / span ${span}">${slotContent}</span>`;
        }
      }
    }

    // Close barline
    html += renderBarline(bar.closeBarline, barLayout.closeBarlineCol);
    prevSlots = bar.slots;
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
    const preset = sanitizePreset(resolvePreset(this.config.notation?.preset));
    const mode: AccidentalsMode = this.config.accidentals === 'ascii' ? 'ascii' : 'unicode';
    const flatChar = mode === 'unicode' ? '♭' : 'b';
    const sharpChar = mode === 'unicode' ? '♯' : '#';
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
          html += renderRow(item, rowLayout, preset, this.config, flatChar, sharpChar, mode);
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
