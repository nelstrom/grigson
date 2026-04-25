import { KEYS, diatonicNotes, getKeyMode, getKeyRoot, getRelativeMajor } from './keys.js';
import { scoreAllKeys } from './keyDetector.js';
import { rootToPitchClass } from './pitchClass.js';
import type {
  Chord,
  Quality,
  Song,
  Section,
  Bar,
  BeatSlot,
  ChordSlot,
  DotSlot,
  Row,
  CommentLine,
  SectionItem,
  TonalityHintItem,
  TimeSignature,
  Barline,
  SourceRange,
} from '../parser/types.js';

// Circle-of-fifths positions indexed by major key root pitch class
const COF_POSITIONS: Readonly<Record<number, number>> = {
  0: 0, // C
  7: 1, // G
  2: 2, // D
  9: 3, // A
  4: 4, // E
  11: 5, // B
  6: 6, // F#/Gb
  1: 7, // Db/C#
  8: 8, // Ab/G#
  3: 9, // Eb/D#
  10: 10, // Bb/A#
  5: 11, // F
};

/**
 * Returns the circle-of-fifths distance between two keys.
 * Minor keys are mapped to their relative major before computing distance,
 * so relative major/minor pairs have distance 0 from each other.
 */
export function circleOfFifthsDistance(keyA: string, keyB: string): number {
  const getPosition = (key: string): number => {
    const majorKey = getRelativeMajor(key) ?? key;
    const root = getKeyRoot(majorKey);
    let pc: number;
    try {
      pc = rootToPitchClass(root);
    } catch {
      return -1;
    }
    const pos = COF_POSITIONS[pc];
    return pos !== undefined ? pos : -1;
  };

  const posA = getPosition(keyA);
  const posB = getPosition(keyB);
  if (posA === -1 || posB === -1) return Infinity;

  const diff = Math.abs(posA - posB);
  return Math.min(diff, 12 - diff);
}

export interface AnnotatedChord {
  chord: Chord;
  homeKey: string;
  currentKey: string;
  currentKeyCandidates: string[];
  realtimeKeyCandidates: string[];
  loc?: SourceRange;
}

export interface AnnotatedChordSlot {
  type: 'chord';
  chord: AnnotatedChord;
  loc?: SourceRange;
}

export type AnalysedBeatSlot = AnnotatedChordSlot | DotSlot;

export interface AnalysedBar {
  type: 'bar';
  slots: AnalysedBeatSlot[];
  timeSignature?: TimeSignature;
  tonalityHints?: TonalityHintItem[];
  closeBarline: Barline;
  loc?: SourceRange;
}

export interface AnalysedRow {
  type: 'row';
  openBarline: Barline;
  bars: AnalysedBar[];
  loc?: SourceRange;
}

export type AnalysedSectionItem = AnalysedRow | CommentLine;

export interface AnalysedSection {
  type: 'section';
  label: string | null;
  key: string | null;
  rows: AnalysedRow[];
  preamble?: CommentLine[];
  content?: AnalysedSectionItem[];
  loc?: SourceRange;
}

export interface AnalysedSong {
  type: 'song';
  title: string | null;
  key: string | null;
  meter: string | null;
  sections: AnalysedSection[];
  loc?: SourceRange;
}

// Build lookup maps: pitch class → key name (major, minor, dorian, aeolian, mixolydian separately)
function buildKeyMaps(): {
  majorByPC: Map<number, string>;
  minorByPC: Map<number, string>;
  dorianByPC: Map<number, string>;
  aeolianByPC: Map<number, string>;
  mixolydianByPC: Map<number, string>;
} {
  const majorByPC = new Map<number, string>();
  const minorByPC = new Map<number, string>();
  const dorianByPC = new Map<number, string>();
  const aeolianByPC = new Map<number, string>();
  const mixolydianByPC = new Map<number, string>();

  for (const key of Object.keys(KEYS)) {
    const mode = getKeyMode(key);
    const rootName = getKeyRoot(key);
    let pc: number;
    try {
      pc = rootToPitchClass(rootName);
    } catch {
      continue;
    }
    if (mode === 'minor') {
      if (!minorByPC.has(pc)) minorByPC.set(pc, key);
    } else if (mode === 'dorian') {
      if (!dorianByPC.has(pc)) dorianByPC.set(pc, key);
    } else if (mode === 'aeolian') {
      if (!aeolianByPC.has(pc)) aeolianByPC.set(pc, key);
    } else if (mode === 'mixolydian') {
      if (!mixolydianByPC.has(pc)) mixolydianByPC.set(pc, key);
    } else {
      if (!majorByPC.has(pc)) {
        majorByPC.set(pc, key);
      } else if (key === 'Gb') {
        // Prefer flat-side: Gb overrides F# for pitch class 6
        majorByPC.set(pc, 'Gb');
      }
    }
  }
  return { majorByPC, minorByPC, dorianByPC, aeolianByPC, mixolydianByPC };
}

