---
description: Read a sprint file under docs/prd/sprints/, propose a vertical-slice issue breakdown, then (after human OK) create the Sprint PRD parent + N child issues on GitHub with labels, Depends-on graph, and bump the roadmap to 🟡.
---

# AutoTM — Create a sprint's GitHub issues

> **Invocation:** `/create-sprint-issues [SPRINT_NUMBER]` — `$ARGUMENTS` is the sprint number (e.g., `2`).
>
> - If `$ARGUMENTS` is a valid sprint number, use it as **N**.
> - If `$ARGUMENTS` is empty or non-numeric, jump to §2's "ask the user" branch.
>
> You are a Claude Code agent running in `/Users/bagtyyar/Projects/auto.tm-rewrite`. The user is preparing the next sprint for AFK execution and wants the GitHub-side artifacts (one parent + N children) to exist with correct conventions and dependencies. **You propose, the user confirms, then you execute.** You will not silently create issues without confirmation — the cost of a wrong bulk-create is high.

---

## 0. Hard rules (non-negotiable)

- **Never create issues without explicit human confirmation** of the proposed breakdown.
- **Never** create issues for a sprint whose previous sprint isn't 🟢 shipped in `docs/prd/03-roadmap.md`.
- **Never** create a second parent PRD for a sprint that already has one (check `gh issue list --search "Sprint N — in:title"`).
- **Never** edit the sprint file (`docs/prd/sprints/sprint-NN-*.md`) — that's an input. If you find a flaw in the sprint file, **stop and tell the user**; don't patch it.
- **Never** create labels that aren't already in `docs/agents/triage-labels.md`. If you'd need a new label, ask first.
- **Never** apply `ready-for-agent` to the parent PRD issue (the parent isn't picked up by agents — see `docs/agents/issue-tracker.md`).
- **Never** push the roadmap update to `main` until all issues are created and the user has seen the final summary.

---

## 1. Read these first

In order:

1. `CLAUDE.md` — agent policy
2. `docs/prd/03-roadmap.md` — current sprint pointer + sprint-status table
3. `docs/prd/sprints/sprint-<NN>-<name>.md` — the target sprint file (after §2 resolves which sprint)
4. `docs/agents/issue-tracker.md` — **the canonical templates** for Sprint PRD parent + Sprint child bodies, label rules, AC source-of-truth, and the `## Depends on` convention
5. `docs/agents/triage-labels.md` — label vocabulary
6. `CONTEXT-MAP.md` — to know which `apps/api/src/modules/<context>/CONTEXT.md` to reference per issue
7. The relevant per-context `CONTEXT.md` files for whichever bounded contexts this sprint touches (you'll know after reading the sprint file)
8. Any ADRs referenced by the sprint file under `## References`

If `docs/agents/issue-tracker.md` is missing or empty, stop — the conventions are not yet codified, which means earlier work didn't land.

---

## 2. Pick the sprint number

**Branch A — `$ARGUMENTS` is a number:** treat it as **N**. Move on.

**Branch B — `$ARGUMENTS` is empty:** read `docs/prd/03-roadmap.md`, find the Current Sprint block and the Phase 1 sprint-status table. Print the pending sprints (status ⚪) and ask: *"Which sprint should I create issues for? Reply with the number."* Wait for the answer.

---

## 3. Verify pre-conditions

```bash
# (a) Sprint file exists
ls docs/prd/sprints/sprint-$(printf '%02d' $N)-*.md
```

If no match, stop — the sprint file must exist before you can issue it out.

```bash
# (b) Previous sprint is shipped (or N == 1)
```

Read `docs/prd/03-roadmap.md` and find the row for sprint N-1 in the Phase 1 table. Its Status must be 🟢. If N == 1, skip this check.

If the previous sprint isn't shipped, stop and tell the user: `"Sprint <N-1> is not yet 🟢 in the roadmap. Refusing to create Sprint <N> issues until the previous sprint ships."`

```bash
# (c) No existing parent PRD for this sprint
gh issue list --state all --search "Sprint $N — in:title" --json number,title,state
```

If any result with `state` in `OPEN` or `CLOSED` exists, stop and tell the user the parent already exists at `#<num>`.

```bash
# (d) Capture the next issue number GitHub will assign
NEXT=$(gh issue list --state all --limit 1 --json number --jq '.[0].number')
NEXT=$((NEXT + 1))
echo "Next issue number will be: #$NEXT"
```

This `NEXT` becomes the parent's number. Children get `NEXT+1`, `NEXT+2`, etc., in the order you create them.

---

## 4. Propose the slicing — DO NOT CREATE YET

Read the sprint file in full. Decide the slicing using these heuristics:

### 4.1 Scaffold sprint (use-case-free)

Signs: the sprint file's `## Bounded contexts touched` says "All — but only at the scaffold level," or `## Goal` mentions "scaffold," "skeleton," or "monorepo bootstrap." Sprint 1 is the canonical example.

Pattern: **one child issue per workspace** (one per `apps/*` and `packages/*`). Plus a "version-uplift / docs" first child for any cross-cutting prep, and a final "wiring + verify" child that closes the loop. Don't introduce a "foundations" issue for scaffold sprints — each workspace is independent.

### 4.2 Feature sprint (S2 through S10)

Signs: `## Bounded contexts touched` names one or two specific contexts; `## Acceptance criteria` enumerates use-case-level behaviors.

Pattern: **hybrid** —

- **One "foundations" child issue** at the start: sprint-wide plumbing (module wiring, Zod contracts for this sprint's shapes, env-var additions, Prisma migration if the sprint adds a model). All other children depend on this.
- **N vertical-slice child issues**, one per use-case named in the sprint's DoD. Each ships its own domain + application + infrastructure + presentation slice. Each depends only on the foundations issue (and possibly one or two siblings if there's a logical sequence).
- **UI integration child issues** at the end: one per frontend surface (`mobile`, `web`, `admin` where applicable). These depend on the relevant slice issues.
- **A "sprint-final wiring" child issue** that closes the loop: runs the full pipeline, smoke-tests the user-visible flow, updates the roadmap to 🟢, bumps current to the next sprint. Depends on everything else.

Typical S2-S10 has 5-10 children. Aim for issues that fit a single Claude Code run (~1-3 hours each).

### 4.3 Compose the proposal table

Build a markdown table and a dependency graph. Use the predicted issue numbers from §3(d):

```
| #     | Title                                      | Area     | Type    | Depends on        | One-line scope                  |
|-------|--------------------------------------------|----------|---------|-------------------|---------------------------------|
| #N+0  | Sprint <N> — <Name> (parent)               | -        | feature | (parent)          | Dashboard + tasklist            |
| #N+1  | S<N>: foundations — <details>              | api      | task    | None              | Module, env, Zod, migration     |
| #N+2  | S<N>: <UseCase1> end-to-end                | api      | feature | #N+1              | Domain + app + infra + REST     |
| ...   |                                            |          |         |                   |                                 |
| #N+M  | S<N>: Final wiring + roadmap S<N> → 🟢     | docs,api | task    | All above         | Smoke + roadmap                 |
```

And the dependency graph as a text diagram:

```
#N+1 (foundations)
  └─ #N+2 (UseCase1)  ─┐
  └─ #N+3 (UseCase2)  ─┤
  └─ #N+4 (UseCase3)  ─┼─ #N+M (final wiring)
  └─ #N+5 (mobile UI) ─┤
  └─ #N+6 (web UI)    ─┘
```

### 4.4 Show the proposal and wait

Print the table + graph, plus a "Notes / questions for you" section flagging anything in the sprint file you found ambiguous or surprising. Then ask:

> *"Confirm to create these `M` issues on GitHub? (yes / edit / cancel)"*

- `yes` → §5
- `edit` → ask what to change, redo the proposal table, re-confirm
- `cancel` → stop, no issues created, no roadmap edit

Do not proceed past this point without an explicit confirmation.

---

## 5. Create the issues

After confirmation:

### 5.1 Write each body to /tmp/sprint-<N>-issues/

Use the templates from `docs/agents/issue-tracker.md` verbatim — Sprint PRD shape for the parent, Sprint child shape for children.

```bash
mkdir -p /tmp/sprint-$N-issues
```

**Parent body** (`/tmp/sprint-$N-issues/00-parent.md`) follows the "Sprint PRD body template" in `docs/agents/issue-tracker.md`. Fill in:
- Sprint name from the sprint file's `# Sprint <N> — <Name>` header
- Phase from the sprint file's status table
- Milestone from the sprint file's status table
- Sprint doc link (use `https://github.com/bagtyyarkovusov/auto.tm-rewrite/blob/main/docs/prd/sprints/sprint-<NN>-<name>.md`)
- Sub-issues tasklist using the predicted issue numbers from §3(d) and titles from §4.3
- Sprint-wide DoD pointer ("Canonical in `docs/prd/sprints/sprint-NN-<name>.md`. ...")
- Dependency graph from §4.3
- Initially unblocked list (issues whose `## Depends on` is `None`)

**Each child body** (`/tmp/sprint-$N-issues/<NN>-<slug>.md`) follows the "Sprint child body template" in `docs/agents/issue-tracker.md`. Fill in:

- **Summary** — one paragraph; reference `docs/prd/sprints/sprint-NN-<name>.md` § the slice's section (or "the foundations of <Sprint Name>" for the foundations issue)
- **Read first** — list of paths the agent must read. Always include:
  - `docs/prd/sprints/sprint-NN-<name>.md`
  - The relevant `apps/api/src/modules/<context>/CONTEXT.md` (if API-side)
  - Relevant ADRs from the sprint file's `## References` section
  - `CLAUDE.md`
  - **`docs/adr/0019-context-md-describes-current-state.md`** — CONTEXT.md mirrors current code; the agent's PR updates CONTEXT.md when it changes invariants
- **Files to create / modify** — pull from the sprint file's `## Files this sprint creates / touches` section, narrowed to this slice. **Include the relevant `CONTEXT.md` path(s) if this slice changes domain invariants** (per ADR-0019) — unless the sprint plan explicitly defers the CONTEXT.md update to the sprint-final wiring issue.
- **Implementation notes** — minimum-viable code skeletons, type signatures, env-var names, Zod schema names, key Prisma model fields. Pull from the sprint file's content. Skip if everything is captured by reference (most foundations issues have detailed notes; most pure-vertical slices need only AC + file list)
- **Acceptance criteria (slice-scoped)** — a SUBSET of the sprint file's `## Acceptance criteria (DoD)` covering only this slice's behavior. Use the verbatim wording from the sprint file where it applies, then add slice-specific checks (e.g., "domain VO `<X>` rejects malformed input"). **If this slice changes domain invariants, add a checkbox**: `[ ] Update <relevant CONTEXT.md path> to reflect new state (per ADR-0019)` — unless deferred to sprint-final.
- **Out of scope** — sibling slices in the same sprint, deliberately deferred
- **Depends on** — the issue number(s) from §4.3 (or "None" for the foundations / unblocked issues)
- **Completion signal** — the standard `<promise>COMPLETE</promise>` block plus the workspace-specific `pnpm` commands

### 5.2 Create the parent first

```bash
gh issue create \
  --title "Sprint <N> — <Name>" \
  --body-file /tmp/sprint-$N-issues/00-parent.md \
  --label "phase-<N's phase>,feature,<primary area>"
```

Capture the returned URL — extract the issue number and verify it matches your predicted `NEXT`. If it doesn't, GitHub assigned a different number (someone created an issue between your `§3(d)` check and now). Halt and tell the user.

### 5.3 Create children sequentially

In the order they appear in your proposal table (so dependency numbers resolve correctly):

```bash
gh issue create \
  --title "S<N>: <child title>" \
  --body-file /tmp/sprint-$N-issues/<NN>-<slug>.md \
  --label "ready-for-agent,phase-<N's phase>,<area>,<type><,blocked if any dep is open>"
```

For each child, decide labels per `docs/agents/issue-tracker.md` § "Labels applied at creation":

- Always: `ready-for-agent`, `phase-<N's phase>`
- One area label per the issue's primary workspace (`api`, `db`, `mobile`, etc.). Multi-area allowed.
- Type: `feature` for new user-visible behavior, `task` for plumbing/scaffolding, `security` for auth/credentials, `perf` for perf
- `blocked` if the child has any `Depends on` references (which will be most children except the foundations one)

Capture each returned URL/number. Verify the numbers are sequential and match your predictions.

### 5.4 If verification fails

If any predicted number is wrong (someone created an issue in parallel), the parent's tasklist and other children's `Depends on` will reference the wrong numbers. Recovery:

1. Don't create more issues.
2. Tell the user exactly which numbers came back vs. what was predicted.
3. Offer to: (a) edit the affected bodies via `gh issue edit --body-file`, or (b) close all created issues and retry from §3(d).

---

## 6. Update the roadmap to 🟡

Only after all issues are created successfully.

Edit `docs/prd/03-roadmap.md`:

- **Current Sprint block** at top: change Sprint to `S<N> — <Name>`, Status to `🟡 In progress`, set `Started` to today's UTC date (`date -u +%Y-%m-%d`), update the Plan file / Sprint doc / Milestone fields to match.
- **Phase 1 sprint-status table**: S<N> row Status → 🟡, Started column → today's UTC date.

Commit + push to main (doc-only, no PR):

```bash
git add docs/prd/03-roadmap.md
git commit -m "docs: roadmap S<N> 🟡 (issues created)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin main
```

---

## 7. Final summary

Print one block:

```
Sprint <N> issues created.

Parent:     #<parent-num>  https://github.com/.../issues/<parent-num>
Children:   #<first>-#<last>  (M issues)

Initially unblocked queue (`/run-issue` can start now):
  - #<X>  S<N>: <title>
  - #<Y>  S<N>: <title>
  ...

Roadmap: S<N> flipped to 🟡 In progress on main.

Suggested next step: /run-issue <first unblocked number>
```

Then stop. Do not start /run-issue automatically.

---

## 8. Bail conditions — when to stop instead of pushing through

Stop and tell the user when:

- The sprint file doesn't exist
- The previous sprint isn't 🟢
- A parent issue already exists for this sprint
- The sprint file's `## Acceptance criteria (DoD)` is ambiguous or empty (can't be sliced)
- The user replies `cancel` or `edit` and doesn't reach a confirmed proposal after 3 rounds
- `gh issue create` returns an unexpected issue number mid-creation (parallel create from another source)
- The codified templates in `docs/agents/issue-tracker.md` are missing

On bail, do **not** edit the roadmap. The roadmap flip is the last step and only happens after a fully successful create.

---

## 9. Special cases

### Sprint 1 (already done — for reference only)

Sprint 1's issues were created manually in a prior session. If `$ARGUMENTS` is `1`, refuse with: `"Sprint 1's issues (#1-#16) already exist. The /create-sprint-issues command is for sprint 2 onward."`

### Phase 2 / Phase 3 sprints (S11+)

The roadmap has placeholder rows for Phase 2 (S11-S16) and Phase 3 (S17-S20) — sprint files for those don't yet exist. If `$ARGUMENTS` is ≥ 11 and no `docs/prd/sprints/sprint-<NN>-*.md` exists, refuse and tell the user: `"Sprint <N> file doesn't exist yet. Create it from the placeholder row in 03-roadmap.md first."`

### Multi-sprint runs

This command operates on **one** sprint at a time. If the user asks to "create S2 and S3 issues at once," refuse — we want JIT, sprint-by-sprint, with learnings flowing between sprints (per the rhythm locked in `docs/agents/issue-tracker.md` and `docs/prd/03-roadmap.md`).

---

## Tooling reference

- `Read`, `Write`, `Edit`, `Glob`, `Grep` — reading sprint file, conventions, and writing body files to `/tmp/`
- `Bash` — every `gh issue create`, `gh issue list`, `git commit`, `git push`
- `TodoWrite` — track your progress through the issue-creation list (10-20 todos for a typical sprint)
- **No subagents.** This is a single-session, single-sprint setup.

End of prompt.
