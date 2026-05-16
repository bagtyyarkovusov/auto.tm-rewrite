# Documentation lookups — Context7 MCP is the canonical source

> **This is the authoritative documentation-lookup reference for every agent in this repo.** Before you write or debug code that touches an external library, framework, SDK, API, CLI, or cloud service, follow this guide.
>
> Companion to [ADR-0017](../adr/0017-context7-as-canonical-doc-source.md). The ADR locks the why; this guide is the how.
>
> If you skip this guide, you will ship code against stale training-data memory and waste reviewer cycles fixing version mismatches. The verification gate in [`CLAUDE.md`](../../CLAUDE.md) will block the PR.

---

## 0 — The rule

**Use Context7 MCP for every library doc lookup. Even when you "know" the answer. Your training data lags.**

This applies to: libraries, frameworks, SDKs, REST/GraphQL APIs, CLI tools, cloud services. Including well-known ones — React, Next.js, Prisma, Express, Tailwind, Django. The whole point of Context7 is that it serves the *current* docs, not what your training corpus remembers.

This does **not** apply to: your own business logic, refactors inside this repo, debugging this codebase's own bugs, code review, or general programming concepts (algorithms, OOP, etc.). Those are not library-doc questions.

---

## 1 — The workflow

Every doc lookup follows the same three steps.

### Step 1 — `resolve-library-id`

