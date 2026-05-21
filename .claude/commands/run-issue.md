---
description: Pick a GitHub issue from the current sprint and run it end-to-end — branch, optional design check (recommends /wireframe and /hifi-design if the screen is non-trivial), implement, test, PR, approve, merge, sync main, unblock dependents. One-shot.
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
- **Never** accept tactical shortcuts that leak framework, ORM, transport, or vendor details inward. If the clean fix needs a small in-scope refactor, do it; if it needs a larger refactor outside the file list, bail with the reason.
- **Never** add pass-through wrappers, shallow abstractions, or "manager" classes that do not hide real complexity. A new abstraction must enforce a domain boundary, hide an implementation detail, or remove meaningful duplication.

---

## 1. Read these before doing anything

In order:

1. `CLAUDE.md` — repo policy
2. `docs/prd/03-roadmap.md` — find "Current Sprint". That's your scope.
3. The current sprint file: `docs/prd/sprints/sprint-<NN>-<name>.md`
4. `CONTEXT-MAP.md`
5. `docs/agents/issue-tracker.md` — issue body conventions + the `blocked` label rule
6. **[ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md)** — CONTEXT.md describes **current implemented state**, not aspirational spec. When your PR changes domain invariants (Prisma field, port, use-case, event, route), the relevant CONTEXT.md update goes in the SAME PR. §5.5 enforces this.
7. **[ADR-0020](../../docs/adr/0020-document-hierarchy-and-mutability.md)** — document hierarchy + mutability rules. ADRs are immutable, sprint files lock at 🟡, CONTEXT.md is present-state only.
8. `docs/agents/documentation-lookups.md` — Context7 workflow. Required whenever the issue touches an external library, SDK, framework, CLI, or cloud service.

If any of those is missing or empty, stop and tell the user. The repo is in an unexpected state.

Also read the relevant repo guide before editing:
- `docs/agents/mobile-expo.md` for any `mobile` label, Expo package, Metro, Codegen, navigation, or runtime crash work.
- `docs/agents/nativewind-v4.md` for mobile UI or styling.
- `docs/agents/mobile-data-fetching.md` for mobile API calls, TanStack Query, `apiClient`, or cache changes.
- `docs/agents/typescript-runtime.md` for package `exports`, module resolution, `.js` import specifiers, or runtime-shared packages (`@auto-tm/db`, `@auto-tm/contracts`).

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

Before writing any code for a UI-shipping issue, check whether design context exists. The hi-fi / wireframe specs in `docs/prd/ui/wireframes/` and `docs/prd/ui/hifi/` are inputs to good implementation — better to pause and run `/wireframe` or `/hifi-design` first than implement something that has to be rebuilt.

### 3.5.1 Does this issue ship UI?

Heuristic — answer "yes" if any of these are true:

- Issue's area labels include `mobile`, `web`, or `admin`
- `## Files to create / modify` lists any path matching:
  - `apps/mobile/app/**/*.tsx`
  - `apps/web/src/app/**/*.tsx`
  - `apps/admin/src/app/**/*.tsx`
  - `apps/web/src/components/**/*.tsx` (any non-trivial component)
  - `apps/admin/src/components/**/*.tsx`
  - `apps/mobile/components/**/*.tsx`
- AC items mention "screen", "page", "modal", "sheet", "wizard", "feed", "tab", "card", "list", or specific user-visible verbs ("user sees", "user taps", "displays", "renders")

If **none** of these match → this is a backend-only or pure-config issue. Skip this section entirely and jump to §4.

### 3.5.2 Identify the screen(s) this issue ships

From the file list + AC items, name the screen(s). Examples:

- `apps/mobile/app/(auth)/otp.tsx` → screen `mobile-otp-entry`
- `apps/web/src/app/[locale]/listings/[id]/page.tsx` → screen `web-listing-detail`
- `apps/admin/src/app/(admin)/moderation/page.tsx` → screen `admin-moderation-queue`
- Multiple screens (e.g., a wizard with 6 steps) → list all of them

Slugify each screen name for the design doc lookup.

### 3.5.3 Check for existing design specs

For each screen:

```bash
test -f docs/prd/ui/wireframes/<slug>.md && echo "WIREFRAME_EXISTS" || echo "WIREFRAME_MISSING"
test -f docs/prd/ui/hifi/<slug>.md       && echo "HIFI_EXISTS"      || echo "HIFI_MISSING"
```

