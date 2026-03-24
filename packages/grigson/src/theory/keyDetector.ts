import { KEYS, getKeyMode, getKeyRoot, getRelativeMajor } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';
import type { Chord, Quality } from '../parser/types.js';

// Expected chord qualities (triad + tetrad) for each scale degree
const MAJOR_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set<Quality>(['major', 'maj7']), // I
  new Set<Quality>(['minor', 'min7']), // II
  new Set<Quality>(['minor', 'min7']), // III
  new Set<Quality>(['major', 'maj7']), // IV
  new Set<Quality>(['major', 'dominant7']), // V
  new Set<Quality>(['minor', 'min7']), // VI
  new Set<Quality>(['diminished', 'halfDiminished']), // VII
];

const HARMONIC_MINOR_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set<Quality>(['minor']), // I (minMaj7 placeholder omitted)
  new Set<Quality>(['diminished', 'halfDiminished']), // II
  new Set<Quality>(), // III (augmented — placeholder)
  new Set<Quality>(['minor', 'min7']), // IV
  new Set<Quality>(['major', 'dominant7']), // V
  new Set<Quality>(['major', 'maj7']), // VI
  new Set<Quality>(['diminished', 'dim7']), // VII
];

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const HARMONIC_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 11];
const DORIAN_INTERVALS = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
const MIXOLYDIAN_INTERVALS = [0, 2, 4, 5, 7, 9, 10];

const DORIAN_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set<Quality>(['minor', 'min7']), // i
  new Set<Quality>(['minor', 'min7']), // ii
  new Set<Quality>(['major', 'maj7']), // bIII
  new Set<Quality>(['major', 'maj7']), // IV (dominant7 excluded: would alias major-key V7)
  new Set<Quality>(['minor', 'min7']), // v
  new Set<Quality>(['diminished', 'halfDiminished']), // vi°
  new Set<Quality>(['major', 'maj7']), // bVII (dominant7 excluded: would alias major-key V7)
];

const AEOLIAN_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set<Quality>(['minor', 'min7']), // i
  new Set<Quality>(['diminished', 'halfDiminished']), // ii°
  new Set<Quality>(['major', 'maj7']), // bIII
  new Set<Quality>(['minor', 'min7']), // iv  ← distinguishes aeolian from dorian
  new Set<Quality>(['minor', 'min7']), // v
  new Set<Quality>(['major', 'maj7']), // bVI
  new Set<Quality>(['major', 'maj7']), // bVII
];

const MIXOLYDIAN_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set<Quality>(['major', 'maj7']), // I (dominant7 excluded: aliases major V7)
  new Set<Quality>(['minor', 'min7']), // ii
  new Set<Quality>(['diminished', 'halfDiminished']), // iii°
  new Set<Quality>(['major', 'maj7']), // IV (dominant7 excluded)
  new Set<Quality>(['minor', 'min7']), // v  ← distinguishes mixolydian from major
  new Set<Quality>(['minor', 'min7']), // vi
  new Set<Quality>(['major', 'maj7']), // bVII ← distinguishes mixolydian from major
];

function buildKeyScoreMap(key: string): Map<number, Set<Quality>> {
  const mode = getKeyMode(key);
  const rootName = getKeyRoot(key);
  const rootPC = rootToPitchClass(rootName);
  let intervals: number[];
  let qualitySets: Set<Quality>[];
  if (mode === 'dorian') {
    intervals = DORIAN_INTERVALS;
    qualitySets = DORIAN_DEGREE_QUALITY_SETS;
  } else if (mode === 'aeolian') {
    intervals = AEOLIAN_INTERVALS;
    qualitySets = AEOLIAN_DEGREE_QUALITY_SETS;
  } else if (mode === 'mixolydian') {
    intervals = MIXOLYDIAN_INTERVALS;
    qualitySets = MIXOLYDIAN_DEGREE_QUALITY_SETS;
  } else if (mode === 'minor') {
    intervals = HARMONIC_MINOR_INTERVALS;
    qualitySets = HARMONIC_MINOR_DEGREE_QUALITY_SETS;
  } else {
    intervals = MAJOR_INTERVALS;
    qualitySets = MAJOR_DEGREE_QUALITY_SETS;
  }

  const map = new Map<number, Set<Quality>>();
  for (let i = 0; i < intervals.length; i++) {
    const pc = (rootPC + intervals[i]) % 12;
    map.set(pc, qualitySets[i]);
  }
  return map;
}

