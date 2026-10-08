# ADR-0089: Single-process admin session renewal for the first release

- **Status**: Accepted
- **Date**: 2026-10-08
- **Deciders**: AutoTM founder

## Context

Issue [#743](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/743) requires session renewal for working admin operators, including overlapping GET requests and Server Actions. The API rotates refresh tokens once by replacing the stored hash atomically; a losing request cannot recover the new plaintext pair. Next.js Server Components cannot persist rotated cookies. Moving refresh into a writable request boundary requires coordination; process-local state cannot coordinate multiple workers or survive a restart.

On 2026-10-08 the founder accepted the orchestrator's Option 2 recommendation in chat: the first release has one or two operators and exactly one admin process on Railway. This complements ADR-0039's hosting plan and preserves ADR-0012's session security rules.

## Decision

First-release admin runs as exactly one Node process in one Railway replica until a shared session store exists. Its Node request proxy renews before rendering or Server Action dispatch, with process-local single-flight coordination keyed by SHA-256 of the old refresh token and a memory-only handoff of successful rotated pairs for five seconds, bounded to 128 pending or completed entries. It never logs tokens or changes API identity behavior, token lifetimes, refresh reuse detection or TOTP elevation deadlines. A failed renewal clears both cookies and redirects to login; a pending action is canceled before execution and is never automatically replayed.

## Consequences

### Positive

- Active operators can continue through access expiry, including near-simultaneous requests, without another Sign-in Code.
- Renewal writes browser cookies and forwards the same pair to the original request.
- API session security remains unchanged; no new infrastructure or production configuration changes are required by this code change.

### Negative / accepted costs

- Admin cannot scale to a second process or replica until the shared-store follow-up in [#746](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/746) is implemented.
- Restart, cross-process overlap, cache expiry/capacity or rejected refresh can require sign-in. Failed expired actions do not execute; operators submit again after sign-in.
- Rotated plaintext pairs exist briefly in process memory. A ten-second network deadline bounds pending owners, and timed deletion releases successful pairs even without incoming traffic.

### Neutral

- Deployment documentation and environment templates expose the process/replica constraint; this PR does not deploy or change Railway variables.
- Next.js 16.2.6 `proxy.ts` uses Node by default. Its general prohibition on relying on shared state remains a constraint outside this explicitly limited deployment.

## Alternatives considered

- **Shared session coordinator/store now** — preferred for multiple processes, deferred by the founder for the small first-release operator group.
- **Browser-coordinated renewal** — does not transparently resume expired POST/Server Actions without a separate recovery contract.
- **Relax API reuse detection or extend lifetimes** — excluded by the issue and founder decision.

## References

- [ADR-0012: Auth refresh strategy](0012-auth-refresh-strategy.md)
- [ADR-0039: Phased cloud-first hosting](0039-phased-cloud-first-hosting.md)
- [Admin overview](../../apps/admin/CONTEXT.md)
- [Deployment runbook](../prd/ops/80-deployment-runbook.md)
- [Next.js 16.2.6 proxy contract](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx)
