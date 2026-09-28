# Mobile data fetching

Use this guide when changing mobile API calls, server-state caching, refresh, or realtime reconciliation. [ADR-0015](../adr/0015-mobile-data-fetching.md) records the architecture. Query Context7 for the specific TanStack Query or native-library API involved; use [documentation lookups](documentation-lookups.md).

## Ownership

| Concern | Implementation to inspect |
|---|---|
| Transport, locale header, contract parsing, errors, single-flight refresh | [api/client.ts and colocated tests](../../apps/mobile/src/api/client.ts) |
| Secure token persistence and session notifications | [auth/session.ts](../../apps/mobile/src/auth/session.ts) |
| Query client, app focus, connectivity, auth transitions | [app/_layout.tsx](../../apps/mobile/app/_layout.tsx) |
| Shared query keys | [api/queryKeys.ts](../../apps/mobile/src/api/queryKeys.ts) and feature key factories |
| Existing query/mutation patterns and tests | [src/api](../../apps/mobile/src/api) |
| Error copy | [getErrorCopy.ts](../../apps/mobile/src/api/getErrorCopy.ts) |
| Native test environment and aliases | [vitest.config.ts](../../apps/mobile/vitest.config.ts) |

The wrapper already exists. Do not paste a new client or QueryClient provider from a setup tutorial. Preserve one owner for refresh, secure storage, connectivity, and session transitions.

## Change a query or mutation

1. Inspect the owning contract and an existing hook with the same pagination/auth needs. Schema presence does not establish that the API implements the endpoint.
2. Use `apiClient` for API requests, with the response's shared Zod schema where a body exists. Hooks do not read tokens or implement a second 401 refresh path. Direct presigned object-storage transfers are a separate upload boundary, not an alternative API client.
3. Use key factories and include every value that changes returned data, including locale or filters where relevant. Distinguish user-owned cache data from public data and verify identity changes cannot expose the previous User's cache.
4. Keep forms, modal state, filters under edit, typing, and connection state in their appropriate local stores. Query cache owns server JSON, not image bytes, upload files, or an offline database.
5. For optimistic mutations, inspect all affected list/detail keys. Cancel conflicting queries, snapshot and patch, roll back on failure, then reconcile with server state. Test failure and concurrent/refetch paths, not only the happy path.
6. Use the shared error mapping and screen ErrorState. A surfaced authentication failure has already passed the wrapper's retry path; follow the existing auth transition instead of looping another refresh.

## Refresh and realtime

The root layout connects AppState to focusManager and NetInfo to onlineManager. Preserve stale-data refetch on foreground/reconnect and use pull-to-refresh where appropriate. Do not install another connectivity package or global polling loop to duplicate that ownership.

HTTP loads durable state. Socket events may patch/invalidate caches; reconnect must reconcile with HTTP so missed events do not become permanent gaps. Upload staging and the chat outbox are separate local reliability mechanisms. Cached query data is not a promise of full offline listing/chat support.

When debugging a missing request, distinguish disabled queries, offline-paused requests, fresh cache, wrong keys, and actual transport failure. When debugging refresh races, start at `refreshInFlight` and its tests in the client. When debugging stale chat, inspect reconnect invalidation and the recent-message window.

## Verification

Run client and affected hook tests, including schema rejection, failed mutations, cache invalidation, and auth transitions relevant to the change. Reuse the repository's native test mocks and aliases; do not hide native parsing failures by replacing behavior with an unrelated web renderer.

Run mobile lint/typecheck and the [mobile/Expo gate](mobile-expo.md), including dependency check and iOS export. Exercise the affected screen against the API in a development build when claiming runtime behavior. Observe reconnect, loading/empty/error states, and sign-out/sign-in if the changed flow uses private data. Record unavailable device or service evidence honestly.
