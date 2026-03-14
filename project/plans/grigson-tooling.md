# Grigson Editor Tooling Plan

This plan covers five tasks that transform grigson from a parse-and-normalise library into a full editor tooling stack: inline error diagnostics, a CLI linter, a Language Server that works in VS Code, Neovim, Helix, Emacs, and any other LSP-capable editor, and a Tree-sitter grammar for native structural highlighting in Neovim and Helix.

## Background: why LSP, not ESLint

ESLint can technically be extended with a custom parser to handle non-JS files, but it is the wrong tool here. Its rule API, AST node types, and selector system are designed entirely around JavaScript. The grigson Peggy parser already produces a richer, domain-appropriate AST and already throws errors with precise line/column location data. Building on that is simpler and produces better results.

The correct foundation is the **Language Server Protocol (LSP)** — an open JSON-RPC standard originally from Microsoft that decouples editor tooling from editors. Any editor that implements LSP (VS Code, Neovim, Helix, Emacs/eglot, Zed, Sublime LSP) gets red squiggles and hover tooltips for free once a single language server exists.

## Current state

```
packages/
  grigson/                      parser, normaliser, transpiler, CLI
  textmate-grammar/             grigson.tmLanguage.json
  vscode-extension/             syntax highlighting only — no src/, no extension.ts
    package.json                contributes languages + grammars
    syntaxes/grigson.tmLanguage.json
    language-configuration.json
```

The VS Code extension currently provides syntax highlighting via the TextMate grammar but has no activation logic or LSP client. It has no `src/` directory.

## Target state

```
packages/
  grigson/
    src/
      validator.ts              NEW — pure: string → Diagnostic[]
      index.ts                  export validate + Diagnostic
  language-server/              NEW package
    package.json
    src/
      server.ts                 LSP server using vscode-languageserver
    dist/
      server.js                 built output
  tree-sitter-grammar/          NEW package
    package.json                name: "tree-sitter-grigson"
    grammar.js                  tree-sitter grammar DSL (source of truth)
    src/
      parser.c                  generated — committed to repo
      grammar.json              generated
      node-types.json           generated
    queries/
      highlights.scm            highlight queries for Neovim / Helix
    test/
      corpus/
        chords.txt              tree-sitter test cases
        frontmatter.txt
        sections.txt
  vscode-extension/
    package.json                add activationEvents, main, dependencies
    src/
      extension.ts              NEW — thin LSP client
    dist/
      extension.js              built output
    syntaxes/...                unchanged
```

---

## Task 1 — `validator-core`

### Goal

A pure function `validate(source: string): Diagnostic[]` in `packages/grigson/src/validator.ts`. No LSP dependency. Used by the CLI, the language server, and any future tooling (pre-commit hooks, GitHub Actions) via a single import.

### The `Diagnostic` interface

```typescript
// packages/grigson/src/validator.ts

export interface DiagnosticRange {
  start: { line: number; character: number }; // 0-indexed — LSP convention
  end:   { line: number; character: number };
}

export interface Diagnostic {
  range: DiagnosticRange;
  severity: 'error' | 'warning';
  message: string;
  source: 'grigson';
}
```

The range is 0-indexed (line 1 = line 0 in LSP). Peggy's thrown errors expose `.location.start.line` (1-indexed) and `.location.start.column` (1-indexed), so both values need `- 1` when mapping to `Diagnostic.range`.

### How Peggy exposes location

When the generated parser throws, the error object has a `location` property shaped like:

```typescript
{
  start: { offset: number; line: number; column: number };
  end:   { offset: number; line: number; column: number };
}
```

`offset` is a byte offset and is not needed. `line` and `column` are 1-indexed.

### Implementation sketch

```typescript
import { parseSong } from './parser/parser.js';

function zeroRange(): DiagnosticRange {
  return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
}

export function validate(source: string): Diagnostic[] {
  try {
    parseSong(source);
    return [];
  } catch (e: unknown) {
    if (isPeggyError(e)) {
      const { start, end } = e.location;
      return [{
        range: {
          start: { line: start.line - 1, character: start.column - 1 },
          end:   { line: end.line   - 1, character: end.column   - 1 },
        },
        severity: 'error',
        message: e.message,
        source: 'grigson',
      }];
    }
    return [{ range: zeroRange(), severity: 'error', message: String(e), source: 'grigson' }];
  }
}
```

`isPeggyError` is a type guard that checks for the `location` property.

### Exports

Export `validate` and `Diagnostic` from `packages/grigson/src/index.ts` so downstream packages can import them from `'grigson'`.

