# Queue model profile

Choose the profile for the actual host. [ADR-0071](../adr/0071-codex-queue-models-and-owned-worktrees.md) records the founder's Codex approval on 2026-09-30; [ADR-0069](../adr/0069-queue-implementers-run-in-host-created-worktrees.md) records the first Claude profile. On 2026-10-04 the founder replaced its Sonnet implementer with Opus 5.5 at medium effort, because Sonnet was too slow on long-scoped queue work; reviewers stay on Opus 5.5 at high effort.

| Host | Role | Model | Effort |
|---|---|---|---|
| Codex | Implementer, bug fixer, review-finding fixer, other writing subagent | `gpt-6.1-sol` | medium |
| Codex | Standards, Spec, Delta reviewer | `gpt-6.1-sol` | high |
| Claude Code | Implementer, bug fixer, review-finding fixer | `claude-opus-5-5` | medium |
| Claude Code | Standards, Spec, Delta reviewer | `claude-opus-5-5` | high |
| Claude Code | Review fixer: Standards reviewer with fix rights ([ADR-0083](../adr/0083-a-standards-reviewer-may-commit-small-fixes.md) trial) | `claude-opus-5-5` | high |

Set these choices when dispatching agents through the host's available controls. Supply a fresh task with the issue, scope, and evidence target when the host requires fresh context for overrides. Confirm the actual selected model and effort; report unavailable controls rather than substituting silently. This profile is repository guidance, not a request to edit global host configuration. Worktree ownership follows the [lifecycle](worktree-lifecycle.md#queue-implementer-worktrees).

Codex queues may run up to four full issue implementers in parallel. Reviewers and bug or review-finding fixers do not count toward that allowance. Dispatch only as actual host capacity permits, keep one writer per issue, and avoid shared service, file, and simulator collisions. The founder's [updated instruction](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/456#issuecomment-5912282304) supersedes the earlier about-two preference for Codex. Claude's about-two guidance remains unchanged.
