# Grigson Language Server

`grigson-language-server` is a standalone [Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/) server for `.chart` files. It provides real-time parse error diagnostics in any LSP-capable editor.

## Installation

```
npm install -g grigson-language-server
```

Or, in the monorepo:

```
pnpm build   # from packages/language-server/
```

The built server is at `packages/language-server/dist/server.js` with a `#!/usr/bin/env node` shebang.

## How it works

The server uses [`vscode-languageserver`](https://www.npmjs.com/package/vscode-languageserver) (which implements the open LSP standard, not VS Code-specific) and imports `validate()` from the `grigson` package.

On every `textDocument/didOpen` and `textDocument/didChange` event, the server:
1. Calls `validate(document.getText())`
2. Maps the resulting `Diagnostic[]` to LSP diagnostics
3. Sends them via `connection.sendDiagnostics()`

## Editor configuration

### VS Code

The `packages/vscode-extension` package activates automatically for `.chart` files (via `"activationEvents": ["onLanguage:grigson"]`) and spawns the language server as its LSP backend.

**Building the extension:**

```
cd packages/vscode-extension
pnpm install
pnpm build
```

This produces `packages/vscode-extension/dist/extension.js`. The extension uses `vscode-languageclient` to spawn `packages/language-server/dist/server.js` via IPC and proxy LSP messages to VS Code.

**What you get for free once active:**
- Red squiggly underlines under parse errors
- Hover tooltip showing the error message
- Problems panel (`Cmd+Shift+M`) listing all errors with clickable links

No additional VS Code API calls are needed — `connection.sendDiagnostics()` in the server drives all of this.

**Packaging for the VS Code Marketplace:**

When packaging the extension for distribution, the language server's built output must be bundled alongside it. Copy `packages/language-server/dist/server.js` into the extension before running `vsce package`.

### Neovim (nvim-lspconfig)

```lua
require('lspconfig').grigson.setup({
  cmd = { 'grigson-language-server', '--stdio' },
  filetypes = { 'grigson' },
  root_dir = function(fname)
    return require('lspconfig').util.find_git_ancestor(fname) or vim.loop.cwd()
  end,
})
```

### Helix (`~/.config/helix/languages.toml`)

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

### Emacs (eglot)

```elisp
(add-to-list 'eglot-server-programs
             '(grigson-mode . ("grigson-language-server" "--stdio")))
```

## Diagnostics

The server reports parse errors as LSP errors with:
- `range` — 0-indexed start/end position of the error
- `severity` — `Error` (1) for parse errors
- `message` — the Peggy parse error message
- `source` — `"grigson"`

Valid `.chart` files produce zero diagnostics.
