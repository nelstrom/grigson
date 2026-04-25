; Comments
(comment) @comment

; Frontmatter
(frontmatter_delimiter) @punctuation.special

(frontmatter_field
  (frontmatter_key) @variable.member)

(frontmatter_value
  (quoted_string) @string)

(frontmatter_value
  (unquoted_value) @string)

; Section labels
(section_label
  "[" @punctuation.bracket
  (section_name) @markup.heading
  "]" @punctuation.bracket)

(section_key_annotation
  "key" @variable.member
  ":" @punctuation.delimiter
  (frontmatter_value) @string)

; Barlines
(open_barline) @punctuation.delimiter
(close_barline) @punctuation.delimiter

; Time signatures
(time_signature
  "(" @punctuation.bracket
  "/" @operator
  ")" @punctuation.bracket)

(time_signature
  (integer) @number)

; Simile mark
(simile_mark) @keyword.operator

; Tonality hints
(tonality_hint
  "{" @punctuation.bracket
  (tonality_hint_key) @constant.builtin
  "}" @punctuation.bracket)

; Beat slots
(beat_slot
  (dot) @punctuation.separator)

; Chords
(chord
  (note_letter) @constant)

(chord
  (accidental) @operator)

(chord
  (quality) @keyword)

; Slash bass
(slash_bass
  "/" @punctuation.separator)

(slash_bass
  (note_letter) @constant)

(slash_bass
  (accidental) @operator)
