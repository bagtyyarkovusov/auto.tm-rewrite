# Claude / Cursor — agent policy for auto.tm-rewrite

This file is read at the start of every AI-assisted coding session in this repo.

## Read first, every session

1. **`GRILL-OUTCOME.md`** — the design charter. Locked decisions. The spec.
2. **`docs/prd/03-roadmap.md`** — the trajectory. Tells you which sprint is current and what shipped before it. Points to the per-sprint file under `docs/prd/sprints/`.
3. **`CONTEXT-MAP.md`** — index of every `CONTEXT.md` in the tree.
4. **The `CONTEXT.md` for the workspace you're working in** (e.g., `apps/api/src/modules/conversations/CONTEXT.md`).
5. Relevant **ADRs** in `docs/adr/` for the decisions that affect this work. **Always include [ADR-0019](docs/adr/0019-context-md-describes-current-state.md) (CONTEXT.md = current state) and [ADR-0020](docs/adr/0020-document-hierarchy-and-mutability.md) (doc hierarchy + mutability rules) — these govern every artifact in the repo.**
6. **The current sprint file** (`docs/prd/sprints/sprint-NN-<name>.md`) for the DoD, file list, tests required, and open risks of the work you're doing.

## Architecture in one paragraph

Monorepo (Turborepo + pnpm) with 7 apps and 5 packages. API is NestJS + Prisma + Postgres + Socket.IO. Two Next.js apps (public + admin) plus an Expo mobile app. Custom Kotlin Android SMS gateway for OTP. **Level 2 bounded-contexts architecture** in `apps/api/src/modules/<context>/`: each context has `domain/` (pure TS, no Prisma), `application/` (one use-case per file), `infrastructure/` (Prisma repositories, FCM clients, mappers), and `presentation/` (HTTP controllers + WS gateways). **Cross-context calls go through injected ports OR the in-process event bus — never direct imports.** Self-hosted inside Turkmenistan (air-gapped), deployments via Docker image tarballs.

## Always do

- **Read the local `CONTEXT.md` before editing anything in a bounded context.** It tells you what invariants the context maintains and which ports exist.
- **Domain layer is framework-free.** No `@Injectable()`, no Prisma, no Nest. Pure TypeScript business rules.
- **Prisma models live ONLY in `infrastructure/`.** Repositories map Prisma rows → domain entities at the boundary.
- **Write tests in `application/` and `domain/`** — use-case-level tests beat HTTP-level tests for business logic.
- **One use-case per file.** `application/SendMessage.ts` is one class, one method, one job. ~100 lines max.
- **Every schema change is a Prisma migration committed to git.** No `db push` against any environment except localhost.
- **Capture every architecture decision as a new ADR** in `docs/adr/`. Numbered. Dated. Never edited after merge.
- **Update the CONTEXT.md when domain invariants change.** That file should always reflect today, not last quarter.
- **All times UTC in DB.** Convert at the display layer.
- **Run `pnpm test` and `pnpm typecheck` before committing.**
- **`.npmrc` has `shamefully-hoist=true`** — pnpm must flatten `node_modules` for React Native / Expo / Metro compatibility. Never remove this setting without testing Expo bundling end-to-end.
- **Use Context7 MCP for every library doc lookup.** Before writing or debugging code that touches an external library, framework, SDK, API, CLI, or cloud service, resolve and query it via Context7 (`resolve-library-id` → `query-docs`). This applies even when you "know" the answer — your training data lags. The canonical workflow, the pinned library-ID table for this stack, and recipes for the most-touched libraries live in [`docs/agents/documentation-lookups.md`](docs/agents/documentation-lookups.md). Locked in [ADR-0017](docs/adr/0017-context7-as-canonical-doc-source.md). The Expo SDK 55 rule below is a subset of this rule.
- **Use Context7 for Expo SDK 55 docs.** Always resolve and query `expo-router`, `expo`, `@expo/cli`, and other Expo SDK packages via Context7 MCP before writing code or debugging.
- **For mobile / Expo work, read `docs/agents/mobile-expo.md` first.** Run Expo's dependency check before changing packages, Metro config, Codegen, or native-module resolution.
- **For any mobile UI / styling work, read `docs/agents/nativewind-v4.md` end to end.** That guide is the single source of truth for the NativeWind v4 + React Native Reusables (RNR) workflow on `apps/mobile`: theme tokens, dark-mode rules, RNR setup recipe, component catalogue, customization patterns, and the pre-styling research checklist. Never use `StyleSheet.create` for new code, never hand-roll a button/input/dialog (use RNR), never import `@auto-tm/ui/components/*` in mobile (that package is web-only).
- **For any mobile data-fetching / API-call work, read `docs/agents/mobile-data-fetching.md` end to end.** That guide is the single source of truth for the TanStack Query v5 + custom `apiClient` wrapper pattern on `apps/mobile` (locked in [ADR-0015](docs/adr/0015-mobile-data-fetching.md)). Never call `fetch` directly outside `apps/mobile/src/api/client.ts`, never inline query keys (use the factory), never re-implement 401-refresh in a hook (the wrapper owns it), never skip the `@auto-tm/contracts` Zod schema at the response boundary.
- **For any mobile screen, navigation, IA, or findability work, read [`docs/prd/ui/kolesa-findability-reference.md`](docs/prd/ui/kolesa-findability-reference.md) first.** Kolesa.kz is AutoTM's **UX / information-architecture / findability** reference — its category/taxonomy, search→filter funnel, content hierarchy, and section placement — **not** its visual design (keep AutoTM's own Uber-style tokens; never mirror Kolesa's look). Everything is bounded by the locked 5-tab IA, the [00-vision anti-goals](docs/prd/00-vision.md#anti-goals-things-we-explicitly-will-not-build), and MLP scope. The doc carries the full keep/defer map. Locked in [ADR-0034](docs/adr/0034-kolesa-ux-findability-reference.md).
- **When working with Expo Router typed routes**, check `experiments.typedRoutes` in `app.json` and the `EXPO_USE_TYPED_ROUTES` env var. Route file changes must be followed by mobile typecheck because `.expo/types/router.d.ts` is generated from the file tree.
- **For any TypeScript module-resolution, package `exports`, `.js`/extensionless import, or runtime-shared workspace package issue, read `docs/agents/typescript-runtime.md` first.** `@auto-tm/db` and `@auto-tm/contracts` are built packages for runtime consumers; do not point their exports back at raw `src/*.ts`.

