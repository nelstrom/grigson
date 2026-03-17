import type { Song, Section, Row, Bar, Chord, ChordSlot } from '../parser/types.js';
import { rootToPitchClass } from './pitchClass.js';
import { normaliseSection } from './normalise.js';
import { detectKey } from './keyDetector.js';
import { KEYS, getKeyRoot, resolveKey } from './keys.js';

// Flat-side chromatic scale used as a neutral intermediate spelling before normalisation
const PC_TO_FLAT: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

function shiftChord(chord: Chord, semitones: number): Chord {
  let pc: number;
  try {
    pc = rootToPitchClass(chord.root);
  } catch {
    return chord;
  }
  const newPC = ((pc + semitones) % 12 + 12) % 12;
  return { ...chord, root: PC_TO_FLAT[newPC] };
}

function transposeSectionInternal(
  chords: Chord[],
  semitones: number,
): { chords: Chord[]; homeKey: string | null } {
  const shifted = chords.map((chord) => shiftChord(chord, semitones));
  return normaliseSection(shifted);
}

export function transposeSection(chords: Chord[], semitones: number): Chord[] {
  return transposeSectionInternal(chords, semitones).chords;
}

export function transposeSong(song: Song, semitones: number): Song {
  let firstSectionKey: string | null = null;

  const newSections: Section[] = song.sections.map((sec, secIndex) => {
    const chords = sec.rows.flatMap((row) =>
      row.bars.flatMap((bar) =>
        bar.slots.filter((s): s is ChordSlot => s.type === 'chord').map((s) => s.chord),
      ),
    );
    const { chords: transposedChords, homeKey } = transposeSectionInternal(chords, semitones);

    if (secIndex === 0) {
      firstSectionKey = homeKey;
    }

    let chordIndex = 0;
    const newRows: Row[] = sec.rows.map((row) => ({
      ...row,
      bars: row.bars.map(
        (bar): Bar => ({
          ...bar,
          slots: bar.slots.map((slot) =>
            slot.type === 'chord'
              ? { type: 'chord' as const, chord: transposedChords[chordIndex++] }
              : slot,
          ),
        }),
      ),
    }));

    let rowIdx = 0;
    const newContent = (sec.content ?? sec.rows).map((item) =>
      item.type === 'row' ? newRows[rowIdx++] : item,
    );

    return { ...sec, rows: newRows, content: newContent };
  });

  return { ...song, key: firstSectionKey, sections: newSections };
}

export function transposeSongToKey(song: Song, targetKey: string): Song {
  const firstSectionChords =
    song.sections[0]?.rows.flatMap((row) =>
      row.bars.flatMap((bar) =>
        bar.slots.filter((s): s is ChordSlot => s.type === 'chord').map((s) => s.chord),
      ),
    ) ?? [];
  const homeKey = detectKey(firstSectionChords, song.key) ?? 'C';

  const homeTonicNote = KEYS[resolveKey(homeKey)]?.notes[0] ?? getKeyRoot(homeKey);
  const targetTonicNote = KEYS[resolveKey(targetKey)]?.notes[0] ?? getKeyRoot(targetKey);

  const homeTonicPC = rootToPitchClass(homeTonicNote);
  const targetTonicPC = rootToPitchClass(targetTonicNote);
  const semitones = ((targetTonicPC - homeTonicPC) + 12) % 12;

  return transposeSong(song, semitones);
}
