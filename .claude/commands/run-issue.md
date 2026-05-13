---
description: Pick a GitHub issue from the current sprint and run it end-to-end — branch, implement, test, PR, approve, merge, sync main, unblock dependents. One-shot.
---

# AutoTM — Run one issue end-to-end

> **Invocation:** `/run-issue [ISSUE_NUMBER]` — the user's argument is `$ARGUMENTS`.
>
> - If `$ARGUMENTS` is a valid issue number, treat it as **N** throughout this prompt.
> - If `$ARGUMENTS` is empty or non-numeric, jump to §2's "ask the user" branch.
>
> You are a Claude Code agent running directly in `/Users/bagtyyar/Projects/auto.tm-rewrite` (no sandbox). The user owns the repo, `gh` is authenticated, no branch protection or required reviews — self-approval and self-merge via `gh` work. The user picks the issue; you handle everything else end-to-end and stop only when the issue is closed and dependents are unblocked.

---

## 0. Hard rules (non-negotiable)

- **Never `git commit` on `main` directly.** All work goes on `agent/issue-<N>`.
- **Never edit:** `GRILL-OUTCOME.md`, `docs/adr/*` (immutable after merge), `.env`, secrets, `*.pem`, `*.key`, `*-private-key.json`.
- **Never** `git push --force`, `--no-verify`, `git reset --hard` against shared branches, `gh issue close --reason "not planned"`.
- **Never** silently expand scope beyond the issue body's `## Files to create / modify`. If you'd need to, **stop and comment on the issue** instead (see §11).
- **Never** disable a failing test, mock Prisma, or skip the 60s/5MB media-compression rules from `CLAUDE.md`.
- **Never** modify labels on any issue other than the one you're working on (and its dependents in §8). In particular, never touch `ready-for-agent`, `wontfix`, `phase-*`, or area labels on other issues.

---

## 1. Read these before doing anything

In order:

1. `CLAUDE.md` — repo policy
2. `docs/prd/03-roadmap.md` — find "Current Sprint". That's your scope.
3. The current sprint file: `docs/prd/sprints/sprint-<NN>-<name>.md`
4. `CONTEXT-MAP.md`
5. `docs/agents/issue-tracker.md` — issue body conventions + the `blocked` label rule

If any of those is missing or empty, stop and tell the user. The repo is in an unexpected state.

---

## 2. Pick the issue

**Branch A — `$ARGUMENTS` is a valid issue number:** treat that number as **N**. Skip to the verify-state step below.

**Branch B — `$ARGUMENTS` is empty or non-numeric:** list the unblocked queue and ask the user.

```bash
gh issue list \
  --label "ready-for-agent" \
  --search "-label:blocked is:open" \
  --json number,title,labels \
  --jq '.[] | "#\(.number)  [\(.labels | map(.name) | join(","))]  \(.title)"'
```

Print the list. Ask: *"Which issue should I work on? Reply with the number."* Wait for the user's reply. Don't pick one yourself.

**Once N is set, verify state:**

```bash
gh issue view $N --json state,labels,body,title > /tmp/issue.json
```

Read `/tmp/issue.json`. Confirm:
- `state == "OPEN"`
- `labels` includes `ready-for-agent`
- `labels` does **NOT** include `blocked`
- `body` has the standard sections (`## Read first`, `## Files to create / modify`, `## Acceptance criteria`, `## Depends on`, `## Completion signal`)

Any check fails → tell the user the issue isn't ready for AFK pickup and stop.

---

## 3. Create the branch + read everything the issue tells you to

```bash
git checkout main
git pull origin main
git checkout -b agent/issue-$N
```

Then **Read** every path the issue body lists under `## Read first (inside the sandbox)` and every path under `## Files to create / modify`. Don't skim — these files inform the implementation.

Verify dependencies — for every issue number in the body's `## Depends on` section:

```bash
gh issue view <dep_num> --json state --jq '.state'
```

