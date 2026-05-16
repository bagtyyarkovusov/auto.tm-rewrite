# ADR-0015: Mobile data fetching — TanStack Query v5 + custom fetch wrapper

- **Status**: Accepted
- **Date**: 2026-05-16
- **Complements**: ADR-0002 (Technology stack), ADR-0012 (Multi-device sessions)

## Context

`apps/mobile/CONTEXT.md` has declared since Sprint 1 that the mobile app uses "React Query for server cache + mutations." That intent was never wired. Sprint 2 shipped `apps/mobile/src/auth/client.ts` — a bare-bones `fetch` wrapper used only by `requestOtp` and `verifyOtp` — alongside `apps/mobile/src/auth/session.ts` using `expo-secure-store` for token persistence. There is:

- No `@tanstack/react-query` (or `react-query`) installed
- No global API client; each call site rebuilds URL + headers
- No 401 → refresh → retry interceptor (the JWT access token is 15-min sliding per ADR-0012, so every screen would have to handle expiry independently)
- No `AsyncStorage` usage despite the line in `apps/mobile/CONTEXT.md`
- No agent guide for how mobile fetches data (we have `docs/agents/mobile-expo.md` and `docs/agents/nativewind-v4.md` but nothing for the data layer)

Sprint 3 (Catalog) is the next sprint. Catalog data (`Brand`, `Model`, `Generation`, `Color`, `BodyType`, `Region`, `City`) must be fetched on the mobile feed for filter chips, on the sell wizard for selection, and on the listing detail for display. Sprint 4 (Listings CRUD) then layers list + detail + create + update; Sprint 5 (Listings UX) adds favorites + saved searches; Sprint 7 (Conversations) adds chat lists that must invalidate on websocket events. Without a documented data-layer pattern, every sprint reinvents URL construction, header attachment, error parsing, refresh-on-401, dedup, cache invalidation, optimistic updates, and loading/error states — and the resulting screens drift.

We must commit to a mobile data-fetching architecture before S3 starts, or every S3 PR ships its own `fetch` shape and we pay a multi-day refactor later. This ADR locks the architecture; an "S3 foundations" issue lands the actual wiring before catalog use-cases begin.

## Decision

`apps/mobile` adopts **TanStack Query v5** as the server-state cache and hook surface, layered on top of a small **custom fetch wrapper** that owns auth, refresh, and contract parsing.

Concretely:

