# Keys

Everything about how a key is declared, inherited, detected, and validated in a `.chart` file.

## Three ways a key enters a chart

| Mechanism          | Syntax                         | Scope                                                | Propagates?                         |
| ------------------ | ------------------------------ | ---------------------------------------------------- | ----------------------------------- |
| Front-matter key   | `key: Eb major`                | The whole song, unless a section overrides it        | Yes — via section inheritance       |
| Section-header key | `[Chorus] key: Ab major`       | That section (and following keyless sections)        | Yes — via section inheritance       |
| Tonality hint      | `{Ab major}` … `{home}` / `{}` | From its position to the next hint or end of section | **No** — section-local, never leaks |

A key string is always a root note plus a mode: `C major`, `A minor`, `F# dorian`, `E aeolian`, `D mixolydian`. Bare note names (`C`, `Am`) are rejected by the parser.

## Sticky section inheritance

A section with **no** `key:` header inherits the **previous section's declared header key** — not `song.key`, and not a tonality hint. The first section falls back to `song.key`, then `null`.

```
resolvedSectionKey[0] = sections[0].key ?? song.key
resolvedSectionKey[i] = sections[i].key ?? resolvedSectionKey[i - 1]
```

```
---
key: C major
---

[Verse]                    → C major   (from song.key)
[Chorus] key: Eb major     → Eb major  (declared)
[Outro]                    → Eb major  (inherited from [Chorus], NOT C major)
```

This is computed by `resolveSectionKeys(song): (string | null)[]` (exported from the package). It is a **read-time helper**, not a parse-time mutation — `section.key` still reports only what was written in the source, so tools can distinguish "declared" from "inherited".

`analyseSong` uses this chain for each section's `homeKey`; see [harmonic-analysis.md](harmonic-analysis.md).

## `normalise` never overrides a declared key

`normaliseSong` (CLI: `grigson normalise`):

- **`song.key` present** → kept verbatim in the output front matter. Even if the chords fit another key better, it is **not** corrected — the validator flags it instead.
- **`song.key` absent** → a key is detected from section 0's chords and inserted. This is the only place `normalise` invents a key.
- **Never writes a per-section `key:`** that wasn't in the source. A keyless section stays keyless (its chords are still spelled against the inherited key).
- **Redundant section-key hoisting** — if every section carries an explicit `key:`, they are all equal, and they don't conflict with a front-matter key, the value is promoted to front matter and the per-section tokens are stripped. This mirrors the uniform-meter hoist.
- **`--key X`** forces `X` across the whole chart and bypasses all of the above.

| `song.key` | every section keyed | section keys all equal | result                                          |
| ---------- | ------------------- | ---------------------- | ----------------------------------------------- |
| `--key X`  | –                   | –                      | force `X` everywhere                            |
| absent     | yes                 | yes                    | promote to front matter, strip section keys     |
| absent     | yes                 | no                     | `key:` = section-0 detection; keep section keys |
| absent     | no                  | –                      | `key:` = section-0 detection; keep section keys |
| present    | yes                 | all `== song.key`      | keep `song.key`, strip section keys             |
| present    | yes                 | some `!= song.key`     | keep `song.key`, keep section keys              |
| present    | no                  | –                      | keep `song.key`, keep section keys              |

## Validator key-fit diagnostics

`validate()` checks every **explicitly declared** key against the chords it governs. Blank / inherited sections are never independently flagged. See [validator.md](validator.md#key-fit) for the governed-region rules.

`ratio = declaredScore / bestScore` over the governed chords:

| ratio        | result    |
| ------------ | --------- |
| `≥ 0.85`     | silent    |
| `0.5`–`0.85` | `warning` |
| `< 0.5`      | `error`   |

**Exempt** (never flagged): relative pairs (`A minor` / `C major`), parallel pairs (`C major` / `C minor`), and modal readings of one tonic (`E minor` declared for an E-dorian tune scoring best as `D major`). These are unbreakable from chords alone.

## Autocomplete

`keyCompletions(source, line, character)` returns ranked `key:` candidates when the cursor is on a `key:` line (front matter or section header), built from `rankKeys`. The language server wires this to LSP completion — see [../language-server/README.md](../language-server/README.md).

## Related

- [key-detection.md](key-detection.md) — `detectKey`, `scoreAllKeys`, `rankKeys` scoring internals
- [harmonic-analysis.md](harmonic-analysis.md) — per-section `homeKey` resolution
- [cli.md](cli.md) — `grigson normalise` / `grigson validate`
- [validator.md](validator.md) — the `Diagnostic` interface and key-fit tiers
- [source-locations.md](source-locations.md) — `keyLoc`
