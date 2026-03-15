# Working with this repository

## PRD workflow

Tasks are tracked in `project/prd.json`. Use the provided scripts — do not read or edit `prd.json` directly.

### View incomplete tasks

```bash
./project/prd-status        # id + description
./project/prd-status -d     # + detail
./project/prd-status -v     # + steps
```

### Mark a task complete

```bash
./project/prd-done <task-id>
```

Call this after implementing and testing a task.

**Do not add, remove, or modify tasks in `prd.json` directly.** Only the user adds tasks. The only permitted write is marking a task complete via `prd-done`.

### Task execution loop

```bash
./project/claude-once.sh       # one task via Claude
./project/gemini-once.sh       # one task via Gemini
./project/gemini-afk.sh <n>    # n tasks via Gemini, unattended
```

## General conventions

- Run tests with `pnpm test` from the repo root.
- Append task summaries to `project/progress.txt` after completing each task.
- Commit changes at the end of each task.

## Documentation

Each package has a `README.md` for an overview of that package. Update it when the package's public API or behaviour changes.

Deeper documentation belongs in `packages/grigson/documentation/` when it relates to the core grigson package (parsing, rendering, validation, harmonic analysis, etc.). For other packages, keep additional docs alongside the package — e.g. `packages/language-server/`, `packages/vscode-extension/`.

When completing a task, ask: does this change affect something a user or integrator would need to know? If so, update or create the relevant `.md` file rather than leaving it undocumented.
