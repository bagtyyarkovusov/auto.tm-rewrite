# AutoTM coding workflow

This is the repository router for moving an idea from shaping to shipped code. It maps generic coding-workflow concepts onto AutoTM's governed documents and repository skills; it does not add a second skill layer.

## Phase map

| Phase | AutoTM entry point | Durable output | Boundary |
|---|---|---|---|
| Shaping | [`shape-with-docs`](../../.claude/skills/shape-with-docs/SKILL.md) | Reviewed vocabulary and mutable product, flow, or pending-sprint documents; a new ADR when required | Work stays on `shape/<slug>` and contains no executable tickets or implementation |
| Specification | The same shaping PRD, flow, and pending-sprint artifacts governed by ADR-0020 | Testable outcomes, scope, non-goals, scenarios, invariants, risks, DoD, and evidence plan | There is no duplicate standalone specification artifact |
| Sprint issue creation | [`create-sprint-issues`](../../.claude/skills/create-sprint-issues/SKILL.md) using [`sprint-transitions.md`](sprint-transitions.md) | Confirmed parent and dependency-ordered child issues plus the roadmap-start PR | Starts only after the shaping documentation PR is reviewed and merged |
| Issue execution | [`run-issue`](../../.claude/skills/run-issue/SKILL.md), or `resume-issue` for an interrupted run | One pushed reservation branch, early draft PR, durable execution state, and verified implementation | Codex desktop, Claude Code desktop, and `claude-kimi` CLI may exchange roles; one issue and one integration owner |
| Small change | [Small changes](#small-changes-adr-0065) | A fix in the PR that found it, or a `fix/<slug>` or `chore/<slug>` PR with no issue | Fix in place: one `Delta` review carries earlier verdicts forward. No-issue PR: one `Standards + Spec` review. Both need green CI; excluded change types take the issue path |
| Review | Independent Standards review and Spec review of the fixed implementation commit | SHA-pinned PR comments with findings resolved or explicitly rejected with evidence | Both axes pass against the current commit before merge, or carry forward through a `Delta` review |
| Sprint control | `sprint-status`, then `close-sprint` when the sprint is complete | Queue visibility, shipped-vs-planned verification, retro, and roadmap update | Retros remain append-only; sprint locks remain in force |

UI-heavy implementation issues insert `design-grill` after issue creation and before `run-issue`. The design workflow refines the accepted issue; it does not reopen product shaping silently.

All phases use the shared [worktree lifecycle](worktree-lifecycle.md): reuse a host-created isolated checkout, keep one worktree per task session, and let the root or integration session retire clean merged work after the worker finishes.

## Portable issue execution

The interactive path follows this state machine. Sandcastle must not dispatch implementation work while its current wrapper still uses batch integration; AFK execution resumes only after the wrapper and its operating guide implement the same state machine.

1. Confirm the issue is open, labelled `ready-for-agent`, not `blocked`, has closed dependencies, and has intelligible acceptance criteria.
2. Reserve it by pushing `agent/issue-<N>` from updated `main` before editing. An existing branch, worktree, or PR means resume; never create a duplicate. A reservation-only branch left by a design pause fast-forwards to current `main` after the design PR merges and before implementation continues.
3. Commit and push meaningful checkpoints. After the first checkpoint, open a draft PR whose body starts `Closes #<N>` and contains the single mutable `Execution state` defined in [`run-issue/EXECUTION-STATE.md`](../../.claude/skills/run-issue/EXECUTION-STATE.md).
4. Implement and verify. Update execution state with the latest checkpoint, completed criteria, commands and results, failures, interrupted commands, documentation/Context7 status, and one next action.
5. Run independent Standards and Spec reviews against the exact current commit. Record each verdict as a PR comment naming its axis, agent, provider, SHA, and either `pass` or concrete findings.
6. Resolve findings, repeat affected verification and review on the new SHA (or only a delta review for a small fix, under [Small changes](#small-changes-adr-0065)), wait for required checks, and squash-merge. The PR's `Closes #N` closes the issue.

### Small changes (ADR-0065)

[ADR-0065](../adr/0065-small-changes-skip-the-issue-ceremony.md) governs these rules.

- **Fix in place.** A fix of about 50 lines or fewer for a review finding, within the PR's scope and with no migration, contract change, or product decision, goes in the same PR. One fresh read-only reviewer checks only the new commits and records `Review axis: Delta` with the base and new commits and the verdicts it carries forward; earlier verdicts carry forward unless that reviewer finds the delta changes what they covered, and an axis whose verdict no longer holds gets a full re-review.
- **No-issue PR.** About 50 lines or fewer excluding tests, with no migration, API contract, auth, deployment or production-configuration change, ADR or agent-workflow policy change, and no product or architecture decision: the founder, or an agent the founder asked, uses a `fix/<slug>` or `chore/<slug>` branch, a PR that states the problem and fix, one fresh read-only review recorded as `Review axis: Standards + Spec`, and green CI. No reservation branch, `Execution state`, or `Closes #N`.
- **Batch follow-ups.** Blocking findings are fixed before merge. Non-blocking findings deferred from the PR go into one issue or PR per area. A deferred finding gets its own issue only when it needs a decision, a human, or one of the excluded change types.

No workflow queries provider quota before accepting work. A quota stop, crash, or lost context is handled by the last pushed checkpoint and PR state. Silence, incomplete output, or an interrupted command is `unknown` rather than evidence of success.

Kimi Code is a supported interactive implementer, resumer, and reviewer under [ADR-0059](../adr/0059-kimi-code-as-a-third-interactive-coding-agent.md). This project's Kimi setup is the `claude-kimi` shell function, which runs Claude Code CLI against Kimi Code. It uses the same tracked skill files and issue record as Codex desktop and Claude Code desktop. Record its reviews as `Provider: Kimi` and `Client: claude-kimi (Claude Code CLI)`.

The local `claude-kimi` function uses the Kimi Code membership endpoint and key; Kimi's Open Platform is a separate billing path. Keep the function and credentials outside the repository. Do not add a Kimi-specific skill copy or start Sandcastle to run this interactive path. Confirm the chosen client can read the repository instructions, use Context7, and run the required verification before treating its result as complete.

Codex desktop, Claude Code desktop, and the `claude-kimi` CLI may each perform either review axis, or both, on any pull request, including authentication, migration, deployment, credential, destructive, and agent-workflow changes ([ADR-0064](../adr/0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md)). Each review starts in a fresh read-only context that did not implement the commit. Any number of issues may be in flight; each keeps one branch, worktree, draft PR, and integration owner.

## Document routing

Use the [canonical domain glossary](../domain/GLOSSARY.md) for engineering and domain vocabulary only. A term's presence accepts its meaning; it does not claim that behavior is planned or implemented.

| Question | Canonical artifact |
|---|---|
| What does this term mean? | `docs/domain/GLOSSARY.md` |
| What should the completed capability do? | `docs/prd/features/` or `docs/prd/flows/` |
| What does a pending sprint add? | `docs/prd/sprints/` |
| What exists in code now? | Source, schema, tests, and runtime evidence; use `CONTEXT-MAP.md` and local overviews to find the owning area |
| Why was a material decision made? | A new immutable ADR under `docs/adr/` |
| What is the cross-sprint trajectory? | `docs/prd/03-roadmap.md` |

Vocabulary additions and routine clarifications go directly to the glossary. Semantic redefinitions, bounded-context ownership changes, and vocabulary changes caused by material product or architecture decisions require a new ADR. Local overviews follow [ADR-0060](../adr/0060-source-first-agent-context-and-task-scoped-guidance.md): update documented boundaries, constraints, ownership, or important limitations in the same PR when they change. Routine implementation details stay in source and tests.

## Downstream vocabulary contract

- Specifications and child issues use canonical terms to name accepted concepts. A glossary definition cannot add behavior, scope, acceptance criteria, or implementation claims.
- Implementers and resume flows reload the relevant terms beside the issue, target specification, ADRs, and local orientation. New or changed names follow the glossary; unrelated existing inconsistencies are not migrated silently.
- Design workflows use canonical meaning for engineering handoff, while actual i18n resources and approved design artifacts own RU/TK/EN user-facing copy. Glossary definitions are never translated into interface strings.
- If an existing name creates harmful ambiguity, record the evidence and propose separately scoped work. Do not expand the active issue merely to normalize names.

## Diagnosis vocabulary

Repository diagnosis applies canonical terms to hypotheses, evidence notes, and regression-test names so the investigation and eventual fix describe the same concepts. The glossary does not prove expected behavior or current state: derive those from the issue/specification, code, tests, `CONTEXT.md`, and ADRs.

Use this repository guidance alongside any user-global diagnosis technique without modifying or copying the global skill. Report pre-existing naming drift separately unless it caused the observed failure and the active issue explicitly owns its correction.

## Context and approval boundaries

- Keep one conversation through decision grilling, documentation editing, and approval of the shaping PR so unresolved choices remain visible.
- Start issue creation only from merged shaping documents. Its confirmation authorizes issue and roadmap mutations, not execution.
- Sprint starts and child-progress reconciliation use the canonical verified sequence in [`docs/agents/sprint-transitions.md`](sprint-transitions.md). Report success only after fresh repository and GitHub reads agree.
- Start or resume each implementation issue by reloading the issue, relevant vocabulary, governing specification and ADRs, local orientation, Git state, PR execution state, comments, and checks.
- A normal `run-issue` or `resume-issue` invocation authorizes its branch-to-merge flow, subject to its decision boundaries and both review axes. Ordinary mechanics do not add confirmation stops.
- Never edit user-global skills or copy their generic instructions into the repository. AutoTM's canonical workflows live once under `.claude/skills/`.

## Review contract

The Standards reviewer checks repository policy, architecture, tests, documentation hierarchy, maintainability, and terminology drift in new or changed engineering names. Vocabulary findings are labeled separately from runtime-correctness findings. The context is read-only and must not commit, edit, or run a formatter that changes the branch.

The Spec reviewer uses canonical definitions to interpret terms in the issue and specification, then checks every acceptance criterion and expected behavior against the fixed commit. The glossary cannot create a missing requirement; vocabulary drift is reported separately from requirement-correctness findings. The context is also read-only and independent from implementation.

Pre-existing inconsistent names outside the diff are follow-up observations, not automatic migrations or blockers, unless the change worsens them or the ambiguity prevents reliable runtime/spec evaluation. The reviewers work independently; implementation ownership and review ownership must remain distinct when subagents are used.

Each verdict is a PR comment with `Review axis`, `Reviewer`, `Provider`, `Client`, `Commit`, and `Verdict`. `Provider` names the actual model provider: `OpenAI`, `Anthropic`, or `Kimi`. `Client` names the actual interface: `Codex desktop`, `Claude Code desktop`, or `claude-kimi (Claude Code CLI)`. Each reviewer uses a fresh, read-only context pinned to the current commit. If its interface cannot post a PR comment, the integration owner transfers the verdict and evidence to the PR with the original reviewer and client attribution. Record evidence for accepting or rejecting every finding. Resolve accepted findings with focused changes, rerun proportionate verification, and repeat the affected review axis. An unresolved correctness or acceptance-criteria finding blocks merge. Product or architecture disputes return to the founder; other disputed findings receive a fresh read-only review against the code, tests, and governing documents. Any content change invalidates affected earlier verdicts, except as ADR-0065's fix-in-place rule allows. Only the current fixed, green commit proceeds to pull-request merge.

## Integration, closure, and recovery

- Required repository checks and current fixed-SHA verdicts must pass before merge. Agents may squash-merge ordinary accepted work and may never self-approve.
- Implementers, reviewers, dispatchers, and batch orchestrators do not close implementation issues directly. `Closes #N` closes the issue through the merge.
- Production promotion or rollback, live-data migration, credential/domain changes, paid resources, store submission, and destructive or ambiguous recovery remain human-owned.
- An incoming agent resumes from Git and GitHub evidence. It verifies heads, worktrees, diff, running processes, PR state, checks, and review SHAs before continuing.
- Cleanup follows [`worktree-lifecycle.md`](worktree-lifecycle.md). Age is never evidence that a branch, worktree, or draft PR is disposable.

## Using the workflow from different hosts

Codex desktop, Claude Code desktop, and the `claude-kimi` CLI use the same root AGENTS.md policy. CLAUDE.md loads that policy for Claude-compatible hosts. Open this checkout in the host that will execute the task; verify its working directory and Git head before editing. A chat without checkout or command access cannot supply implementation or verification evidence. [ADR-0059](../adr/0059-kimi-code-as-a-third-interactive-coding-agent.md) governs provider attribution for reviews.

Use a discovered repository skill when supported. Otherwise open its linked `.claude/skills/<name>/SKILL.md` and follow the workflow with the host's file, shell, and GitHub tools. Skill names are workflow entry points, not a guarantee that every host has a slash command. Keep one canonical skill layer and record the actual agent/provider in Execution state and reviews. Changing providers does not waive independent review or host-only verification.
