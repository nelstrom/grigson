---
layout: chart-lesson.njk
title: Chords
permalink: /language/syntax/chords/
order: 4
tags: language-syntax
---

# Chords

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
