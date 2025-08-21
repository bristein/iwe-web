---
description: 'Analyze and address a GitHub issue for this repository'
---

# /gh-issue [issue-number]

## Execution

### 📋 STEP 1: READ REQUIREMENTS

Claude, read the rules in @CLAUDE.md, then use sequential thinking and proceed to the next step.
STOP. Before reading further, confirm you understand:

1. You must prioritize code reuse and consolidation
2. Creating new files requires justification
3. Every suggestion must reference existing code
4. Violations of these rules make your response invalid

CONTEXT: Previous developer was terminated for ignoring existing code and creating duplicates. You must prove you can work within existing architecture.

MANDATORY PROCESS:

1. Start with "COMPLIANCE CONFIRMED: I will prioritize reuse over creation"
2. Analyze existing code BEFORE suggesting anything new
3. Reference specific files from the provided analysis
4. Include validation checkpoints throughout your response
5. End with compliance confirmation

RULES (violating ANY invalidates your response):
❌ No new files without exhaustive reuse analysis
❌ No rewrites when refactoring is possible
❌ No generic advice - provide specific implementations
❌ No ignoring existing codebase architecture
✅ Extend existing services and components
✅ Consolidate duplicate code
✅ Reference specific file paths
✅ Provide migration strategies

#### Workflow Instructions

Use the `gh` CLI to analyze the GitHub issue you are tasked with addressing.

- Read and Analyize the GitHub issue
- Analyze what Agents you have at your disposal in this project for proper task delegation
- Use Sequential thinking to create a robust plan for implementation
  - Include a full test strategy
  - Include thinking through edge cases
- Delegate tasks to subagents. Ensure the subagents are seeded with proper context and clear instructions about what their primary task is, and any secondary tasks that should be accomplished as well.
- Use the Test Engineer subagent to analyze your original test strategy
- Update the test plan and use the Test Engineer subagent to implement the test plan
- Use the instructions in @.claude/commands/code-review.md to submit the code review and address feedback in a loop before merging the code

FINAL REMINDER: If you suggest creating new files, explain why existing files cannot be extended. If you recommend rewrites, justify why refactoring won't work.

### 🔍 STEP 2: ANALYZE CURRENT SYSTEM

Analyze the existing codebase and identify relevant files for the requested feature implementation.
Then proceed to Step 3.

### 🎯 STEP 3: CREATE IMPLEMENTATION PLAN

Based on your analysis from Step 2, create a detailed implementation plan for the requested feature.
Then proceed to Step 4.

### 🔧 STEP 4: PROVIDE TECHNICAL DETAILS

Create the technical implementation details including code changes, API modifications, and integration points.
Then proceed to Step 5.

### ✅ STEP 5: FINALIZE DELIVERABLES

Complete the implementation plan with testing strategies, deployment considerations, and final recommendations.

### 🎯 INSTRUCTIONS

Follow each step sequentially. Complete one step before moving to the next. Use the findings from each previous step to inform the next step.
