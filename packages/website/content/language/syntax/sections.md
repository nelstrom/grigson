---
layout: chart-lesson.njk
title: Sections
permalink: /language/syntax/sections/
order: 2
tags: language-syntax
---

# Sections

A section is declared by a name in square brackets, optionally followed by a `key:` annotation:

```grigson
[Verse]
[Chorus] key: Ab major
[Bridge] key: F# dorian
```

If a `key:` is given, it applies from that section onward, overriding the global key. If no key is given, the section **inherits the previous section's declared key** (falling back to the front-matter key, then nothing) — so a keyless `[Outro]` after `[Chorus] key: Eb major` is read in Eb major, not the global key.

`grigson normalise` never adds a `key:` to a section that didn't have one, and never rewrites a `key:` you did write. If every section declares the same `key:`, it hoists that value to the front matter and removes the per-section tokens. `grigson validate` warns when a declared key doesn't fit its chords.

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