function qualityMatchesSet(chordQuality: Quality, expected: Set<Quality>): boolean {
  return expected.has(chordQuality);
}

function computeScore(key: string, chords: Chord[]): number {
  const pcToQualitySet = buildKeyScoreMap(key);
  let score = 0;
  for (const chord of chords) {
    let pc: number;
    try {
      pc = rootToPitchClass(chord.root);
    } catch {
      continue;
    }
    if (pcToQualitySet.has(pc)) {
      score += 1; // diatonic root
      const expectedSet = pcToQualitySet.get(pc)!;
      if (qualityMatchesSet(chord.quality, expectedSet)) {
        score += 1; // quality bonus
      }
    }
  }
  return score;
}

// When a key and its relative major/minor are within 1 point, apply ordered tiebreakers.
function breakRelativeTie(major: string, minor: string, chords: Chord[]): string {
  const minorRootPC = rootToPitchClass(getKeyRoot(minor));
  const majorRootPC = rootToPitchClass(getKeyRoot(major));

  // 1. V7 of harmonic minor present → minor wins
  const v7OfMinorPC = (minorRootPC + 7) % 12;
  if (chords.some((c) => c.quality === 'dominant7' && rootToPitchClass(c.root) === v7OfMinorPC)) {
    return minor;
  }

  // 2. V7 of major present → major wins
  const v7OfMajorPC = (majorRootPC + 7) % 12;
  if (chords.some((c) => c.quality === 'dominant7' && rootToPitchClass(c.root) === v7OfMajorPC)) {
    return major;
  }

  // 3. Last chord tonic → that key wins
  if (chords.length > 0) {
    const lastPC = rootToPitchClass(chords[chords.length - 1].root);
    if (lastPC === minorRootPC) return minor;
    if (lastPC === majorRootPC) return major;
  }

  // 4. First chord tonic → that key wins
  if (chords.length > 0) {
    const firstPC = rootToPitchClass(chords[0].root);
    if (firstPC === minorRootPC) return minor;
    if (firstPC === majorRootPC) return major;
  }

  // 5. Prefer major as final fallback
  return major;
}

export interface DetectKeyConfig {
  fSharpOrGFlat?: 'f-sharp' | 'g-flat';
  forceKey?: string;
}

function breakFSharpGbTie(chords: Chord[], config?: DetectKeyConfig): string {
  // If config is explicitly provided, use it
  if (config?.fSharpOrGFlat === 'g-flat') return 'Gb';
  if (config?.fSharpOrGFlat === 'f-sharp') return 'F#';
  // Fall back to chord-root spelling preference
  const gbCount = chords.filter((c) => c.root === 'Gb').length;
  const fSharpCount = chords.filter((c) => c.root === 'F#').length;
  if (gbCount > fSharpCount) return 'Gb';
  if (fSharpCount > gbCount) return 'F#';
  // Default to F#
  return 'F#';
}

function breakGSharpAbTie(chords: Chord[]): string {
  // Count sharp-side spellings (G#, A#, D#) vs flat-side spellings (Ab, Bb, Eb)
  const sharpCount = chords.filter(
    (c) => c.root === 'G#' || c.root === 'A#' || c.root === 'D#',
  ).length;
  const flatCount = chords.filter(
    (c) => c.root === 'Ab' || c.root === 'Bb' || c.root === 'Eb',
  ).length;
  if (sharpCount > flatCount) return 'G#m';
  return 'Abm';
}

