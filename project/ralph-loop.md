# Ralph Loops

Automation scripts for executing project tasks using different AI models.

## Available Scripts

### `claude-once.sh`
Runs a single task from the PRD using the `claude` CLI.
- **Permission Mode**: `acceptEdits` (asks for confirmation for non-edit write actions).
- **Usage**: `./project/claude-once.sh`

### `gemini-once.sh`
Runs a single task from the PRD using the `gemini` CLI.
- **Sandboxing**: Uses macOS `sandbox-exec` via the `-s` flag.
- **Approval Mode**: `yolo` (auto-approves all tool actions).
- **Usage**: `./project/gemini-once.sh`

### `gemini-afk.sh`
A looping version of the Gemini script that iterates multiple times.
- **Sandboxing**: Uses macOS `sandbox-exec`.
- **Approval Mode**: `yolo`.
- **Usage**: `./project/gemini-afk.sh <iterations>`
  - Example: `./project/gemini-afk.sh 5`

## Design Patterns

- **Task-Based Execution**: All scripts rely on `project/prd.json` to identify and mark tasks as complete.
- **Progress Tracking**: Summaries of each completed task are appended to `project/progress.txt`.
- **Single Task Constraint**: To avoid errors and maintain clarity, each iteration is strictly limited to one task at a time.
- **Sandboxing**: Gemini scripts use the macOS `sandbox-exec` feature to safely isolate shell commands and file modifications.