### 3.5.4 Classify each screen — "needs design?"

For each screen, apply the decision tree from `docs/prd/ui/70-design-principles.md` (or, if unavailable, the inline heuristic below):

```
Is this a primary user-facing flow?
(login, sell, browse, chat, listing detail, dealer page, garage, blog, sell wizard)
├── YES → needs WIREFRAME + HI-FI before implementation
└── NO → continues

Has > 3 distinct states (default / loading / empty / error / variants)?
├── YES → needs WIREFRAME + HI-FI
└── NO → continues

Has unusual layout or unique interaction patterns?
(filter sheet, OTP digit input, image carousel with thumbnails, post-card ref in chat)
├── YES → needs WIREFRAME (hi-fi optional)
└── NO → continues

Is it stock CRUD / form / settings toggle / table / simple list?
├── YES → SKIP design step (tokens + agent defaults are enough)
└── NO → needs WIREFRAME at minimum
```

### 3.5.5 Build the recommendation block

For every screen where design is needed but missing, compose a recommendation. Example:

```
==============================================
Design check — issue #<N>
==============================================

This issue ships UI:
  - mobile-otp-entry  (apps/mobile/app/(auth)/otp.tsx)

Design specs:
  - Wireframe: missing (docs/prd/ui/wireframes/mobile-otp-entry.md not found)
  - Hi-fi:     missing (docs/prd/ui/hifi/mobile-otp-entry.md not found)

Classification: primary user-facing flow → wireframe + hi-fi recommended before implementation.

Options:
  (a) Continue without design specs
      - Agent will implement from issue body + tokens + own defaults
      - Risk: design may need rework if it diverges from intent
      - Best when: you've thought through the screen already and trust the agent

  (b) Pause — run /wireframe mobile-otp-entry first, then re-run /run-issue <N>
      - 5-10 minutes for the wireframe
      - Saves to docs/prd/ui/wireframes/mobile-otp-entry.md
      - Agent will read it on re-run

  (c) Pause — run /wireframe + /hifi-design, then re-run /run-issue <N>
      - 15-25 minutes for both
      - Tightest implementation guidance; full token + state + a11y coverage
      - Best when: this is a flagship screen on a milestone path (M2, M3, M5, M8)

Which option? (a / b / c)
```

### 3.5.6 Handle the user's choice

**Choice (a) — continue without design**:
- Log this in `/tmp/run-issue-notes.md`: `"Design specs not present; implemented from issue body + tokens + agent defaults."`
- Include this note in the PR description's `## Architecture notes` section (§6) so the reviewer knows
- Proceed to §4

**Choice (b) — pause for /wireframe**:
- Comment on the issue:
  ```bash
  gh issue comment $N --body "Paused for design. Run /wireframe <screen-slug> before re-running /run-issue $N."
  ```
- Print to the user:
  ```
  Paused. Run these commands now:
    /wireframe <screen-slug>
  Then re-run /run-issue <N>.
  ```
- Stop. Do **not** push the branch. The local `agent/issue-<N>` branch is preserved.

**Choice (c) — pause for /wireframe + /hifi-design**:
- Comment on the issue:
  ```bash
  gh issue comment $N --body "Paused for design. Run /wireframe <screen-slug> + /hifi-design <screen-slug> before re-running /run-issue $N."
  ```
- Print to the user:
  ```
  Paused. Run these commands now (in order):
    /wireframe <screen-slug>
    /hifi-design <screen-slug>
  Then re-run /run-issue <N>.
  ```
- Stop. Same preservation as (b).

### 3.5.7 If design specs already exist (full or partial)

Even if `/wireframe` or `/hifi-design` was run previously and the specs exist, **add them to the read-first list** in §4. Treat them as primary inputs — implement from the hi-fi spec when present, falling back to the wireframe, falling back to the issue body.

If only wireframe exists (no hi-fi) and the screen is classified as "needs hi-fi too," **note the gap** but don't force a pause — let the user decide whether to pause or proceed.

### 3.5.8 Re-runs of /run-issue after design pause

If this is a re-run after the user paused for design (the issue has a comment containing "Paused for design"):
- Confirm the wireframe / hi-fi files now exist
- Read them in addition to the issue's `## Read first` list
- Proceed to §4

---

## 3.6. Subagent-driven implementation mode (auto-detect)

