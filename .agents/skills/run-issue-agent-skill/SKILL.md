---
name: run-issue-agent-skill
description: Runs a single GitHub issue from the current AutoTM sprint end-to-end. Use when the user asks to "run issue N", "implement issue N", "work on issue N", or wants an AFK agent to pick up and ship a sprint child issue. The skill picks/accepts the issue, branches as agent/issue-N, reads referenced docs, performs a design-needs check (recommends /wireframe or /hifi-design if the screen is non-trivial and specs are missing), implements against the issue's acceptance criteria, runs typecheck+lint+test, commits, pushes, opens a PR, self-approves (best-effort), squash-merges, syncs local main, and unblocks dependents whose listed blockers are now closed. One-shot. Stops only when the issue is closed and dependents are unblocked, or bails with a comment if scope creep, missing dependencies, or repeated test failures are hit.
---

# AutoTM — Run one issue end-to-end (agent skill)

> **Source:** This skill mirrors `.claude/commands/run-issue.md` in this repo, adapted from a Claude Code slash command into the cross-agent SKILL.md format (agentskills.io spec). Other CLI agents (Codex, Cursor, Cline, Aider, Gemini CLI) that read SKILL.md files can pick this up.
>
> **Invocation:** When the user says "run issue 5", "implement #5", "work on issue 5", or similar, treat that number as **N** for the rest of this skill. If the user doesn't name a number, list the unblocked queue (see §2) and ask them to pick.
>
> The agent works directly in the repo at `/Users/bagtyyar/Projects/auto.tm-rewrite` (no sandbox). The user owns the repo, `gh` CLI is authenticated, no branch protection or required reviews — self-approval and self-merge via `gh` work.

---

## 0. Hard rules (non-negotiable)

- **Never `git commit` on `main` directly.** All work goes on `agent/issue-<N>`.
- **Never edit:** `GRILL-OUTCOME.md`, `docs/adr/*` (immutable after merge), `.env`, secrets, `*.pem`, `*.key`, `*-private-key.json`.
- **Never** `git push --force`, `--no-verify`, `git reset --hard` against shared branches, or `gh issue close --reason "not planned"`.
- **Never** silently expand scope beyond the issue body's `## Files to create / modify`. If you'd need to, **stop and comment on the issue** (see §11).
- **Never** disable a failing test, mock Prisma, or skip the 60s/5MB media-compression rules from `CLAUDE.md`.
- **Never** apply `wontfix` or remove `ready-for-agent` from any other issue. The only label you remove is `blocked` from dependents of the just-merged issue.

---

## 1. Read these before doing anything

In order, using whatever file-read tool the host agent provides:

1. `CLAUDE.md` — repo policy
2. `docs/prd/03-roadmap.md` — find "Current Sprint." That's your scope.
3. The current sprint file: `docs/prd/sprints/sprint-<NN>-<name>.md`
4. `CONTEXT-MAP.md`
5. `docs/agents/issue-tracker.md` — issue body conventions and label rules

If any of those is missing, stop and tell the user — the repo is in an unexpected state.

---

## 2. Pick the issue

**If the user's message named an issue number:** use it. Skip to §3.

**Otherwise**, list the unblocked queue and ask:

```bash
gh issue list \
  --label "ready-for-agent" \
  --search "-label:blocked is:open" \
  --json number,title \
  --jq '.[] | "#\(.number)  \(.title)"'
```

Print and ask: *"Which issue should I work on? Reply with the number."* Wait for the user's answer.

Once `N` is set, verify state:

```bash
gh issue view $N --json state,labels,body > /tmp/issue.json
```

Confirm:
- `state == "OPEN"`
- `labels` includes `ready-for-agent` and does **NOT** include `blocked`

If either fails, tell the user and stop.

---

## 3. Create the branch + read everything the issue tells you to

```bash
git checkout main
git pull origin main
git checkout -b agent/issue-$N
```

