# Durable execution state

Git and GitHub are the recovery record for every implementation issue. Chat history may provide context, but another supported coding agent must be able to continue without it.

## Reservation and first checkpoint

1. Create `agent/issue-<N>` from updated `main` and push it before editing. The remote branch is the issue reservation.
2. Commit and push after the first meaningful checkpoint, then open a draft pull request. The body starts with `Closes #<N>` and contains exactly one mutable `Execution state` section.
3. Update that section after every checkpoint, verification result, review verdict, failure, or handoff. Do not append competing state summaries.
4. Never query Codex, Claude, or another provider for remaining quota before starting. Checkpoints make an unexpected stop recoverable.

Use this shape:

```markdown
## Execution state

- **Status:** implementing | verifying | reviewing | ready-to-merge | blocked
- **Last checkpoint:** `<commit SHA>`
- **Completed acceptance criteria:** `<issue checkbox references or concise list>`
- **Verification:** `<command and pass/fail/unknown result>`
- **Current failure:** `<root cause or none>`
- **Interrupted commands:** `<command and last known state or none>`
- **Documentation:** `<CONTEXT/ADR/PRD status>`
- **Context7:** `<library IDs consulted or not applicable>`
- **Reviews:** `Standards <verdict/SHA>; Spec <verdict/SHA>`
- **Next action:** `<one concrete action>`
```

Silence, a stopped process, and missing output are `unknown`, never `pass`.

## Checkpoint boundaries

Create a checkpoint when any of these becomes true:

- one acceptance criterion is implemented with its test or inspection evidence;
- a migration, generated contract, or current-state document changes;
- a verification phase finishes;
- a review finding is resolved;
- work is about to cross a tool, machine, or session boundary; or
- a long-running command can be safely interrupted after preserving the current result.

Checkpoint commits may be small. The final squash keeps `main` history focused.

## Handoff inspection

An incoming Codex, Claude, or other supported agent inspects the issue, local and remote branch heads, worktree status, draft PR body and comments, checks, running processes, and the complete diff before changing anything. It resumes the existing record instead of creating another branch, worktree, PR, or summary document.
