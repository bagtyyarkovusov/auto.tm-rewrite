---
name: resume-issue-agent-skill
description: Picks up an AutoTM issue that a previous AFK agent run bailed on. Use when the user asks to "resume issue N", "continue issue N", "fix the bail on N", or wants to recover a /run-issue session that stopped without pushing. The skill reads the bail comment on the issue, inspects the preserved local branch `agent/issue-<N>`, runs the verify block to see what still works after main has moved, then proposes three remediations: (A) continue from current state, (B) rebase onto main and continue, or (C) abandon and restart from scratch with the bail branch preserved as agent/issue-<N>-bail-<timestamp>. After human confirmation, resumes the verify→commit→push→PR→merge→sync→unblock flow from where the previous attempt stopped. Never force-pushes, never destroys preserved work without explicit consent.
---

# AutoTM — Resume a bailed issue (agent skill)

> **Source:** Mirrors `.claude/commands/resume-issue.md` adapted for cross-agent use.
>
> **Invocation:** When the user says "resume issue 5", "continue 5", "fix bail on 5", treat that number as **N**. If empty, list issues with recent "BAILED" comments and ask.
>
> A previous `run-issue-agent-skill <N>` run hit a bail condition and stopped without pushing. The local branch `agent/issue-<N>` is preserved. Read what went wrong, decide how to recover, get user OK, finish the work.

---

## 0. Hard rules

- **Never `git push --force`, `--no-verify`, or `git reset --hard` against any branch.**
- **Never destroy preserved work without explicit consent.** "Abandon and restart" preserves the bail branch as `agent/issue-<N>-bail-<timestamp>` instead of deleting.
- **Never push or open a PR before re-running the full verify block** on the resumed state.
- All hard rules from run-issue-agent-skill §0 still apply.

---

## 1. Read first

1. `run-issue-agent-skill/SKILL.md` (or `.claude/commands/run-issue.md`) — you're continuing its flow
2. `CLAUDE.md`, `docs/prd/03-roadmap.md`, current sprint file
3. `docs/agents/issue-tracker.md`

---

## 2. Resolve N

**If user named a number:** treat as **N**.

**If empty:** find bail candidates:

```bash
git branch --list 'agent/issue-*'

for issue in $(gh issue list --state open --label "ready-for-agent" --json number --jq '.[].number'); do
  has_bail=$(gh issue view $issue --json comments --jq '.comments[] | select(.body | startswith("## Agent bailed")) | .createdAt' | tail -1)
  if [ -n "$has_bail" ]; then
    echo "#$issue (last bail: $has_bail)"
  fi
done
```

Ask: *"Which issue should I resume?"*

---

## 3. Inspect the local branch

```bash
git rev-parse --verify agent/issue-$N 2>/dev/null && echo "BRANCH_EXISTS" || echo "BRANCH_MISSING"
```

**BRANCH_MISSING:** preserved work is gone. Ask: *"Restart from scratch? (yes / cancel)"*. `yes` → invoke run-issue-agent-skill <N>. `cancel` → stop.

**BRANCH_EXISTS:**

```bash
git checkout agent/issue-$N
git fetch origin main
COMMITS_AHEAD=$(git rev-list --count main..HEAD)
COMMITS_BEHIND=$(git rev-list --count HEAD..main)
git status --short
git diff --stat
```

Record: ahead/behind counts, working tree state.

---

## 4. Read the bail context

```bash
gh issue view $N --json comments --jq '.comments[] | select(.body | startswith("## Agent bailed"))' | tail -1
```

Extract: reason, state-left-behind, suggested-next.

If no bail comment exists but branch does: branch may have been worked manually. Surface that.

---

## 5. Run current state through verify

Detect touched workspaces:

```bash
TOUCHED_WORKSPACES=$(git diff main --name-only | awk -F/ '/^(apps|packages)\// {print $1"/"$2}' | sort -u)

pnpm install 2>&1 | tail -20

for ws_path in $TOUCHED_WORKSPACES; do
  ws_name=$(grep -m1 '"name"' "$ws_path/package.json" | sed -E 's/.*"name": *"([^"]+)".*/\1/')
  pnpm --filter "$ws_name" typecheck 2>&1 | tail -10
  pnpm --filter "$ws_name" lint 2>&1 | tail -10
  pnpm --filter "$ws_name" test 2>&1 | tail -20
done
```

