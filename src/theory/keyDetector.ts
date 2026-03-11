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

export function detectKey(chords: Chord[]): string | null {
  let maxScore = 0;
  let bestKey: string | null = null;

  for (const key of Object.keys(KEYS)) {
    const pcToQuality = buildKeyScoreMap(key);

    let score = 0;
    for (const chord of chords) {
      const pc = rootToPitchClass(chord.root);
      if (pcToQuality.has(pc)) {
        score += 1; // diatonic root
        const expectedQuality = pcToQuality.get(pc)!;
        if (qualityMatches(chord.quality, expectedQuality)) {
          score += 1; // quality bonus
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestKey = key;
    }
  }

  return maxScore === 0 ? null : bestKey;
}
