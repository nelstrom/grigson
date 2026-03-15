# grigson

The core Grigson library: a parser, normaliser, transposer, renderer, and CLI for `.chart` files.

## Install

```sh
npm install grigson
# or
pnpm add grigson
```

## CLI

```sh
# Normalise enharmonic spellings
grigson normalise song.chart

# Transpose up a whole step
grigson transpose --raise 2 song.chart

# Transpose to a target key
grigson transpose --to G song.chart

# Validate (exits 1 on error)
grigson validate song.chart
grigson validate --format json *.chart

# Render to plain text
grigson render song.chart
```

See [CLI reference](documentation/cli.md) for the full options.

## API

```ts
import { parseSong, normaliseSong, transposeSong, TextRenderer, validate } from 'grigson';

const song = parseSong(source);
const normalised = normaliseSong(song);
const transposed = transposeSong(normalised, 7); // up a fifth

const renderer = new TextRenderer();
console.log(renderer.render(transposed));

// Validation
const diagnostics = validate(source);
// diagnostics is Diagnostic[] — empty if valid
```

## Documentation

- [Format reference](documentation/README.md) — the `.chart` file format
- [CLI reference](documentation/cli.md) — subcommands and options
- [Renderer](documentation/renderer.md) — TextRenderer, HtmlRenderer, configuration
- [Key detection](documentation/key-detection.md) — how `detectKey` works
- [Harmonic analysis](documentation/harmonic-analysis.md) — 2-5-1 and borrowed chord detection
- [Transposition](documentation/transpose.md) — `transposeSong`, `transposeSongToKey`
- [Validator](documentation/validator.md) — `validate()` and the `Diagnostic` interface
- [Language server](../language-server/README.md) — LSP server and editor setup
- [Tree-sitter grammar](../tree-sitter-grammar/README.md) — syntax highlighting and editor integration
- [Browser bundle](documentation/browser-bundle.md) — IIFE and ESM builds, `<grigson-chart>` custom element

## Building from source

```sh
pnpm install
pnpm run build
pnpm test
```

The build runs in stages: `build:grammar` (Peggy → generated parser), `build:ts` (TypeScript), `build:browser` (Vite IIFE + ESM bundles).