const {
  majorByPC: MAJOR_BY_PC,
  minorByPC: MINOR_BY_PC,
  dorianByPC: DORIAN_BY_PC,
  aeolianByPC: AEOLIAN_BY_PC,
  mixolydianByPC: MIXOLYDIAN_BY_PC,
} = buildKeyMaps();

export { MAJOR_BY_PC, MINOR_BY_PC, DORIAN_BY_PC, AEOLIAN_BY_PC, MIXOLYDIAN_BY_PC };

// Qualities with both major and minor tonal lean
const DOM_AMBIGUOUS = new Set<Quality>(['dominant7', 'dom7flat5', 'dom7sharp9', 'dom11']);
// Major-leaning dominant qualities
const DOM_MAJOR = new Set<Quality>(['dom9', 'dom13']);
// Minor-leaning dominant qualities
const DOM_MINOR = new Set<Quality>(['dom7flat9', 'dom7sharp5', 'dom7flat13']);

const ALL_DOM = new Set<Quality>([...DOM_AMBIGUOUS, ...DOM_MAJOR, ...DOM_MINOR]);

function computeRealtimeCandidates(
  chord: Chord,
  prevChord: Chord | null,
  homeKey: string,
  passageCandidates: string[],
): string[] {
  if (!ALL_DOM.has(chord.quality)) return passageCandidates;

  const pc = getPC(chord);
  if (pc === null) return passageCandidates;

  const tonicPC = (pc + 5) % 12; // a perfect 5th above V is I

  // Determine tonal lean from quality
  let wantMajor = DOM_MAJOR.has(chord.quality) || DOM_AMBIGUOUS.has(chord.quality);
  let wantMinor = DOM_MINOR.has(chord.quality) || DOM_AMBIGUOUS.has(chord.quality);

  // Refine using the preceding ii chord if present
  if (prevChord !== null) {
    const prevPC = getPC(prevChord);
    if (prevPC !== null && (prevPC + 5) % 12 === pc) {
      // prevChord is a ii chord (its root is a perfect 4th below V)
      if (prevChord.quality === 'min7' || prevChord.quality === 'minor') {
        // Major ii → minor resolution less likely
        wantMinor = false;
      } else if (prevChord.quality === 'halfDiminished' || prevChord.quality === 'diminished') {
        // Half-dim ii → major resolution less likely
        wantMajor = false;
      }
    }
  }

  const candidates: string[] = [];
  if (wantMajor) {
    const majorKey = MAJOR_BY_PC.get(tonicPC);
    if (majorKey) candidates.push(majorKey);
  }
  if (wantMinor) {
    const minorKey = MINOR_BY_PC.get(tonicPC);
    if (minorKey) candidates.push(minorKey);
  }

  // Sort by CoF distance to homeKey so hinted key appears first
  candidates.sort(
    (a, b) => circleOfFifthsDistance(homeKey, a) - circleOfFifthsDistance(homeKey, b),
  );

  return candidates.length > 0 ? candidates : passageCandidates;
}

function getPC(chord: Chord): number | null {
  try {
    return rootToPitchClass(chord.root);
  } catch {
    return null;
  }
}

function resolveKey(tonicPC: number, iChordIsMinor: boolean): string | null {
  if (iChordIsMinor) {
    return MINOR_BY_PC.get(tonicPC) ?? DORIAN_BY_PC.get(tonicPC) ?? null;
  }
  return MAJOR_BY_PC.get(tonicPC) ?? null;
}

function annotate(
  chord: Chord,
  homeKey: string,
  currentKey: string,
  rtCandidates: string[],
): AnnotatedChord {
  return {
    chord,
    homeKey,
    currentKey,
    currentKeyCandidates: [currentKey],
    realtimeKeyCandidates: rtCandidates,
    loc: chord.loc,
  };
}

/**
 * Analyses a chord sequence and annotates each chord with its home key and
 * inferred current key based on 2-5-1 and 5-1 harmonic patterns.
 *
 * Pattern priority (highest first):
 *   1. 2-5-1: minor/half-diminished ii, followed by dom7 V a 4th above, followed by tonic I a
 *      5th below the V7. All three chords are assigned the resolved tonic key.
 *   2. 5-1: dom7 V followed by a tonic I a 5th below. Both chords are assigned the resolved tonic
 *      key.
 *
 * Unmatched chords receive currentKey = homeKey.
 */
