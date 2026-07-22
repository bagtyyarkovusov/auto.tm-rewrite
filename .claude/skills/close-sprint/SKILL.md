---
name: close-sprint
description: Audits a completed AutoTM sprint against its plan and shipped evidence, drafts an append-only retrospective, and offers bounded documentation remediations. Use when the user invokes /close-sprint or asks to reconcile and close a shipped sprint.
argument-hint: "[sprint-number]"
arguments:
  - sprint
disable-model-invocation: true
---

# Close one sprint

Run a two-phase workflow: read-only audit first, approved writes second. Never make GitHub or repository mutations during the audit.

## Resolve and check readiness

1. Read `CLAUDE.md`, `GRILL-OUTCOME.md`, the roadmap, ADR-0019, ADR-0020, issue-tracker guidance, the sprint plan, and any existing retro.
2. Use `$sprint` when supplied. Otherwise inspect the most recently shipped sprint; do not silently walk backward past an existing retro.
3. Verify the parent and every child are closed and the roadmap row is `🟢`.
4. If any precondition fails, produce a closure-readiness report and stop before drafting or writing a retro.
5. If a retro exists, report “already closed.” Offer only a dated append-only addendum after explicit approval; never overwrite it.

## Phase 1 — audit and draft

Follow [AUDIT.md](AUDIT.md) to compare the locked sprint promise with issues, merged PRs, tests, host evidence, architecture, dependencies, current-state docs, ADRs, and roadmap state.

Draft the retrospective in conversation using [RETRO_TEMPLATE.md](RETRO_TEMPLATE.md). When no next-sprint artifact exists, state that shaping is required; never generate the next sprint here.

Show each proposed remediation separately with evidence and allowed artifact type. Do not write files yet.

## Phase 2 — approved remediation

After explicit approval, follow [REMEDIATION.md](REMEDIATION.md):

- write a new retro, or append a dated addendum when approved;
- apply only approved factual corrections to mutable documents;
- never edit merged ADRs, `GRILL-OUTCOME.md`, the locked sprint plan, or historical retro entries;
- route missing decisions to `/new-adr` and charter changes to a separate grill; and
- do not close issues/PRs or change labels.

File writes, branch/commit, push, PR creation, and merge are distinct gates. Do not push directly to `main`, self-approve, or auto-merge.

## Completion

Report shipped-versus-planned, gaps, drift, host/CI evidence, approved writes, skipped proposals, next-bet prerequisites, branch/PR state, and unresolved operational follow-ups.
