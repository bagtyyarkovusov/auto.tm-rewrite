# Mobile data-fetching guide — TanStack Query v5 + custom fetch wrapper

> **This is the authoritative data-fetching reference for `apps/mobile`.** Every agent that fetches from the API on mobile, mutates server state, or touches `apps/mobile/src/api/*` must follow this guide end to end.
>
> Companion to [ADR-0015](../adr/0015-mobile-data-fetching.md). The ADR locks the why; this guide is the how.
>
> If you skip a rule below, the change WILL fail one of: auth-refresh reliability, cache consistency, ESLint review, or the mobile verification gate in `docs/agents/mobile-expo.md`.

---

## 0 — MANDATORY pre-research (do every single time)

Before you write or edit any data-fetching code on mobile, run this checklist.

### 0.1 Read these in order

1. **`docs/agents/mobile-data-fetching.md`** — this file. Re-read it; the rules drift.
2. **[ADR-0015](../adr/0015-mobile-data-fetching.md)** — the decision, the alternatives rejected, and the why.
3. **[ADR-0012](../adr/0012-multi-device-sessions.md)** — refresh-token rotation contract that the wrapper implements.
4. **`apps/mobile/CONTEXT.md`** — what the mobile app contains and its known runtime issues.
5. **`apps/mobile/src/api/`** — the live wrapper + hook surface. Read what exists before adding more.
6. **`packages/contracts/src/schemas/`** — the Zod schemas that every response is parsed through. NEVER bypass them.
7. **The bounded-context CONTEXT.md** for whatever you're calling (e.g., `apps/api/src/modules/catalog/CONTEXT.md` if you're adding catalog hooks).

### 0.2 Run these Context7 queries (always, even when you "know" the answer)

Your training data lags. Run these via the Context7 MCP server (`plugin:context7:context7`):

```text
resolve-library-id: @tanstack/react-query  → pick /tanstack/query (v5.x)
query-docs <id> "<specific question — focus manager in react native, persister, optimistic update, etc.>"
```

Use it for: `useQuery` / `useMutation` option specifics, `QueryClient` defaults, focus manager in React Native, `invalidateQueries` matching semantics, `setQueryData` patch shapes, `useInfiniteQuery`, `dehydrate` / `hydrate`, persister setup, devtools wiring.

Do NOT use it for: refactoring our own wrapper, debugging API server bugs (those live in `apps/api`), or architecture re-litigation (ADR-0015 is the answer).

### 0.3 Confirm install state before you import anything

```bash
# Is TanStack Query installed?
grep -E '"@tanstack/react-query"' apps/mobile/package.json

# Does the wrapper exist?
test -f apps/mobile/src/api/client.ts && echo "wrapper present" || echo "wrapper MISSING — go to §2"

# Does the QueryClient provider wrap the root?
grep -l "QueryClientProvider" apps/mobile/app/_layout.tsx
```

If TanStack Query is not installed yet, you are working on the S3 foundations issue. Go to §2 (one-time setup).

If it IS installed and you're adding hooks for a new bounded context, go to §5.

### 0.4 Never assume — verify the boundaries

- **TanStack Query is for server state. Period.** Form state, modal open/closed, locale, current selection — those use React `useState` / context / Zustand. Do not stuff client state into a query.
- **Auth tokens live in `expo-secure-store`**, accessed via `loadAuthSession` / `storeAuthSession` / `clearAuthSession` in `apps/mobile/src/auth/session.ts`. Do not read tokens directly in your hook. The wrapper does it.
- **All API calls go through `apiClient`.** No `fetch(...)`. No `axios`. No raw `XMLHttpRequest`. The wrapper is the only `fetch` consumer.
- **All responses are parsed through `@auto-tm/contracts` Zod schemas.** Untyped data does not cross the wrapper boundary.
- **The wrapper handles 401 once.** If your hook catches a 401, you're catching too late or in the wrong place — the wrapper already retried with a refreshed token. A 401 surfacing to your hook means the user is genuinely unauthenticated; let the global error handler bounce them to `(auth)/phone`.

---

## 1 — The contract

