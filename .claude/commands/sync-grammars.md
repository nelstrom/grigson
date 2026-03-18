Compare the Peggy grammar against the TextMate, tree-sitter, and Monarch grammars, then add tasks to the PRD for any gaps.

## Step 1 — Read the grammars

Read all four files in full:
- `packages/grigson/src/parser/grammar.pegjs` — source of truth
- `packages/textmate-grammar/grigson.tmLanguage.json` — must follow peggy
- `packages/tree-sitter-grammar/grammar.js` — must follow peggy
- `packages/website/assets/js/grigson-monarch.js` — Monaco Monarch tokenizer

## Step 2 — Identify gaps

For each syntactic construct in the Peggy grammar, check whether it is correctly represented in the TextMate, tree-sitter, and Monarch grammars. Consider:
- Rules or tokens present in Peggy but absent or incomplete in the other grammar
- Pattern differences that would cause incorrect highlighting or parsing
- New constructs in Peggy that the other grammars haven't caught up with

Do this analysis separately for each target grammar.

Note: the Monarch tokenizer does not support lookbehind/lookahead, so some TextMate patterns may be approximated. Flag approximations as gaps only if they cause visible mis-highlighting, not just because the regex form differs.

## Step 3 — Check existing tasks

Run `./project/prd-status -c grammar-sync` to list existing incomplete grammar sync tasks. For each gap you identified, check whether a task already exists that covers it (match by `id` or by reading the description). Do not create duplicate tasks.

## Step 4 — Add tasks for new gaps only

For each gap not already covered by an existing task, add a new entry to `project/prd.json`. Each task must follow this shape:

```json
{
  "id": "sync-<grammar>-<short-slug>",
  "category": "grammar-sync",  // keep this exact value
  "description": "...",
  "detail": "...",
  "steps": ["..."],
  "passes": false
}
```

Use `sync-textmate-`, `sync-tree-sitter-`, or `sync-monarch-` prefixes so sync tasks are easy to identify.

Insert new tasks at the end of the array. Do not modify any existing tasks.

## Step 5 — Summarise

Report:
- What gaps you found in each grammar
- Which tasks already existed (skipped)
- Which new tasks were added
