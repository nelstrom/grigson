# Plan: Show validator diagnostics in playground Monaco editor

## Context

The playground at `/playground/` uses Monaco Editor with a custom Monarch tokenizer for syntax highlighting. A `validate()` function exists in `packages/grigson/src/validator.ts` that returns structured diagnostics (errors and warnings) with LSP-compatible ranges. However, `validate` is not exported from the browser bundle (`index.browser.ts`), and the playground does not call it. Monaco supports inline squiggles via `monaco.editor.setModelMarkers()` — wiring these two together gives users real-time feedback about parse errors and beat-balance warnings.

## Changes

### 1. Export `validate` from the browser bundle

**File**: `packages/grigson/src/index.browser.ts`

Add:
```ts
export { validate } from './validator.js';
export type { Diagnostic, DiagnosticRange } from './validator.js';
```

The validator has no Node.js-specific imports (only `parseSong` and parser types), so it is safe to include in the browser build. After rebuilding, `window.grigson.validate` will be available in the IIFE bundle.

### 2. Wire validator into the playground's `update()` function

**File**: `packages/website/content/playground.njk`

Inside the `update()` function (after setting `template.innerHTML`), add:

```js
const diagnostics = window.grigson.validate(value);
monaco.editor.setModelMarkers(editor.getModel(), 'grigson', diagnostics.map(d => ({
  startLineNumber: d.range.start.line + 1,
  startColumn:     d.range.start.character + 1,
  endLineNumber:   d.range.end.line + 1,
  endColumn:       d.range.end.character + 1,
  severity:        d.severity === 'error'
                     ? monaco.MarkerSeverity.Error
                     : monaco.MarkerSeverity.Warning,
  message:         d.message,
})));
```

Note: Diagnostics use 0-indexed LSP convention; Monaco markers use 1-indexed line numbers and 1-indexed column numbers.

## Critical files

- `packages/grigson/src/index.browser.ts` — browser bundle entry point
- `packages/grigson/src/validator.ts` — `validate()` implementation (read-only reference)
- `packages/website/content/playground.njk` — playground page with Monaco setup

## Verification

1. `pnpm build` from repo root to rebuild the grigson browser bundle
2. Start the website dev server
3. Open `/playground/` and type an invalid chart (e.g. remove a closing `|`) — red squiggle should appear on the offending line
4. Type a bar with dot slots that don't match the time signature — yellow squiggle (warning) should appear
5. Fix the error — squiggles should disappear
