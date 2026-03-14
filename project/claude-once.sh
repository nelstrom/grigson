#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"
TASKS=$("$DIR/prd-status" -v)

claude --permission-mode acceptEdits "$(cat <<EOF
Incomplete tasks in the PRD:

$TASKS

@project/progress.txt
1. Choose the highest-priority incomplete task from the list above and implement it.
2. Run pnpm test. Fix any failures before proceeding.
3. Run ./project/prd-done <task-id> to mark the completed task as done.
4. Append a summary of what you did to project/progress.txt.
5. Add or update .md files in the documentation directory.
6. Commit your changes.
ONLY DO ONE TASK AT A TIME.
EOF
)"
