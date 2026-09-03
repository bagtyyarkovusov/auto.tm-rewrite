# Sprint transitions

This is the canonical workflow for AutoTM Sprint starts and child-progress reconciliation. `create-sprint-issues`, `run-issue`, and `sprint-status` point here instead of carrying separate transition rules.

Git, GitHub, and local files do not share a real transaction. Treat every Sprint transition as a verified sequence with a ledger and a bounded repair path. Report success only after fresh reads show that every affected artifact agrees.

## Evidence Model

Read repository files and GitHub state again after each boundary that can change external state:

- before mutation;
- after each created or edited GitHub issue;
- after the roadmap-start commit is created;
- after the roadmap-start PR is opened;
- after a child issue closes or merges; and
- after every parent tasklist or dependent-label change.

Keep a local ledger under `/tmp/auto-tm-sprint-transition-<sprint-or-issue>-<timestamp>.md`. Record the operation, input evidence, every external mutation attempted, returned issue or PR numbers, verification result, and the next repair operation. The ledger is evidence and recovery state; do not commit it.

On failure, stop at the first unverified boundary. Do not roll back successful GitHub issue creation, delete branches, close created issues, or rewrite merged commits to make the sequence look atomic. Report the partial state, the ledger path, and one smallest safe repair.

## Sprint Start

Sprint start has two stages: create/verify the issue set, then open the roadmap-start PR. Issue creation may be authorized together with roadmap-start PR creation, but PR merge remains a separate user decision.

Before mutation:

1. Confirm the target sprint is still pending in the roadmap row and the Sprint plan is still mutable under ADR-0020.
2. Verify required labels exist.
3. Search GitHub for an existing parent and child set for this Sprint. If a complete set exists, verify and report it instead of creating duplicates.
4. Write the ledger with the planned parent, ordered children, dependencies, labels, Sprint-plan metadata change, roadmap change, and proposed branch/PR.

Create and verify the issue set:

1. Create the parent with phase + feature labels and a tasklist placeholder.
2. Create children in dependency order. Use GitHub-returned issue numbers, never predicted numbers.
3. Use actual issue numbers in each child's `## Depends on` section. If a body needs a later sibling number, patch it after that sibling exists and verify again.
4. Apply exactly one triage label to each child. Add `blocked` only while at least one listed dependency is open.
5. Patch the parent tasklist with every actual child number exactly once.
6. Re-fetch the parent and every child. Verify titles, bodies, labels, dependencies, tasklist entries, and links.

Prepare the docs transition before the Sprint locks:

1. On a focused docs branch from current `main`, update the allowed Sprint-plan status metadata from pre-start to in-progress with the actual issue numbers.
2. In the same commit, update `docs/prd/03-roadmap.md` current-sprint block and Sprint row to `🟡` with the actual date, parent, children, milestone, and Sprint doc link.
3. Do not edit Sprint DoD or scope while starting; ADR-0020 allows only the pre-lock metadata transition at this boundary.
4. Commit only those docs changes and open the roadmap-start PR.

Verify completion:

- While the roadmap-start PR is open, the parent status says `Pending roadmap-start PR` and links the PR.
- The Sprint plan metadata and roadmap row agree on Sprint number, status, start date, parent, children, and milestone.
- Fresh GitHub reads show the parent tasklist contains the complete child set and no duplicate entries.

If the issue set verifies but the roadmap-start PR fails to open, the Sprint is not fully started. Preserve the issues, leave roadmap status pending, and repair by opening the focused roadmap-start PR from the ledger.

After the roadmap-start PR merges:

1. Re-fetch the merged PR, roadmap, Sprint plan, and parent issue.
2. Verify the roadmap and Sprint-plan metadata agree on the started Sprint.
3. Update the parent status from `Pending roadmap-start PR` to `🟡 In progress` and keep the roadmap-start PR link as evidence.
4. Re-fetch the parent and verify the status changed.

The Sprint start is complete only after the post-merge parent status verifies. Until then, report a partial transition with the repair: update the parent status from the ledger and fresh roadmap reads.

## Child-Progress Reconciliation

Run this after `/run-issue` verifies that a child issue closed through the merged PR. Retries must be idempotent.

1. Resolve the Sprint parent from fresh evidence: the child body/read-first Sprint file, roadmap current-sprint block, GitHub issue links, parent tasklist search, and issue labels. If these disagree, stop and report the smallest repair.
2. Re-fetch the parent and the closed child.
3. Verify the parent tasklist already lists the child. If it does not, stop; do not guess a new parent.
4. Mark only that child complete in the parent tasklist. Preserve order, title text, and unrelated content. Do not duplicate entries.
5. Re-fetch open children listed by the parent. For each child, parse `## Depends on`; remove `blocked` only when every listed dependency is closed, and add `blocked` when an open dependency remains but the label is missing.
6. Re-fetch the parent and every affected child.
7. Report the final rollup as `closed/total`, the tasklist entry changed, and every label or body mutation made.

If the parent tasklist is already checked and labels already match dependencies, report that reconciliation was already complete.

## Read-Only Drift Detection

`sprint-status` uses this section only for reporting. It must not edit files, labels, issues, PRs, branches, or roadmap state.

Report each mismatch separately with evidence and one bounded repair:

- Roadmap is `🟡` but Sprint-plan metadata still says not started: repair by an explicit factual Sprint-plan metadata correction, if approved, without changing locked DoD or scope.
- Sprint plan says started but roadmap is still pending: repair by opening or completing the roadmap-start PR.
- Parent status says `Pending roadmap-start PR` after the roadmap-start PR merged: repair by editing the parent status to `🟡 In progress`.
- Parent tasklist differs from the child set: repair by tasklist reconciliation from fresh child issue reads.
- A child is closed but unchecked in the parent: repair by child-progress reconciliation.
- A child has `blocked` but every `## Depends on` issue is closed: repair by removing `blocked`.
- A child lacks `blocked` while a listed dependency is open: repair by adding `blocked`.
- Every child is closed but roadmap is still `🟡`: repair belongs to `close-sprint`, not `sprint-status`.

Unknown is an honest state. If a parent, child list, PR, or dependency section cannot be resolved structurally, report unknown and the evidence needed next rather than mutating.
