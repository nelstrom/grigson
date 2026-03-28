---
layout: base.njk
title: API Reference
permalink: /api/
---

# API Reference

This section is for developers building on top of grigson — implementing a custom renderer, integrating the parser into a tool, or working with the programmatic APIs.

If you want to write chord charts and render them in a web page, start with the [Language](/language/) reference and [Renderers](/renderers/) instead.

---

## Renderer interface

- [Renderer Interface](/api/renderer-interface/) — how to implement a custom renderer; the song tree structure

---

## Programmatic APIs

- [Transpose](/api/transpose/) — `transposeSection`, `transposeSong`, `transposeSongToKey`
- [Harmonic Analysis](/api/harmonic-analysis/) — `analyseHarmony`; ii-V-I and V-I pattern detection, temporary key inference
- [Key Detection](/api/key-detection/) — `detectKey`; infer tonic from a chord sequence
- [Validator](/api/validator/) — `validate`; structured diagnostics from a `.chart` source string

---

## Internals

- [Time Signatures](/api/time-signatures/) — how time signatures flow through the parser, normalizer, and HTML renderer layers
