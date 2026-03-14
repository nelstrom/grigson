module.exports = grammar({
  name: 'grigson',

  extras: (_$) => [/[ \t]/],

  rules: {
    song: ($) => repeat(choice($.row, /\r?\n/)),

    row: ($) => seq($.barline, repeat1($.bar_tail)),

    bar_tail: ($) => seq(optional($.time_signature), $.chord, $.barline),

    barline: (_$) => '|',

    time_signature: ($) => seq('(', $.integer, '/', $.integer, ')'),

    integer: (_$) => /[0-9]+/,

    chord: ($) =>
      seq($.note_letter, optional($.accidental), optional($.quality)),

    note_letter: (_$) => /[A-G]/,

    accidental: (_$) => token.immediate(/[#b]/),

    quality: (_$) =>
      token.immediate(
        choice('m7b5', 'maj7', 'M7', 'dim7', 'm7', 'dim', 'm', '7'),
      ),
  },
});
