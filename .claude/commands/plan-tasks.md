Read the following plan file and break it into tasks for the PRD.

## Plan

!`cat $ARGUMENTS`

## Instructions

Break the plan into small, independently-completable tasks — each achievable in one iteration of the agent loop. For each task:

- Choose a short kebab-case `id`
- Write a one-sentence `description`
- Write a `detail` paragraph explaining what needs to be done; include "See $ARGUMENTS for full context."
- Write `steps` as a concrete ordered list

### Task sizing

Each task should represent a meaningful unit of work that maps to a single commit with a clear, specific message. A useful check: if the commit message would be vague ("misc updates") or trivial ("add one field"), the task is too small.

Aim for tasks that touch a coherent slice of the system — e.g. "add X to the core library and update the renderer to emit it" rather than splitting those into separate tasks. If two pieces of work would naturally be done in the same sitting and can't be tested independently, combine them.

Avoid tasks that only change a handful of lines. If a task could be described as "add a field" or "rename a variable", merge it into adjacent work.

Think in terms of commit boundaries, not implementation steps. Steps belong inside a task; tasks should not be steps.

### Testing

Tests belong in the same task as the implementation — follow a red/green/refactor workflow where the tests drive the implementation, not a separate cleanup task added at the end. Do not create a standalone "add tests" task for new functionality unless the tests are unusually complex and would push the task over a reasonable size.

It is fine to have a task solely concerned with testing when it adds coverage for features that already exist in the codebase.

Add tasks in dependency order using `./project/prd-add-task`. Do not edit `prd.json` directly.
