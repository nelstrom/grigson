# Grigson Format Reference

> See also: [Renderer Documentation](renderer.md) — configuration, transposition, notation styles, and custom renderers.
> See also: [Testing Strategy](testing.md) — test runner, conventions, and what is tested at each layer.

Grigson is a plain-text format for writing chord charts, named after Lionel Grigson, author of _The Jazz Chord Book_. It is designed so that the source text closely resembles the rendered output, and so that the **form of a song** (AABA, verse/chorus, 12-bar blues, etc.) is apparent at a glance.

Grigson source files use the `.chart` extension.

---

## Philosophy

- **Plain text that resembles output.** The pipe character `|` represents a bar line. Time signatures look like time signatures. Chord names are written as you would write them on a lead sheet.
- **Left-aligned, ragged right.** Unlike some chord chart tools that stretch rows to fill the page width, grigson renders rows at their natural width. A bar with four beats takes up twice as much space as a bar with two beats. The space a passage occupies on the page reflects how long it lasts in time.
- **Explicit row layout.** Each line in the source becomes a row in the output. You control the layout by how you arrange your source text.
- **Simple rhythm.** Grigson does not use a rhythm staff or per-chord duration notation. Rhythmic information is conveyed through beat-slot notation (see below).
- **Key per section.** Songs that modulate between sections (e.g. verse in Eb, chorus in Ab) can specify a key for each section independently.

---

## File Structure

A `.chart` file consists of two parts:

1. **Front matter** — a YAML block enclosed in `---` delimiters, containing global metadata.
2. **Body** — one or more sections, each containing rows of measures.

```
---
title: "All the Things You Are"
artist: "Jerome Kern"
key: Ab
---

[A]
||: (4/4) Fm7 | Bbm7 | Eb7 | AbM7 |
| DbM7 | G7 | CM7 | CM7 |

[B]
| Cm7 | Fm7 | Bb7 | EbM7 |
| AbM7 | D7 | GM7 | GM7 :||
```

---

## Front Matter

Front matter is written in YAML. All fields are optional.

| Field    | Type    | Description                          |
| -------- | ------- | ------------------------------------ |
| `title`  | string  | Title of the song                    |
| `artist` | string  | Composer or artist name              |
| `key`    | string  | Global key (see Key Notation below)  |
| `tempo`  | integer | Tempo in BPM                         |
| `feel`   | string  | e.g. `"swing"`, `"latin"`, `"waltz"` |

---

## Sections

A section is declared by a name in square brackets, optionally followed by a `key:` annotation:

```
[Verse]
[Chorus] key: Ab
[Bridge] key: F# dorian
```

If a `key:` is given, it applies to that section only, overriding the global key. If no key is given, the section inherits the global key from the front matter.

Section names can be anything: `[A]`, `[Verse]`, `[Chorus]`, `[Intro]`, `[Bridge]`, `[Verse/Chorus]`, etc.

---

## Key Notation

A key is a root note followed by an optional mode name:

| Example        | Meaning                 |
| -------------- | ----------------------- |
| `F`            | F major                 |
| `Em`           | E minor (lowercase `m`) |
| `Bb`           | Bb major                |
| `F# dorian`    | F# Dorian               |
| `G mixolydian` | G Mixolydian            |

Supported modes: `major`, `minor`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `aeolian`, `locrian`.

---

## Time Signatures

Time signatures are written in parentheses: `(4/4)`, `(3/4)`, `(6/8)`, `(2/4)`, `(3/8)`, etc.

A time signature appears immediately after the first barline it applies to, and remains in effect until another time signature is encountered:

```
| (4/4) Cm | F7 | Bb | Bb |
| Cm | (2/4) G7 | (4/4) Cm | Cm |
```

---

## Barlines

| Symbol    | Meaning                  |
| --------- | ------------------------ |
| `\|`      | Single barline           |
| `\|\|`    | Double barline           |
| `\|\|.`   | Final barline (thick)    |
| `\|\|:`   | Start repeat             |
| `:\|\|`   | End repeat               |
| `:\|\|x3` | End repeat, play 3 times |
| `:\|\|:`  | End and start repeat     |

A row of measures begins and ends with a barline. There is no implicit barline at the start of a line; you must write it.

```
| Am | G | F | G |
||: Am | G | F | G :||
```

---

## Chord Symbols

Chord names follow standard notation. The root note is a capital letter (A–G) followed by an optional accidental (`b` for flat, `#` for sharp).

