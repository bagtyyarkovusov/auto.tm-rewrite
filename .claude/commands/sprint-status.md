---
description: Read-only orientation. Prints the current sprint, issue progress (open / in-flight / closed / blocked / unblocked), open PRs awaiting review, and a suggested next action. No mutations.
---

# AutoTM — Sprint status

> **Invocation:** `/sprint-status` (no arguments). Always reports the current sprint from `docs/prd/03-roadmap.md`.
>
> You are a Claude Code agent running in `/Users/bagtyyar/Projects/auto.tm-rewrite`. This command is **read-only** — your only job is to gather state and print it. You do not modify files, edit issues, change labels, or run any non-query commands.

---

## 0. Hard rules (non-negotiable)

- **Read-only.** No `git commit`, no `git push`, no `gh issue create/edit/close`, no `gh pr create/merge/review`, no file `Write` or `Edit`.
- **No advice that requires assumption.** If the data is ambiguous, say so — don't guess.
- **No expanded scope.** Don't fetch every issue's full body. The user wants a dashboard, not a forensic audit.

---

## 1. Read these first

1. `docs/prd/03-roadmap.md` — find the Current Sprint block and the Phase 1 sprint-status table
2. The current sprint file: `docs/prd/sprints/sprint-<NN>-<name>.md` — just for the milestone + DoD count
3. `docs/agents/issue-tracker.md` — to know the label vocabulary you'll see in the queries

If `03-roadmap.md` is missing or has no Current Sprint, stop and tell the user the repo is in an unexpected state.

---

## 2. Determine the current sprint

From `docs/prd/03-roadmap.md`'s Current Sprint block, extract:
- Sprint number **N** (e.g., `S1`)
- Sprint name (e.g., `Scaffold`)
- Status (`⚪ Pending` / `🟡 In progress` / `🟢 Shipped`)
- Started date (if 🟡 or 🟢)
- Milestone (e.g., `M1 — Hello stack`)

If status is 🟢 (last sprint shipped, next not yet started), report that — the user may want `/create-sprint-issues <N+1>` next.

---

## 3. Gather issue state for this sprint

Run these queries — each is one `gh` call:

```bash
# (a) Parent PRD issue
gh issue list --search "Sprint $N — in:title" --state all --json number,title,state,url

# (b) All sprint children (open + closed)
gh issue list --search "S$N: in:title" --state all --json number,title,state,labels,url

# (c) Open PRs against main
gh pr list --state open --json number,title,headRefName,isDraft,url,createdAt,statusCheckRollup

# (d) Recently merged PRs (last 10)
gh pr list --state merged --json number,title,mergedAt --limit 10
```

Compute:

- **Total children** = count from (b)
- **Closed children** = count where `state == "CLOSED"`
- **Open + ready-for-agent + unblocked** = count where `state == "OPEN"` AND labels contain `ready-for-agent` AND labels do **NOT** contain `blocked`
- **Open + blocked** = count where `state == "OPEN"` AND labels contain `blocked`
- **In-flight (open PRs targeting agent branches)** = from (c), filter `headRefName` starting with `agent/issue-`

---

## 4. Compose the unblocked queue (next 5)

From (b), filter to `state == "OPEN"` + `ready-for-agent` + NOT `blocked`. Sort by issue number ascending. Take the first 5.

For each, capture:
- Issue number
- Title
- Primary area label (first area label encountered: `api`, `db`, `mobile`, etc.)

---

## 5. Detect notable conditions

Flag any of these in the output:

- **Stuck PRs** — open PR `createdAt` > 24h ago
- **Failed CI** — open PR with `statusCheckRollup` containing failure (look for a `conclusion: "FAILURE"`)
- **Draft PRs** — open PR with `isDraft: true` (just note them; not stuck per se)
- **Orphan branches** — `agent/issue-*` local branches whose issue is closed (cleanup candidate). Run `git branch --list 'agent/issue-*'`, then for each, check if its referenced issue is closed.
- **Roadmap drift** — if all children of sprint N are closed but the roadmap row is still 🟡, flag it (the sprint-final issue should have flipped it)
- **No unblocked work** — if open issues > 0 but unblocked = 0, all open work is waiting on something; suggest checking which blockers are real

---

## 6. Print the summary

Use this exact shape (no emoji embellishments beyond the status markers in the roadmap):

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
  - <each flag from §5, one line each>
  (or: none)

Suggested next:
  <one-line recommendation — see §7>
```

Keep it scannable. The user reads this in 10 seconds.

---

## 7. Decide the suggested next action

Pick the most useful next step in this priority order:

1. If any open PR has failing CI → `"Investigate PR #<X> — CI failing."`
2. If any open PR is >24h old without activity → `"Review/merge stale PR #<X> (<title>)."`
3. If unblocked > 0 → `"/run-issue <first-unblocked>"` (lowest-number unblocked issue)
4. If unblocked == 0 AND blocked > 0 → `"All open work is blocked. Merge any open PR to unblock dependents, or check the dependency graph in the parent issue."`
5. If all children closed AND sprint roadmap row is 🟡 → `"Run /run-issue <sprint-final-issue-num> to flip roadmap to 🟢."`
6. If all children closed AND sprint roadmap row is 🟢 → `"/close-sprint <N>"` (and then `/create-sprint-issues <N+1>`).
7. If the Current Sprint block shows status ⚪ Pending → `"/create-sprint-issues <N>"`.
8. Fallback → `"Repo state is unusual — review the flagged conditions above."`

---

## 8. Bail conditions

This command shouldn't bail; it's read-only. But stop and tell the user when:

- `gh` is unauthenticated or rate-limited (any `gh` call returns an auth error)
- `docs/prd/03-roadmap.md` is missing
- The query for "Sprint <N> — in:title" returns more than one parent (duplicates shouldn't exist; data quality issue)

---

## Tooling reference

- `Read`, `Grep` — read roadmap + sprint file
- `Bash` — every `gh` query
- **No `Write`, `Edit`, `git commit/push`, or any mutating tool.** This is read-only.
- **No `TodoWrite`** — this command is short enough not to need it.

End of prompt.