export function analyseHarmony(chords: Chord[], homeKey: string): AnnotatedChord[] {
  const result: AnnotatedChord[] = [];
  let i = 0;

  // Pre-compute home key diatonic note set for borrowed-chord detection
  let homeNotes: ReadonlySet<string>;
  try {
    homeNotes = diatonicNotes(homeKey);
  } catch {
    homeNotes = new Set<string>();
  }

  // Passage-level key candidates: all keys tied at the highest score.
  const keyScores = scoreAllKeys(chords);
  const maxKeyScore = chords.length > 0 ? Math.max(0, ...keyScores.values()) : 0;
  const passageCandidates: string[] =
    maxKeyScore > 0
      ? Array.from(keyScores.entries())
          .filter(([, s]) => s === maxKeyScore)
          .map(([k]) => k)
          .sort((a, b) => circleOfFifthsDistance(homeKey, a) - circleOfFifthsDistance(homeKey, b))
      : [homeKey];

  let prevChord: Chord | null = null;

  while (i < chords.length) {
    const chord = chords[i];
    const pc = getPC(chord);

    // Try 2-5-1 pattern: ii (minor/halfDim) → V7 (dom7) → I
    if (
      pc !== null &&
      (chord.quality === 'minor' ||
        chord.quality === 'halfDiminished' ||
        chord.quality === 'min7' ||
        chord.quality === 'diminished') &&
      i + 2 < chords.length
    ) {
      const v7Chord = chords[i + 1];
      const iChord = chords[i + 2];
      const v7PC = getPC(v7Chord);
      const iPC = getPC(iChord);

      if (
        v7Chord.quality === 'dominant7' &&
        v7PC !== null &&
        iPC !== null &&
        (v7PC - pc + 12) % 12 === 5 && // V7 is a perfect 4th above ii
        (v7PC + 5) % 12 === iPC // I is a perfect 5th below V7
      ) {
        const iIsMinor =
          iChord.quality === 'minor' ||
          iChord.quality === 'halfDiminished' ||
          iChord.quality === 'min7';
        const resolvedKey = resolveKey(iPC, iIsMinor) ?? homeKey;
        result.push(
          annotate(
            chord,
            homeKey,
            resolvedKey,
            computeRealtimeCandidates(chord, prevChord, homeKey, passageCandidates),
          ),
        );
        result.push(
          annotate(
            v7Chord,
            homeKey,
            resolvedKey,
            computeRealtimeCandidates(v7Chord, chord, homeKey, passageCandidates),
          ),
        );
        result.push(
          annotate(
            iChord,
            homeKey,
            resolvedKey,
            computeRealtimeCandidates(iChord, v7Chord, homeKey, passageCandidates),
          ),
        );
        prevChord = iChord;
        i += 3;
        continue;
      }
    }

    // Try 5-1 pattern: V7 (dom7) → I
    if (pc !== null && chord.quality === 'dominant7' && i + 1 < chords.length) {
      const iChord = chords[i + 1];
      const iPC = getPC(iChord);

      if (iPC !== null && (pc + 5) % 12 === iPC) {
        const iIsMinor =
          iChord.quality === 'minor' ||
          iChord.quality === 'halfDiminished' ||
          iChord.quality === 'min7';
        const resolvedKey = resolveKey(iPC, iIsMinor) ?? homeKey;
        result.push(
          annotate(
            chord,
            homeKey,
            resolvedKey,
            computeRealtimeCandidates(chord, prevChord, homeKey, passageCandidates),
          ),
        );
        result.push(
          annotate(
            iChord,
            homeKey,
            resolvedKey,
            computeRealtimeCandidates(iChord, chord, homeKey, passageCandidates),
          ),
        );
        prevChord = iChord;
        i += 2;
        continue;
      }
    }

    // Try dorian plagal cadence: IV (major) → i (minor) — only when homeKey is dorian
    if (
      pc !== null &&
      chord.quality === 'major' &&
      getKeyMode(homeKey) === 'dorian' &&
      i + 1 < chords.length
    ) {
      const tonicPC = rootToPitchClass(getKeyRoot(homeKey));
      const ivPC = (tonicPC + 5) % 12;

      if (pc === ivPC) {
        const iChord = chords[i + 1];
        const iPC = getPC(iChord);
        if (iPC !== null && iPC === tonicPC && iChord.quality === 'minor') {
          result.push(
            annotate(
              chord,
              homeKey,
              homeKey,
              computeRealtimeCandidates(chord, prevChord, homeKey, passageCandidates),
            ),
          );
          result.push(
            annotate(
              iChord,
              homeKey,
              homeKey,
              computeRealtimeCandidates(iChord, chord, homeKey, passageCandidates),
            ),
          );
          prevChord = iChord;
          i += 2;
          continue;
        }
      }
    }

    // Try aeolian bVII → i cadence: bVII (major) → i (minor) — only when homeKey is aeolian
    if (
      pc !== null &&
      chord.quality === 'major' &&
      getKeyMode(homeKey) === 'aeolian' &&
      i + 1 < chords.length
    ) {
      const tonicPC = rootToPitchClass(getKeyRoot(homeKey));
      const bVIIPC = (tonicPC + 10) % 12;

      if (pc === bVIIPC) {
        const iChord = chords[i + 1];
        const iPC = getPC(iChord);
        if (iPC !== null && iPC === tonicPC && iChord.quality === 'minor') {
          result.push(
            annotate(
              chord,
              homeKey,
              homeKey,
              computeRealtimeCandidates(chord, prevChord, homeKey, passageCandidates),
            ),
          );
          result.push(
            annotate(
              iChord,
              homeKey,
              homeKey,
              computeRealtimeCandidates(iChord, chord, homeKey, passageCandidates),
            ),
          );
          prevChord = iChord;
          i += 2;
          continue;
        }
      }
    }

    // Try mixolydian bVII → I cadence: bVII (major) → I (major) — only when homeKey is mixolydian
    if (
      pc !== null &&
      chord.quality === 'major' &&
      getKeyMode(homeKey) === 'mixolydian' &&
      i + 1 < chords.length
    ) {
      const tonicPC = rootToPitchClass(getKeyRoot(homeKey));
      const bVIIPC = (tonicPC + 10) % 12;

      if (pc === bVIIPC) {
        const iChord = chords[i + 1];
        const iPC = getPC(iChord);
        if (iPC !== null && iPC === tonicPC && iChord.quality === 'major') {
          result.push(
            annotate(
              chord,
              homeKey,
              homeKey,
              computeRealtimeCandidates(chord, prevChord, homeKey, passageCandidates),
            ),
          );
          result.push(
            annotate(
              iChord,
              homeKey,
              homeKey,
              computeRealtimeCandidates(iChord, chord, homeKey, passageCandidates),
            ),
          );
          prevChord = iChord;
          i += 2;
          continue;
        }
      }
    }

    // No pattern matched — check if chord is diatonic to homeKey
    if (pc !== null && !homeNotes.has(chord.root)) {
      // Non-diatonic borrowed chord: find closest key via circle of fifths
      const candidateKeys = Object.keys(KEYS).filter((key) => KEYS[key].notes.includes(chord.root));

      if (candidateKeys.length > 0) {
        candidateKeys.sort(
          (a, b) => circleOfFifthsDistance(homeKey, a) - circleOfFifthsDistance(homeKey, b),
        );
        const minDist = circleOfFifthsDistance(homeKey, candidateKeys[0]);
        const closestCandidates = candidateKeys.filter(
          (k) => circleOfFifthsDistance(homeKey, k) === minDist,
        );

        // Prefer the parallel minor of homeKey if it's among the closest candidates,
        // then fall back to preferring major keys over minor keys.
        let pickedKey: string;
        if (getKeyMode(homeKey) === 'major') {
          const parallelMinor = homeKey + 'm';
          if (closestCandidates.includes(parallelMinor)) {
            pickedKey = parallelMinor;
          } else {
            const majors = closestCandidates.filter((k) => getKeyMode(k) !== 'minor');
            pickedKey = majors.length > 0 ? majors[0] : closestCandidates[0];
          }
        } else {
          const majors = closestCandidates.filter((k) => getKeyMode(k) !== 'minor');
          pickedKey = majors.length > 0 ? majors[0] : closestCandidates[0];
        }

        result.push({
          chord,
          homeKey,
          currentKey: pickedKey,
          currentKeyCandidates: closestCandidates,
          realtimeKeyCandidates: computeRealtimeCandidates(
            chord,
            prevChord,
            homeKey,
            closestCandidates,
          ),
          loc: chord.loc,
        });
        prevChord = chord;
        i += 1;
        continue;
      }
    }

    // Diatonic chord or unrecognised root — assign home key with passage-level candidates
    result.push({
      chord,
      homeKey,
      currentKey: homeKey,
      currentKeyCandidates: passageCandidates,
      realtimeKeyCandidates: computeRealtimeCandidates(
        chord,
        prevChord,
        homeKey,
        passageCandidates,
      ),
      loc: chord.loc,
    });
    prevChord = chord;
    i += 1;
  }

  return result;
}