Any blocker still `OPEN` means the label state was inconsistent (issue shouldn't have been pickable). Stop and tell the user.

---

## 4. Implement

Walk through `## Files to create / modify` in the order the issue presents them. For each `- [ ]` in `## Acceptance criteria`:

- If the AC names a test: **write the test first** (TDD red). Run it. Confirm it fails for the expected reason.
- Implement the minimum code that satisfies the AC.
- Run the test. Confirm green.

Architecture rules from `CLAUDE.md` apply at every edit:

- **Domain** layer pure TS — no `@nestjs/*`, no Prisma, no framework decorators
- **Application** layer — one use-case per file, one `execute()` method, ~100 lines max
- **Infrastructure** layer — Prisma, FCM clients, mappers live here only
- **Presentation** layer — thin controllers + WS gateways only
- **Cross-context calls** go through ports or the event bus — never direct imports across `apps/api/src/modules/<x>/`

Use `TodoWrite` to track your progress through the AC list (5-15 todos).

If a file you'd touch is outside the issue's `## Files to create / modify` list AND isn't a `CONTEXT.md` that needs an invariant update (per `CLAUDE.md`'s "Update the CONTEXT.md when domain invariants change" rule), **stop and comment** on the issue per §11. Don't expand.

---

## 5. Verify

The issue body's `## Completion signal` lists the verification commands. Run them all from repo root:

```bash
pnpm install                                 # only if package.json or pnpm-lock.yaml changed
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> lint
pnpm --filter <workspace> test
```

- Typecheck/lint fail → fix, re-run
- Test fails → fix the **code**, not the test
- After **3 fix attempts** if the same command still fails: stop, comment on the issue per §11. Don't ship broken code.

Then walk every `## Acceptance criteria` checkbox out loud and write the evidence per checkbox to `/tmp/ac-evidence.md`. If you can't point to a file/test for any checkbox, that AC item is unmet — implement it or bail.

---

## 6. Commit + push + open PR

Single commit. Conventional Commits:

```
<type>(<area>): <short, lowercase, no period>

- <change 1>
- <change 2>

Closes #<N>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Where:
- `<type>` ∈ `feat` (new behavior) | `fix` (bug) | `chore` (scaffold/tooling) | `docs` (doc-only) | `refactor` | `perf`
- `<area>` matches the issue's primary area label: `api`, `mobile`, `db`, `ui`, `infra`, etc.

```bash
git add <specific paths from your file list — never `git add -A`>
git status   # sanity check — confirm only intended files staged
git commit -m "$(cat /tmp/commit-msg.txt)"
git push -u origin agent/issue-$N
```

Then open the PR. Use the issue's title (drop any `S<NN>:` prefix). Body must start with `Closes #<N>` so the issue auto-closes on merge:

```bash
gh pr create \
  --base main \
  --head agent/issue-$N \
  --title "<issue title, prefix stripped>" \
  --body "$(cat <<'EOF'
Closes #<N>

## Summary
- <1-3 bullets — what changed and why>

## Test plan
- [ ] <AC 1>  — verified by <file:line or test name>
- [ ] <AC 2>  — verified by <file:line or test name>
- ...

## Architecture notes (omit if irrelevant)
- <any deviation from the issue's plan worth flagging>
EOF
)"
```

Capture the PR URL from the command output for the next step.

---

## 7. Approve + merge + sync main

```bash
# Self-approve. GitHub blocks self-approve on most setups, but the merge below
# works anyway if no review is required. Don't fail the run if this errors.
gh pr review --approve "$PR_URL" 2>&1 || echo "(self-approve not permitted — proceeding to merge)"

# Squash-merge + delete the remote branch in one shot
gh pr merge --squash --delete-branch "$PR_URL"
```

If `gh pr merge` fails (status checks pending, conflict, protection rule kicked in), **stop and tell the user**. Don't loop or retry.

Sync local main:

