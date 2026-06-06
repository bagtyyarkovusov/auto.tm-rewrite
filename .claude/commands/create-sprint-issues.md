---
description: Read one sprint file, propose small Sandcastle-ready vertical slices, then, after human confirmation, create the Sprint PRD parent plus child GitHub issues with labels, Depends-on graph, and roadmap start update.
---

# AutoTM - Create a sprint's GitHub issues

> **Invocation:** `/create-sprint-issues [SPRINT_NUMBER]`
>
> The user is preparing exactly one sprint for AFK execution. The output is one parent Sprint PRD issue plus child issues that can be consumed by both `/run-issue` and Sandcastle. You propose the slicing, the user confirms, then you create issues. Never bulk-create without explicit confirmation.

---

## 0. Hard rules

- **One sprint only.** Refuse multi-sprint requests.
- **Human confirmation is required** before any issue is created.
- **Previous sprint must be shipped.** Refuse Sprint N if Sprint N-1 is not `🟢 Shipped` in `docs/prd/03-roadmap.md`, except Sprint 1.
- **No duplicate parent.** Check all issues for an existing `Sprint N —` parent before creating anything.
- **Do not edit the sprint file.** It is input. If it is ambiguous, stale, or unsliceable, stop and tell the user.
- **Use only existing labels** from `docs/agents/triage-labels.md`.
- **Never label the parent `ready-for-agent`.** Parents are dashboards, not work units.
- **Do not flip the roadmap to `🟡`** until every issue is created successfully.
- **Do not create Sandcastle work from vague UI language.** If a UI slice only says "make it nice", "polish it", or "improve UX" without concrete constraints, make it `ready-for-human` or stop for shaping.

---

## 1. Read first

Read these in order:

1. `CLAUDE.md`
2. `GRILL-OUTCOME.md`
3. `docs/prd/03-roadmap.md`
4. `docs/prd/sprints/sprint-<NN>-<name>.md` for the target sprint
5. `docs/prd/sprints/sprint-<NN+1>-<name>.md` if it exists, for downstream hints only
6. `docs/agents/issue-tracker.md` for canonical parent and child templates
7. `docs/agents/triage-labels.md` for exact labels
8. `docs/agents/sandcastle.md` and `docs/adr/0028-kimi-sandcastle-afk-orchestrator.md`
9. `CONTEXT-MAP.md`
10. `docs/adr/0019-context-md-describes-current-state.md`
11. `docs/adr/0020-document-hierarchy-and-mutability.md`
12. `docs/agents/documentation-lookups.md`
13. Relevant per-context `CONTEXT.md` files and ADRs listed in the sprint file's `## References`
14. `.agents/skills/to-issues/SKILL.md` for tracer-bullet issue slicing

For UI, mobile, web, or admin slices, also apply the compressed Lean UX, UX heuristics, and Impeccable rules in §4.4 and §5.2. If the full personal skills are present, you may read them, but this command must remain usable from repo-local docs alone.

If `docs/agents/issue-tracker.md` or `docs/agents/triage-labels.md` is missing or empty, stop.

---

## 2. Resolve the sprint number

If `$ARGUMENTS` is a number, set it as **N**.

If `$ARGUMENTS` is empty or non-numeric:

1. Read the Current Sprint block and Phase 1 table in `docs/prd/03-roadmap.md`.
2. List pending `⚪` sprints.
3. Ask: `Which sprint should I create issues for? Reply with the number.`
4. Wait for the answer.

Refuse Sprint 1 with: `Sprint 1's issues already exist. Use this command for Sprint 2 onward.`

---

## 3. Verify preconditions

```bash
# Sprint file exists
ls docs/prd/sprints/sprint-$(printf '%02d' $N)-*.md
```

If no file matches, stop.

Read `docs/prd/03-roadmap.md` and verify Sprint N-1 is `🟢 Shipped`, unless N is 1. If not, stop.

```bash
# Parent does not already exist
gh issue list --state all --search "\"Sprint $N\" in:title" --json number,title,state
```

If an existing parent issue for this sprint exists, stop and report it.

