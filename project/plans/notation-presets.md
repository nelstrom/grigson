# Plan: Notation Preset System

## Context

The documentation claims the text renderer supports notation presets (`jazz`, `pop`, `symbolic`), but this is only partially implemented — the text renderer has a limited ad-hoc preset mechanism covering only `minor`, `dominant7`, and `halfDim` qualities, with `diminished`, `maj7`, `min7`, `dim7`, and `dom7flat5` hardcoded. The HTML renderer has no preset support at all (Unicode symbols hardcoded). There is no way for users to define their own presets.

The goal is to replace both with a proper, extensible preset system: a single `default` preset, a global registry for named presets, and inline object support in config. Both the HTML and text renderers are wired to this system.

## Decisions

- **Partial presets** — inherit from `default` as base; only override what differs
- **Shared `<sup>`/`<sub>` format** — works in HTML natively; text renderer strips tags; SVG renderer interprets structurally (future)
- **Both inline and named** — `preset: 'myPreset'` (name) or `preset: { minor: '-' }` (inline object)
- **Global singleton registry** — `registerPreset('name', {...})` called once; any custom element on the page can use the name
- **Registry at `grigson/presets`** sub-path export — keeps main entry lean
- **CLI** — add `--notation-preset-file <path>` flag that reads a JSON file as `Partial<NotationPreset>`
- **Preset schema keys = parser's `Quality` enum names exactly** — no extra mapping layer
- **Accidentals in preset** — `flat` and `sharp` fields control root-note rendering (e.g. `♭` vs `b`)
- **Remove `jazz`/`pop`/`symbolic`** — replaced by single `default` preset

---

## Implementation

### 1. New file: `src/notation/preset.ts`

Define the `NotationPreset` interface (keys = `Quality` enum + `flat`/`sharp`) and the `DEFAULT_PRESET`:

```typescript
export interface NotationPreset {
  major: string;
  minor: string;
  dominant7: string;
  halfDiminished: string;
  diminished: string;
  maj7: string;
  min7: string;
  dim7: string;
  dom7flat5: string;
  flat: string;
  sharp: string;
}

export const DEFAULT_PRESET: NotationPreset = {
  major: '',
  minor: 'm',
  dominant7: '7',
  halfDiminished: 'ø',
  diminished: '°',
  maj7: '△',
  min7: 'm7',
  dim7: '°7',
  dom7flat5: '7♭5',
  flat: '♭',
  sharp: '♯',
};
```

### 2. New file: `src/notation/registry.ts`

Global singleton registry. Built-in `default` is pre-registered.

```typescript
import { NotationPreset, DEFAULT_PRESET } from './preset.js';

const registry = new Map<string, NotationPreset>([['default', DEFAULT_PRESET]]);

export function registerPreset(name: string, preset: Partial<NotationPreset>): void {
  registry.set(name, { ...DEFAULT_PRESET, ...preset });
}

export function resolvePreset(
  nameOrPreset: string | Partial<NotationPreset> | undefined
): NotationPreset {
  if (!nameOrPreset) return DEFAULT_PRESET;
  if (typeof nameOrPreset === 'string') {
    const found = registry.get(nameOrPreset);
    if (!found) throw new Error(`Unknown notation preset: "${nameOrPreset}"`);
    return found;
  }
  return { ...DEFAULT_PRESET, ...nameOrPreset };
}
```

### 3. New file: `src/notation/index.ts`

```typescript
export { registerPreset, resolvePreset } from './registry.js';
export type { NotationPreset } from './preset.js';
export { DEFAULT_PRESET } from './preset.js';
```

### 4. Update `package.json`

Add an `exports` field to expose `grigson/presets`:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  },
  "./presets": {
    "types": "./dist/notation/index.d.ts",
    "default": "./dist/notation/index.js"
  }
}
```

### 5. Update `src/renderers/text.ts`

- Update `TextRendererConfig.notation` type: `preset?: string | Partial<NotationPreset>` (remove old `minor`, `dominant7`, `halfDim` fields)
- Remove `DEFAULT_NOTATION` and `PRESETS` constants
- In `renderChord()`: call `resolvePreset(config.notation?.preset)`, then use a helper `stripTags(value: string)` (regex `/<[^>]+>/g` → `''`) to strip any HTML before producing text output
- Replace the switch statement hardcodes — all qualities now read from the resolved preset

Key change to `renderChord`:

```typescript
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

