// Grigson chord chart parser — MVP
// Supports: major, minor, and dominant seventh chords only.
// Supports: single barlines | only.

Song
  = frontMatter:FrontMatter? _ sections:SongBody {
      return {
        type: "song",
        title: frontMatter?.title ?? null,
        key: frontMatter?.key ?? null,
        sections,
      };
    }

SongBody
  = items:(Newline / SectionLabel / Row)* {
      const sections = [];
      let pendingLabel = null;
      let currentRows = [];

      for (const item of items) {
        // Skip newlines (strings) and nulls
        if (typeof item !== "object" || item === null) continue;
        if (item.type === "sectionLabel") {
          if (currentRows.length > 0) {
            sections.push({ type: "section", label: pendingLabel, rows: currentRows });
            currentRows = [];
          }
          pendingLabel = item.label;
        } else if (item.type === "row") {
          currentRows.push(item);
        }
      }

      // Always push the final section (ensures at least one section exists)
      sections.push({ type: "section", label: pendingLabel, rows: currentRows });
      return sections;
    }

SectionLabel
  = "[" label:$[^\]\r\n]+ "]" _ Newline? {
      return { type: "sectionLabel", label: label.trim() };
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
  = ts:TimeSignatureToken? slots:BeatSlotList "|" _ {
      if (!slots.some(s => s.type === "chord")) {
        error("A bar must contain at least one chord");
      }
      const bar = { type: "bar", slots };
      if (ts) bar.timeSignature = ts;
      return bar;
    }

Bar
  = "|" _ ts:TimeSignatureToken? slots:BeatSlotList "|" {
      if (!slots.some(s => s.type === "chord")) {
        error("A bar must contain at least one chord");
      }
      const bar = { type: "bar", slots };
      if (ts) bar.timeSignature = ts;
      return bar;
    }

BeatSlotList
  = first:(_ BeatSlot) rest:(_ BeatSlot)* _ {
      return [first[1], ...rest.map(([, s]) => s)];
    }

BeatSlot
  = chord:Chord { return { type: "chord", chord }; }
  / "." { return { type: "dot" }; }

TimeSignatureToken
  = "(" numerator:$[0-9]+ "/" denominator:$[0-9]+ ")" {
      return { numerator: parseInt(numerator, 10), denominator: parseInt(denominator, 10) };
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
  = "m7b5" { return "halfDiminished"; }
  / "maj7" { return "maj7"; }
  / "M7"   { return "maj7"; }
  / "dim7" { return "dim7"; }
  / "m7"   { return "min7"; }
  / "dim"  { return "diminished"; }
  / "m"    { return "minor"; }
  / "7"    { return "dominant7"; }
  / ""     { return "major"; }

Newline = "\r\n" / "\n"

_ = [ \t]*
