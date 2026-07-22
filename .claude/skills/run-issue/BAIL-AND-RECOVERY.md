# Bail and recovery

Preserve evidence and make recovery obvious. Never reset, stash, delete, or overwrite user work to make a run look clean.

## State classes

### Preflight rejection

No branch was created and no implementation began. Report the failed readiness condition. Do not add an “Agent bailed” comment unless the issue itself needs a durable blocker note.

### In-flight bail before push

Keep the local `agent/issue-<N>` branch and working tree exactly as-is. Comment on the issue with:

- branch and HEAD;
- files changed;
- verification already passed;
- failing command/root cause;
- repair attempts;
- the decision or environment change needed; and
- `Resume with /resume-issue <N>`.

### Post-push or PR bail

Keep the remote branch and PR open. Record their URLs, check/conflict/protection state, local divergence, and the next safe action. Never open a replacement PR automatically.

## Bail immediately when

- required product intent or architecture authority is missing;
- the working tree contains overlapping user changes;
- a destructive operation would be required without approval;
- the same root failure survives three focused repairs;
- required credentials, service, hardware, or host gate is unavailable;
- a design decision remains open; or
- a conflict has multiple valid semantic resolutions.

Temporary logs and generated evidence belong under `/tmp`, not `.mastra/` or another committed/ignored tool directory.

## Recovery contract

Route every preserved attempt through `/resume-issue <N>`. Resume must inspect local branch, remote branch, bail comment, and PR before offering continue, safety-branch-and-rebase, preserve-and-restart, or cancel.
