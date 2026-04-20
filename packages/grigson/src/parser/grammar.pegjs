// Grigson chord chart parser — MVP
// Supports: major, minor, and dominant seventh chords only.
// Supports: single barlines | only.

{{
  function makeLoc(l) {
    return {
      start: { line: l.start.line - 1, character: l.start.column - 1 },
      end:   { line: l.end.line - 1,   character: l.end.column - 1   },
    };
  }
}}

Song
  = frontMatter:FrontMatter? _ sections:SongBody {
      return {
        type: "song",
        title: frontMatter?.title ?? null,
        key: frontMatter?.key ?? null,
        meter: frontMatter?.meter ?? null,
        sections,
        loc: makeLoc(location()),
      };
    }

SongBody
  = items:(Comment / Newline / SectionLabel / Row)* {
      const sections = [];
      let pendingLabel = null;
      let pendingKey = null;
      let pendingPreamble = [];  // comments before the current label
      let currentRows = [];
      let currentContent = [];
      let labelSeen = false;
      let sectionStartLoc = null;
      let lastItemLoc = null;

      for (const item of items) {
        // Skip newlines (strings) and nulls
        if (typeof item !== "object" || item === null) continue;
        if (item.type === "sectionLabel") {
          if (currentRows.length > 0) {
            const loc = (sectionStartLoc && lastItemLoc)
              ? { start: sectionStartLoc.start, end: lastItemLoc.end }
              : undefined;
            const sec = { type: "section", label: pendingLabel, key: pendingKey, preamble: pendingPreamble, rows: currentRows, content: currentContent };
            if (loc) sec.loc = loc;
            sections.push(sec);
            currentRows = [];
            currentContent = [];
            pendingPreamble = [];
            pendingKey = null;
            labelSeen = false;
            sectionStartLoc = item.loc ?? null;
            lastItemLoc = item.loc ?? null;
          } else {
            if (!sectionStartLoc && item.loc) sectionStartLoc = item.loc;
            if (item.loc) lastItemLoc = item.loc;
          }
          pendingLabel = item.label;
          pendingKey = item.key;
          labelSeen = true;
        } else if (item.type === "row") {
          if (item.loc) {
            if (!sectionStartLoc) sectionStartLoc = item.loc;
            lastItemLoc = item.loc;
          }
          labelSeen = true;
          currentRows.push(item);
          currentContent.push(item);
        } else if (item.type === "comment") {
          if (item.loc) {
            if (!sectionStartLoc) sectionStartLoc = item.loc;
            lastItemLoc = item.loc;
          }
          if (!labelSeen) {
            pendingPreamble.push(item);
          } else {
            currentContent.push(item);
          }
        }
      }

      // Always push the final section (ensures at least one section exists)
      const finalLoc = (sectionStartLoc && lastItemLoc)
        ? { start: sectionStartLoc.start, end: lastItemLoc.end }
        : undefined;
      const finalSec = { type: "section", label: pendingLabel, key: pendingKey, preamble: pendingPreamble, rows: currentRows, content: currentContent };
      if (finalLoc) finalSec.loc = finalLoc;
      sections.push(finalSec);
      return sections;
    }

SectionLabel
  = "[" label:$[^\]\r\n]+ "]" _ key:("key" _ ":" _ value:FrontMatterValue { return value; })? _ Newline? {
      if (key !== null) {
        const validNotes = ["C#","Db","D#","Eb","F#","Gb","G#","Ab","A#","Bb","C","D","E","F","G","A","B"];
        const validKeySuffixes = ["m"," dorian"," aeolian"," mixolydian"," major"," minor"," ionian",""];
        const isValidKey = (k) => validNotes.some((n) => validKeySuffixes.some((s) => k === n + s));
        if (!isValidKey(key)) {
          error(`Invalid key: "${key}".`);
        }
      }
      return { type: "sectionLabel", label: label.trim(), key: key ?? null, loc: makeLoc(location()) };
    }

