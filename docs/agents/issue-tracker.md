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
| **Sprint child** | One per vertical slice within a sprint. Read verbatim by `sandcastle` as an AFK agent prompt. | Self-contained prompt seed (see below). |

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

Orchestrator (`.sandcastle/main.ts`) queries:
\`gh issue list --label "ready-for-agent" --search "-label:blocked" --json number,title,labels\`
and picks the first match. Each pick feeds the issue body to sandcastle as the prompt.
```

## Sprint child body template (sandcastle prompt seed)

The body is read **verbatim** as the prompt by `sandcastle`, so it must be self-contained. Reference repo files by path; the agent reads them inside the sandbox.

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
3. The relevant `CONTEXT.md` reflects the new state — **updated in the same PR as the code change** (per [ADR-0019](../adr/0019-context-md-describes-current-state.md)). CONTEXT.md describes current implementation, never aspirational state. If your PR added a Prisma field, port method, use-case, event, or HTTP route, the relevant CONTEXT.md must mention it in the same PR (unless the sprint plan explicitly defers the CONTEXT.md update to a sprint-final wiring issue).
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
- **Slice-specific AC** lives in the child issue body. Once a sandcastle agent picks it up, the body is effectively immutable for that run.
- The two never overlap semantically: sprint DoD describes the sprint demo; slice AC describes one vertical PR.

## Dependency tracking (`Depends on`)

Each child issue body has a `## Depends on` section listing zero or more issue numbers (or "None").

- At creation: if any blocker is open, the issue is labelled `blocked`.
- When a blocker closes: a human removes the `blocked` label from dependents with `gh issue edit <n> --remove-label "blocked"`. (An automated `unblock` workflow was discussed during S1 but deferred — manual handling has been fine so far. Revisit if dependency graphs get larger in Phase 2.)
- The orchestrator's AFK query is `gh issue list --label "ready-for-agent" --search "-label:blocked"`.

## Sandcastle integration

`sandcastle` is a prompt runner, not an issue picker. The orchestrator script in `.sandcastle/main.ts` performs, per run:

1. `gh issue view <n> --json body,title,labels` — fetch
2. Build prompt: a small house-rules header + the issue body verbatim
3. `sandcastle.run({ promptFile, branchStrategy: { type: "branch", branch: \`agent/issue-${n}\` } })`
4. On `<promise>COMPLETE</promise>`: `gh pr create --head agent/issue-${n} --title "..." --body "Closes #${n}"`

Branch convention: `agent/issue-<N>`. PR title mirrors issue title. PR body starts with `Closes #<N>` so the issue auto-closes when the PR merges.

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
