#!/bin/bash

claude --permission-mode acceptEdits "@project/prd.json @project/progress.txt \
1. Find the highest-priority task in the prd and implement it. \
2. Run pnpm test. Fix any failures before proceeding. \
3. Update project/prd.json to mark the completed task as passes: true. \
4. Append a summary of what you did to project/progress.txt. \
5. Commit your changes. \
ONLY DO ONE TASK AT A TIME."