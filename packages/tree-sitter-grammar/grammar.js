module.exports = grammar({
  name: 'grigson',

  extras: ($) => [/[ \t]/],

  rules: {
    song: ($) => repeat(/[^\n]*\n/),
  },
});
