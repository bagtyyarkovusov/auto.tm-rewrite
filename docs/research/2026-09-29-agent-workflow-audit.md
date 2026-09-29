# Agent workflow and context audit

> Noncanonical research, dated 2026-09-29. This note proposes improvements; it does not change repository policy, required reviews, or verification gates. No speed or model-quality benchmark was run.

The audit inspected `59923a4`. Main subsequently merged [PR #437](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/437), which added the documentation-only CI lane and cancellation of outdated PR checks. CI suggestions below describe the state at the audited commit; the remaining test-gate work is tracked separately in [issue #447](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/447).

## Repository findings

Audited checkout `59923a493c9d2b356624931016ab125f92baeba6`. The largest opportunity is repeated workflow execution and instructions. The root policy and local overviews already follow the source-first direction in ADR-0060. Sandcastle's retirement is already reflected in the current tree; recommending its removal again would be stale advice.

Counts below use whitespace-separated words from tracked Markdown, not model tokens or observed context usage.

| Material | Files | Words |
| --- | ---: | ---: |
| All tracked Markdown before this note | 266 | 314,841 |
| Root AGENTS.md | 1 | 553 |
| Root CLAUDE.md loader | 1 | 26 |
| CONTEXT-MAP.md | 1 | 412 |
| Local CONTEXT.md overviews | 21 | 4,298 |
| docs/agents guides | 11 | 11,019 |
| Repository skill files and references | 30 | 12,460 |
| ADR directory | 67 | 58,646 |
| PRD directory | 121 | 209,054 |

Root AGENTS.md plus the map is 965 words. Adding the coding-workflow router, run-issue skill, Execution state, Verification, and Finalization references makes a common issue route 5,767 words before the local overview, task specification, source, or tests. This is a selected reading-path estimate, not a claim that every client loads every file at startup.

### Priority 1: remove duplicate workflow work

**UI review multiplication.** [SUBAGENT-MODE.md](../../.claude/skills/run-issue/SUBAGENT-MODE.md) makes grouped subagent work mandatory for designed UI crossing multiple logical units and at least three files. Each group gets a sequential Spec review and code-quality review. [Finalization](../../.claude/skills/run-issue/FINALIZATION.md) then requires two fresh full-commit reviews. Three groups therefore mean eight reviewer contexts before fixes, plus implementation contexts. No run timing was collected, but the number of required contexts follows directly from the procedure.

Propose making per-group review conditional on a risky boundary or uncertain design. Keep independent Standards and Spec reviews on the integrated commit, and allow those final reviews to run concurrently against that fixed commit. Use implementation subagents where acceptance criteria and files can be separated safely. This requires an explicit workflow policy change, not silent omission of today's gates.

**Repeated policy.** The [2,295-word workflow router](../agents/coding-workflow.md), [run-issue](../../.claude/skills/run-issue/SKILL.md), [Execution state](../../.claude/skills/run-issue/EXECUTION-STATE.md), and Finalization each repeat parts of reservation, recovery, review attribution, and merge behavior. Keep the router as a phase selector, the execution skill as the action sequence, and each detailed contract in one reference. Keep high-value reminders at the point of action, such as disabling auto-merge before a new push. Remove full restatements rather than eliminating those safeguards.

**Verification timing ambiguity.** [AGENTS.md](../../AGENTS.md) requires repository tests and typecheck before committing. Execution state requests frequent checkpoint commits, while [Verification](../../.claude/skills/run-issue/VERIFICATION.md) says focused development checks followed by the repository gate before finalization. These rules can cause a full gate at every small checkpoint. Propose explicitly distinguishing recovery checkpoints from a commit eligible for final review and merge. Require complete applicable evidence for the final reviewed state, and invalidate evidence when its inputs change. Preserve integration, migration, and mobile runtime checks.

### Priority 2: reduce instructions that drift

**Documentation lookup guide.** [documentation-lookups.md](../agents/documentation-lookups.md) is 294 lines and 2,127 words. It includes generic tutorial examples, a maintained library/version catalogue, and repeated warnings. Its verification section refers to a Definition of Done in CLAUDE.md that no longer exists; CLAUDE.md is now a five-line loader. It also says to query every library touched, while exempting internal refactors, leaving room for unnecessary calls when a file merely imports a library. The session-level Context7 rule requires resolving first unless the user supplies an exact ID, while this guide allows skipping resolution using its own table.

Propose a short procedure covering when lookup is needed, resolve/query, installed-version matching, escalation, official-source fallback, and compact evidence. Use package files and the lockfile for dependency versions. Move any recipes worth keeping to optional reference material. Reconcile the resolve-first exception and use one precise definition of an external API question. Preserve current Context7 requirements until the governing instructions change.

**Issue and re-reading boilerplate.** The [sprint child template](../agents/issue-tracker.md) retains "inside the sandbox" wording and a copied generic reading/completion checklist. The [slicing reference](../../.claude/skills/create-sprint-issues/SLICING.md) mandates this rich shape even though run-issue accepts lean issues. Verification asks for every referenced document to be re-read after implementation. Prefer issue-specific outcome, acceptance criteria, non-goals, dependencies, design evidence, and entry points. Derive current implementation details from source. Re-check governing requirements and changed evidence rather than repeatedly loading every linked document in full.

**Historical rules.** Keep merged ADRs and locked sprint history. The ADR index already marks supersessions, but older linked records still contain different provider and concurrency rules. Route agents through current workflow guidance and the index before historical detail. A historical record appearing in search is not a reason to reactivate its old procedure. Avoid adding this audit to mandatory startup reading.

### Priority 3: improve executable checks and CI

**A glossary checker owns unrelated test composition.** [check-domain-glossary.mjs](../../scripts/check-domain-glossary.mjs) compares `scripts.test` against the exact string `pnpm test:agent-docs && pnpm test:glossary && turbo run test`. The [main CI workflow](../../.github/workflows/ci.yml) explicitly says this is why the reviewer-flow helper tests run separately. The [PR workflow](../../.github/workflows/pr-checks.yml) does not include that separate helper-test command. This is a concrete maintenance coupling and a difference in pre-merge versus post-merge coverage.

Propose a test entry point whose execution includes the required checks, with tests that verify those obligations without freezing unrelated command composition. Then include smoke-helper coverage when applicable before merge. Keep glossary validation and link checks; they are useful automation.

**The audited PR workflow started the full service stack.** At `59923a4`, it unconditionally started disposable services, installed the workspace, generated Prisma, ran migrations and bucket setup, then lint/typecheck/tests. Main repeated that sequence and added build. PR #437 has since added a documentation-only lane and PR cancellation. These were optimization candidates at the audited commit, not measured bottlenecks.

PR #437 implemented the documentation-only path with an always-reporting required `pr` result and cancellation of obsolete PR runs. Keep full coverage for code, shared dependencies, schema, workflow, and uncertain changes. Inspect current job timings before optimizing caches or removing main verification. The [existing CI research](github-actions-self-hosted-performance.md) records historical cache and network work; its numbers are not a fresh benchmark of this checkout.

### Code scaffolds: candidates versus necessary boundaries

| Area | Source evidence | Recommendation |
| --- | --- | --- |
| SMS gateway | [server.ts](../../apps/sms-gateway/src/server.ts) selects `OtpSenderMock` for both fleet and mock; [the mock](../../apps/sms-gateway/src/adapters/OtpSenderMock.ts) returns success without delivery. | This is active scaffold behavior, not proven dead code. Keep the future TM deployment boundary; separately consider explicit failure for unimplemented fleet mode so a successful response cannot imply delivery. |
| Android phone agent | [GatewayClient.kt](../../apps/phone-agent/app/src/main/java/tm/auto/phoneagent/GatewayClient.kt) configures an HTTP client; [PhoneAgentService.kt](../../apps/phone-agent/app/src/main/java/tm/auto/phoneagent/PhoneAgentService.kt) starts a foreground notification without a delivery protocol. | Keep clearly labelled deferred scaffolding out of unrelated task context. Removal needs a product/hosting decision. |
| Inspection report summary | [reports.ts](../../packages/contracts/src/schemas/reports.ts) declares a Phase 2 summary schema. Repository symbol search found no named consumers outside its declaration. [The package index](../../packages/contracts/src/index.ts) exposes its namespace. | A small removal candidate requiring export/consumer verification. Do not remove the whole reports file: inspection-interest schemas have real API and OpenAPI consumers. |
| Content and subscriptions | These module directories contain concise CONTEXT.md notes; application behavior is not implemented. | Already cheap and explicit. Their notes prevent agents confusing schema presence with working features. |
| Worker video/orphan processors | [app.module.ts](../../apps/worker/src/app.module.ts) registers processors that deliberately reject unsupported jobs; integration tests cover rejection. | Retain the rejection behavior unless queue/producer ownership is deliberately changed. These are active guards. Account purge is implemented separately. |
| Shared UI | Imports exist in web and admin components; mobile consumes the shared Tailwind theme. | Keep. A package looking generic does not establish that it is unused. |

This was source and reference inspection, not a complete dead-code or dependency-usage analysis. There is no evidence here for a broad delete-unused-code PR.

### Suggested implementation order

1. One governed workflow PR: consolidate repeated instructions, correct stale lookup/template references, and explicitly decide review/checkpoint frequency. Verify representative API, mobile, small-change, and resume routes on both clients. Preserve immutable ADRs; use a new decision when policy changes.
2. One verification PR: remove exact-test-command coupling and establish appropriate pre-merge helper-test coverage. Validate against the docs lane already added by PR #437.
3. A separate code cleanup or scaffold-behavior PR only for candidates with confirmed consumers and expected behavior. Do not bundle runtime changes into documentation pruning.

Use a small comparable PR sample to judge elapsed time and defect outcomes. Do not adopt a larger no-issue exception solely because a change has few lines; authentication, contracts, migrations, deployment, and workflow changes remain materially different risks.

Validation performed for this audit: `node scripts/check-agent-docs.mjs` passed; `node --test scripts/check-agent-docs.test.mjs scripts/check-domain-glossary.test.mjs` passed all 37 tests. Full application gates were not run because this change adds only a noncanonical research note. No commit, PR, settings, runtime code, or policy changes were made.

## Verified model and client guidance

The requested models have public official documentation. Keep model behavior separate from the coding client's context loading and tools.

| Subject | Verified guidance | Application to AutoTM |
| --- | --- | --- |
| GPT-6 Sol high | The GPT-6 Sol model page lists `high` as supported reasoning effort. The GPT-6 family prompting guide says its examples address behavior observed with Astra and should be evaluated with the chosen model. | Keep Sol high as the requested baseline. Do not claim that Astra's reduced need for procedural guidance or testing reminders is proven for Sol. Compare effort settings only through a separate project trial. |
| Claude Opus 5.5 | Anthropic recommends explicitly starting at medium and evaluating effort against the workload. It advises reserving xhigh/max for measured gains. | Try medium for routine bounded implementation, retaining stronger effort where review outcomes justify it. This is a proposed trial, not a measured AutoTM optimum. |
| Claude Code | The client recommends concise project instructions, task-specific skills, concrete verification, and skipping planning overhead for clear small edits. | Keep the short root routing files; make the relevant requirement and evidence easy to find. |
| Codex | Instruction discovery and skill discovery are client features with specific paths and limits. | Verify actual loading on both clients before adding another instruction file or assuming cross-client parity. |

Sources: [GPT-6 Sol model](https://developers.openai.com/api/docs/models/gpt-6-sol), [GPT-6 family prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices), [Claude Opus 5.5 prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5), and [Claude Code best practices](https://code.claude.com/docs/en/best-practices). These pages were opened during this audit.

## Context loading that matters here

Claude Code recommends fewer than 200 lines per `CLAUDE.md` file. This is guidance for adherence, not a hard loading limit. It distinguishes committed instructions from auto memory and supports task-scoped rules. Use the client's context inspection to check what actually loads; do not equate the repository's total Markdown size with startup context. [Claude Code memory](https://code.claude.com/docs/en/memory)

Codex constructs its startup instruction chain from global guidance and project-root-to-working-directory files, with deeper instructions taking precedence. The default combined project document cap is 32 KiB. A nested file's presence alone does not establish that a root-launched session loaded it. Keep explicit routing to affected guidance where needed. [Codex AGENTS.md discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

Codex initially loads skill names, descriptions, and paths; it reads a full skill only when selected. Its initial catalogue has a budget, and large catalogues can truncate descriptions or omit skills. Review globally installed skill triggers as well as repository files. This session's broad skill catalogue is outside the repo and cannot be fixed by deleting repository Markdown. [Codex skill loading](https://learn.chatgpt.com/docs/build-skills)

The same Codex page documents automatic repository skill discovery under `.agents/skills` and support for symlinked skill folders. AutoTM deliberately keeps canonical skills in `.claude/skills` and provides manual routing. A tested discovery adapter could be considered later if automatic selection is useful, but copied skill bodies would create another source of drift. Preserve the existing policy until such a change is explicitly adopted. [Codex skill discovery locations](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)

OpenAI's September 2026 article recommends narrow skill triggers, selective loading of supporting references, and reconsidering long fixed procedures. It explicitly cautions that guidance useful for Sol or Luna may overconstrain Astra. Use this as support for measuring and pruning redundant context, not as grounds to drop AutoTM's required checks. [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)

## Proposed operating pattern

These are project recommendations derived from the sources and repository structure, not additional mandatory instructions.

1. Keep global instructions to durable safety and communication preferences. Keep root project guidance to task routing and non-obvious project constraints.
2. Start implementation from the task's acceptance criteria, owning context, affected source and tests. Load the relevant PRD, ADR, or specialist guide when it governs the change. Preserve historical documents without making them universal startup reading.
3. Maintain one authoritative workflow and one current execution record. Specialist guides should link to shared completion rules instead of restating them. Record finished checks, unresolved risks, reviewed commit, and next action once.
4. Put mechanically checkable invariants in scripts or CI. Use review time for behavior, security, contracts, and uncovered edge cases. Keep fixed-commit independent review; any reduction in required review frequency needs a policy decision and outcome measurement.
5. Iterate with focused checks, then run the repository's existing required gates before committing and merging. Reducing repeated runs requires valid evidence that the checked inputs have not changed, rather than an agent's memory that tests passed earlier.
6. Give reviewers the acceptance criteria, relevant constraints, base and head commits, changed paths, and evidence. Avoid feeding them the entire implementation conversation unless a specific decision requires it.

Claude Code's best-practices page supports executable verification, specific context, fresh review, and using planning only where it earns its overhead. Its guidance does not establish the optimal number of reviewers for this project. [Claude Code best practices](https://code.claude.com/docs/en/best-practices)

For unattended Opus 5.5 runs, Anthropic distinguishes a text-only end of turn from proof of completion. Use an explicit completion condition and current task state; wait for outstanding work and bound automatic continuations. This concerns custom unattended loops, not a reason to install a second orchestration layer around an interactive client. [Opus 5.5 unattended runs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#unattended-agentic-runs)

## Concise implementation prompt

```text
Implement issue <number> through a reviewable PR using the existing workflow.

Outcome: <observable behavior and acceptance criteria>.
Scope: <owning area>; preserve <specific boundary or behavior>.
Evidence: <reproduction, test cases, or approved UI reference>.

Use CONTEXT-MAP.md to find the affected area, then inspect its source and tests.
Load linked requirements and agent guides when they govern this change.
Continue through implementation, required checks, and review fixes.
Use the PR Execution state for durable progress. Stop only for a concrete
blocker or a decision that would materially change scope or acceptance.
Report behavior changed, verification evidence, and remaining risks.
```

For a small fix, name the small-change route instead of inventing an issue. Do not paste the entire repository workflow or a generic model persona into every task. Model and effort belong in the client's settings; the task prompt should describe the desired result.

## Measure improvement before weakening gates

Run a small trial across comparable small fixes, ordinary feature PRs, and changes that cross boundaries. Record time to first relevant edit, instruction and documentation reads, input tokens where available, local check time, CI duration, review rounds, accepted findings, and post-merge defects. Compare workflow edits separately from model or effort changes so a faster model does not mask worse instructions.

The expected benefit is less repeated reading and repeated administration. This audit does not establish a percentage improvement or prove that fewer reviews maintain quality.

## Research method and limits

Consulted official OpenAI and Anthropic pages directly. Also resolved and queried Context7 for Claude Code under `/websites/code_claude` and Codex under `/openai/codex`, then opened the relevant official documentation pages. Public model documentation establishes the named models and guidance; it does not establish a particular account's access or the installed client version's behavior. No settings, policy files, or product code were changed for this research.
