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

Run separate, fresh, read-only Standards and Spec contexts that did not implement the reviewed commit. They may work concurrently against the same fixed SHA. A reviewer may inspect and run non-mutating commands but must not edit, format, commit, or push.

Codex desktop, Claude Code desktop, and the `claude-kimi` CLI may each perform either axis, or both, on any pull request, including high-risk changes. There is no provider-diversity requirement or per-PR waiver. See [ADR-0064](../../../docs/adr/0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md).

Each review produces a PR comment with:

```markdown
## <Standards|Spec> review

- **Review axis:** <Standards|Spec>
- **Reviewer:** <agent/context identifier>
- **Provider:** <OpenAI|Anthropic|Kimi; actual model provider>
- **Client:** <Codex desktop|Claude Code desktop|claude-kimi (Claude Code CLI); actual interface>
- **Commit:** `<full SHA>`
- **Verdict:** pass | findings

<concrete findings and evidence, or “No findings.”>
```

A fix-in-place delta review ([ADR-0065](../../../docs/adr/0065-small-changes-skip-the-issue-ceremony.md)) uses the same fields with `Review axis: Delta`, `Base commit` and `Commit`, and a `Carries forward` line naming the earlier verdicts it keeps.

If Claude Code desktop cannot post the PR comment, the integration owner transfers its read-only, SHA-pinned verdict and evidence to the PR with the original reviewer, provider, and client attribution. Record the evidence for accepting or rejecting every finding in the PR. Resolve accepted findings, rerun proportionate verification, commit and push the fixes, and pin the new SHA. An unresolved correctness or acceptance-criteria finding blocks merge. Product or architecture disputes return to the founder; other disputed findings receive a fresh read-only review against the code, tests, and governing documents. Any content change invalidates the affected earlier verdict. Exception ([ADR-0065](../../../docs/adr/0065-small-changes-skip-the-issue-ceremony.md)): a fix for a finding of about 50 lines or fewer, within the PR's scope and with no migration, contract change, or product decision, needs only a fresh read-only review of the new commits, recorded with `Review axis: Delta`, the base and new commits, and the verdicts it carries forward; earlier verdicts carry forward unless that reviewer finds the delta changes what they covered, and an axis whose verdict no longer holds gets a full re-review. Non-blocking findings deferred from the PR are batched into one follow-up issue or batch PR per area, as [Small changes](../../../docs/agents/coding-workflow.md#small-changes-adr-0065) describes. Continue only when both axes pass against the latest commit, directly or carried forward by a `Delta` review.

### Spec evidence checklist

For each acceptance criterion, inspect the [acceptance evidence](VERIFICATION.md#acceptance-evidence) and its [PR record](EXECUTION-STATE.md#acceptance-evidence-record):

- Would the criterion's test fail if the required behaviour broke? Inspect the assertion and exercised path; a green command alone is insufficient.
- Does its recorded failing run demonstrate the unmet criterion before production implementation, followed by the same test passing, or a valid exemption?
- For UI behaviour, does the test actually render and exercise the component or screen?
- For UI look, are PR-attached simulator or emulator screenshots present for every governing design state, and does each agree with its spec? Record mismatches and missing states as findings. No screenshot or snapshot matcher is required.

## Ready PR

The PR title mirrors the issue. Its body starts with `Closes #<N>` and keeps one mutable `Execution state`, followed by:

```markdown
## Summary
- <behavior shipped>

## Acceptance criteria
- [x] <criterion + evidence>

## Test plan
- `<command>` — pass
- <manual/host-only gate and result>

## Architecture notes
- <ADR/CONTEXT/library-doc implications, or omit>

## Design notes
- <wireframe/hi-fi/UX evidence, or omit>
```

Mark the draft ready only after verification passes and both axes pass on its current SHA, directly or carried forward by a `Delta` review.

## Checks and merge

`main` is protected: it requires a pull request and the `pr` check, allows only squash merges, requires linear history, and applies to administrators. Nobody can merge a PR with a failing or pending `pr` check or push to `main` directly. GitHub deletes a PR's head branch when it merges and retargets PRs based on that branch to `main`.

- Once both axes pass on the current commit, run `gh pr ready <PR>` and then `gh pr merge <PR> --auto --squash`. GitHub merges the PR when the `pr` check passes.
- A push does not cancel auto-merge. Before pushing any commit to a PR that has auto-merge on, run `gh pr merge <PR> --disable-auto`, then set it again only after the affected reviews pass on the new commit. Otherwise GitHub merges the unreviewed commit as soon as `pr` passes.
- Wait for required checks, or, under [run-queue](../run-queue/SKILL.md), continue with the next issue and come back when the check finishes. Read the state with `gh pr view <PR> --json state,mergedAt,autoMergeRequest,statusCheckRollup`. Pending, missing output, or an interrupted run is `unknown`, never `pass`.
- Repair an in-scope CI defect and push within the same three-attempt cap; repeat affected review axes.
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
