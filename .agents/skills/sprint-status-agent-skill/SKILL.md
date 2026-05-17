---
name: sprint-status-agent-skill
description: Read-only AutoTM sprint orientation. Use when the user asks "where are we", "sprint status", "what's open", "what should I work on next", or wants a dashboard view of the current sprint. The skill prints the current sprint, issue progress (open / in-flight / closed / blocked / unblocked counts), open PRs awaiting review (with stuck-PR and failed-CI flags), recently merged PRs, the next 5 unblocked-and-ready issues, notable conditions (orphan branches, roadmap drift), and a one-line suggested next action. Performs zero mutations — no commits, no label changes, no issue edits. Pure orientation.
---

# AutoTM — Sprint status (agent skill)

> **Source:** Mirrors `.claude/commands/sprint-status.md` adapted for cross-agent use (SKILL.md format).
>
> **Invocation:** When the user asks "where are we", "status", "what's next", "what should I do", or similar orientation questions, activate this skill. No arguments needed — always reports the current sprint from `docs/prd/03-roadmap.md`.
>
> **Read-only.** No mutations of any kind.

---

## 0. Hard rules

- **No mutations.** No `git commit`, `git push`, `gh issue create/edit/close`, `gh pr create/merge/review`, no `Write` or `Edit`.
- **No advice that requires assumption.** Ambiguous → say so, don't guess.
- **No expanded scope.** Don't fetch every issue's full body. Dashboard, not audit.

---

## 1. Read first

1. `docs/prd/03-roadmap.md` — find Current Sprint block + Phase 1 table
2. Current sprint file — just for milestone + DoD count
3. `docs/agents/issue-tracker.md` — to know the label vocabulary

If `03-roadmap.md` is missing, stop and report.

---

## 2. Determine the current sprint

From the Current Sprint block, extract:
- Sprint number **N**
- Sprint name
- Status (⚪ / 🟡 / 🟢)
- Started date (if 🟡 or 🟢)
- Milestone

If status is 🟢 (last shipped, next not started), report that — user may want create-sprint-issues-agent-skill next.

---

## 3. Gather issue state

```bash
# (a) Parent PRD issue
gh issue list --search "Sprint $N — in:title" --state all --json number,title,state,url

# (b) All sprint children
gh issue list --search "S$N: in:title" --state all --json number,title,state,labels,url

# (c) Open PRs against main
gh pr list --state open --json number,title,headRefName,isDraft,url,createdAt,statusCheckRollup

# (d) Recently merged PRs
gh pr list --state merged --json number,title,mergedAt --limit 10
```

Compute:
- Total children, closed children
- Open + ready-for-agent + unblocked count
- Open + blocked count
- In-flight (open PRs targeting `agent/issue-*` branches)

---

## 4. Compose the unblocked queue (next 5)

From (b): filter open + `ready-for-agent` + NOT `blocked`. Sort by issue number asc. Take first 5. Capture number, title, primary area label.

---

## 5. Detect notable conditions

- **Stuck PRs** — open PR `createdAt` > 24h ago
- **Failed CI** — open PR with `statusCheckRollup` containing failure
- **Draft PRs** — `isDraft: true`
- **Orphan branches** — local `agent/issue-*` branches whose issue is closed (run `git branch --list 'agent/issue-*'` then check each)
- **Roadmap drift** — all children closed but row still 🟡
- **No unblocked work** — open > 0 but unblocked == 0

### 5.1 Doc-hierarchy drift checks (per ADR-0020)

Run three fast, read-only checks that surface drift early — between full `/close-sprint` runs:

**Check A — CONTEXT.md ↔ Prisma drift** (per [ADR-0019](../../../docs/adr/0019-context-md-describes-current-state.md))

For each bounded context the current sprint touches (extract from the sprint file's `## Bounded contexts touched`), diff entity names listed in CONTEXT.md's `## Owns` section against `packages/db/prisma/schema.prisma` `model X` lines. Both directions are violations under ADR-0019:

- Entity in CONTEXT.md but missing from Prisma → aspirational-leak drift
- Model in Prisma but missing from CONTEXT.md → missing-update drift

**Check B — Sprint DoD ↔ shipped PR % sanity**

Count `[x]` checkboxes in the sprint file vs `[ ]` checkboxes. Compare with the fraction of closed children. If closed ≥ 70% but DoD-ticked ≤ 30%, flag: "Sprint DoD lag: progress markers are drifting."

**Check C — Roadmap status ↔ child-issue reality**

If roadmap row says 🟡 In progress but every child issue is CLOSED and no open PRs against this sprint, flag: roadmap should be 🟢.

Each of these contributes one line to the **Drift check** block in §6 (either "pass" or a single-sentence description of the drift).

---

## 6. Print the summary

```
==============================================
AutoTM — Sprint status
==============================================

Current sprint:  S<N> — <name>  (<status>)
Milestone:       M<n> — <demo line>
Started:         <date or "—">
Sprint doc:      docs/prd/sprints/sprint-<NN>-<name>.md

Progress:        <closed>/<total> children closed
                 <in-flight> open PRs in-flight
                 <unblocked> unblocked + ready
                 <blocked> still blocked

Open PRs (in-flight):
  #<pr>  <status>  <title>     [created <relative time>]
  ...
  (or: none)

Recently merged (last 5):
  #<pr>  <title>   [merged <relative time>]
  ...

Unblocked queue (next 5):
  #<num>  [<area>]  <title>
  ...
  (or: none — see flagged conditions below)

Flagged conditions:
  - <each flag from §5, one line>
  (or: none)

Drift check (per ADR-0020):
  - CONTEXT.md ↔ Prisma:  <pass / drift in <ctx>: <details>>
  - Sprint DoD ↔ shipped:  <pass / lag: <X>% closed but <Y>% DoD ticked>
  - Roadmap ↔ children:    <pass / row 🟡 but all children CLOSED>

Suggested next:
  <one-line recommendation — see §7>
```

---

## 7. Suggested next action

Priority order:

1. Failing CI on open PR → `"Investigate PR #<X> — CI failing."`
2. Stale PR >24h → `"Review/merge stale PR #<X> (<title>)."`
3. Unblocked > 0 → `"run-issue-agent-skill <first-unblocked>"`
4. Unblocked == 0, blocked > 0 → `"All open work is blocked. Merge an open PR or check dependency graph."`
5. All children closed AND row is 🟡 → `"run-issue-agent-skill <sprint-final> to flip roadmap to 🟢."`
6. All children closed AND row is 🟢 → `"close-sprint-agent-skill <N>"` (then create-sprint-issues-agent-skill <N+1>)
7. Current Sprint block ⚪ Pending → `"create-sprint-issues-agent-skill <N>"`
8. Fallback → `"Repo state is unusual — review flagged conditions above."`

---

## 8. Bail conditions

Read-only command shouldn't bail. But stop and report if:
- `gh` unauthenticated / rate-limited
- `docs/prd/03-roadmap.md` missing
- "Sprint <N> — in:title" returns multiple parents (duplicates shouldn't exist)

---

## Cross-agent notes

Pure read tool. Needs file read + shell + `gh` CLI. No `Write`, no `Edit`, no destructive ops. Works anywhere.
