# ADR-0069: Queue implementers run in host-created worktrees

- **Status**: Proposed
- **Date**: 2026-09-29
- **Deciders**: AutoTM founder
- **Complements**: [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)'s one worktree per issue, by saying who creates it and who may write to it, and [ADR-0066](0066-retire-sandcastle-queue-agents-replace-unattended-dispatch.md)'s `run-queue` sessions, by splitting a queue session into an orchestrator and one implementer agent per issue. Both remain in force.

## Context

`run-queue` and ADR-0058 give each issue its own linked worktree, but no document says who creates it or which session may write in it. During `/run-queue 364 377 359 368 370 369 371 373 374`, the queue session created `.claude/worktrees/queue-issue-359` and `queue-issue-370` with `git worktree add` and edited them from its own session. Claude Code desktop confines each session to its own worktree and refused those Edit and Write calls. The session then wrote through Bash and Python, which got around the guard (#455). That bypass is the failure this decision forbids.

Claude Code's Agent tool can start a subagent with `isolation: "worktree"`. The host then creates a worktree under `.claude/worktrees/` that belongs to that subagent. It removes the worktree when the subagent finishes without changes. A worktree with changes stays on disk. The host's periodic sweep removes it only once it is old enough and holds no changed or untracked files and no unpushed commits.

On 2026-09-29 a queue session piloted this for issue #359 (PR #453):

- The host created `.claude/worktrees/agent-<id>`, locked while the agent ran, clean, on a throwaway `worktree-agent-<id>` branch at the session's base commit.
- The agent checked out `origin/agent/issue-359` with a detached HEAD, because the named branch was checked out in another worktree. It pushed three fast-forward checkpoints with `git push origin HEAD:agent/issue-359`: e91e361, c39663d, and 96adb05.
- Every write inside its own worktree and `/tmp` was allowed: edits, `eslint --fix`, file removal, commits, and pushes. It wrote nothing in any other worktree, and the orchestrator's guard did not block it.
- The repository typecheck (11/11), lint (11/11), all tests, the Expo check, and the iOS export passed from that worktree against a disposable CI service stack.
- The guard refused three commands because it could not verify they stayed inside the worktree: a multi-step heredoc, `set -a && source <file>`, and `env $(cat <file>) pnpm …`. Passing the CI-only values from `scripts/ci-services.sh` as literal `VAR=value` prefixes worked. `prisma generate` and lint need `DATABASE_URL` set this way, as CI sets it through `GITHUB_ENV`.
- A second isolated agent later merged `main` into PR #453 from its own worktree with no guard messages.
- A read-only Delta reviewer with no worktree passed the fix. The orchestrator posted its verdict, and #453 auto-merged with green checks.
- Issues #368, #377, and #455 started the same way with `git switch -c agent/issue-<N> origin/main`.
- The host had no way to message an agent after it finished, so each fix round needed a fresh agent.

Later the same day the queue ran four implementers in parallel. The account's API session limit stopped all four. The host could not resume a stopped agent with its context, and the work each had not committed and pushed was stranded in its worktree. A fresh agent could read those files but could not continue in that worktree, because it belongs to the stopped agent.

## Decision

**A `run-queue` session is an orchestrator. It starts each issue's implementer as a subagent in a worktree the host creates for it, and that worktree is the issue's ADR-0058 worktree. No agent writes to a worktree that another session or agent owns, and no agent gets around a host guard.**

- **Ownership.** An agent writes only in its own worktree and in `/tmp`. When the host refuses a write, the agent stops and reports the exact message. It never retries through a shell command, a script, or another tool.
- **Orchestrator.** It orders the queue, launches implementers and reviewers, posts review verdicts, sets ready and auto-merge, and reports. It changes no issue's files.
- **Branch handoff.** The first implementer for an issue runs `git fetch origin` and `git switch -c agent/issue-<N> origin/main`, or starts from the parent branch head when stacked, and pushes the reservation. A later implementer for the same issue checks out the pushed head detached with `git switch --detach origin/agent/issue-<N>` and pushes with `git push origin HEAD:agent/issue-<N>`. Pushes are fast-forwards, except the stacking rebase, which names the expected head with `--force-with-lease=agent/issue-<N>:<sha>`.
- **Commands.** Implementers keep Bash commands plain enough for the guard to verify. They pass environment values as literal `VAR=value` prefixes, not through `source` or `env $(…)`.
- **Checkpoints.** Implementers commit and push small checkpoints often, at least after each meaningful step, and keep the PR's Execution state current. Only pushed work survives an agent that stops.
- **Fix rounds.** A finished subagent cannot be messaged. Each fix round starts a fresh implementer from the PR: its Execution state, the review comments, and the branch head. The orchestrator turns auto-merge off before it launches one.
- **Resuming a stopped implementer.** A stopped agent cannot be resumed with its context either. The orchestrator starts a fresh implementer from the pushed branch, in a new host-created worktree. That agent may read files in the stopped agent's worktree to salvage uncommitted drafts. It never writes there or runs git against it.
- **Reviewers.** Standards, Spec, and Delta reviewers are separate fresh agents, read-only and pinned to one commit. A reviewer may check out that commit in its own host-created worktree. It never edits, commits, or pushes.
- **Concurrency.** ADR-0064 still sets no limit on issues in flight. The orchestrator runs about two implementers at a time. Each worktree has its own install, each full gate run starts its own service stack, self-hosted CI may share the machine, and parallel agents share one account's API session limit. Issues waiting on CI or review need no running implementer.
- **Cleanup.** The host removes an implementer worktree that has no changes. The orchestrator never removes another agent's worktree, including a stopped one. After the PR merges, it checks the worktree lifecycle's cleanup gate and gives the user the cleanup tuple and commands, or leaves the worktree to the host's sweep. The user or the host removes stopped implementers' worktrees.
- **Hosts without the tool.** When the host cannot start a subagent in its own worktree, the founder runs one session per issue with `run-issue`, in the queue order. Each session works in the worktree its host gave it, or in one it created for itself under the worktree lifecycle.

## Consequences

### Positive

- Each issue gets its own worktree, and no session writes outside the worktree it owns, so the host guard holds.
- The orchestrator keeps the queue's context while each implementer and reviewer starts fresh.
- A fix round starts from the PR alone, which the ADR-0058 Execution state already supports.

### Negative / accepted costs

- A fresh implementer per fix round reloads the issue and code, so a small fix costs a full agent start.
- Each implementer worktree needs its own dependency install before its gates.
- Guard-friendly commands are more verbose: literal environment prefixes instead of an env file.
- A worktree with commits stays on disk until the user or the host's sweep removes it; the orchestrator can only report it. A stopped implementer's worktree with uncommitted files stays until the user removes it.
- Work an implementer did not push is lost to the queue when it stops; a fresh agent can only copy it by reading the files.
- About two implementers at a time is slower than a wide fan-out, but fewer agents lose work when an account limit stops them all.
- The mechanism depends on a host feature. A host without it falls back to one session per issue, started by the founder.

### Neutral

- ADR-0058's branch, draft PR, Execution state, fixed-commit review, and merge contract are unchanged.
- ADR-0066's `run-queue` sessions stay the way to work several issues.
- Application code, CI, and the host guard do not change.

## Alternatives considered

- **The orchestrator creates worktrees with `git worktree add` and edits them.** Rejected. The desktop host refuses those edits, and writing through the shell to get around it defeats the guard.
- **One worktree for the whole queue, switching branches per issue.** Rejected. It breaks ADR-0058's one worktree per issue and disturbs a PR that is waiting on CI or a fix.
- **One long-lived implementer per issue that receives fix requests as messages.** Rejected for now. The host cannot message a finished subagent.
- **Run one implementer per queued issue at once.** Rejected. Four parallel implementers all stopped at the account's API session limit, and each stranded its unpushed work.
- **Continue a stopped implementer's worktree from a fresh agent.** Rejected. That worktree belongs to another agent, so writing there is the bypass this decision forbids.
- **Widen the host guard to cover the orchestrator's issue worktrees.** Out of scope. The guard protects other sessions' work, and this repository does not configure it.

## References

- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) - portable execution and pull-request gates
- [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md) - review providers and concurrency
- [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md) - small changes and delta reviews
- [ADR-0066](0066-retire-sandcastle-queue-agents-replace-unattended-dispatch.md) - queue agents replace unattended dispatch
- [`.claude/skills/run-queue/SKILL.md`](../../.claude/skills/run-queue/SKILL.md) - queue execution
- [`.claude/skills/run-issue/SKILL.md`](../../.claude/skills/run-issue/SKILL.md) - issue execution
- [`docs/agents/worktree-lifecycle.md`](../agents/worktree-lifecycle.md) - worktree ownership and cleanup
- Issue [#455](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/455) and pilot PR [#453](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/453)
- [Claude Code worktrees](https://code.claude.com/docs/en/worktrees) - subagent worktree isolation and cleanup
