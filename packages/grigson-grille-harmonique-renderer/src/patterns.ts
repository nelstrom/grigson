import type { Bar, TimeSignature } from 'grigson';

export type BarPattern = '1' | '2+2' | '3+1' | '1+3' | '2+1+1' | '1+2+1' | '1+1+2' | '1+1+1+1';

export function detectPattern(bar: Bar, activeTSig: TimeSignature): BarPattern {
  if (activeTSig.numerator !== 4 || activeTSig.denominator !== 4) {
    throw new Error(
      `Grille harmonique renderer only supports 4/4 time; got ${activeTSig.numerator}/${activeTSig.denominator}`,
    );
  }

  const chordCount = bar.slots.filter((s) => s.type === 'chord').length;
  const hasDots = bar.slots.some((s) => s.type === 'dot');
  const isEvenDivision = 4 % chordCount === 0;
  const rawBeatsPerChord = isEvenDivision ? 4 / chordCount : 1;

  const isProportional =
    isEvenDivision &&
    (!hasDots ||
      (() => {
        for (let i = 0; i < 4; i++) {
          const slot = bar.slots[i];
          const expectChord = i % rawBeatsPerChord === 0;
          const isChord = slot !== undefined && slot.type === 'chord';
          if (expectChord !== isChord) return false;
        }
        return true;
      })());

  if (isProportional) {
    if (chordCount === 1) return '1';
    if (chordCount === 2) return '2+2';
    if (chordCount === 4) return '1+1+1+1';
    throw new Error(`Unsupported chord count ${chordCount} for proportional 4/4 bar`);
  }

  // Normalize to 4 positions: 'C' for chord, '.' for dot/implicit
  const positions: string[] = [];
  for (let i = 0; i < 4; i++) {
    const slot = bar.slots[i];
    positions.push(slot !== undefined && slot.type === 'chord' ? 'C' : '.');
  }
  const pattern = positions.join('');

  switch (pattern) {
    case 'C...':
      return '1';
    case 'CC..':
      return '1+3';
    case 'C..C':
      return '3+1';
    case 'C.CC':
      return '2+1+1';
    case 'CC.C':
      return '1+2+1';
    case 'CCC.':
      return '1+1+2';
    case 'CCCC':
      return '1+1+1+1';
    default:
      throw new Error(`Unsupported bar slot pattern: ${pattern}`);
  }
}
