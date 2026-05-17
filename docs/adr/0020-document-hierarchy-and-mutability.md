# ADR-0020: Document hierarchy and mutability rules

- **Status**: Accepted
- **Date**: 2026-05-17

## Context

The repo accumulates multiple kinds of documentation, each with its own update cadence:

- `GRILL-OUTCOME.md` — locked design charter
- `docs/adr/*.md` — architectural decisions (this file itself)
- `docs/prd/00-vision.md`, `02-phases.md` — charter-level scope
- `docs/prd/03-roadmap.md` — cross-sprint trajectory
- `docs/prd/features/*.md` — per-feature product spec
- `docs/prd/flows/*.md` — end-to-end user journeys
- `docs/prd/sprints/sprint-NN-*.md` — per-sprint DoD
- `docs/prd/sprints/sprint-NN-*-retro.md` — per-sprint retrospective
- `docs/prd/ops/*.md` — operational runbooks
- `docs/prd/ui/wireframes/*.md`, `docs/prd/ui/hifi/*.md` — UI specs
- `CONTEXT.md` (18 files across `apps/`, `apps/api/src/modules/`, `packages/`) — current implemented state per ADR-0019
- `CONTEXT-MAP.md` — index of every `CONTEXT.md`
- GitHub Issues — work units (parent PRD + slice children per `docs/agents/issue-tracker.md`)

[ADR-0019](0019-context-md-describes-current-state.md) solved the CONTEXT.md drift problem (CONTEXT mirrors code, code catches up to CONTEXT). The same class of drift exists across the rest of the documentation layer:

- A PRD describes capability X. Sprints ship Y instead. The PRD silently becomes fiction.
- A sprint file's DoD lists Z. Issues shipped covered Z + a quietly-added W. The sprint file no longer reflects what was actually committed to.
- Two artifacts both try to answer "what should this feature do?" — drift inevitable.

The 2026-05-17 pre-S3 grill made this concrete: catalog/CONTEXT.md described aspirational state, sprint-03 described a different scope, PRD features/31-catalog.md described yet another shape. Cleaning up CONTEXT.md alone wasn't sufficient — we needed a principle for the whole hierarchy.

## Decision

**Each documentation artifact has exactly one job and exactly one mutability rule.** No artifact answers a question another artifact already answers. When that boundary is unclear, this ADR is the tiebreaker.

### The artifact hierarchy

| Artifact | Single role (the one question it answers) | Mutability | Time-direction |
|---|---|---|---|
| `GRILL-OUTCOME.md` | "What did we lock at the charter level?" | Effectively immutable (charter revision is a deliberate, rare event with its own grill) | Past tense decisions |
| `docs/adr/*.md` | "Why did we decide this approach?" | **Immutable after merge.** New ADRs supersede old; do not edit merged ADRs. | Past tense decisions |
| `docs/prd/00-vision.md`, `02-phases.md` | "What is the product vision / phase scope?" | Rarely (only with explicit revision; charter-level) | Future / strategic |
| `docs/prd/features/*.md` | "What does this feature DO when complete?" (target capability) | Mutable; each revision that changes a capability gets a new ADR | Future / target |
| `docs/prd/flows/*.md` | "What is this end-to-end user journey?" | Mutable alongside its feature PRD | Future / target |
| `docs/prd/sprints/sprint-NN-*.md` | "What does this sprint ADD toward the PRD?" | Mutable until sprint starts; **locked when its roadmap row → 🟡**. Post-start scope changes go in the retro. | Forward-looking commitment |
| `docs/prd/sprints/sprint-NN-*-retro.md` | "What actually shipped vs planned?" | Append-only; never edit historical entries | Past tense |
| `docs/prd/03-roadmap.md` | "Where are we in the trajectory?" | Mutable per sprint transition (⚪ → 🟡 → 🟢) | Mixed (table tracks both past + future) |
| `docs/prd/ops/*.md` | "How do we operate this in production?" | Mutable; revisions reflect actual ops experience | Present + future |
| `docs/prd/ui/wireframes/*.md`, `docs/prd/ui/hifi/*.md` | "What does this screen look + behave like?" | Mutable until shipped; once a screen is shipped, the spec is a current-state mirror (like CONTEXT.md) | Future → present after ship |
| `CONTEXT.md` (per app, per package, per bounded context) | "What is in code today?" | Mutable per PR that changes invariants (ADR-0019) | Present |
| `CONTEXT-MAP.md` | "Where do I find each CONTEXT.md?" | Mutable when new contexts are added | Present |
| GitHub Issues | "What's the work?" | Body locked once an AFK agent picks up the issue (immutable for the run); comments accumulate | Mixed |

