---
layout: chart-lesson.njk
title: Front Matter
permalink: /language/syntax/front-matter/
order: 1
tags: language-syntax
---

# Front Matter

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

## Front Matter Fields

Front matter is written in YAML. All fields are optional.

| Field    | Type    | Description                                                                 |
| -------- | ------- | --------------------------------------------------------------------------- |
| `title`  | string  | Title of the song                                                           |
| `artist` | string  | Composer or artist name                                                     |
| `key`    | string  | Global key (see [Key Notation](/language/syntax/sections/))                 |
| `meter`  | string  | Time signature; default 4/4 (see [Time Signatures](/language/syntax/bars/)) |
| `tempo`  | integer | Tempo in BPM                                                                |
| `feel`   | string  | e.g. `"swing"`, `"latin"`, `"waltz"`                                        |
