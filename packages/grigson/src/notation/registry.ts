import { type NotationPreset, DEFAULT_PRESET } from './preset.js';
export type { NotationPreset };

const registry = new Map<string, NotationPreset>([['default', DEFAULT_PRESET]]);

export function definePreset(name: string, preset: Partial<NotationPreset>): void {
  registry.set(name, { ...DEFAULT_PRESET, ...preset });
}

export function resolvePreset(
  nameOrPreset: string | Partial<NotationPreset> | undefined,
): NotationPreset {
  if (!nameOrPreset) return DEFAULT_PRESET;
  if (typeof nameOrPreset === 'string') {
    const found = registry.get(nameOrPreset);
    if (!found) throw new Error(`Unknown notation preset: "${nameOrPreset}"`);
    return found;
  }
  return { ...DEFAULT_PRESET, ...nameOrPreset };
}
