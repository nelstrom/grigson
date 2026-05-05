# Grigson

A plain-text format for writing chord charts, named after Lionel Grigson, author of _The Jazz Chord Book_.

Grigson source files use the `.chart` extension and look like this:

```
---
title: "Blues in F"
key: F
feel: "swing"
---

[Head]
||: (4/4) F7 | % | % | % |
| Bb7 | % | F7 | % |
| C7 | Bb7 | F7 | C7 :||
```

The format is designed so that the source closely resembles the rendered output, and so that the form of a song (AABA, verse/chorus, 12-bar, etc.) is apparent at a glance.

---

## Packages

This is a pnpm monorepo. Each package lives under `packages/`.

| Package                                                                                       | Description                                                                   |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`grigson`](packages/grigson/README.md)                                                       | Core library: parser, normaliser, transposer, renderer, and CLI               |
| [`grigson-grille-harmonique-renderer`](packages/grigson-grille-harmonique-renderer/README.md) | Grille harmonique (French jazz chord grid) renderer                           |
| [`eleventy-plugin-grigson`](packages/eleventy-plugin-grigson/README.md)                       | Eleventy plugin: build-time chart rendering via Declarative Shadow DOM        |
| [`grigson-fonts`](packages/grigson-fonts/README.md)                                           | Versioned WOFF2 font subsets served via jsDelivr for the CDN browser builds   |
| [`language-server`](packages/language-server/README.md)                                       | Standalone LSP server for `.chart` files                                      |
| [`textmate-grammar`](packages/textmate-grammar/README.md)                                     | TextMate grammar (`source.grigson`) shared by the VS Code extension and Shiki |
| [`tree-sitter-grammar`](packages/tree-sitter-grammar/README.md)                               | Tree-sitter grammar for structural highlighting and text objects              |
| [`vscode-extension`](packages/vscode-extension/README.md)                                     | VS Code extension: syntax highlighting and LSP client                         |
| [`website`](packages/website/README.md)                                                       | Eleventy documentation site with interactive playground                       |

---

## Getting started

```sh
# Install all workspace dependencies
pnpm install

# Build every package (in dependency order, with caching)
pnpm build
```

Builds are orchestrated by [Turborepo](https://turbo.build). Packages are built in dependency order — `grigson` first, then `language-server` and `website` in parallel, then `vscode-extension`. Unchanged packages are skipped on subsequent runs thanks to Turbo's local cache.

To rebuild continuously while developing:

```sh
pnpm turbo watch build
```

This re-runs only the affected package(s) and their dependents whenever a source file changes.

## Developing the website

```sh
# Terminal 1 — rebuild grigson whenever its source changes
pnpm turbo watch build --filter=grigson

# Terminal 2 — serve the website with live reload
pnpm --filter grigson-website serve
```

Eleventy watches `packages/grigson/dist/` for changes, so when Turbo rebuilds the library the site rebuilds automatically and the browser live-reloads. No server restart needed.

---

## Using the VS Code extension (developer install)

The extension is not yet published to the VS Code Marketplace. There are two ways to load it locally.

### Option 1 — Extension Development Host (quickest)

This is the standard way to run an extension from source during development. It launches a second VS Code window with the extension loaded.

1. Open the `packages/vscode-extension` directory in VS Code:
   ```sh
   code packages/vscode-extension
   ```
2. Press `F5` (or **Run → Start Debugging**).
3. A new **Extension Development Host** window opens with the extension active.
4. Open any `.chart` file in that window. You should see syntax highlighting and, if the language server is built, live diagnostics.

To rebuild after making changes: stop the host (`Shift+F5`), run `pnpm build` from the repo root, and press `F5` again.

### Option 2 — Install from VSIX

Package the extension into a `.vsix` file and install it permanently into your VS Code.

**Prerequisites:** `@vscode/vsce` — install it once with `npm install -g @vscode/vsce`.

```sh
# Build all packages (grigson → language-server → extension, in order)
pnpm build

# Package into a .vsix
cd packages/vscode-extension
vsce package
# → produces vscode-grigson-0.1.0.vsix

# Install into VS Code
code --install-extension vscode-grigson-0.1.0.vsix
```

After installing, reload VS Code (`Cmd+Shift+P` → **Developer: Reload Window**). The extension activates automatically when you open a `.chart` file.

> **Note on the language server path:** the extension resolves the language server from
> `packages/language-server/dist/server.js` relative to the extension directory. When
> installing via VSIX you must keep the monorepo layout intact, or copy `server.js` into
> the extension directory before packaging.

---

## Repository layout

```
packages/
  grigson/                 Core library and CLI
    src/
      parser/              Peggy grammar, generated parser, AST types
      renderers/           TextRenderer, HtmlRenderer
      theory/              Key detection, normalisation, transposition, harmonic analysis
      cli.ts               Entry point for the `grigson` command
      validator.ts         Pure validate(source) → Diagnostic[] function
    documentation/         Full format reference and API docs
    dist/                  Built output (gitignored)

  language-server/         LSP server
    src/server.ts
    dist/                  Built output (gitignored)

  textmate-grammar/        Shared TextMate grammar file
    grigson.tmLanguage.json

  tree-sitter-grammar/     Tree-sitter grammar
    grammar.js             Grammar definition (source of truth)
    src/                   Generated C parser and metadata (committed)
    queries/               Highlight queries

  vscode-extension/        VS Code extension
    src/extension.ts       LSP client activation
    syntaxes/              Copy of the TextMate grammar
    dist/                  Built output (gitignored)

  grigson-fonts/           Versioned WOFF2 font subsets (for jsDelivr CDN builds)
    fonts/                 Subset WOFF2 files, written by gen-* scripts

  eleventy-plugin-grigson/ Eleventy plugin for build-time DSD rendering
    src/index.ts           Plugin function and transform logic
    dist/                  Built output (gitignored)

  website/                 Eleventy documentation site
    content/               Markdown source pages
    _includes/             Nunjucks layout templates
    _site/                 Built output (gitignored)

project/
  prd.json                 Product requirements (task list)
  progress.txt             Implementation log
  plans/                   Design documents
```

---

## Further reading

- [Format reference](packages/grigson/documentation/README.md) — the `.chart` file format in full
- [CLI reference](packages/grigson/documentation/cli.md) — `grigson` subcommands and options
- [Key detection](packages/grigson/documentation/key-detection.md) — how `detectKey` works
- [Harmonic analysis](packages/grigson/documentation/harmonic-analysis.md) — 2-5-1 and borrowed chord detection
- [Language server](packages/language-server/README.md) — editor setup for Neovim, Helix, and Emacs
- [Tree-sitter grammar](packages/tree-sitter-grammar/README.md) — syntax highlighting and editor integration