### Tests

- `validate('')` returns `[]` (empty file is valid)
- `validate('| C |')` returns `[]` (minimal valid chart)
- `validate('| Cm7 |')` (unsupported quality) returns one error with a non-empty message
- The returned error's `range.start.line` and `.character` are 0-indexed integers
- `validate('garbage')` returns one error (not zero, not multiple)

---

## Task 2 — `cli-validate`

### Goal

A `grigson validate` subcommand that validates one or more `.chart` files and exits with code 0 (no errors) or 1 (errors found). Suitable for CI pipelines and pre-commit hooks.

### Usage

```
grigson validate song.chart               # single file
grigson validate *.chart                  # multiple files — each gets own error list
grigson validate                          # no file argument — reads from stdin
grigson validate --format json song.chart # machine-readable output
```

### Text output (default)

Follows the standard Unix linter format that editors and CI tools recognise:

```
song.chart:3:7: error: Expected "|" or end of input but "Cm7" found.

Found 1 error in 2 files.
```

Format per diagnostic: `<file>:<line>:<character>: <severity>: <message>` — note 1-indexed in text output (the `Diagnostic` type uses 0-indexed internally; add 1 when printing).

### JSON output (`--format json`)

```json
[
  {
    "file": "song.chart",
    "line": 3,
    "character": 7,
    "severity": "error",
    "message": "Expected \"|\""
  }
]
```

Exit code 0 always when using `--format json` is not appropriate — keep the standard exit code semantics regardless of format.

### stdin handling

When invoked with no file argument, read all of stdin, call `validate()`, and report errors with `<stdin>` as the filename.

### Tests

All CLI tests should use the same subprocess-invocation pattern already used in `src/cli.test.ts` (spawn the built `dist/cli.js` and check stdout + exit code).

- `grigson validate` on a valid file exits 0
- `grigson validate` on a file with a parse error exits 1 and prints a message containing the filename and line number
- `grigson validate --format json` on a valid file exits 0 and prints `[]`
- `grigson validate --format json` on an invalid file exits 1 and prints valid JSON with at least one entry
- `grigson validate` with no file argument reads from stdin
- `grigson validate` on multiple files reports each file's errors separately

### Implementation notes

Add `runValidate()` alongside the existing `runNormalise()`, `runRender()`, and `runTranspose()` handlers in `packages/grigson/src/cli.ts`. Register `validate` in the subcommand dispatch and `--help` output.

---

## Task 3 — `language-server`

### Goal

A standalone Node.js process that speaks LSP over stdin/stdout. Any LSP-capable editor can use it. Depends on `validator-core` (Task 1).

### Package setup

```
packages/language-server/
  package.json          name: "grigson-language-server"; bin: "grigson-language-server"
  src/
    server.ts
  dist/
    server.js           ← built output with shebang
```

`package.json` `bin` field makes it installable globally:

```
npm install -g grigson-language-server
```

### Dependencies

- `vscode-languageserver` — implements LSP (despite the name, this is not VS Code-specific; it implements the open standard)
- `vscode-languageserver-textdocument` — document model
- `grigson` (workspace:*) — imports `validate()`

### Server implementation

```typescript
import {
  createConnection, TextDocuments, ProposedFeatures,
  InitializeResult, TextDocumentSyncKind, DiagnosticSeverity,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { validate } from 'grigson';

const connection = createConnection(ProposedFeatures.all);
const documents  = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
  },
}));

function validateDocument(document: TextDocument): void {
  const diagnostics = validate(document.getText()).map(d => ({
    range: d.range,
    severity: d.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    message: d.message,
    source: d.source,
  }));
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

documents.onDidChangeContent(change => validateDocument(change.document));
documents.onDidOpen(event => validateDocument(event.document));

documents.listen(connection);
connection.listen();
```

### Build

The compiled `dist/server.js` should have a `#!/usr/bin/env node` shebang and be marked executable. Use the same TypeScript build pipeline already in `packages/grigson/tsconfig.json` as a template.

### Non-VS Code editor configuration

Once the server is published, users configure their editor once:

**Neovim (nvim-lspconfig):**
```lua
require('lspconfig').grigson.setup({
  cmd = { 'grigson-language-server', '--stdio' },
  filetypes = { 'grigson' },
  root_dir = function(fname)
    return require('lspconfig').util.find_git_ancestor(fname) or vim.loop.cwd()
  end,
})
```

