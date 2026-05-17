---
description: Pick up an issue that /run-issue bailed on. Reads the bail comment, inspects the preserved local branch, and proposes continue / restart / abandon. After confirmation, resumes the verify→commit→push→PR→merge→sync→unblock flow from where the previous attempt stopped.
---

# AutoTM — Resume a bailed issue

> **Invocation:** `/resume-issue [ISSUE_NUMBER]` — `$ARGUMENTS` is the issue number.
>
> - If `$ARGUMENTS` is a valid issue number, use it as **N**.
> - If `$ARGUMENTS` is empty, list issues that look like candidates (have a recent "BAILED" comment) and ask the user.
>
> You are a Claude Code agent running in `/Users/bagtyyar/Projects/auto.tm-rewrite`. A previous `/run-issue <N>` run hit a bail condition (§11 of that command) and stopped without pushing — the local branch `agent/issue-<N>` is preserved on this machine. Your job is to read what went wrong, decide how to recover, get the user's OK, and finish the work.

---

## 0. Hard rules (non-negotiable)

- **Never `git push --force`, `--no-verify`, or `git reset --hard` against any branch.**
- **Never destroy the user's preserved work without explicit consent.** The "abandon and restart" path requires a clear `yes` from the user — preserve the branch as `agent/issue-<N>-bail-<timestamp>` instead of deleting.
- **Never push or open a PR before re-running the full verify block** (§5 of `/run-issue`) on the resumed state.
- All the rules from `/run-issue` §0 still apply: no main writes, no closing issues, no merging without user approval where required, etc. Inherit the full hard-rules set from `.claude/commands/run-issue.md` §0.

---

## 1. Read these first

1. `.claude/commands/run-issue.md` — you are continuing its flow; know what it expects
2. `CLAUDE.md`, `docs/prd/03-roadmap.md`, current sprint file — same as `/run-issue` §1
3. `docs/agents/issue-tracker.md` — issue conventions

---

## 2. Resolve N — which issue?

**Branch A — `$ARGUMENTS` is a number:** treat as **N**. Skip to §3.

**Branch B — `$ARGUMENTS` is empty:** find recent bail candidates. Run:

```bash
# Local branches that look like agent branches
git branch --list 'agent/issue-*'

# Issues with a recent "BAILED" comment (within 30 days)
for issue in $(gh issue list --state open --label "ready-for-agent" --json number --jq '.[].number'); do
  has_bail=$(gh issue view $issue --json comments --jq '.comments[] | select(.body | startswith("## Agent bailed")) | .createdAt' | tail -1)
  if [ -n "$has_bail" ]; then
    echo "#$issue (last bail: $has_bail)"
  fi
done
```

Print the candidates and ask: *"Which issue do you want to resume? Reply with the number."*

---

## 3. Inspect the local branch

```bash
# Does the branch exist locally?
git rev-parse --verify agent/issue-$N 2>/dev/null && echo "BRANCH_EXISTS" || echo "BRANCH_MISSING"
```

**If `BRANCH_MISSING`**: the preserved work is gone (maybe a different machine, maybe the user cleaned up). Tell the user this resume is going to be a full restart, and ask: *"The local branch `agent/issue-<N>` doesn't exist. Restart from scratch? (yes / cancel)"*

- `yes` → just run `/run-issue <N>` (chain to it; or instruct the user to)
- `cancel` → stop

**If `BRANCH_EXISTS`**, inspect deeper:

```bash
git checkout agent/issue-$N

# How does it compare to main?
git fetch origin main
COMMITS_AHEAD=$(git rev-list --count main..HEAD)
COMMITS_BEHIND=$(git rev-list --count HEAD..main)
echo "Ahead of main: $COMMITS_AHEAD commits"
echo "Behind main: $COMMITS_BEHIND commits"

# Working tree state
git status --short
git diff --stat
```

Record:
- `COMMITS_AHEAD` (how much work was done before the bail)
- `COMMITS_BEHIND` (how much main has moved since the bail)
- Working tree state (clean / uncommitted edits / untracked files)

---

## 4. Read the bail context

```bash
# Last "Agent bailed" comment on the issue
gh issue view $N --json comments --jq '.comments[] | select(.body | startswith("## Agent bailed"))' | tail -1
```

Extract:
- **Reason** (one sentence)
- **State left behind** (list of files touched, last failing command)
- **Suggested next step** (the previous agent's recommendation)

If no bail comment exists but the branch does, the issue may have been worked manually and abandoned mid-flight. Treat as a "no clear bail reason" — surface that in the proposal.

---

## 5. Run the current state through verify

This tells you whether the preserved work is salvageable or whether main has moved out from under it.

**Also check the CONTEXT.md state** (per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md)). For each bounded context the touched files imply, grep its CONTEXT.md for the new entity/port/use-case the issue was meant to ship. If the code is in place but CONTEXT.md wasn't updated, that's a remediation item the resumed flow must fix before commit (this is what `/run-issue` §5.5 enforces; resuming inherits the same rule).

