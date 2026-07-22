---
name: create-sprint-issues
description: Converts one shaped AutoTM sprint document into a confirmed parent issue and dependency-ordered child issues, then starts the sprint through a roadmap pull request. Use when the user invokes /create-sprint-issues or asks to prepare GitHub issues for a specific pending sprint.
argument-hint: "[sprint-number]"
arguments:
  - sprint
disable-model-invocation: true
---

# Create sprint issues

Create issues for exactly one already-shaped sprint. Do not shape a sprint, invent S11, or start execution.

## Read and resolve

1. Read `CLAUDE.md`, `GRILL-OUTCOME.md`, `docs/prd/03-roadmap.md`, ADR-0019, ADR-0020, `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and the candidate sprint file.
2. If `$sprint` is empty, list eligible pending sprint files and ask the user to choose. If none exist, report that sprint shaping is required and stop.
3. Verify the prior sprint is shipped, the sprint plan exists and is still eligible to start, required labels exist, and no completed issue set already owns the sprint.
4. If a parent or children already exist, inspect the partial run. Report a complete set and stop; otherwise offer repair rather than duplication.

## Propose first

Follow [SLICING.md](SLICING.md) to extract the demo line, DoD, risks, platform gates, and a dependency-ordered set of small vertical slices.

Show before mutation:

- parent title/body and labels;
- every child title, purpose, acceptance criteria, expected files, area/type/phase labels;
- AFK (`ready-for-agent`) versus HITL (`ready-for-human`) classification;
- dependency graph and topological creation order; and
- roadmap change and proposed branch/PR.

Allow edits and re-preview until the user confirms or cancels. One explicit confirmation authorizes issue creation and the roadmap-start branch/PR; it does not authorize running Sandcastle or `/run-issue`.

## Create

Follow [CREATION.md](CREATION.md):

1. Create the parent and capture its actual number.
2. Create children in topological order, using returned numbers rather than predictions.
3. Patch dependent bodies and the parent tasklist with actual numbers.
4. Verify titles, bodies, labels, dependencies, and links from GitHub.
5. Only after the complete issue set verifies, update the roadmap from pending to in progress on a small docs branch and open the authorized PR.

## Failure behavior

- Never create missing labels silently.
- Never auto-close successfully created issues after a partial failure.
- Keep the roadmap pending until issue creation is complete.
- Report exact created numbers and failed steps, then offer repair/resume.
- Never edit a locked sprint plan during creation.

## Completion

Report the parent, ordered children, AFK/HITL split, dependency graph, roadmap PR, and the first unblocked action. Do not launch it.