**Helix (`~/.config/helix/languages.toml`):**
```toml
[[language]]
name = "grigson"
scope = "source.grigson"
file-types = ["chart"]
language-servers = ["grigson-language-server"]

[language-server.grigson-language-server]
command = "grigson-language-server"
args = ["--stdio"]
```

**Emacs (eglot):**
```elisp
(add-to-list 'eglot-server-programs
             '(grigson-mode . ("grigson-language-server" "--stdio")))
```

---

## Task 4 — `vscode-extension-lsp`

### Goal

Extend the existing `packages/vscode-extension/` to activate as an LSP client that spawns the language server. The TextMate grammar (syntax highlighting) is unchanged. This task adds the inline error diagnostics layer on top.

### Changes to `packages/vscode-extension/package.json`

```json
{
  "activationEvents": ["onLanguage:grigson"],
  "main": "./dist/extension.js",
  "dependencies": {
    "vscode-languageclient": "^9.0.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.90.0",
    "typescript": "...",
    "@vscode/vsce": "..."
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "package": "vsce package"
  }
}
```

Add a `tsconfig.json` targeting `ES2020`, `module: Node16`, `outDir: dist`.

### `src/extension.ts`

```typescript
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import {
  LanguageClient, LanguageClientOptions,
  ServerOptions, TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join('..', 'language-server', 'dist', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run:   { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'grigson' }],
  };

  client = new LanguageClient('grigson', 'Grigson Language Server', serverOptions, clientOptions);
  context.subscriptions.push(client.start());
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
```

The `serverModule` path assumes the monorepo layout — the extension resolves the language server from the sibling `packages/language-server/dist/server.js`. When the extension is packaged for the VS Code Marketplace, the language server's built output must be bundled alongside it (either via `vsce`'s bundling or by copying `dist/server.js` into the extension before packaging).

### How VS Code diagnostic display works

Once the extension is active and the language server is running:
- On file open: server parses the document and sends diagnostics
- On every keystroke (incremental sync): server re-parses and updates diagnostics
- VS Code renders diagnostics as red squiggly underlines
- Hovering the squiggle shows the error message in a tooltip
- The Problems panel (`Cmd+Shift+M`) lists all diagnostics across open files with clickable links

No additional VS Code API calls are needed — `connection.sendDiagnostics()` in the server is the only thing required to drive all of this.

---

---

## Task 5 — `tree-sitter-grammar`

### Goal

A Tree-sitter grammar for `.chart` files in `packages/tree-sitter-grammar/`. Tree-sitter produces
a fast, error-tolerant, incremental parser from a grammar definition. Unlike the TextMate grammar
(which is regex-based and stateless), Tree-sitter builds a real syntax tree — enabling structural
highlighting, code folding, and text-object navigation in Neovim and Helix. This task is
independent of the LSP tasks; syntax highlighting via Tree-sitter and error diagnostics via LSP
complement each other.

### Why Tree-sitter, not just TextMate

| Feature | TextMate grammar | Tree-sitter grammar |
|---|---|---|
| Highlighting | Yes | Yes (richer) |
| Incremental parsing | No | Yes (fast on every keystroke) |
| Error tolerance | No | Yes (partial parse on broken input) |
| Structural text objects | No | Yes (`vit`, `vic` in Neovim) |
| Code folding | No | Yes |
| Editor support | VS Code, Helix | Neovim, Helix, Zed, GitHub |

Helix has _native_ Tree-sitter support and uses it for all highlighting. Neovim uses
`nvim-treesitter` to add Tree-sitter support. VS Code uses TextMate grammars, so the existing
`packages/textmate-grammar/` package remains the correct choice there.

### Package setup

```
packages/tree-sitter-grammar/
  package.json
  grammar.js
  src/
    parser.c          ← generated by `tree-sitter generate`; committed to repo so users
    grammar.json        don't need the tree-sitter CLI toolchain to install the grammar
    node-types.json
  queries/
    highlights.scm    ← the only file most users care about
  test/
    corpus/
      chords.txt
      frontmatter.txt
      sections.txt
```

**`package.json`:**
```json
{
  "name": "tree-sitter-grigson",
  "version": "1.0.0",
  "description": "Tree-sitter grammar for Grigson .chart files",
  "main": "bindings/node",
  "scripts": {
    "generate": "tree-sitter generate",
    "build": "tree-sitter generate",
    "test": "tree-sitter test"
  },
  "tree-sitter": [
    {
      "scope": "source.grigson",
      "file-types": ["chart"],
      "highlights": "queries/highlights.scm"
    }
  ],
  "devDependencies": {
    "tree-sitter-cli": "^0.22.0"
  }
}
```

