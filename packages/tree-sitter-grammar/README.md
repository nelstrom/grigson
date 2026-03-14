# tree-sitter-grigson

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for the Grigson `.chart` format.

## What tree-sitter provides

Tree-sitter delivers **incremental structural parsing** directly in your editor:

- Syntax highlighting based on the grammar's node types
- Text objects for structural navigation (select a bar, a row, a section)
- Error-tolerant parsing (the tree stays valid even when the file is mid-edit)

This complements the [Language Server](../language-server/README.md), which provides diagnostics (error squiggles). Both can be active simultaneously: tree-sitter handles colour, the LSP handles squiggles.

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
