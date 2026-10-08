# ADR-0092: Temporary failure limits for fixed-code phone sign-in

- **Status**: Proposed
- **Date**: 2026-10-08
- **Deciders**: AutoTM founder, with implementation direction in [issue #765's PR](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/766)
- **Supersedes**: [ADR-0030](0030-reviewer-demo-account-otp-bypass.md)'s guarantee that a reviewer is never locked out mid-review. The fixed-code verifier now applies a bounded temporary lock instead; the phone code-request exemption remains.
- **Amends**: [ADR-0086](0086-temporary-tester-accounts-with-fixed-sign-in-codes.md)'s same-sign-in rule for testers to include this shared verification budget.

## Context

Reserved reviewer and tester phones have reusable six-digit codes and no issued Sign-in Code request. The ordinary verifier counts failures on an issued request, so it cannot count these guesses. PR #764 corrected the invalid-code response and preserved the same response for a correct code whose reserved User is absent or privileged; its review identified the unbounded guesses in #765.

At the current 60 requests per minute per IP, one IP could exhaust one million codes in about 11.6 days. More IPs shorten that time. The demo accounts can post Listings and send Messages, so their ordinary marketplace roles do not make takeover harmless. Review access also must recover without an operator clearing a permanent lock.

## Decision

**Reserved reviewer and tester phone sign-ins share a per-destination budget of five failures within 15 minutes, followed by a 15-minute lock starting at the fifth failure.**

- The first failure starts the failure window. Before the threshold, expiry clears the partial count. The fifth failure starts a full 15-minute lock, even near the end of the failure window. Expiry restores a fresh budget.
- A successful sign-in deletes the failure count. The fixed codes are reusable, so an account that signs in correctly starts each review session with a fresh budget; only consecutive failures lock a destination.
- The existing identity BullMQ Redis connection stores the counter under an identity-owned key prefix (`identity:reserved-phone-attempt:`), outside the BullMQ queue namespace, so queue lifecycle operations such as obliterate cannot clear locks. Keys hold an unsalted SHA-256 digest of the destination; E.164 numbers have low entropy, so a digest is reversible by dictionary. This is accepted: the keys reveal only what the rate-limited endpoint already allows probing.
- An atomic Lua operation resets on success, checks the lock, and counts a failure, so concurrent requests across API instances share the same budget. Redis expiry owns the deadline across instance clocks; a key that somehow loses its TTL is re-armed with the lock TTL rather than locking a destination forever. Codes are never stored. This creates no new service, schema or migration. The probe has a two-second timeout; a Redis error or timeout fails closed as an `OTP_LOCKED` refusal instead of an unlimited bypass or a hung request.
- Only reserved phone sign-ins probe the ledger. Ordinary phone sign-in returns before the probe, so it gains no Redis dependency and no new failure mode. Wrong codes count without an issued request. Refused fixed-code attempts for absent or privileged reserved Users also count, so the threshold cannot confirm a code for an ineligible account. During a lock, every code is refused before Session creation or successful-sign-in audit emission.
- The fifth failure and blocked retries use the existing `OTP_LOCKED` response with the message "Too many failed attempts. Wait 15 minutes and try again.", with no new details. Earlier failures use the existing `INVALID_OTP` response. The message is shared with the ordinary stored-request lock, so it cannot distinguish reserved phones. Full-list constant-time credential comparisons remain. Reserved User lookup does not depend on whether the code matches.
- Blocked retries, correct codes, resends, and API restarts do not extend or clear a lock. Redis probe failures refuse authentication rather than fall back to unlimited reserved verification.
- Reserved email remains on stored requests, with five wrong attempts per request, ten-minute expiry, consume-once, five requests per address per 24 hours, and the shared per-IP request budget. It has no stateless verification gap. Ordinary Users' code issuance, attempt limits, expiry and consumption remain unchanged.
- Ship this protection before production tester provisioning or reviewer use. Submission-pack section 6 tells reviewers to wait 15 minutes after repeated wrong phone codes, rather than repeatedly retry or resend.

## Consequences

### Positive

- IP distribution cannot increase one reserved phone's guessing budget. Exhausting one million phone guesses takes roughly 2,083 days, or 5.7 years, at five guesses per 15-minute lock. Average exhaustive-search success is about half that time. Across all 35 reserved phones the budget aggregates to about 16,800 wrong-code guesses per day (35 × 480), roughly a 1.7% daily chance of hitting some account's code when every reserved phone is known. The separate reserved-email channel admits at most 25 wrong guesses per day under its existing daily request limit.
- A lock ends after 15 minutes without operator intervention. Repeated blocked attempts cannot postpone that deadline, and a correct sign-in clears the failure count.
- Reviewer and tester access still uses reusable fixed codes outside the lock, with the existing ordinary-role, suspension and audit protections.

### Negative / accepted costs

- Anyone who knows a reserved destination can deny its sign-in with five wrong codes per 15 minutes — about 12 requests per minute covers all 35 reserved phones — and can re-lock it after each expiry. A reviewer can switch to another reserved account or the email path, subject to that path's limits, so this is a temporary denial of one destination, not of review access. This accepted cost is stated plainly here for the founder's explicit acceptance.
- Enabled phone sign-in for reserved destinations depends on the existing Redis service for the probe; a Redis outage refuses reserved phone sign-in until Redis recovers. Ordinary phone sign-in does not probe Redis and is unaffected. Loss or eviction of Redis counter data can lose a temporary budget. The shared Redis data plane must retain its existing persistence and availability; no new production infrastructure is introduced or verified by this PR.
- Fixed codes remain secrets with only one million possibilities. This policy limits online guessing and does not protect a disclosed code.

### Neutral

- Merged ADRs remain unchanged. This record supersedes only the verification exemption; phone code requests still return without sending, storing an issued code, or enforcing the daily issuance limit.
- No API schema, email delivery, contact-phone verification, deletion or Sign-in Method change changes. Mobile and API copy for the existing `OTP_LOCKED` state now says to wait 15 minutes and try again, because a new code request cannot clear the lock.

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
