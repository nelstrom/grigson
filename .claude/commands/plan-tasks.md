Read the following plan file and break it into tasks for the PRD.

## Plan

!`cat $ARGUMENTS`

## Instructions

Break the plan into small, independently-completable tasks — each achievable in one iteration of the agent loop. For each task:

- Choose a short kebab-case `id`
- Write a one-sentence `description`
- Write a `detail` paragraph explaining what needs to be done; include "See $ARGUMENTS for full context."
- Write `steps` as a concrete ordered list

Add tasks in dependency order using `./project/prd-add-task`. Do not edit `prd.json` directly.