```bash
git checkout main
git pull origin main
git branch -D agent/issue-$N    # already deleted on remote; clean up locally
git push origin main            # no-op if main was just fast-forwarded, ensures we're in sync
```

Verify the issue auto-closed:

```bash
gh issue view $N --json state --jq '.state'   # expect "CLOSED"
```

If `gh pr merge` succeeded but the issue is still `OPEN`, the PR body's `Closes #<N>` wasn't recognized. Manually close:

```bash
gh issue close $N --comment "Closed by PR <url>."
```

---

## 8. Unblock dependents

Find every open issue whose body lists `#<N>` under `## Depends on`:

```bash
gh issue list --label "blocked" --state open --json number,body \
  --jq ".[] | select(.body | test(\"#$N\\\\b\")) | .number"
```

For each candidate dependent issue D:

1. Read D's body, extract every `#<num>` listed under `## Depends on`.
2. For each blocker, check state via `gh issue view <num> --json state --jq '.state'`.
3. If **every** blocker is now CLOSED:
   ```bash
   gh issue edit $D --remove-label "blocked"
   gh issue comment $D --body "Unblocked: #$N closed. All listed dependencies are now resolved."
   ```
4. If any blocker is still OPEN, leave D alone.

---

## 9. Roadmap update — only if this was the sprint's final issue

If issue #<N>'s title is the sprint-final wiring issue (its DoD in `docs/prd/sprints/sprint-NN-*.md` explicitly says "Roadmap S<N> → 🟢"), then edit `docs/prd/03-roadmap.md`:

- Current Sprint block: bump to next sprint, status ⚪ Pending
- Phase 1 table: this sprint's row → 🟢, today's UTC date in Shipped column
- Append a one-line entry under "Shipped log"

Commit + push directly to main with a small `docs: roadmap S<N> → shipped` commit (since this is doc-only, no PR needed):

```bash
git add docs/prd/03-roadmap.md
git commit -m "docs: roadmap S<N> shipped

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin main
```

For any **non-final** issue, do not touch the roadmap.

---

## 10. Final summary to the user

Print one concise block (no emoji, no filler):

```
Issue #<N> closed via PR <url>
Branch agent/issue-<N> merged and deleted
Local main synced to <new SHA>
Dependents unblocked: #<X>, #<Y>     (or "none")

AC evidence:
  - <AC 1> → <file:line or test name>
  - <AC 2> → <file:line or test name>
  ...
```

Then stop. Do not pick another issue without being asked.

---

## 11. Bail conditions — when to stop instead of pushing through

Stop and comment on the issue when:

- AC references files or symbols that don't exist and aren't in your file list to create
- A test fails 3 times after 3 fix attempts
- The change requires editing outside `## Files to create / modify` and outside the `CONTEXT.md` invariant-update allowance
- A blocker listed in `## Depends on` is still OPEN
- `gh pr merge` fails (required check missing, conflict, protection)
- You'd have to violate any rule in §0

Bail procedure:

1. Comment on issue #<N>:
   ```bash
   gh issue comment $N --body "$(cat <<'EOF'
   ## Agent bailed

   **Reason:** <one sentence>

   **State left behind:**
   - Branch: `agent/issue-<N>` (preserved locally, not pushed)
   - Files touched: <list>
   - Last failing command: <command + output snippet>

   **Suggested next step:** <one sentence — what a human should check>
   EOF
   )"
   ```
2. Do **not** push the branch.
3. Do **not** open a PR.
4. Print a "BAILED" summary to the user:
   ```
   ✗ BAILED on issue #<N>
   Reason: <one sentence>
   Branch agent/issue-<N> preserved locally (not pushed).
   Comment posted on the issue.
   ```
5. Stop.

---

## Tooling reference (no surprises)

- `Read`, `Write`, `Edit`, `Glob`, `Grep` — file work
- `Bash` — every `git`, `gh`, `pnpm`, `docker` invocation
- `TodoWrite` — your progress through the AC list
- **No subagents.** This is a single-session, single-issue run.

End of prompt.
