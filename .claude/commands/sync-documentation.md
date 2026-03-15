Audit a sample of the project's documentation against the current implementation, then report findings conversationally so we can decide together whether to fix the docs or fix the code.

## Purpose

This is a continuous-improvement command, not an exhaustive audit. Each run covers a handful of areas and surfaces the most actionable gaps. Run it frequently to keep docs and code in sync over time.

## Step 1 — Orient yourself

The documentation lives in:

- `packages/grigson/documentation/` — deep docs for the core package (parsing, rendering, validation, harmonic analysis, transpose, CLI, browser bundle, deployment, testing)
- `packages/grigson/documentation/README.md` — index of the above
- `packages/grigson/README.md` — public-facing package overview
- `packages/language-server/README.md`
- `packages/textmate-grammar/README.md`
- `packages/tree-sitter-grammar/README.md`
- `packages/vscode-extension/README.md`
- `packages/website/README.md`
- `packages/website/content/` — user-facing website content (format, CLI, renderer, testing, index)

The implementation lives in:

- `packages/grigson/src/` — parser, renderer, validator, harmonic analysis, transpose, CLI, browser entry point
- `packages/language-server/src/`
- `packages/vscode-extension/src/`

## Step 2 — Pick a sample

Choose **3–5 documentation areas** to investigate this run. Vary the selection so that different areas get covered across runs. Good candidates:

- A specific deep-doc file (e.g. `renderer.md`, `transpose.md`)
- A package README
- A piece of website content
- A feature described in the docs that has corresponding source code

Use your judgement about which areas are most likely to have drifted, based on recent changes visible in the git log or the PRD.

## Step 3 — Compare docs to code

For each selected area:

1. Read the documentation in full.
2. Read the relevant source file(s).
3. Note any of these issues:
   - **Outdated** — the doc says something is "not yet built", "planned", or "coming soon" when it actually exists in the code.
   - **Incorrect** — the doc describes behaviour, an API shape, a flag, or an option that has since changed.
   - **Missing** — a feature or behaviour exists in the code but is not mentioned in any doc.
   - **Ahead of code** — the doc describes something that genuinely isn't built yet (this is intentional in doc-driven design; note it but don't flag it as a problem unless there's an obvious divergence in the *design* itself).

## Step 4 — Report findings conversationally

Present findings one area at a time. For each issue:

- Quote the relevant passage from the doc.
- Quote or describe the relevant code.
- Explain the discrepancy.
- State clearly whether you think **the doc is at fault** (needs updating to match code), **the code is at fault** (should be brought back in line with the documented design), or **it's ambiguous** (you need a decision).

Ask for a decision on each ambiguous case before moving on. When the correct fix is clear and unambiguous, you may propose the edit directly.

## Step 5 — Apply agreed fixes

After each decision, make the fix immediately: update the doc, or note that the code needs changing. Don't batch all edits to the end — fix as you go so the conversation stays focused.

## Step 6 — Wrap up

After covering your sample, summarise:
- How many areas you checked
- How many issues you found (by type: outdated / incorrect / missing / ahead-of-code)
- What was fixed in this session
- Suggestions for areas to check next run
