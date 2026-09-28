# ADR-0059: Kimi Code as a third interactive coding agent

- **Status**: Proposed
- **Date**: 2026-09-28
- **Deciders**: AutoTM founder + AI architect
- **Amends**: ADR-0058's supported-agent and high-risk review-provider rules. Its issue, review, CI, merge, and pilot gates remain in force.
- **Complements**: ADR-0040's single repository skill layer. ADR-0028's Sandcastle path remains suspended under ADR-0058 until issue #406 merges.

## Context

ADR-0058 gives each implementation issue one branch, draft pull request, durable execution state, and two independent reviews of a fixed commit. It permits another supported coding agent to resume work, but the current workflow instructions name only Codex and Claude. The founder has a Kimi Code subscription and a local `claude-kimi` shell function that runs Claude Code against Kimi Code's endpoint. Kimi Code can add implementation and review capacity without another issue or skill system.

The client and model provider are different facts. Claude Code can send requests to Kimi Code, but such a session is a Kimi model session. ADR-0058 requires one Codex review and one Claude Code review for high-risk changes to get cross-provider scrutiny. Those slots mean Codex backed by OpenAI and Claude Code backed by Anthropic. Counting either client when it uses another provider would lose that scrutiny.

## Decision

**Kimi Code is a supported interactive implementer, resumer, and reviewer under ADR-0058's existing per-issue contract. Review records identify the actual model provider, independently of the client used to reach it.**

- Kimi may implement or resume an eligible `ready-for-agent` issue using the existing `agent/issue-<N>` branch, worktree, draft pull request, execution state, verification, and merge gates. One agent owns integration at a time. A handoff uses Git and GitHub evidence, not chat history.
- Kimi may perform either Standards or Spec review on an ordinary issue in a fresh, read-only context that did not implement the reviewed commit. Both axes still need valid verdicts on the current SHA. A third review is optional, not a new required gate.
- Authentication, authorization, database migrations, deployment workflows, production configuration, credential handling, destructive operations, and agent-workflow changes still require one Codex review backed by an OpenAI model and one Claude Code review backed by an Anthropic Claude model across the two axes. Kimi may implement these issues or add an optional review. A client backed by a different provider does not fill either required slot.
- Each review comment records the model `Provider` as `OpenAI`, `Anthropic`, or `Kimi` and identifies the reviewer context. Record `Client` when its usual provider differs from `Provider`, such as `Client: Claude Code` with `Provider: Kimi`; otherwise `Client` is optional. Client names include Codex, Claude Code, and Kimi CLI. Do not infer provider from the executable name alone.
- Kimi follows the single tracked `.claude/skills/` workflow and `docs/agents/coding-workflow.md`; no Kimi-specific skill copy, issue labels, branch prefix, or quota-based dispatcher is added. The local `claude-kimi` function and its credentials remain outside the repository. Context7 access and the required verification commands must work in the chosen client before an issue is counted as complete.
- Start with one ordinary interactive issue and record whether Kimi can implement, checkpoint, hand off, and review through the existing evidence. The ADR-0058 pilot limit of two issues in flight remains. Sandcastle dispatch stays suspended until issue #406 implements ADR-0058's pull-request path.

## Consequences

### Positive

- The Kimi subscription can supply implementation and review capacity while the same pull-request record remains portable across agents.
- Review records show which model provider supplied each verdict, including Claude Code sessions routed to Kimi.
- Ordinary issues can use Kimi without adding a third mandatory review or another workflow layer.

### Negative / accepted costs

- A Kimi session needs access to the repository instructions, Context7, GitHub, and the issue's verification environment before it can own an issue end to end.
- The high-risk gate still consumes OpenAI-backed Codex and Anthropic-backed Claude Code review capacity even when Kimi implements the change.
- Subscription access and rate limits may interrupt a session; pushed checkpoints and the draft pull request remain the recovery path. The workflow does not query quota before starting.

### Neutral

- ADR-0058's branch, review axes, CI, merge, recovery, and human-owned actions do not change.
- ADR-0040's single repository skill layer and ADR-0028's Sandcastle decision do not change.
- Product, domain, and `CONTEXT.md` artifacts do not change because this decision concerns the agent workflow.

## Alternatives considered

- **Count a client connected to a different model provider as its usual provider.** Rejected because the required cross-provider scrutiny would be lost.
- **Require three reviews on every issue.** Rejected because the two existing axes already define the acceptance gate; another required review would spend time and quota without a distinct responsibility.
- **Give Kimi a separate branch, skill, or issue queue.** Rejected because it would duplicate the portable state and tracked instructions established by ADR-0058 and ADR-0040.
- **Enable Kimi only through Sandcastle.** Rejected because its current batch integration path is suspended and the founder wants interactive implementation and review now.

## References

- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) - portable execution and fixed-commit review gates
- [ADR-0040](0040-repo-canonical-workflow-skills.md) - single tracked skill layer
- [ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md) - Kimi Sandcastle path
- [`docs/agents/coding-workflow.md`](../agents/coding-workflow.md) - interactive workflow router
- [Kimi Code membership guide](https://www.kimi.com/en/help/kimi-code/membership-guide) - subscription access through the CLI and third-party tools
- [Kimi Code Claude Code guide](https://www.kimi.com/code/docs/en/third-party-tools/claude-code.html) - Claude Code as a client of Kimi Code
