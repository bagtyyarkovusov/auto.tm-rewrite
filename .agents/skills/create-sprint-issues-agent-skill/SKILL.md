---
name: create-sprint-issues-agent-skill
description: Creates GitHub issues for an AutoTM sprint from its docs/prd/sprints/sprint-NN-<name>.md file. Use when the user asks to "create sprint N issues", "set up sprint N", "issue out sprint N", or wants the parent Sprint PRD plus child sub-issues created on GitHub before AFK execution begins. The skill reads the sprint file, proposes a vertical-slice issue breakdown (workspace-per-issue for scaffold sprints; hybrid foundations + use-case slices for feature sprints), waits for explicit human confirmation of the proposed slicing, then creates the parent PRD + N child issues with correct labels, dependency graph via `## Depends on` sections, and bumps docs/prd/03-roadmap.md to 🟡. Refuses to act for Sprint 1 (already created) or for a sprint whose previous sprint isn't 🟢 shipped.
---

# AutoTM — Create a sprint's GitHub issues (agent skill)

> **Source:** Mirrors `.claude/commands/create-sprint-issues.md` adapted for cross-agent use (SKILL.md format per agentskills.io). Drives the sprint-bootstrapping rhythm one sprint at a time.
>
> **Invocation:** When the user says "create issues for sprint 2", "set up sprint 3", "issue sprint 4", or names a sprint number, treat that number as **N**. If no number, list pending sprints from `docs/prd/03-roadmap.md` and ask which.
>
> The user prepares the next sprint for AFK execution. **You propose, the user confirms, then you execute.** Never create issues without explicit confirmation — the cost of a wrong bulk-create is high.

---

## 0. Hard rules (non-negotiable)