| Example               | Chord                         |
| --------------------- | ----------------------------- |
| `C`                   | C major                       |
| `Cm`                  | C minor                       |
| `C7`                  | C dominant seventh            |
| `CM7`                 | C major seventh               |
| `Cm7`                 | C minor seventh               |
| `CmM7`                | C minor-major seventh         |
| `Cm7b5`               | C half-diminished (m7 flat 5) |
| `Cdim`                | C diminished                  |
| `Cdim7`               | C diminished seventh          |
| `C+`                  | C augmented                   |
| `Csus4`               | C suspended fourth            |
| `Cadd9`               | C add ninth                   |
| `C9`, `C11`, `C13`    | Dominant extensions           |
| `CM9`, `CM11`, `CM13` | Major extensions              |
| `C7b9`, `C7#11`       | Altered tensions              |
| `C/G`                 | C over G bass                 |
| `/G`                  | G bass only (root unchanged)  |

---

## Beat Slots and Dot Notation

The content of each measure is a sequence of chord names and dots. The beat unit is determined by the time signature denominator (e.g. a quarter note in 4/4 or 3/4; an eighth note in 6/8 or 3/8).

### Mode 1 — no dots: chords split the bar evenly

When a bar contains only chord names and no dots, the chords divide the bar into equal portions:

```
| C |          (4/4) → C for 4 beats
| C G |        (4/4) → C for 2 beats, G for 2 beats
| C G Am F |   (4/4) → C G Am F, 1 beat each
| Em D |        (6/8) → Em for 3 eighths, D for 3 eighths
```

### Mode 2 — dots present: each slot is one beat unit

When a bar contains one or more dots (`.`), every item — chord name or dot — occupies exactly one beat unit. A dot continues (holds) the preceding chord for one more beat:

```
| C . . G |    (4/4) → C for 3 beats, G for 1 beat
| C G . . |    (4/4) → C for 1 beat, G for 3 beats
| G . A |       (3/4) → G for 2 beats, A for 1 beat
| Bb . C F . . | (6/8) → Bb for 2 eighths, C for 1 eighth, F for 3 eighths
```

The total number of items (chords + dots) in a mode-2 bar must equal the number of beat units in the bar.

### Mixing modes within a row

Different bars within the same row may independently use mode 1 or mode 2:

```
| (4/4) C G | Am . . F | C | G . . . |
```

---

## Simile Marks

The `%` symbol means "repeat the previous bar". It is shorthand for writing the same chord content again:

```
| Am | G | G | G |     ← longhand
| Am | G | % | % |     ← shorthand, same meaning
```

Both forms parse to the same AST. Whether the output uses `%` or writes chords out in full is controlled by the renderer configuration, not the source.

There is no double-bar simile symbol in grigson. To repeat two bars, write `%` twice.

---

## Multi-bar Rests

A rest within a bar is written as `-`:

```
| - | - | - | - |
```

In the source, each bar is written out individually. The renderer may choose to display a run of consecutive rest bars as a single multi-bar rest symbol with a count.

---

## Repeats and Volta Brackets

### Repeat barlines

Repeat signs are expressed as part of the barline:

| Symbol    | Meaning                                       |
| --------- | --------------------------------------------- |
| `\|\|:`   | Start repeat                                  |
| `:\|\|`   | End repeat (play twice by default)            |
| `:\|\|x3` | End repeat, play 3 times                      |
| `:\|\|:`  | End repeat and immediately start a new repeat |

These are the same barline symbols described in the Barlines section above; they are listed here again for completeness alongside volta brackets.

### Volta brackets

Volta brackets (first-time / second-time endings) are written by placing a bracket label in square brackets immediately after a barline, before the contents of that bar:

```
||: Am | G |[1.] F | G :||
[2.] F | C ||.
```

The label can be any short text: `[1.]`, `[2.]`, `[1.-3.]`, `[2.-4.]`, etc. The bracket applies to the bar it opens and continues until the next barline that ends or restarts the repeat.

A typical use with a two-bar ending:

```
||: (4/4) C | Am | F | G |
| C | Am |[1.] F | G :||
[2.] F | C ||.
```

### What is not supported in v1

Navigation signs — Coda, Segno, Da Capo, Dal Segno, Fine, and "To Coda" — are out of scope for v1. Songs that use these structures should be written out in full, or simplified to use repeat barlines and volta brackets.

---

## Worked Example

Here is a short jazz-style chart demonstrating several features:

```
---
title: "Blues in F"
key: F
feel: "swing"
---

[Head]
||: (4/4) F7 | % | % | % |
| Bb7 | % | F7 | % |
| C7 | Bb7 | F7 | C7 :||
```

---

## What Grigson Does Not Support (by design)

- **Rhythm notation.** There is no staff, no note durations on individual chords, no ties or triplets beyond what beat-slot notation can express.
- **Navigation signs.** Coda, Segno, Da Capo, Dal Segno, and Fine are not supported in v1. Use repeat barlines and volta brackets instead, or write the song out in full.
- **Lyrics.** Grigson is a chord chart tool, not a lead sheet tool.
- **Auto-reflow.** Row layout is always controlled explicitly by the source text.
