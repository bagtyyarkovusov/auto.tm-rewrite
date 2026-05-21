---
name: close-sprint-agent-skill
description: Runs a closure / retrospective pass on a finished AutoTM sprint. Use when the user asks to "close sprint N", "retro sprint N", "wrap up sprint N", or wants drift / gap analysis after all sprint issues are closed. The skill verifies shipped-vs-planned (comparing merged PR diffs against each issue's acceptance criteria), detects drift in CONTEXT.md / ADRs / sprint file / roadmap / dependency versions / test coverage, identifies prerequisites for the next sprint, writes a retro doc at docs/prd/sprints/sprint-NN-<name>-retro.md, and proposes doc-update commits one-by-one for human approval. Refuses to act if the sprint isn't actually shipped (parent issue still open, >3 children open, or roadmap status not 🟢).
---

# AutoTM — Close a sprint (agent skill)

> **Source:** Mirrors `.claude/commands/close-sprint.md` adapted for cross-agent use (SKILL.md format).
>
> **Invocation:** When the user says "close sprint 1", "retro sprint 2", "wrap up sprint N", or names a sprint to close, treat that number as **N**. If empty, find the most-recently-shipped sprint (last row in `docs/prd/03-roadmap.md`'s Phase 1 table with status 🟢) and use that.
>
> Sprint **N** has just shipped. Your job is to make the closure honest: catch drift between shipped and planned, identify doc updates that should land before sprint N+1 starts, and write a retro that future sessions can read for full context. **You propose changes; the user approves each one.** This is reflection, not automation.

---

## 0. Hard rules

- **Never edit `GRILL-OUTCOME.md`, `docs/adr/*` (immutable), or the sprint file in-place.** Propose diffs, let user approve.
- **Never close issues, change labels other than `blocked`, or merge PRs.**
- **Never mark the roadmap status if it doesn't match reality.**
- **Never write a retro that ignores findings.** The point is catching what /run-issue couldn't.
- **Never start the next sprint** — that's a separate human decision.

---

## 1. Read first

1. `CLAUDE.md`
2. `docs/prd/03-roadmap.md` — confirm sprint N is 🟢
3. `docs/prd/sprints/sprint-<NN>-<name>.md` — the input
4. `docs/prd/sprints/sprint-<NN+1>-<name>.md` if exists — next sprint
5. `docs/agents/issue-tracker.md`
6. `CONTEXT-MAP.md`
7. `docs/adr/0019-context-md-describes-current-state.md` and `docs/adr/0020-document-hierarchy-and-mutability.md`
8. `docs/agents/documentation-lookups.md`
9. Per-context `CONTEXT.md` files for contexts the sprint touched
10. ADRs referenced by the sprint file

---

## 2. Verify closure preconditions

```bash
# (a) Parent PRD issue closed?
gh issue list --state all --search "Sprint $N — in:title" --json number,state
# (b) All child issues closed?
gh issue list --state open --search "S$N: in:title" --json number,title
# (c) Roadmap 🟢?
```

If any mismatch with reality, that's drift — surface in retro, continue. Don't bail unless §10 conditions met.

---

## 3. Compare shipped vs planned

For each child issue of sprint N:

```bash
gh pr list --state merged --search "$child in:body" --json number,title,url,files
```

For each merged PR:
- `gh pr diff <pr>` — get diff
- Read issue's AC
- For each AC checkbox, find evidence in diff
- Note items without clear evidence

Time-box ≤2 min per PR. Goal: catch obvious gaps, not forensic audit.

Build table:

```
| Issue | PR  | AC items | With evidence | Without evidence |
```

---

## 4. Detect drift

### 4.1 CONTEXT.md drift

Per [ADR-0019](../../../docs/adr/0019-context-md-describes-current-state.md), CONTEXT.md mirrors current implemented state. The `/run-issue` flow's §5.5 enforces this per-PR; this section is the safety net.

For each touched context, check (a) whether `CONTEXT.md` has been updated since the sprint started AND mentions new entities/use-cases/ports the sprint introduced (grep for symbol names), AND (b) the **inverse** — whether CONTEXT.md still lists anything that doesn't exist in code today. Both directions are drift under ADR-0019. Aspirational content belongs in PRD features or sprint files, never CONTEXT.md.

### 4.2 ADR drift

For each PR, read description. Look for non-obvious choices ("decided X over Y") not captured in an ADR. Cross-check `ls docs/adr/`.

### 4.3 Sprint file accuracy

Compare `## Files this sprint creates / touches` against actual files changed:

```bash
gh pr list --state merged --search "S$N: in:title" --json number,files \
  --jq '.[] | .files[].path' | sort -u
```

- Files planned but not touched → likely overlaps with §3 gaps
- Files touched but not planned → scope creep / surprises (inform next sprint file)

### 4.4 Roadmap drift

- Status mismatch with §2
- Shipped log entry exists?
- Current Sprint pointer updated to N+1?

### 4.5 Dependency / version drift

```bash
git diff --stat $(git log --before="<sprint start>" --format="%H" -1) HEAD -- package.json apps/*/package.json packages/*/package.json
```

Did any major version bump mid-sprint without an ADR / charter §21 entry?

### 4.6 Test coverage spot-check

```bash
pnpm --filter <touched workspace> test -- --coverage 2>&1 | tail -20
```

Coverage on `domain/` / `application/` < 70% (per charter §13) → flag.

### 4.7 Architecture and complexity drift

Run a focused pass for the kinds of shortcuts `/run-issue` may miss when it is trying to ship:

```bash
rg "@nestjs|@prisma/client|Prisma\\." apps/api/src/modules/*/domain apps/api/src/modules/*/application || true
rg "from ['\"](\\.\\./)+[a-z-]+/(domain|application|infrastructure|presentation)" apps/api/src/modules || true
rg "Manager|Helper|Wrapper|Service" apps/api/src/modules apps/mobile/src apps/web/src apps/admin/src || true
```

Treat results as review leads, not automatic defects. Flag real issues when:
- domain/application code imports framework, ORM, SDK, or transport details
- one bounded context imports another context directly instead of using a port or event
- new abstractions are pass-through wrappers that add interface surface without hiding complexity
- use-cases or UI containers became large enough that future agents will have to understand unrelated responsibilities to change one behavior
- PRs touched external libraries but did not mention Context7 or the relevant `docs/agents/*` guide in their PR body

---

## 5. Identify prerequisites for sprint N+1

Read `docs/prd/sprints/sprint-<NN+1>-*.md`. Find `## Previous-sprint dependencies` section. Verify each actually shipped.

Hard blockers for N+1 → surface loudly. Also scan `GRILL-OUTCOME.md` §19 for relevant parallel action items.

---

## 6. Compose the retro

Write to `docs/prd/sprints/sprint-<NN>-<name>-retro.md`:

```markdown
# Sprint <N> — <Name> — Retrospective

> Written by close-sprint-agent-skill on <YYYY-MM-DD>.
> Sprint shipped on <date>.

## Shipped vs planned
<table from §3>

**Total AC items:** <X>
**With evidence:** <Y>
**Without evidence:** <Z>

### Gaps
<each gap + remediation suggestion>

## Drift findings
### CONTEXT.md drift
### ADR drift
### Sprint file accuracy
### Roadmap drift
### Dependency / version drift
### Test coverage
### Architecture / complexity drift

## Prerequisites for sprint <N+1>
### Hard blockers
### Soft prereqs
### Parallel action items from charter §19

## Proposed doc updates
- [ ] Update `apps/api/src/modules/<context>/CONTEXT.md` — <description>
- [ ] Create `docs/adr/<NNNN>-<name>.md` — <decision>
- [ ] Append to `GRILL-OUTCOME.md` §21 — <revision>
- [ ] Update roadmap Shipped log (if missed)
- [ ] (if applicable) Update sprint-<NN+1> spec

## Lessons for sprint <N+1>
<1-3 paragraphs prose>

## Sign-off
After all proposed updates land (or are explicitly skipped), run create-sprint-issues-agent-skill <N+1> to begin the next sprint.
```

Save the file. **Do not commit yet.**

---

## 7. Show + propose remediations

Print retro. Walk "Proposed doc updates" one by one:

> *"Apply update: <description>? (yes / skip / show-me-the-diff)"*

- `yes` → make the edit, stage it
- `skip` → leave alone
- `show-me-the-diff` → compose without saving; show; ask again

For ADR creation: never auto-create. Show draft, ask `yes / skip / edit`.
For sprint-N+1 file edits: never auto-edit. Require explicit `yes`.

---

## 8. Commit retro + applied remediations

Commit each logical change separately:

1. `docs: sprint-<NN> retro` — retro file only
2. `docs: context.md updates from sprint <N> retro` — all CONTEXT.md edits
3. `docs: add ADR-XXXX <name>` — one per new ADR
4. `docs: charter §21 — sprint <N> revisions` — if charter touched
5. `docs: roadmap shipped log + sprint <N+1> spec updates` — final

Push each to main (doc-only, no PR).

If no remediations applied, still commit the retro as `docs: sprint-<NN> retro (no remediations applied)`.

---

## 9. Final summary

```
Sprint <N> closure complete.
Retro: docs/prd/sprints/sprint-<NN>-<name>-retro.md
Shipped: <X>/<Y> AC items had evidence
Drift findings: <count>
Hard blockers for sprint <N+1>: <count>

Doc updates applied: <count>
Doc updates skipped: <count>

Status of sprint <N+1>:
  Sprint file: <exists | needs creation>
  Hard blockers: <list, or "none — ready">

Suggested next: <resolve blocker | create-sprint-issues-agent-skill <N+1>>
```

---

## 10. Bail conditions

Stop when:
- Sprint N's roadmap row isn't 🟢
- Sprint file doesn't exist
- Parent PRD issue still OPEN
- >3 child issues still OPEN
- User skips every remediation but findings include hard blockers (require explicit "proceed anyway")

On bail, do not write the retro.

---

## 11. Special cases

**Sprint 1 (scaffold):** generous on §4.3 (sprint file accuracy — scaffold sprints often expand scope). Tighter on §4.1 (CONTEXT.md needs real updates as stubs become real).

**When sprint N+1 file doesn't exist:** skip §5, note in retro that the file must be created from the placeholder row in `03-roadmap.md`.

**Phase boundary:** if closing the last sprint of a phase (S10 for Phase 1), add a `## Phase summary` section to the retro.

---

## Cross-agent notes

Standard tools: file read/write/edit, shell, `git`, `gh`, `pnpm`. Works in any host.
