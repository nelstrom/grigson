# vscode-grigson

VS Code extension for Grigson `.chart` files. Provides syntax highlighting and live diagnostics via the Grigson language server.

## Features

- Syntax highlighting for front matter, barlines, chord roots, accidentals, and all quality suffixes
- Live parse error diagnostics: red squiggles, hover tooltips, Problems panel integration
- Powered by the [`grigson-language-server`](../language-server/README.md)

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

The extension is a thin LSP client. On activation (`onLanguage:grigson`), it spawns the language server at `packages/language-server/dist/server.js` via IPC and proxies LSP messages to VS Code. The server calls `validate()` from the `grigson` package on every file change and sends diagnostics back. No additional VS Code API calls are required — `connection.sendDiagnostics()` in the server drives all editor feedback.
