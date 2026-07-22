# Issue tracker — GitHub Issues

This repo tracks all issues in **GitHub Issues**, using the `gh` CLI.

Skills that read this file: user-global generic skills (`triage`, `qa`, `request-refactor-plan`) and the project workflow skills at `.claude/skills/` (`create-sprint-issues`, `run-issue`) — see [ADR-0040](../adr/0040-repo-canonical-workflow-skills.md).

## Operations

### Create an issue

```bash
gh issue create --title "<concise title>" --body "<markdown body>" --label "needs-triage,<area-label>"
```

For longer bodies, pipe a heredoc:

```bash
gh issue create --title "..." --body "$(cat <<'EOF'
## Summary
...

## Repro / context
...

## Acceptance criteria
- [ ] ...
EOF
)"
```

### Find issues

```bash
gh issue list --label "ready-for-agent" --state open
gh issue list --search "is:open is:issue label:needs-triage"
gh issue view <number>
```

### Update issue state

```bash
gh issue edit <n> --add-label "ready-for-human" --remove-label "needs-triage"
gh issue comment <n> --body "<update>"
gh issue close <n>
```

## Issue types

Two kinds of issues coexist in this repo, **one parent per sprint** plus **one child per vertical slice**. No grandchildren.

| Type | Used for | Body shape |
|---|---|---|
| **Sprint PRD (parent)** | One per sprint (S1, S2, ...). Tracks child sub-issues. | Dashboard + tasklist — no agent prompt. |
| **Sprint child** | One independently mergeable vertical slice. Executed synchronously by `/run-issue` or, when eligible, by Sandcastle. | Self-contained implementation contract (see below). |

## Sprint PRD body template (parent)

```markdown
# Sprint <N> — <Name>

> **Status:** ⚪ Pending | 🟡 In progress | 🟢 Shipped
> **Phase:** 1 | 2 | 3
> **Milestone:** M<n> — <demo line>
> **Sprint doc:** [docs/prd/sprints/sprint-NN-<name>.md](...)
> **Demo line:** <user-facing capability that ships at end of sprint>

## Sub-issues

- [ ] #<n>  <child title>
- [ ] #<n+1> ...

## Sprint-wide DoD

Canonical in the sprint doc. The list above is the slice-level rollup; when every child closes, the sprint's DoD is satisfied.

## How agents pick this up

The unblocked queue is:
\`gh issue list --label "ready-for-agent" --search "-label:blocked" --json number,title,labels\`

- Synchronous: the user selects an issue and invokes `/run-issue <N>` in Claude Code.
- AFK: Sandcastle selects eligible `ready-for-agent` work under the constraints in [`sandcastle.md`](sandcastle.md).

Both paths treat the issue body as the slice contract. The parent remains a dashboard, never an executable prompt.
```

## Sprint child body template (execution contract)

The body must be self-contained enough for either execution path. Reference repository files by path; the executor resolves current facts inside its working tree rather than treating the body as a frozen code snapshot.

```markdown
## Summary

<one paragraph — what this slice ships, why, and how it fits the sprint's demo line>

## Read first (inside the sandbox)

1. `docs/prd/sprints/sprint-NN-<name>.md` — sprint goal + sprint-wide DoD
2. `apps/api/src/modules/<context>/CONTEXT.md` — domain invariants + ports (if API-side)
3. `docs/adr/<NNNN>-<name>.md` — relevant ADRs
4. `CLAUDE.md` — architecture rules (no Prisma in domain, ports for cross-context, etc.)
5. `docs/agents/mobile-expo.md` — required for `mobile` area issues, Expo package work, Metro failures, or Expo Go runtime crashes

## Files to create / modify

<list of paths with one-line purpose each>

## Implementation notes

<minimum-viable code skeletons, type signatures, or config snippets the agent needs that aren't in the referenced files. Skip if everything is captured by reference.>

## Acceptance criteria (slice-scoped)

- [ ] <one bullet per behavior — domain / application / infra / presentation / test>

## Out of scope

- <sibling slices in the same sprint, deliberately deferred>

## Depends on

- #<blocker> (must merge first) — or "None"

## Completion signal

The slice is complete only when:
1. `pnpm typecheck` passes for every workspace touched
2. `pnpm test` passes for every workspace touched
3. The relevant `CONTEXT.md` reflects the new state — **updated in the same PR as the code change** (per [ADR-0019](../adr/0019-context-md-describes-current-state.md)). If the PR adds or changes a Prisma field, domain invariant, port, use-case, event, route, or app/package structure, the owning `CONTEXT.md` must describe it in that PR. There is no sprint-final exception. The full hierarchy and mutability rules live in [ADR-0020](../adr/0020-document-hierarchy-and-mutability.md).
4. For mobile / Expo issues, the check gate in `docs/agents/mobile-expo.md` passes, including Expo dependency check and runtime/simulator verification when the issue is a runtime crash
```

