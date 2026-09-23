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

Run separate, fresh, read-only Standards and Spec contexts that did not implement the reviewed commit. A reviewer may inspect and run non-mutating commands but must not edit, format, commit, or push.

The same provider may perform both axes for ordinary work. Authentication, authorization, database migrations, deployment workflows, production configuration, credential handling, destructive operations, and agent-workflow changes require one Codex and one Claude review across the two axes.

Each reviewer posts a PR comment with:

```markdown
## <Standards|Spec> review

- **Reviewer:** <agent/context identifier>
- **Provider:** <Codex|Claude>
- **Commit:** `<full SHA>`
- **Verdict:** pass | findings

<concrete findings and evidence, or “No findings.”>
```

Resolve valid findings, rerun proportionate verification, commit and push the fixes, and pin the new SHA. Any content change invalidates the affected earlier verdict. Continue only when both axes pass against the latest commit.

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
```

Mark the draft ready only after verification and both reviews pass on its current SHA.

## Checks and merge

- Wait for required checks. Pending, missing output, or an interrupted run is `unknown`, never `pass`.
- Repair an in-scope CI defect and push within the same three-attempt cap; repeat affected review axes.
- On a failed check, conflict, or protection failure, leave the PR open and preserve exact state.
- Never self-approve.
- Squash merge with branch deletion once required checks and reviews pass.
- Verify PR merge and issue closure independently from the merge command's exit status.

## Integrity and sync

1. The issue must close through the PR's `Closes #N`; do not close it directly.
2. Verify and sync local `main` without discarding user state.
3. Follow child-progress reconciliation in `docs/agents/sprint-transitions.md` and re-evaluate affected `blocked` labels from their `## Depends on` sections.
4. Re-fetch the parent and affected children before reporting.
5. Follow [the worktree lifecycle](../../../docs/agents/worktree-lifecycle.md). A live task worktree reports its cleanup tuple for the integration session.

Do not create a second direct-to-main roadmap commit. If final-issue roadmap closeout was explicitly part of the issue, it belongs in the original PR; otherwise `close-sprint` owns reconciliation.