Read every path the issue body lists under `## Read first` and `## Files to create / modify`. Don't skim.

Verify dependencies — for every issue number in the body's `## Depends on` section:

```bash
gh issue view <dep> --json state --jq '.state'
```

Any blocker still OPEN means the label state was inconsistent. Stop and tell the user.

---

## 3.5. Design check (only if this issue ships UI)

Before writing code for a UI-shipping issue, check whether design context exists. The hi-fi / wireframe specs in `docs/prd/ui/wireframes/` and `docs/prd/ui/hifi/` are inputs to good implementation.

**Does this issue ship UI?** Answer yes if any:

- Area labels include `mobile`, `web`, or `admin`
- `## Files to create / modify` includes paths like `apps/mobile/app/**/*.tsx`, `apps/web/src/app/**/*.tsx`, `apps/admin/src/app/**/*.tsx`
- AC items mention "screen", "page", "modal", "sheet", "wizard", "feed", "tab", "card"

If no → skip §3.5, go to §4.

**If yes:** identify the screen(s), slugify, check for specs:

```bash
test -f docs/prd/ui/wireframes/<slug>.md && echo "WIREFRAME_EXISTS" || echo "WIREFRAME_MISSING"
test -f docs/prd/ui/hifi/<slug>.md       && echo "HIFI_EXISTS"      || echo "HIFI_MISSING"
```

Classify:
- Primary user-facing flow → wireframe + hi-fi recommended
- > 3 distinct states → wireframe + hi-fi recommended
- Unusual / unique layout → wireframe at minimum
- Stock CRUD / form / settings → skip (tokens + defaults are enough)

If specs are missing on a screen that needs them, present three options:

```
(a) Continue without design — agent uses tokens + defaults
(b) Pause — user runs wireframe-agent-skill <slug> + re-runs
(c) Pause — user runs wireframe-agent-skill + hifi-design-agent-skill, then re-runs
```

For (b) or (c): comment on the issue `"Paused for design. Run <skill> <slug> before re-running."` and stop without pushing.

For (a): log rationale in `/tmp/run-issue-notes.md`, include in PR description's Design notes section, proceed.

If specs DO exist: read them in addition to issue's `## Read first` list and proceed.

---

## 4. Implement

Walk `## Files to create / modify` in order. For each `- [ ]` in `## Acceptance criteria`:

- If AC names a test: **write the test first** (TDD red). Run it. Confirm failure.
- Implement the minimum to satisfy the AC.
- Run the test. Confirm green.

Architecture rules from `CLAUDE.md`:

- **Domain** layer pure TS — no `@nestjs/*`, no Prisma, no decorators
- **Application** layer — one use-case per file, one `execute()` method, ~100 lines max
- **Infrastructure** layer — Prisma + framework code lives here only
- **Presentation** layer — thin controllers + WS gateways only
- **Cross-context** calls go through ports or the event bus — never direct imports across `apps/api/src/modules/<x>/`

Track your progress through the AC with a todo list (5-15 items).

If a file you'd touch is outside the issue's `## Files to create / modify` AND isn't a `CONTEXT.md` needing an invariant update, **stop and comment** (see §11). Don't expand.

---

## 5. Verify

The issue's `## Completion signal` lists commands. Run them all:

```bash
pnpm install                                  # only if package.json changed
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> lint
pnpm --filter <workspace> test
```

- Typecheck/lint fail → fix and re-run
- Test fails → fix the code, not the test
- After **3 fix attempts** on the same failure: stop, comment per §11

Walk every AC checkbox; write evidence to `/tmp/ac-evidence.md` (file, test name, or grep result per checkbox). If an item has no evidence, it's unmet.

---

## 6. Commit + push + open PR

Single commit. Conventional Commits:

```
<type>(<area>): <short summary, lowercase, no period>

- <change 1>
- <change 2>

Closes #<N>

Co-Authored-By: <agent name> <noreply@anthropic.com>
```