Capture pass/fail per command.

**Also check the CONTEXT.md state** (per [ADR-0019](../../../docs/adr/0019-context-md-describes-current-state.md)). For each bounded context the touched files imply, grep its CONTEXT.md for the new entity/port/use-case the issue was meant to ship. If the code is in place but CONTEXT.md wasn't updated, that's a remediation item the resumed flow must fix before commit (mirrors `/run-issue` §5.5).

---

## 6. Propose remediation

```
==============================================
Resume #<N> — current state
==============================================

Branch:       agent/issue-<N>  ($COMMITS_AHEAD ahead, $COMMITS_BEHIND behind main)
Working tree: <clean | N modified, N untracked>
Bail reason:  <one sentence>
Suggested:    <previous agent's recommendation>

Verify pass:
  typecheck:  <pass | fail>
  lint:       <pass | fail>
  test:       <pass | fail>

Remediation options:

  (A) Continue from current state
      - Apply additional fixes for the bail reason
      - Re-run verify; commit; push; PR; merge; sync; unblock
      - Best when: bail was a specific fixable failure

  (B) Rebase onto main and continue
      - git rebase main (resolve conflicts)
      - Re-run verify; continue as (A)
      - Best when: $COMMITS_BEHIND > 0 and main has shipping changes that affect this

  (C) Abandon and restart from main
      - Move agent/issue-<N> to agent/issue-<N>-bail-<timestamp> (preserved)
      - Run run-issue-agent-skill <N> fresh
      - Best when: bail revealed the approach was fundamentally wrong

Which option? (A / B / C / cancel)
```

Wait for user choice.

---

## 7. Execute chosen path

### Path A — Continue

1. Re-read issue body + bail comment + any newer comments
2. Implement fixes
3. Re-run verify (§5). All must pass.
4. Self-review against AC
5. Continue from run-issue-agent-skill §6 (commit → push → PR → approve → merge → sync → unblock)

### Path B — Rebase + continue

1. Capture safety branch: `git branch agent/issue-$N-pre-rebase`
2. `git fetch origin main && git rebase main`
3. If conflicts: stop, show, ask user how to resolve. **Never `git rebase --skip` automatically.**
4. After clean rebase, run verify
5. Continue as Path A from step 5
6. After successful merge, delete safety: `git branch -D agent/issue-$N-pre-rebase`

### Path C — Abandon + restart

```bash
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
git checkout main
git branch -m agent/issue-$N agent/issue-$N-bail-$TIMESTAMP
git pull origin main
gh issue comment $N --body "Resuming from scratch. Previous bail branch preserved locally as agent/issue-$N-bail-$TIMESTAMP."
```

Then invoke run-issue-agent-skill <N> fresh.

---

## 8. Final summary

For A or B (successful through merge + unblock):

```
Resumed issue #<N> via path <A|B>.
Closed via PR <url>
Branch merged and deleted
Local main synced to <new SHA>
Dependents unblocked: #<X>, #<Y>     (or "none")
```

For C:
```
Abandoned and restarting #<N>.
Preserved bail branch: agent/issue-<N>-bail-<timestamp>
Now run run-issue-agent-skill <N>.
```

For cancel:
```
Resume cancelled for #<N>.
Branch state preserved.
```

---

## 9. Recursive bail conditions

If verify fails 3× after 3 fix attempts on Path A or B:
1. Comment on issue with "## Agent bailed (during resume)" + reference to original
2. Leave branch as-is
3. Tell user resume bailed; suggest Path C on a fresh resume
4. Stop

Never loop indefinitely.

---

## 10. Will NOT do

- Squash-merge preserved local commits into the final PR (PR is squashed at merge time anyway)
- Rewrite issue body
- Reopen a closed issue
- Touch other issues' state

---

## Cross-agent notes

Needs git + gh + shell + file read. Tool naming varies by host. Logic identical.
