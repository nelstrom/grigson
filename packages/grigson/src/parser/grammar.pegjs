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

  const VALID_NOTES = ["C#","Db","D#","Eb","F#","Gb","G#","Ab","A#","Bb","C","D","E","F","G","A","B"];
  const VALID_SUFFIXES = [" dorian"," aeolian"," mixolydian"," major"," minor"," ionian"];

  function isValidKey(k) {
    return VALID_NOTES.some(n => VALID_SUFFIXES.some(s => k === n + s));
  }

  function normalizeKey(k) {
    if (k.endsWith(' ionian')) return k.slice(0, -7) + ' major';
    return k;
  }
}}

Song
  = frontMatter:FrontMatter? _ sections:SongBody {
      const song = {
        type: "song",
        title: frontMatter?.title ?? null,
        key: frontMatter?.key ?? null,
        meter: frontMatter?.meter ?? null,
        sections,
        loc: makeLoc(location()),
      };
      if (frontMatter?.keyLoc) song.keyLoc = frontMatter.keyLoc;
      return song;
    }

SongBody
  = items:(Comment / Newline / SectionLabel / Row)* {
      const sections = [];
      let pendingLabel = null;
      let pendingKey = null;
      let pendingKeyLoc = null;
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
            if (pendingKeyLoc) sec.keyLoc = pendingKeyLoc;
            sections.push(sec);
            currentRows = [];
            currentContent = [];
            pendingPreamble = [];
            pendingKey = null;
            pendingKeyLoc = null;
            labelSeen = false;
            sectionStartLoc = item.loc ?? null;
            lastItemLoc = item.loc ?? null;
          } else {
            if (!sectionStartLoc && item.loc) sectionStartLoc = item.loc;
            if (item.loc) lastItemLoc = item.loc;
          }
          pendingLabel = item.label;
          pendingKey = item.key;
          pendingKeyLoc = item.keyLoc ?? null;
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
      if (pendingKeyLoc) finalSec.keyLoc = pendingKeyLoc;
      sections.push(finalSec);
      return sections;
    }

SectionLabel
  = "[" label:$[^\]\r\n]+ "]" _ key:("key" _ ":" _ value:FrontMatterValue { return { value, loc: makeLoc(location()) }; })? _ Newline? {
      if (key !== null && !isValidKey(key.value)) {
        error(`Invalid key: "${key.value}".`);
      }
      const node = {
        type: "sectionLabel",
        label: label.trim(),
        key: key !== null ? normalizeKey(key.value) : null,
        loc: makeLoc(location()),
      };
      if (key !== null) node.keyLoc = key.loc;
      return node;
    }

FrontMatter
  = "---" Newline fields:FrontMatterField* "---" Newline? {
      const meta = Object.fromEntries(fields.map(f => [f.key, f.value]));

      if (meta.key !== undefined && !isValidKey(meta.key)) {
        error(`Invalid key: "${meta.key}". Must be a note name followed by a mode (e.g. C major, A minor, F# dorian, E aeolian, D mixolydian).`);
      }

      const isValidMeter = (m) => m === 'mixed' || /^[0-9]+\/[0-9]+$/.test(m);
      if (meta.meter !== undefined && !isValidMeter(meta.meter)) {
        error(`Invalid meter: "${meta.meter}". Must be a time signature like 2/4, 4/4, 3/4, 6/8, or "mixed".`);
      }

      const keyField = fields.find(f => f.key === "key");

      const fm = {
        type: "frontMatter",
        title: meta.title ?? null,
        key: meta.key !== undefined ? normalizeKey(meta.key) : null,
        meter: meta.meter ?? null,
        loc: makeLoc(location()),
      };
      if (keyField && keyField.loc) fm.keyLoc = keyField.loc;
      return fm;
    }

FrontMatterField
  = key:$[a-zA-Z]+ ":" _ value:FrontMatterValue Newline {
      return { key, value, loc: makeLoc(location()) };
    }

FrontMatterValue
  = '"' value:$(!'"' .)* '"' { return value; }
  / value:$[^\n\r]+ { return value.trim(); }

