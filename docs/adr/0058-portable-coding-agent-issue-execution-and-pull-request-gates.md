# ADR-0058: Portable coding-agent issue execution and pull-request gates

- **Status**: Accepted
- **Date**: 2026-09-23
- **Deciders**: AutoTM founder + AI architect
- **Amends**: ADR-0028's Sandcastle integration path. Sandcastle may dispatch and execute eligible work, but it no longer merges a batch into the host branch or closes issues before pull-request checks pass.
- **Supersedes**: ADR-0040's Claude-Code-only synchronous execution consequence. ADR-0040's single repository skill layer at `.claude/skills/` remains unchanged.

## Context

AutoTM has two implementation paths. The synchronous `run-issue` path is written for Claude Code and produces one reviewed pull request. Sandcastle works several issues in parallel, merges their branches into its current host branch, closes the issues, and then pushes. When that host branch is `main`, the pull-request workflow never runs before integration. The push workflow can report failures only after the issues have closed.

The paths also preserve interrupted work differently. `resume-issue` can recover a named branch, bail comment, or open pull request, while Sandcastle relies on local worktrees and logs. Neither path defines one durable state record that Codex, Claude Code, or another coding agent can resume without the previous chat transcript.

The repository already requires two independent review axes against a fixed commit, but the durable review record and reviewer independence are underspecified. Sandcastle's reviewer may edit the branch, which mixes implementation and review ownership. The repository's `main` branch is currently unprotected, so process instructions alone cannot prevent a direct push from bypassing the intended gates.

CI has a separate reliability gap. ADR-0039 keeps CI on the `tm-build-mac` GitHub Actions runner and Railway as a deploy-only target after CI passes. Some integration tests use Testcontainers, but many API and worker tests consume the Mac's long-lived development Postgres, Redis, and MinIO. The suites can wipe shared data, and the runner depends on an untracked environment file and a locally patched service launcher. ADR-0010 already requires real Postgres and Redis through isolated tests, so making the runner hermetic implements an accepted decision rather than choosing a new CI platform.

## Decision

**Every accepted coding issue uses one portable, pull-request-gated execution record that any supported coding agent can implement, resume, review, or integrate. The durable Git and GitHub state owns progress; a chat transcript never does.**

### One issue, branch, worktree, and pull request

- Every implementation issue uses `agent/issue-<N>`, one worktree, and one pull request. The branch name is the reservation. An agent that finds the branch, worktree, or pull request resumes it instead of creating a duplicate.
- Automatic dispatch may select only an open `ready-for-agent` issue whose dependencies are closed, whose acceptance criteria are intelligible, and which has no blocking label. Human selection overrides queue order.
- The agent pushes the reservation branch before editing when the remote branch does not exist. After the first meaningful checkpoint, it opens a draft pull request whose body starts with `Closes #<N>`.
- The draft pull request contains one mutable `Execution state` section with the status, last checkpoint commit, completed acceptance criteria, verification results, current failure, interrupted commands, documentation and Context7 status, and next action.
- Agents commit and push at meaningful phase boundaries. A quota limit or crashed session does not need a final handoff to preserve the work. The workflow never checks account quota before starting.
- Switching between Codex, Claude Code, and another supported agent is allowed at any phase. The incoming agent verifies the branch, worktree, diff, processes, pull request, and checks before continuing.

### Fixed-commit review

- Standards and Spec remain separate review axes. Each reviewer uses a fresh, read-only context that did not implement the reviewed commit.
- Either Codex or Claude Code may perform either axis. Authentication, authorization, database migrations, deployment workflows, production configuration, credential handling, destructive operations, and agent-workflow changes require one Codex review and one Claude Code review across the two axes.
- Each verdict is a pull-request comment that names the exact commit and returns `pass` or concrete findings. Any content change invalidates the affected verdict.
- The implementer records the evidence for accepting or rejecting each finding. An unresolved correctness or acceptance-criteria finding blocks merge. Product or architecture disagreements return to the founder. Other disputed findings receive a fresh review against the code, tests, and governing documents.

### Pull-request-only integration

- Required repository verification and GitHub checks pass before merge. Silence, a stopped session, or an interrupted command is `unknown`, never `pass`.
- An agent may squash-merge an ordinary accepted issue after the current commit has valid review verdicts and required checks. `main` rejects direct pushes and requires the pull-request checks.
- `Closes #<N>` closes the issue through the merge. Implementers, reviewers, dispatchers, and batch orchestrators do not close implementation issues directly.
- Production promotion, rollback, live-data migration, credential or domain changes, paid resources, store submission, and destructive or ambiguous recovery remain human-owned.
- Cleanup is evidence-based. Age alone never deletes a worktree, branch, or draft pull request.

### Sandcastle and CI boundaries

