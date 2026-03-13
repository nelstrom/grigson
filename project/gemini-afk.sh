#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

ulimit -n 65536
export GEMINI_SANDBOX=sandbox-exec

for ((i=1; i<=$1; i++)); do
  echo "--- Iteration $i of $1 ---"
  
  result=$(gemini --approval-mode yolo -s -p "@project/prd.json @project/progress.txt \
  1. Find the highest-priority task in the PRD and implement it. \
  2. Run pnpm test. Fix any failures before proceeding. \
  3. Update project/prd.json to mark the completed task as passes: true. \
  4. Append a summary of what you did to project/progress.txt. \
  5. Add or update .md files in the documentation directory \
  6. Commit your changes. \
  ONLY WORK ON A SINGLE TASK. \
  The PRD is complete when all tasks have passes: true (or are blocked)
  If the PRD is complete, output <promise>COMPLETE</promise>." | tee /dev/stderr)

  echo "--- Iteration $i complete ---"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done
