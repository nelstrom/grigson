module.exports = grammar({
  name: 'grigson',

  extras: (_$) => [/[ \t\r\n]/],

  rules: {
    song: ($) => repeat($.chord),

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