`<type>` ∈ `feat` | `fix` | `chore` | `docs` | `refactor` | `perf`
`<area>` matches the issue's primary area label.

```bash
git add <specific paths from file list — never `git add -A`>
git status
git commit -m "$(cat /tmp/commit-msg.txt)"
git push -u origin agent/issue-$N
```

Open PR:

```bash
gh pr create \
  --base main \
  --head agent/issue-$N \
  --title "<issue title, prefix stripped>" \
  --body "$(cat <<'EOF'
Closes #<N>

## Summary
- <1-3 bullets>

## Test plan
- [ ] <AC 1> — verified by <evidence>
- [ ] <AC 2> — verified by <evidence>

## Design notes (omit if not a UI issue)
- Wireframe: <path or "not run">
- Hi-fi: <path or "not run">
EOF
)"
```

Capture the PR URL.

---

## 7. Approve + merge + sync main

```bash
gh pr review --approve "$PR_URL" 2>&1 || echo "(self-approve not permitted — proceeding)"
gh pr merge --squash --delete-branch "$PR_URL"
```

If `gh pr merge` fails (status checks, conflict, protection), stop and tell the user.

```bash
git checkout main
git pull origin main
git branch -D agent/issue-$N
git push origin main
```

Verify issue auto-closed:

```bash
gh issue view $N --json state --jq '.state'   # expect "CLOSED"
```

If still open: `gh issue close $N --comment "Closed by PR <url>."`

---

## 8. Unblock dependents

```bash
gh issue list --label "blocked" --state open --json number,body \
  --jq ".[] | select(.body | test(\"#$N\\\\b\")) | .number"
```

For each candidate `D`:
1. Read D's body, extract every `#<num>` under `## Depends on`
2. Check state of each blocker
3. If **every** blocker is now CLOSED:
   ```bash
   gh issue edit $D --remove-label "blocked"
   gh issue comment $D --body "Unblocked: #$N closed. All listed dependencies are now resolved."
   ```

---

## 9. Roadmap update — only if this was the sprint's final issue

If issue #<N>'s DoD in `docs/prd/sprints/sprint-NN-*.md` explicitly says "Roadmap S<N> → 🟢":

- Edit `docs/prd/03-roadmap.md`:
  - Current Sprint block: bump to next sprint, status ⚪ Pending
  - Phase 1 table: this sprint's row → 🟢, today's UTC date in Shipped column
  - Append a Shipped-log entry
- Commit + push to main directly (doc-only).

For any **non-final** issue, do not touch the roadmap.

---

## 10. Final summary to the user

```
Issue #<N> closed via PR <url>
Branch agent/issue-<N> merged and deleted
Local main synced to <new SHA>
Dependents unblocked: #<X>, #<Y>     (or "none")

Design specs used:
  Wireframe: <path or "none">
  Hi-fi:     <path or "none">

AC evidence:
  - <AC 1> → <file:line or test name>
  ...
```

Then stop.

---

## 11. Bail conditions

Stop and comment on the issue when:

- AC references files/symbols that don't exist and aren't in your file list
- Test fails 3× after 3 fix attempts
- Change requires editing outside scope
- A blocker listed in `## Depends on` is still OPEN
- `gh pr merge` fails
- Any §0 rule would be violated

Bail procedure:

```bash
gh issue comment $N --body "## Agent bailed
Reason: <one sentence>
Branch: agent/issue-<N> (preserved locally, not pushed)
Suggested next: <what should happen>"
```

Do not push, do not open PR. Print bail summary, stop.

---

## Cross-agent notes

This skill works with any agent that has:
- File read/write/edit
- Shell execution
- `git` and `gh` CLI installed
- A todo-list mechanism (helpful, not required)

Tool naming varies by host:
- Claude Code: `Read`, `Edit`, `Write`, `Bash`, `TodoWrite`
- Codex CLI: equivalent file + shell tools
- Cursor / Cline / Aider: their respective equivalents

Use whatever the host provides. Logic is the same.
