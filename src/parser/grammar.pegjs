// Grigson chord chart parser — MVP
// Supports: major, minor, and dominant seventh chords only.
// Supports: single barlines | only.

Row
  = "|" _ bars:BarTail+ {
      return { type: "row", bars };
    }

// A bar's content plus its closing barline.
// The opening barline is consumed by Row (or the previous BarTail).
BarTail
  = chord:Chord _ "|" _ {
      return { type: "bar", chord };
    }

Bar
  = "|" _ chord:Chord _ "|" {
      return { type: "bar", chord };
    }

Chord
  = root:Root quality:Quality {
      return { type: "chord", root, quality };
    }

Root
  = note:NoteLetter accidental:Accidental? {
      return accidental ? note + accidental : note;
    }

NoteLetter
  = [A-G]

Accidental
  = "#" / "b"

Quality
  = "m" { return "minor"; }
  / "7" { return "dominant7"; }
  / ""  { return "major"; }

_ = [ \t]*
