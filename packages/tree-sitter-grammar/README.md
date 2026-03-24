# tree-sitter-grigson

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for the Grigson `.chart` format.

## What tree-sitter provides vs the LSP

| Capability                               | tree-sitter                          | LSP |
| ---------------------------------------- | ------------------------------------ | --- |
| Syntax highlighting                      | ✓ (structural, via `highlights.scm`) | —   |
| Text objects (select a bar, a row, etc.) | ✓                                    | —   |
| Error tolerance (partial parses)         | ✓                                    | —   |
| Diagnostics (squiggly underlines)        | —                                    | ✓   |
| Hover / other language features          | —                                    | ✓   |

Both can be active at the same time. tree-sitter handles colouring and structural navigation; the LSP handles diagnostics. See [`packages/language-server`](../language-server/README.md) for LSP setup.

## Package structure

```
grammar.js          # Grammar definition (source of truth)
src/
  parser.c          # Generated C parser (committed — no build needed)
  grammar.json      # Generated grammar metadata
  node-types.json   # Generated node type definitions
test/corpus/        # Tree-sitter corpus tests
queries/            # Highlight queries (highlights.scm)
```

The generated `src/parser.c` is committed to the repository so consumers do not need `tree-sitter-cli` installed to use the grammar.

## Regenerating the parser

If you modify `grammar.js`, regenerate the parser with:

```sh
pnpm --filter tree-sitter-grigson generate
```

Running `pnpm install` from the workspace root downloads the `tree-sitter-cli` binary automatically via its postinstall script.

## Running corpus tests

```sh
pnpm --filter tree-sitter-grigson test
```

Corpus tests live in `test/corpus/`.

## Editor integration

### Neovim

#### Path A: nvim-treesitter (after upstream acceptance)

Once a `tree-sitter-grigson` PR is merged into [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter), installation is:

```vim
:TSInstall grigson
```

You also need to tell Neovim to treat `.chart` files as `grigson`:

```lua
vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
  pattern = "*.chart",
  callback = function()
    vim.bo.filetype = "grigson"
  end,
})
```

Place `highlights.scm` (from `queries/highlights.scm` in this package) in:

```
~/.local/share/nvim/lazy/nvim-treesitter/queries/grigson/highlights.scm
```

(Adjust the path if you use a different plugin manager.)

#### Path B: manual registration (before upstream acceptance)

Use this approach to load the grammar directly from the monorepo without waiting for an nvim-treesitter PR.

**1. Build the grammar:**

```sh
cd packages/tree-sitter-grammar
pnpm build   # produces grammar.dylib / grammar.so
```

**2. Register the parser in `init.lua`:**

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()

parser_config.grigson = {
  install_info = {
    url = "/path/to/grigson/packages/tree-sitter-grammar",  -- absolute path to this package
    files = { "src/parser.c" },
    branch = "main",
    generate_requires_npm = false,
    requires_generate_from_grammar = false,
  },
  filetype = "grigson",
}

vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
  pattern = "*.chart",
  callback = function()
    vim.bo.filetype = "grigson"
  end,
})
```

**3. Install and place highlights:**

```vim
:TSInstall grigson
```

Then copy or symlink `highlights.scm` into the Neovim runtime:

```sh
mkdir -p ~/.local/share/nvim/lazy/nvim-treesitter/queries/grigson
cp /path/to/grigson/packages/tree-sitter-grammar/queries/highlights.scm \
   ~/.local/share/nvim/lazy/nvim-treesitter/queries/grigson/highlights.scm
```

**4. Verify:**

Open a `.chart` file and run `:TSBufInfo` — you should see `grigson` listed as the active parser.

### Helix

Add the following to `~/.config/helix/languages.toml`:

```toml
[[grammar]]
name = "grigson"
source = { path = "/path/to/grigson/packages/tree-sitter-grammar" }

[[language]]
name = "grigson"
scope = "source.grigson"
file-types = ["chart"]
roots = []
grammar = "grigson"
```

Then build the grammar:

```sh
hx --grammar build
```

Helix looks for `highlights.scm` at `runtime/queries/grigson/highlights.scm` inside the Helix runtime directory. Copy or symlink it:

```sh
mkdir -p ~/.config/helix/runtime/queries/grigson
cp /path/to/grigson/packages/tree-sitter-grammar/queries/highlights.scm \
   ~/.config/helix/runtime/queries/grigson/highlights.scm
```

Open a `.chart` file and run `:lang` — you should see `grigson` as the active language.

### Using both LSP and tree-sitter together

tree-sitter and the LSP run side-by-side in both Neovim and Helix with no special coordination. Configure tree-sitter as above, then follow the LSP setup in [`packages/language-server`](../language-server/README.md).