function analyseSection(section: Section, songKey: string): AnalysedSection {
  const homeKey = section.key ?? songKey;

  // Collect all chords and tonality hints from the section in order,
  // split into key regions by tonality hints.
  interface Region {
    key: string;
    chords: Chord[];
  }

  const regions: Region[] = [];
  let currentRegionKey = homeKey;
  let currentRegionChords: Chord[] = [];

  const flushRegion = () => {
    if (currentRegionChords.length > 0) {
      regions.push({ key: currentRegionKey, chords: currentRegionChords });
      currentRegionChords = [];
    }
  };

  // Walk all rows/bars/slots, interleaving tonality hints
  const rows = section.rows;
  for (const row of rows) {
    for (const bar of row.bars) {
      // Build an ordered list of events: hints and chord slots interleaved by beforeSlotIndex
      const hints = bar.tonalityHints ?? [];
      let hintIdx = 0;
      let slotIdx = 0;

      // Process hints that come before all slots (beforeSlotIndex === 0) first
      for (const slot of bar.slots) {
        // Emit any hints that fire before this slot index
        while (hintIdx < hints.length && hints[hintIdx].beforeSlotIndex <= slotIdx) {
          flushRegion();
          currentRegionKey = hints[hintIdx].key || homeKey;
          hintIdx++;
        }

        if (slot.type === 'chord') {
          currentRegionChords.push(slot.chord);
        }
        slotIdx++;
      }

      // Emit remaining hints after all slots
      while (hintIdx < hints.length) {
        flushRegion();
        currentRegionKey = hints[hintIdx].key || homeKey;
        hintIdx++;
      }
    }
  }

  flushRegion();

  // Run analyseHarmony per region and concatenate results
  const allAnnotated: AnnotatedChord[] = [];
  for (const region of regions) {
    const annotated = analyseHarmony(region.chords, region.key);
    allAnnotated.push(...annotated);
  }

  // Rebuild tree structure consuming annotated chords in order
  let annotatedIdx = 0;

  const buildBar = (bar: Bar): AnalysedBar => {
    const analysedSlots: AnalysedBeatSlot[] = bar.slots.map((slot) => {
      if (slot.type === 'chord') {
        const annotatedChord = allAnnotated[annotatedIdx++];
        const analysedSlot: AnnotatedChordSlot = {
          type: 'chord',
          chord: annotatedChord,
          loc: slot.loc,
        };
        return analysedSlot;
      } else {
        return slot as DotSlot;
      }
    });

    return {
      type: 'bar',
      slots: analysedSlots,
      ...(bar.timeSignature !== undefined ? { timeSignature: bar.timeSignature } : {}),
      ...(bar.tonalityHints !== undefined ? { tonalityHints: bar.tonalityHints } : {}),
      closeBarline: bar.closeBarline,
      ...(bar.loc !== undefined ? { loc: bar.loc } : {}),
    };
  };

  const buildRow = (row: Row): AnalysedRow => ({
    type: 'row',
    openBarline: row.openBarline,
    bars: row.bars.map(buildBar),
    ...(row.loc !== undefined ? { loc: row.loc } : {}),
  });

  const analysedRows = rows.map(buildRow);

  const analysedContent: AnalysedSectionItem[] | undefined = section.content?.map(
    (item: SectionItem) => {
      if (item.type === 'row') {
        // Find the corresponding analysed row by matching reference
        const rowIndex = rows.indexOf(item);
        return analysedRows[rowIndex];
      }
      return item as CommentLine;
    },
  );

  return {
    type: 'section',
    label: section.label,
    key: section.key,
    rows: analysedRows,
    ...(section.preamble !== undefined ? { preamble: section.preamble } : {}),
    ...(analysedContent !== undefined ? { content: analysedContent } : {}),
    ...(section.loc !== undefined ? { loc: section.loc } : {}),
  };
}

export function analyseSong(song: Song): AnalysedSong {
  const songKey = song.key ?? 'C major';
  const sections = song.sections.map((sec) => analyseSection(sec, songKey));
  return {
    type: 'song',
    title: song.title,
    key: song.key,
    meter: song.meter,
    sections,
    ...(song.loc !== undefined ? { loc: song.loc } : {}),
  };
}