```bash
# Predict issue numbers
LAST=$(gh issue list --state all --limit 1 --json number --jq '.[0].number // 0')
NEXT=$((LAST + 1))
echo "Predicted parent issue: #$NEXT"
```

The parent is predicted as `#NEXT`; children are predicted sequentially as `#NEXT+1`, `#NEXT+2`, etc. If GitHub returns any different number during creation, stop.

---

## 4. Propose the slicing, do not create yet

### 4.1 Extract sprint facts

From the sprint file, identify:

- sprint name, phase, milestone, demo line
- bounded contexts touched
- user-facing behaviors in the sprint DoD
- files the sprint expects to create or modify
- tests required
- references and open risks
- any explicit `Recommended child issue map`

Use the sprint's language in issue titles. Prefer domain behavior titles over layer titles, for example `S6: start contact from listing detail`, not `S6: add conversations controller`.

### 4.2 Slice as tracer bullets

This command is a project-specific superset of `to-issues`:

- Each child issue is a narrow, complete tracer bullet through the needed layers.
- A completed child is demoable or mechanically verifiable on its own.
- Prefer many thin slices over a few thick ones.
- Publish blockers before dependents.
- Classify every child as **AFK** or **HITL** in the proposal.

Default to **AFK** only when the issue body can give an agent enough context to finish without more human judgment. Use **HITL** when the slice requires a product decision, design choice, unresolved architecture tradeoff, credential, manual simulator gate as the primary deliverable, or ambiguous copy/UX judgment.

For Sandcastle, only AFK issues should receive `ready-for-agent`. HITL issues, if the user explicitly wants them created, use `ready-for-human` and must not be in the initially unblocked Sandcastle queue.

### 4.3 Sandcastle sizing bar

Each AFK child must be one-shot-able by a single agent in one sandbox run:

- **One reason to change:** one use case, one shared foundation concern, one frontend surface, or one final verification sweep.
- **Small file surface:** name the expected files. If you cannot scope the likely files, the slice is not ready.
- **No hidden design/product decisions:** all labels, copy intent, states, and acceptance criteria needed by the implementer are in the sprint file or issue body.
- **No broad foundations by habit:** create a foundations issue only for truly shared compile/runtime prerequisites. Let vertical slices own their own schema, contracts, tests, and UI where that avoids a bottleneck.
- **Parallel-safe edits:** avoid placing unblocked sibling issues on the same hot files (`schema.prisma`, route registries, module exports, shared mobile layouts). If two issues must touch the same hot file, add a real dependency or combine the change.
- **No new dependency surprises:** if a child needs a package not already in the lockfile, call it out. Sandcastle's offline install may fail until the host updates `pnpm-lock.yaml` and rebuilds the image.
- **D1 gate aware:** Sandcastle runs typecheck, lint, and Docker-free unit tests. Do not make in-sandbox completion depend on Testcontainers e2e, Docker-in-Docker, iOS simulator, or Expo Go.
- **Mobile caveat explicit:** mobile issues can be AFK for code, typecheck, lint, and unit tests, but the host must run the Expo simulator gate after merge.

If a slice violates this bar, split it, mark it HITL, or stop for clarification.

### 4.4 UI and UX issue quality bar

For mobile, web, admin, shared UI, onboarding, form, empty-state, or flow issues, add concrete UX guidance. Keep it short and testable.

Lean UX:

- State the riskiest user assumption when there is one.
- Add a hypothesis in this shape when useful: `We believe <outcome> improves if <persona> can <action> with <feature>.`
- Add one success signal or learning check when the sprint is meant to teach us user behavior.
- Keep artifacts lightweight. Do not ask for a heavy design spec when a small implemented slice can answer the question.

UX heuristics:

- Main action is obvious and named in plain language.
- System status is visible for loading, saving, sending, disabled, success, and failure states.
- Errors say what happened and how to recover.
- Users can back out, retry, undo, or return to the previous screen where the flow needs it.
- Inputs prevent common mistakes and preserve user-entered data after errors.
- No hover-only critical information; mobile tap targets are at least 44x44 px.
- Navigation and page/screen identity are clear without reading instructions.

Impeccable anti-slop:

