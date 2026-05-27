# Issue tracker — GitHub Issues

This repo tracks all issues in **GitHub Issues**, using the `gh` CLI.

Skills that read this file: `to-issues`, `triage`, `to-prd`, `qa`, `request-refactor-plan`.

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
| **Sprint child** | One per vertical slice within a sprint. Read verbatim by the `/run-issue` skill as an AFK agent prompt. | Self-contained prompt seed (see below). |

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

## How AFK agents pick this up

AFK execution is launched manually via the `/run-issue <N>` skill (Claude Code). The user picks an issue from the unblocked queue:
\`gh issue list --label "ready-for-agent" --search "-label:blocked" --json number,title,labels\`
and invokes `/run-issue <N>`. The skill reads the issue body verbatim as its prompt and runs the full branch → implement → test → PR → merge → sync main → unblock-dependents flow.
```

## Sprint child body template (`/run-issue` prompt seed)

The body is read **verbatim** as the prompt by `/run-issue`, so it must be self-contained. Reference repo files by path; the agent reads them inside the working tree.

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

Emit `<promise>COMPLETE</promise>` once:
1. `pnpm typecheck` passes for every workspace touched
2. `pnpm test` passes for every workspace touched
3. The relevant `CONTEXT.md` reflects the new state — **updated in the same PR as the code change** (per [ADR-0019](../adr/0019-context-md-describes-current-state.md)). CONTEXT.md describes current implementation, never aspirational state. If your PR added a Prisma field, port method, use-case, event, or HTTP route, the relevant CONTEXT.md must mention it in the same PR (unless the sprint plan explicitly defers the CONTEXT.md update to a sprint-final wiring issue). The full doc hierarchy + mutability rules (PRD features / sprint files / retros / ADRs / CONTEXT.md) live in [ADR-0020](../adr/0020-document-hierarchy-and-mutability.md).
4. For mobile / Expo issues, the check gate in `docs/agents/mobile-expo.md` passes, including Expo dependency check and runtime/simulator verification when the issue is a runtime crash
```

## Labels applied at creation

`to-issues` applies these labels when generating sprint child issues:

- **Triage**: `ready-for-agent` (always, for child issues). Add `blocked` in addition when `## Depends on` lists open issues. The orchestrator filters `-label:blocked`.
- **Phase**: `phase-1` | `phase-2` | `phase-3` (from the sprint's row in `docs/prd/03-roadmap.md`).
- **Area**: one of `api`, `admin`, `web`, `mobile`, `sms-gateway`, `worker`, `db`, `contracts`, `ui`, `infra`, `docs`. Multi-area allowed when a slice spans (e.g., `api` + `mobile`).
- **Type**: `feature` (default), `task` (scaffolding/plumbing), `security`, `perf`.

Parent PRD issues get `phase-N` + `feature` only — no triage label, since they're not picked up by agents.

## Acceptance criteria — source of truth

- **Sprint-wide DoD** lives in `docs/prd/sprints/sprint-NN-*.md`. It's mutable; updated as understanding sharpens.
- **Slice-specific AC** lives in the child issue body. Once a `/run-issue` agent picks it up, the body is effectively immutable for that run.
- The two never overlap semantically: sprint DoD describes the sprint demo; slice AC describes one vertical PR.
- For decision-heavy sprints, prefer a `Recommended child issue map` in the sprint file over copying every sprint decision into every issue body. Child issues should reference the sprint file and local `CONTEXT.md`, then restate only the acceptance criteria needed for that slice.
- If a child issue would need more than one unrelated bounded context behavior to pass, split it. If splitting would make one behavior land without its enforcement/tests, keep it together as one vertical slice.

## Dependency tracking (`Depends on`)

Each child issue body has a `## Depends on` section listing zero or more issue numbers (or "None").

- At creation: if any blocker is open, the issue is labelled `blocked`.
- When a blocker closes: a human removes the `blocked` label from dependents with `gh issue edit <n> --remove-label "blocked"`. (An automated `unblock` workflow was discussed during S1 but deferred — manual handling has been fine so far. Revisit if dependency graphs get larger in Phase 2.)
- The orchestrator's AFK query is `gh issue list --label "ready-for-agent" --search "-label:blocked"`.

## `/run-issue` integration

`/run-issue <N>` is the Claude Code skill that drives one issue end-to-end. Per invocation it:

1. Reads the issue body via `gh issue view <N> --json body,title,labels`
2. Reads CLAUDE.md house rules + the issue's referenced docs (`## Read first` section)
3. Creates an `agent/issue-<N>` branch off main
4. Implements, tests, and runs the verification gate (typecheck, tests, Expo gate for mobile)
5. Opens a PR with title mirroring the issue + body starting `Closes #<N>` so the issue auto-closes on merge
6. Self-approves and merges the PR (no branch protection or required reviews in this repo)
7. Syncs `main` locally
8. Strips the `blocked` label from any open issue whose `## Depends on` section now has zero open blockers

Branch convention: `agent/issue-<N>`. The user picks the issue; `/run-issue` does the rest.

Note: there is no separate orchestrator service or scheduled job — `/run-issue` runs synchronously in the user's Claude Code session. No `.github/workflows/unblock.yml` exists; step 8 above is where dependents get unblocked.

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