```bash
# Touched workspaces (best-effort detection from the diff)
TOUCHED_WORKSPACES=$(git diff main --name-only | awk -F/ '/^(apps|packages)\// {print $1"/"$2}' | sort -u)

# Try install (handles lockfile drift)
pnpm install 2>&1 | tail -20

# Typecheck + lint + test for touched workspaces
for ws_path in $TOUCHED_WORKSPACES; do
  ws_name=$(grep -m1 '"name"' "$ws_path/package.json" | sed -E 's/.*"name": *"([^"]+)".*/\1/')
  echo "=== $ws_name ==="
  pnpm --filter "$ws_name" typecheck 2>&1 | tail -10
  pnpm --filter "$ws_name" lint 2>&1 | tail -10
  pnpm --filter "$ws_name" test 2>&1 | tail -20
done
```

Capture which commands pass vs fail.

---

## 6. Compose the remediation proposal

Print to the user:

```
==============================================
Resume #<N> — current state
==============================================

Branch:       agent/issue-<N>  ($COMMITS_AHEAD ahead, $COMMITS_BEHIND behind main)
Working tree: <clean | N modified, N untracked>
Bail reason:  <one sentence from §4>
Suggested:    <previous agent's recommendation from §4>

Verify pass:
  typecheck:  <pass | fail>
  lint:       <pass | fail>
  test:       <pass | fail>

Remediation options:

  (A) Continue from current state
      - Apply additional changes to fix the bail reason
      - Re-run verify; commit; push; open PR; merge; sync; unblock
      - Best when: bail reason was a specific failure that's now fixable

  (B) Rebase onto main and continue
      - git rebase main (resolve conflicts if any)
      - Re-run verify; continue as (A)
      - Best when: $COMMITS_BEHIND > 0 and main has shipping changes that affect this work

  (C) Abandon and restart from main
      - Move agent/issue-<N> to agent/issue-<N>-bail-<timestamp> (preserved, not deleted)
      - Run /run-issue <N> in a fresh branch from main
      - Best when: bail revealed the approach was fundamentally wrong

Which option? (A / B / C / cancel)
```

Wait for the user's choice. Do not proceed without one.

---

## 7. Execute the chosen path

### Path A — Continue from current state

1. Re-read the issue body + bail comment + any newer comments.
2. Implement fixes for what the bail flagged. Use `TodoWrite` to track.
3. Run the verify block again (§5). All must pass.
4. Self-review against issue AC (use `/run-issue` §5's self-review pattern).
5. Continue from `/run-issue` §6 — commit + push + open PR + approve + merge + sync + unblock.

### Path B — Rebase onto main and continue

1. Capture the current branch tip as a safety net:
   ```bash
   git branch agent/issue-$N-pre-rebase
   ```
2. ```bash
   git fetch origin main
   git rebase main
   ```
3. If conflicts: stop, show the conflicts, ask the user how to resolve. **Never `git rebase --skip` automatically.**
4. After clean rebase, run the verify block (§5).
5. Continue as Path A from step 5.
6. After successful merge, delete the safety branch: `git branch -D agent/issue-$N-pre-rebase`.

### Path C — Abandon and restart

1. Move the branch aside (don't delete — preserve for forensic value):
   ```bash
   TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
   git checkout main
   git branch -m agent/issue-$N agent/issue-$N-bail-$TIMESTAMP
   git pull origin main
   ```
2. Comment on the issue:
   ```bash
   gh issue comment $N --body "Resuming from scratch. Previous bail branch preserved locally as \`agent/issue-$N-bail-$TIMESTAMP\`."
   ```
3. Now run `/run-issue $N` (or instruct the user to). Do **not** continue Path A flow.

---

## 8. Final summary

After the chosen path completes successfully (or the user cancels):

For Path A or B (successful completion through merge + unblock):

```
Resumed issue #<N> via path <A|B>.

Closed via PR <url>
Branch agent/issue-<N> merged and deleted
Local main synced to <new SHA>
Dependents unblocked: #<X>, #<Y>     (or "none")

Notes:
  - <Path B only> Safety branch agent/issue-<N>-pre-rebase deleted after successful merge
```

For Path C:

```
Abandoned and restarting #<N>.

Preserved bail branch: agent/issue-<N>-bail-<timestamp>
Now run /run-issue <N> to start fresh.
```

For cancel:

```
Resume cancelled for #<N>.

Branch state preserved:
  - agent/issue-<N> (still checked out — switch with `git checkout main` when ready)
```

---

## 9. Bail conditions (recursive bails)

If, during the resume, the verify still fails after 3 fix attempts on Path A or B:

1. Comment on the issue with a fresh "## Agent bailed (during resume)" block referencing the original bail comment.
2. Leave the branch as-is.
3. Tell the user the resume bailed and suggest:
   - Look at the failing test/output manually
   - Try Path C (abandon + restart) on a fresh `/resume-issue`
4. Stop.

Do **not** loop indefinitely. Do **not** silently push broken code.

---

## 10. What this command will NOT do

- Squash-merge the preserved local commits into the final PR. The PR is squashed at merge time by `gh pr merge --squash`, so multiple commits on `agent/issue-<N>` are fine.
- Rewrite the issue body. If the body is wrong, comment on the issue suggesting a fix.
- Reopen a closed issue. If the issue was closed by mistake, the user must reopen it manually before `/resume-issue`.
- Touch other issues' state. Even if the resume reveals a dependency was wrong, fix it via a new issue or a direct comment, not silently.

---

## Tooling reference

- `Read`, `Edit`, `Glob`, `Grep` — file work for the implementation phase
- `Bash` — every `git`, `gh`, `pnpm`
- `TodoWrite` — track progress through Paths A/B/C
- **No subagents.** Single session, single issue.

End of prompt.