The `tree-sitter` field in `package.json` is read by the tree-sitter CLI and by editors that
support the npm-based grammar discovery convention.

### `grammar.js`

The grammar mirrors the existing Peggy grammar in structure. Key decisions:

- **`extras`**: whitespace (spaces and tabs) is extra between tokens — tree-sitter handles it.
- **Immediate tokens**: chord root, accidental, and quality must be `token(...)` or `token.immediate(...)`
  to avoid whitespace being inserted between them (e.g., `C` and `m` must parse as `Cm`).
- **Conflict resolution**: tree-sitter may flag an ambiguity between the `b` accidental and a root
  note beginning `b`-named chords — resolve with `conflicts` or by using `token.immediate` for accidentals.

```javascript
module.exports = grammar({
  name: 'grigson',

  extras: $ => [/[ \t]/],

  rules: {
    song: $ => seq(
      optional($.frontmatter),
      repeat(choice($.section_label, $.row, /\r?\n/)),
    ),

    // --- Front matter ---
    frontmatter: $ => seq(
      $.frontmatter_delimiter,
      repeat($.frontmatter_field),
      $.frontmatter_delimiter,
    ),
    frontmatter_delimiter: $ => /---[ \t]*\r?\n/,
    frontmatter_field: $ => seq(
      field('key', $.identifier),
      ':',
      field('value', $.frontmatter_value),
      /\r?\n/,
    ),
    frontmatter_value: $ => choice(
      seq('"', /[^"\r\n]*/, '"'),
      /[^\r\n]+/,
    ),

    // --- Section label ---
    section_label: $ => seq(
      '[', field('name', $.section_name), ']', /\r?\n?/,
    ),
    section_name: $ => /[^\]\r\n]+/,

    // --- Row ---
    row: $ => seq('|', repeat1($.bar_tail), /\r?\n?/),
    bar_tail: $ => seq(
      optional($.time_signature),
      field('chord', $.chord),
      '|',
    ),

    // --- Time signature ---
    time_signature: $ => seq(
      '(', $.integer, '/', $.integer, ')',
    ),

    // --- Chord ---
    chord: $ => seq(
      field('root', $.note_letter),
      field('accidental', optional($.accidental)),
      field('quality', optional($.quality)),
    ),
    note_letter:  $ => /[A-G]/,
    accidental:   $ => token.immediate(/[#b]/),
    quality: $ => token.immediate(choice(
      'm7b5', 'maj7', 'M7', 'dim7', 'm7', 'dim', 'm', '7',
    )),

    // --- Primitives ---
    identifier: $ => /[a-zA-Z]+/,
    integer:    $ => /[0-9]+/,
  },
});
```

### `queries/highlights.scm`

Highlight queries map tree-sitter node types to semantic highlight names. Neovim's highlight
groups (`@keyword`, `@constant`, etc.) follow the tree-sitter standard naming convention:

```scheme
; Front matter
(frontmatter_delimiter) @punctuation.special
(frontmatter_field (identifier) @variable.member)
(frontmatter_value) @string

; Section labels
(section_label "[" @punctuation.bracket)
(section_label "]" @punctuation.bracket)
(section_label (section_name) @markup.heading)

; Barlines
"|" @punctuation.delimiter

; Time signatures
(time_signature "(" @punctuation.bracket)
(time_signature "/" @operator)
(time_signature ")" @punctuation.bracket)
(time_signature (integer) @number)

; Chords
(chord (note_letter) @constant)
(chord (accidental) @operator)
(chord (quality) @keyword)
```

### Test corpus format

Tree-sitter tests are plain text files in `test/corpus/`. Each test case uses a fixed separator format:

```
================================================================================
Simple chord row
================================================================================

| C | Am | F | G |

--------------------------------------------------------------------------------

(song
  (row
    (bar_tail (chord (note_letter) (quality)))
    (bar_tail (chord (note_letter)))
    (bar_tail (chord (note_letter)))
    (bar_tail (chord (note_letter)))))
```

Write corpus tests covering: frontmatter, section labels, all chord qualities, accidentals,
time signatures, multi-row songs, and error recovery (deliberately broken input).

Run with: `tree-sitter test`

### Build and commit workflow

The generated `src/parser.c` **must be committed** to the repository. Users and editors pull
the grammar directly from git and compile the C file locally with their system C compiler —
they should not need `tree-sitter-cli` installed. The `generate` script is for maintainers only
when `grammar.js` changes:

