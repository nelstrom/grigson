import { KEYS, getKeyMode, getKeyRoot } from './keys.js';
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

const DORIAN_DEGREE_QUALITY_SETS: Set<Quality>[] = [
  new Set<Quality>(['minor', 'min7']), // i
  new Set<Quality>(['minor', 'min7']), // ii
  new Set<Quality>(['major', 'maj7']), // bIII
  new Set<Quality>(['major', 'maj7']), // IV (dominant7 excluded: would alias major-key V7)
  new Set<Quality>(['minor', 'min7']), // v
  new Set<Quality>(['diminished', 'halfDiminished']), // vi°
  new Set<Quality>(['major', 'maj7']), // bVII (dominant7 excluded: would alias major-key V7)
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
  const sharpCount = chords.filter((c) => c.root === 'G#' || c.root === 'A#' || c.root === 'D#')
    .length;
  const flatCount = chords.filter((c) => c.root === 'Ab' || c.root === 'Bb' || c.root === 'Eb')
    .length;
  if (sharpCount > flatCount) return 'G#m';
  return 'Abm';
}

function breakDSharpEbTie(chords: Chord[]): string {
  // Count sharp-side spellings (D#, A#, G#) vs flat-side spellings (Eb, Bb, Ab)
  const sharpCount = chords.filter((c) => c.root === 'D#' || c.root === 'A#' || c.root === 'G#')
    .length;
  const flatCount = chords.filter((c) => c.root === 'Eb' || c.root === 'Bb' || c.root === 'Ab')
    .length;
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

  // If the relative major/minor is within 1 point, apply explicit tiebreaking
  // Dorian keys have a relative major but the tiebreak logic is not yet implemented for dorian;
  // skip tiebreaking when either key is dorian to avoid misclassifying dorian as its relative major.
  const relative = KEYS[bestKey]?.relative;
  if (relative && KEYS[relative] && getKeyMode(bestKey) !== 'dorian' && getKeyMode(relative) !== 'dorian') {
    const relativeScore = scores.get(relative) ?? 0;
    if (Math.abs(maxScore - relativeScore) <= 1) {
      const isMinor = getKeyMode(bestKey) === 'minor';
      const major = isMinor ? relative : bestKey;
      const minor = isMinor ? bestKey : relative;
      bestKey = breakRelativeTie(major, minor, chords);
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
        const keyRoot = getKeyRoot(key);
        let keyRootPC: number;
        try {
          keyRootPC = rootToPitchClass(keyRoot);
        } catch {
          continue;
        }
        // Verify it's an authentic cadence: penultimate is V7 of this candidate key
        const expectedV7PC = (keyRootPC + 7) % 12;
        if (
          keyRootPC === lastPC &&
          penultimatePC === expectedV7PC &&
          maxScore - score <= 1
        ) {
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
