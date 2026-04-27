---
layout: chart-lesson.njk
title: Repeats
permalink: /language/syntax/repeats/
order: 5
tags: language-syntax
---

# Repeats and Volta Brackets

## Repeat Barlines

Repeat signs are expressed as part of the barline:

| Symbol    | Meaning                                       |
| --------- | --------------------------------------------- |
| `\|\|:`   | Start repeat                                  |
| `:\|\|`   | End repeat (play twice by default)            |
| `:\|\|x3` | End repeat, play 3 times                      |
| `:\|\|:`  | End repeat and immediately start a new repeat |

## Volta Brackets

Volta brackets (first-time / second-time endings) are written by placing a bracket label in square brackets immediately after a barline, before the contents of that bar:

```
||: Am | G |[1.] F | G :||
[2.] F | C ||.
```

The label can be any short text: `[1.]`, `[2.]`, `[1.-3.]`, `[2.-4.]`, etc.

A typical use with a two-bar ending:

```
||: (4/4) C | Am | F | G |
| C | Am |[1.] F | G :||
[2.] F | C ||.
```

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
- **Auto-reflow.** Row layout is driven by the source text. The HTML renderer's `barsPerLine` and `maxBarsPerLine` options can influence wrapping, but there is no reflowing based on available width.