// Tiebreak between a dorian key and its relative major.
// Priority: (1) V7→I major cadence → major; (2) IV→i plagal cadence → dorian;
// (3) last-chord quality at tonic; (4) first-chord quality at tonic; (5) default major.
function breakDorianMajorTie(dorian: string, major: string, chords: Chord[]): string {
  const dorianRootPC = rootToPitchClass(getKeyRoot(dorian));
  const majorRootPC = rootToPitchClass(getKeyRoot(major));

  // 1. V7 of the relative major present → major wins
  const v7OfMajorPC = (majorRootPC + 7) % 12;
  if (chords.some((c) => c.quality === 'dominant7' && rootToPitchClass(c.root) === v7OfMajorPC)) {
    return major;
  }

  // 2. IV→i dorian plagal cadence present → dorian wins
  const ivOfDorianPC = (dorianRootPC + 5) % 12;
  for (let i = 0; i < chords.length - 1; i++) {
    try {
      const thisPC = rootToPitchClass(chords[i].root);
      const nextPC = rootToPitchClass(chords[i + 1].root);
      if (
        thisPC === ivOfDorianPC &&
        chords[i].quality === 'major' &&
        nextPC === dorianRootPC &&
        chords[i + 1].quality === 'minor'
      ) {
        return dorian;
      }
    } catch {
      // skip unrecognised root
    }
  }

  // 3. Quality of first chord at its tonic
  if (chords.length > 0) {
    const first = chords[0];
    try {
      const firstPC = rootToPitchClass(first.root);
      if (firstPC === dorianRootPC && first.quality === 'minor') return dorian;
      if (firstPC === majorRootPC && first.quality === 'major') return major;
    } catch {
      // skip
    }
  }

  // 4. Quality of last chord at its tonic
  if (chords.length > 0) {
    const last = chords[chords.length - 1];
    try {
      const lastPC = rootToPitchClass(last.root);
      if (lastPC === dorianRootPC && last.quality === 'minor') return dorian;
      if (lastPC === majorRootPC && last.quality === 'major') return major;
    } catch {
      // skip
    }
  }

  // 5. Default to relative major
  return major;
}

// Tiebreak between an aeolian key and its parent major.
// Priority: (1) V7 of parent major present → major wins; (2) first chord is the tonic of one key;
// (3) last chord is the tonic of one key; (4) default major.
// Note: bVII→i appears in the parent major as IV→V, so cadence detection is too ambiguous here.
function breakAeolianMajorTie(aeolian: string, major: string, chords: Chord[]): string {
  const aeolianRootPC = rootToPitchClass(getKeyRoot(aeolian));
  const majorRootPC = rootToPitchClass(getKeyRoot(major));

  // 1. V7 of parent major present → major wins (authentic cadence confirms ionian)
  const v7OfMajorPC = (majorRootPC + 7) % 12;
  if (chords.some((c) => c.quality === 'dominant7' && rootToPitchClass(c.root) === v7OfMajorPC)) {
    return major;
  }

  // 2. First chord quality at tonic → that key wins
  if (chords.length > 0) {
    const first = chords[0];
    try {
      const firstPC = rootToPitchClass(first.root);
      if (firstPC === aeolianRootPC && first.quality === 'minor') return aeolian;
      if (firstPC === majorRootPC && first.quality === 'major') return major;
    } catch {
      // skip
    }
  }

  // 3. Last chord quality at tonic → that key wins
  if (chords.length > 0) {
    const last = chords[chords.length - 1];
    try {
      const lastPC = rootToPitchClass(last.root);
      if (lastPC === aeolianRootPC && last.quality === 'minor') return aeolian;
      if (lastPC === majorRootPC && last.quality === 'major') return major;
    } catch {
      // skip
    }
  }

  // 4. Default to parent major
  return major;
}

// Tiebreak between a mixolydian key and its parent major.
// Priority: (1) V7 of parent major present → major wins; (2) first chord is the tonic of one key;
// (3) last chord is the tonic of one key; (4) default major.
// Note: bVII→I appears in parent major as IV→V, making cadence detection ambiguous.
function breakMixolydianMajorTie(mixolydian: string, major: string, chords: Chord[]): string {
  const mixolydianRootPC = rootToPitchClass(getKeyRoot(mixolydian));
  const majorRootPC = rootToPitchClass(getKeyRoot(major));

  // 1. V7 of parent major present → major wins (authentic cadence excludes mixolydian which has minor v)
  const v7OfMajorPC = (majorRootPC + 7) % 12;
  if (chords.some((c) => c.quality === 'dominant7' && rootToPitchClass(c.root) === v7OfMajorPC)) {
    return major;
  }

  // 2. First chord quality at tonic → that key wins
  if (chords.length > 0) {
    const first = chords[0];
    try {
      const firstPC = rootToPitchClass(first.root);
      if (firstPC === mixolydianRootPC && first.quality === 'major') return mixolydian;
      if (firstPC === majorRootPC && first.quality === 'major') return major;
    } catch {
      // skip
    }
  }

  // 3. Last chord quality at tonic → that key wins
  if (chords.length > 0) {
    const last = chords[chords.length - 1];
    try {
      const lastPC = rootToPitchClass(last.root);
      if (lastPC === mixolydianRootPC && last.quality === 'major') return mixolydian;
      if (lastPC === majorRootPC && last.quality === 'major') return major;
    } catch {
      // skip
    }
  }

  // 4. Default to parent major
  return major;
}

