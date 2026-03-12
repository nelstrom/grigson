import type { Song, Row, Bar, Chord } from '../parser/types.js';
import { detectKey, type DetectKeyConfig } from './keyDetector.js';
import { KEYS } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';

// Preferred flat-side spelling for each enharmonic pitch class
const FLAT_SPELLING: Record<number, string> = {
  1: 'Db',
  3: 'Eb',
  6: 'Gb',
  8: 'Ab',
  10: 'Bb',
};

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

// Returns the preferred spelling for a non-diatonic enharmonic root.
// Heuristic: if this chord is a fifth above the next chord (secondary dominant),
// use the flat spelling when the next chord is flat-side or natural.
// Fallback: prefer the flat spelling for pitch classes 1, 3, 6, 8, 10.
function preferredNonDiatonicSpelling(chord: Chord, nextChord: Chord | undefined): string {
  let pc: number;
  try {
    pc = rootToPitchClass(chord.root);
  } catch {
    return chord.root;
  }

  if (!(pc in FLAT_SPELLING)) return chord.root;

  if (nextChord !== undefined) {
    let nextPC: number;
    try {
      nextPC = rootToPitchClass(nextChord.root);
    } catch {
      nextPC = -1;
    }
    if (nextPC >= 0 && (nextPC + 7) % 12 === pc) {
      // This chord is a perfect 5th above the next chord (secondary dominant).
      // Use flat spelling when the next root is flat-side or natural.
      const nextIsSharp = nextChord.root.includes('#');
      if (!nextIsSharp) return FLAT_SPELLING[pc]!;
    }
  }

  return FLAT_SPELLING[pc]!;
}

function normaliseChord(chord: Chord, pcToNote: Map<number, string>, nextChord: Chord | undefined): Chord {
  let pc: number;
  try {
    pc = rootToPitchClass(chord.root);
  } catch {
    return chord;
  }

  const canonical = pcToNote.get(pc);
  if (canonical !== undefined) {
    if (canonical !== chord.root) return { ...chord, root: canonical };
    return chord;
  }

  // Non-diatonic root: apply next-chord heuristic then flat fallback
  const preferred = preferredNonDiatonicSpelling(chord, nextChord);
  if (preferred !== chord.root) return { ...chord, root: preferred };
  return chord;
}

export function normaliseSong(song: Song, config?: DetectKeyConfig): Song {
  const chords: Chord[] = song.rows.flatMap((row) => row.bars.map((bar) => bar.chord));

  const detectedKey = config?.forceKey ?? detectKey(chords, null, config);
  const pcToNote = detectedKey !== null ? buildPCToNote(detectedKey) : new Map<number, string>();

  let chordIndex = 0;
  const newRows: Row[] = song.rows.map((row) => ({
    ...row,
    bars: row.bars.map((bar): Bar => {
      const nextChord = chordIndex + 1 < chords.length ? chords[chordIndex + 1] : undefined;
      chordIndex++;
      return { ...bar, chord: normaliseChord(bar.chord, pcToNote, nextChord) };
    }),
  }));

  return { ...song, key: detectedKey ?? song.key, rows: newRows };
}
