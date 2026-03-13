import { KEYS } from './keys.js';
import { rootToPitchClass } from './pitchClass.js';
import type { Chord, Quality } from '../parser/types.js';

// Expected chord quality for each scale degree (null = no match possible with our Quality type)
const MAJOR_DEGREE_QUALITIES: (Quality | null)[] = [
  'major', // I
  'minor', // II
  'minor', // III
  'major', // IV
  'major', // V
  'minor', // VI
  'halfDiminished', // VII
];

const HARMONIC_MINOR_DEGREE_QUALITIES: (Quality | null)[] = [
  'minor', // I
  'halfDiminished', // II
  null, // III (augmented)
  'minor', // IV
  'major', // V
  'major', // VI
  null, // VII (diminished)
];

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const HARMONIC_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 11];

function buildKeyScoreMap(key: string): Map<number, Quality | null> {
  const isMinor = key.endsWith('m');
  const rootName = isMinor ? key.slice(0, -1) : key;
  const rootPC = rootToPitchClass(rootName);
  const intervals = isMinor ? HARMONIC_MINOR_INTERVALS : MAJOR_INTERVALS;
  const qualities = isMinor ? HARMONIC_MINOR_DEGREE_QUALITIES : MAJOR_DEGREE_QUALITIES;

  const map = new Map<number, Quality | null>();
  for (let i = 0; i < intervals.length; i++) {
    const pc = (rootPC + intervals[i]) % 12;
    map.set(pc, qualities[i]);
  }
  return map;
}

// Dominant7 is treated as major for quality matching (it's the V chord with an added 7th)
function qualityMatches(chordQuality: Quality, expected: Quality | null): boolean {
  if (expected === null) return false;
  if (chordQuality === expected) return true;
  if (chordQuality === 'dominant7' && expected === 'major') return true;
  return false;
}

function computeScore(key: string, chords: Chord[]): number {
  const pcToQuality = buildKeyScoreMap(key);
  let score = 0;
  for (const chord of chords) {
    let pc: number;
    try {
      pc = rootToPitchClass(chord.root);
    } catch {
      continue;
    }
    if (pcToQuality.has(pc)) {
      score += 1; // diatonic root
      const expectedQuality = pcToQuality.get(pc)!;
      if (qualityMatches(chord.quality, expectedQuality)) {
        score += 1; // quality bonus
      }
    }
  }
  return score;
}

// When a key and its relative major/minor are within 1 point, apply ordered tiebreakers.
function breakRelativeTie(major: string, minor: string, chords: Chord[]): string {
  const minorRootPC = rootToPitchClass(minor.slice(0, -1));
  const majorRootPC = rootToPitchClass(major);

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
      const currentBestPC = rootToPitchClass(bestKey.replace(/m$/, ''));
      const candidatePC = rootToPitchClass(key.replace(/m$/, ''));
      
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
  const relative = KEYS[bestKey]?.relative;
  if (relative && KEYS[relative]) {
    const relativeScore = scores.get(relative) ?? 0;
    if (Math.abs(maxScore - relativeScore) <= 1) {
      const isMinor = bestKey.endsWith('m');
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

  return bestKey;
}