```
pnpm -C packages/tree-sitter-grammar generate
# then commit src/parser.c, src/grammar.json, src/node-types.json
```

Add `packages/tree-sitter-grammar/node_modules/` to `.gitignore`; do **not** add `src/parser.c`.

### Neovim integration

Neovim users install the grammar via `nvim-treesitter`. There are two paths:

**Path A — contribute to nvim-treesitter (recommended long-term):**
Open a PR to [nvim-treesitter/nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter)
adding `grigson` to the `parsers` directory. Once merged, users install with:
```vim
:TSInstall grigson
```
And set the filetype: `autocmd BufRead,BufNewFile *.chart set filetype=grigson`

**Path B — manual parser registration (available immediately):**
Users add this to their `init.lua` before `nvim-treesitter` is configured:

```lua
-- Register the grigson parser
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.grigson = {
  install_info = {
    url = "https://github.com/YOUR_ORG/tree-sitter-grigson", -- or local path
    files = { "src/parser.c" },
    branch = "main",
    generate_requires_npm = false,
    requires_generate_from_grammar = false,
  },
  filetype = "chart",
}

-- Point nvim-treesitter to the highlight queries
vim.treesitter.language.register("grigson", "chart")
```

Then copy (or symlink) `queries/highlights.scm` to
`~/.config/nvim/queries/grigson/highlights.scm` — or nvim-treesitter will pick them up
automatically from the install location.

### Helix integration

Helix has built-in tree-sitter support. Users add to `~/.config/helix/languages.toml`:

```toml
[[grammar]]
name = "grigson"
source = { git = "https://github.com/YOUR_ORG/tree-sitter-grigson", rev = "COMMIT_SHA" }

[[language]]
name = "grigson"
scope = "source.grigson"
file-types = ["chart"]
grammar = "grigson"
roots = []
comment-token = "#"
```

Then run `hx --grammar build` to compile the grammar.

### Relationship to the TextMate grammar

The TextMate grammar (`packages/textmate-grammar/`) and the Tree-sitter grammar
(`packages/tree-sitter-grammar/`) are parallel implementations of the same syntax:

| Package | Used by | Mechanism |
|---|---|---|
| `textmate-grammar` | VS Code, Shiki (website) | Regex pattern matching |
| `tree-sitter-grammar` | Neovim, Helix, Zed | Incremental LR parsing |

Both must be kept in sync when the `.chart` format evolves. When adding a new construct (e.g.,
time signatures), update `grammar.js` and `grammar.pegjs` (and rebuild both), then update
`grigson.tmLanguage.json` and `queries/highlights.scm`.

---

## How everything fits together

```
                   ┌─────────────────────────────┐
                   │  packages/grigson/           │
                   │  src/validator.ts            │  ← pure: string → Diagnostic[]
                   │  (no LSP dependency)         │
                   └──────────┬──────────────────┘
              ┌───────────────┼────────────────────┐
              ▼               ▼                    ▼
  ┌───────────────────┐  ┌──────────────┐  ┌──────────────────┐
  │ packages/         │  │ grigson      │  │ (future)         │
  │ language-server/  │  │ validate CLI │  │ pre-commit hook  │
  │ src/server.ts     │  │              │  │ GitHub Action    │
  └────────┬──────────┘  └──────────────┘  └──────────────────┘
           │
     ┌─────┴──────────────────────────┐
     ▼                                ▼
  packages/vscode-extension/       Neovim / Helix / Emacs / Zed
  src/extension.ts (LSP client)    (one-time per-editor config;
                                    no code changes needed)

  packages/tree-sitter-grammar/    (independently of LSP)
  grammar.js + queries/            Neovim (nvim-treesitter)
  highlights.scm                   Helix (built-in)
                                   Zed (built-in)
                                   GitHub code view
```

### Design principles

1. **`validator.ts` is the single source of truth** for what constitutes a valid `.chart` file. All tooling imports the same function.
2. **The language server has no VS Code dependency**. `vscode-languageserver` implements the open LSP standard; any editor can use it.
3. **The VS Code extension is a thin client**. It spawns the server and proxies LSP messages. All intelligence lives in the server.
4. **The CLI and LSP server are independent**. Either can be used without the other. CI pipelines use the CLI; editors use the LSP server.
5. **Tree-sitter and LSP are complementary, not competing**. Tree-sitter provides fast structural highlighting and text objects; LSP provides diagnostics, hover, and future completions. A Neovim user can use both simultaneously.
