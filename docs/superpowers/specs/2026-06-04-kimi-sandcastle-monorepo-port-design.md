# Kimi-Sandcastle Monorepo Port — Design Spec

- **Date**: 2026-06-04
- **Status**: Draft — awaiting user review
- **Author**: brainstorming session (Claude Code)
- **Scope**: Set up the `ai-hero/sandcastle` autonomous multi-agent workflow (Kimi K2 provider) on `auto.tm-rewrite`. **Setting up the workflow only — the first real run is explicitly out of scope** (issue #94 must be sliced first; see §9).

---

## 1. Problem & context

Sandcastle (`@ai-hero/sandcastle`, v0.5.10, Kimi fork on `github:bagtyyarkovusov/sandcastle#feature/kimi-code-provider`) runs an autonomous loop:

```
Planner (reads ready-for-agent issues, builds dep graph)
  → parallel { Implementer (≤100 iters) → Reviewer (1 iter) } per issue, each in its own Docker sandbox + git worktree
  → Merger (merges branches, closes issues)
  → repeat up to MAX_ITERATIONS
```

It is proven on `sandcastle-test` — but that is a **single-package T3 app: npm + SQLite + one Next.js process**. `auto.tm-rewrite` breaks every one of those assumptions:

| sandcastle-test | auto.tm-rewrite | Consequence |
|---|---|---|
| `copyToWorktree: ["node_modules"]` | pnpm + `shamefully-hoist=true` + workspace symlinks into `.pnpm` | naive node_modules copy is fragile (§6) |
| SQLite file in repo | Postgres + Redis; tests use **Testcontainers** (no mocks, per CLAUDE.md) | full `pnpm test` needs a Docker daemon (§7) |
| one web app builds headless | Expo mobile app needs simulators | mobile cannot build/verify in a headless sandbox (§8) |
| external calls fine | air-gapped product | dev-loop calls are fine on the Mac, but agents must not add outside-TM calls to API/worker (§10) |

This repo already has the conventions sandcastle needs: a `ready-for-agent` label + `blocked` modifier + `## Depends on` dependency graph, and a **self-hosted `tm-proxy` CI runner that already runs the full `pnpm test` (Testcontainers included) on every PR and every push to main**. The manual `/run-issue` skill is synchronous/single-issue; `docs/agents/issue-tracker.md` notes a parallel orchestrator was "discussed but deferred." **Kimi-sandcastle is that orchestrator.**

## 2. Goals / Non-goals

**Goals**
- A `.sandcastle/` setup that runs the plan→implement→review→merge loop on this monorepo with Kimi K2.
- Sandboxes that acquire dependencies **reliably and offline** (no flaky network installs).
- A verification gate that works "with no issues" — no Docker-in-Docker, no socket mounting.
- Mobile-aware: agents do what is verifiable headlessly; the human owns the Expo gate.
- Reuses this repo's existing issue/label/dependency conventions — no parallel system.
- Respects the repo's governance (CLAUDE.md, ADR-0019/0020, bounded contexts).

**Non-goals (explicit)**
- **Running the first cycle.** Deferred until #94 is sliced into vertical issues (§9). This spec sets up the machinery only.
- **Testcontainers/e2e inside sandboxes.** That gate stays on CI/PR (§7).
- **Building or running the Expo app in-sandbox** (§8).
- **Replacing CI or the manual `/run-issue` flow.** Sandcastle augments them.
- Publishing/releasing the sandcastle fork. We consume the branch dependency.

## 3. Decisions locked (this session)

- **D1 — In-sandbox gate = typecheck + lint + Docker-free unit tests; Testcontainers e2e stays on CI/PR.** Rationale: the hexagonal architecture already isolates business logic behind fake ports (no DB), the heavy suite already runs correctly on the Docker-capable `tm-proxy` runner, and keeping sandboxes hermetic avoids the parallelism/security/networking failure surface. (Full reasoning in the session transcript.)
- **D2 — Mobile build & runtime verification deferred to the host.** Agents run `typecheck + vitest + lint` for mobile; the human runs the Expo dependency check / iOS export / Expo Go simulator gate.
- **D3 — Dependency strategy = warm pnpm store baked into the image + `pnpm install --offline --frozen-lockfile` per worktree.** Do **not** `copyToWorktree: ["node_modules"]` (§6).
- **D4 — Air-gap: dev-host workflow.** The sandbox itself needs no network for deps (offline store); it needs Kimi API + GitHub + Context7 (all outside-TM, acceptable on the dev Mac). Agents are forbidden from introducing outside-TM calls into API/worker code.
- **D5 — Kimi provider via the fork** (`feature/kimi-code-provider`), planner with `thinking: false`.
- **D6 — First run is gated on slicing #94** (§9). Setup lands without triggering a cycle.

## 4. How it fits the existing workflow

- **Label filter**: the planner selects `gh issue list --state open --label "ready-for-agent" --search "-label:blocked"` (NOT `Sandcastle`). Parent PRD issues are excluded (they're dashboards).
- **Dependency graph**: derived from each child issue's `## Depends on` section + file-overlap heuristics, matching `triage-labels.md`.
- **Branch convention**: `sandcastle/issue-<N>-<slug>` — distinct from manual `/run-issue`'s `agent/issue-<N>`, so autonomous branches are visibly separate.
- **Completion**: child-issue bodies already define the gate (typecheck + test + CONTEXT.md). The sandcastle implement-prompt clarifies the *in-sandbox* gate per D1 (see §7) and notes e2e runs at CI.
- **Relationship to `/run-issue`**: `/run-issue` stays the synchronous, human-in-the-loop path; sandcastle is the AFK parallel path. Both consume the same `ready-for-agent` queue.

## 5. Architecture — the `.sandcastle/` directory

```
.sandcastle/
├── Dockerfile             node:22-bookworm + corepack pnpm@9.12 + gh + jq + Kimi CLI + warm pnpm store + GID-20 fix
├── main.ts                the loop (kimi planner/implementer/reviewer/merger), mobile-aware, install hook
├── plan-prompt.md         filters ready-for-agent -blocked; excludes parent PRD; builds dep graph; sandcastle/ branches
├── implement-prompt.md    pnpm-aware TDD; the D1 in-sandbox gate; Context7; air-gap rules
├── review-prompt.md       reviews against CLAUDE.md + CONTEXT.md + the slice's AC
├── merge-prompt.md        merges branches; updates CONTEXT.md per ADR-0019; closes issues
├── CODING_STANDARDS.md    this repo's hard rules (bounded contexts, ports, no Prisma in domain, CONTEXT-per-PR, air-gap, Context7)
├── .env.example           KIMI_API_KEY, GH_TOKEN, CONTEXT7_API_KEY (+ committed); .env is gitignored
└── .gitignore             .env, logs/, worktrees/
```

Plus two `package.json` script additions:
- `"sandcastle": "tsx .sandcastle/main.ts"` (root)
- `"test:unit"` per workspace (or a root turbo task) — vitest excluding `**/*.e2e.spec.ts` (§7).

### 5.1 Dockerfile (spec, not final code)

Base `node:22-bookworm`. Layers:
1. apt: `git curl jq` (drop the Playwright system libs — no browser tests run in-sandbox).
2. Install `gh` (GitHub CLI) — same keyring recipe as sandcastle-test.
3. `ARG AGENT_UID/AGENT_GID` + the **GID-20 conflict block** (macOS `staff`=20 collides with Debian `dialout`; `groupdel -f` the conflicting group, then `groupmod`/`usermod`). Copy verbatim from the working sandcastle-test Dockerfile.
4. `USER` agent; enable corepack and pin pnpm: `corepack enable && corepack prepare pnpm@9.12.0 --activate`.
5. Install Kimi Code CLI (`curl -LsSf https://code.kimi.com/install.sh | bash`) + `~/.kimi/config.toml` (default_model `kimi-k2.6`, base_url `https://api.kimi.com/coding/v1`, max_context 262144) + `~/.kimi/mcp.json` (Context7).
6. **Warm pnpm store**: `COPY` the repo's `pnpm-lock.yaml` + `package.json` + workspace manifests, then `pnpm install --frozen-lockfile` (or `pnpm fetch`) so the content-addressed store is fully populated in the image layer. This is what makes per-worktree installs offline + fast.
7. `ENTRYPOINT ["sleep","infinity"]` (sandcastle drives commands into the running container).

### 5.2 main.ts (spec)

Same four-phase shape as the sandcastle-test template, with:
- `agent: kimiCode("kimi-k2.6", { thinking: false })` on the **planner** (faster/cheaper; avoids the observed planner shell-loop); default thinking on implementer/reviewer/merger.
- `MAX_ITERATIONS` configurable (start low for smoke tests).
- **No `copyToWorktree: ["node_modules"]`.** Instead a `hooks.afterWorktreeCreate` (or equivalent) runs `pnpm install --offline --frozen-lockfile` then `pnpm --filter @auto-tm/db generate`. The 60s hook-timeout risk is mitigated by the warm store (offline link is fast); if it still exceeds, raise the hook timeout or pre-copy the store dir into the worktree. **This is the #1 thing the smoke test (§12) validates.**
- Optional (future): the single Merger phase can run the full `pnpm test` with Docker if you ever want a pre-merge e2e gate — the merger is one serial sandbox, so it's the only low-risk place to consider a socket mount. Not in v1.

### 5.3 Prompts & CODING_STANDARDS

- **implement-prompt.md**: adapt sandcastle-test's TDD prompt to (a) read the issue body verbatim (it already carries `## Read first`, AC, `## Depends on`), (b) use `pnpm --filter <workspace>` commands, (c) run the **D1 in-sandbox gate** (§7), (d) require Context7 lookups for any library (per ADR-0017), (e) honor the air-gap rule, (f) update the relevant CONTEXT.md in the same change (ADR-0019).
- **CODING_STANDARDS.md**: distilled from CLAUDE.md + AGENTS.md — bounded contexts never import across each other (use ports/event bus), domain layer is framework-free, Prisma only in `infrastructure/`, one use-case per file, migrations not `db push`, no plaintext refresh tokens, NativeWind/RNR rules for mobile, `shamefully-hoist` must not be removed.
- **merge-prompt.md**: merge `sandcastle/issue-*` branches, resolve conflicts, ensure CONTEXT.md reflects shipped state, close child issues; do **not** close the parent PRD (that's the sprint-final wiring issue's job).

## 6. Dependency strategy (detail)

`copyToWorktree: ["node_modules"]` is rejected because pnpm's `node_modules` is a symlink farm into `.pnpm` plus workspace-package symlinks; copying across a git worktree risks broken/absolute symlink targets and a subtly wrong tree (silent module-resolution failures, which are the worst kind in Metro/Node). Instead:

- **Bake** a fully-populated content-addressed store into the image (§5.1 step 6).
- **Per worktree**: `pnpm install --offline --frozen-lockfile` re-creates the correct symlink farm against the warm store — no network, fast, and *correct for pnpm* rather than copied-and-hopeful.
- **Then** `pnpm --filter @auto-tm/db generate` (Prisma client) and ensure `@auto-tm/db` + `@auto-tm/contracts` are built (runtime consumers need `dist/`, per ADR-0016) — the implement-prompt's `predev` already chains the contracts/db build for the API.
- **Fallback** if offline install exceeds the hook budget: copy the store directory (not the symlink farm) into the worktree and install offline against it, or raise the sandcastle hook timeout.

## 7. Verification gate (Option 1, detail)

| Layer | Needs Docker? | Where it runs |
|---|---|---|
| `pnpm typecheck` (all touched workspaces) | No | **in-sandbox** |
| `pnpm lint` | No | **in-sandbox** |
| API domain/application unit specs (fake ports) | No | **in-sandbox** (via `test:unit`) |
| mobile/contracts vitest | No | **in-sandbox** |
| API `*.e2e.spec.ts` (Prisma repos + controllers, Testcontainers) | **Yes** | **CI/PR on `tm-proxy`** |
| `packages/db` Testcontainers tests | **Yes** | **CI/PR on `tm-proxy`** |

- Add a `test:unit` script: `vitest run --exclude '**/*.e2e.spec.ts' --passWithNoTests` (API). Contracts/mobile already have no Testcontainers, so their `test` == unit.
- The implement-prompt's in-sandbox gate = `pnpm typecheck` + `pnpm --filter <touched> test:unit` + `pnpm --filter <touched> lint`. It states explicitly that the Testcontainers e2e suite runs at the GitHub boundary.
- **Accepted weakness**: API/Prisma code can pass the in-sandbox gate but fail the real e2e, surfacing only at CI after merge. Mitigations: strong fake-port TDD in the prompt; optional merger e2e (future); and #94 (the first intended workload) is mobile with zero Testcontainers exposure.

## 8. Mobile handling

- Agents **can**: write components/screens/hooks, pass `pnpm --filter @auto-tm/mobile typecheck`, run mobile vitest, lint.
- Agents **cannot** (headless): `expo install --check` device behavior, iOS export, Expo Go runtime/simulator verification, visual checks.
- Therefore the CLAUDE.md "mobile gate" splits: the **headless half** runs in-sandbox; the **simulator half stays with the human** after merge. The merger/issue notes flag mobile branches as "needs human Expo gate."
- #94 implication: a sliced #94 agent can build the read-surface components + pass typecheck/unit, but you run the Expo Go pass before trusting the screens.

## 9. Issue prerequisites — #94 must be sliced first

The planner needs **small, independent, `ready-for-agent` slices**. #94 ("mobile — feed + full detail + My Listings/Drafts") is one large issue covering a feed screen, a detail page, My Listings, a Drafts list, a component library, owner-actions, and read hooks. Hand that to one agent and it will sprawl.

**Before any run**, break #94 into vertical slices (candidate cut):
1. Read hooks + query-key factory (`useListings`, `useListing`, `useMyListings`, `useExchangeRates`).
2. `ListingCard` + the public chronological **feed** screen.
3. Full **listing detail** page (PhotoGallery, asymmetric PriceDisplay, SellerBlock, ContactCtaBar).
4. **My Listings** tab + owner-actions (mark sold/archive/republish/delete).
5. **Drafts list** + resume-the-wizard.

Use `/create-sprint-issues-kimi` or `/to-issues` to produce these as `ready-for-agent`, `mobile`, `phase-1` children with a `## Depends on` graph (2–5 depend on 1). Only then is sandcastle worth triggering. **This spec does not perform the slicing or the run.**

## 10. Security & air-gap

- Sandboxes are **unprivileged**; no `/var/run/docker.sock` mount, no DinD → no host-root escalation path for autonomous agents.
- Secrets via `.sandcastle/.env` (gitignored): `KIMI_API_KEY`, `GH_TOKEN`, `CONTEXT7_API_KEY`. `.env.example` is committed.
- Air-gap: deps install offline from the baked store (no network needed for build inside the sandbox). The dev-loop's outbound calls (Kimi/GitHub/Context7) happen from the dev Mac, not the air-gapped prod env. CODING_STANDARDS forbids agents adding outside-TM calls to API/worker code (CLAUDE.md "Never do").

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Per-worktree pnpm install exceeds 60s hook timeout | warm store + `--offline`; raise hook timeout; fallback store-copy (§6) |
| Planner shell-loop (observed in sandcastle-test logs) | `thinking:false` + plan-prompt rule "do not re-run discovery commands" + `maxIterations:1` |
| e2e regression caught only at CI | fake-port TDD in prompt; optional merger e2e; #94 is mobile (no exposure) |
| Parallel agents touching overlapping files | planner's file-overlap dependency heuristic; small slices |
| macOS GID-20 Docker build failure | the `groupdel -f` block (proven in sandcastle-test) |
| Kimi token cost | low MAX_ITERATIONS for smoke tests; planner `thinking:false` |
| Workspace `dist/` missing for runtime packages | install hook runs `db generate` + builds `@auto-tm/db`/`@auto-tm/contracts` (ADR-0016) |

## 12. Validating the port (smoke test — NOT #94)

Prove the machinery without #94:
1. `pnpm --filter ... ` build the fork dep; `npx sandcastle docker build-image` → must succeed on macOS GID-20; verify image user `501:20`.
2. Spin one sandbox manually; confirm `pnpm install --offline --frozen-lockfile` + `db generate` + `pnpm typecheck` succeed **inside** the sandbox within the hook budget.
3. Create ONE throwaway `ready-for-agent` issue (e.g., a trivial docs/typecheck-only task), set `MAX_ITERATIONS=1`, run `pnpm sandcastle`; confirm planner emits `<plan>`, an implementer runs Kimi, commits, reviewer runs, merger merges + closes the throwaway issue.
4. Confirm no root-owned files in the worktree after cleanup.

## 13. Build sequence (becomes the implementation plan)

1. Add the sandcastle fork devDependency + `sandcastle` script + `test:unit` script(s).
2. Scaffold `.sandcastle/` (Dockerfile, main.ts, prompts, CODING_STANDARDS, .env.example, .gitignore).
3. Implement the Dockerfile (GID fix + corepack pnpm + Kimi + warm store).
4. Implement the install hook + dependency strategy (§6); validate the 60s budget.
5. Write CODING_STANDARDS.md + the four prompts (pnpm-aware, D1 gate, air-gap, Context7).
6. Run the §12 smoke test; iterate on the dependency hook until green.
7. **Stop.** (Slicing #94 + the first real run are separate, later, human-initiated steps.)

## 14. Documentation follow-ups

- A short **ADR** capturing "kimi-sandcastle as the AFK parallel orchestrator + the in-sandbox gate (D1) + mobile deferral (D2)" — this is a workflow/architecture decision the repo's culture ADRs (per ADR-0020).
- A `docs/agents/sandcastle.md` operating guide (matching the `docs/agents/*` pattern: issue-tracker.md, mobile-expo.md) — how to build the image, set `.env`, trigger a run, read logs.
- Cross-reference from CLAUDE.md "Agent skills" once it exists.

## 15. Open questions

- Branch prefix: `sandcastle/` vs aligning with `agent/` — recommend `sandcastle/` to distinguish autonomous runs.
- Should the merger run a pre-merge e2e gate (the one low-risk Docker spot), or rely purely on CI? (v1: rely on CI.)
- Exact `ready-for-agent` scoping for the planner — all open `ready-for-agent -blocked`, or filter to the current sprint? (Recommend: current-sprint scope to avoid the planner pulling unrelated work.)
- Where the sliced #94 issues come from: `/create-sprint-issues-kimi` vs `/to-issues` (separate session).
