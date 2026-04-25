// Monarch tokenizer definition for the grigson language.
// Loaded as a plain script before Monaco's AMD loader; exposes the config
// as window.grigsonMonarchTokens for playground.njk to pass to
// monaco.languages.setMonarchTokensProvider().
//
// Keep in sync with:
//   packages/textmate-grammar/grigson.tmLanguage.json
//   packages/tree-sitter-grammar/grammar.js
//   packages/grigson/src/parser/grammar.pegjs  (source of truth)
//
// Note: Monarch does not support lookbehind/lookahead, so some TextMate
// patterns are approximated. Token names match the theme rules in playground.njk.

window.grigsonMonarchTokens = {
  tokenizer: {
    root: [
      // Comment lines
      [/^#.*$/, 'comment.line.number-sign.grigson'],
      // Frontmatter delimiter — opens frontmatter state
      [/^---$/, { token: 'punctuation.definition.header.grigson', next: '@frontmatter' }],
      // Section labels [Name]
      [
        /^(\[)([^\]]+)(\])\s*$/,
        [
          'punctuation.definition.section.begin.grigson',
          'entity.name.section.grigson',
          'punctuation.definition.section.end.grigson',
        ],
      ],
      // Barlines (complex forms before simple |)
      [/:\|\|x\d+:/, 'punctuation.definition.barline.grigson'],
      [/:\|\|x\d+/, 'punctuation.definition.barline.grigson'],
      [/:\|\|:/, 'punctuation.definition.barline.grigson'],
      [/:\|\|/, 'punctuation.definition.barline.grigson'],
      [/\|\|:/, 'punctuation.definition.barline.grigson'],
      [/\|\|\./, 'punctuation.definition.barline.grigson'],
      [/\|\|/, 'punctuation.definition.barline.grigson'],
      [/\|/, 'punctuation.definition.barline.grigson'],
      // Time signatures (4/4)
      [/\(\d+\/\d+\)/, 'constant.numeric.grigson'],
      // Simile mark %
      [/%/, 'keyword.operator.simile.grigson'],
      // Chord: root + optional accidental + optional quality + optional slash bass
      [
        /([A-G])([#b]?)((?:m7b5|maj7|M7|dim7|m7|dim|m|7b13|7b9|7#9|7#5|7b5|sus4|sus2|13|11|9|7|6|-)?)((?:\/[A-G][#b]?)?)/,
        [
          'constant.other.chord.root.grigson',
          'constant.other.chord.accidental.grigson',
          'keyword.other.chord.quality.grigson',
          'punctuation.separator.slash.grigson',
        ],
      ],
    ],
    frontmatter: [
      // Closing delimiter — pops back to root
      [/^---$/, { token: 'punctuation.definition.header.grigson', next: '@pop' }],
      // key: "quoted value"
      [
        /([a-zA-Z]+)(:)(\s*"[^"]*")/,
        [
          'variable.parameter.key.grigson',
          'punctuation.separator.key-value.grigson',
          'string.quoted.double.grigson',
        ],
      ],
      // key: unquoted value
      [
        /([a-zA-Z]+)(:)(\s*.+)/,
        [
          'variable.parameter.key.grigson',
          'punctuation.separator.key-value.grigson',
          'string.unquoted.grigson',
        ],
      ],
    ],
  },
};
