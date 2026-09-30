---
name: run-queue
description: Works a founder-given ordered list of AutoTM issues from one orchestrator session. The orchestrator starts each issue's implementer in a worktree the host creates for it; each issue still gets its own run-issue branch, draft pull request, execution state, and fixed-commit reviews. The orchestrator sets auto-merge when both axes pass and starts the next ready issue without waiting for CI. Use when the user invokes /run-queue with issue numbers or asks one agent to work a queue of issues.
argument-hint: "[issue numbers in order, with dependencies]"
arguments:
  - queue
disable-model-invocation: true
---

# Run a queue of issues

One orchestrator session owns a queue from start to finish, so it keeps context between related issues and does not wait idle for CI. It does not implement. Under this skill the orchestrator is the issue's integration owner, as run-issue, FINALIZATION, and ADR-0064 and ADR-0067 mean the term. Each issue's implementer is a separate agent in its own worktree, as [ADR-0069](../../../docs/adr/0069-queue-implementers-run-in-host-created-worktrees.md) decides. Every issue still follows [run-issue](../run-issue/SKILL.md) and the [coding workflow](../../../docs/agents/coding-workflow.md) in full; this skill adds ordering, implementer handoff, auto-merge, and stacking.

## Accept the queue

1. The founder supplies the queue: issue numbers in order, and optionally which issues wait for which. Human selection sets the order ([ADR-0058](../../../docs/adr/0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)). Never add issues the founder did not list. If `$queue` is empty, ask for it.
2. For each listed issue, read its `## Depends on` section, labels, comments, and any branch or PR. Build the order: listed order, moved later only when a dependency is still open.
3. Skip, and report, any issue that is closed, labelled `ready-for-human`, or already owned by another open branch or PR. An existing branch or PR for a listed issue is resumed through [resume-issue](../resume-issue/SKILL.md) only when it has no other live owner.
4. Never query provider quota. Implementers push checkpoints often, so another agent can resume any issue from its PR if a session stops.
5. Confirm the host can start a subagent in a worktree it creates for that subagent, such as Claude Code's Agent tool with `isolation: "worktree"`. If it cannot, see [Hosts without isolated subagents](#hosts-without-isolated-subagents).

## Agent types and models

