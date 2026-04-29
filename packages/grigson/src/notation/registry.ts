import { type NotationPreset, DEFAULT_PRESET, REALBOOK_PRESET } from './preset.js';
export type { NotationPreset };

const registry = new Map<string, NotationPreset>([
  ['default', DEFAULT_PRESET],
  ['realbook', REALBOOK_PRESET],
]);

/**
 * Register a named notation preset.
 *
 * Fields not specified in `preset` fall back to `DEFAULT_PRESET`.
 * Once registered, the preset can be referenced by name wherever a
 * `notation-preset` attribute or option is accepted.
 *
 * @param name - Identifier used to reference the preset (e.g. `"realbook"`).
 * @param preset - Partial set of {@link NotationPreset} fields to override.
 */
export function definePreset(name: string, preset: Partial<NotationPreset>): void {
  registry.set(name, { ...DEFAULT_PRESET, ...preset });
}

/**
 * Resolve a notation preset to a complete `NotationPreset` object.
 *
 * - `undefined` → returns `DEFAULT_PRESET`
 * - string → looks up a registered preset by name (throws if unknown)
 * - partial object → merges with `DEFAULT_PRESET`
 *
 * @param nameOrPreset - Preset name, partial preset object, or `undefined`.
 */
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
