import DOMPurify from 'dompurify';
import type {
  Song,
  Row,
  Bar,
  Chord,
  Barline,
  BarlineKind,
  TimeSignature,
  Section,
  BeatSlot,
} from '../parser/types.js';
import { type GrigsonRenderer, type TextRendererConfig, type SpokenPreset } from './text.js';
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
    /** Time signature to display at this bar's open barline (in the gap cell). */
    showTimeSig?: TimeSignature;
    /** The active time signature for this bar (used for duration calculations). */
    activeTSig: TimeSignature;
  }>;
}

export interface GlobalLayout {
  rows: Map<Row, RowLayout>;
  beatCols: number;
  /** The resolved beat unit denominator (e.g. 4 for quarter-note, 8 for eighth-note). */
  beatUnit: number;
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

export function reflowSong(song: Song, barsPerLine: number): Song {
  const newSections = song.sections.map((section) => {
    const allRows = rowsOfSection(section);
    const allBars: Bar[] = [];
    const firstOpenBarline: Barline =
      allRows.length > 0 ? allRows[0].openBarline : { kind: 'single' };

    for (const row of allRows) {
      allBars.push(...row.bars);
    }

    if (allBars.length === 0) {
      return { ...section, rows: [], content: undefined };
    }

    const newRows: Row[] = [];
    let nextOpenBarline: Barline = firstOpenBarline;
    for (let i = 0; i < allBars.length; i += barsPerLine) {
      let chunkBars = allBars.slice(i, i + barsPerLine);
      const openBarline = nextOpenBarline;
      nextOpenBarline = { kind: 'single' };
      const lastBar = chunkBars[chunkBars.length - 1];
      if (lastBar.closeBarline.kind === 'endRepeatStartRepeat') {
        chunkBars = [
          ...chunkBars.slice(0, -1),
          {
            ...lastBar,
            closeBarline: { kind: 'endRepeat', repeatCount: lastBar.closeBarline.repeatCount },
          },
        ];
        nextOpenBarline = { kind: 'startRepeat' };
      }
      newRows.push({ type: 'row', openBarline, bars: chunkBars });
    }

    return { ...section, rows: newRows, content: undefined };
  });

  return { ...song, sections: newSections };
}

export function splitRows(song: Song, maxBarsPerLine: number): Song {
  const newSections = song.sections.map((section) => {
    const allRows = rowsOfSection(section);
    const newRows: Row[] = [];

    for (const row of allRows) {
      if (row.bars.length <= maxBarsPerLine) {
        newRows.push(row);
      } else {
        let nextOpenBarline: Barline = row.openBarline;
        for (let i = 0; i < row.bars.length; i += maxBarsPerLine) {
          let chunkBars = row.bars.slice(i, i + maxBarsPerLine);
          const openBarline = nextOpenBarline;
          nextOpenBarline = { kind: 'single' };
          const lastBar = chunkBars[chunkBars.length - 1];
          if (lastBar.closeBarline.kind === 'endRepeatStartRepeat') {
            chunkBars = [
              ...chunkBars.slice(0, -1),
              {
                ...lastBar,
                closeBarline: { kind: 'endRepeat', repeatCount: lastBar.closeBarline.repeatCount },
              },
            ];
            nextOpenBarline = { kind: 'startRepeat' };
          }
          newRows.push({ type: 'row', openBarline, bars: chunkBars });
        }
      }
    }

    return { ...section, rows: newRows, content: undefined };
  });

  return { ...song, sections: newSections };
}

function parseMeterToTimeSig(meter: string | null): TimeSignature {
  if (meter && meter !== 'mixed') {
    const [n, d] = meter.split('/').map(Number);
    if (!isNaN(n) && !isNaN(d)) return { numerator: n, denominator: d };
  }
  return { numerator: 4, denominator: 4 };
}

export function computeGlobalLayout(song: Song): GlobalLayout {
  const defaultTSig = parseMeterToTimeSig(song.meter);

  // Pre-pass: find the largest denominator across all time signatures to use as the
  // beat unit. max(denominator) = smallest note value. Mixing 4/4 and 6/8 → beatUnit=8
  // so that a 4/4 bar gets 8 effective beat columns and a 6/8 bar gets 6.
  let beatUnit = defaultTSig.denominator;
  for (const section of song.sections) {
    for (const row of rowsOfSection(section)) {
      for (const bar of row.bars) {
        if (bar.timeSignature && bar.timeSignature.denominator > beatUnit) {
          beatUnit = bar.timeSignature.denominator;
        }
      }
    }
  }

  let activeTSig: TimeSignature = defaultTSig;
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

        // effectiveBeatsPerBar: how many beat-unit columns this bar occupies.
        // e.g. 3/4 in a beatUnit=8 context → 3 × (8÷4) = 6 effective beat columns.
        const effectiveBeatsPerBar = activeTSig.numerator * (beatUnit / activeTSig.denominator);
        // effectiveBeatsPerRawBeat: how many beat-unit columns each raw time-sig beat occupies.
        const effectiveBeatsPerRawBeat = beatUnit / activeTSig.denominator;

        const chordCount = bar.slots.filter((s) => s.type === 'chord').length;
        const hasDots = bar.slots.some((s) => s.type === 'dot');

        // rawBeatsPerChord: how many raw time-sig beats each chord occupies (for proportionality check).
        const isEvenDivision = activeTSig.numerator % chordCount === 0;
        const rawBeatsPerChord = isEvenDivision ? activeTSig.numerator / chordCount : 1;

        // effectiveBeatsPerChord: how many beat-unit columns each chord spans in the grid.
        const effectiveBeatsPerChord = isEvenDivision
          ? effectiveBeatsPerBar / chordCount
          : effectiveBeatsPerRawBeat;

        // Proportional if chords divide evenly AND (no explicit dots, OR the effective
        // slots — source slots up to `numerator`, with missing trailing positions treated
        // as dots — follow the uniform pattern: chords at multiples of rawBeatsPerChord,
        // dots everywhere else). This means | F . C | and | F . C . | both qualify.
        const isProportional =
          isEvenDivision &&
          (!hasDots ||
            (() => {
              for (let i = 0; i < activeTSig.numerator; i++) {
                const slot = bar.slots[i]; // undefined past end → treated as trailing dot
                const expectChord = i % rawBeatsPerChord === 0;
                const isChord = slot !== undefined && slot.type === 'chord';
                if (expectChord !== isChord) return false;
              }
              return true;
            })());

        const slots: SlotLayout[] = [];

        // Grid column formulas (beatOffset is in effective beat units):
        //   slot col  = 2 × beatOffset + 2
        //   slot span = 2 × effectiveBeats - 1  (spans beat cols + inner gap cols, not the trailing gap)
        //   barline col = 2 × beatOffset + 1

        if (isProportional) {
          for (let srcIdx = 0; srcIdx < bar.slots.length; srcIdx++) {
            const slot = bar.slots[srcIdx];
            if (slot.type !== 'chord') continue;
            slots.push({
              col: 2 * beatOffset + 2,
              span: 2 * effectiveBeatsPerChord - 1,
              // Only needed when dots are present (breaks the 1:1 layout-to-source mapping)
              sourceSlotIdx: hasDots ? srcIdx : undefined,
            });
            const widthPerBeatEm = estimateChordDisplayWidthEm(slot.chord) / effectiveBeatsPerChord;
            if (widthPerBeatEm > globalMinBeatWidthEm) {
              globalMinBeatWidthEm = widthPerBeatEm;
            }
            beatOffset += effectiveBeatsPerChord;
          }
        } else {
          const effectiveCount = Math.min(bar.slots.length, activeTSig.numerator);
          for (let i = 0; i < effectiveCount; i++) {
            const slot = bar.slots[i];
            slots.push({
              col: 2 * beatOffset + 2,
              span: 2 * effectiveBeatsPerRawBeat - 1,
            });
            if (slot.type === 'chord') {
              const widthPerBeatEm =
                estimateChordDisplayWidthEm(slot.chord) / effectiveBeatsPerRawBeat;
              if (widthPerBeatEm > globalMinBeatWidthEm) {
                globalMinBeatWidthEm = widthPerBeatEm;
              }
            }
            beatOffset += effectiveBeatsPerRawBeat;
            // After the last real slot, synthesize implicit dot slots for remainder beats
            if (i === effectiveCount - 1) {
              const paddingRawBeats = activeTSig.numerator - effectiveCount;
              for (let r = 0; r < paddingRawBeats; r++) {
                slots.push({
                  col: 2 * beatOffset + 2,
                  span: 2 * effectiveBeatsPerRawBeat - 1,
                  implicit: true,
                });
                beatOffset += effectiveBeatsPerRawBeat;
              }
            }
          }
        }

        rowLayout.bars.push({
          slots,
          closeBarlineCol: 2 * beatOffset + 1,
          showTimeSig: barTimeSig,
          activeTSig,
        });
      }

