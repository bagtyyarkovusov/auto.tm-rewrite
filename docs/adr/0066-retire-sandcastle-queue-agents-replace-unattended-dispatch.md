# ADR-0066: Retire Sandcastle; queue agents replace unattended dispatch

- **Status**: Accepted
- **Date**: 2026-09-29
- **Deciders**: AutoTM founder + AI architect
- **Supersedes**: [ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md) and [ADR-0033](0033-sandcastle-copy-to-worktree-dependencies.md)
- **Amends**: [ADR-0041](0041-git-history-is-the-archive-for-retired-agent-tool-artifacts.md)'s rule that keeps `.sandcastle/`, and [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)'s Sandcastle boundaries and its stage-2 Sandcastle conversion. Ends the "Sandcastle stays suspended until #406" clauses of [ADR-0059](0059-kimi-code-as-a-third-interactive-coding-agent.md) and [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md)

## Context

ADR-0028 made Sandcastle the unattended parallel orchestrator: a planner, parallel implementers and reviewers in Docker sandboxes, and a merger that integrated a batch into the host branch. ADR-0033 added its copy-to-worktree dependency cache. ADR-0058 retired the batch merger and suspended dispatch until issue #406 converted the wrapper to the one-issue, one-draft-PR contract. Since then, `pnpm sandcastle` exits at its first import, and nothing has been dispatched through it.

The rest of the workflow has since changed:

- `main` requires a pull request and the `pr` check, allows only squash merges, applies to administrators, and supports auto-merge. GitHub itself now enforces ADR-0058's merge gate.
- ADR-0064 removed the in-flight limit and lets any supported client review either axis.
- The `run-queue` skill (#438) lets one long-running session work a founder-ordered queue, one reviewed PR per issue, and move on while CI runs. Parallel work is several such sessions.

Keeping the suspended Sandcastle path still costs something:

- Every production Dockerfile copies a vendored fork tarball, because the root workspace declares it as a `file:` dev dependency.
- The lockfile carries its dependency tree.
- The docs gate runs a suspension test.
- Current docs describe a path that nobody may use.

Converting it (#406) would rewrite a 939-line wrapper and its prompts to reproduce what `run-queue` already does.

## Decision

**Sandcastle is retired. Unattended or parallel issue work runs as one or more long-running `run-queue` sessions, and each issue goes through `run-issue` and the ADR-0058 pull-request contract.**

- Remove `.sandcastle/`, `docs/agents/sandcastle.md`, the Sandcastle scripts and tests, the vendored `@ai-hero/sandcastle` tarball, its root scripts and dev dependency, and the Dockerfile lines that copy it. Git history is their archive (ADR-0041).
- Current docs and skills stop describing Sandcastle. Historical sprint plans, retros, the roadmap log, and merged ADRs stay unchanged.
- #406 closes as not planned, which ends the suspension clauses in ADR-0059 and ADR-0064. #407 no longer depends on it.
- Reintroducing an unattended orchestrator needs a new ADR, and it must use the ADR-0058 pull-request contract.

## Consequences

### Positive

- There is one execution path: `run-issue`, alone or through `run-queue`, under GitHub-enforced gates.
- Production images and the lockfile no longer carry an unrelated fork and its dependencies.
- Current docs no longer describe a path that nobody may use, and the docs gate loses a suspension test.

### Negative / accepted costs

- There is no Docker-sandboxed unattended runner. Parallelism is the number of sessions the founder starts, and each runs on the host.
- The Kimi-enabled Sandcastle fork is no longer maintained from this repository.
- Recovering the wrapper, prompts, or dependency-cache design requires Git history.
- Removing the fork re-resolves one shared dev dependency (`@babel/core` 7.29.7 to 7.29.0 in mobile peer entries), which the mobile gates must confirm.

### Neutral

- Host verification under `run-issue/VERIFICATION.md` was already the only active gate.

## Alternatives considered

- **Convert Sandcastle as #406 planned.** Rejected. It is a large rewrite for a path the founder no longer plans to use, and `run-queue` gives the same throughput under the same gates.
- **Keep it suspended.** Rejected. It keeps the tarball in every image, the suspension test, and misleading docs, with no plan to resume.

## References

- [ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md) - Sandcastle as the unattended orchestrator
- [ADR-0033](0033-sandcastle-copy-to-worktree-dependencies.md) - Sandcastle copy-to-worktree dependencies
- [ADR-0041](0041-git-history-is-the-archive-for-retired-agent-tool-artifacts.md) - Git history as the archive for retired agent tools
- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) - portable execution and pull-request gates
- [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md) - review providers and concurrency
- [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md) - small changes
- Issues [#406](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/406), [#407](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/407), [#438](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/438), and [#440](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/440)
- [`docs/agents/coding-workflow.md`](../agents/coding-workflow.md) - workflow router
- [`.claude/skills/run-queue/SKILL.md`](../../.claude/skills/run-queue/SKILL.md) - queue execution
