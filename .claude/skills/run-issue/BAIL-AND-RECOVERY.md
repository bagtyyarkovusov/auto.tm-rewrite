# Bail and recovery

Preserve evidence and make recovery obvious. Never reset, stash, delete, or overwrite user work to make a run look clean.

## Before the first checkpoint

The pushed `agent/issue-<N>` reservation remains. Keep the working tree exactly as-is and comment on the issue with branch/HEAD, files changed, known command state, failure/root cause, attempts, and the next safe action.

## After the draft PR exists

Update its single `Execution state` to `blocked` with:

- branch and last pushed checkpoint SHA;
- completed acceptance criteria;
- verification already passed;
- current failure and root cause;
- interrupted commands and whether their result is unknown;
- repair attempts;
- documentation and Context7 state; and
- one concrete next action.

Keep the remote branch and PR open. Never open a replacement PR or directly close the issue.

## Bail immediately when

- required product intent or architecture authority is missing;
- the working tree contains overlapping user changes;
- destructive recovery would be required without authorization;
- the same root failure survives three focused repairs;
- required credentials, service, hardware, or host gate is unavailable;
- a design decision remains open; or
- a conflict has multiple valid semantic resolutions.

Temporary logs and generated evidence belong under `/tmp`, not a committed or ignored tool directory.

## Recovery contract

Route every preserved attempt through `resume-issue <N>`. The incoming agent inspects issue, branch, worktree, PR, checks, comments, processes, and diff before selecting the safest deterministic continuation. It pauses only for destructive or semantically ambiguous recovery.
