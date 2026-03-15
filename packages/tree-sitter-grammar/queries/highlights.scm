; Frontmatter
(frontmatter_delimiter) @punctuation.special

(frontmatter_field
  (frontmatter_key) @variable.member)

(frontmatter_field
  (frontmatter_value) @string)

; Section labels
(section_label
  "[" @punctuation.bracket
  (section_name) @markup.heading
  "]" @punctuation.bracket)

; Barlines
(barline) @punctuation.delimiter

; Time signatures
(time_signature
  "(" @punctuation.bracket
  "/" @operator
  ")" @punctuation.bracket)

(time_signature
  (integer) @number)

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
