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
- **Never** accept tactical shortcuts that leak framework, ORM, transport, or vendor details inward. If the clean fix needs a small in-scope refactor, do it; if it needs a larger refactor outside the file list, bail with the reason.
- **Never** add pass-through wrappers, shallow abstractions, or "manager" classes that do not hide real complexity. A new abstraction must enforce a domain boundary, hide an implementation detail, or remove meaningful duplication.

---

## 1. Read these before doing anything

In order, using whatever file-read tool the host agent provides:

1. `CLAUDE.md` — repo policy
2. `docs/prd/03-roadmap.md` — find "Current Sprint." That's your scope.
3. The current sprint file: `docs/prd/sprints/sprint-<NN>-<name>.md`
4. `CONTEXT-MAP.md`
5. `docs/agents/issue-tracker.md` — issue body conventions and label rules
6. **[ADR-0019](../../../docs/adr/0019-context-md-describes-current-state.md)** — CONTEXT.md describes **current implemented state**, not aspirational spec. When your PR changes domain invariants (Prisma field, port, use-case, event, route), the relevant CONTEXT.md update goes in the SAME PR. §5.5 enforces this.
7. **[ADR-0020](../../../docs/adr/0020-document-hierarchy-and-mutability.md)** — document hierarchy + mutability rules. ADRs are immutable, sprint files lock at 🟡, CONTEXT.md is present-state only.
8. `docs/agents/documentation-lookups.md` — Context7 workflow. Required whenever the issue touches an external library, SDK, framework, CLI, or cloud service.

If any of those is missing, stop and tell the user — the repo is in an unexpected state.

Also read the relevant repo guide before editing:
- `docs/agents/mobile-expo.md` for any `mobile` label, Expo package, Metro, Codegen, navigation, or runtime crash work.
- `docs/agents/nativewind-v4.md` for mobile UI or styling.
- `docs/agents/mobile-data-fetching.md` for mobile API calls, TanStack Query, `apiClient`, or cache changes.
- `docs/agents/typescript-runtime.md` for package `exports`, module resolution, `.js` import specifiers, or runtime-shared packages (`@auto-tm/db`, `@auto-tm/contracts`).

---

## 2. Pick the issue

**If the user's message named an issue number:** use it. Skip to the verify-state step below.

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
gh issue view $N --json state,labels,body,title > /tmp/issue.json
```

Confirm:
- `state == "OPEN"`
- `labels` includes `ready-for-agent` and does **NOT** include `blocked`
- `body` has `## Read first`, `## Files to create / modify`, `## Acceptance criteria`, `## Depends on`, and `## Completion signal`

If any check fails, tell the user and stop.

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

## 3.4. Execution plan + quality bar

Before writing code, turn the issue body into a short local plan at `/tmp/run-issue-plan.md`:

```markdown
## Issue
#<N> <title>

## Scope
- Files allowed by issue:
- Allowed automatic docs updates:

## Acceptance criteria map
- AC 1 -> files/tests likely touched

## Contexts and layers
- <context>: domain | application | infrastructure | presentation | frontend | package

## External docs
- Context7 lookups needed:
- Repo guides needed:

## Complexity notes
- Existing abstraction to reuse:
- New abstraction, if any, and what complexity it hides:
```

Use this as the implementation contract. It should be specific enough that another agent can resume the branch without guessing.

Apply these quality rules while planning:

- **Dependency rule**: source imports point inward. Domain knows no Nest, Prisma, HTTP, queue, Socket.IO, React, Expo, or SDK names. Application knows ports and DTOs, not adapters. Infrastructure and presentation adapt outward details.
- **One operation per use-case**: API application classes have one public `execute()` and one reason to change. If a use-case is growing past roughly 100 lines, extract domain logic into a domain function/value object before adding branches.
- **Boundary data is plain data**: ORM rows, HTTP request objects, SDK responses, and React component state do not cross into domain/application code. Map at infrastructure/presentation/frontend boundaries.
- **Deep modules over shallow wrappers**: add a helper only when it hides a real policy, data format, protocol, query-key shape, mapper, or repeated algorithm. Do not create pass-through services just to satisfy a layer.
- **Clean code defaults**: names reveal intent, booleans are predicates, magic values become named constants, errors include operation + useful context, comments explain why or invariants only.
- **Boy-scout cleanup is allowed only in scope**: improve files you are already allowed to edit. Do not broaden the PR for unrelated cleanup.
- **Context7 is mandatory for external APIs**: if you touch library/framework/SDK/CLI/cloud behavior, follow `docs/agents/documentation-lookups.md` and record the library ID + query in `/tmp/run-issue-notes.md`.

---

## 3.5. Design check (only if this issue ships UI)

Before writing code for a UI-shipping issue, check whether design context exists. The hi-fi / wireframe specs in `docs/prd/ui/wireframes/` and `docs/prd/ui/hifi/` are inputs to good implementation.

**Does this issue ship UI?** Answer yes if any:

- Area labels include `mobile`, `web`, or `admin`
- `## Files to create / modify` includes paths like `apps/mobile/app/**/*.tsx`, `apps/web/src/app/**/*.tsx`, `apps/admin/src/app/**/*.tsx`
- AC items mention "screen", "page", "modal", "sheet", "wizard", "feed", "tab", "card"

If no → skip the rest of §3.5 and go to §3.6.

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

If specs DO exist: read them in addition to issue's `## Read first` list and proceed to §3.6.

---

## 3.6. Multi-agent mode (optional, host-dependent)

Some hosts can spawn subagents; others cannot. Use this mode only when it reduces cognitive load without weakening scope control.

