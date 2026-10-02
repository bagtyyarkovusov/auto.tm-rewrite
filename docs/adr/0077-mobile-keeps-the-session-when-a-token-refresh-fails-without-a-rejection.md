# ADR-0077: Mobile keeps the session when a token refresh fails without a rejection

- **Status**: Accepted
- **Date**: 2026-10-02
- **Deciders**: AutoTM founder ([decision on issue #429, 2026-10-02](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/429), recorded by the queue orchestrator)
- **Amends**: [ADR-0063](0063-mobile-refreshes-an-expired-access-token-before-sending.md)'s refresh-failure bullet and its second accepted-cost line. The rest of ADR-0063 and ADR-0015 remains in force.

## Context

ADR-0063 states that when `/auth/refresh` answers with any non-2xx status, including a 5xx, or an unreadable body, the session is cleared and the request goes out anonymous. It lists the resulting silent sign-out on a transient 5xx as an accepted cost. That cost lands on the first feed load after the 15-minute access token lapses, because the pre-send refresh also runs before public reads.

The Standards review of PR #416 raised it as finding 1 ([issue #429](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/429)). The founder admitted the fix to the reviewer-only Android release.

The API's OpenAPI contract for `POST /auth/refresh` defines one rejection: `401` for an invalid, expired, revoked or already-used refresh token. A 5xx, a timeout, a network failure or a gateway page says nothing about whether the refresh token is still good.

The same issue records a wording error in ADR-0063. It says an unreadable body clears the session. In the shipped code a 2xx answer whose body is not JSON makes `res.json()` throw before `clearAuthSession()` runs, so that session was already kept. Only a 2xx JSON body that fails `RefreshResponseSchema` clears it.

## Decision

**The mobile API client clears the stored session only when `/auth/refresh` rejects the refresh token with a 401, or answers 2xx with a JSON body that fails `RefreshResponseSchema`. Every other failure keeps the session.**

- **Clears the session.** A 401 from `/auth/refresh`, and a 2xx JSON body that fails `RefreshResponseSchema` (a contract violation).
- **Keeps the session.** A 5xx or any other non-2xx status that is not 401, a network failure, a timeout, and a 2xx answer whose body is not JSON.
- **Pre-send refresh.** After a kept-session failure the request goes out with the old bearer, so a public route answers as before and a protected route still reaches the 401 path. The next request retries the refresh, because the token still reads as expired.
- **401 path.** When a protected request answered 401 and the refresh then fails without a rejection, the client cannot replay the request. It throws an `ApiError` whose code is `REFRESH_UNAVAILABLE`, with the refresh's status, or 502 for a non-JSON 2xx answer. It does not throw `UNAUTHENTICATED`, which the root layout treats as a sign-out signal. Network failures and timeouts keep their existing errors. The query layer's normal retry and pull-to-refresh try again, and the next request refreshes again.
- Hooks still never read tokens or refresh on their own. Refresh stays single-flight in `apps/mobile/src/api/client.ts`.

## Consequences

### Positive

- A brief server error or a bad network moment no longer signs the User out without telling them.
- A rejected refresh token still ends the session promptly, because 401 is the contract's rejection signal.

### Negative / accepted costs

- While `/auth/refresh` keeps failing without a 401, every request after the token lapses pays one more failed round trip before it is sent, up to the 15-second refresh timeout.
- A session the server has revoked stays on the device until the API next answers `/auth/refresh` with a 401. A long outage that coincides with a revoked session delays the sign-out for that period.
- A non-401 `4xx` from `/auth/refresh` (for example a 400 or 429) also keeps the session. The contract defines none of them as a rejection, so a future rejection status needs the contract and this rule updated together.

### Neutral

- The API's behaviour does not change.
- The first accepted-cost line and the third of ADR-0063 are unchanged.

## Alternatives considered

- **Keep ADR-0063's rule.** Rejected by the founder: a transient 5xx should not end a signed-in session.
- **Clear on any 4xx from `/auth/refresh`.** Rejected: the contract defines only 401, and a 429 or a gateway 4xx is not a verdict on the token.
- **Retry a 5xx inside `refreshOnce`.** Rejected for now: the next request already retries, and an in-wrapper retry loop would add latency to every public read during an outage.

## References

- Issue [#429](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/429); finding 1 of the Standards review of PR #416
- [ADR-0063](0063-mobile-refreshes-an-expired-access-token-before-sending.md) and [ADR-0015](0015-mobile-data-fetching.md)
- [`docs/agents/mobile-data-fetching.md`](../agents/mobile-data-fetching.md)
- `apps/mobile/src/api/client.ts` and `apps/mobile/src/api/client.spec.ts`
- `POST /auth/refresh` in `packages/contracts/src/openapi.ts`
