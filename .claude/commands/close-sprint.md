---
description: Run a closure / retrospective pass on a finished sprint. Verify shipped-vs-planned, detect drift in CONTEXT.md / ADRs / sprint file, identify prerequisites for the next sprint, write a retro doc, and propose doc-update commits for human approval.
---

# AutoTM — Close a sprint

> **Invocation:** `/close-sprint [SPRINT_NUMBER]` — `$ARGUMENTS` is the sprint number.
>
> - If `$ARGUMENTS` is a valid sprint number, treat it as **N**.
> - If `$ARGUMENTS` is empty, find the most-recently shipped sprint (last row in `docs/prd/03-roadmap.md`'s Phase 1 table with status 🟢) and use that.
>
> You are a Claude Code agent running in `/Users/bagtyyar/Projects/auto.tm-rewrite`. Sprint **N** has just shipped. Your job is to make the closure honest: catch drift between what shipped and what was planned, identify the doc updates that should land before sprint N+1 starts, and write a retro document that future sessions can read for full context. **You propose changes; the user approves each one.** This is a reflection step, not an automation step.

---

## 0. Hard rules (non-negotiable)

- **Never edit `GRILL-OUTCOME.md`, `docs/adr/*` (immutable), or the sprint file `docs/prd/sprints/sprint-NN-*.md` in-place.** Propose diffs, let the user approve.
- **Never close issues**, change labels other than `blocked` (still in scope per `docs/agents/issue-tracker.md`), or merge PRs.
- **Never mark the roadmap status if it doesn't match reality.** If the roadmap says 🟢 but the parent issue is open, that's drift — flag it, don't paper over it.
- **Never write a retro that ignores findings.** If you find drift, surface it. The point of this command is to catch what /run-issue couldn't catch on its own.
- **Never start the next sprint** (do not invoke `/create-sprint-issues`). That's a separate human decision.

---

## 1. Read these first

In order:

1. `CLAUDE.md` — agent policy
2. `docs/prd/03-roadmap.md` — confirm sprint N is 🟢; find its Shipped date; check the "Shipped log" section
3. `docs/prd/sprints/sprint-<NN>-<name>.md` — the input (sprint spec)
4. `docs/prd/sprints/sprint-<NN+1>-<name>.md` if it exists — next sprint's spec (for prereq comparison)
5. `docs/agents/issue-tracker.md` — issue body templates + label rules
6. `CONTEXT-MAP.md` — index of CONTEXT.md files
7. For each bounded context the sprint touched (from the sprint file's `## Bounded contexts touched` section): `apps/api/src/modules/<context>/CONTEXT.md`
8. `docs/adr/` directory listing — to know what ADRs exist; read any referenced by the sprint file

If sprint file or roadmap is missing, stop and tell the user.

---

## 2. Verify closure preconditions

```bash
# (a) Parent PRD issue closed?
gh issue list --state all --search "Sprint $N — in:title" --json number,state
```

If `state != "CLOSED"`, this is the first piece of drift — print it and continue (don't bail). The retro will reflect that the sprint isn't actually closed.

```bash
# (b) All child issues closed?
gh issue list --state open --search "S$N: in:title" --json number,title
```

If non-empty, those are still-open children — list them in the retro as "incomplete." Continue.

```bash
# (c) Roadmap says 🟢?
```

Read `docs/prd/03-roadmap.md`, find sprint N's row in the Phase 1 table. Note its Status. Mismatch with (a) and (b) = drift.

---

## 3. Compare shipped vs planned

For each child issue of sprint N (whether closed or open):

```bash
# Find the merged PR that closed it (PR body has "Closes #N")
gh pr list --state merged --search "$child in:body" --json number,title,url,headRefName,mergedAt,files
```

For each merged PR:

- `gh pr diff <pr_num>` — get the actual diff
- Read the issue body's `## Acceptance criteria` section
- For each AC checkbox, attempt to find evidence in the diff (file paths touched, function names introduced, tests added)
- Note any AC item where you can't find clear evidence — that's a potential gap

Aim for a quick pass, not a forensic audit. Spend ≤2 minutes per PR. The goal is to catch obvious gaps, not to re-review every line.

Build a table:

```
| Issue | PR  | AC items | With evidence | Without evidence |
|-------|-----|----------|---------------|------------------|
| #2    | #18 | 5        | 5             | 0                |
| #3    | #21 | 7        | 6             | 1 (eslint preset for expo) |
| ...   |     |          |               |                  |
```

---

## 4. Detect drift

### 4.1 CONTEXT.md drift

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md), CONTEXT.md mirrors current implemented state. By sprint close, every change to schema / ports / use-cases / events / module structure that this sprint shipped must be reflected in the relevant CONTEXT.md. The `/run-issue` flow's §5.5 enforces this per-PR; this section is the safety net catching anything that slipped through.

For each bounded context the sprint touched:

```bash
# When was the CONTEXT.md last modified?
git log -1 --format="%ad" --date=iso -- apps/api/src/modules/<context>/CONTEXT.md
```

If the CONTEXT.md hasn't been touched since the sprint started but the sprint added a new entity, port, or use-case to that context: **drift**. Under ADR-0019, this is a real problem — CONTEXT.md should have been updated alongside each merged PR.

To detect this: grep the CONTEXT.md for the names of entities/use-cases/ports the sprint introduced. If they're missing, flag in the retro doc and propose a one-line cleanup commit.

Also verify the **inverse** direction — CONTEXT.md should NOT describe anything that ISN'T in code today. Grep CONTEXT.md's "Owns (entities + tables)" section against `packages/db/prisma/schema.prisma`. Any entity listed in CONTEXT but absent from schema is aspirational content that escaped — flag for a tightening commit. (Per ADR-0019, aspirational content lives in PRD features or sprint files, never in CONTEXT.md.)

### 4.2 ADR drift

Did the sprint introduce any architectural decisions that aren't captured?

Read each merged PR's description (`gh pr view <num>`) — look for sentences like "decided to use X over Y," "chose pattern Z," "deferred X until Phase 2," etc. Cross-check `ls docs/adr/` — is there a corresponding ADR?

Light heuristic: if a PR description has more than two sentences of justification for a non-obvious choice and no ADR was added/touched in that PR, it's a candidate for "missing ADR."

### 4.3 Sprint file accuracy

Compare the sprint file's `## Files this sprint creates / touches` section against the actual files changed across all merged PRs of sprint N:

```bash
gh pr list --state merged --search "S$N: in:title" --json number,files \
  --jq '.[] | .files[].path' | sort -u
```

- Files in the sprint plan but not in the diff: planned but not done → likely overlap with §3 findings
- Files in the diff but not in the sprint plan: scope creep or surprise → worth flagging for the next sprint file's accuracy

### 4.4 Roadmap drift

- Status mismatch (from §2)
- Shipped log entry exists?
- Current Sprint pointer updated to N+1?

### 4.5 Dependency / version drift

```bash
git diff --stat $(git log --before="<sprint start date>" --format="%H" -1) HEAD -- package.json apps/*/package.json packages/*/package.json
```

Did any package.json change a major version of a dep mid-sprint? If yes and not captured in an ADR / charter §21 revision: flag.

### 4.6 Test coverage spot-check

Run (only if the sprint added domain/application code):

```bash
pnpm --filter <touched workspace> test -- --coverage 2>&1 | tail -20
```

If coverage on `domain/` or `application/` directories is below 70% (per charter §13), flag.

This is a spot-check, not a definitive measurement.

---

## 5. Identify prerequisites for sprint N+1

Read `docs/prd/sprints/sprint-<NN+1>-<name>.md`. Find its `## Previous-sprint dependencies` section.

For each listed dependency, verify it actually shipped in sprint N:

- "S<N> — auth (sellers must be authenticated)" → check identity module exists and works
- "S<N> — Catalog (need real brands/models for the wizard)" → check seed data is in
- ...

Anything in `## Previous-sprint dependencies` that didn't actually ship is a **hard blocker** for sprint N+1. Surface it loudly.

Also read `GRILL-OUTCOME.md` §19 "Outstanding action items (parallel to scaffolding)" — any items relevant to sprint N+1 that should be done first? E.g., for S2 starting, item 4 ("Source first 1-2 OTP phones for development") matters.

---

## 6. Compose the retro document

Write to `docs/prd/sprints/sprint-<NN>-<name>-retro.md`:

```markdown
# Sprint <N> — <Name> — Retrospective

> Written by `/close-sprint <N>` on <YYYY-MM-DD>.
> Sprint shipped on <shipped date from roadmap>.

## Shipped vs planned

<the table from §3>

**Total AC items:** <X>
**With evidence:** <Y>
**Without evidence (gaps):** <Z>

### Gaps

- <each gap with one-line description and remediation suggestion>

## Drift findings

### CONTEXT.md drift
- <each finding>

### ADR drift
- <each finding>

### Sprint file accuracy
- Planned but not done: <list>
- Done but not planned: <list>

### Roadmap drift
- <each finding>

### Dependency / version drift
- <each finding>

### Test coverage
- <findings, with the actual numbers from §4.6 if measured>

## Prerequisites for sprint <N+1>

### Hard blockers (must resolve before /create-sprint-issues <N+1>)
- <list>

### Soft prereqs (nice-to-have)
- <list>

### Parallel action items from charter §19 relevant to <N+1>
- <list>

## Proposed doc updates

The following changes should land before sprint <N+1> starts. Each is a separate commit so they can be reviewed individually.

- [ ] **Update `apps/api/src/modules/<context>/CONTEXT.md`** — <one-line description>
- [ ] **Create `docs/adr/<NNNN>-<name>.md`** — capture the <decision>
- [ ] **Append to `GRILL-OUTCOME.md` §21** — record <version bump or revision>
- [ ] **Append to `docs/prd/03-roadmap.md` Shipped log** — (if /run-issue's sprint-final missed it)
- [ ] **(if applicable) Update `docs/prd/sprints/sprint-<NN+1>-<name>.md`** — <e.g., revise file list based on what actually shipped>

## Lessons for sprint <N+1>

<short prose — 1-3 paragraphs of what we learned that should inform N+1's execution>

## Sign-off

After all "Proposed doc updates" above are applied (or explicitly skipped), run `/create-sprint-issues <N+1>` to begin the next sprint.
```

Save this file. **Do not commit it yet** — it goes in one logical commit with the remediations (or alone if no remediations).

---

## 7. Show the retro + propose remediations

Print the retro to the conversation (the whole markdown body). Then walk through the "Proposed doc updates" list one by one. For each:

> *"Apply update: <description>? (yes / skip / show-me-the-diff)"*

- `yes` → make the edit, stage it, continue
- `skip` → leave the file alone, continue
- `show-me-the-diff` → use Edit/Write tools to compose the change but don't save yet; show the proposed diff to the user; ask `yes / skip` again

For ADR creation: never auto-create. Always show the proposed ADR draft and ask `yes / skip / edit`.

For sprint-N+1 file edits (the most fraught — touching a sprint spec): never auto-edit. Always require explicit `yes`.

---

## 8. Commit the retro + applied remediations

If any updates were applied, commit them as **separate** logical commits in this order:

1. `docs: sprint-<NN> retro` — just the retro file
2. `docs: context.md updates from sprint <N> retro` — all CONTEXT.md edits in one commit
3. `docs: add ADR-XXXX <name>` — one commit per new ADR
4. `docs: charter §21 — sprint <N> revisions` — if GRILL-OUTCOME.md was touched
5. `docs: roadmap shipped log + sprint <N+1> spec updates` — final cleanup

Push each to main directly (doc-only, no PR needed):

```bash
git add <files>
git commit -m "<message>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin main
```

If no remediations were applied (all skipped), still commit the retro itself — it's the record of what was found:

```bash
git add docs/prd/sprints/sprint-<NN>-*-retro.md
git commit -m "docs: sprint-<NN> retro (no remediations applied)"
git push origin main
```

---

## 9. Final summary

Print:

```
Sprint <N> closure complete.

Retro: docs/prd/sprints/sprint-<NN>-<name>-retro.md
Shipped: <X>/<Y> AC items had evidence in merged code
Drift findings: <count>
Hard blockers for sprint <N+1>: <count>

Doc updates applied: <count>
Doc updates skipped: <count>

Status of sprint <N+1>:
  - Sprint file: <exists | needs creation>
  - Hard blockers: <list, or "none — ready to /create-sprint-issues <N+1>">

Suggested next step: <one line — either resolve a blocker, or /create-sprint-issues <N+1>>
```

Then stop.

---

## 10. Bail conditions

Stop and tell the user when:

- Sprint N's roadmap row isn't 🟢 (you can't "close" a sprint that didn't ship)
- The sprint file doesn't exist
- Parent PRD issue for sprint N is still OPEN (sprint isn't actually closed)
- More than 3 child issues are still OPEN (the sprint is far from done — fix that first)
- The user asks to skip every proposed remediation but findings include hard blockers for N+1 (require an explicit "I acknowledge — proceed anyway" before continuing)

On bail, do **not** write the retro. Tell the user what's preventing closure.

---

## 11. Special cases

### Sprint 1 (scaffold)

Sprint 1 is special — it touches every workspace, so the drift checks will involve more files than later sprints. Be generous on §4.3 (sprint file accuracy) since scaffold sprints often expand scope as workspaces are wired together. Tighter on §4.1 (CONTEXT.md) — the per-context CONTEXT.md files are stubs from baseline and need real updates if S1 modules added domain stubs.

### When sprint N+1 file doesn't exist yet

If `docs/prd/sprints/sprint-<NN+1>-*.md` doesn't exist (e.g., closing S10 and Phase 2 isn't yet detailed), skip §5 (prereq comparison) and note in the retro: `"Sprint <N+1> file doesn't exist yet. Create it from the placeholder row in 03-roadmap.md as part of Phase <next> planning before /create-sprint-issues <N+1>."`

### Phase boundary

If closing the last sprint of a phase (S10 for Phase 1, S16 for Phase 2), add a `## Phase summary` section to the retro reflecting the phase as a whole. The user will want this for stakeholder communication.

---

## Tooling reference

- `Read`, `Write`, `Edit`, `Glob`, `Grep` — file work
- `Bash` — every `git`, `gh`, `pnpm`, file inspection
- `TodoWrite` — track your progress through the checks (typically 10-15 todos: read inputs, run each drift check, write retro, propose remediations, commit each)
- **No subagents.** This is a single-session, single-sprint retro.

End of prompt.
