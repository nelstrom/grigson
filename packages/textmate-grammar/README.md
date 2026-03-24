# grigson-textmate-grammar

The TextMate grammar for the Grigson `.chart` format (`scopeName: source.grigson`).

This grammar is the single source of truth for syntax highlighting. It is consumed by:

- **`packages/vscode-extension`** — copies it to `syntaxes/grigson.tmLanguage.json` for the VS Code extension
- **`packages/website`** — loaded by Shiki to highlight chart output in the playground

## Scopes

| Token                                                               | Scope                                                                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Front matter delimiters (`---`)                                     | `punctuation.definition.header.grigson`                                                               |
| Front matter key (`title`, `key`)                                   | `variable.parameter.key.grigson`                                                                      |
| Front matter key-value separator (`:`)                              | `punctuation.separator.key-value.grigson`                                                             |
| Front matter value (quoted)                                         | `string.quoted.double.grigson`                                                                        |
| Front matter value (unquoted)                                       | `string.unquoted.grigson`                                                                             |
| Section label brackets (`[`, `]`)                                   | `punctuation.definition.section.begin.grigson` / `punctuation.definition.section.end.grigson`         |
| Section label text                                                  | `entity.name.section.grigson`                                                                         |
| Barlines (`\|`)                                                     | `punctuation.definition.barline.grigson`                                                              |
| Time signature delimiters (`(`, `)`)                                | `punctuation.section.time-signature.begin.grigson` / `punctuation.section.time-signature.end.grigson` |
| Time signature numerals                                             | `constant.numeric.grigson`                                                                            |
| Time signature slash (`/`)                                          | `punctuation.separator.grigson`                                                                       |
| Dot beat slot (`.`)                                                 | `punctuation.separator.beat.grigson`                                                                  |
| Chord root (`C`–`G`)                                                | `constant.other.chord.root.grigson`                                                                   |
| Accidentals (`#`, `b`)                                              | `constant.other.chord.accidental.grigson`                                                             |
| Chord quality (`m`, `7`, `m7b5`, `maj7`, `m7`, `dim`, `dim7`, `M7`) | `keyword.other.chord.quality.grigson`                                                                 |

## Keeping the copies in sync

When the grammar is updated, copy it to the VS Code extension:

```sh
cp packages/textmate-grammar/grigson.tmLanguage.json \
   packages/vscode-extension/syntaxes/grigson.tmLanguage.json
```
