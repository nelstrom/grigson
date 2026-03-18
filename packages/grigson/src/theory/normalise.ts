import type { Song, Section, Row, Bar, Chord, ChordSlot } from '../parser/types.js';
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
  declaredKey?: string | null,
): { homeKey: string | null; chords: Chord[] } {
  const detectedKey = config?.forceKey ?? detectKey(chords, declaredKey ?? null, config);
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
      // Uniform — hoist to front-matter, strip inline tokens
      newMeter = [...uniqueMeters][0];
      finalSections = newSections.map((sec) => {
        const strippedRows = sec.rows.map((row) => ({
          ...row,
          bars: row.bars.map(({ timeSignature: _ts, ...rest }) => rest as Bar),
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

  return { ...song, key: toCanonicalKey(firstSectionKey), meter: newMeter, sections: finalSections };
}