FrontMatter
  = "---" Newline fields:FrontMatterField* "---" Newline? {
      const meta = Object.fromEntries(fields.map(f => [f.key, f.value]));

      const validNotes = [
        "C#", "Db", "D#", "Eb", "F#", "Gb", "G#", "Ab", "A#", "Bb",
        "C", "D", "E", "F", "G", "A", "B",
      ];
      const validKeySuffixes = ["m", " dorian", " aeolian", " mixolydian", " major", " minor", " ionian", ""];
      const isValidKey = (k) =>
        validNotes.some((n) => validKeySuffixes.some((s) => k === n + s));
      if (meta.key !== undefined && !isValidKey(meta.key)) {
        error(`Invalid key: "${meta.key}". Must be a note name with optional suffix (e.g. C, F#m, Bb, A dorian, E aeolian, D mixolydian, C major, A minor).`);
      }
      const normalizeKey = (k) => {
        if (k.endsWith(' ionian')) return k.slice(0, -7) + ' major';
        if (k.includes(' ')) return k; // dorian/aeolian/mixolydian/major/minor — already canonical
        if (k.endsWith('m')) return k.slice(0, -1) + ' minor';
        return k + ' major';
      };

      const isValidMeter = (m) => m === 'mixed' || /^[0-9]+\/[0-9]+$/.test(m);
      if (meta.meter !== undefined && !isValidMeter(meta.meter)) {
        error(`Invalid meter: "${meta.meter}". Must be a time signature like 2/4, 4/4, 3/4, 6/8, or "mixed".`);
      }

      return {
        type: "frontMatter",
        title: meta.title ?? null,
        key: meta.key !== undefined ? normalizeKey(meta.key) : null,
        meter: meta.meter ?? null,
        loc: makeLoc(location()),
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
  = open:OpenBarline _ bars:BarTail+ {
      // Resolve simile bars left-to-right: each % copies the preceding bar's slots
      let lastSlots = [];
      for (const bar of bars) {
        if (bar.simile) {
          bar.slots = lastSlots.map(s => ({ ...s }));
          delete bar.simile;
        } else {
          lastSlots = bar.slots;
        }
      }
      return { type: "row", openBarline: open, bars, loc: makeLoc(location()) };
    }

// A bar's content plus its closing barline.
// The opening barline is consumed by Row (or the previous BarTail).
BarTail
  = ts:TimeSignatureToken? slots:BeatSlotList close:CloseBarline _ {
      if (!slots.some(s => s.type === "chord")) {
        error("A bar must contain at least one chord");
      }
      const bar = { type: "bar", slots, closeBarline: close };
      if (ts) bar.timeSignature = ts;
      bar.loc = makeLoc(location());
      return bar;
    }
  / "%" _ close:CloseBarline _ {
      // Simile mark — slots resolved by the Row action above
      const bar = { type: "bar", simile: true, slots: [], closeBarline: close };
      bar.loc = makeLoc(location());
      return bar;
    }

Bar
  = open:OpenBarline _ ts:TimeSignatureToken? slots:BeatSlotList close:CloseBarline {
      if (!slots.some(s => s.type === "chord")) {
        error("A bar must contain at least one chord");
      }
      const bar = { type: "bar", slots, closeBarline: close };
      if (ts) bar.timeSignature = ts;
      bar.loc = makeLoc(location());
      return bar;
    }

// A barline that can open a row (longest alternatives first)
OpenBarline
  = ":||:" { error(":||: cannot appear at the start of a line; use ||: to start a repeat") }
  / ":||"  { return { kind: "endRepeat" }; }
  / "||:"  { return { kind: "startRepeat" }; }
  / "||"   { return { kind: "double" }; }
  / "|"    { return { kind: "single" }; }

// A barline that closes a bar (longest alternatives first)
CloseBarline
  = ":||x" n:$[0-9]+ ":" { return { kind: "endRepeatStartRepeat", repeatCount: parseInt(n, 10) }; }
  / ":||:"                { return { kind: "endRepeatStartRepeat" }; }
  / ":||x" n:$[0-9]+     { return { kind: "endRepeat", repeatCount: parseInt(n, 10) }; }
  / ":||"                 { return { kind: "endRepeat" }; }
  / "||:"                 { return { kind: "startRepeat" }; }
  / "||."                 { return { kind: "final" }; }
  / "||"                  { return { kind: "double" }; }
  / "|"                   { return { kind: "single" }; }

BeatSlotList
  = first:(_ BeatSlot) rest:(_ BeatSlot)* _ {
      return [first[1], ...rest.map(([, s]) => s)];
    }

BeatSlot
  = chord:Chord { return { type: "chord", chord, loc: makeLoc(location()) }; }
  / "." { return { type: "dot", loc: makeLoc(location()) }; }

TimeSignatureToken
  = "(" numerator:$[0-9]+ "/" denominator:$[0-9]+ ")" {
      return { numerator: parseInt(numerator, 10), denominator: parseInt(denominator, 10) };
    }

Chord
  = root:Root quality:Quality bass:SlashBass? {
      const chord = { type: "chord", root, quality };
      if (bass !== null) chord.bass = bass;
      chord.loc = makeLoc(location());
      return chord;
    }

SlashBass
  = "/" bass:Root { return bass; }

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
  / "7b5"  { return "dom7flat5"; }
  / "7"    { return "dominant7"; }
  / "-"    { return "min7"; }
  / ""     { return "major"; }

Comment = "#" text:$[^\n\r]* (Newline / !.) { return { type: "comment", text: "#" + text, loc: makeLoc(location()) }; }

Newline = "\r\n" / "\n"

_ = [ \t]*
