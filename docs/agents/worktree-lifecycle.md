# Worktree lifecycle

Use one linked worktree per agent session and retire it after its PR merges. This prevents host-created scaffold branches, canonical task branches, and full dependency trees from accumulating after successful work.

The canonical `agent/issue-<N>` branch and its pull request are the durable reservation and recovery record. Codex desktop, Claude Code desktop, the `claude-kimi` CLI, or another supported client that finds either resumes it after inspecting the issue, local and remote heads, worktree, PR body/comments/checks, running processes, and diff. It never creates a parallel attempt because the prior chat is unavailable. It resumes in the found worktree only when no other session or agent owns it; otherwise it works in its own new worktree from the pushed branch.

## Start in the worktree you already have

Some hosts create a linked worktree and a `claude/<name>` or `codex/<name>` branch before the task begins.

1. Inspect `git worktree list --porcelain`, the current branch, status, local/remote task branches, and open PRs.
2. If this is a queue implementer, follow the host-specific creation route below and preserve the parent chat's checkout. Otherwise, if the current checkout is already an isolated linked worktree, reuse it. Create or switch to the workflow's canonical branch in that worktree; do not create a second linked worktree for the same task.
3. Record any host scaffold branch and its starting SHA. It is cleanup-eligible only while it remains unchanged and has no PR or remote work.
4. Create a new linked worktree only when the current checkout is the shared repository checkout or the task explicitly needs another isolated checkout.

Write only in your own worktree and in `/tmp`. Never create a worktree for another session, and never write to one that another session or agent owns. If the host refuses a write, stop and report the exact message; never retry it through a shell command, a script, or another tool.

## Queue implementer worktrees

[ADR-0069](../adr/0069-queue-implementers-run-in-host-created-worktrees.md), amended for Codex by [ADR-0071](../adr/0071-codex-queue-models-and-owned-worktrees.md), sets who owns each worktree under [run-queue](../../.claude/skills/run-queue/SKILL.md).

- **Who creates it on Claude Code.** The orchestrator launches each implementer with worktree isolation, such as Claude Code's Agent tool with `isolation: "worktree"`. The host creates the worktree under `.claude/worktrees/` on a throwaway `worktree-agent-<id>` branch. Only its implementer writes there. An issue has at most one writing worktree at a time; each fix round or resume gets a new one, and earlier ones follow the cleanup rules below.
- **Who creates it on Codex.** Each writing subagent creates and owns a fresh separate linked worktree. Fetch the supplied base, then create an absolute unique path with `git worktree add --detach <absolute-path> <base>`, where the base is `origin/main`, the stacked parent head, or the pushed canonical issue branch for a resume. All subsequent commands and edits target that absolute directory. The coordinator supplies scope and base but never creates or writes in a writer's worktree. The parent chat's worktree stays in place. Reservation, checkpoint, refusal, and cleanup rules below still apply.
- **How it reaches the issue branch.** The first implementer runs `git fetch origin`, then `git switch -c agent/issue-<N> origin/main`, or starts from the parent branch head when stacked, and pushes the reservation. A later implementer runs `git fetch origin`, then `git switch --detach origin/agent/issue-<N>` and pushes with `git push origin HEAD:agent/issue-<N>`, because the named branch may be checked out in an earlier worktree.
- **Checkpoints.** Implementers commit and push small checkpoints often. Only pushed work survives an agent that stops.
- **Who retires it.** Claude's host may remove an unchanged worktree or sweep an eligible one. Otherwise the orchestrator or integration session retires it by running the [cleanup script](#run-the-cleanup-gate) after the PR merges and at queue end ([ADR-0076](../adr/0076-orchestrator-runs-the-worktree-cleanup-gate-after-every-merge.md)); a worktree that passes the gate needs no separate user approval, and the user can still keep any worktree. The orchestrator never removes a worktree by hand and never removes one the script keeps. A removed worktree can leave its unchanged `worktree-agent-<id>` branch behind; the script's stale-branch report lists it and `--apply` deletes it conditionally.
- **A stopped implementer.** A fresh implementer continues from the pushed branch in its own new worktree. It may read the stopped worktree to salvage uncommitted drafts, but never writes there or runs git against it. The stopped worktree is retired by the cleanup script once it passes the gate; while it holds uncommitted files the gate keeps it, and the user removes it.
- **Hosts without either isolation route.** The orchestrator does not create or write to issue worktrees. The founder runs one `run-issue` session per issue in the queue order, and each session uses the worktree its host gave it or creates its own under this lifecycle.