function breakDSharpEbTie(chords: Chord[]): string {
  // Count sharp-side spellings (D#, A#, G#) vs flat-side spellings (Eb, Bb, Ab)
  const sharpCount = chords.filter(
    (c) => c.root === 'D#' || c.root === 'A#' || c.root === 'G#',
  ).length;
  const flatCount = chords.filter(
    (c) => c.root === 'Eb' || c.root === 'Bb' || c.root === 'Ab',
  ).length;
  if (sharpCount > flatCount) return 'D#m';
  return 'Ebm';
}

export function detectKey(
  chords: Chord[],
  declaredKey?: string | null,
  config?: DetectKeyConfig,
): string | null {
  const scores = new Map<string, number>();
  let maxScore = 0;
  let bestKey: string | null = null;

  for (const key of Object.keys(KEYS)) {
    const score = computeScore(key, chords);
    scores.set(key, score);
    if (score > maxScore) {
      maxScore = score;
      bestKey = key;
    } else if (score === maxScore && maxScore > 0 && bestKey !== null) {
      // Tie-breaker: prefer tonic match
      const firstPC = rootToPitchClass(chords[0].root);
      const currentBestPC = rootToPitchClass(getKeyRoot(bestKey));
      const candidatePC = rootToPitchClass(getKeyRoot(key));

      if (candidatePC === firstPC && currentBestPC !== firstPC) {
        bestKey = key;
      }
    }
  }

  if (maxScore === 0 || bestKey === null) return null;

  // Require the best score to average at least 1.5 points per chord (diatonic + quality match).
  // A fully chromatic progression will not reach this bar even if 3/4 roots happen to be diatonic.
  if (maxScore < 1.5 * chords.length) return null;

  // Preserve declaredKey if it has any diatonic overlap; only override if it scores zero
  if (declaredKey != null) {
    const declaredScore = scores.get(declaredKey) ?? 0;
    if (declaredScore > 0) {
      return declaredKey;
    }
  }

  // If the relative major/minor is within 1 point, apply explicit tiebreaking.
  // Only apply the harmonic-minor/relative-major tiebreaker for major and minor keys;
  // modal keys (dorian, aeolian, mixolydian) have their own dedicated tiebreakers below.
  if (getKeyMode(bestKey) === 'major' || getKeyMode(bestKey) === 'minor') {
    let relativeKey: string | undefined;
    if (getKeyMode(bestKey) === 'minor') {
      relativeKey = getRelativeMajor(bestKey);
    } else if (getKeyMode(bestKey) === 'major') {
      // Relative minor: find the harmonic minor key whose relative major is bestKey
      relativeKey = Object.keys(KEYS).find(
        (k) => getKeyMode(k) === 'minor' && getRelativeMajor(k) === bestKey,
      );
    }
    if (relativeKey && KEYS[relativeKey] && getKeyMode(relativeKey) !== 'dorian') {
      const relativeScore = scores.get(relativeKey) ?? 0;
      if (Math.abs(maxScore - relativeScore) <= 1) {
        const isMinor = getKeyMode(bestKey) === 'minor';
        const major = isMinor ? relativeKey : bestKey;
        const minor = isMinor ? bestKey : relativeKey;
        bestKey = breakRelativeTie(major, minor, chords);
      }
    }
  }

  // Handle F#/Gb enharmonic tiebreak
  const fSharpGbOther = bestKey === 'F#' ? 'Gb' : bestKey === 'Gb' ? 'F#' : null;
  if (fSharpGbOther !== null) {
    const otherScore = scores.get(fSharpGbOther) ?? 0;
    if (otherScore === maxScore) {
      bestKey = breakFSharpGbTie(chords, config);
    }
  }

  // Handle G#m/Abm enharmonic tiebreak
  const gSharpAbOther = bestKey === 'G#m' ? 'Abm' : bestKey === 'Abm' ? 'G#m' : null;
  if (gSharpAbOther !== null) {
    const otherScore = scores.get(gSharpAbOther) ?? 0;
    if (otherScore === maxScore) {
      bestKey = breakGSharpAbTie(chords);
    }
  }

  // Handle D#m/Ebm enharmonic tiebreak
  const dSharpEbOther = bestKey === 'D#m' ? 'Ebm' : bestKey === 'Ebm' ? 'D#m' : null;
  if (dSharpEbOther !== null) {
    const otherScore = scores.get(dSharpEbOther) ?? 0;
    if (otherScore === maxScore) {
      bestKey = breakDSharpEbTie(chords);
    }
  }

  // Handle dorian/relative-major tiebreak
  if (getKeyMode(bestKey) === 'dorian') {
    const dorianRelative = getRelativeMajor(bestKey);
    if (dorianRelative && KEYS[dorianRelative]) {
      const relScore = scores.get(dorianRelative) ?? 0;
      if (relScore === maxScore) {
        bestKey = breakDorianMajorTie(bestKey, dorianRelative, chords);
      }
    }
  } else if (getKeyMode(bestKey) === 'major') {
    for (const [key, score] of scores) {
      if (getKeyMode(key) === 'dorian' && getRelativeMajor(key) === bestKey && score === maxScore) {
        bestKey = breakDorianMajorTie(key, bestKey, chords);
        break;
      }
    }
  }

  // Handle aeolian/parent-major tiebreak
  if (getKeyMode(bestKey) === 'aeolian') {
    const parentMajor = getRelativeMajor(bestKey);
    if (parentMajor && KEYS[parentMajor] && (scores.get(parentMajor) ?? 0) === maxScore) {
      bestKey = breakAeolianMajorTie(bestKey, parentMajor, chords);
    }
  } else if (getKeyMode(bestKey) === 'major') {
    for (const [key, score] of scores) {
      if (
        getKeyMode(key) === 'aeolian' &&
        getRelativeMajor(key) === bestKey &&
        score === maxScore
      ) {
        bestKey = breakAeolianMajorTie(key, bestKey, chords);
        break;
      }
    }
  }

  // Handle mixolydian/parent-major tiebreak (independent block — bestKey may have changed above)
  if (getKeyMode(bestKey) === 'mixolydian') {
    const parentMajor = getRelativeMajor(bestKey);
    if (parentMajor && KEYS[parentMajor] && (scores.get(parentMajor) ?? 0) === maxScore) {
      bestKey = breakMixolydianMajorTie(bestKey, parentMajor, chords);
    }
  } else if (getKeyMode(bestKey) === 'major') {
    for (const [key, score] of scores) {
      if (
        getKeyMode(key) === 'mixolydian' &&
        getRelativeMajor(key) === bestKey &&
        score === maxScore
      ) {
        bestKey = breakMixolydianMajorTie(key, bestKey, chords);
        break;
      }
    }
  }

  // Ending-key-wins: if the progression ends with a V7→tonic cadence into a candidate
  // key that scored within 1 point of the best, prefer that cadence key. This handles
  // progressions that modulate mid-section and resolve to a new tonic at the end.
  if (chords.length >= 2) {
    const lastChord = chords[chords.length - 1];
    const penultimateChord = chords[chords.length - 2];
    if (
      (lastChord.quality === 'major' || lastChord.quality === 'minor') &&
      penultimateChord.quality === 'dominant7'
    ) {
      let lastPC: number;
      let penultimatePC: number;
      try {
        lastPC = rootToPitchClass(lastChord.root);
        penultimatePC = rootToPitchClass(penultimateChord.root);
      } catch {
        return bestKey;
      }
      // Enharmonic pairs already resolved above — skip them here
      const enharmonicOfBest =
        bestKey === 'F#'
          ? 'Gb'
          : bestKey === 'Gb'
            ? 'F#'
            : bestKey === 'G#m'
              ? 'Abm'
              : bestKey === 'Abm'
                ? 'G#m'
                : bestKey === 'D#m'
                  ? 'Ebm'
                  : bestKey === 'Ebm'
                    ? 'D#m'
                    : null;
      for (const [key, score] of scores) {
        if (key === bestKey) continue;
        if (key === enharmonicOfBest) continue;
        // Only apply ending-key-wins to major and minor keys; modal keys have their own tiebreakers
        if (getKeyMode(key) !== 'major' && getKeyMode(key) !== 'minor') continue;
        const keyRoot = getKeyRoot(key);
        let keyRootPC: number;
        try {
          keyRootPC = rootToPitchClass(keyRoot);
        } catch {
          continue;
        }
        // Verify it's an authentic cadence: penultimate is V7 of this candidate key
        const expectedV7PC = (keyRootPC + 7) % 12;
        if (keyRootPC === lastPC && penultimatePC === expectedV7PC && maxScore - score <= 1) {
          const keyIsMinor = getKeyMode(key) === 'minor';
          const lastIsMinor = lastChord.quality === 'minor';
          if (keyIsMinor === lastIsMinor) {
            bestKey = key;
            break;
          }
        }
      }
    }
  }

  return bestKey;
}
