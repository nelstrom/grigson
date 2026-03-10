// Grigson chord chart parser — MVP
// Supports: major, minor, and dominant seventh chords only.

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