Decide whether to implement in subagent-driven mode or single-session mode.

**Trigger subagent-driven mode if ALL apply:**
- This is a UI-shipping issue (per §3.5.1 heuristic).
- Wireframe and/or hi-fi specs exist for at least one screen this issue ships (check `docs/prd/ui/wireframes/<slug>.md` and `docs/prd/ui/hifi/<slug>.md` for every slug from §3.5.2).
- The issue's `## Files to create / modify` list has **3 or more distinct components/files** (single-file UI tweaks stay single-session).

Otherwise stay in single-session mode (the existing flow continues at §4).

When subagent mode triggers, skip §4 below and follow **§4-alt** at the end of this document. Section 5 (verify), §6 (commit/push/PR), §7+ (merge, sync, unblock) apply identically in both modes.

---

## 4. Implement

Walk through `## Files to create / modify` in the order the issue presents them. For each `- [ ]` in `## Acceptance criteria`:

- If the AC names a test: **write the test first** (TDD red). Run it. Confirm it fails for the expected reason.
- Implement the minimum code that satisfies the AC.
- Run the test. Confirm green.

Architecture rules from `CLAUDE.md` and the §3.4 plan apply at every edit:

- **Domain** layer pure TS — no `@nestjs/*`, no Prisma, no framework decorators
- **Application** layer — one use-case per file, one `execute()` method, ~100 lines max
- **Infrastructure** layer — Prisma, FCM clients, mappers live here only
- **Presentation** layer — thin controllers + WS gateways only
- **Cross-context calls** go through ports or the event bus — never direct imports across `apps/api/src/modules/<x>/`

Implementation heuristics from the project design bar:

- Prefer the repo's existing module shape and naming over introducing a new pattern.
- Keep functions at one abstraction level. Extract named helpers for branches that hide policy, not for one-line delegation.
- Keep third-party data formats at the edge. If a framework object leaks inward, add a mapper/port at the boundary.
- Avoid boolean flag arguments. Split behavior or introduce a small options object with named fields.
- Add tests for failure paths and invariants, not only happy paths. Domain/application changes should have fast unit coverage before adapter/e2e coverage.
- If an architectural decision appears mid-run, stop and ask whether to add a new ADR. Do not edit an existing ADR.

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

Before composing the commit, **decide if this issue changed any domain invariants** for the bounded context(s) you touched. If yes, the relevant `CONTEXT.md` MUST be updated in this same PR. Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md), CONTEXT.md mirrors current code reality — updates land alongside the code that changes invariants, never lag.

A CONTEXT.md update is **required** for this PR if **any** of the following is true for any context you touched:

- **Schema change**: PR adds/removes/renames a field, table, enum, FK, unique constraint, or index in `packages/db/prisma/schema.prisma`
- **New port**: PR adds (or removes) a file under `apps/api/src/modules/<ctx>/domain/ports/`
- **New use-case**: PR adds a file under `apps/api/src/modules/<ctx>/application/`
- **New emitted/consumed event**: PR adds or removes `eventBus.emit(...)` or `@OnEvent(...)` for a domain event
- **New HTTP/WS route**: PR adds or removes a controller route the rest of the system can call
- **New module / dep / route at app level**: PR adds an npm dep, expo-router route, Next.js route, or worker processor that the app/package CONTEXT.md should reflect

The CONTEXT.md sections most likely to need editing: **Owns** (when schema changes), **Invariants** (application-level), **Module shape (today)**, **Ports exposed**, **Shipped use-cases**, **Events emitted / consumed**. Also REMOVE any bullet from the **Planned additions** section that your PR just delivered — don't leave it as "planned" when it now exists.

**Never edit CONTEXT.md to match a skinny implementation.** That's the wrong direction. CONTEXT mirrors what code DOES today.

**Exception**: if the issue body's `## Out of scope` section explicitly defers the CONTEXT.md update to a sprint-final wiring issue (e.g., S3 #74), skip the inline update. Default is: update in this PR.

If the issue is a pure docs/test/refactor with no invariant impact, write `(no invariant changes; no CONTEXT.md update needed)` to `/tmp/run-issue-notes.md` so §6 surfaces it in the PR body.

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
- CONTEXT.md: <updated path or "no invariant changes">
- Context7: <library ID + query, or "not needed — no external API surface touched">
- Boundary notes: <ports/mappers/events/routes affected, or "none">
- <any deviation from the issue's plan worth flagging>