## Treat merge and cleanup as separate results

`gh pr merge --squash --delete-branch` can merge the PR and delete the remote branch, then exit non-zero because the local branch is still checked out in a linked worktree. Always verify the PR state and merge commit independently from the command's exit status.

After a successful merge, record this cleanup tuple:

- linked worktree path;
- local task branch and any unchanged host scaffold branch;
- task branch HEAD, which must equal the PR's final `headRefOid`. For a queue implementer's worktree on a detached HEAD, record the detached HEAD SHA instead of a task branch;
- PR URL and merge commit.

An agent whose live session uses that linked worktree reports the tuple instead of deleting its own working directory. The root or integration session removes it after the worker session finishes by running the [cleanup script](#run-the-cleanup-gate), which finds the worktree by the same gate. The tuple remains the manual record when the script is unavailable.

## Safe cleanup gate

The root or integration session retires a completed worktree, with the [cleanup script](#run-the-cleanup-gate) as the normal route and the user or the host as the alternative, only when every condition holds:

- the worker session has finished and the worktree is not locked or active;
- `git status --porcelain` in the worktree is empty;
- the PR is `MERGED` and the issue is closed when the PR should close it;
- the worktree HEAD equals the PR's final `headRefOid`, so no post-PR commit would be lost. For a queue implementer's worktree, a clean HEAD that is an ancestor of the final `headRefOid` also passes (check with `git merge-base --is-ancestor <HEAD> <final headRefOid>`), because earlier fix rounds end on older commits. The check needs the PR head object in the local object store, so run `git fetch origin` first; a worktree whose PR head is missing is kept as "no PR match"; and
- the branch is not an evidence, prototype, research, active draft-PR, or app-managed Codex worktree.

Age, a quiet terminal, or an absent agent session never satisfies the cleanup gate by itself.

By hand, remove without force, then delete refs conditionally:

```bash
git worktree remove <path>
git update-ref -d refs/heads/<task-branch> <expected-head-sha>
git update-ref -d refs/heads/<unchanged-scaffold-branch> <recorded-start-sha>
git worktree prune
```

Delete a remaining remote task branch only after verifying the PR merged and the remote ref still points at the recorded PR head. A failed gate preserves the worktree and reports the exact reason.

## Run the cleanup gate

[`scripts/worktree-gc.mjs`](../../scripts/worktree-gc.mjs) is the gate as code, recorded in [ADR-0076](../adr/0076-orchestrator-runs-the-worktree-cleanup-gate-after-every-merge.md). The orchestrator or integration session runs it after each merge, once the PR is verified merged and its issue closed and `git fetch origin` has run, and again at queue end.

```bash
pnpm worktree:gc          # read-only report
pnpm worktree:gc:apply    # same report, then removes the `remove` rows
```

`pnpm worktree:gc -- --apply` is equivalent. Other flags are `--json`, `--no-size` and `--no-railway`.

For each linked worktree the report shows its path, branch, HEAD, size, lock state, changed-path count, matching PR and a verdict: `remove`, or `keep: <exact reason>`. The reasons are the main checkout, the running session's own worktree, a Codex app-managed worktree under `~/.codex/worktrees`, a lock (another session's lock included), a running agent process in the directory, a missing directory, an unborn branch, an evidence, prototype or research worktree, a dirty tree, an open PR, a PR closed without merging, a HEAD already on `main` that belongs to no PR, and no PR match. The first matching reason is printed; a worktree is removed only when none applies and a merged PR's head equals HEAD or descends from it.

`--apply` removes only `remove` rows with `git worktree remove` and never `--force`, so git still refuses a dirty or locked tree. It then deletes the removed worktrees' `agent/issue-*` and `worktree-agent-*` branches, plus local branches of those forms that no worktree holds and whose tip is inside a merged PR head, each with `git update-ref -d refs/heads/<branch> <expected-sha>`, and runs `git worktree prune`. It stops at the first failure. It does not touch other branches, remote refs, Codex app-managed worktrees or the shared pnpm store.

Every run also reports Railway PR environments whose PR is closed, from `railway environment list --json`. That part is report only; Railway deletes the environment itself ([ADR-0075](../adr/0075-railway-pr-backends-for-agent-native-sessions.md)). Keep a worktree by locking it, leaving it dirty, or naming its branch or directory for evidence, prototype or research work.

## Completion report

`--apply` prints it. Report worktrees removed, local and remote refs removed, worktrees deliberately preserved with their reasons, stale Railway environments, and any cleanup tuple still waiting for its worker session to end.