## Labels applied at creation

`create-sprint-issues` applies these labels when generating sprint child issues:

- **Triage**: `ready-for-agent` for settled autonomous work; `ready-for-human` when credentials, hardware, console access, or unresolved judgment require a person. Add `blocked` when `## Depends on` lists an open issue. Executors filter `-label:blocked`.
- **Phase**: `phase-1` | `phase-2` | `phase-3` (from the sprint's row in `docs/prd/03-roadmap.md`).
- **Area**: one of `api`, `admin`, `web`, `mobile`, `sms-gateway`, `worker`, `db`, `contracts`, `ui`, `infra`, `docs`. Multi-area allowed when a slice spans (e.g., `api` + `mobile`).
- **Type**: `feature` (default), `task` (scaffolding/plumbing), `security`, `perf`.

Parent PRD issues get `phase-N` + `feature` only — no triage label, since they're not picked up by agents.

## Acceptance criteria — source of truth

- **Sprint-wide DoD** lives in `docs/prd/sprints/sprint-NN-*.md`. It is mutable only until the sprint starts; the plan locks when its roadmap row becomes `🟡`.
- **Slice-specific AC** lives in the child issue body. Once a `/run-issue` agent picks it up, the body is effectively immutable for that run.
- The two never overlap semantically: sprint DoD describes the sprint demo; slice AC describes one vertical PR.
- For decision-heavy sprints, prefer a `Recommended child issue map` in the sprint file over copying every sprint decision into every issue body. Child issues should reference the sprint file and local `CONTEXT.md`, then restate only the acceptance criteria needed for that slice.
- If a child issue would need more than one unrelated bounded context behavior to pass, split it. If splitting would make one behavior land without its enforcement/tests, keep it together as one vertical slice.

## Dependency tracking (`Depends on`)

Each child issue body has a `## Depends on` section listing zero or more issue numbers (or "None").

- At creation: if any blocker is open, the issue is labelled `blocked`.
- After a blocker merges, `/run-issue` or the Sandcastle merger removes `blocked` only after re-reading every dependency and confirming none remain open.
- A human may repair bookkeeping manually with `gh issue edit <n> --remove-label "blocked"` after the same check.
- The executable queue is `gh issue list --label "ready-for-agent" --search "-label:blocked"`.

## `/run-issue` integration

`/run-issue <N>` is the Claude Code skill that drives one issue end-to-end. Per invocation it:

1. Reads the issue body via `gh issue view <N> --json body,title,labels`
2. Reads CLAUDE.md house rules + the issue's referenced docs (`## Read first` section)
3. Creates an `agent/issue-<N>` branch off main
4. Implements, tests, and runs the verification gate (typecheck, tests, Expo gate for mobile)
5. Opens a PR with title mirroring the issue + body starting `Closes #<N>` so the issue auto-closes on merge
6. Waits for required checks and squash-merges the PR; it never self-approves
7. Syncs `main` locally
8. Strips the `blocked` label from any open issue whose `## Depends on` section now has zero open blockers

Branch convention: `agent/issue-<N>`. The user picks the issue; `/run-issue` does the rest.

`/run-issue` is the synchronous Claude Code path. Sandcastle is the separate Docker AFK path described in [`sandcastle.md`](sandcastle.md) and ADR-0028; it does not consume the repository skill files. No `.github/workflows/unblock.yml` exists, so each successful merger owns dependent unblocking.

## Body template (general / non-sprint issues)

For bugs, ad-hoc tasks, or anything outside a sprint, use this simpler shape:

```markdown
## Summary
<one or two sentences — what + why>

## Context
<what we know, what we don't know, links to ADRs / PRD>

## Acceptance criteria
- [ ] ...
- [ ] ...

## Out of scope
- ...

## Notes for the implementer
- ...
```

## Labels used

See `triage-labels.md` for the canonical five-role vocabulary plus per-area labels (`api`, `mobile`, `web`, `admin`, `sms-gateway`, `infra`), plus the `blocked` modifier.
