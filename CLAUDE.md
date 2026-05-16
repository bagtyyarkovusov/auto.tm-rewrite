# Claude / Cursor — agent policy for auto.tm-rewrite

This file is read at the start of every AI-assisted coding session in this repo.

## Read first, every session

1. **`GRILL-OUTCOME.md`** — the design charter. Locked decisions. The spec.
2. **`docs/prd/03-roadmap.md`** — the trajectory. Tells you which sprint is current and what shipped before it. Points to the per-sprint file under `docs/prd/sprints/`.
3. **`CONTEXT-MAP.md`** — index of every `CONTEXT.md` in the tree.
4. **The `CONTEXT.md` for the workspace you're working in** (e.g., `apps/api/src/modules/conversations/CONTEXT.md`).
5. Relevant **ADRs** in `docs/adr/` for the decisions that affect this work.
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
- **Use Context7 for Expo SDK 55 docs.** Always resolve and query `expo-router`, `expo`, `@expo/cli`, and other Expo SDK packages via Context7 MCP before writing code or debugging.
- **For mobile / Expo work, read `docs/agents/mobile-expo.md` first.** Run Expo's dependency check before changing packages, Metro config, Codegen, or native-module resolution.
- **When working with Expo Router typed routes**, check `experiments.typedRoutes` in `app.json` and the `EXPO_USE_TYPED_ROUTES` env var. Route file changes must be followed by mobile typecheck because `.expo/types/router.d.ts` is generated from the file tree.

## Known issues and workarounds

### Expo SDK 55 package alignment

Expo Go contains native code for specific SDK-compatible versions. Treat Expo CLI compatibility warnings as runtime risks, not just package-manager noise. The iOS simulator previously hit:

- `Invariant Violation: View config not found for component 'RNSSafeAreaView'` after redirecting `react-native-screens` away from Fabric sources.
- `Unsupported top level event type "topSvgLayout"` with an old `react-native-svg`.
- Missing `expo-router/internal/*` modules with `expo-router@6.0.23`.

The fix is SDK alignment, not local package patching: `expo install --fix` aligned the mobile app to the SDK 55 expected package set (`expo-router@55.0.14`, `react-native@0.83.6`, `react-native-svg@15.15.3`, etc.). After changing Expo/RN package versions, run `pnpm install --force` from the repo root so pnpm relinks stale workspace symlinks.

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

## Documentation systems (don't mix)

| System | Where | Mutable? | When to write |
|---|---|---|---|
| ADRs | `docs/adr/`, `apps/*/docs/adr/` | No (immutable after merge) | Every architectural decision |
| `CONTEXT.md` | Per app + per bounded context | Yes | When domain invariants change |
| PRD vision/scope | `docs/prd/00-...02-...md` | Rarely | Charter-level changes |
| **PRD roadmap** | **`docs/prd/03-roadmap.md`** | **Per sprint** | **Start of sprint (set 🟡) and end of sprint (set 🟢 + bump Current)** |
| **Sprint plans** | **`docs/prd/sprints/sprint-NN-*.md`** | **Per sprint** | **Edit DoD/risks as understanding sharpens; never rewrite history** |
| PRD features / flows | `docs/prd/features/`, `docs/prd/flows/` | Yes | Before / during feature implementation |
| Agent skill config | `docs/agents/` | Rarely | Only when changing issue tracker or label vocabulary |

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary, default names. See `docs/agents/triage-labels.md`.

### Domain docs

**Multi-context** — `CONTEXT-MAP.md` at root, per-app `CONTEXT.md`, per-bounded-context `CONTEXT.md` under `apps/api/src/modules/`. See `docs/agents/domain.md`.

## Verification before completion

Before claiming a feature done:

1. `pnpm typecheck` passes for every workspace touched
2. `pnpm test` passes (unit + integration; e2e for full flows)
3. The relevant `CONTEXT.md` reflects the new state
4. If an architectural choice was made, an ADR exists
5. The PRD section for this feature is updated with what shipped
6. Manual verification: actually run the dev stack and try the feature in the UI

For any mobile / Expo package, Metro, navigation, or runtime-crash change, also run the mobile gate in `docs/agents/mobile-expo.md`. At minimum this means Expo dependency check, mobile typecheck, iOS export, and an Expo Go simulator launch/log check when the bug was runtime-only.

Evidence before assertions. Never claim "fixed" without a passing test or a screenshot of the working flow.
