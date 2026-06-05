# Coding Standards — auto.tm-rewrite

Loaded by the reviewer agent via `@.sandcastle/CODING_STANDARDS.md`. The full
policy lives in `CLAUDE.md` / `AGENTS.md`; this is the enforced subset.

## Architecture (Level-2 bounded contexts)

- Each `apps/api/src/modules/<context>/` has `domain/` (pure TS), `application/`
  (one use-case per file), `infrastructure/` (Prisma repos, clients, mappers),
  and `presentation/` (HTTP controllers + WS gateways).
- **Cross-context calls go through injected ports OR the in-process event bus —
  never a direct import** from another context's `domain/` / `application/`.
- **Domain layer is framework-free**: no `@Injectable()`, no Prisma, no Nest.
- **Prisma models live ONLY in `infrastructure/`.** Map rows → domain entities at
  the boundary.
- **One use-case per file** (~100 lines max): one class, one method, one job.
- **No magic strings** for tokens/roles/status enums — they live in
  `domain/types.ts` per context.

## Data + security

- **All times UTC in the DB**; convert at the display layer.
- **Schema changes are Prisma migrations** committed to git — never `db push`
  outside localhost.
- **Never store plaintext refresh tokens** — bcrypt-hash in
  `User.refreshTokenHash`.
- **Air-gap:** no code that calls an outside-Turkmenistan service from `apps/api`
  or `apps/worker`.
- **Never commit `.env`** — only `.env.template` / `.env.example`.

## Mobile (`apps/mobile`)

- NativeWind v4 + React Native Reusables (`docs/agents/nativewind-v4.md`). No
  `StyleSheet.create` for new code; use RNR for button/input/dialog.
- **Never import `@auto-tm/ui/components/*` in mobile** (that package is web-only).
- Data fetching: TanStack Query v5 + the `apiClient` wrapper
  (`docs/agents/mobile-data-fetching.md`, ADR-0015). Never call `fetch` directly
  outside `apps/mobile/src/api/client.ts`; never inline query keys (use the
  factory); validate responses with the `@auto-tm/contracts` Zod schema.
- Keep `.npmrc` `shamefully-hoist=true`. Honor the 60s-video / 5 MB-image
  client-side compression (TM mobile data is metered).

## Libraries

- **Context7 MCP for every external-library lookup** (ADR-0017):
  `resolve-library-id` → `query-docs` before writing or debugging code that uses
  a library.

## Docs (ADR-0019 / ADR-0020)

- `CONTEXT.md` describes **current state** — update it in the SAME change that
  alters a Prisma field, port, use-case, event, or HTTP route.
- ADRs are immutable after merge (supersede with a new ADR, don't edit). Capture
  new architecture decisions as a new numbered ADR.
