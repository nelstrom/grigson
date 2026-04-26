import type { Song, Section, Row, Bar, Chord, ChordSlot, Quality } from '../parser/types.js';
import { detectKey, type DetectKeyConfig } from './keyDetector.js';
import { KEYS, resolveKey } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';
import { analyseHarmony } from './harmonicAnalysis.js';

function toCanonicalKey(key: string | null): string | null {
  if (key === null) return null;
  if (key.includes(' ')) return key; // already has a mode suffix (dorian/aeolian/mixolydian/major/minor)
  if (key.endsWith('m')) return key.slice(0, -1) + ' minor';
  return key + ' major';
}

function buildPCToNote(key: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const note of KEYS[resolveKey(key)]?.notes ?? []) {
    try {
      map.set(rootToPitchClass(note), note);
    } catch {
      // skip notes not in NOTE_MAP (e.g. E#, B#)
    }
  }
  return map;
}

function canonicalNote(
  note: string,
  homePCToNote: Map<number, string>,
  currentPCToNote: Map<number, string>,
): string {
  let pc: number;
  try {
    pc = rootToPitchClass(note);
  } catch {
    return note;
  }
  // Prefer homeKey spelling; fall back to currentKey spelling; keep original if neither matches
  return homePCToNote.get(pc) ?? currentPCToNote.get(pc) ?? note;
}

const MINOR_QUALITIES = new Set<Quality>(['minor', 'min7', 'halfDiminished', 'dim7', 'diminished']);

function normaliseChord(
  chord: Chord,
  homePCToNote: Map<number, string>,
  currentPCToNote: Map<number, string>,
): Chord {
  const newRoot = canonicalNote(chord.root, homePCToNote, currentPCToNote);

  let newBass = chord.bass;
  if (chord.bass !== undefined) {
    let rootPC: number | undefined;
    try {
      rootPC = rootToPitchClass(newRoot);
    } catch {
      // ignore
    }

    if (rootPC !== undefined && !homePCToNote.has(rootPC)) {
      // Borrowed chord: the root isn't diatonic to the home key, so don't use the home key
      // to spell the bass. Instead derive the spelling from the chord root's own key so that,
      // e.g., A/Db (borrowed in Ab major) → A/C# (C# is the major 3rd of A, not Db).
      const chordKeyStr = MINOR_QUALITIES.has(chord.quality) ? newRoot + 'm' : newRoot;
      const chordPCToNote = buildPCToNote(chordKeyStr);
      newBass = canonicalNote(chord.bass, chordPCToNote, currentPCToNote);
    } else {
      newBass = canonicalNote(chord.bass, homePCToNote, currentPCToNote);
    }
  }

  if (newRoot === chord.root && newBass === chord.bass) return chord;

  const result: Chord = { ...chord, root: newRoot };
  if (newBass !== undefined) result.bass = newBass;
  return result;
}

/**
 * Re-spell a flat chord array for a single section. Returns the corrected chords and the
 * inferred home key.
 */
export function normaliseSection(
  chords: Chord[],
  config?: DetectKeyConfig,
  declaredKey?: string | null,
): { homeKey: string | null; chords: Chord[] } {
  const detectedKey = config?.forceKey ?? detectKey(chords, declaredKey ?? null, config);
  const homePCToNote =
    detectedKey !== null ? buildPCToNote(detectedKey) : new Map<number, string>();
  const annotated = detectedKey !== null ? analyseHarmony(chords, detectedKey) : null;

  const normalisedChords = chords.map((chord, i) => {
    const currentKey = annotated?.[i]?.currentKey ?? null;
    const currentPCToNote =
      currentKey !== null ? buildPCToNote(currentKey) : new Map<number, string>();
    return normaliseChord(chord, homePCToNote, currentPCToNote);
  });

  return { homeKey: detectedKey, chords: normalisedChords };
}

/**
 * Re-spell chord roots across every section to match inferred key signatures and canonical
 * enharmonic conventions. Runs harmonic analysis internally to determine the home key of each
 * section. Returns a new `Song`; does not mutate.
 */
export function normaliseSong(song: Song, config?: DetectKeyConfig): Song {
  const sectionResults: { homeKey: string | null; section: Section }[] = song.sections.map(
    (sec) => {
      const chords = sec.rows.flatMap((row) =>
        row.bars.flatMap((bar) =>
          bar.slots.filter((s): s is ChordSlot => s.type === 'chord').map((s) => s.chord),
        ),
      );
      const { homeKey, chords: normalisedChords } = normaliseSection(chords, config, sec.key);

      let chordIndex = 0;
      const newRows: Row[] = sec.rows.map((row) => ({
        ...row,
        bars: row.bars.map(
          (bar): Bar => ({
            ...bar,
            slots: bar.slots.map((slot) =>
              slot.type === 'chord'
                ? { type: 'chord' as const, chord: normalisedChords[chordIndex++] }
                : slot,
            ),
          }),
        ),
      }));

      let rowIdx = 0;
      const newContent = (sec.content ?? sec.rows).map((item) =>
        item.type === 'row' ? newRows[rowIdx++] : item,
      );

      return { homeKey, section: { ...sec, rows: newRows, content: newContent } };
    },
  );

  const firstSectionKey = sectionResults[0]?.homeKey ?? song.key;
  const newSections = sectionResults.map((r) => r.section);

  // Collect all bars that carry an explicit time signature
  const allBars = newSections.flatMap((s) => s.rows.flatMap((r) => r.bars));
  const barsWithTS = allBars.filter((b) => b.timeSignature !== undefined);

  let newMeter: string | null = song.meter;
  let finalSections = newSections;

  if (barsWithTS.length > 0) {
    const uniqueMeters = new Set(
      barsWithTS.map((b) => `${b.timeSignature!.numerator}/${b.timeSignature!.denominator}`),
    );

    if (uniqueMeters.size === 1) {
      // Uniform — hoist to front-matter, strip inline tokens from all bars
      newMeter = [...uniqueMeters][0];
      finalSections = newSections.map((sec) => {
        const strippedRows = sec.rows.map((row) => ({
          ...row,
          bars: row.bars.map(({ timeSignature: _, ...rest }) => rest as Bar),
        }));
        let rowIdx = 0;
        const strippedContent = (sec.content ?? sec.rows).map((item) =>
          item.type === 'row' ? strippedRows[rowIdx++] : item,
        );
        return { ...sec, rows: strippedRows, content: strippedContent };
      });
    } else {
      // Mixed meter
      newMeter = 'mixed';
    }
  }

  // Default to 4/4 when no meter has been declared or inferred
  if (newMeter === null) {
    newMeter = '4/4';
  }

  return {
    ...song,
    key: toCanonicalKey(firstSectionKey),
    meter: newMeter,
    sections: finalSections,
  };
}