1. **TanStack Query v5** is installed as `@tanstack/react-query`. A single `QueryClient` is instantiated at the root and provided via `QueryClientProvider` in `apps/mobile/app/_layout.tsx`. Default options: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry: 1`, `refetchOnWindowFocus: true` (mapped to RN `AppState` via `@tanstack/react-query`'s focus manager bridge), `refetchOnReconnect: true`.

2. **A custom `apiClient` wrapper** lives at `apps/mobile/src/api/client.ts`. It is the only module in the app that calls global `fetch` directly. Every TanStack Query hook calls through it. The wrapper owns:
   - **Base URL** from `process.env.EXPO_PUBLIC_API_URL` (set in `apps/mobile/.env.template`)
   - **Bearer token attachment** by reading the access token from `loadAuthSession()` on each request
   - **Single 401-refresh-retry**: on a 401 response, call `POST /api/v1/auth/refresh` once with the stored refresh token, persist the rotated pair via `storeAuthSession()`, replay the original request, then return. If refresh itself returns 401 (token reuse / expired session per ADR-0012), call `clearAuthSession()` and throw `ApiError("UNAUTHENTICATED", 401)`. Caller logic (an outer `QueryClient` error handler) navigates to `(auth)/phone`.
   - **Refresh deduplication**: concurrent 401s within the same wrapper instance must share one in-flight refresh promise. The wrapper holds `let refreshInFlight: Promise<void> | null` and awaits it. This prevents N parallel queries from each consuming a refresh token and tripping ADR-0012's "Token already used" 401 path.
   - **Contract parsing** at the boundary: response JSON is run through the relevant `@auto-tm/contracts` Zod schema (consumer-supplied as a per-call argument). Parse failures throw `ApiError("CONTRACT_VIOLATION", 502)` rather than returning untyped data.
   - **Typed error envelope**: a single `ApiError` class with `{ code: string; message: string; status: number; details?: unknown }` matching API §16 of `GRILL-OUTCOME.md`.
   - **No retry inside the wrapper** for network failures or 5xx — that's TanStack Query's job (it has retry + backoff built in).

3. **Query keys are flat arrays** scoped by context: `["catalog", "brands"]`, `["listings", "list", filters]`, `["listings", "detail", id]`, `["me"]`, `["conversations", "list"]`. A `apps/mobile/src/api/queryKeys.ts` module owns the factory functions so keys can't drift across screens.

4. **Hooks live under `apps/mobile/src/api/<context>/`** mirroring API bounded contexts: `apps/mobile/src/api/catalog/useBrands.ts`, `apps/mobile/src/api/listings/useListing.ts`, etc. Each hook is a thin `useQuery` / `useMutation` wrapper that calls `apiClient.get(...)` or `apiClient.post(...)` and returns the typed shape. No business logic in hooks.

5. **Mutations always invalidate** their related lists in `onSuccess`. Optimistic updates are added per-mutation (not by default) — case-by-case in the use-case sprints.

6. **Auth use-cases (`requestOtp`, `verifyOtp`, `refreshSession`, `logout`)** are migrated from `apps/mobile/src/auth/client.ts` to use the new wrapper. They become regular `useMutation` hooks under `apps/mobile/src/api/identity/`. This proves the refresh interceptor doesn't break the S2 flows and removes the duplicate fetch shape.

7. **`AsyncStorage`** is added as a peer dep but used only by TanStack Query's optional persister (`@tanstack/query-async-storage-persister`) IF and WHEN we decide we want cross-launch cache survival. The S3 foundations issue does **not** wire persistence — that's a later call after we see real cache-hit patterns. The line in `apps/mobile/CONTEXT.md` is rewritten to reflect this.

8. **The authoritative reference for this layer is `docs/agents/mobile-data-fetching.md`** — modeled on `docs/agents/nativewind-v4.md`. Every mobile-data-fetching-touching agent must read it. `CLAUDE.md`, `apps/mobile/CONTEXT.md`, and the S3-onward sprint files reference it.

Test strategy: hooks are tested at the application-equivalent layer with a `QueryClientProvider` wrapping a `renderHook` and `msw` (Mock Service Worker — works in React Native via `msw/native`) mocking the API. The wrapper itself has a unit test for the 401-refresh-retry path using `fetch-mock` or equivalent. No Testcontainers — that's a server-side concern.

## Consequences

### Positive

- One canonical data-fetching pattern across every mobile sprint. Wireframes, hi-fi specs, and implementation all reference the same hooks.
- Auth refresh is centralized. Every screen automatically benefits when ADR-0012's session-rotation contract changes. A future "force logout on token reuse" or "device-fingerprint pinning" change touches one file.
- Cache + invalidation + dedup come for free. Two screens reading the same listing share one network call. Toggling a favorite immediately reflects on both the list and the detail without manual refetch wiring.
- Stale-while-revalidate makes navigation feel instant: pre-cached data renders, network refresh fills in. Critical on metered TM mobile data.
- Mutations have a clean shape (`onMutate` / `onError` / `onSuccess` / `onSettled`) that handles optimistic updates and rollbacks without ad-hoc try/catch trees.
- Test pattern is uniform: `renderHook` + `QueryClientProvider` + `msw`. Onboarding agents learn it once.
- `AsyncStorage` is available for future cross-launch cache survival without re-deciding the stack.
- The boundary between server state (TanStack Query) and client state (React `useState` / context) is explicit. No accidental "everything in Redux."

### Negative / accepted costs

- **+~30KB to the JS bundle** from `@tanstack/react-query` (gzipped). Acceptable for a marketplace app of this scope.
- **Two new mental models**: query keys (hierarchical, used for invalidation) and the wrapper's refresh-dedup state machine. The agent guide covers both, but agents new to TanStack Query will spend an hour learning them.
- **`msw/native` setup work**: needs a polyfill chain for `Response` / `Request` / `Headers` in the RN runtime. One-time setup, but real.
- **`apiClient` is a single point of failure**: a bug in the refresh-retry path silently logs every user out. Compensated by tight unit testing of the wrapper.
- **S2's `apps/mobile/src/auth/client.ts`** is removed in the S3 foundations issue. Any code currently importing from it must move to the new hook paths. The S2 auth screens (`(auth)/phone`, `(auth)/otp`) are updated as part of the foundations work.
- **Refresh-dedup state is per `apiClient` instance**. If we ever ship multiple parallel app surfaces sharing one auth session (we don't plan to), the dedup wouldn't span them. Not a real concern in Phase 1.
- **Contract parsing on every response** has a small CPU cost. Negligible at Phase 1 scale; reconsider if Catalog brands payload (500+ rows) shows up in profiles.

### Neutral

- TanStack Query is unrelated to TanStack Router. We stay on `expo-router`.
- The choice doesn't constrain server-side fetching on `apps/web` or `apps/admin`. Each Next.js app makes its own data-layer call (likely Server Components + Next's built-in fetch). This ADR is mobile-scoped.
- WebSocket cache invalidation (Sprint 7, chat) is forward-compatible: a WS event handler calls `queryClient.setQueryData(...)` or `queryClient.invalidateQueries(...)`. No re-design needed.
- The wrapper's `ApiError` shape matches the API's error envelope; future server-side error code additions surface automatically.

## Alternatives considered

### Raw `fetch` everywhere (the status quo from S2)
Rejected. Every endpoint re-implements URL construction, header attachment, JSON parsing, and error mapping. Auth header attachment is forgotten in half the call sites by sprint 4. 401-refresh is either re-implemented per site (which won't happen) or just never handled, so users get silently logged out on the 15-minute access-token boundary. No cache, no dedup, two screens fetching the same data fire two network calls. Mutations require hand-rolling list refetches with race-condition risk. Loading and error states get re-derived per screen with no shared shape. The pattern doesn't survive S3, let alone S10.

### SWR (`useSWR`)
Rejected — close call. Smaller bundle and a simpler hook surface, and pairs well with Next.js (used heavily there). For React Native specifically, TanStack Query has a richer ecosystem: native focus manager bridge, async storage persister, devtools, and `msw/native` recipes. SWR's mutation story is also thinner — no `onMutate` / rollback primitive, no built-in invalidation graph. The bundle-size delta (~10KB) doesn't outweigh the feature-density gap for a marketplace app.

### Expo Router data loaders (`useLoaderData`)
Rejected. Expo Router introduced loaders that fetch in parallel with navigation, similar to React Router's loaders. Promising for route-level data, but they only solve the *initial load* problem — they have no caching, no invalidation, no mutation pattern, no refresh-on-focus, no WebSocket-driven update story. Useful as an *optimization* layered on top of TanStack Query later (preload a route's first query during navigation) but not a replacement for the cache layer.

### `urql` or Apollo with a REST link
Rejected. Both are designed around GraphQL. Forcing them onto a REST API adds a translation layer that buys nothing. We are not adopting GraphQL in Phase 1 per ADR-0002.

### `redux-toolkit-query` (RTK Query)
Rejected. Powerful and well-typed, but pulls in Redux as a dependency for the server-state layer, and Redux is overkill for our client-state needs (a couple of zustand-style stores at most). TanStack Query without Redux is closer to the actual shape of our app.

### Skip the wrapper; let TanStack Query call `fetch` directly
Rejected. TanStack Query handles cache + lifecycle, but does not own auth headers, refresh, or contract parsing. Without a wrapper, every `queryFn` reimplements all three. The wrapper is small (~100 LOC) and the lone owner of the refresh-retry state machine — that has to live somewhere, and it shouldn't be inlined into every hook.

### Defer the decision; build a wrapper later when "we need it"
Rejected — exactly what this ADR pre-empts. Every sprint that ships before this decision will inherit the S2 raw-fetch shape. The refactor cost grows linearly with the number of shipped screens. Better to commit before S3.

## References

- [ADR-0002](0002-stack.md) — Technology stack (declared NativeWind/Expo for mobile; left the data layer unspecified)
- [ADR-0006](0006-auth.md) — Phone OTP + action-gated auth (action-gated entry depends on having a reliable auth-aware data layer)
- [ADR-0012](0012-multi-device-sessions.md) — Multi-device sessions, 15-min access token + 30-day sliding refresh; the refresh contract this wrapper implements
- [ADR-0014](0014-mobile-component-library.md) — Mobile component library (same project-owned-source pattern that this ADR applies to data fetching)
- [`apps/mobile/CONTEXT.md`](../../apps/mobile/CONTEXT.md) — currently claims "React Query for server cache + mutations"; will be updated to reference the agent guide
- [`docs/agents/mobile-data-fetching.md`](../agents/mobile-data-fetching.md) — authoritative implementation guide (to be created alongside this ADR)
- [`docs/prd/sprints/sprint-03-catalog.md`](../prd/sprints/sprint-03-catalog.md) — first consumer of the new pattern
- [GitHub issue #53](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/53) — "S3 foundations: mobile data-fetching infrastructure" (the issue that implements this ADR)
- TanStack Query v5: https://tanstack.com/query/latest
- TanStack Query React Native focus integration: https://tanstack.com/query/latest/docs/framework/react/react-native
- `msw/native`: https://mswjs.io/docs/integrations/react-native

---

*This ADR was scaffolded by `/new-adr` on 2026-05-16.*
