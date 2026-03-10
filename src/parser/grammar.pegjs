// Grigson chord chart parser — MVP
// Supports: major, minor, and dominant seventh chords only.
// Supports: single barlines | only.

Song
  = frontMatter:FrontMatter? _ rows:SongBody {
      return {
        type: "song",
        title: frontMatter?.title ?? null,
        key: frontMatter?.key ?? null,
        rows,
      };
    }

SongBody
  = rows:(Newline / Row)* {
      return rows.filter(r => r !== null && typeof r === "object");
    }

FrontMatter
  = "---" Newline fields:FrontMatterField* "---" Newline? {
      const meta = Object.fromEntries(fields.map(f => [f.key, f.value]));

      const validKeys = [
        "C", "C#", "Db", "D", "D#", "Eb", "E",
        "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"
      ];
      if (meta.key !== undefined && !validKeys.includes(meta.key)) {
        error(`Invalid key: "${meta.key}". Must be a chromatic note name (e.g. C, F#, Bb).`);
      }

      return {
        type: "frontMatter",
        title: meta.title ?? null,
        key: meta.key ?? null,
      };
    }

FrontMatterField
  = key:$[a-zA-Z]+ ":" _ value:FrontMatterValue Newline {
      return { key, value };
    }

FrontMatterValue
  = '"' value:$(!'"' .)* '"' { return value; }
  / value:$[^\n\r]+ { return value.trim(); }

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

Newline = "\r\n" / "\n"

_ = [ \t]*
