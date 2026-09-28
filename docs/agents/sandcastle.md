# Sandcastle — temporarily suspended

Do not dispatch implementation work through Sandcastle in the current repository state.

ADR-0058 retired the existing batch merger, host-branch push, reviewer mutation, and direct issue-closure path. The retained wrapper contains legacy integration code. Its first import now exits with a suspension message before credential loading or agent dispatch, and the old role prompts contain only suspension notices. Both `pnpm sandcastle` and direct execution of `.sandcastle/main.mts` fail closed. Do not remove this guard until #406 supplies the per-issue draft PR, fixed-commit read-only review, CI, and merge-driven closure contract.

Issue [#406](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/406) owns the coordinated wrapper, prompt, test, and operating-guide replacement. This guide becomes the active runbook only when that issue merges. Until then, use the tracked [`run-issue`](../../.claude/skills/run-issue/SKILL.md) flow for one issue at a time.

The governing decisions are [ADR-0058](../adr/0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) and [ADR-0028](../adr/0028-kimi-sandcastle-afk-orchestrator.md), as amended by ADR-0058.