function renderChord(chord: Chord, config: TextRendererConfig): string {
  const preset = resolvePreset(config.notation?.preset);
  const root = chord.root
    .replace(/b/g, stripTags(preset.flat))
    .replace(/#/g, stripTags(preset.sharp));
  const suffix = stripTags(preset[chord.quality]);
  return root + suffix + (chord.bass ? '/' + chord.bass : '');
}
```

> Note: root accidental substitution in text renderer should only replace trailing accidentals, not letters in note names. Bb → root `B` + accidental from root string. Need to handle this carefully — the root from the parser is always `[A-G]` followed by optional `b` or `#`.

### 6. Update `src/renderers/html.ts`

- Import `resolvePreset`, `NotationPreset` from `../notation/registry.js`
- Update `HtmlRenderer` to accept `TextRendererConfig` (already does via import)
- In chord rendering: use `preset[chord.quality]` as the suffix HTML (inserted directly — it may contain `<sup>` tags)
- In root rendering: split root into letter + accidental, render accidental using `preset.flat` or `preset.sharp`

The existing `QUALITY_CHARS` width estimation map may need updating if quality suffixes change length due to presets — a follow-up concern.

### 7. Update `src/renderers/html-element.ts`

No functional changes needed — it already passes `notation-preset` string to `HtmlRenderer` config. The config type change in step 5 means the attribute value will now resolve via the global registry when the renderer calls `resolvePreset()`.

### 8. Update `src/html-renderer-cli.ts`

Add `--notation-preset-file <path>` flag:

```typescript
import { readFileSync } from 'node:fs';

// In minimist options:
string: ['notation-preset', 'notation-preset-file'],

// In config building:
const presetFile = parsed['notation-preset-file'] as string | undefined;
if (presetFile) {
  config.notation = { preset: JSON.parse(readFileSync(presetFile, 'utf8')) };
} else if (preset) {
  config.notation = { preset };
}
```

Update the help string accordingly.

### Security note: XSS from preset values

Preset values containing `<sup>`/`<sub>` are interpolated directly into the HTML output string. A malicious preset (e.g. `{ dominant7: "<script>alert('xss')</script>" }`) would be injected into the DOM.

**In scope for this task:**

- Add a test asserting that a preset value containing `<script>` tags passes through into the rendered HTML string unchanged (documenting the current unsafe behavior), with a `// TODO: sanitize preset values using DOMPurify or the HTML Sanitizer API` comment

**Out of scope (noted for follow-up):**

- Adding DOMPurify as a dependency — defer until a sanitization pass is done properly
- The HTML Sanitizer API (`element.setHTML()`) is the eventual target once browser support is sufficient

---

## Critical files

| File                                         | Change                                             |
| -------------------------------------------- | -------------------------------------------------- |
| `packages/grigson/src/notation/preset.ts`    | **New** — `NotationPreset` type + `DEFAULT_PRESET` |
| `packages/grigson/src/notation/registry.ts`  | **New** — `registerPreset`, `resolvePreset`        |
| `packages/grigson/src/notation/index.ts`     | **New** — sub-path entry point                     |
| `packages/grigson/package.json`              | Add `exports` field                                |
| `packages/grigson/src/renderers/text.ts`     | Unify onto new preset system; strip HTML tags      |
| `packages/grigson/src/renderers/html.ts`     | Wire chord/accidental rendering to preset          |
| `packages/grigson/src/html-renderer-cli.ts`  | Add `--notation-preset-file` flag                  |
| `packages/grigson/documentation/renderer.md` | Update notation preset docs                        |

---

## Verification

1. `pnpm build && pnpm test` — existing tests pass
2. Manually confirm: `import { registerPreset } from 'grigson/presets'` resolves
3. Test HTML renderer: custom preset `{ minor: '-' }` passed inline renders `C-` not `Cm`
4. Test text renderer: preset value `<sup>7</sup>` strips to `7` in text output
5. Test CLI: `--notation-preset-file ./my-preset.json` loads and applies correctly
6. Test global registry: `registerPreset('test', { minor: '-' })` then `<grigson-html-renderer notation-preset="test">` uses it
