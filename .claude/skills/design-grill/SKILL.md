---
name: design-grill
description: Runs AutoTM's pre-implementation design phase for a UI-heavy issue through foundation validation, wireframe and hi-fi designers, UX review gates, user decision frontiers, and an approval-gated docs pull request. Use when the user invokes /design-grill for an issue that needs settled design before /run-issue.
argument-hint: "[issue-number]"
arguments:
  - issue
disable-model-invocation: true
---

# Design grill

Settle design for one UI-heavy issue. Facts come from agents and repository evidence; product decisions come from the user.

## Resolve the issue

1. Read `CLAUDE.md`, charter, roadmap, [the domain glossary](../../../docs/domain/GLOSSARY.md), ADR-0019, ADR-0020, issue-tracker guidance, the issue, and every referenced PRD/flow/sprint/`CONTEXT.md` file.
2. If `$issue` is empty, list eligible UI issues and require selection.
3. Accept rich or lean bodies when problem and acceptance criteria are discoverable. Derive screens/files from read-only inspection; stop only when user-facing intent remains ambiguous.
4. Require a clean worktree and inspect existing design artifacts/branches/PRs before mutation.

The glossary controls canonical engineering and domain vocabulary. User-visible RU/TK/EN copy remains owned by actual i18n resources and approved design artifacts; never translate glossary definitions or treat them as interface copy.

## Foundation gate

Run the foundation auditor in [ORCHESTRATION.md](ORCHESTRATION.md) and classify with [FOUNDATION.md](FOUNDATION.md).

- `READY`: continue.
- `DOC_GAP`: gather facts, then ask the complete user decision frontier.
- `NEEDS_FOUNDATION`: preview one self-contained prerequisite issue; create it only after approval, link it to the target, and stop until it ships.
- `NOT_UI` or `ALREADY_DESIGNED`: report and stop or route to `/run-issue`.

Never use removed `/to-issues`, silently edit PRDs/locked sprint plans/`CONTEXT.md`, or let an oracle choose product behavior.

## Design loop

After foundation approval, create/reuse `design/issue-<N>` and follow [ORCHESTRATION.md]:

1. Sequential wireframe designer using the project `wireframe` workflow.
2. Read-only UX review; resolve all severity 3–4 findings and user decisions.
3. Sequential hi-fi designer using the project `hifi-design` workflow.
4. Final UX/accessibility/localization/microinteraction review; require each score ≥8/10 and document the path to 10/10.
5. Sanity-check artifacts against scope, current-state truth, and implementation feasibility.

Wireframe precedes hi-fi; do not parallelize dependent phases.

## Delivery

Follow [DELIVERY.md](DELIVERY.md). Show files and diff before push/PR. Merge requires a second approval or explicit opt-in auto-merge when green. Never self-approve or immediately merge after an auto-merge failure.

On success, report specs, scores, decisions, PR/merge state, and “Next: `/run-issue <N>`.” Do not create a redundant handoff artifact. On interruption, preserve exact state for resume.
