# AutoTM coding workflow

Choose the route for the task, then read its linked skill. [AGENTS.md](../../AGENTS.md) owns common constraints. The task's issue and specification own the intended outcome; source and tests establish current behavior. [CONTEXT-MAP.md](../../CONTEXT-MAP.md) locates the relevant overview. Read the [canonical domain glossary](../domain/GLOSSARY.md) when terminology matters.

| Task | Route |
|---|---|
| Shape a capability or material decision | [shape-with-docs](../../.claude/skills/shape-with-docs/SKILL.md) and, when needed, [new-adr](../../.claude/skills/new-adr/SKILL.md) |
| Create sprint issues after the shaping PR merges | [create-sprint-issues](../../.claude/skills/create-sprint-issues/SKILL.md), [issue-tracker](issue-tracker.md), and [sprint-transitions](sprint-transitions.md) |
| Execute one ready issue | [run-issue](../../.claude/skills/run-issue/SKILL.md); use [resume-issue](../../.claude/skills/resume-issue/SKILL.md) when its branch, worktree, or PR exists |
| Execute a founder-ordered queue | [run-queue](../../.claude/skills/run-queue/SKILL.md); each item follows run-issue |
| Make a small fix or resolve a PR finding | [Small changes](#small-changes-adr-0065) |
| Check progress or close a sprint | [sprint-status](../../.claude/skills/sprint-status/SKILL.md) or [close-sprint](../../.claude/skills/close-sprint/SKILL.md) |

For UI work, read [UI-MODE.md](../../.claude/skills/run-issue/UI-MODE.md) after the issue and approved design. It routes nontrivial missing design to [design-grill](../../.claude/skills/design-grill/SKILL.md). All phases follow the [worktree lifecycle](worktree-lifecycle.md).

## Issue execution

The [run-issue skill](../../.claude/skills/run-issue/SKILL.md) owns the ordered actions. Its references own the detail: [Execution state](../../.claude/skills/run-issue/EXECUTION-STATE.md) for reservation and checkpoints, [Verification](../../.claude/skills/run-issue/VERIFICATION.md) for evidence, [Finalization](../../.claude/skills/run-issue/FINALIZATION.md) for review and merge, and [Bail and recovery](../../.claude/skills/run-issue/BAIL-AND-RECOVERY.md) for interrupted work. Use those references at their phase instead of treating this router as a second checklist.

The issue must be open, labelled `ready-for-agent`, have no unresolved dependency, and state testable acceptance criteria. One issue owns one `agent/issue-<N>` branch, draft PR, integration owner, and mutable PR Execution state, and has at most one writing worktree at a time. Issues the founder groups under one parent spec share one integration branch and PR instead ([ADR-0084](../adr/0084-related-issues-of-one-parent-may-ship-on-one-integration-branch.md), [run-queue](../../.claude/skills/run-queue/SKILL.md#integration-branches)). A later implementer never writes in a worktree another agent owns; it starts in a new worktree from the pushed branch under the [host-specific lifecycle](worktree-lifecycle.md#queue-implementer-worktrees). Push the reservation branch before editing. Existing state routes to resume-issue. Record completed criteria, verification, failures, reviews, and the next action in the PR, so another supported client can resume from Git and GitHub evidence.

Before production implementation, follow [Acceptance evidence](../../.claude/skills/run-issue/VERIFICATION.md#acceptance-evidence), the procedure accepted in [ADR-0070](../adr/0070-test-first-behaviour-and-ui-evidence.md). Run focused checks as changes are made and preserve meaningful checkpoint commits. The final reviewed commit needs green hosted repository tests, repository typecheck, affected lint, and applicable build, runtime, integration, and UI evidence. Under [ADR-0075](../adr/0075-railway-pr-backends-for-agent-native-sessions.md), the hosted required `pr` check supplies container-backed end-to-end and race-test evidence. Locally run `pnpm test:unit` and focused non-container checks; do not start Docker to repeat hosted container gates. Native sessions use the PR Railway backend through the [mobile procedure](mobile-expo.md#railway-pr-backend-sessions). A change after verification invalidates evidence for the inputs it affects. Missing output or an interrupted command is `unknown`. [ADR-0067](../adr/0067-targeted-intermediate-reviews-and-final-verification.md) explains the checkpoint and intermediate-review choice.

Final Standards and Spec reviews use fresh, independent, read-only contexts pinned to the same commit. They may run concurrently. Each verdict is a PR comment with axis, reviewer, provider, client, commit SHA, and pass or findings. The [finalization reference](../../.claude/skills/run-issue/FINALIZATION.md) owns findings, delta reviews, auto-merge safety, and closure. Both axes must pass for the latest commit, directly or as carried forward under ADR-0065, and the required `pr` check must be green before GitHub merges. No agent self-approves or bypasses protection. Production promotion, rollback, live-data migration, credentials, paid resources, store submission, and destructive recovery remain human-owned.

## Sliced issues (ADR-0082)

[ADR-0082](../adr/0082-an-issue-may-carry-up-to-three-ordered-slices.md) lets one issue carry up to three ordered slices. It still owns one branch, one draft PR, one Execution state and one writing worktree.

- **Gate.** One user-visible outcome; at most three slices, each depending on the one before; a slice that changes authentication or sessions, upload ownership, a destructive or data-moving migration, the worker, or external egress is its own issue; about 800 changed lines excluding tests, generated files, snapshots and lockfiles. Slices that could run in parallel stay separate issues. A three-slice issue goes to a Claude Opus or Codex implementer.
- **Issue body.** Each slice is a numbered section with its own acceptance criteria and one focused check.
- **Execution.** Work the slices in order. After each one, run its check, push a checkpoint commit and tick the slice in Execution state with the commit SHA; resume at the first unticked slice. Past the diff budget, stop at the next slice boundary and report, and the remaining slices move to a follow-up issue.
- **Real-path proof.** At least one test or native capture exercises the outcome with no mock on the seam between slices.
- **Review.** One Standards and one Spec review at the final head; Spec checks every slice's criteria and the real-path proof. At least one of the two runs on a different model than the implementer, or the verdict records that none was available. One native capture session covers the issue.

## Small changes (ADR-0065)

[ADR-0065](../adr/0065-small-changes-skip-the-issue-ceremony.md) governs these exceptions.

- A review finding of about 50 lines or fewer, within the PR's scope and without a migration, contract change, or product decision, is fixed in that PR. One fresh read-only `Delta` reviewer checks the new commits and says which earlier verdicts still hold. An affected axis receives a full re-review. During the [ADR-0083](../adr/0083-a-standards-reviewer-may-commit-small-fixes.md) trial, the Standards reviewer itself may commit such a fix when it changes no behaviour an acceptance criterion covers; Spec stays read-only and the `Delta` review still follows ([FINALIZATION](../../.claude/skills/run-issue/FINALIZATION.md#independent-review)).
- A no-issue PR may cover about 50 lines or fewer excluding tests when it makes no migration, API contract, auth, deployment or production-configuration, ADR, agent-workflow policy, product, or architecture change. Use `fix/<slug>` or `chore/<slug>`, one fresh `Standards + Spec` review, and a green required `pr` check.
- Batch non-blocking follow-ups by area as ADR-0065 specifies. Blocking findings are fixed before merge.

## Document and client boundaries

The [glossary](../domain/GLOSSARY.md) defines terms, not scope or implementation. The owning PRD or issue establishes intended behavior; source, schema, tests, and runtime establish current behavior; relevant ADRs explain decisions. Read roadmap and sprint plans for scheduling, not for every code change. [Domain guidance](domain.md) owns document mutability and overview updates. Do not edit merged ADRs or locked sprint plans to reflect later work.

Codex desktop, Claude Code desktop, and `claude-kimi` use the same repository policy and tracked skills. [CLAUDE.md](../../CLAUDE.md) loads AGENTS.md for Claude-compatible hosts. A client without automatic skill discovery opens the linked `.claude/skills/<name>/SKILL.md` manually. [ADR-0059](../adr/0059-kimi-code-as-a-third-interactive-coding-agent.md) governs Kimi provider attribution; [ADR-0064](../adr/0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md) governs reviewer eligibility. Record the actual provider and client rather than inferring one from the other. Do not query provider quota before starting an issue; durable checkpoints handle interruption.

For Codex queue dispatch, use the [queue model profile](queue-models.md) and [host-specific worktree lifecycle](worktree-lifecycle.md#queue-implementer-worktrees) under [ADR-0071](../adr/0071-codex-queue-models-and-owned-worktrees.md). Claude role defaults remain host-specific.
