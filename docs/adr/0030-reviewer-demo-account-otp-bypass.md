# ADR-0030: Reviewer demo-account OTP bypass for store review

- **Status**: Accepted
- **Date**: 2026-06-07
- **Deciders**: AutoTM founder + AI architect

## Context

Authentication is phone OTP, `+993`-only (ADR-0006, charter §17), routed through TM SIMs on the custom Android SMS gateway.

For a public App Store / Google Play listing, Apple and Google reviewers — who sit abroad — must be able to fully run the app (Apple Guideline 2.1 completeness; Guideline 1.2 requires usable moderation/report/block on a UGC app). A reviewer has no `+993` SIM and therefore cannot receive an OTP. The production backend `api.auto.tm` is reachable from abroad, so reviewers can reach the server; the only wall is OTP delivery.

A public store build points at production, and Apple re-reviews on every app update — so any reviewer-auth mechanism lives in the production auth path permanently, not in a throwaway test build. The existing `SMS_DRIVER` model (charter §17) has `test` (returns the code in the response — CI only), `mock` (fake success — dev), and `gateway` (real phones — production); none is a production-safe way to let one specific external reviewer in.

This decision is the companion to ADR-0029 (delivery): ADR-0029 gets the binary and updates to users; this ADR gets a reviewer past login.

## Decision

**A single reserved demo account bypasses SMS OTP in production, scoped as narrowly as possible.**

- Exactly one reserved E.164 `+993` number — one that can never be issued to a real user — accepts a fixed OTP (`12345`). Every other number goes through the real gateway unchanged.
- Constraints on the bypass:
  - Constant-time comparison of both the reserved number and the fixed code.
  - The demo account has **normal buyer/seller privileges only** — never moderator or admin.
  - It is **exempt from the OTP rate limits** (charter §17: 5/phone/day, 10/IP/hour) so a reviewer is never locked out mid-review.
  - It is gated behind an explicit server flag (e.g. `REVIEW_DEMO_ACCOUNT_ENABLED`), disabled by default and enabled only in environments backing a store submission.
  - Every login through the bypass emits an audit record.
  - The reserved number and code are documented only in App Store Connect / Google Play review notes — never shared with real beta testers, who authenticate with real OTPs.
- Seeded demo content exists so a reviewer can exercise post / contact / report / block to satisfy Guideline 1.2.

## Consequences

### Positive

- Unblocks Apple/Google review despite `+993`-only OTP, without weakening real-user authentication.
- Standard, well-understood pattern for phone-auth apps under store review.
- Auditable and flag-gated; the bypass can be disabled whenever no submission is in flight (subject to the re-review caveat below).

### Negative / accepted costs

- It is a standing authentication bypass in production. Even narrowly scoped, it is an attack surface: anyone who learns the reserved number + fixed code can sign in as the demo user (normal privileges only).
- Because Apple re-reviews on every update, the flag generally must remain enabled while the app is publicly listed and actively updated — so the bypass is effectively permanent, not just present during the first review.
- Requires disciplined custody of the reserved number and code; rotating the code is a coordinated server change.

### Neutral

- Extends the `SMS_DRIVER` model (charter §17) with a production-safe, single-number short-circuit that is distinct from the `test` driver's response-embedded code.
- Lives in the identity context; `apps/api/src/modules/identity/CONTEXT.md` is updated when the bypass ships (not before, per ADR-0019).

## Alternatives considered

- **Point review builds at a public staging backend with seeded data.** Rejected as the primary path: a public store build serves all users from one binary, so you cannot easily route only reviewers to staging, and a different backend host can draw reviewer scrutiny. Retained as a possible future hardening of the bypass.
- **Provision a real `+993` SIM for reviewers and relay its SMS.** Rejected: brittle (reviewer timing, SMS relay latency, phone health) and still routes the code through the abroad↔TM path — far less reliable than a fixed code.
- **Add an email/OAuth auth factor for review only.** Rejected: introduces an auth method the product otherwise does not want (charter is phone-OTP-only; Sign-in-with-Apple is explicitly not required per 84-launch-plan).
- **No bypass; submit a demo video instead.** Rejected: Apple requires the app itself to be fully usable by the reviewer for a login-gated UGC app; a video does not satisfy Guidelines 2.1 / 1.2.

## References

- [ADR-0006](0006-auth.md) — Phone OTP + custom Android SMS gateway
- [ADR-0012](0012-multi-device-sessions.md) — Multi-device sessions
- [ADR-0027](0027-mlp-beta-scope.md) — MLP beta scope before full marketplace MVP
- [ADR-0029](0029-self-hosted-ota-air-gap-delivery.md) — Self-hosted OTA + hybrid delivery (companion delivery decision)
- Charter §6 (authentication), §17 (SMS_DRIVER, phone validation)
- [docs/prd/ops/84-launch-plan.md](../prd/ops/84-launch-plan.md) — Compliance / review checklist
- Apple App Store Review Guidelines 2.1 (completeness), 1.2 (user-generated content); Google Play app review policy