1. **TanStack Query v5 is the only server-state cache.** No parallel cache. No memoized fetches. No `useState(fetch())` patterns.
2. **`apiClient` is the only `fetch` consumer.** Every query/mutation `queryFn` / `mutationFn` calls `apiClient.get` / `.post` / `.patch` / `.delete`.
3. **Every response is contract-parsed.** Pass a `@auto-tm/contracts` Zod schema; the wrapper parses; parse failures throw `ApiError("CONTRACT_VIOLATION", 502)`.
4. **Query keys come from a factory.** `apps/mobile/src/api/queryKeys.ts` owns the factory. No inline `["foo", "bar"]` keys in hooks.
5. **Hooks mirror API bounded contexts.** A `catalog/useBrands.ts` hook is in `apps/mobile/src/api/catalog/`. A `listings/useListing.ts` is in `apps/mobile/src/api/listings/`. The folder tree maps 1:1 with `apps/api/src/modules/`.
6. **Mutations always invalidate** their related query keys in `onSuccess`. Optimistic updates are added per-mutation, not by default.
7. **The wrapper is the single owner of refresh-on-401.** No retry-on-401 in hooks. Ever.
8. **Every hook has at least one test.** `renderHook` + `QueryClientProvider` + `msw/native`. See §9.
9. **No business logic in hooks.** Hooks are thin: call `apiClient`, return `{ data, isPending, error, mutate }`. Business decisions (which filter applies, which list to show) happen in the screen.

Anything that violates rules 1–9 fails review.

---

## 2 — One-time setup (the S3 foundations issue)

Run only once, in the foundations issue that lands the data layer. Subsequent agents skip this and jump to §5.

### 2.1 Install dependencies

```bash
pnpm --filter @auto-tm/mobile add @tanstack/react-query
pnpm --filter @auto-tm/mobile add -D @tanstack/react-query-devtools
pnpm --filter @auto-tm/mobile add -D msw

# After install, the Expo dependency check is mandatory per docs/agents/mobile-expo.md
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

If the dependency check fails, fix it before continuing.

### 2.2 Create the wrapper

`apps/mobile/src/api/client.ts`:

```ts
import type { ZodSchema } from "zod";

import {
  clearAuthSession,
  loadAuthSession,
  storeAuthSession,
} from "../auth/session";
import { AuthSchemas } from "@auto-tm/contracts";

const BASE_URL = process.env["EXPO_PUBLIC_API_URL"];

if (!BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set — check apps/mobile/.env");
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

interface RequestOptions<TResponse> {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  schema?: ZodSchema<TResponse>;
  // If false, do not attach Authorization header (used for OTP request/verify pre-login)
  auth?: boolean;
}

let refreshInFlight: Promise<void> | null = null;

async function refreshOnce(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const session = await loadAuthSession();
    if (!session) {
      throw new ApiError("UNAUTHENTICATED", 401, "No session to refresh");
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (!res.ok) {
      await clearAuthSession();
      throw new ApiError("UNAUTHENTICATED", 401, "Refresh failed");
    }

    const json = (await res.json()) as unknown;
    const parsed = AuthSchemas.OtpVerifyResponseSchema.safeParse(json);
    if (!parsed.success) {
      await clearAuthSession();
      throw new ApiError("CONTRACT_VIOLATION", 502, "Bad refresh response");
    }

    await storeAuthSession(parsed.data);
  })();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function rawRequest<TResponse>(
  path: string,
  opts: RequestOptions<TResponse>,
  isRetry: boolean,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (opts.auth !== false) {
    const session = await loadAuthSession();
    if (session) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && opts.auth !== false && !isRetry) {
    await refreshOnce();
    return rawRequest(path, opts, true);
  }

  if (res.status === 204) {
    return undefined as TResponse;
  }

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const errorBody = json as { code?: string; message?: string; details?: unknown } | null;
    throw new ApiError(
      errorBody?.code ?? "UNKNOWN_ERROR",
      res.status,
      errorBody?.message,
      errorBody?.details,
    );
  }

  if (opts.schema) {
    const parsed = opts.schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        "CONTRACT_VIOLATION",
        502,
        "Response did not match expected schema",
        parsed.error.format(),
      );
    }
    return parsed.data;
  }

  return json as TResponse;
}

