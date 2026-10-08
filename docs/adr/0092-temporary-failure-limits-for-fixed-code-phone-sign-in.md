# ADR-0092: Temporary failure limits for fixed-code phone sign-in

- **Status**: Proposed
- **Date**: 2026-10-08
- **Deciders**: AutoTM founder, implementation direction in [issue #765's PR](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/766); final acceptance pending before merge
- **Supersedes**: [ADR-0030](0030-reviewer-demo-account-otp-bypass.md)'s exemption insofar as it permits unlimited fixed-code phone verification attempts. The phone code-request exemption remains.
- **Amends**: [ADR-0086](0086-temporary-tester-accounts-with-fixed-sign-in-codes.md)'s same-sign-in rule for testers to include this shared verification budget.

## Context

Reserved reviewer and tester phones have reusable six-digit codes and no issued Sign-in Code request. The ordinary verifier counts failures on an issued request, so it cannot count these guesses. PR #764 corrected the invalid-code response and preserved the same response for a correct code whose reserved User is absent or privileged; its review identified the unbounded guesses in #765.

At the current 60 requests per minute per IP, one IP could exhaust one million codes in about 11.6 days. More IPs shorten that time. The demo accounts can post Listings and send Messages, so their ordinary marketplace roles do not make takeover harmless. Review access also must recover without an operator clearing a permanent lock.

## Decision

**Reserved reviewer and tester phone sign-ins share a per-destination budget of five failures within 15 minutes, followed by a 15-minute lock starting at the fifth failure.**

- The first failure starts the failure window. Before the threshold, expiry clears the partial count. The fifth failure starts a full 15-minute lock, even near the end of the failure window. Expiry restores a fresh budget.
- The existing identity BullMQ Redis connection stores the counter. An atomic Lua operation checks the lock and counts a failure, so concurrent requests across API instances share the same budget. Redis expiry owns the deadline across instance clocks. Keys use the queue namespace and a SHA-256 destination digest; codes are never stored there. This creates no new service, schema or migration.
- Wrong codes count without an issued request. Refused fixed-code attempts for absent or privileged reserved Users also count, so the threshold cannot confirm a code for an ineligible account. Correct codes for existing ordinary Users do not clear the failure count. During a lock, every code is refused before Session creation or successful-sign-in audit emission.
- The fifth failure and blocked retries use the existing `OTP_LOCKED` response, with its existing message and no new details. Earlier failures use the existing `INVALID_OTP` response. Full-list constant-time credential comparisons remain. Every enabled phone sign-in makes the same Redis probe, but ordinary phones create no counters and ignore reserved lock state. Reserved User lookup does not depend on whether the code matches.
- Blocked retries, correct codes, resends, and API restarts do not extend or clear a lock. Redis failures refuse authentication rather than fall back to unlimited reserved verification.
- Reserved email remains on stored requests, with five wrong attempts per request, ten-minute expiry, consume-once, five requests per address per 24 hours, and the shared per-IP request budget. It has no stateless verification gap. Ordinary Users' code issuance, attempt limits, expiry and consumption remain unchanged.
- Ship this protection before production tester provisioning or reviewer use. Submission-pack section 6 tells reviewers to wait 15 minutes after repeated wrong phone codes, rather than repeatedly retry or resend. The founder accepts this proposed ADR before merging the implementation.

## Consequences

### Positive

- IP distribution cannot increase one reserved phone's guessing budget. Exhausting one million phone guesses takes roughly 2,083 days, or 5.7 years, at five guesses per 15-minute lock. Average exhaustive-search success is about half that time. The separate reserved-email channel admits at most 25 wrong guesses per day under its existing daily request limit.
- A lock ends after 15 minutes without operator intervention. Repeated blocked attempts cannot postpone that deadline.
- Reviewer and tester access still uses reusable fixed codes outside the lock, with the existing ordinary-role, suspension and audit protections.

### Negative / accepted costs

- An attacker who knows a reserved destination can trigger temporary denial of sign-in and can trigger another lock after expiry. This does not guarantee access during a sustained attack. Reviewers can use another reserved account or the existing email path, subject to that path's limits.
- Enabled phone sign-in depends on the existing Redis service for the uniform probe. Loss or eviction of Redis counter data can lose a temporary budget. The shared Redis data plane must retain its existing persistence and availability; no new production infrastructure is introduced or verified by this PR.
- Fixed codes remain secrets with only one million possibilities. This policy limits online guessing and does not protect a disclosed code.

### Neutral

- Merged ADRs remain unchanged. This record supersedes only the verification exemption; phone code requests still return without sending, storing an issued code, or enforcing the daily issuance limit.
- No API schema, mobile UI, email delivery, contact-phone verification, deletion or Sign-in Method change changes.

## Alternatives considered

- **Keep only the global per-IP limit.** Rejected because distributing IPs defeats it and fixed codes do not expire.
- **Permanent attempt lock.** Rejected because an attacker could deny store-review access until an operator intervenes.
- **Count per API process or issued request.** Rejected because instance changes or the absence of an issued phone request defeat that budget.
- **Create a new database ledger or service.** Rejected because the module already has a shared Redis connection and expiring counters need no new infrastructure.
- **Extend the deadline on every retry.** Rejected because an attacker could keep the reviewer locked indefinitely with blocked requests.

## References

- [Issue #765](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/765), [PR #764 review](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/764)
- [ADR-0030](0030-reviewer-demo-account-otp-bypass.md), [ADR-0086](0086-temporary-tester-accounts-with-fixed-sign-in-codes.md)
- [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md), [ADR-0055](0055-resend-sends-sign-in-codes-from-the-worker.md)
- [Identity context](../../apps/api/src/modules/identity/CONTEXT.md), [submission pack section 6](../prd/ops/88-play-console-submission.md#6-reviewer-access-instructions-template)
