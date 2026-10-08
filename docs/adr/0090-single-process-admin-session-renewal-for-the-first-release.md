# ADR-0090: Single-process admin session renewal for the first release

- **Status**: Accepted
- **Date**: 2026-10-08
- **Deciders**: AutoTM founder

## Context

Issue [#743](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/743) requires session renewal for working admin operators, including overlapping GET requests and Server Actions. The API rotates refresh tokens once by replacing the stored hash atomically; a losing request cannot recover the new plaintext pair. Next.js Server Components cannot persist rotated cookies. Moving refresh into a writable request boundary requires coordination; process-local state cannot coordinate multiple workers or survive a restart.

On 2026-10-08 the founder accepted the orchestrator's Option 2 recommendation in chat: the first release has one or two operators and exactly one admin process on Railway. This complements ADR-0039's hosting plan without changing the API implementation or its stored session rules.

## Decision

First-release admin runs as exactly one Node process in one Railway replica until a shared session store exists. Its Node request proxy renews before rendering or Server Action dispatch, with process-local single-flight coordination keyed by SHA-256 of the old refresh token and a memory-only handoff of successful rotated pairs for five seconds, bounded to 128 pending or completed entries. It never logs tokens or changes API identity code, token lifetimes, the API’s refresh reuse detection or TOTP elevation deadlines. Missing refresh or an API 400/401 rejection clears both cookies and ends at login. Capacity, timeouts, network errors, unexpected responses and API 429/5xx produce temporary unavailability with cookies intact. No failed action executes or automatically replays.

## Consequences

### Positive

- Active operators can continue through access expiry, including near-simultaneous requests, without another Sign-in Code.
- Renewal writes browser cookies and forwards the same pair to the original request.
- API identity code and stored rotation/reuse rules remain unchanged; no new shared infrastructure is required by this code change.

### Negative / accepted costs

- Admin cannot scale to a second process or replica until the shared-store follow-up in [#746](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/746) is implemented.
- The admin accepts a replay of an old refresh token within its five-second handoff window and returns the cached new pair without calling the API. Possession of the old token is sufficient during this window; a stolen token can receive the rotated pair. This widens end-to-end replay acceptance even though API reuse detection itself is unchanged. The cache is process-local, hash-keyed, bounded and promptly expires.
- Restart, cross-process overlap or expired handoff can expose a spent token to API rejection and require sign-in. Capacity and outages preserve cookies and require retry. No late spent-token retry is added in this round.
- A session-expired URL alone cannot clear a healthy session. Current sessions bypass the expiry form, renewable sessions renew, and only missing/API-rejected refresh ends at login. No forced-logout-by-link trade-off remains.
- Failed expired actions do not execute or replay. After temporary unavailability the operator retries; after rejection the operator signs in and submits again.
- Rotated plaintext pairs exist briefly in process memory. One pending owner serializes API admission so unvalidated random cookies cannot occupy the handoff capacity. A ten-second network/wait deadline bounds admission, and timed deletion releases successful pairs even without incoming traffic.

### Neutral

- Deployment documentation and environment templates expose the process/replica constraint; this PR does not deploy or change Railway variables.
- Next.js 16.2.6 `proxy.ts` uses Node by default. Its general prohibition on relying on shared state remains a constraint outside this explicitly limited deployment.

## Alternatives considered

- **Shared session coordinator/store now** — preferred for multiple processes, deferred by the founder for the small first-release operator group.
- **Browser-coordinated renewal** — does not transparently resume expired POST/Server Actions without a separate recovery contract.
- **Relax API reuse detection or extend lifetimes** — excluded by the issue and founder decision.

## References

- [ADR-0012: Multi-device sessions](0012-multi-device-sessions.md)
- [ADR-0039: Phased cloud-first hosting](0039-phased-cloud-first-hosting.md)
- [Admin overview](../../apps/admin/CONTEXT.md)
- [Deployment runbook](../prd/ops/80-deployment-runbook.md)
- [Next.js 16.2.6 proxy contract](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx)
