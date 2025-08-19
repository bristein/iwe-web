---
description: 'Analyze and address a GitHub issue for this repository'
---

# /gh-issue [issue-number]

## Purpose

Address a github issue for this repository.

## Execution

- Read and Analyize the GitHub issue
- Use Sequential thinking to create a robust plan for implementation
  - Include a full test strategy
  - Include thinking through edge cases
- Use subagents to address the issue where appropriate (ex: use a frontend engineer subagent for UI work, a DB engineer for database work, etc.)
- Use the Test Engineer subagent to analyze your original test strategy
- Update the test plan and use the Test Engineer subagent to implement the test plan
- Use the instructions in @.claude/commands/code-review.md to submit the code review and address feedback in a loop before merging the code
