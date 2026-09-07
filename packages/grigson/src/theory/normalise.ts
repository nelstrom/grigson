import type { Song, Section, Row, Bar, Chord, ChordCell, Quality } from '../parser/types.js';
import { detectKey, type DetectKeyConfig } from './keyDetector.js';
import { KEYS, resolveKey, toCanonicalKey } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';
import { analyseHarmony, resolveSectionKeys } from './harmonicAnalysis.js';

export { toCanonicalKey } from './keys.js';

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
  const resolvedKeys = resolveSectionKeys(song);
  const sectionResults: { homeKey: string | null; section: Section }[] = song.sections.map(
    (sec, i) => {
      const chords = sec.rows.flatMap((row) =>
        row.bars.flatMap((bar) =>
          bar.cells.filter((s): s is ChordCell => s.type === 'chord').map((s) => s.chord),
        ),
      );
      const { homeKey, chords: normalisedChords } = normaliseSection(
        chords,
        config,
        resolvedKeys[i],
      );

      let chordIndex = 0;
      const newRows: Row[] = sec.rows.map((row) => ({
        ...row,
        bars: row.bars.map(
          (bar): Bar => ({
            ...bar,
            cells: bar.cells.map((cell) =>
              cell.type === 'chord'
                ? { type: 'chord' as const, chord: normalisedChords[chordIndex++] }
                : cell,
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

  const newSections = sectionResults.map((r) => r.section);

  // ── Front-matter key + redundant section-key hoisting ──────────────────────
  // Decision B: never override a declared key. Detect one only when `song.key` is
  // absent. Hoist per-section keys to front matter (and strip them) only when every
  // section carries an explicit key, they are all equal, and they don't conflict
  // with an existing front-matter key.
  const sectionKeys = song.sections.map((s) => s.key);
  const everySectionKeyed = sectionKeys.length > 0 && sectionKeys.every((k) => k != null);
  const allSectionKeysEqual = everySectionKeyed && new Set(sectionKeys).size === 1;
  const section0Detected = toCanonicalKey(sectionResults[0]?.homeKey ?? null);

  let finalKey: string | null;
  let stripSectionKeys = false;

  if (config?.forceKey) {
    // `--key X` forces X everywhere; bypasses hoist/strip.
    finalKey = section0Detected;
  } else if (song.key != null) {
    finalKey = toCanonicalKey(song.key);
    if (allSectionKeysEqual && sectionKeys[0] === song.key) {
      stripSectionKeys = true;
    }
  } else if (allSectionKeysEqual) {
    // No front-matter key, every section agrees → promote to front matter.
    finalKey = toCanonicalKey(sectionKeys[0]!);
    stripSectionKeys = true;
  } else {
    finalKey = section0Detected;
  }

  // Compose the section-key strip with the meter block below.
  const workingSections = stripSectionKeys
    ? newSections.map((s) => ({ ...s, key: null }))
    : newSections;

  // Collect all bars that carry an explicit time signature
  const allBars = workingSections.flatMap((s) => s.rows.flatMap((r) => r.bars));
  const barsWithTS = allBars.filter((b) => b.timeSignature !== undefined);

  let newMeter: string | null = song.meter;
  let finalSections = workingSections;

  if (barsWithTS.length > 0) {
    const uniqueMeters = new Set(
      barsWithTS.map((b) => `${b.timeSignature!.numerator}/${b.timeSignature!.denominator}`),
    );

    if (uniqueMeters.size === 1) {
      // Uniform — hoist to front-matter, strip inline tokens from all bars
      newMeter = [...uniqueMeters][0];
      finalSections = workingSections.map((sec) => {
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
    key: finalKey,
    meter: newMeter,
    sections: finalSections,
  };
}
