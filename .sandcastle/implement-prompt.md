# TASK

Implement issue {{TASK_ID}}: {{ISSUE_TITLE}} on branch {{BRANCH}}.

Pull the issue with `gh issue view {{TASK_ID}}`. Its body is a self-contained
prompt — the `## Read first`, `## Files to create / modify`, `## Acceptance
criteria`, and `## Depends on` sections are authoritative. Read every file the
`## Read first` section references inside the working tree before you start.
Work ONLY on this issue.

# CONTEXT

Recent commits for orientation:

<recent-commits>

!`git log -n 10 --format="%h %s" --date=short`

</recent-commits>

# HOUSE RULES (auto.tm-rewrite)

Read `CLAUDE.md` and the local `CONTEXT.md` for the area you touch. Hard rules
(also in `.sandcastle/CODING_STANDARDS.md`, enforced at review):

- **Bounded contexts never import each other.** Cross-context access goes through
  an injected port OR the in-process event bus — never a direct import from
  another context's `domain/` / `application/`.
- **Domain layer is framework-free** (no `@Injectable()`, no Prisma, no Nest).
- **Prisma only in `infrastructure/`** — map rows → domain entities at the boundary.
- **One use-case per file** in `application/`.
- **No magic strings** for tokens/roles/status — they live in `domain/types.ts`.
- **Air-gap:** never add code that calls an outside-Turkmenistan service from
  `apps/api` or `apps/worker`.
- **Schema changes are Prisma migrations**, never `db push`.
- **CONTEXT.md is current state (ADR-0019):** if you add or change a Prisma field,
  port, use-case, event, or HTTP route, update that context's `CONTEXT.md` in the
  SAME change.

# DOCUMENTATION (Context7 — required, ADR-0017)

Before writing or debugging code that touches ANY external library/framework/SDK/CLI
(Prisma, NestJS, Expo, expo-router, NativeWind, TanStack Query, Zod, Fastify,
Socket.IO, …): call `resolve-library-id` then `query-docs` via the Context7 MCP.
Prefer Context7 over memory — APIs drift. For mobile, also read the guides the
issue lists: `docs/agents/mobile-expo.md`, `docs/agents/nativewind-v4.md`,
`docs/agents/mobile-data-fetching.md`.

# EXECUTION (TDD where it fits)

1. RED: write one failing test (use-case/domain level with fake ports beats
   HTTP-level for business logic).
2. GREEN: minimal implementation to pass.
3. REPEAT, then REFACTOR.

# THE IN-SANDBOX GATE (D1)

Before committing, run the gate for every workspace you touched — via turbo, so
runtime deps (`@auto-tm/db`, `@auto-tm/contracts` `dist/`) build first:

```
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm exec turbo run typecheck lint test:unit --filter=<workspace>
```

(e.g. `--filter=@auto-tm/mobile`, `--filter=@auto-tm/api`.) `test:unit` is the
Docker-free unit suite — it excludes the `*.e2e.spec.ts` Testcontainers tests.

**This sandbox deliberately does NOT run the Testcontainers e2e suite or
`pnpm build`.** Those run at the GitHub boundary on CI (`pr-checks.yml` /
`ci.yml`, self-hosted `tm-proxy` runner). Do not try to start Postgres/Redis or
Docker here. Cover API/Prisma logic with strong fake-port unit tests so it is
exercised before it reaches CI.

**Mobile (`apps/mobile`):** the headless gate above is all you can run here. You
CANNOT run `expo install --check`, an iOS export, or Expo Go in this sandbox.
Build the components/screens/hooks and pass typecheck/test:unit/lint, then note
in your final issue comment that the branch **needs the human Expo simulator
gate** after merge (D2).

# COMMIT

Use a Conventional Commit message, e.g.
`feat(mobile): listing detail page + photo gallery (#{{TASK_ID}})`, summarizing
the change, key decisions, and files touched. End the message with:

```
Co-Authored-By: Kimi <noreply@kimi.com>
```

Do NOT close the issue (the merger does that). If you cannot finish, leave a
`gh issue comment {{TASK_ID}}` with what's done and what remains.

When the gate passes and you've committed, output `<promise>COMPLETE</promise>`.

# FINAL RULE

ONLY work on issue {{TASK_ID}}.