export const apiClient = {
  get<T>(path: string, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "GET", schema, ...opts }, false);
  },
  post<T>(path: string, body: unknown, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "POST", body, schema, ...opts }, false);
  },
  patch<T>(path: string, body: unknown, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "PATCH", body, schema, ...opts }, false);
  },
  delete<T>(path: string, schema?: ZodSchema<T>, opts: { auth?: boolean } = {}) {
    return rawRequest<T>(path, { method: "DELETE", schema, ...opts }, false);
  },
};
```

### 2.3 Provide the `QueryClient` at the root

`apps/mobile/app/_layout.tsx`:

```tsx
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { ApiError } from "../src/api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Don't retry auth failures or contract violations
        if (error instanceof ApiError) {
          if (error.status === 401 || error.code === "CONTRACT_VIOLATION") {
            return false;
          }
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

export default function RootLayout() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* ... rest of the root layout (ThemeProvider, Stack, PortalHost) ... */}
    </QueryClientProvider>
  );
}
```

### 2.4 Wire the global error handler for forced logout

The wrapper throws `ApiError("UNAUTHENTICATED", 401)` when refresh itself fails. Catch it globally and bounce to `(auth)/phone`:

```ts
queryClient.getQueryCache().subscribe((event) => {
  const error = event.query.state.error;
  if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
    void clearAuthSession();
    router.replace("/(auth)/phone");
  }
});
```

(In practice, this lives in a `useEffect` inside the root layout; full pattern in the S3 foundations PR.)

### 2.5 Migrate the S2 auth client

Delete `apps/mobile/src/auth/client.ts`. Move `requestOtp` and `verifyOtp` to `apps/mobile/src/api/identity/useRequestOtp.ts` and `useVerifyOtp.ts`, calling `apiClient.post(...)` with `auth: false` (these calls are pre-login).

Verify the OTP screens still work end to end against the local API after the migration. This is the proof that the refresh interceptor doesn't break S2's flows.

---

## 3 — Query key factory

`apps/mobile/src/api/queryKeys.ts` is the **only** place query keys are constructed. Inline key arrays in hooks are forbidden.

```ts
export const queryKeys = {
  me: () => ["me"] as const,

  catalog: {
    all: () => ["catalog"] as const,
    brands: () => [...queryKeys.catalog.all(), "brands"] as const,
    models: (brandId: string) =>
      [...queryKeys.catalog.all(), "models", brandId] as const,
    cities: () => [...queryKeys.catalog.all(), "cities"] as const,
  },

  listings: {
    all: () => ["listings"] as const,
    list: (filters: ListingFilters) =>
      [...queryKeys.listings.all(), "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.listings.all(), "detail", id] as const,
  },

  favorites: {
    all: () => ["favorites"] as const,
    list: () => [...queryKeys.favorites.all(), "list"] as const,
  },

  conversations: {
    all: () => ["conversations"] as const,
    list: () => [...queryKeys.conversations.all(), "list"] as const,
    detail: (id: string) =>
      [...queryKeys.conversations.all(), "detail", id] as const,
  },
};
```

Invalidating a hierarchy is easy: `queryClient.invalidateQueries({ queryKey: queryKeys.listings.all() })` invalidates every `listings/*` key.

---

## 4 — Writing a query hook

Template — copy this for every read endpoint:

```ts
// apps/mobile/src/api/catalog/useBrands.ts
import { useQuery } from "@tanstack/react-query";

import { CatalogSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.catalog.brands(),
    queryFn: () =>
      apiClient.get("/catalog/brands", CatalogSchemas.BrandsListResponseSchema, {
        auth: false, // catalog is public
      }),
    staleTime: 5 * 60_000, // brands change rarely — override the default
  });
}
```

Rules for query hooks:
- One file per hook.
- Import the schema from `@auto-tm/contracts`. The contract is the boundary; the API is allowed to evolve as long as the schema doesn't break.
- Override `staleTime` only when the default 30s is wrong for this domain.
- Do NOT add `retry` logic — the global default already handles it.
- Do NOT catch errors here — TanStack Query exposes them via `error`; the screen renders the error state.

---

## 5 — Writing a mutation hook

Template — copy this for every write endpoint:

```ts
// apps/mobile/src/api/favorites/useToggleFavorite.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { FavoritesSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { listingId: string; favorited: boolean }) =>
      input.favorited
        ? apiClient.post(`/listings/${input.listingId}/favorite`, {}, FavoritesSchemas.ToggleResponseSchema)
        : apiClient.delete(`/listings/${input.listingId}/favorite`),
    onSuccess: (_data, variables) => {
      // Invalidate the detail (its `isFavorited` flag changed) and the favorites list
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listings.detail(variables.listingId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.all(),
      });
    },
  });
}
```

Rules for mutation hooks:
- `onSuccess` is where invalidation lives. Always invalidate at least one key. If you literally have nothing to invalidate, you don't have a mutation — you have a query.
- For optimistic updates, add `onMutate` and `onError` (see §6).
- Use the contract schema for the request body too if it's non-trivial (`schema.parse(input)` in `mutationFn` before calling `apiClient.post`).
- Do NOT show toasts inside the hook. Toast at the call site (the screen) so the screen can choose whether the error needs UI.

---

## 6 — Optimistic updates

Add only when the UX justifies it. Defaults: favorite toggle yes, message send yes, listing create no, profile edit no.

```ts
return useMutation({
  mutationFn: ({ listingId, favorited }) => /* ... */,

  onMutate: async ({ listingId, favorited }) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.listings.detail(listingId) });
    const previous = queryClient.getQueryData(queryKeys.listings.detail(listingId));
    queryClient.setQueryData(queryKeys.listings.detail(listingId), (old: ListingDetail | undefined) =>
      old ? { ...old, isFavorited: favorited } : old,
    );
    return { previous };
  },

  onError: (_error, { listingId }, context) => {
    if (context?.previous) {
      queryClient.setQueryData(queryKeys.listings.detail(listingId), context.previous);
    }
  },

  onSettled: (_data, _error, { listingId }) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.listings.detail(listingId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all() });
  },
});
```

The pattern is always: cancel → snapshot → optimistically patch → return snapshot → rollback in `onError` → invalidate in `onSettled`.

---

## 7 — Error handling at the screen

```tsx
const { data, isPending, error, refetch } = useBrands();