- Sandcastle may keep queue selection, dependency analysis, isolated workers, and its sandbox gate. Its batch merger, host-branch push, and direct issue closure retire. Each eligible issue enters the same branch, draft-pull-request, review, CI, merge, and recovery contract.
- ADR-0039's platform split remains: GitHub Actions runs CI on the Mac, and Railway builds and deploys only after CI passes. Shared Railway staging remains a post-merge smoke target and never becomes the destructive CI database.
- Before the cross-agent pilot, CI provisions disposable Postgres, Redis, and MinIO for each run on the current Mac and removes its dependence on the mutable development stack and patched runner launcher. A later move of ordinary CI to hosted Linux needs evidence from the pilot and a separate ADR that amends ADR-0039.

### Rollout and evaluation

The change lands in four reviewable stages:

1. Accept this ADR.
2. Update the current workflow documents, execution skills, and Sandcastle together to use one pull request per issue, durable checkpoints, read-only review, and merge-driven closure. Protect `main` and repair the existing Sprint 11 status-metadata drift as a factual correction.
3. Make the current Mac CI runner hermetic with disposable Postgres, Redis, and MinIO.
4. Run an eight-issue pilot with no more than two issues in flight. Use four API or contract issues, two ordinary mobile issues, and two cross-workspace issues. Exclude production mutations, credentials, store submissions, live-data migrations, unresolved product decisions, and hardware-only work.

The pilot deliberately switches tools on four issues: two implementation handoffs and two review handoffs. It succeeds only with zero direct pushes, premature closures, duplicate issue branches, stale review verdicts, pre-merge required-check failures accepted as complete, and post-merge missing acceptance criteria. The retrospective records elapsed time, review cycles, CI failures, human interventions, and whether each tool switch resumed without chat history. It sets no performance target before a baseline exists.

Sprint 11's human and production gates do not block the pilot. Eligible ordinary `ready-for-agent` issues may enter it after the first three rollout stages pass.

## Consequences

### Positive

- Codex and Claude Code can exchange implementation and review roles without maintaining mirror skills or relying on one vendor's session history.
- Every issue has one visible recovery point. A quota limit, crash, or context loss leaves inspectable Git and GitHub state.
- Review evidence identifies both the reviewer context and the commit, so a later code change cannot retain a stale pass.
- Pull-request checks run before issue closure, including AFK work.
- The pilot measures portability and failure recovery before the workflow expands beyond two concurrent issues.

### Negative / accepted costs

- Draft pull requests and checkpoint commits add GitHub activity. Squash merge keeps `main` history focused.
- Two independent reviews cost more time and usage. Cross-vendor review is limited to high-risk changes.
- Sandcastle loses its batch-integration shortcut and may complete fewer issues per unattended run.
- Hermetic CI requires test-infrastructure work before the pilot even though the runner remains on the same Mac.
- Branch protection and merge-driven closure make GitHub availability part of the delivery path.

### Neutral

- ADR-0040's single `.claude/skills/` layer remains the only executable repository skill layer. Codex follows those same tracked instructions through `AGENTS.md` and the tool-neutral workflow router; no `.agents/skills/` mirror is added.
- ADR-0010 continues to own the real Postgres and Redis testing requirement.
- ADR-0039 continues to own the Mac CI and Railway deploy-only split.
- Product documentation, domain vocabulary, and application `CONTEXT.md` files do not change because this decision governs engineering workflow.

## Alternatives considered

- **Assign permanent vendor roles.** Rejected because a quota limit, tool outage, or task-specific strength would force a manual workflow exception. Fresh context matters for review independence; vendor identity does not for ordinary issues.
- **Use chat transcripts as the handoff.** Rejected because another tool may not have access to them and an abrupt stop may prevent a final summary.
- **Let Sandcastle keep direct batch integration and rely on push CI.** Rejected because failures arrive after integration and issue closure.
- **Require a human merge for every issue.** Rejected because accepted, ordinary issues already authorize branch-to-merge execution. Human control remains at product decisions and external or destructive operations.
- **Run CI against Railway staging.** Rejected because staging is shared, persistent, and downstream of the CI gate. Destructive or concurrent test suites would make its state and deployed revision unreliable.
- **Create a permanent Railway CI environment.** Rejected because ordinary tests can run with disposable local services, while another seven-service environment adds cost and provider-side configuration drift.
- **Check quota before accepting work.** Rejected because the workflow should recover from interruption rather than predict account availability.

## References

- [ADR-0010](0010-testing-obs.md) - real Postgres and Redis integration-test discipline
- [ADR-0019](0019-context-md-describes-current-state.md) - current-state documentation boundary
- [ADR-0020](0020-document-hierarchy-and-mutability.md) - document roles and mutability
- [ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md) - existing AFK parallel path
- [ADR-0039](0039-phased-cloud-first-hosting.md) - Mac CI and Railway deployment split
- [ADR-0040](0040-repo-canonical-workflow-skills.md) - single repository skill layer
- [`docs/agents/coding-workflow.md`](../agents/coding-workflow.md) - repository workflow router
- [`docs/agents/issue-tracker.md`](../agents/issue-tracker.md) - issue and dependency conventions
- [`docs/agents/worktree-lifecycle.md`](../agents/worktree-lifecycle.md) - worktree recovery and cleanup
- [`docs/agents/sandcastle.md`](../agents/sandcastle.md) - current AFK operating guide
