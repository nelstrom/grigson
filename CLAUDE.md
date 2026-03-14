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

Call this after implementing and testing a task. Do not edit `prd.json` by hand.

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
- Add or update `.md` files in the `documentation/` directory when relevant.