Trigger multi-agent mode when **all** are true:
- The issue ships UI or touches 3+ logical areas.
- The issue has existing wireframe/hi-fi specs or a precise file list.
- Each group can be described as "one screen/use-case + direct support files + tests."

If triggered:
1. Split `## Files to create / modify` into logical groups and show the grouping in the todo list.
2. Run one implementer per group if the host supports subagents; otherwise process the groups sequentially in the same session.
3. After each group, run the smallest relevant verification command and update `/tmp/ac-evidence.md`.
4. Review for two things before moving on: spec/AC compliance and code quality. Fix findings before starting the next group.
5. Parent agent remains responsible for final §5 verification, §5.5 CONTEXT.md decision, PR body, merge, and unblocking.

Never use multi-agent mode to edit files outside the issue list, and never let a subagent commit/push/merge unless the host workflow explicitly requires it. If subagent output conflicts with the issue body, the issue body wins.

---

## 4. Implement

Walk `## Files to create / modify` in order. For each `- [ ]` in `## Acceptance criteria`:

- If AC names a test: **write the test first** (TDD red). Run it. Confirm failure.
- Implement the minimum to satisfy the AC.
- Run the test. Confirm green.

Architecture rules from `CLAUDE.md` and the §3.4 plan:

- **Domain** layer pure TS — no `@nestjs/*`, no Prisma, no decorators
- **Application** layer — one use-case per file, one `execute()` method, ~100 lines max
- **Infrastructure** layer — Prisma + framework code lives here only
- **Presentation** layer — thin controllers + WS gateways only
- **Cross-context** calls go through ports or the event bus — never direct imports across `apps/api/src/modules/<x>/`

Implementation heuristics from the reference design skills:

- Prefer the repo's existing module shape and naming over introducing a new pattern.
- Keep functions at one abstraction level. Extract named helpers for branches that hide policy, not for one-line delegation.
- Keep third-party data formats at the edge. If a framework object leaks inward, add a mapper/port at the boundary.
- Avoid boolean flag arguments. Split behavior or introduce a small options object with named fields.
- Add tests for failure paths and invariants, not only happy paths. Domain/application changes should have fast unit coverage before adapter/e2e coverage.
- If an architectural decision appears mid-run, stop and ask whether to add a new ADR. Do not edit an existing ADR.

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

Add the repo-specific checks when relevant:

```bash
# API layering smoke checks when apps/api/src/modules/** changed.
rg "@nestjs|@prisma/client|Prisma\\." apps/api/src/modules/*/domain apps/api/src/modules/*/application || true

# Cross-context import smoke check when API bounded contexts changed.
rg "from ['\"](\\.\\./)+[a-z-]+/(domain|application|infrastructure|presentation)" apps/api/src/modules || true
```

Treat matches as prompts for inspection, not automatic failures: generated paths, type-only imports, and comments can be false positives. Any real dependency-rule violation must be fixed before PR.

For mobile, TypeScript runtime, package exports, or external-library work, run the additional commands required by the relevant `docs/agents/*.md` guide and record the evidence in `/tmp/ac-evidence.md`.

---

## 5.5. CONTEXT.md verification (mandatory before commit, per ADR-0019)

Before composing the commit, **decide if this issue changed any domain invariants** for the bounded context(s) you touched. If yes, the relevant `CONTEXT.md` MUST be updated in this same PR. Per [ADR-0019](../../../docs/adr/0019-context-md-describes-current-state.md), CONTEXT.md mirrors current code reality — updates land alongside the code that changes invariants, never lag.

A CONTEXT.md update is **required** for this PR if **any** of the following is true:

- **Schema change**: PR adds/removes/renames a field, table, enum, FK, unique constraint, or index in `packages/db/prisma/schema.prisma`
- **New port**: PR adds (or removes) a file under `apps/api/src/modules/<ctx>/domain/ports/`
- **New use-case**: PR adds a file under `apps/api/src/modules/<ctx>/application/`
- **New emitted/consumed event**: PR adds or removes `eventBus.emit(...)` or `@OnEvent(...)`
- **New HTTP/WS route**: PR adds or removes a controller route the rest of the system can call
- **New module / dep / route at app level**: PR adds an npm dep, expo-router route, Next.js route, or worker processor that the app/package CONTEXT.md should reflect

Sections most likely to need editing: **Owns** (when schema changes), **Invariants**, **Module shape (today)**, **Ports exposed**, **Shipped use-cases**, **Events emitted / consumed**. Also REMOVE any bullet from the **Planned additions** section that your PR just delivered.

**Never edit CONTEXT.md to match a skinny implementation.** CONTEXT mirrors what code DOES today.

**Exception**: if the issue body's `## Out of scope` section explicitly defers the CONTEXT.md update to a sprint-final wiring issue, skip the inline update. Default is: update in this PR.

If the issue is a pure docs/test/refactor with no invariant impact, write `(no invariant changes; no CONTEXT.md update needed)` to `/tmp/run-issue-notes.md` so §6 surfaces it in the PR body.

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

## Architecture / docs notes
- CONTEXT.md: <updated path or "no invariant changes">
- Context7: <library ID + query, or "not needed — no external API surface touched">
- Boundary notes: <ports/mappers/events/routes affected, or "none">

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

Architecture/docs:
  CONTEXT.md: <updated path or "not needed">
  Context7: <lookups used or "not needed">

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
- Required repo guide or Context7 lookup contradicts the issue body and the clean path is unclear
- The only implementation path would add a shallow abstraction, leak outer-layer details inward, or create a direct cross-context import
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
