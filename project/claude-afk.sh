#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

wait_for_reset() {
  local output="$1"
  local reset_str
  reset_str=$(echo "$output" | grep -oE 'resets [0-9]+[ap]m' | grep -oE '[0-9]+[ap]m' | head -1)

  if [[ -z "$reset_str" ]]; then
    echo "Could not parse reset time. Waiting 1 hour..."
    sleep 3600
    return
  fi

  local hour ampm
  hour=$(echo "$reset_str" | grep -oE '[0-9]+')
  ampm=$(echo "$reset_str" | grep -oE '[ap]m')

  if [[ "$ampm" == "pm" && "$hour" != "12" ]]; then
    hour=$((hour + 12))
  elif [[ "$ampm" == "am" && "$hour" == "12" ]]; then
    hour=0
  fi

  local now reset_today
  now=$(date -u +%s)
  reset_today=$(TZ=UTC date -v${hour}H -v0M -v0S +%s)

  local reset=$reset_today
  if [[ $reset -le $now ]]; then
    reset=$((reset + 86400))
  fi
  reset=$((reset + 120))

  local wait_secs=$((reset - now))
  local wait_mins=$(( (wait_secs + 59) / 60 ))
  echo "Rate limited. Waiting ${wait_mins} minutes until ${reset_str} UTC (plus 2 min buffer)..."
  sleep $wait_secs
}

DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$DIR/.." && pwd)"
SANDBOX_NAME="claude-$(basename "$PROJECT_DIR")"

ensure_sandbox() {
  if ! docker sandbox list | grep -q "$SANDBOX_NAME"; then
    echo "Sandbox missing or dead. Recreating..."
    docker sandbox rm "$SANDBOX_NAME" 2>/dev/null || true
    docker sandbox create -t claude-with-pnpm:latest claude "$PROJECT_DIR"
  fi
}

for ((i=1; i<=$1; i++)); do
  echo "--- Iteration $i of $1 ---"

  TASKS=$("$DIR/prd-status" -v)

  if [[ "$TASKS" == "All tasks complete." ]]; then
    echo "PRD complete after $((i-1)) iterations."
    exit 0
  fi

  ensure_sandbox

  result=$(docker sandbox run "$SANDBOX_NAME" -- --permission-mode acceptEdits -p "$(cat <<EOF
Incomplete tasks in the PRD:

$TASKS

@project/progress.txt
1. Choose the highest-priority incomplete task from the list above and implement it.
2. Run pnpm test. Fix any failures before proceeding.
3. Run ./project/prd-done <task-id> to mark the completed task as done.
4. Append a summary of what you did to project/progress.txt.
5. Update relevant documentation: README.md for the affected package, packages/grigson/documentation/ for core grigson topics, or alongside the package for other packages.
6. Commit your changes.
ONLY WORK ON A SINGLE TASK.
If all tasks are complete, output <promise>COMPLETE</promise>.
EOF
)" 2>&1 | tee /dev/stderr)

  if [[ "$result" == *"docker.sock"* ]] || [[ "$result" == *"daemon not ready"* ]]; then
    echo "--- Sandbox not ready on iteration $i, retrying... ---"
    sleep 5
    ((i--))
    continue
  fi

  if [[ "$result" == *"hit your limit"* ]]; then
    echo "--- Rate limit hit on iteration $i ---"
    wait_for_reset "$result"
    ((i--))
    continue
  fi

  echo "--- Iteration $i complete ---"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done
