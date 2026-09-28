# ADR-0062: The human in the loop may assign both review axes to Kimi per pull request

- **Status**: Accepted
- **Date**: 2026-09-28
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0059](0059-kimi-code-as-a-third-interactive-coding-agent.md)'s high-risk review-provider rule. ADR-0059's remaining provisions and ADR-0058's gates stay in force.

## Context

ADR-0059 makes Kimi Code a supported implementer and reviewer, but for high-risk changes (authentication, authorization, migrations, deployment workflows, production configuration, credentials, destructive operations, agent-workflow changes) it requires one OpenAI-backed Codex desktop review and one Anthropic-backed Claude Code desktop review across the Standards and Spec axes. Kimi reviews on those pull requests are optional extras only.

That rule protects cross-provider scrutiny, but it hard-blocks merges when Codex desktop or Claude Code desktop capacity is unavailable, even when the founder is actively supervising and judges two independent Kimi reviews sufficient for a specific pull request. The founder exercised exactly this judgment for PR #415 (a migration): two independent Kimi subagent reviews, one per axis, in fresh read-only contexts pinned to the fixed commit.

## Decision

**When the human in the loop explicitly specifies it for a pull request, two independent Kimi reviews — one Standards, one Spec, each in a fresh read-only context that did not implement the commit, pinned to the fixed head SHA — satisfy the two-axis review requirement, including for high-risk changes.**

- The specification is per pull request, never blanket. Absent an explicit specification, ADR-0059's provider rules apply unchanged, and the `claude-kimi` CLI still does not fill the Anthropic slot.
- The specification must be recorded durably on the pull request — in its `Execution state` or a comment — naming the decision and its date, so the record shows the deviation and who authorized it.
- Both Kimi reviews still follow ADR-0058's fixed-commit contract: independent fresh contexts, SHA-pinned verdict comments with `Provider: Kimi` and `Client: claude-kimi (Claude Code CLI)`, findings resolved or explicitly rejected before merge.
- The human in the loop remains the founder. A specification from any other party, or one inferred from silence, is invalid.

## Consequences

### Positive

- High-risk merges are no longer hard-blocked on Codex desktop and Claude Code desktop availability when the founder is actively supervising.
- The default stays safe: without an explicit per-PR specification, the cross-provider requirement still applies.
- Every use of the exception is visible on the pull-request record.

### Negative / accepted costs

- PRs merged under this exception lose cross-provider scrutiny; a single provider's blind spots can pass both axes.
- The human's judgment substitutes for a structural gate, so the exception's safety depends on that judgment being genuinely exercised per PR.

### Neutral

- ADR-0058's branch, execution-state, CI, and merge gates do not change.
- Kimi's reviewer-attribution rules (`Provider: Kimi`, actual client named) do not change.

## Alternatives considered

- **Keep ADR-0059's strict cross-provider requirement.** Rejected: it blocks founder-supervised merges whenever one desktop client is unavailable.
- **Allow Kimi to fill any review slot unconditionally.** Rejected: removes the human control and weakens every high-risk review by default.
- **Record one-off waivers in PR comments without an ADR.** Rejected: the exception would be invisible in the decision log and ADR-0059 would silently contradict practice — the drift ADR-0020 exists to prevent.

## References

- [ADR-0059](0059-kimi-code-as-a-third-interactive-coding-agent.md) — Kimi as a third interactive coding agent (amended here)
- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) — portable execution and fixed-commit review gates
- [ADR-0020](0020-document-hierarchy-and-mutability.md) — document hierarchy and mutability
- [`docs/agents/coding-workflow.md`](../agents/coding-workflow.md) — review contract
- [PR #415](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/415) — first use of this exception
