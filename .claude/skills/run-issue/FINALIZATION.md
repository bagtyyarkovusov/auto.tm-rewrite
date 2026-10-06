# Fixed-commit finalization

Invocation of `run-issue N` authorizes these ordinary steps after implementation and verification pass.

Keep terms in the PR, reviews, and reconciliation aligned with the canonical [domain glossary](../../../docs/domain/GLOSSARY.md).

## Checkpoint and pin

1. Review `git status --short` and the complete diff.
2. Stage explicit paths only; never use `git add -A` or absorb unrelated files.
3. Commit and push meaningful checkpoints. Use a valid conventional type and no model-specific co-author trailer.
4. Keep the existing draft PR's `Execution state` current. Never create a replacement PR.
5. Record the resulting commit SHA. That fixed SHA is the review target.

## Independent review

One review round, one fix round, no re-review ([ADR-0085](../../../docs/adr/0085-one-review-round-one-fix-round-no-re-review.md)).

1. **Review once.** Run one Standards and one Spec reviewer as separate, fresh, read-only contexts that did not implement the commit, in parallel, pinned to the final verified SHA. A reviewer may inspect and run non-mutating commands but must not edit, format, commit, or push. Each returns a report under 400 words: blocking findings first, each with file and line; no restatement of what is sound.
2. **Post.** The orchestrator posts both reports in one PR comment in the shape below.
3. **Fix once.** The orchestrator accepts or rejects each finding and records why. One implementer fixes every accepted finding in one round; an orchestrator that wrote the PR fixes them itself. An unresolved correctness or acceptance-criteria finding blocks merge. A product or architecture dispute returns to the founder. Non-blocking findings may be deferred to one follow-up issue or batch PR per area, as [Small changes](../../../docs/agents/coding-workflow.md#small-changes-adr-0065) describes.
4. **No re-review.** Nothing reviews the fix round, and a fix does not void the verdicts. The orchestrator reads the fix diff, confirms it stays within the findings, reruns the affected local gates, and records each finding in `Execution state` as `fixed in <sha>`, `deferred to <issue>` or `rejected: <reason>`. The founder may ask for another review of any PR; no rule triggers one.

Codex desktop, Claude Code desktop, and the `claude-kimi` CLI may each perform either axis, or both, on any pull request, including high-risk changes. There is no provider-diversity requirement or per-PR waiver. See [ADR-0064](../../../docs/adr/0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md).

```markdown
## Review at `<full SHA>`

### Standards
- **Reviewer:** <agent/context identifier>
- **Provider:** <OpenAI|Anthropic|Kimi; actual model provider>
- **Client:** <Codex desktop|Claude Code desktop|claude-kimi (Claude Code CLI); actual interface>
- **Verdict:** pass | findings

<findings with file and line, or “No findings.”>

### Spec
<the same fields and findings>
```

### Spec evidence checklist

For each acceptance criterion, inspect the [acceptance evidence](VERIFICATION.md#acceptance-evidence) and its [PR record](EXECUTION-STATE.md#acceptance-evidence-record):

- Would the criterion's test fail if the required behaviour broke? Inspect the assertion and exercised path; a green command alone is insufficient.
- Does its recorded failing run demonstrate the unmet criterion before production implementation, followed by the same test passing, or a valid exemption?
- For UI behaviour, does the test actually render and exercise the component or screen?
- For UI look, are PR-attached simulator or emulator screenshots present for every governing design state, and does each agree with its spec? Record mismatches and missing states as findings. No screenshot or snapshot matcher is required.

### Standards scope

The Standards reviewer checks the diff against the repository's documented standards and cites the document a finding breaks: [AGENTS.md](../../../AGENTS.md) guardrails, the affected area's `CONTEXT.md`, the guides under [docs/agents](../../../docs/agents), and [VERIFICATION.md](VERIFICATION.md). For module shape and test quality it applies [Coding standards](../../../docs/agents/coding-standards.md), within that file's own limits: new lines only, non-blocking until the first store release, and no refactor requests in a feature pull request.

## Ready PR

The PR title mirrors the issue. Its body starts with `Closes #<N>` and keeps one mutable `Execution state`, followed by:

```markdown
## Summary
<the smallest view that makes the change clear: a call tree, component tree, file tree, or diff sketch, with one or two lines of prose>

## Evidence
- [x] <acceptance criterion> — **Before:** <failing run, output, or screenshot> **After:** <passing run, output, or screenshot>
- `<command>` — pass
- <manual or host-only gate and result; ADR, CONTEXT, or design implications when there are any>

## Merge danger
- **Door:** <one-way or two-way; one-way when a revert cannot undo it, such as a migration, published contract, or sent data>
- **Blast radius:** <who or what breaks if this is wrong>
```

An integration PR ([ADR-0084](../../../docs/adr/0084-related-issues-of-one-parent-may-ship-on-one-integration-branch.md)) has one `Closes #<N>` line and one `Execution state` per issue. [run-queue](../run-queue/SKILL.md#integration-branches) owns its merger and fix-round steps.

Mark the draft ready only after verification passes, the review round is posted, and the fix round, when there is one, is recorded in `Execution state`.

## Checks and merge

`main` is protected: it requires a pull request and the `pr` check (the `pr` job of the [PR Checks workflow](../../../.github/workflows/pr-checks.yml)), allows only squash merges, requires linear history, and applies to administrators. Nobody can merge a PR with a failing or pending `pr` check or push to `main` directly. GitHub deletes a PR's head branch when it merges and retargets PRs based on that branch to `main`.

- Once the review round and its fix round are recorded, run `gh pr ready <PR>` and then `gh pr merge <PR> --auto --squash`. GitHub merges the PR when the `pr` check passes.
- A push does not cancel auto-merge. Before pushing any commit to a PR that has auto-merge on, run `gh pr merge <PR> --disable-auto`, then set it again once the orchestrator has read the new commit. Otherwise GitHub merges it unread as soon as `pr` passes.
- Wait for the required `pr` check, or, under [run-queue](../run-queue/SKILL.md), continue with the next issue and come back when the check finishes. Read the state with `gh pr view <PR> --json state,mergedAt,autoMergeRequest,statusCheckRollup`. Pending, missing output, or an interrupted run is `unknown`, never `pass`.
- Repair an in-scope CI defect and push within the same three-attempt cap. The repair needs no review.
- On a failed check, conflict, or protection failure, leave the PR open and preserve exact state.
- Never self-approve.
- Never bypass protection, merge by hand while a check is pending, or use another merge method.
- Verify PR merge and issue closure independently from the merge command's exit status.

## Integrity and sync

1. The issue must close through the PR's `Closes #N`; do not close it directly. If it remains open after merge, treat that as an integration failure, preserve the exact PR and issue evidence, and escalate it without creating a replacement PR or closing the issue directly. Repair requires an explicit governing decision for this exceptional state.
2. Verify and sync local `main` without discarding user state.
3. Follow child-progress reconciliation in `docs/agents/sprint-transitions.md` and re-evaluate affected `blocked` labels from their `## Depends on` sections.
4. Re-fetch the parent and affected children before reporting.
5. Follow [the worktree lifecycle](../../../docs/agents/worktree-lifecycle.md). A live task worktree reports its cleanup tuple for the integration session.

Do not create a second direct-to-main roadmap commit. If final-issue roadmap closeout was explicitly part of the issue, it belongs in the original PR; otherwise `close-sprint` owns reconciliation.
