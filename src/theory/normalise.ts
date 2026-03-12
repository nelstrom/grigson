import type { Song, Row, Bar, Chord } from '../parser/types.js';
import { detectKey, type DetectKeyConfig } from './keyDetector.js';
import { KEYS } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';

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

function normaliseChord(chord: Chord, pcToNote: Map<number, string>): Chord {
  let pc: number;
  try {
    pc = rootToPitchClass(chord.root);
  } catch {
    return chord;
  }
  const canonical = pcToNote.get(pc);
  if (canonical !== undefined && canonical !== chord.root) {
    return { ...chord, root: canonical };
  }
  return chord;
}

export function normaliseSong(song: Song, config?: DetectKeyConfig): Song {
  const chords: Chord[] = song.rows.flatMap((row) => row.bars.map((bar) => bar.chord));

  const detectedKey = detectKey(chords, null, config);
  if (detectedKey === null) return { ...song };

  const pcToNote = buildPCToNote(detectedKey);

  const newRows: Row[] = song.rows.map((row) => ({
    ...row,
    bars: row.bars.map(
      (bar): Bar => ({
        ...bar,
        chord: normaliseChord(bar.chord, pcToNote),
      }),
    ),
  }));

  return { ...song, key: detectedKey, rows: newRows };
}