- **Never create issues without explicit human confirmation** of the proposed breakdown.
- **Never** create issues for a sprint whose previous sprint isn't 🟢 shipped in `docs/prd/03-roadmap.md`.
- **Never** create a second parent PRD for a sprint that already has one (check `gh issue list --search "Sprint N — in:title"`).
- **Never** edit the sprint file — it's input. If you find a flaw, stop and tell the user.
- **Never** create labels that aren't already in `docs/agents/triage-labels.md`. If you'd need a new one, ask first.
- **Never** apply `ready-for-agent` to the parent PRD issue (parents aren't picked up by agents).
- **Never** push the roadmap update to `main` until all issues are created and the user has seen the final summary.

---

## 1. Read these first

1. `CLAUDE.md`
2. `docs/prd/03-roadmap.md` — current sprint pointer + Phase 1 sprint-status table
3. `docs/prd/sprints/sprint-<NN>-<name>.md` — the target sprint file
4. `docs/prd/sprints/sprint-<NN+1>-<name>.md` if it exists — next sprint (for hint context)
5. `docs/agents/issue-tracker.md` — **the canonical templates** for Sprint PRD parent + Sprint child bodies, label rules
6. `docs/agents/triage-labels.md` — label vocabulary
7. `CONTEXT-MAP.md` — to know which per-context `CONTEXT.md` to reference per issue
8. The relevant per-context `CONTEXT.md` files and any ADRs the sprint file lists in `## References`

If `docs/agents/issue-tracker.md` is missing or empty, stop — the conventions aren't codified.

---

## 2. Pick the sprint number

**If user named a sprint number:** treat as **N**.

**If empty:** read `docs/prd/03-roadmap.md`, list ⚪ Pending sprints, and ask: *"Which sprint should I create issues for? Reply with the number."*

---

## 3. Verify pre-conditions

```bash
# (a) Sprint file exists
ls docs/prd/sprints/sprint-$(printf '%02d' $N)-*.md
```

If no match, stop.

```bash
# (b) Previous sprint shipped (or N == 1)
```

Read `docs/prd/03-roadmap.md`, find row for sprint N-1. Status must be 🟢. (Skip if N == 1.)

If not, stop: `"Sprint <N-1> is not yet 🟢 in the roadmap. Refusing to create Sprint <N> until previous ships."`

```bash
# (c) No existing parent PRD
gh issue list --state all --search "Sprint $N — in:title" --json number,title,state
```

If any result exists (open or closed), stop and name the existing parent.

```bash
# (d) Capture the next issue number
NEXT=$(gh issue list --state all --limit 1 --json number --jq '.[0].number')
NEXT=$((NEXT + 1))
echo "Next issue number will be: #$NEXT"
```

`NEXT` becomes the parent's number. Children get `NEXT+1`, `NEXT+2`, etc.

---

## 4. Propose the slicing — DO NOT CREATE YET

Read the sprint file in full. Decide slicing:

### 4.1 Scaffold sprint (use-case-free)

Signs: `## Bounded contexts touched` says "All — but only at the scaffold level"; goal mentions "scaffold", "skeleton", "monorepo bootstrap." Sprint 1 is the canonical example.

Pattern: **one child issue per workspace** (each `apps/*` and `packages/*`). Plus "version-uplift / docs" first child for cross-cutting prep and "wiring + verify" final child.

### 4.2 Feature sprint (S2-S10)

Signs: bounded contexts named specifically; AC enumerates use-case behaviors.

Pattern: **hybrid** —
- 1 "foundations" issue at the start (module wiring, Zod contracts, env vars, migration). All others depend on this.
- N vertical-slice issues, one per use-case. Each ships its own domain + application + infrastructure + presentation slice.
- UI integration issues at end (one per frontend surface — mobile/web/admin where applicable).
- 1 "sprint-final wiring" issue that closes the loop and updates the roadmap.

Typical 5-10 children. Aim for ~1-3 hours per issue.

### 4.3 Compose proposal table

```
| #     | Title                                      | Area     | Type    | Depends on        | One-line scope        |
|-------|--------------------------------------------|----------|---------|-------------------|------------------------|
| #N+0  | Sprint <N> — <Name> (parent)               | -        | feature | (parent)          | Dashboard + tasklist  |
| #N+1  | S<N>: foundations — <details>              | api      | task    | None              | Module, env, Zod      |
| #N+2  | S<N>: <UseCase1> end-to-end                | api      | feature | #N+1              | Domain+app+infra+REST |
| ...   |                                            |          |         |                   |                        |
| #N+M  | S<N>: Final wiring + roadmap S<N> → 🟢     | docs,api | task    | All above         | Smoke + roadmap       |
```

And a dependency graph diagram.

### 4.4 Show + wait

Print proposal. Ask:

> *"Confirm to create these `M` issues on GitHub? (yes / edit / cancel)"*

- `yes` → §5
- `edit` → ask what to change, redo, re-confirm
- `cancel` → stop

Do not proceed without explicit confirmation.

---

## 5. Create the issues

### 5.1 Write each body to /tmp/sprint-<N>-issues/

Use templates from `docs/agents/issue-tracker.md` verbatim — Sprint PRD shape for parent, Sprint child shape for children.

**Parent body** fills in:
- Sprint name from sprint file's header
- Phase + Milestone from sprint file's status table
- Sprint doc link
- Sub-issues tasklist with predicted numbers
- Dependency graph from §4.3
- Initially unblocked list (issues whose `## Depends on` is None)

**Each child body** fills in:
- Summary — references `docs/prd/sprints/sprint-NN-<name>.md` § the slice's section
- Read first — paths agent must read
- Files to create / modify — narrowed from sprint file
- Implementation notes — code skeletons, type signatures, env vars, Zod schema names (skip if captured by reference)
- Acceptance criteria (slice-scoped) — SUBSET of sprint DoD covering only this slice
- Out of scope — sibling slices deferred
- Depends on — issue numbers from §4.3 (or "None")
- Completion signal — `<promise>COMPLETE</promise>` + workspace `pnpm` commands

### 5.2 Create parent first

```bash
gh issue create \
  --title "Sprint <N> — <Name>" \
  --body-file /tmp/sprint-$N-issues/00-parent.md \
  --label "phase-<N's phase>,feature,<primary area>"
```

Verify the returned issue number matches `NEXT`. Halt if not.

### 5.3 Create children sequentially

For each child in proposal order:

```bash
gh issue create \
  --title "S<N>: <child title>" \
  --body-file /tmp/sprint-$N-issues/<NN>-<slug>.md \
  --label "ready-for-agent,phase-<N's phase>,<area>,<type><,blocked if any dep is open>"
```

Label rules per `docs/agents/issue-tracker.md`:
- Always: `ready-for-agent`, `phase-<N's phase>`
- Area: primary workspace label (`api`, `db`, `mobile`, etc.)
- Type: `feature` (default), `task` (plumbing), `security`, `perf`
- `blocked` if any `Depends on` is open

Capture each returned URL/number. Verify sequential.

### 5.4 If verification fails

If a predicted number is wrong (parallel issue creator), don't create more. Tell user the mismatch. Offer: (a) edit affected bodies via `gh issue edit --body-file`, or (b) close and retry from §3(d).

---

## 6. Update roadmap to 🟡

Only after all issues created successfully.

Edit `docs/prd/03-roadmap.md`:
- Current Sprint block: Sprint → S<N>, Status → 🟡 In progress, Started → today (UTC)
- Phase 1 table: S<N> row Status → 🟡, Started → today

Commit + push to main (doc-only, no PR).

---

## 7. Final summary

```
Sprint <N> issues created.

Parent:     #<parent-num>  https://github.com/.../issues/<parent-num>
Children:   #<first>-#<last>  (M issues)

Initially unblocked queue:
  - #<X>  S<N>: <title>
  - #<Y>  S<N>: <title>
  ...

Roadmap: S<N> flipped to 🟡 In progress on main.

Suggested next: run-issue-agent-skill <first unblocked number>
```

Then stop.

---

## 8. Bail conditions

Stop when:
- Sprint file doesn't exist
- Previous sprint isn't 🟢
- Parent issue already exists for this sprint
- Sprint AC ambiguous or empty
- User cancels or doesn't reach confirmed proposal after 3 rounds
- `gh issue create` returns unexpected number mid-creation
- Codified templates in `docs/agents/issue-tracker.md` are missing

Do **not** edit the roadmap on bail.

---

## 9. Special cases

**Sprint 1** (`N == 1`): refuse — issues already exist from a prior session.

**Phase 2/3 sprints (S11+):** if sprint file doesn't exist, refuse and ask the user to create it first.

**Multi-sprint runs:** refuse. One sprint at a time — JIT rhythm.

---

## Cross-agent notes

Requires file read/write/edit + shell + `gh` CLI. Works in any agent host. Logic identical across Claude Code, Codex CLI, Cursor, etc.
