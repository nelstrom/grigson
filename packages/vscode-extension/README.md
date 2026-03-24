# vscode-grigson

VS Code extension for Grigson `.chart` files. Provides syntax highlighting and live diagnostics via the Grigson language server.

## Features

- Syntax highlighting for front matter, barlines, chord roots, accidentals, and all quality suffixes
- Live parse error diagnostics: red squiggles, hover tooltips, Problems panel integration
- Document formatting: normalises chord spellings to match the detected key (see below)
- Powered by the [`grigson-language-server`](../language-server/README.md)

## Formatting

The extension registers a document formatter for `.chart` files backed by `grigson normalise`. Invoking **Format Document** (`⇧⌥F` on macOS, `Shift+Alt+F` on Windows/Linux) parses the file, normalises chord spellings to match the detected key, and rewrites the document in place. If the file already matches the normalised form, the document is left unchanged.

The formatter is available via:

- **Format Document** in the command palette
- The right-click context menu → **Format Document**
- The **Format Document with…** picker (select _Grigson Language Server_)
- On save, if `editor.formatOnSave` is enabled in settings

No user configuration is required.

## Developer install

The extension is not yet published to the VS Code Marketplace. See the [root README](../../README.md#using-the-vs-code-extension-developer-install) for instructions on loading it via the Extension Development Host (`F5`) or by installing a `.vsix` file.

## Building

```sh
# Build the grigson library and language server first
pnpm --filter grigson run build
pnpm --filter grigson-language-server run build

# Build the extension
pnpm --filter vscode-grigson run build
# → dist/extension.js
```

## How it works

The extension is a thin LSP client. On activation (`onLanguage:grigson`), it spawns the language server at `packages/language-server/dist/server.js` via IPC and proxies LSP messages to VS Code. The server handles two capabilities:

- **Diagnostics** — calls `validate()` on every file change and sends parse errors via `textDocument/publishDiagnostics`.
- **Formatting** — handles `textDocument/formatting` by running `parseSong` → `normaliseSong` → `TextRenderer.render` and returning a single full-document `TextEdit`. Returns no edits if the file is unparseable or already normalised.

No additional VS Code API calls are required in the extension itself — everything flows through the LSP connection.
