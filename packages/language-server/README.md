# grigson-language-server

A standalone [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) server for Grigson `.chart` files. Provides real-time parse error diagnostics in any LSP-capable editor.

## Install

```sh
npm install -g grigson-language-server
```

Or build from source (within the monorepo):

```sh
pnpm --filter grigson run build          # build the grigson library first
pnpm --filter grigson-language-server run build
# → packages/language-server/dist/server.js
```

## What it does

On every file open and every keystroke, the server calls `validate()` from the `grigson` package and sends the resulting diagnostics to the editor via `textDocument/publishDiagnostics`. Valid files produce zero diagnostics; parse errors appear as red squiggles with hover tooltips.

## Editor setup

### VS Code

Handled automatically by the `vscode-grigson` extension — no manual configuration needed. See [`packages/vscode-extension`](../vscode-extension/README.md).

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

For full details see [documentation/language-server.md](../grigson/documentation/language-server.md).
