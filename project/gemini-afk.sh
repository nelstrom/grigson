#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

ulimit -n 65536
export GEMINI_SANDBOX=sandbox-exec

DIR="$(cd "$(dirname "$0")" && pwd)"

for ((i=1; i<=$1; i++)); do
  echo "--- Iteration $i of $1 ---"

  TASKS=$("$DIR/prd-status" -v)

  if [[ "$TASKS" == "All tasks complete." ]]; then
    echo "PRD complete after $((i-1)) iterations."
    exit 0
  fi

  result=$(gemini --approval-mode yolo -s -p "$(cat <<EOF
Incomplete tasks in the PRD:

$TASKS

@project/progress.txt
1. Choose the highest-priority incomplete task from the list above and implement it.
2. Run pnpm test. Fix any failures before proceeding.
3. Run ./project/prd-done <task-id> to mark the completed task as done.
4. Append a summary of what you did to project/progress.txt.
5. Add or update .md files in the documentation directory.
6. Commit your changes.
ONLY WORK ON A SINGLE TASK.
If all tasks are complete, output <promise>COMPLETE</promise>.
EOF
)" | tee /dev/stderr)

  echo "--- Iteration $i complete ---"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done