- Use project tokens and existing components before inventing new visual language.
- Do not accept generic AI UI tropes: decorative glass, gradient text, side-stripe cards, hero-metric templates, identical icon-card grids, or modal-first flows.
- Avoid category-reflex design. The UI should fit AutoTM's marketplace task and the actual surface, not a generic "car app" palette or SaaS dashboard trope.
- Every word earns its place. Issue bodies should specify user-visible copy only when the copy matters.
- If the visual direction is not determined enough for an AFK agent, create a HITL design-shaping issue instead of a vague implementation issue.

### 4.5 Common sprint patterns

Scaffold sprint:

- Use one child per workspace (`apps/*`, `packages/*`) plus cross-cutting prep and final verification.
- Do not create a generic foundations issue unless it unlocks several children.

Feature sprint:

- Prefer vertical use-case slices.
- Add a shared foundations issue only for unavoidable shared schema/contracts/env/module wiring.
- Add UI integration slices only when UI cannot naturally ship inside the use-case slice.
- Add one final wiring issue for smoke checks, dependency cleanup, docs reconciliation, and roadmap closeout.

Typical sprint size is 5-10 children. If you need more, explain why. If any issue looks like more than one focused agent run, split it.

### 4.6 Proposal format

Print a table using predicted issue numbers:

```markdown
| # | Title | Mode | Area | Type | Depends on | One-line scope |
|---|---|---|---|---|---|---|
| #120 | Sprint 6 — Contact seller (parent) | parent | - | feature | - | Dashboard + tasklist |
| #121 | S6: contact foundations | AFK | api,db,contracts | task | None | Minimal schema/contracts/module wiring |
| #122 | S6: buyer starts contact from listing detail | AFK | api,mobile | feature | #121 | Create/get thread path and CTA wiring |
| #123 | S6: contact UX copy and empty/error states | HITL | mobile | enhancement | #122 | Human reviews labels/states before AFK |
```

Then print a dependency graph and a short `Notes / questions` section. Ask:

`Confirm to create these <M> issues on GitHub? (yes / edit / cancel)`

If the user says `edit`, ask what to change, revise the table, and re-confirm. Stop after three failed confirmation rounds.

---

## 5. Write issue bodies

After confirmation, create `/tmp/sprint-<N>-issues/` and write one markdown body per issue.

Use `docs/agents/issue-tracker.md` as the canonical template. The `to-issues` `Parent` and `What to build` intent maps into the sprint child `Summary`: include the parent issue number and a concise behavior statement there instead of inventing a separate template unless the tracker doc changes.

### 5.1 Parent body

Fill the Sprint PRD parent template with:

- status `🟡 In progress` if the roadmap will be flipped in §7, otherwise the current status
- phase, milestone, sprint doc link, and demo line
- child tasklist with predicted numbers
- dependency graph
- initially unblocked queue, excluding HITL and `blocked` children
- note that Sandcastle consumes `ready-for-agent -blocked` and `/run-issue` can also run one child synchronously

### 5.2 Child body

Every child body must be self-contained enough for a cold Sandcastle sandbox.

Fill these sections:

- **Summary:** one paragraph with parent reference, sprint doc section, what this slice ships, and why it matters.
- **Read first:** always include the sprint file, `CLAUDE.md`, ADR-0019, ADR-0020, `docs/agents/issue-tracker.md`, `docs/agents/sandcastle.md`, and relevant `CONTEXT.md` files. Include `docs/agents/documentation-lookups.md` whenever the slice touches an external library, framework, SDK, CLI, or cloud service. Add mobile/nativewind/data-fetching/type-runtime guides when relevant.
- **Files to create / modify:** scoped file list with one-line purpose. Include relevant `CONTEXT.md` when domain invariants, ports, events, Prisma fields, routes, package exports, or app/package structure change.
- **Implementation notes:** only the minimum details needed to avoid guessing: names, type shapes, route shapes, event names, env vars, or critical constraints from the sprint file.
- **Architecture notes:** allowed bounded contexts, ports, mappers, events, routes, and deep abstractions. Do not request pass-through services or wrappers by default.
- **Testing / TDD note:** name the first failing tests for domain, application, security, persistence, mapper, and high-risk slices. Do not force TDD language into pure docs, mechanical wiring, UI-only, or final smoke slices.
- **UX notes:** include only for UI/user-flow slices. Use the Lean UX, UX heuristics, and Impeccable rules in §4.4. Make the notes concrete: required states, copy constraints, accessibility/tap-target constraints, and anti-slop bans relevant to the surface.
- **Acceptance criteria:** slice-scoped subset of sprint DoD. Include `Update <CONTEXT.md path> to reflect new state (per ADR-0019)` whenever the slice changes current-state invariants, unless explicitly deferred to final wiring.
- **Out of scope:** sibling slices and deferred product scope.
- **Depends on:** issue numbers or `None`.
- **Completion signal:** `<promise>COMPLETE</promise>` plus workspace-specific commands. For Sandcastle-compatible issues, include the expected in-sandbox gate: `pnpm exec turbo run typecheck lint test:unit --filter=<workspace>`. For mobile, also state that the host Expo simulator gate remains a post-merge human check.

