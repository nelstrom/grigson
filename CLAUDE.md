# Working with this repository

## PRD workflow

Tasks are tracked in `project/prd.json`. Use the provided scripts — do not read or edit `prd.json` directly.

### View incomplete tasks

```bash
./project/prd-status        # id + description
./project/prd-status -d     # + detail
./project/prd-status -v     # + steps
```

### Add a task

```bash
./project/prd-add-task <<'EOF'
{
  "id": "my-task",
  "category": "functional",
  "description": "Short description",
  "detail": "Longer explanation...",
  "steps": ["Step 1", "Step 2"]
}
EOF
```

Required fields: `id`, `category`, `description`. Optional: `detail`, `steps`.

**Always use `prd-add-task` to add tasks — never edit `prd.json` directly.** Direct edits with
Python's `json` module will corrupt non-ASCII characters (em dashes, arrows, etc.) by escaping
them to `\uXXXX` sequences. The script uses Node's `JSON.stringify` which preserves them correctly.

### Mark a task complete

```bash
./project/prd-done <task-id>
```

Call this after implementing and testing a task.

### Task execution loop

```bash
./project/claude-once.sh       # one task via Claude
./project/gemini-once.sh       # one task via Gemini
./project/gemini-afk.sh <n>    # n tasks via Gemini, unattended
```

## Architecture constraints

- **`GrigsonChart` must have no knowledge of specific renderer implementations.** It discovers renderers by duck-typing (`typeof el.renderChart === 'function'`), never by checking class names, tag names, or imports. Do not add `instanceof` checks, tag-name guards, or imports of renderer packages (`grigson-grille-harmonique-renderer`, etc.) to `packages/grigson/src/element.ts` or any other file in `packages/grigson/`. See [`documentation/browser-bundle.md`](packages/grigson/documentation/browser-bundle.md) for the renderer contract.

## General conventions

- Build all packages with `pnpm build` from the repo root (uses Turborepo — builds in dependency order, caches unchanged packages).
- Run tests with `pnpm test` from the repo root.
- Append task summaries to `project/progress.txt` after completing each task.
- Commit changes at the end of each task.

## Documentation

Each package has a `README.md` for an overview of that package. Update it when the package's public API or behaviour changes.

Deeper documentation belongs in `packages/grigson/documentation/` when it relates to the core grigson package (parsing, rendering, validation, harmonic analysis, etc.). For other packages, keep additional docs alongside the package — e.g. `packages/language-server/`, `packages/vscode-extension/`.

When completing a task, ask: does this change affect something a user or integrator would need to know? If so, update or create the relevant `.md` file rather than leaving it undocumented.