## Known issues and workarounds

### Expo SDK 55 package alignment

Expo Go contains native code for specific SDK-compatible versions. Treat Expo CLI compatibility warnings as runtime risks, not just package-manager noise. The iOS simulator previously hit:

- `Invariant Violation: View config not found for component 'RNSSafeAreaView'` after redirecting `react-native-screens` away from Fabric sources.
- `Unsupported top level event type "topSvgLayout"` with an old `react-native-svg`.
- Missing `expo-router/internal/*` modules with `expo-router@6.0.23`.

The fix is SDK alignment, not local package patching: `expo install --fix` aligned the mobile app to the SDK 55 expected package set (`expo-router@55.0.14`, `react-native@0.83.6`, `react-native-svg@15.15.3`, etc.). After changing Expo/RN package versions, run `pnpm install --force` from the repo root so pnpm relinks stale workspace symlinks.

Reanimated 4 is a Worklets-backed native runtime dependency. Keep `react-native-reanimated` and `react-native-worklets` installed explicitly through Expo in `apps/mobile`; RNR components that import animation builders like `FadeIn` can otherwise compile but crash in Expo Go at module import time with vague `Exception in HostFunction` errors.

Required first check for SDK/package issues:

```bash
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

If it fails, align with Expo instead of hand-pinning:

```bash
CI=1 pnpm --filter @auto-tm/mobile exec expo install --fix
pnpm install --force
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

### pnpm shamefully-hoist for React Native

pnpm's strict isolation prevents Metro from resolving transitive dependencies of `react-native`, `expo`, and related packages. `.npmrc` sets `shamefully-hoist=true` to flatten `node_modules`. Without this, you'll see `Unable to resolve module` errors for packages like `whatwg-fetch`, `invariant`, `react-native-css-interop`, etc.

### TypeScript package runtime boundaries

Node runtime packages and bundler-only packages use different rules. API/worker must consume built `@auto-tm/db` and `@auto-tm/contracts` output from `dist/`; mobile also consumes built `@auto-tm/contracts`; `packages/ui` can remain source-exported because it is consumed by web/mobile bundlers. Before changing package exports or relative import extensions, read `docs/agents/typescript-runtime.md` and run `pnpm check:runtime-imports` after building runtime-shared packages.

### react-native-screens Fabric imports

Do not redirect `react-native-screens` to `lib/commonjs/`. Metro resolves the package's React Native/Fabric sources, and redirecting to commonjs bypasses Fabric view-config registration, which caused `RNSSafeAreaView` runtime crashes in Expo Go.

Earlier debugging tried patching Codegen and patching `react-native-screens`; those are not needed with the SDK-aligned `react-native@0.83.6` / `@react-native/codegen@0.83.6` set. If this class of error returns, first rerun Expo's dependency check before introducing local `node_modules` patches.

## Never do

