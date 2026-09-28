# ADR-0063: Mobile refreshes an expired access token before sending

- **Status**: Accepted
- **Date**: 2026-09-28
- **Deciders**: AutoTM founder
- **Extends**: [ADR-0015](0015-mobile-data-fetching.md)'s refresh contract, which refreshes only after a 401. The rest of ADR-0015 remains in force.

## Context

ADR-0015 makes `apps/mobile/src/api/client.ts` the only module that calls the API, and the only owner of token refresh. It refreshes once after a 401 and replays the request. That covers protected routes. Public routes that personalise their answer, such as the feed's `isFavorited`, treat an expired bearer as anonymous and answer 200, so the 401 path never runs. After the 15-minute access token lapses, a signed-in User's feed silently loses every ♥ until something else triggers a refresh ([issue #367](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/367), PR #416).

The access token is a JWT that carries `exp` and `iat`, both set by the API's `JwtService.sign`. The device stores it with `storedAt`, the time the device received it. Device clocks can be wrong by minutes or hours.

## Decision

**The mobile API client also refreshes before sending an authenticated request when the stored access token has passed its lifetime, measured on the device from `storedAt`.**

- The lifetime is the token's own `exp - iat`, counted from `storedAt`, with a 30-second margin. The device clock's offset from the server does not matter.
- A token whose payload, `exp`, `iat` or `storedAt` cannot be read counts as not expired, so the existing 401 path is the fallback.
- The pre-send refresh uses the same single-flight refresh as the 401 path, so concurrent requests share one `/auth/refresh`. A retried request does not refresh before sending again.
- If the server rejects the refresh, the session is cleared, as on the 401 path, and the request goes out anonymous. If the refresh fails on the network or times out, the session is kept and the request goes out with the old bearer; a protected route still reaches the 401 path.
- Hooks still never read tokens or refresh on their own.

## Consequences

### Positive

- Public, personalised responses stay personalised after the access token lapses.
- A wrong device clock cannot cause a refresh before every request, or no refresh at all.
- The refresh stays in the one module ADR-0015 assigns it to.

### Negative / accepted costs

- The first request after the token lapses costs one extra round trip, including on public reads.
- A rejected refresh on a public read signs the User out silently, as the 401 path already does for protected routes.
- The lifetime estimate trusts the device's clock between `storedAt` and now; changing the device clock in between can make it refresh early or late, and the 401 path still covers protected routes.

### Neutral

- The API's behaviour does not change.

## Alternatives considered

- **Public routes answer 401 to an expired bearer.** Rejected: signed-out browsing would turn into errors whenever a stale token is present, and every public route would need the change.
- **Compare `exp` with the device clock.** Rejected: a phone whose clock runs ahead would refresh before every request.
- **Refresh on a timer.** Rejected: it spends metered data while the app is idle and still misses requests sent just after expiry.

## References

- [ADR-0012](0012-multi-device-sessions.md) - access and refresh tokens
- [ADR-0015](0015-mobile-data-fetching.md) - mobile data fetching and the API client
- [`docs/agents/mobile-data-fetching.md`](../agents/mobile-data-fetching.md)
- `apps/mobile/src/auth/accessTokenExpiry.ts` and `apps/mobile/src/api/client.ts`
