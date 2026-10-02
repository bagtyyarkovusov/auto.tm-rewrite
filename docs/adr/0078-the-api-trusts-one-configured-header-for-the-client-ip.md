# ADR-0078: The API trusts one configured header for the client IP

- **Status**: Proposed (recommended by the queue orchestrator on [issue #426](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/426); needs founder acceptance before merge)
- **Date**: 2026-10-02
- **Deciders**: AutoTM founder; drafted by the queue implementer for issue #426
- **Amends**: [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md)'s per-IP Sign-in Code budget by fixing which address it counts. [ADR-0039](0039-phased-cloud-first-hosting.md)'s hosting constraint stays: the rule is configuration, not a Railway-only assumption.

## Context

The per-IP Sign-in Code budget (10 per hour, shared by sign-in, add/change and web deletion codes) read the first `X-Forwarded-For` entry in three controllers, falling back to the peer address. The first entry is the one a caller writes, so a direct caller could rotate it and escape the budget. The API sets no `trustProxy`, so the global throttler (60 per minute) keyed on the peer address, which behind Railway is the proxy hop. Every visitor reaching the API through one hop shared one bucket.

Railway's public networking specification lists `X-Real-IP` as the client's remote IP and does not document `X-Forwarded-For` ([specs and limits](https://docs.railway.com/networking/public-networking/specs-and-limits#technical-specifications)). The web server forwards the visitor's `X-Real-IP` to the API on Railway's private network, where no edge sits between them.

Fastify's `trustProxy` cannot express this. It reads only `X-Forwarded-*`, and its documentation warns that trusting a hop count alone is unsafe when the origin can be reached directly (Context7, `/fastify/fastify`).

## Decision

**One helper, `resolveClientIp` in `apps/api/src/common/client-ip.ts`, is the only place the API derives a caller's IP. The Sign-in Code budget in `AuthController`, `MeController` and `AccountDeletionController` and the global throttler (`ClientIpThrottlerGuard`) both use it.**

- **Trusted source.** The header named by `CLIENT_IP_HEADER`, default `x-real-ip`, which Railway's edge sets. A client-supplied `X-Forwarded-For` is not read under the default.
- **Configurable header and hop.** `CLIENT_IP_HEADER=x-forwarded-for` reads that list and takes the entry `CLIENT_IP_TRUSTED_HOPS` places from the right (default 1), so a reverse proxy we run on the TM topology (ADR-0005) works without code. Any other header name is read as one address. `CLIENT_IP_HEADER=none` trusts no header and uses the peer address, for an API reachable directly. Both variables are validated at boot; an invalid value that reaches the helper trusts no header.
- **Fail toward sharing, never toward the caller.** A missing header, a repeated header, a list where one address is expected, a port, a zone id or a non-address falls back to the peer address. The fallback shares a bucket instead of letting the caller choose one. IPv4-mapped IPv6 addresses count as the IPv4 address.
- **Server-to-server calls.** A service that calls the API on the private network forwards the visitor's address in the trusted header, as web does with `X-Real-IP`. A caller on that network is trusted to set it; nothing outside Railway reaches the private origin.
- **Other ingress.** Any ingress added in front of the API must set or overwrite the trusted header, or callers choose their own budget. The operator who adds one changes `CLIENT_IP_HEADER` and `CLIENT_IP_TRUSTED_HOPS` to match.

### Verification on Railway

Whether the edge overwrites a client-supplied `X-Real-IP` and `X-Forwarded-For` is a property of Railway, not of this code. It must be shown on an agent PR environment (ADR-0075), never staging or production, before this ADR is accepted: send requests from one client with rotating `X-Real-IP` and `X-Forwarded-For` values and confirm the per-IP budget still counts one client. If a client can override the edge value, this rule does not hold on Railway and the decision returns to the founder.

## Consequences

- Reviewers and visitors no longer share one Sign-in Code budget or one throttler bucket, and a caller cannot rotate a header to escape either.
- The throttler's bucket is per handler and per address, as before; only the address changes.
- A request that reaches the API without the trusted header (health probes from inside the platform, a misconfigured ingress) is counted against the peer address. That is the previous throttler behaviour.
- An attacker with many real addresses, including a whole IPv6 prefix, still has many budgets. This rule fixes spoofing, not distribution.
- The web server's `X-Forwarded-For` fallback for local development no longer reaches the API as `X-Forwarded-For`; web sends `X-Real-IP`.
- Moving to TM hosting means setting two variables at the new ingress, not changing code.

## References

- [Issue #426](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/426)
- [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md), [ADR-0039](0039-phased-cloud-first-hosting.md), [ADR-0075](0075-railway-pr-backends-for-agent-native-sessions.md)
- [Railway public networking specs](https://docs.railway.com/networking/public-networking/specs-and-limits#technical-specifications)