Row
  = open:OpenBarline _ bars:BarTail+ {
      // Resolve simile bars left-to-right: each % copies the preceding bar's cells
      let lastCells = [];
      for (const bar of bars) {
        if (bar.simile) {
          bar.cells = lastCells.map(s => ({ ...s }));
          delete bar.simile;
        } else {
          lastCells = bar.cells;
        }
      }
      return { type: "row", openBarline: open, bars, loc: makeLoc(location()) };
    }

// A bar's content plus its closing barline.
// The opening barline is consumed by Row (or the previous BarTail).
BarTail
  = ts:TimeSignatureToken? result:BeatCellList close:CloseBarline _ {
      const { cells, hints } = result;
      const bar = { type: "bar", cells, closeBarline: close };
      if (ts) bar.timeSignature = ts;
      if (hints.length > 0) bar.tonalityHints = hints;
      bar.loc = makeLoc(location());
      return bar;
    }
  / "%" _ close:CloseBarline _ {
      // Simile mark — cells resolved by the Row action above
      const bar = { type: "bar", simile: true, cells: [], closeBarline: close };
      bar.loc = makeLoc(location());
      return bar;
    }

Bar
  = open:OpenBarline _ ts:TimeSignatureToken? result:BeatCellList close:CloseBarline {
      const { cells, hints } = result;
      const bar = { type: "bar", cells, closeBarline: close };
      if (ts) bar.timeSignature = ts;
      if (hints.length > 0) bar.tonalityHints = hints;
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

BeatCellList
  = items:(_ BeatCellItem)+ _ {
      const cells = [];
      const hints = [];
      let cellIdx = 0;
      for (const [, item] of items) {
        if (item.type === "tonalityHint") {
          hints.push({ beforeCellIndex: cellIdx, key: item.key, loc: item.loc });
        } else {
          cells.push(item);
          cellIdx++;
        }
      }
      if (!cells.some(s => s.type === "chord")) {
        error("A bar must contain at least one chord");
      }
      return { cells, hints };
    }

BeatCellItem
  = TonalityHint
  / BeatCell

BeatCell
  = chord:Chord { return { type: "chord", chord, loc: makeLoc(location()) }; }
  / "." { return { type: "dot", loc: makeLoc(location()) }; }

TimeSignatureToken
  = "(" numerator:$[0-9]+ "/" denominator:$[0-9]+ ")" {
      return { numerator: parseInt(numerator, 10), denominator: parseInt(denominator, 10) };
    }

TonalityHint
  = "{" _ key:TonalityHintKey _ "}" {
      return { type: "tonalityHint", key, loc: makeLoc(location()) };
    }

TonalityHintKey
  = "home" { return ""; }
  / note:$([A-G][#b]?) " " mode:$("major" / "minor" / "dorian" / "aeolian" / "mixolydian") {
      const k = note + " " + mode;
      if (!isValidKey(k)) error(`Invalid tonality hint: "${k}".`);
      return k;
    }
  / "" { return ""; }

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
  = "m7b5"  { return "halfDiminished"; }
  / "maj7"  { return "maj7"; }
  / "M7"    { return "maj7"; }
  / "dim7"  { return "dim7"; }
  / "m7"    { return "min7"; }
  / "dim"   { return "diminished"; }
  / "m"     { return "minor"; }
  / "7b13"  { return "dom7flat13"; }
  / "7b9"   { return "dom7flat9"; }
  / "7b5"   { return "dom7flat5"; }
  / "7#9"   { return "dom7sharp9"; }
  / "7#5"   { return "dom7sharp5"; }
  / "sus4"  { return "sus4"; }
  / "sus2"  { return "sus2"; }
  / "13"    { return "dom13"; }
  / "11"    { return "dom11"; }
  / "9"     { return "dom9"; }
  / "7"     { return "dominant7"; }
  / "6"     { return "add6"; }
  / "-"     { return "min7"; }
  / ""      { return "major"; }

Comment = "#" text:$[^\n\r]* (Newline / !.) { return { type: "comment", text: "#" + text, loc: makeLoc(location()) }; }

Newline = "\r\n" / "\n"

_ = [ \t]*
