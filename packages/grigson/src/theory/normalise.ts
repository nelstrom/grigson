import type { Song, Section, Row, Bar, Chord } from '../parser/types.js';
import { detectKey, type DetectKeyConfig } from './keyDetector.js';
import { KEYS } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';
import { analyseHarmony } from './harmonicAnalysis.js';

function buildPCToNote(key: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const note of KEYS[key]?.notes ?? []) {
    try {
      map.set(rootToPitchClass(note), note);
    } catch {
      // skip notes not in NOTE_MAP (e.g. E#, B#)
    }
  }
  return map;
}

function normaliseChord(
  chord: Chord,
  homePCToNote: Map<number, string>,
  currentPCToNote: Map<number, string>,
): Chord {
  let pc: number;
  try {
    pc = rootToPitchClass(chord.root);
  } catch {
    return chord;
  }

  // Prefer homeKey spelling for enharmonically diatonic chords (e.g. C# → Db in Db major)
  const homeCanonical = homePCToNote.get(pc);
  if (homeCanonical !== undefined) {
    return homeCanonical !== chord.root ? { ...chord, root: homeCanonical } : chord;
  }

  // For pitch classes not in homeKey, use the currentKey spelling from harmonic analysis
  const currentCanonical = currentPCToNote.get(pc);
  if (currentCanonical !== undefined) {
    return currentCanonical !== chord.root ? { ...chord, root: currentCanonical } : chord;
  }

  return chord;
}

export function normaliseSection(
  chords: Chord[],
  config?: DetectKeyConfig,
): { homeKey: string | null; chords: Chord[] } {
  const detectedKey = config?.forceKey ?? detectKey(chords, null, config);
  const homePCToNote = detectedKey !== null ? buildPCToNote(detectedKey) : new Map<number, string>();
  const annotated = detectedKey !== null ? analyseHarmony(chords, detectedKey) : null;

  const normalisedChords = chords.map((chord, i) => {
    const currentKey = annotated?.[i]?.currentKey ?? null;
    const currentPCToNote =
      currentKey !== null ? buildPCToNote(currentKey) : new Map<number, string>();
    return normaliseChord(chord, homePCToNote, currentPCToNote);
  });

  return { homeKey: detectedKey, chords: normalisedChords };
}

export function normaliseSong(song: Song, config?: DetectKeyConfig): Song {
  const sectionResults: { homeKey: string | null; section: Section }[] = song.sections.map(
    (sec) => {
      const chords = sec.rows.flatMap((row) => row.bars.map((bar) => bar.chord));
      const { homeKey, chords: normalisedChords } = normaliseSection(chords, config);

      let chordIndex = 0;
      const newRows: Row[] = sec.rows.map((row) => ({
        ...row,
        bars: row.bars.map((bar): Bar => ({ ...bar, chord: normalisedChords[chordIndex++] })),
      }));

      return { homeKey, section: { ...sec, rows: newRows } };
    },
  );

  const firstSectionKey = sectionResults[0]?.homeKey ?? song.key;
  const newSections = sectionResults.map((r) => r.section);

  return { ...song, key: firstSectionKey, sections: newSections };
}