AFK issue bodies must not contain placeholders like `TBD`, `decide later`, or `make this polished`. Resolve them before creation or mark the issue HITL.

---

## 6. Create the issues

Create the parent first:

```bash
gh issue create \
  --title "Sprint <N> — <Name>" \
  --body-file /tmp/sprint-$N-issues/00-parent.md \
  --label "phase-<phase>,feature"
```

Verify the returned issue number matches the predicted parent. If not, stop.

Create children sequentially in dependency order:

```bash
gh issue create \
  --title "S<N>: <child title>" \
  --body-file /tmp/sprint-$N-issues/<NN>-<slug>.md \
  --label "<triage>,phase-<phase>,<area labels>,<type labels><,blocked>"
```

Label rules:

- AFK children: `ready-for-agent`
- HITL children: `ready-for-human`
- Add `blocked` if `## Depends on` lists any open issue
- Add one or more area labels from `docs/agents/triage-labels.md`
- Add one type label: `feature`, `enhancement`, `task`, `security`, or `perf`
- Use numeric phase labels exactly as defined in `docs/agents/triage-labels.md`, for example `phase-1`, not `phase-1 (MLP beta)`
- Parent: `phase-<phase>,feature` only

After each create, verify the actual number matches the predicted number. If any mismatch occurs, stop immediately and tell the user which bodies now contain stale references. Offer to either edit the created issues with corrected bodies or close and retry from fresh predictions.

---

## 7. Update roadmap to `🟡`

Only after all issue creation succeeds.

Edit `docs/prd/03-roadmap.md`:

- Current Sprint block: set Sprint, Status `🟡 In progress`, Started to `date -u +%Y-%m-%d`, Plan file/Sprint doc/Milestone to the target sprint.
- Phase 1 table: set S<N> row Status `🟡`, Started to today's UTC date.

Commit and push directly to `main` unless the repo state or user instruction requires a PR:

```bash
git add docs/prd/03-roadmap.md
git commit -m "docs: mark S<N> in progress"
git push origin main
```

Do not include unrelated files.

---

## 8. Final summary

Print:

```text
Sprint <N> issues created.

Parent:   #<parent> <url>
Children: #<first>-#<last> (<M> issues)

Sandcastle-ready unblocked queue:
  - #<n> S<N>: <title>

HITL or manually-gated issues:
  - #<n> S<N>: <title> (if any)

Roadmap: S<N> flipped to 🟡 In progress on main.

Suggested next:
  - Sandcastle: pnpm sandcastle
  - Single issue: /run-issue <first unblocked issue>
```

Then stop. Do not start Sandcastle or `/run-issue` automatically.

---

## 9. Bail conditions

Stop without creating issues or editing the roadmap when:

- sprint file is missing
- previous sprint is not `🟢`
- parent issue already exists
- sprint DoD is empty, ambiguous, or unsliceable
- issue bodies would need unresolved design, product, architecture, or dependency decisions
- predicted issue number changes mid-create
- labels/templates are missing
- user cancels or does not confirm after three rounds

If any issues were created before a failure, report exactly what exists and what needs cleanup.
