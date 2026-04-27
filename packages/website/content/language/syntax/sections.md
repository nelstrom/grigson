---
layout: chart-lesson.njk
title: Sections
permalink: /language/syntax/sections/
order: 2
tags: language-syntax
---

# Sections

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
