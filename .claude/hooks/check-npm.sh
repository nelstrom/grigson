#!/bin/bash
# Blocks accidental use of npm in favour of pnpm.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if echo "$COMMAND" | grep -qE '(^|[[:space:]])npm([[:space:]]|$)'; then
  echo "This project uses pnpm, not npm. Please rerun the command with pnpm instead." >&2
  exit 2
fi