      rowLayouts.set(row, rowLayout);
      if (beatOffset > globalMaxBeats) {
        globalMaxBeats = beatOffset;
      }
    }
  }

  const minBeatWidth = `${Math.max(globalMinBeatWidthEm, 1.0).toFixed(2)}em`;
  return { rows: rowLayouts, beatCols: globalMaxBeats, beatUnit, minBeatWidth };
}

// ---------------------------------------------------------------------------
// Chord rendering
// ---------------------------------------------------------------------------

function normalizeAccidentals(text: string): string {
  return text.replace(/b/g, '♭').replace(/#/g, '♯');
}

type AccidentalsMode = 'unicode' | 'ascii';
type SlashStyle = 'horizontal' | 'diagonal' | 'ascii';

function renderAccidental(acc: string, flatChar: string, sharpChar: string): string {
  return acc.replace(/b/g, flatChar).replace(/#/g, sharpChar);
}

function wrapQualityAccidentals(html: string, mode: AccidentalsMode): string {
  const ascii = mode === 'ascii';
  return html.replace(/[♭♯]/g, (ch) => {
    const glyph = ascii ? (ch === '♭' ? 'b' : '#') : ch;
    return `<span part="quality-accidental" data-glyph="${mode}" aria-hidden="true">${glyph}</span>`;
  });
}

function renderChordRoot(
  root: string,
  flatChar: string,
  sharpChar: string,
  mode: AccidentalsMode,
): string {
  const match = root.match(/^([A-G])(b+|#+)?$/);
  if (!match) {
    return `<span part="chord-root" aria-hidden="true">${renderAccidental(root, flatChar, sharpChar)}</span>`;
  }
  const note = match[1];
  const acc = match[2] ?? '';
  if (acc === '') {
    return `<span part="chord-root" aria-hidden="true">${note}</span>`;
  }
  const renderedAcc = renderAccidental(acc, flatChar, sharpChar);
  return `<span part="chord-root" aria-hidden="true">${note}<span part="chord-accidental" data-glyph="${mode}" aria-hidden="true">${renderedAcc}</span></span>`;
}

// ---------------------------------------------------------------------------
// Accessibility helpers
// ---------------------------------------------------------------------------

function expandAccidental(raw: string): string {
  return raw
    .replace(/bb/g, 'double flat')
    .replace(/b/g, 'flat')
    .replace(/##/g, 'double sharp')
    .replace(/#/g, 'sharp');
}

function spokenNote(note: string, spoken: SpokenPreset): string {
  const m = note.match(/^([A-G])(b+|#+)?$/);
  if (!m) return note;
  return spoken.note(m[1], expandAccidental(m[2] ?? ''));
}

/** Generate an accessible spoken label for a chord using the given spoken preset. */
export function chordAriaLabel(
  chord: Chord,
  tsBeats: number,
  isWholeBar: boolean,
  spoken: SpokenPreset,
  denominator: number,
): string {
  const root = spokenNote(chord.root, spoken);
  const quality = spoken.qualities[chord.quality] ?? '';
  const base = quality ? `${root} ${quality}` : root;
  const named = chord.bass ? `${base} over ${spokenNote(chord.bass, spoken)}` : base;
  return `${named}, ${spoken.duration(tsBeats, isWholeBar, denominator)}`;
}

/** The built-in English spoken preset used by `HtmlRenderer` when none is provided. */
export const DEFAULT_SPOKEN_PRESET: SpokenPreset = {
  qualities: {
    major: '',
    minor: 'minor',
    dominant7: 'dominant 7',
    halfDiminished: 'half diminished 7',
    diminished: 'diminished',
    maj7: 'major 7',
    min7: 'minor 7',
    dim7: 'diminished 7',
    dom7flat5: 'dominant 7 flat 5',
  },
  note: (letter, accidental) => {
    // 'A' reads as the article "a" (ah) before a quality word, so spell it phonetically.
    const name = letter === 'A' ? 'Ay' : letter;
    return accidental ? `${name} ${accidental}` : name;
  },
  duration: (beats, isWholeBar, denominator) => {
    if (isWholeBar) return 'whole bar';
    const name = denominator === 4 ? 'crotchet' : denominator === 8 ? 'quaver' : 'beat';
    return `${beats} ${name}${beats !== 1 ? 's' : ''}`;
  },
  barline: (kind, repeatCount) => {
    const playN = repeatCount !== undefined && repeatCount > 2 ? `, play ${repeatCount} times` : '';
    if (kind === 'startRepeat') return 'start repeat';
    if (kind === 'endRepeat') return `end repeat${playN}`;
    if (kind === 'endRepeatStartRepeat') return `end repeat${playN}, start repeat`;
    return null;
  },
  timeSig: (n, d) => `${n}/${d} time`,
  simile: 'repeat bar',
};

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
  const qualityHtml = qualitySymbol
    ? `<span part="chord-quality" aria-hidden="true">${qualitySymbol}</span>`
    : '';
  return rootHtml + qualityHtml;
}

function renderChord(
  chord: Chord,
  preset: NotationPreset,
  flatChar: string,
  sharpChar: string,
  mode: AccidentalsMode,
  slashStyle: SlashStyle = 'horizontal',
  tsBeats: number = 1,
  isWholeBar: boolean = false,
  denominator: number = 4,
  spoken: SpokenPreset | null = null,
): string {
  const ariaLabelAttr = spoken
    ? ` aria-label="${chordAriaLabel(chord, tsBeats, isWholeBar, spoken, denominator)}"`
    : '';
  if (chord.bass) {
    const bassMatch = chord.bass.match(/^([A-G])(b+|#+)?$/);
    let bassHtml: string;
    if (bassMatch) {
      const bassNote = bassMatch[1];
      const bassAcc = bassMatch[2] ?? '';
      if (bassAcc === '') {
        bassHtml = bassNote;
      } else {
        bassHtml = `${bassNote}<span part="chord-accidental" data-glyph="${mode}" aria-hidden="true">${renderAccidental(bassAcc, flatChar, sharpChar)}</span>`;
      }
    } else {
      bassHtml = renderAccidental(chord.bass, flatChar, sharpChar);
    }
    const styleAttr = ` data-slash-style="${slashStyle}"`;
    return (
      `<span part="chord chord-slash"${styleAttr}${ariaLabelAttr}>` +
      `<span part="chord-top" aria-hidden="true">${renderChordInner(chord, preset, flatChar, sharpChar, mode)}</span>` +
      `<span part="chord-fraction-line" aria-hidden="true"></span>` +
      `<span part="chord-bass" aria-hidden="true">${bassHtml}</span>` +
      `</span>`
    );
  }
  return `<span part="chord"${ariaLabelAttr}>${renderChordInner(chord, preset, flatChar, sharpChar, mode)}</span>`;
}

// ---------------------------------------------------------------------------
// Barline rendering
// ---------------------------------------------------------------------------

// SMuFL PUA codepoints for barline/repeat glyphs (Bravura fallback always present)
const BARLINE_GLYPHS: Partial<Record<BarlineKind, string>> = {
  single: String.fromCodePoint(0xe030), // barlineSingle (shown only for cursive via CSS)
  double: String.fromCodePoint(0xe031), // barlineDouble
  final: String.fromCodePoint(0xe032), // barlineFinal
  startRepeat: String.fromCodePoint(0xe040), // repeatLeft
  endRepeat: String.fromCodePoint(0xe041), // repeatRight
  endRepeatStartRepeat: String.fromCodePoint(0xe042), // repeatRightLeft
};

function renderBarline(
  barline: Barline,
  col: number,
  position: 'start' | 'mid' | 'end' | 'short-end',
  spoken: SpokenPreset | null,
): string {
  const kindPart = `barline-${barline.kind}`;
  const posPart = `barline-position-${position}`;
  const style = `style="grid-column: ${col}"`;
  const glyph = BARLINE_GLYPHS[barline.kind] ?? '';

  let ariaAttr = '';
  let glyphAriaHidden = '';
  let repeatCountAriaHidden = '';

  if (spoken !== null) {
    const label = spoken.barline(barline.kind, barline.repeatCount);
    if (label === null) {
      ariaAttr = ' aria-hidden="true"';
    } else {
      ariaAttr = ` aria-label="${label}"`;
      glyphAriaHidden = ' aria-hidden="true"';
      repeatCountAriaHidden = ' aria-hidden="true"';
    }
  }

  const glyphHtml = glyph
    ? `<span part="barline-glyph"${glyphAriaHidden}><span part="barline-glyph-inner">${glyph}</span></span>`
    : '';
  const repeatCountHtml =
    barline.repeatCount !== undefined && barline.repeatCount > 2
      ? `<span part="barline-repeat-count"${repeatCountAriaHidden}>×${barline.repeatCount}</span>`
      : '';
  return `<span part="barline ${kindPart} ${posPart}"${ariaAttr} ${style}>${glyphHtml}${repeatCountHtml}</span>`;
}

// ---------------------------------------------------------------------------
// Time signature rendering
// ---------------------------------------------------------------------------

// Math Bold digits U+1D7CE–1D7D7: 𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗
const TIME_SIG_DIGITS = Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0x1d7ce + i));

function smuflDigits(n: number): string {
  return String(n)
    .split('')
    .map((ch) => TIME_SIG_DIGITS[Number(ch)])
    .join('');
}

function renderTimeSig(ts: TimeSignature, spoken: SpokenPreset | null): string {
  const ariaLabel = spoken ? ` aria-label="${spoken.timeSig(ts.numerator, ts.denominator)}"` : '';
  return (
    `<span part="time-sig"${ariaLabel}>` +
    `<span part="time-sig-num" aria-hidden="true">${smuflDigits(ts.numerator)}</span>` +
    `<span part="time-sig-den" aria-hidden="true">${smuflDigits(ts.denominator)}</span>` +
    `</span>`
  );
}

// ---------------------------------------------------------------------------
// Row rendering
// ---------------------------------------------------------------------------

// SMuFL U+E500 (repeat1Bar) simile glyph, served by the GrigsonTimeSig / GrigsonCursive font faces.
const SIMILE_CHAR = String.fromCodePoint(0xe500);

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
  slashStyle: SlashStyle,
  sectionMaxCol: number,
  beatUnit: number,
  spoken: SpokenPreset | null,
): string {
  const rowEndCol = rowLayout.bars[rowLayout.bars.length - 1].closeBarlineCol;
  const isFullRow = rowEndCol === sectionMaxCol;
  let html = `<div part="row" style="grid-column: 1 / ${rowEndCol + 1}">`;

  // Open barline
  html += renderBarline(row.openBarline, rowLayout.openBarlineCol, 'start', spoken);

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
      const simileAriaAttr = spoken ? ` aria-label="${spoken.simile}"` : '';
      const simileGlyph = spoken ? `<span aria-hidden="true">${SIMILE_CHAR}</span>` : SIMILE_CHAR;
      html += `<span part="simile bar-start" style="grid-column: ${startCol} / span ${span}"${simileAriaAttr}>${simileGlyph}</span>`;
    } else {
      for (let slotIdx = 0; slotIdx < barLayout.slots.length; slotIdx++) {
        const slotLayout = barLayout.slots[slotIdx];
        const { col, span } = slotLayout;
        const srcIdx = slotLayout.sourceSlotIdx ?? slotIdx;
        const slot: BeatSlot | undefined = bar.slots[srcIdx];
        const timeSigPrefix =
          slotIdx === 0 && barLayout.showTimeSig
            ? renderTimeSig(barLayout.showTimeSig, spoken)
            : '';
        const isBarStart = slotIdx === 0;

        if (slotLayout.implicit || slot?.type === 'dot') {
          const dotPart = isBarStart ? 'dot bar-start' : 'dot';
          html += `<span part="${dotPart}" style="grid-column: ${col} / span 1">${timeSigPrefix}<span aria-hidden="true">/</span></span>`;
        } else if (slot) {
          // chord slot
          const effectiveBeats = (slotLayout.span + 1) / 2;
          const tsBeats = effectiveBeats * (barLayout.activeTSig.denominator / beatUnit);
          const isWholeBar = tsBeats === barLayout.activeTSig.numerator;
          const slotContent = renderChord(
            slot.chord,
            preset,
            flatChar,
            sharpChar,
            mode,
            slashStyle,
            tsBeats,
            isWholeBar,
            barLayout.activeTSig.denominator,
            spoken,
          );
          const slotPart = isBarStart ? 'slot bar-start' : 'slot';
          html += `<span part="${slotPart}" style="grid-column: ${col} / span ${span}">${timeSigPrefix}${slotContent}</span>`;
        }
      }
    }

    const isLastBar = barIdx === row.bars.length - 1;
    const closePosition = isLastBar ? (isFullRow ? 'end' : 'short-end') : 'mid';
    html += renderBarline(bar.closeBarline, barLayout.closeBarlineCol, closePosition, spoken);
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

/**
 * Renders a `Song` to a semantic HTML string. Output uses CSS grid layout with `part` attributes
 * for styling and `aria-label` attributes for accessibility.
 */
export class HtmlRenderer implements GrigsonRenderer {
  constructor(private config: TextRendererConfig = {}) {}

  render(song: Song): string {
    const preset = sanitizePreset(resolvePreset(this.config.notation?.preset));
    const mode: AccidentalsMode = this.config.accidentals === 'ascii' ? 'ascii' : 'unicode';
    const slashStyle: SlashStyle = this.config.slashStyle ?? 'diagonal';
    const flatChar = mode === 'unicode' ? '♭' : 'b';
    const sharpChar = mode === 'unicode' ? '♯' : '#';
    let source = song;
    if (this.config.barsPerLine) {
      source = reflowSong(source, this.config.barsPerLine);
    } else if (this.config.maxBarsPerLine) {
      source = splitRows(source, this.config.maxBarsPerLine);
    }
    const layout = computeGlobalLayout(source);
    const { beatCols, minBeatWidth } = layout;
    const spoken =
      this.config.aria === false ? null : (this.config.spokenPreset ?? DEFAULT_SPOKEN_PRESET);

    let html = `<div part="song" style="--beat-cols: ${beatCols}; --min-beat-width: ${minBeatWidth}">`;

    if (source.title !== null || source.key !== null) {
      html += renderFrontMatter(source);
    }

    html += `<div part="song-grid">`;

    for (const section of source.sections) {
      html += `<section part="section" style="display: contents">`;

      if (section.label !== null) {
        html += `<h2 part="section-label">${section.label}</h2>`;
      }

      // Compute the widest row in this section so short rows can be identified correctly.
      const items = section.content ?? section.rows;
      let sectionMaxCol = 0;
      for (const item of items) {
        if (item.type === 'row') {
          const rowLayout = layout.rows.get(item)!;
          const col = rowLayout.bars[rowLayout.bars.length - 1].closeBarlineCol;
          if (col > sectionMaxCol) sectionMaxCol = col;
        }
      }

      for (const item of items) {
        if (item.type === 'row') {
          const rowLayout = layout.rows.get(item)!;
          html += renderRow(
            item,
            rowLayout,
            preset,
            this.config,
            flatChar,
            sharpChar,
            mode,
            slashStyle,
            sectionMaxCol,
            layout.beatUnit,
            spoken,
          );
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
