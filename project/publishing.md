# Publishing

## Current state

- GitHub repository: published
- Website: published to GitHub Pages
- `grigson` (npm): not yet published
- `vscode-grigson` (VS Marketplace): not yet published

## Package publishing targets

### `grigson` → npm

The core library. The most important publish — the renderers and language server all depend on it, and it's what integrators would `npm install`. **Publish this first.**

### `grigson-text-renderer` → npm

Custom element and CLI package. Depends on `grigson` being on npm first.

### `grigson-svg-renderer` → npm

Custom element and CLI package. Currently contains only a stub implementation, so may not be ready to publish yet.

### `grigson-language-server` → npm

LSP server with a `bin` entry — intended to be npm-installable so that editors (Neovim, Helix, Zed, etc.) can discover and run it. Depends on `grigson` being published first.

### `vscode-grigson` → Visual Studio Marketplace

Published via `vsce`, not npm. The `publisher` field is not yet set in `package.json` — that needs to be added before publishing.

### `tree-sitter-grigson` → npm

Tree-sitter grammars follow a strong convention of being published to npm under the `tree-sitter-*` name — editors like Neovim (nvim-treesitter), Helix, and Zed look for them there.

### `grigson-fonts` → no action needed

Consumed via jsDelivr/GitHub directly in CSS `@font-face` rules. There is no meaningful npm use case for font files.

### `grigson-textmate-grammar` → no action needed

Marked `private: true`. Used internally by the website and VS Code extension only.

### `grigson-font-explorer` → no action needed

Marked `private: true`. Internal development tool.

## Recommended publish order

Dependencies must be on npm before dependents can be published:

1. `grigson`
2. `grigson-text-renderer`, `grigson-svg-renderer`, `grigson-language-server`, `tree-sitter-grigson` (in any order)
3. `vscode-grigson`

## Git tag naming convention

The existing convention (established by `grigson-fonts`) is `<package-name>-v<semver>`. Use this for all packages:

| Package                   | Example tag                      |
| ------------------------- | -------------------------------- |
| `grigson-fonts`           | `grigson-fonts-v1.1.4`           |
| `grigson`                 | `grigson-v1.0.0`                 |
| `grigson-text-renderer`   | `grigson-text-renderer-v1.0.0`   |
| `grigson-svg-renderer`    | `grigson-svg-renderer-v1.0.0`    |
| `grigson-language-server` | `grigson-language-server-v1.0.0` |
| `tree-sitter-grigson`     | `tree-sitter-grigson-v1.0.0`     |
| `vscode-grigson`          | `vscode-grigson-v1.0.0`          |

Tags can be filtered by package with e.g. `git tag -l 'grigson-v*'`. There is also a bare `v1.0.0` tag from before this convention was established — leave it as-is.
