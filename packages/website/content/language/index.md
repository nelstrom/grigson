---
layout: base.njk
title: The Grigson Language
permalink: /language/
---

# The Grigson Language

Grigson is a plain-text format for writing chord charts, named after Lionel Grigson, author of _The Jazz Chord Book_. It is designed so that the source text closely resembles the rendered output, and so that the **form of a song** (AABA, verse/chorus, 12-bar blues, etc.) is apparent at a glance.

Grigson source files use the `.chart` extension.

---

## Philosophy

- **Plain text that resembles output.** The pipe character `|` represents a bar line. Time signatures look like time signatures. Chord names are written as you would write them on a lead sheet.
- **Left-aligned, ragged right.** Rows render at their natural width. A bar with four beats takes up twice as much space as a bar with two beats — the space a passage occupies on the page reflects how long it lasts in time.
- **Source-driven row layout.** Each line in the source becomes a row in the output by default. The HTML renderer's `barsPerLine` and `maxBarsPerLine` options can override this.
- **Simple rhythm.** Grigson does not use a rhythm staff or per-chord duration notation. Rhythmic information is conveyed through beat-slot notation (see below).
- **Key per section.** Songs that modulate between sections (e.g. verse in Eb, chorus in Ab) can specify a key for each section independently.

---

## Syntax reference

- [Front matter](/language/syntax/front-matter/) — file structure and YAML metadata fields
- [Sections](/language/syntax/sections/) — section labels and key annotations
- [Bars](/language/syntax/bars/) — time signatures and barline symbols
- [Chords](/language/syntax/chords/) — chord symbols, beat slots, simile marks, multi-bar rests
- [Repeats](/language/syntax/repeats/) — repeat barlines, volta brackets, and what is out of scope

---

## Examples

Browse the [Songbook](/language/examples/) for complete reference charts demonstrating the language.