## Design notes (omit if not a UI issue)
- Wireframe: <path to wireframe doc, or "not run — see /tmp/run-issue-notes.md">
- Hi-fi spec: <path to hi-fi doc, or "not run — see /tmp/run-issue-notes.md">
- If §3.5 chose (a) "continue without design," include the rationale from /tmp/run-issue-notes.md here
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

Design specs used:
  Wireframe: <path | "none — backend/config issue" | "none — chose continue-without-design">
  Hi-fi:     <path | "none — backend/config issue" | "none — chose continue-without-design">

Architecture/docs:
  CONTEXT.md: <updated path or "not needed">
  Context7: <lookups used or "not needed">

AC evidence:
  - <AC 1> → <file:line or test name>
  - <AC 2> → <file:line or test name>
  ...
```

If §3.5 paused (chose b or c) and the user later re-ran with design specs in place, mention which specs informed implementation here.

Then stop. Do not pick another issue without being asked.

---

## 11. Bail conditions — when to stop instead of pushing through

Stop and comment on the issue when:

- AC references files or symbols that don't exist and aren't in your file list to create
- A test fails 3 times after 3 fix attempts
- The change requires editing outside `## Files to create / modify` and outside the `CONTEXT.md` invariant-update allowance
- A blocker listed in `## Depends on` is still OPEN
- `gh pr merge` fails (required check missing, conflict, protection)
- Required repo guide or Context7 lookup contradicts the issue body and the clean path is unclear
- The only implementation path would add a shallow abstraction, leak outer-layer details inward, or create a direct cross-context import
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
- `Task` (subagents) — **only in §4-alt subagent-driven mode**; standard single-session mode stays subagent-free.

---

## §4-alt — Subagent-driven implementation (UI mode)

Only invoke this path when §3.6's auto-detect trigger fired. Otherwise §4 above is the implementation.

The goal: dispatch one fresh subagent per logical component/screen group, with two-stage review between dispatches (spec compliance → code quality), so the parent's context stays clean while the implementation walks a long UI surface.

### §4-alt.1. Decompose `## Files to create / modify` into groups

Group the file list by **logical UI unit**, where a unit is "one screen + its directly-supporting components + its hooks + its tests." Examples for an issue that ships listing-detail + my-listings + drafts-list:

- Group A — Listing detail: `apps/mobile/app/listings/[id]/index.tsx`, `apps/mobile/src/listings/components/ListingDetail.tsx`, `PhotoGallery.tsx`, `PriceDisplay.tsx`, `ContactCtaBar.tsx`, `SellerBlock.tsx`, `useListing.ts`, plus tests.
- Group B — My Listings tab: `apps/mobile/app/(tabs)/my-listings.tsx`, `ListingCard.tsx`, `useMyListings.ts`, plus tests.
- Group C — Drafts list: `DraftCard.tsx`, plus tests.
- Group D — Owner actions: `apps/mobile/src/listings/owner-actions/*`, plus tests.

Also include:
- Group F (foundation, optional) — Any shared hook, type, or utility every other group depends on. Run this group FIRST so the rest can import from it. Examples: `useExchangeRates.ts`, query-keys factory updates, shared format helpers.
- Group Z (CONTEXT.md + integration sweep, always last) — `apps/mobile/CONTEXT.md` update + any cross-group polish.

Print the group list to the user as a TodoWrite checklist before dispatching anything.

### §4-alt.2. Per group: dispatch implementer → spec reviewer → code reviewer

For each group in order, dispatch via `Task` with `subagent_type: general-purpose`:

```
Task tool:
  description: "Implement <group name> for #<N>"
  subagent_type: general-purpose
  prompt: |
    You are implementing Group <X> of issue #<N>: <issue title>.

    ## Working directory
    /Users/bagtyyar/Projects/auto.tm-rewrite (currently on branch agent/issue-<N>)

    ## Files to create / modify in this group
    <list of paths from the group>

    ## Acceptance criteria this group satisfies
    <subset of issue's ## Acceptance criteria that this group covers>

    ## Parent plan and quality bar
    - Read /tmp/run-issue-plan.md before editing.
    - Follow §3.4: dependency rule, plain boundary data, deep modules over shallow wrappers, clean names/errors/tests.
    - If this group needs a larger abstraction than /tmp/run-issue-plan.md allowed, report NEEDS_CONTEXT instead of inventing it.

    ## Design specs (read these FIRST — implementation is downstream of them)
    - Wireframe: docs/prd/ui/wireframes/<slug>.md
    - Hi-fi: docs/prd/ui/hifi/<slug>.md

    ## Read first
    - docs/agents/mobile-expo.md (REQUIRED for mobile)
    - docs/agents/nativewind-v4.md (REQUIRED for mobile UI)
    - docs/agents/mobile-data-fetching.md (REQUIRED for API calls)
    - apps/<area>/CONTEXT.md
    - <any other paths the issue body's ## Read first lists that are relevant to this group>

    ## Hard rules (inherit from /run-issue §0)
    - No commits on main. Work happens on agent/issue-<N> (already checked out).
    - Never edit protected files (GRILL-OUTCOME.md, docs/adr/*, .env, *.pem, *.key, *-private-key.json).
    - Never expand scope beyond the files listed for THIS group, plus the allowed extras (CONTEXT.md, pnpm-lock.yaml, codegen output).
    - Use Context7 for every external library/API/CLI lookup. Your training data lags.
    - Do not leak framework/ORM/SDK/transport details into domain or application code.
    - Do not add pass-through wrappers or shallow helpers just to satisfy a layer.
    - For mobile UI, use RNR primitives + NativeWind v4. Never `StyleSheet.create`. Never hardcoded hex.

    ## Process

    For each AC this group covers:
    1. If the AC names a test, write the failing test first.
    2. Implement the minimum code that satisfies the AC.
    3. Run the test. Confirm green.
    4. Run `pnpm --filter <mobile-workspace-name> typecheck` after each batch.

    After all ACs in this group pass:
    1. Run the full verification commands from the issue's `## Completion signal`.
    2. Update `.mastra/ac-evidence.md` (or `/tmp/ac-evidence.md` if no .mastra dir) with one entry per AC this group covered. Use the strict format:
       ```
       ## AC <n>: <verbatim AC text>
       - Evidence type: test | file | smoke | command
       - Pointer: <file:line or test name or command + exit code>
       - Summary: <one sentence>
       - Status: PASS | FAIL | AMBIGUOUS
       ```
    3. Commit (one logical commit per group):
       ```
       feat(<area>): <group description>

       - <change 1>
       - <change 2>
       Closes-partially #<N>
       ```
       Do NOT push yet. The parent commits across all groups together at the end.

    ## Self-review (before reporting back)

    - Did you implement ONLY what this group covers? No scope creep into other groups.
    - Did every AC in this group get evidence written?
    - Did `pnpm typecheck` pass on the touched workspace?
    - Did you use RNR primitives + NativeWind, no StyleSheet.create or hex literals?
    - Did any new abstraction hide real complexity rather than just delegate?

    ## Report

    Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Files created/modified with line counts
    - Commit SHA(s) from this group
    - ACs covered + evidence written
    - Open concerns / scope questions for the parent
```

**After the implementer reports DONE:**

Dispatch the spec compliance reviewer:
```
Task tool:
  description: "Spec review for Group <X>"
  subagent_type: general-purpose
  prompt: [use superpowers:requesting-code-review/code-reviewer.md template with PLAN_OR_REQUIREMENTS = the group description + design spec paths, BASE_SHA = pre-group commit, HEAD_SHA = post-group commit]
```

If the spec reviewer flags issues, dispatch a fix sub-agent. Then dispatch a code-quality reviewer the same way. Move to the next group only when both reviews pass.

### §4-alt.3. After every group: run §5 verify across all workspaces touched

The implementer subagents may have skipped touched-workspace combinations that interact at integration time. Run §5's full verify block at the parent level.

### §4-alt.4. Then §6 (commit/push/PR), §7 (merge/sync), §8 (unblock dependents)

These sections work identically — the only difference vs single-session mode is that the branch already has multiple commits (one per group) when push happens. PR squash-merge collapses them at merge time.

### Bail conditions in subagent mode

- An implementer subagent reports BLOCKED twice on the same group → bail per §11 of the main prompt.
- The spec reviewer finds an out-of-scope file change in a group → dispatch a revert subagent (general-purpose) to undo just that file, then re-review. Do not let scope creep across groups.
- The code reviewer finds a Critical issue across two consecutive review cycles → bail.

End of §4-alt.

---

End of prompt.
