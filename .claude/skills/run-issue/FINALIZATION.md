# Finalization

Invocation of `/run-issue N` authorizes these ordinary steps after verification passes.

## Commit

1. Review `git status --short` and the complete diff.
2. Stage explicit paths only; never use `git add -A` or absorb unrelated files.
3. Use intentional local commits when they improve review. The PR squash creates one mainline commit.
4. Use a valid type: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `build`, `ci`, or `chore`.
5. Preserve a valid conventional issue title when possible; otherwise derive the scope from the primary area.
6. Do not add a generated-agent or model-specific co-author trailer.

## Push and PR

Push `agent/issue-<N>` and create one PR against `main`. Do not duplicate an existing PR.

The title mirrors the issue. The body starts with `Closes #<N>` and includes:

```markdown
Closes #<N>

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

## Checks and merge

- Wait for required checks. Pending is not failure.
- Repair an in-scope CI defect and push within the same three-attempt cap.
- On a failed check, conflict, or protection failure, leave the PR open and bail with its URL and exact state.
- Never self-approve.
- Squash merge with branch deletion once required checks pass: `gh pr merge --squash --delete-branch`.
- Do not repeat manual local/remote branch deletion already handled by `gh`.

## Integrity and sync

1. Verify the PR merged and the issue closed through `Closes #N`.
2. If the issue stayed open, report the integrity failure and ask before manual closure.
3. Verify/sync local `main` without discarding user state.
4. Inspect open dependents. Remove `blocked` only when every issue in their `## Depends on` section is closed.
5. Report every label changed.

Do not create a second direct-to-main roadmap commit. If final-issue roadmap closeout was explicitly part of the issue, it belongs in the original PR; otherwise `/close-sprint` owns the reconciliation.