The founder fixed the model per role ([#455](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/455)). Launch these project agent types from [.claude/agents](../../agents):

| Role | Agent type | Model | Effort |
|---|---|---|---|
| Implementer, bug fixer, review-finding fixer | `queue-implementer` | Sonnet 5.5 (`claude-sonnet-5-5`) | high |
| Standards, Spec, or Delta reviewer | `queue-reviewer` | Opus 5.5 (`claude-opus-5-5`) | high |

The first file in a new `.claude/agents/` directory needs a session restart before the host picks it up. Until then, the agent types are missing. Launch a reviewer as the built-in `Plan` type, which has no Edit or Write, with `model` set to Opus. Launch an implementer as `general-purpose` with `model` set to Sonnet and `isolation: "worktree"`. Effort follows the session.

## Implementers and worktrees

Each implementer gets its own linked worktree, and an issue has at most one writing worktree at a time ([ADR-0069](../../../docs/adr/0069-queue-implementers-run-in-host-created-worktrees.md), amending ADR-0058). The host creates it; the orchestrator never does.

- **Who creates it.** The orchestrator launches the implementer with worktree isolation. The host creates the worktree under `.claude/worktrees/` on a throwaway `worktree-agent-<id>` branch, and it belongs to that implementer.
- **Who writes to it.** Only its implementer. Every agent writes only in its own worktree and in `/tmp`. If the host refuses a write, the agent stops and reports the exact message. It never retries through a shell command, a script, or another tool. The orchestrator never edits, formats, or commits in an implementer's worktree, and never creates issue worktrees with `git worktree add`.
- **How it reaches the issue branch.** The first implementer runs `git fetch origin`, then `git switch -c agent/issue-<N> origin/main` (or from the parent branch head when stacked), and pushes the reservation with `git push -u origin agent/issue-<N>`. A later implementer for the same issue runs `git fetch origin`, `git switch --detach origin/agent/issue-<N>`, and pushes with `git push origin HEAD:agent/issue-<N>`, because the named branch may still be checked out in the earlier worktree.
- **Guard-friendly commands.** Keep Bash commands plain and separate. Pass environment values, such as the CI-only values in `scripts/ci-services.sh`, as literal `VAR=value` prefixes, not through `source` or `env $(…)`. The guard refuses commands it cannot verify.
- **Checkpoints.** The implementer commits and pushes a small checkpoint after each meaningful step and keeps the draft PR's `Execution state` current. Only pushed work survives an agent that stops.
- **What to give it.** The issue number, the base (`origin/main` or the parent branch), the rules above, and what to return: PR number, head SHA, gate results, guard messages, and open decisions. The implementer runs `run-issue` through verification. The orchestrator owns review and merge.
- **Who retires it.** The host removes a worktree whose implementer made no changes. A worktree with commits or uncommitted files stays after its agent ends. The orchestrator never removes another agent's worktree, including a stopped one. After the PR merges, it checks the [cleanup gate](../../../docs/agents/worktree-lifecycle.md#safe-cleanup-gate) and gives the user the cleanup tuple and commands, or leaves the worktree to the host's sweep.

### Limits

- On a host that cannot message a finished agent, a finished or stopped implementer cannot be messaged or resumed with its context. Each fix round starts a fresh implementer from the PR: its `Execution state`, the review comments, and the branch head.
- Run about two implementers at a time. Each worktree needs its own install, each full gate run starts its own service stack, self-hosted CI may share the machine, and parallel agents share one account's API session limit. ADR-0064 still sets no limit on issues in flight; issues waiting on CI or review need no running implementer.

### Resume a stopped implementer

When an implementer stops before it reports, for example at an API session limit:

1. Read the PR's `Execution state` and the pushed branch head.
2. Launch a fresh implementer in a new host-created worktree. It checks out the pushed head with `git switch --detach origin/agent/issue-<N>`.
3. Give it the stopped agent's worktree path. It may read files there, for example with `cat`, and copy uncommitted drafts into its own worktree. It never writes in that worktree and never runs git against it.
4. Leave the stopped worktree to the user or the host's sweep, and list it in the final report.

### Hosts without isolated subagents

When the host cannot start a subagent in its own worktree, do not create worktrees for other issues or write to them. Tell the founder, who runs one session per issue with `/run-issue <N>` in the queue order. Each of those sessions works in the worktree its host gave it, or in one it created for itself under the [worktree lifecycle](../../../docs/agents/worktree-lifecycle.md).

## Per-issue loop

For the next issue whose dependencies are all closed, or whose only open dependency is a PR this queue owns (see stacking):

1. Launch the issue's `queue-implementer` as above. It runs `run-issue`: reservation branch `agent/issue-<N>`, draft PR, `Execution state`, and verification.
2. Read its report and the PR. Launch independent Standards and Spec reviewers as separate fresh `queue-reviewer` agents, read-only and pinned to the reported head SHA. Post their verdicts with their attribution, as [FINALIZATION.md](../run-issue/FINALIZATION.md#independent-review) describes. For findings, launch a fresh implementer for the fix round, then a `Delta` review when the fix qualifies under [Small changes](../../../docs/agents/coding-workflow.md#small-changes-adr-0065).
3. When both axes pass on the current commit, directly or carried forward by a `Delta` review, set auto-merge as [FINALIZATION.md](../run-issue/FINALIZATION.md#checks-and-merge) describes. GitHub merges the PR once the required `pr` check passes.
4. Do not wait for CI. Start the next ready issue. Between issues, read each open queue PR with `gh pr view <PR> --json state,mergedAt,autoMergeRequest,statusCheckRollup,comments`, and come back to it when its check fails, a reviewer or the founder comments, or it merges.
5. Before launching an implementer for a PR that has auto-merge on, run `gh pr merge <PR> --disable-auto`. A push does not cancel auto-merge, so without this GitHub would merge the unreviewed commit. Set auto-merge again after the affected reviews pass.
6. After each merge, verify the issue closed through `Closes #N`, run `git fetch origin`, and remove `blocked` from queued issues whose dependencies are now all closed, following [sprint-transitions.md](../../../docs/agents/sprint-transitions.md). Then report the implementer worktree for cleanup.

A failed check on an auto-merge PR leaves it open. A fresh implementer repairs it within `run-issue`'s three-attempt cap; a content change re-runs the affected review before auto-merge is set again.

## Stacking

When the next issue depends on a PR of this queue that is reviewed but not merged yet:

1. The parent PR's own base must be `main`: stacks are one level deep. A child waits instead when its parent is itself stacked, or when it depends on more than one unmerged PR.
2. The child's `blocked` label, if it is caused only by that parent, does not stop it. Leave the label on until the parent merges.
3. The child's implementer branches `agent/issue-<N>` from the parent's branch head, pushes it, and opens the draft PR with the parent branch as its base. It records `Stacked on: #<parent PR> at <parent head SHA>` in the `Execution state`, and updates that SHA whenever it rebases the child onto new parent commits.
4. Review the stacked PR against its own diff. Do not set auto-merge on it and never merge it into its parent branch. PR Checks runs only for pull requests into `main`, so a stacked PR has no `pr` check yet. The implementer's local gates are its evidence.
5. After the parent squash-merges, GitHub deletes the parent branch and retargets the child PR to `main`. If the base is still the parent branch, run `gh pr edit <PR> --base main` first. Then launch a fresh implementer to rebase: `git fetch origin`, `git switch --detach origin/agent/issue-<N>`, `git rebase --onto origin/main <recorded parent head SHA>`, and `git push --force-with-lease=agent/issue-<N>:<child head SHA before the rebase> origin HEAD:agent/issue-<N>`. The push after retargeting starts the `pr` check. If the check still does not start, close and reopen the PR.
6. Remove the child's `blocked` label. A clean rebase leaves the child's own diff unchanged: record a `Delta` review of the rebased commit that confirms this and carries the earlier verdicts forward. If a conflict changed the child's content, re-run the affected axes. Then set auto-merge.

Wait instead of stacking when a rebase would need a semantic conflict resolution.

## Stop and report

Pause the affected issue, comment on it, and move to the next independent issue when work needs:

- a product, design, or architecture decision;
- a human-only action, such as credentials, a store console, production, or a physical device;
- a write the host guard refuses; or
- a root failure that survived three focused repair attempts ([BAIL-AND-RECOVERY.md](../run-issue/BAIL-AND-RECOVERY.md)).

Label a paused issue `ready-for-human` only when a human must act. Stop the queue when every remaining issue is paused, blocked, or waiting on another owner.

## Final report

For each listed issue: its PR, merged commit or current state, evidence by acceptance criterion, gates run, missing evidence, follow-up issues filed, labels changed, and its implementer worktrees: cleanup tuples after merge, and the paths of stopped ones. List skipped and paused issues with the reason.
