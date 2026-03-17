module.exports = grammar({
  name: 'grigson',

  extras: (_$) => [/[ \t]/],

  rules: {
    song: ($) =>
      seq(optional($.frontmatter), repeat(choice($.section_label, $.row, /\r?\n/))),

    section_label: ($) => seq('[', $.section_name, ']'),

    section_name: (_$) => /[^\]\r\n]+/,

    frontmatter: ($) =>
      seq($.frontmatter_delimiter, repeat($.frontmatter_field), $.frontmatter_delimiter),

    frontmatter_delimiter: (_$) => /---[ \t]*\r?\n/,

    frontmatter_field: ($) =>
      seq($.frontmatter_key, ':', $.frontmatter_value, /\r?\n/),

    frontmatter_key: (_$) => /[a-zA-Z]+/,

    frontmatter_value: ($) => choice($.quoted_string, $.unquoted_value),

    quoted_string: (_$) => /"[^"]*"/,

    unquoted_value: (_$) => /[^\r\n\t "][^\r\n]*/,

    row: ($) => seq($.open_barline, repeat1($.bar_tail)),

    bar_tail: ($) =>
      seq(optional($.time_signature), repeat1($.beat_slot), $.close_barline),

    beat_slot: ($) => choice($.chord, $.dot),

    dot: (_$) => '.',

    open_barline: (_$) => token(choice(':||:', ':||', '||:', '||', '|')),

    close_barline: (_$) =>
      token(choice(/:\|\|x\d+:/, /:\|\|x\d+/, ':||:', ':||', '||:', '||.', '||', '|')),

    time_signature: ($) => seq('(', $.integer, '/', $.integer, ')'),

    integer: (_$) => /[0-9]+/,

    chord: ($) =>
      seq($.note_letter, optional($.accidental), optional($.quality)),

    note_letter: (_$) => /[A-G]/,

    accidental: (_$) => token.immediate(/[#b]/),

    quality: (_$) =>
      token.immediate(
        choice('m7b5', 'maj7', 'M7', 'dim7', 'm7', 'dim', 'm', '7b5', '7', '-'),
      ),
  },
});