if (isPending) {
  return <Skeleton className="h-12" />;
}

if (error instanceof ApiError) {
  if (error.code === "RATE_LIMITED") {
    return <RateLimitedState retryAfter={error.details} />;
  }
  return <ErrorState message={copy.errors.network} onRetry={refetch} />;
}

return <BrandList brands={data} />;
```

- The screen owns the loading skeleton and the error UI.
- `error` from the hook is always an `ApiError` (because the wrapper throws it) or `null`.
- Bounce-to-login for 401 is automatic via the global error handler (§2.4); the hook caller doesn't handle it.

---

## 8 — Testing hooks

Setup `msw/native` once in `apps/mobile/test/msw.ts`:

```ts
import { setupServer } from "msw/native";

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Hook test pattern:

```ts
// apps/mobile/src/api/catalog/useBrands.spec.tsx
import { http, HttpResponse } from "msw";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { server } from "../../../test/msw";
import { useBrands } from "./useBrands";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useBrands", () => {
  it("returns the parsed brand list", async () => {
    server.use(
      http.get("*/catalog/brands", () =>
        HttpResponse.json({ brands: [{ id: "1", slug: "toyota", name: "Toyota" }] }),
      ),
    );

    const { result } = renderHook(() => useBrands(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.brands).toHaveLength(1);
  });

  it("surfaces a contract violation when the API returns garbage", async () => {
    server.use(
      http.get("*/catalog/brands", () => HttpResponse.json({ wrong: "shape" })),
    );

    const { result } = renderHook(() => useBrands(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe("CONTRACT_VIOLATION");
  });
});
```

The wrapper itself has its own unit tests covering the refresh-dedup state machine — see `apps/mobile/src/api/client.spec.ts` in the S3 foundations PR.

---

## 9 — Anti-patterns (do NOT do these)

| Anti-pattern | Why it's wrong |
|---|---|
| Calling `fetch` directly in a hook or screen | Bypasses auth, refresh, parsing. Use `apiClient`. |
| Catching `ApiError` with `error.status === 401` in a hook | The wrapper already retried. A surfacing 401 means logged-out; let the global handler bounce. |
| Inlining a query key: `useQuery({ queryKey: ["brands"] })` | Drift the moment someone invalidates with `["catalog", "brands"]`. Use the factory. |
| Putting form state inside a query | TanStack Query is for *server* state. Form state is `useState` / form library. |
| Calling `queryClient.invalidateQueries()` with no key | Invalidates EVERYTHING. Almost never what you want. |
| Wrapping `useQuery` in `useEffect` to manually trigger | TanStack Query already manages the lifecycle. You're reinventing the cache. |
| Skipping the schema arg "because the response is trivial" | Future-proofing: when the API field gets renamed, the contract catches it; raw access silently breaks. |
| Adding a parallel cache (Redux, Zustand, Context) for server data | Two sources of truth. Use TanStack Query for server, a single store for client state if needed. |
| Adding `retry: 5` to make flaky requests pass | The problem is in the API, not the client. Fix the API or the test. |
| Re-implementing 401-refresh in a hook | One wrapper, one refresh path. Multiple paths race on the refresh token. |

