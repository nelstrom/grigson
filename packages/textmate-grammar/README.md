# grigson-textmate-grammar

The TextMate grammar for the Grigson `.chart` format (`scopeName: source.grigson`).

This grammar is the single source of truth for syntax highlighting. It is consumed by:

- **`packages/vscode-extension`** — copies it to `syntaxes/grigson.tmLanguage.json` for the VS Code extension
- **`packages/website`** — loaded by Shiki to highlight chart output in the playground

## Scopes

| Token | Scope |
| --- | --- |
| Front matter delimiters (`---`) | `punctuation.definition.frontmatter.grigson` |
| Front matter keys (`title:`, `key:`) | `keyword.other.frontmatter.grigson` |
| Barlines (`\|`) | `punctuation.separator.barline.grigson` |
| Chord root (`C`–`G`) | `entity.name.chord-root.grigson` |
| Accidentals (`#`, `b`) | `markup.bold.accidental.grigson` |
| Chord quality (`m`, `7`, `m7b5`, `maj7`, `m7`, `dim`, `dim7`, `M7`) | `storage.type.chord-quality.grigson` |

## Keeping the copies in sync

When the grammar is updated, copy it to the VS Code extension:

```sh
cp packages/textmate-grammar/grigson.tmLanguage.json \
   packages/vscode-extension/syntaxes/grigson.tmLanguage.json
```
