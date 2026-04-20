# AST Explorer Page

## Context

Add an `/ast-explorer/` page to the grigson website — similar to astexplorer.net — where developers can paste or type a `.chart` file and explore the parse tree produced by the grigson parser. Hovering a node in the tree highlights its source range in the editor. The URL serialises editor content with LZ-String (same scheme as `/playground/`), so links to specific examples can be shared.

This requires extending the parser to attach source locations (`loc`) to every AST node, not just `Bar`.

---

## Decisions

| Concern          | Decision                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| URL path         | `/ast-explorer/`                                                                                               |
| URL state        | `#code/{lz-string}` — identical to playground                                                                  |
| Source locations | All nodes: `loc?: SourceRange` (enumerable) — `{ start, end }` each `{ line, character }` (0-based, LSP-style) |
| Tree view        | `json-formatter-js` — full raw JSON                                                                            |
| Hover behaviour  | Hover tree node → highlight source range in Monaco editor                                                      |
| Editor           | Monaco, same grigson language / theme setup as playground                                                      |
| Error state      | Clear tree, show parse error message                                                                           |
| Layout           | Editor left, tree right                                                                                        |
| Cross-link       | "View AST" link in playground toolbar                                                                          |
| Nav              | Add AST Explorer to base.njk nav                                                                               |

---

## Phase 1 — Parser changes (`packages/grigson`)

### 1.1 `src/parser/types.ts`

Add a new exported interface before all node types:

```ts
export interface SourceRange {
  start: { line: number; character: number };
  end:   { line: number; character: number };
}
```

Add `loc?: SourceRange` to: `FrontMatter`, `Chord`, `ChordSlot`, `DotSlot`, `Bar`, `Row`, `Section`, `Song`, `CommentLine`.

### 1.2 `src/parser/grammar.pegjs`

**Add a global initializer block** at the very top (before the first rule) with a `makeLoc` helper:

```js
{{
  function makeLoc(l) {
    return {
      start: { line: l.start.line - 1, character: l.start.column - 1 },
      end:   { line: l.end.line - 1,   character: l.end.column - 1   },
    };
  }
}}
```

**Per-rule changes** (add `loc: makeLoc(location())` to the returned object in each action):

- `Song` — add `loc` to the return literal
- `FrontMatter` — add `loc` to the return literal
- `Comment` — add `loc` to the return literal
- `SectionLabel` — add `loc` to the return literal (needed for section loc computation below)
- `Row` — add `loc` to the return literal
- `BarTail` (both alternatives) — replace the entire `Object.defineProperty(_sourceRange …)` block with a simple `bar.loc = makeLoc(location());`
- `Bar` (standalone start rule) — add `bar.loc = makeLoc(location());` before `return bar`
- `BeatSlot` — add `loc: makeLoc(location())` to both the `ChordSlot` and `DotSlot` return literals
- `Chord` — add `loc: makeLoc(location())` to the return literal

**Section loc in `SongBody` action** — track `sectionStartLoc` / `lastItemLoc` while iterating `items`; assign `loc: { start: sectionStartLoc.start, end: lastItemLoc.end }` when pushing each section.

### 1.3 Rebuild grammar

```bash
cd packages/grigson && pnpm run build:grammar
```

### 1.4 `src/validator.ts`

Replace the `barRange()` helper:

```ts
function barRange(bar: Bar): DiagnosticRange {
  return bar.loc ?? zeroRange();
}
```

Remove the `Object.getOwnPropertyDescriptor` call and the `PeggyLocation` / related types that are only used by the old `_sourceRange` approach (keep only what's still needed for the Peggy parse-error branch).

### 1.5 Test updates

`toEqual` assertions on AST nodes will fail once `loc` becomes an enumerable property. Update affected assertions to `toMatchObject` (checks a subset — extra `loc` property is ignored).

Key files: `parser.test.ts`, `beatSlot.test.ts`, `section.test.ts`, `simile.test.ts`, `examples.test.ts`.

### 1.6 Export `SourceRange`

Add `SourceRange` to the export lists in `src/index.ts` and `src/index.browser.ts`.

---

## Phase 2 — Website page (`packages/website`)

### 2.1 Add `json-formatter-js`

- Add `json-formatter-js` to `packages/website/package.json` devDependencies
- In `.eleventy.js` passthrough copy:
  ```js
  'node_modules/json-formatter-js/dist/json-formatter.min.js': 'js/json-formatter.min.js',
  'node_modules/json-formatter-js/dist/json-formatter.css':    'js/json-formatter.css',
  ```

### 2.2 Create `content/ast-explorer.njk`

Permalink: `/ast-explorer/`

**Layout** (two equal columns, same responsive breakpoint as playground):

```
┌────────────────────┬────────────────────┐
│  Monaco editor     │  AST tree          │
│  (.chart source)   │  (json-formatter)  │
└────────────────────┴────────────────────┘
```

**Scripts loaded** (in order, before the module script):

- `/js/lz-string.min.js`
- `/assets/js/grigson-monarch.js`
- `/js/monaco/vs/loader.js`
- `/js/json-formatter.min.js`
- `/js/json-formatter.css` (via `<link rel="stylesheet">`)

`grigson.iife.js` and `grigson-register.iife.js` are already loaded by `base.njk`, so `window.grigson` is available.

**Core JS logic** (inside `require(['vs/editor/editor.main'], …)`):

1. `readHash()` — same implementation as playground (decompress `#code/…`)
2. Monaco editor init — same language registration, theme, and options as playground
3. `update()`:
   - Call `grigson.parseSong(editor.getValue())`
   - On success: pass AST to `new JSONFormatter(ast, 2)`, replace tree panel content
   - After rendering: call `attachHoverHandlers(ast, treeEl)` (see below)
   - On failure: clear tree, show error message
4. `attachHoverHandlers(obj, containerEl)`:
   - Recursively walk `obj` in tandem with the rendered `.json-formatter-row` elements
   - For each object node that has a `loc` property, attach `mouseover` / `mouseout` handlers to its DOM element
   - `mouseover`: call `highlightRange(loc)` — uses `editor.deltaDecorations()` to add a highlight decoration spanning the loc's line/character range
   - `mouseout`: clear the decoration
5. `updateURL()` — debounced 500 ms, same LZ-String / `history.replaceState` pattern as playground
6. `editor.onDidChangeModelContent(update)`

### 2.3 Update `_includes/base.njk`

Add to nav:

```html
<a href="{{ '/ast-explorer/' | url }}">AST Explorer</a>
```

### 2.4 Update `content/playground.njk`

Add a "View AST" anchor in `#editor-toolbar`. It links to `/ast-explorer/` with the same hash, updated dynamically:

```js
const viewAstLink = document.getElementById('view-ast-link');
// inside updateURL():
viewAstLink.href = '/ast-explorer/#code/' + compressToEncodedURIComponent(editor.getValue());
```

---

## Verification

1. `pnpm build` from repo root — must succeed with no type errors
2. `pnpm test` from repo root — all tests must pass
3. Open `/ast-explorer/` in dev server
   - Default chart renders with full AST tree
   - Hover each node type (Song, Section, Row, Bar, ChordSlot, Chord, FrontMatter, CommentLine) → correct source range highlights in the editor
   - Hover a `loc` key/value itself → no crash
   - Type an invalid chart → tree clears, error message appears
   - Edit valid chart → tree updates in real-time
4. Copy URL, open in new tab → same content loaded
5. Open `/playground/` → "View AST" link present; clicking opens AST explorer with identical source