- **NEVER import across contexts directly.** `identity/` cannot `import` from `conversations/domain/`. Add a port instead.
- **NEVER mock Prisma in tests.** Use Testcontainers for real Postgres + Redis.
- **NEVER use `db push` outside localhost dev.** Migrations only.
- **NEVER inline magic strings for tokens, roles, or status enums.** They live in `domain/types.ts` per context.
- **NEVER ship code that calls an outside-of-TM service from the API or worker.** Air-gap. Use the TM Proxy PC for VPN-bridged external calls if absolutely needed.
- **NEVER store plaintext refresh tokens.** Bcrypt-hash them in `User.refreshTokenHash` (your current pattern, kept).
- **NEVER commit `.env` files. Only `.env.template` is committed.**
- **NEVER bypass the 60s video / 5 MB image client-side compression** — TM mobile data is metered.
- **NEVER duplicate agent skills across layers.** The nine workflow skills live exactly once, at `.claude/skills/<name>/SKILL.md` ([ADR-0040](docs/adr/0040-repo-canonical-workflow-skills.md)); generic skills are user-global and are never committed. No `.claude/commands/` files, no `.agents/skills/` mirrors, no global `*-kimi` variants.

## Documentation systems (don't mix)

> **The full doc hierarchy + mutability rules are locked in [ADR-0020](docs/adr/0020-document-hierarchy-and-mutability.md).** Read it before adding a new PRD, revising a sprint file mid-flight, or editing any merged ADR. The table below is a quick reference; ADR-0020 is the source of truth + has the workflow for adding new PRDs and the rules for when a PRD revision requires its own ADR.

| System | Where | Mutable? | When to write |
|---|---|---|---|
| ADRs | `docs/adr/`, `apps/*/docs/adr/` | **No** (immutable after merge — supersede with new ADRs) | Every architectural decision; every material PRD-feature revision (per ADR-0020) |
| `CONTEXT.md` | Per app + per bounded context | Yes — per PR | **Current state only** (not aspirational) — updated in the same PR that changes domain invariants. Locked in [ADR-0019](docs/adr/0019-context-md-describes-current-state.md). |
| PRD vision/scope | `docs/prd/00-...02-...md` | Rarely | Charter-level changes |
| **PRD roadmap** | **`docs/prd/03-roadmap.md`** | **Per sprint** | **Start of sprint (set 🟡) and end of sprint (set 🟢 + bump Current)** |
| **Sprint plans** | **`docs/prd/sprints/sprint-NN-*.md`** | **Mutable until sprint starts; locked when roadmap → 🟡** (per ADR-0020) | Edit freely before 🟡; after, scope changes go in the retro doc |
| PRD features / flows | `docs/prd/features/`, `docs/prd/flows/` | Yes — but material capability changes require a new ADR (per ADR-0020) | Target capability spec; never aspirational content for code |
| Sprint retros | `docs/prd/sprints/sprint-NN-*-retro.md` | **Append-only** | End of each sprint or when post-🟡 scope shifts |
| Agent skill config | `docs/agents/` | Rarely | Only when changing issue tracker or label vocabulary |

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Autonomous execution

Two paths consume the `ready-for-agent` queue: `/run-issue` (synchronous, single-issue, in your session) and **Kimi-Sandcastle** (AFK, parallel, in Docker sandboxes). See `docs/agents/sandcastle.md` + [ADR-0028](docs/adr/0028-kimi-sandcastle-afk-orchestrator.md). In-sandbox gate = typecheck + lint + Docker-free unit tests; the Testcontainers e2e suite stays on CI; the mobile Expo simulator gate stays with the human.

### Triage labels

Canonical five-role vocabulary, default names. See `docs/agents/triage-labels.md`.

### Domain docs

**Multi-context** — `CONTEXT-MAP.md` at root, per-app `CONTEXT.md`, per-bounded-context `CONTEXT.md` under `apps/api/src/modules/`. See `docs/agents/domain.md`.

## Verification before completion

Before claiming a feature done:

1. `pnpm typecheck` passes for every workspace touched
2. `pnpm test` passes (unit + integration; e2e for full flows)
3. The relevant `CONTEXT.md` reflects the new state — **updated in the same PR as the code change**. CONTEXT.md describes current implementation, never aspirational state (per [ADR-0019](docs/adr/0019-context-md-describes-current-state.md)). If your PR added a Prisma field, port method, or event, the CONTEXT.md for that bounded context must mention it in the same PR.
4. If an architectural choice was made, an ADR exists
5. The PRD section for this feature is updated with what shipped
6. Manual verification: actually run the dev stack and try the feature in the UI
7. You consulted Context7 for every external library your change touched (or recorded in the PR description why you didn't — e.g., trivial dep bump with no API surface change). See [`docs/agents/documentation-lookups.md`](docs/agents/documentation-lookups.md).

For any mobile / Expo package, Metro, navigation, or runtime-crash change, also run the mobile gate in `docs/agents/mobile-expo.md`. At minimum this means Expo dependency check, mobile typecheck, iOS export, and an Expo Go simulator launch/log check when the bug was runtime-only.

Evidence before assertions. Never claim "fixed" without a passing test or a screenshot of the working flow.
