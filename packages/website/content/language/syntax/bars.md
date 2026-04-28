---
layout: chart-lesson.njk
title: Bars
permalink: /language/syntax/bars/
order: 3
tags: language-syntax
---

# Bars

## Time Signatures

Time signatures are written in parentheses: `(4/4)`, `(3/4)`, `(6/8)`, `(2/4)`, `(3/8)`, etc.

A time signature appears immediately after the first barline it applies to, and remains in effect until another time signature is encountered:

```grigson
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

```grigson
| Am | G | F | G |
||: Am | G | F | G :||
```