Find the Context7-compatible library ID. Skip this step **only** if the user (or this guide's library table in §3) gave you an exact `/org/project` ID.

```text
resolve-library-id(
  libraryName: "Next.js",
  query: "<the user's question or the task you're working on>"
)
```

The query field ranks results by relevance. Use the full user question, not a single word.

### Step 2 — pick the best ID

Context7 returns multiple candidates per library. Rank by:

1. **Name match** — exact name beats fuzzy.
2. **Description relevance** — matches what you're actually trying to do.
3. **Code snippet count** — more snippets = more coverage.
4. **Source reputation** — `High` and `Medium` beat `Low` and `Unknown`.
5. **Benchmark score** — higher is better (max 100).
6. **Version awareness** — if the result lists versions matching the version we use (e.g., `v11.1.16` for NestJS 11), prefer it; you can pin the ID as `/org/project/version` for sticky version lookups.

If the top result has fewer than 50 snippets or `Low` reputation, search again with a rephrased `libraryName` (e.g., "next.js" → "Next.js" → "NextJS").

### Step 3 — `query-docs`

Ask the actual question against the resolved ID.

```text
query-docs(
  libraryId: "/vercel/next.js/v16.2.2",   // or "/vercel/next.js" for latest
  query: "<full question — be specific>"
)
```

Good queries:
- "How do I add middleware that runs on every request in Next.js 16 App Router?"
- "React Native 0.83 new architecture: what changed in TurboModules registration?"
- "Prisma 7 schema: how do I add a default ULID to an `@id` field?"

Bad queries:
- "middleware"
- "new architecture"
- "ids"

### Step 4 — escalate with `researchMode: true` if needed

If the answer from step 3 is incomplete or you're not satisfied:

```text
query-docs(
  libraryId: "<same ID>",
  query: "<same question>",
  researchMode: true
)
```

`researchMode: true` retries with sandboxed agents that git-pull the actual source repos plus a live web search, then synthesize a fresh answer. Costlier. Use when default mode misses.

**Do not call `resolve-library-id` or `query-docs` more than 3 times for the same question.** If you can't get the answer after 3 calls, take the best result and apply judgment.

---

## 2 — Where Context7 sits in the doc hierarchy

Context7 is for *library* docs. The repo's own docs sit alongside it. Use both:

| Source | When |
|---|---|
| **Context7** | External library API, version-specific behavior, migration guide, configuration, CLI flags |
| `CLAUDE.md` / `AGENTS.md` | This repo's policies, never-dos, verification gates |
| `docs/adr/*` | Why the repo made architectural choices |
| `CONTEXT.md` (per workspace) | What a bounded context owns, its ports, its invariants |
| `docs/agents/*` | Domain-specific agent guides (this file, `mobile-expo.md`, `nativewind-v4.md`, etc.) |
| `docs/prd/*` | Product scope, sprint state |

If a library question can be answered by reading the repo (e.g., "how does our `apiClient` wrapper handle 401?"), read the repo. Context7 is for the underlying library, not for our wrapper around it.

---

## 3 — Canonical library ID table

These IDs are pre-resolved for this repo's stack. Copy-paste them into `query-docs` directly; skip `resolve-library-id`. For anything not on this table, run `resolve-library-id` on demand.

### Backend (API + worker)

| Library | Pinned Context7 ID | Notes |
|---|---|---|
| NestJS | `/nestjs/docs.nestjs.com` | Official docs (1687 snippets). For source-level questions, also try `/nestjs/nest` (has `v11.1.16`). |
| `@nestjs/jwt` | `/nestjs/jwt` | Dedicated. |
| `nestjs-pino` | `/iamolegga/nestjs-pino` | Dedicated. |
| Prisma | `/prisma/prisma` | Has `v7.6.0` matching our pin. |
| Fastify | `/fastify/fastify` | Official. NestJS uses Fastify adapter (`@nestjs/platform-fastify`). |
| Socket.IO | `/websites/socket_io_v4` | v4-specific. Pair with `@nestjs/websockets` from NestJS docs. |
| BullMQ | `/taskforcesh/bullmq` | Official. Used in `apps/worker`. |
| `@nestjs/bullmq` | search `resolve-library-id` for NestJS Bull on demand | NestJS-side adapter; less stable to pin. |
| ioredis | `/redis/ioredis` | Official, has `v5_4_0`. |
| Pino | `/pinojs/pino` | Official. |
| Zod | `/colinhacks/zod` | Has `v3.24.2` matching our v3. |
| TypeScript | `/microsoft/typescript` | Has `v5.9.x`. |
| Vitest | `/vitest-dev/vitest` | Official. |
| Turborepo | `/vercel/turborepo` | Official. |

### Frontend — web (`apps/web`, `apps/admin`)

| Library | Pinned Context7 ID | Notes |
|---|---|---|
| Next.js | `/vercel/next.js` | Has `v16.2.2` exact match. Pin as `/vercel/next.js/v16.2.2` for sticky lookups. |
| React | `/reactjs/react.dev` | Official docs. For source-level (v19 internals): `/facebook/react` has `v19_2_0`. |
| Tailwind CSS | `/tailwindlabs/tailwindcss.com` | Official (v4). |
| shadcn/ui | `/shadcn-ui/ui` | Official. Has `shadcn_3_2_1`, `shadcn_3.5.0`. |
| Base UI | `/mui/base-ui` | Has `v1.3.0`. Headless primitives used in web + admin. |

### Frontend — mobile (`apps/mobile`)

| Library | Pinned Context7 ID | Notes |
|---|---|---|
| Expo | `/expo/expo` | 10,595 snippets. For SDK 55 specifics also try `/websites/expo_dev_versions_v55_0_0`. |
| expo-router | `/expo/expo` | No standalone good match; use main Expo ID with router-scoped queries. |
| React Native | `/facebook/react-native-website` | Official docs. |
| NativeWind | `/nativewind/nativewind` | Has `nativewind_4.2.0` matching our pin. |
| React Native Reusables | `/founded-labs/react-native-reusables` | Best available (Medium reputation). |
| TanStack Query | `/tanstack/query` | Has `v5.90.3` (latest v5). |
| react-native-reanimated | `/software-mansion/react-native-reanimated` | Has `4.1.5`. |

### Utility libraries (no pin — resolve on demand)

`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `lucide-react-native`, `bcryptjs`, `pg`, `@formatjs/intl-localematcher`, `negotiator`, `tailwindcss-animate`, `tw-animate-css`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg`, `react-native-css-interop`, `react-native-compressor`, `expo-secure-store`, `expo-linking`, `expo-constants`, `expo-image-manipulator`, `expo-status-bar`, `@asteasolutions/zod-to-openapi`, ESLint plugins.

For these, run `resolve-library-id` on the fly. They're small enough that pinning would be more maintenance than payoff.

---

## 4 — Recipes for the most-touched libraries

Short, copy/paste-able prompts for the libraries this repo touches most often.

### NestJS (API + worker)

```text
resolve-library-id: NestJS  → /nestjs/docs.nestjs.com  (already known — skip)
query-docs /nestjs/docs.nestjs.com "How do I write a guard that reads a custom decorator's metadata in NestJS 11?"
query-docs /nestjs/docs.nestjs.com "What is the correct DI scope for a request-scoped logger that picks up trace ID from middleware?"
query-docs /nestjs/docs.nestjs.com "How does @nestjs/platform-fastify differ from @nestjs/platform-express for interceptors that read the response stream?"
```

### Prisma

```text
query-docs /prisma/prisma "Prisma 7: how do I extend the client with a model middleware that logs slow queries?"
query-docs /prisma/prisma "Prisma 7: schema migration to add an index on a JSON field — supported on Postgres?"
query-docs /prisma/prisma "Prisma 7: difference between $transaction(callback) and $transaction([promises]) for isolation level"
```

### Expo SDK 55

```text
query-docs /expo/expo "Expo SDK 55: when should I run `expo install --check` vs `expo install --fix`? What does each modify?"
query-docs /expo/expo "Expo Router 55: how do typed routes interact with dynamic segments under `experiments.typedRoutes`?"
query-docs /expo/expo "Expo SDK 55: react-native-screens version that ships with the SDK and why redirecting to commonjs breaks Fabric"
```

### Next.js 16

```text
query-docs /vercel/next.js/v16.2.2 "Next.js 16 App Router: middleware execution order with multiple matchers"
query-docs /vercel/next.js/v16.2.2 "Next.js 16 Server Actions: how do I forward cookies to a downstream API?"
query-docs /vercel/next.js/v16.2.2 "Next.js 16 i18n: routing in App Router — has middleware-based locale detection changed since 15?"
```

### NativeWind v4

```text
query-docs /nativewind/nativewind "NativeWind v4: jsxImportSource setup in metro.config.js for tsconfig with multiple workspaces"
query-docs /nativewind/nativewind "NativeWind v4: how dark: variant resolves at runtime via react-native-css-interop"
query-docs /nativewind/nativewind "NativeWind v4: extending theme tokens via @theme directive in global.css for an Expo app"
```

### TanStack Query v5

```text
query-docs /tanstack/query "TanStack Query v5: focus manager in React Native — what AppState transitions trigger refetch?"
query-docs /tanstack/query "TanStack Query v5: invalidateQueries matching semantics for hierarchical keys"
query-docs /tanstack/query "TanStack Query v5: optimistic update pattern with onMutate, onError rollback, onSettled invalidate"
```

### React 19

```text
query-docs /reactjs/react.dev "React 19: useActionState replacing useFormState — migration and behavior differences"
query-docs /reactjs/react.dev "React 19: ref as prop — what changes for forwardRef in libraries we depend on?"
```

### Zod

```text
query-docs /colinhacks/zod "Zod 3: discriminatedUnion vs union performance for a 12-variant message schema"
query-docs /colinhacks/zod "Zod 3: transform vs preprocess — when does each run and which preserves the input type?"
```

### Tailwind CSS v4

```text
query-docs /tailwindlabs/tailwindcss.com "Tailwind CSS v4: @theme directive in CSS replacing tailwind.config.js — how do I declare custom colors?"
query-docs /tailwindlabs/tailwindcss.com "Tailwind CSS v4: oxide engine and how it differs from v3 JIT for arbitrary value compilation"
```

### Vitest

```text
query-docs /vitest-dev/vitest "Vitest: how do I auto-load .env files in test config without a plugin?"
query-docs /vitest-dev/vitest "Vitest: pool: 'forks' vs 'threads' tradeoff for Testcontainers-based integration tests"
```

---

## 5 — Verification

The Definition of Done in [`CLAUDE.md`](../../CLAUDE.md) lists "consulted Context7 for every external library your change touched." Reviewers will check this.

What "consulted" means:
- For non-trivial changes: at least one `query-docs` call per external library touched, recorded in the PR description or commit body.
- For trivial dep bumps with no API surface change: a line in the PR description noting "no Context7 lookup needed — bump only."
- For pure repo-internal work (refactor, business logic, bug in our own code): no Context7 needed.

This is not theatre. A reviewer who sees a hook using the v4 TanStack signature against our v5 install knows the author skipped Context7 and will block the PR.

---

## 6 — Anti-patterns

| Anti-pattern | Why it's wrong |
|---|---|
| Writing code from training-data memory for any library on the §3 table | Your memory lags. The version we run may have renamed, removed, or changed the API. |
| Using `WebFetch` against `nextjs.org` instead of Context7 | Context7 is structured for code lookup; `WebFetch` returns marketing pages and stale tutorials. |
| Calling `query-docs` with a one-word query ("middleware", "hooks") | You will get generic snippets. Ask the actual question. |
| Pinning to a specific Context7 version when the user didn't ask for one | The default ID (no version) returns the latest. Only pin a version when reproducing or debugging a known-version issue. |
| Skipping `resolve-library-id` for a library not on §3 | You'll guess at the org/project and miss. Resolve first. |
| Resolving the same library 4+ times in a session | You're not learning from the previous results. Take the best one and move on. |
| Treating Context7 as authoritative for *our* codebase ("does our apiClient handle 401?") | Read the actual file. Context7 doesn't know our code. |
| Ignoring Context7 because "I'll just check the official docs in a browser" | Reviewers can't see your browser. Make the lookup part of the agent trace. |

---

## 7 — When Context7 is unavailable

If the Context7 MCP server is down or returns errors:

1. Try `query-docs` once more; transient errors clear quickly.
2. If still down, fall back to `WebFetch` against the **official** docs URL only (e.g., `https://docs.nestjs.com`, `https://www.prisma.io/docs`, `https://docs.expo.dev`). Avoid blog posts, Stack Overflow, and tutorial sites — they drift even faster than training data.
3. Note in the PR description: "Context7 unavailable at <time>; fell back to `WebFetch` against `<official URL>`."
4. The verification gate accepts this fallback. Reviewers know Context7 isn't always up.

---

## 8 — Cross-references

- [ADR-0017](../adr/0017-context7-as-canonical-doc-source.md) — the decision
- [`CLAUDE.md`](../../CLAUDE.md) — root agent policy (Claude)
- [`AGENTS.md`](../../AGENTS.md) — root agent policy (cross-agent)
- [`docs/agents/mobile-expo.md`](mobile-expo.md) — mobile SDK alignment + dependency check
- [`docs/agents/nativewind-v4.md`](nativewind-v4.md) — embeds Context7 recipes for the NativeWind/RNR stack
- [`docs/agents/mobile-data-fetching.md`](mobile-data-fetching.md) — embeds Context7 recipes for TanStack Query v5
- [`docs/agents/typescript-runtime.md`](typescript-runtime.md) — TypeScript module-resolution boundaries (ADR-0016)

---

*This guide is normative. If a library is added or removed from the stack, update §3. If Context7 publishes a meaningfully better ID for a library we use, swap it in. Don't let the table drift silently.*
