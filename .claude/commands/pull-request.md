---
description: Create or Update the GitHub Pull Request
aliases: ['pr']
allowed-tools:
  - 'Read'
  - 'Grep'
  - 'Glob'
  - 'TodoWrite'
  - 'Bash(git add:*)'
  - 'Bash(git bisect:*)'
  - 'Bash(git branch:*)'
  - 'Bash(git checkout:*)'
  - 'Bash(git cherry-pick:*)'
  - 'Bash(git commit:*)'
  - 'Bash(git diff:*)'
  - 'Bash(git fetch:*)'
  - 'Bash(git grep:*)'
  - 'Bash(git log:*)'
  - 'Bash(git pull:*)'
  - 'Bash(git push:*)'
  - 'Bash(git mv:*)'
  - 'Bash(git rebase:*)'
  - 'Bash(git reset:*)'
  - 'Bash(git restore:*)'
  - 'Bash(git rm:*)'
  - 'Bash(git show:*)'
  - 'Bash(git stash:*)'
  - 'Bash(git status:*)'
  - 'Bash(git switch:*)'
  - 'Bash(git tag:*)'
  - 'Bash(gh run list:*)'
  - 'Bash(gh pr create:*)'
  - 'Bash(gh pr checks:*)'
  - 'Bash(gh pr comment:*)'
  - 'Bash(gh pr diff:*)'
  - 'Bash(gh pr edit:*)'
  - 'Bash(gh pr list:*)'
  - 'Bash(gh pr merge:*)'
  - 'Bash(gh pr repoen:*)'
  - 'Bash(gh pr review:*)'
  - 'Bash(gh pr status:*)'
  - 'Bash(gh pr update-branch:*)'
  - 'Bash(gh pr view:*)'
  - 'Bash(gh issue create:*)'
  - 'Bash(gh issue list:*)'
  - 'Bash(gh issue status:*)'
  - 'Bash(gh issue close:*)'
  - 'Bash(gh issue comment:*)'
  - 'Bash(gh issue delete:*)'
  - 'Bash(gh issue develop:*)'
  - 'Bash(gh issue edit:*)'
  - 'Bash(gh issue lock:*)'
  - 'Bash(gh issue pin:*)'
  - 'Bash(gh issue reopen:*)'
  - 'Bash(gh issue transfer:*)'
  - 'Bash(gh issue unlock:*)'
  - 'Bash(gh issue unpin:*)'
  - 'Bash(gh issue view:*)'
  - 'Bash(gh project field-create:*)'
  - 'Bash(gh project field-delete:*)'
  - 'Bash(gh project field-list:*)'
  - 'Bash(gh project item-add:*)'
  - 'Bash(gh project item-archive:*)'
  - 'Bash(gh project item-create:*)'
  - 'Bash(gh project item-delete:*)'
  - 'Bash(gh project item-edit:*)'
  - 'Bash(gh project item-list:*)'
  - 'Bash(gh project link:*)'
  - 'Bash(gh project list:*)'
  - 'Bash(gh project view:*)'
  - 'Bash(gh run cancel:*)'
  - 'Bash(gh run delete:*)'
  - 'Bash(gh run download:*)'
  - 'Bash(gh run list:*)'
  - 'Bash(gh run rerun:*)'
  - 'Bash(gh run view:*)'
  - 'Bash(gh run watch:*)'
  - 'Bash(gh workflow disable:*)'
  - 'Bash(gh workflow enable:*)'
  - 'Bash(gh workflow list:*)'
  - 'Bash(gh workflow run:*)'
  - 'Bash(gh workflow view:*)'
  - 'mcp__sequential-thinking__sequentialthinking'
---

# /pull-request

## Purpose

Execute git and github operations with intelligent commit messages, branch management, and GitHub PRs.

## Execution

- Analyze the current Git state and repository context, including if there is a PR already open for the current branch
  - If there is an open PR for the current branch and commits, you will be updating the PR, else you will be creating a new PR.
- Commit the local changes using `git` CLI and update/create the PR using the `gh` CLI.
- After updating the PR, wait for the following updates on the PR:
  - All GitHub actions to finish running
  - Claude Code reviewer to update the PR with their review of the changes
- Analyze the feedback from the reviewers
  - Address ALL critical issues.
  - Address ALL test failures, if for some reason the tests are not able to be run such as due to a timeout, address those issues as well
  - Analyze the remaining feedback and either: (1) Address the feedback by creating a fix, or (2) create a GitHub issue using the `gh` CLI to address the issue in the future.
- Update the PR after addressing the feedback.
- Continue the loop of watching the PR and updating the PR until there are no issues that need to be addressed.
- Once there are no more issues to be addressed, and any GitHub issues have been created, merge the PR using the `gh` CLI.
