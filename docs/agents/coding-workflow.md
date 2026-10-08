# AutoTM coding workflow

Choose the route for the task, then read its linked skill. [AGENTS.md](../../AGENTS.md) owns common constraints. The task's issue and specification own the intended outcome; source and tests establish current behavior. [CONTEXT-MAP.md](../../CONTEXT-MAP.md) locates the relevant overview. Read the [canonical domain glossary](../domain/GLOSSARY.md) when terminology matters.

| Task | Route |
|---|---|
| Shape a capability or material decision | [shape-with-docs](../../.claude/skills/shape-with-docs/SKILL.md) and, when needed, [new-adr](../../.claude/skills/new-adr/SKILL.md) |
| Create sprint issues after the shaping PR merges | [create-sprint-issues](../../.claude/skills/create-sprint-issues/SKILL.md), [issue-tracker](issue-tracker.md), and [sprint-transitions](sprint-transitions.md) |
| Execute one ready issue | [run-issue](../../.claude/skills/run-issue/SKILL.md); use [resume-issue](../../.claude/skills/resume-issue/SKILL.md) when its branch, worktree, or PR exists |
| Execute a founder-ordered queue or explicitly delegated outcome | [run-queue](../../.claude/skills/run-queue/SKILL.md); each item follows run-issue |
| Make a small fix or resolve a PR finding | [Small changes](#small-changes-adr-0065) |
| Check progress or close a sprint | [sprint-status](../../.claude/skills/sprint-status/SKILL.md) or [close-sprint](../../.claude/skills/close-sprint/SKILL.md) |

For UI work, read [UI-MODE.md](../../.claude/skills/run-issue/UI-MODE.md) after the issue and approved design. It routes nontrivial missing design to [design-grill](../../.claude/skills/design-grill/SKILL.md). All phases follow the [worktree lifecycle](worktree-lifecycle.md).

## Issue execution

[Run-issue](../../.claude/skills/run-issue/SKILL.md) owns the action sequence. Load its references at the relevant phase:

- [Execution state](../../.claude/skills/run-issue/EXECUTION-STATE.md): reservation, checkpoints and durable recovery.
- [Verification](../../.claude/skills/run-issue/VERIFICATION.md): acceptance evidence, applicable gates and failure handling.
- [Finalization](../../.claude/skills/run-issue/FINALIZATION.md): independent review, the fix round and protected merge.
- [Bail and recovery](../../.claude/skills/run-issue/BAIL-AND-RECOVERY.md): interruptions and missing authority or evidence.

[Run-queue](../../.claude/skills/run-queue/SKILL.md) owns orchestration, stacking and founder-grouped integration branches. [Resume-issue](../../.claude/skills/resume-issue/SKILL.md) inspects an existing attempt before another writer starts. These contracts retain the required review and CI gates; this router does not duplicate them.

## Push documentation separately

Push documentation, evidence and Execution-state commits separately from code, after the code head's required `pr` check is green. The next synchronize run takes the short docs lane when it can prove that only documentation changed by hand since that green head. A merge from `main` may also take that lane when its only hand changes and conflict resolutions are documentation. Missing or ambiguous checks or history take the full lane. [ADR-0091](../adr/0091-docs-lane-after-a-green-pull-request-head.md) records the decision and its accepted cost.

## Sliced issues (ADR-0082)

When an issue has ordered slices, read [Sliced issues](../../.claude/skills/run-issue/SLICED-ISSUES.md) for its eligibility, size, checkpoint and evidence rules. The governing decision is [ADR-0082](../adr/0082-an-issue-may-carry-up-to-three-ordered-slices.md).

## Small changes (ADR-0065)

[ADR-0065](../adr/0065-small-changes-skip-the-issue-ceremony.md) governs these exceptions.

- An accepted review finding is fixed in that PR, in its one fix round, and is not re-reviewed ([ADR-0085](../adr/0085-one-review-round-one-fix-round-no-re-review.md), [FINALIZATION](../../.claude/skills/run-issue/FINALIZATION.md#independent-review)).
- A no-issue PR may cover about 50 lines or fewer excluding tests when it makes no migration, API contract, auth, deployment or production-configuration, ADR, agent-workflow policy, product, or architecture change. Use `fix/<slug>` or `chore/<slug>`, one fresh `Standards + Spec` review, and a green required `pr` check.
- Batch non-blocking follow-ups by area as ADR-0065 specifies. Blocking findings are fixed before merge.

## Document and client boundaries

[Domain guidance](domain.md#document-authority) owns document roles and mutability. [AGENTS.md](../../AGENTS.md) owns shared client constraints. Clients without automatic skill discovery open the linked repository skill manually; keep one canonical copy in `.claude/skills`.

Codex queue dispatch follows the [queue model profile](queue-models.md) and [host-specific worktree lifecycle](worktree-lifecycle.md#queue-implementer-worktrees). Claude role defaults remain host-specific.

For bounded GitHub reads, issue creation and comments, use [GitHub operations](github-operations.md).