---

## 10 — Verification gate

Before merging any PR that touches `apps/mobile/src/api/**` or a screen that adopts a new hook, run:

```bash
# 1. Typecheck
pnpm --filter @auto-tm/mobile typecheck

# 2. Unit + hook tests
pnpm --filter @auto-tm/mobile test

# 3. Expo dependency check (mandatory after touching package.json)
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check

# 4. iOS Simulator smoke for the affected screen
#    (per docs/agents/mobile-expo.md — boot, navigate to the screen, confirm data renders)
```

A green typecheck + test pass does NOT mean the feature works. UI screens that fetch data must be smoke-tested in the simulator with the local API running.

---

## 11 — Troubleshooting

**"My query refetches every time I switch tabs."**
TanStack Query's `refetchOnWindowFocus` fires on `AppState.active`. Either accept the refetch or override `staleTime` for that query so the cache is considered fresh.

**"I'm getting infinite refetches."**
You probably put a non-stable value in the query key (e.g., a new object literal every render). The factory functions return stable refs for primitives; for objects (filters) make sure the screen memoizes the filters with `useMemo`.

**"My mutation's `onSuccess` invalidation doesn't trigger a refetch."**
The query you invalidated has no active subscribers. Open the screen that uses it; TanStack Query only refetches active queries. Use `refetchType: "all"` if you really need inactive queries to refetch too.

**"401 → user gets logged out even though refresh should have worked."**
Check `apps/mobile/src/api/client.spec.ts` covers your scenario. Common bug: refresh response shape changed and the parse fails silently. Add a console log inside `refreshOnce` and rerun.

**"Two concurrent queries both trigger a refresh and one fails."**
The refresh-dedup `refreshInFlight` is per-module. If you imported the wrapper twice (e.g., from a relative path AND a `@/` alias), you have two singletons. Use one import path consistently.

**"msw doesn't intercept my request in tests."**
`msw/native` requires polyfilling `Response` / `Request` / `Headers` in the Jest/Vitest setup. The S3 foundations PR includes the polyfill chain; if you removed it, restore it.

**"`@testing-library/react-native` throws 'Unexpected token typeof' in Node tests."**
`@testing-library/react-native` imports `react-native`, which contains Flow-typed source that Node cannot parse. Two workarounds exist:
1. Use `@testing-library/react` (web renderer) with `happy-dom` for hook tests that don't touch RN-specific components — this is the pragmatic default for data-hook tests.
2. If you must use `@testing-library/react-native`, mock `react-native` at the module level in your Vitest config and ensure `react-test-renderer`'s patch version matches React's exactly.

Also note: test files containing JSX must use the `.tsx` extension so Vitest's esbuild transform handles them.

---

## 12 — Sprint adoption

This guide grew out of the S3 foundations issue (wrapper, QueryClient, migrate S2 auth client, tests — shipped in PR #60). The authoritative per-sprint plan for which hooks land when lives in [`docs/prd/03-roadmap.md`](../prd/03-roadmap.md) and the per-sprint files under [`docs/prd/sprints/`](../prd/sprints/). When a sprint ships a new pattern (e.g., S7 Conversations introduces WebSocket-driven cache invalidation), update the relevant section above with the new shape — don't reproduce a sprint-by-sprint adoption timeline here that will rot as sprints slip or reorder.

---

## 13 — Cross-references

- [ADR-0015](../adr/0015-mobile-data-fetching.md) — the decision
- [ADR-0012](../adr/0012-multi-device-sessions.md) — refresh-token contract
- [`apps/mobile/CONTEXT.md`](../../apps/mobile/CONTEXT.md) — mobile app state of the world
- [`packages/contracts/CONTEXT.md`](../../packages/contracts/CONTEXT.md) — Zod schema source
- [`docs/agents/mobile-expo.md`](mobile-expo.md) — mobile verification gate
- [`docs/agents/nativewind-v4.md`](nativewind-v4.md) — mobile styling guide (sibling doc, same shape)
- TanStack Query v5: https://tanstack.com/query/latest
- msw (native): https://mswjs.io/docs/integrations/react-native

---

*This guide is normative. If reality diverges from it, fix the code OR open a PR that updates the guide. Don't let drift accumulate silently.*