### Mutability rules in plain English

1. **Immutable means immutable.** ADRs and merged retro docs do not get edited. If you need to change a decision, write a new ADR that explicitly supersedes the old. If a retro got something wrong, append a correction in the next retro.

2. **"Mutable per X" means "edited at the boundary, not silently."** A sprint file is mutable until the sprint starts. After that, the sprint file is "what we committed to ship." Slippage gets recorded in the retro, not by editing the original DoD. Same logic for PRD features: small revisions during planning are fine, but capability changes (adding a feature, removing one, changing a contract) generate an ADR so future readers know why the spec moved.

3. **CONTEXT.md is the strictest mutable.** Per ADR-0019, every PR that changes domain invariants updates the relevant CONTEXT.md in the same PR. No lag.

4. **The roadmap is the only "current trajectory" doc.** Don't try to track current-sprint status in PRDs or feature files. Roadmap = trajectory; everything else points at it.

### Adding a new PRD feature — workflow

If you decide today "we should add a new feature: `dealer-comparison`":

1. **Decide the phase** (1/2/3). Phase 1 means it ships in the current MVP arc; Phase 2 or 3 means it slots into the placeholder rows of the roadmap.
2. **Write the PRD** as `docs/prd/features/NN-dealer-comparison.md` (next available number). Describe target capability, user flow, edge cases, anti-goals.
3. **Write an ADR** capturing the decision to add it (e.g., `docs/adr/0021-add-dealer-comparison-feature.md`). One paragraph: business need + tradeoff (what's pushed out to accommodate this) + phase.
4. **If Phase 1 (current focus)**: also create or update a sprint file. Either extend an existing pending sprint's DoD, or create a new `docs/prd/sprints/sprint-NN-dealer-comparison.md` + add a row to the Phase 1 table in `03-roadmap.md`.
5. **If Phase 2 or 3**: just add a row to the relevant placeholder table in `03-roadmap.md`. The sprint file is written when that phase begins.
6. **Do NOT write to CONTEXT.md.** Per ADR-0019, CONTEXT.md only describes what's shipped. The new feature's CONTEXT.md updates happen during its sprints.

### Editing an existing PRD — when an ADR is required

| Edit | ADR required? |
|---|---|
| Typo, formatting, link fix | No |
| Adding clarifying example or rephrasing for clarity | No |
| Filling in a TBD that was always going to be filled in | No |
| Renaming for consistency with project vocabulary | No |
| **Removing a capability** ("we decided not to support video reviews in Phase 1") | **Yes** |
| **Adding a capability** beyond the original spec | **Yes** |
| **Changing a behavior contract** (e.g., "max video length goes from 60s to 30s") | **Yes** |
| **Splitting one feature into two PRDs or merging two** | **Yes** |
| **Anything a future agent reading the PRD would wonder "wait, why did they change this?"** | **Yes** |

ADRs are cheap. Writing one paragraph captures the decision history. The cost of missing one is unrecoverable drift.

### Sprint file mutability — the locking moment

Sprint files are mutable until the sprint starts. The locking moment is when the roadmap row for that sprint transitions ⚪ Pending → 🟡 In progress. Before that moment, edit freely (we did this twice on 2026-05-17 for sprint-03-catalog.md). After that moment:

- Post-start scope changes go in the retro doc (`sprint-NN-*-retro.md`), not by editing the sprint file
- Bug fixes / clarifications to existing DoD items are fine (small, factual, no retro entry needed)
- Adding new DoD items mid-sprint → retro entry; consider whether the addition is really a new sprint candidate

### Doc-pair drift checks (run at the right boundaries)

| Pair | Check | When |
|---|---|---|
| CONTEXT.md ↔ Prisma schema | Entities in CONTEXT.md `## Owns` match Prisma models (both directions) | Every PR that changes invariants (`/run-issue` §5.5); also `/sprint-status` + `/close-sprint` §4.1 |
| Sprint file DoD ↔ shipped PRs | `[x]` checkboxes in sprint file match merged PRs on the parent issue | `/sprint-status` (sanity %); `/close-sprint` (full reconciliation) |
| Roadmap status ↔ child-issue state | If every child is CLOSED, roadmap row should be 🟢, not 🟡 | `/sprint-status` |
| PRD feature ↔ shipped sprint output | PRD claims X; sprint(s) shipped Y. If different, retro records the decision + future-sprint-or-PRD-revision | `/close-sprint` |
| New PRD ↔ ADR | A new PRD feature exists. An ADR captures the decision to add it. | Manual review at PRD authorship time; can be added by `/triage` or `/to-prd` flows |

## Consequences

### Positive

- **Drift becomes detectable instead of accumulating.** Every doc-pair check has a defined when, where, and how. `/sprint-status`, `/run-issue`, `/close-sprint` all enforce a slice.
- **Onboarding agents read four artifacts and know everything.** GRILL-OUTCOME for charter; PRD for target; sprint for "what's being built now"; CONTEXT.md for "what exists today." No ambiguity.
- **PRD revisions leave a trail.** Every capability change generates an ADR. Future readers see "the spec used to say X; we changed to Y because Z" in commit-immutable form.
- **Sprint file integrity is preserved.** Once a sprint is in flight, its plan is locked. Slippage becomes data (retro) instead of silent revision.
- **CONTEXT.md remains the single source of truth for "what's in code right now."** No competing artifact tries to claim that role.

### Negative / accepted costs

- **One ADR per material PRD revision** is a real cost. Mitigated by ADRs being one paragraph each — cheaper than the drift cost.
- **Sprint files locked at 🟡 means scope creep mid-sprint must go to the retro.** Slight friction; intentional — forces deliberate scope additions instead of silent ones.
- **Discipline required.** This ADR is a rule; it only works if every agent + contributor respects it. Hence the references in CLAUDE.md, AGENTS.md, and `docs/agents/`.

### Neutral

- No code changes from this ADR alone — it's a doc-hierarchy lock.
- Existing artifacts already roughly follow this pattern; this ADR makes the rules explicit.
- Companion enforcer: `/sprint-status` gains a drift-check section that surfaces violations early.

## Alternatives considered

- **No hierarchy rule — let each artifact evolve organically.** Rejected: that's what we had before, and it produced the cross-repo drift the 2026-05-17 grill cleaned up.
- **All docs immutable (like ADRs).** Rejected: PRDs and sprint files genuinely need to evolve as understanding sharpens; locking them stops good revisions alongside bad ones.
- **All docs mutable (no locking moments).** Rejected: removes the "what we committed to ship" signal that sprint files carry; makes drift detection impossible.
- **Single mega-doc combining PRD + sprint + CONTEXT per feature.** Rejected: conflates three roles (target, delta, present) into one artifact — exactly the drift we're trying to avoid.
- **Companion guide at `docs/agents/doc-hierarchy.md`.** Considered but rejected: this ADR IS the authoritative source; a companion guide would either duplicate or diverge. Agents read this ADR directly via the references in CLAUDE.md / AGENTS.md / `docs/agents/issue-tracker.md` / `docs/agents/domain.md`.

## References

- [ADR-0019](0019-context-md-describes-current-state.md) — CONTEXT.md describes current state (this ADR generalizes that principle to the rest of the doc layer)
- [ADR-0001](0001-architecture.md) — Bounded contexts (the boundary CONTEXT.md files mirror)
- [ADR-0017](0017-context7-as-canonical-doc-source.md) — Context7 MCP as the canonical lib-doc source (this ADR follows the same pattern: one source of truth per concern)
- `CLAUDE.md` — verification gate item 3 + Documentation systems table; cross-references this ADR
- `AGENTS.md` — CONTEXT.md rule section; cross-references this ADR
- `docs/agents/issue-tracker.md` — Completion signal item 3; cross-references this ADR
- `docs/agents/domain.md` — multi-context CONTEXT.md system; cross-references this ADR for the broader doc layer
- `.claude/commands/sprint-status.md` + `.agents/skills/sprint-status-agent-skill/SKILL.md` — implement the drift checks defined here
- `2026-05-17 pre-S3 grill` — captured in `/Users/bagtyyar/.claude/plans/fancy-herding-kurzweil.md` for posterity
