# ADR-0032: Account deletion — 30-day grace, tombstone-retain content, recoverable by login

- **Status**: Accepted
- **Date**: 2026-06-09
- **Deciders**: AutoTM founder + AI architect

## Context

The S2 `DeleteMe` use-case (`DELETE /api/v1/me`) **hard-deletes the `User` row**, and Prisma `onDelete: Cascade` then wipes sessions, owned vehicles, blocked-user links, dealership memberships, favorites, saved searches, FCM devices, notification history/preferences, conversation participants, **buyer-side conversations + messages**, **seller listings**, and blog posts. Only `AuditLog.actorId` survives (set NULL).

That behavior **destroys counterparties' data**: a seller who deletes her account erases every buyer's conversation history about her cars. For the S8 private beta this is unacceptable on two counts:

- **Legal posture** — the beta needs a recoverable, grace-period deletion that preserves moderation/audit trails, not an irreversible cascade.
- **App-store review** — Apple and Google both require an in-app account-deletion path and actively test it (a common rejection point per `docs/prd/ops/84-launch-plan.md`).

`identity/CONTEXT.md` (line 126) and the S8 DoD already mandate the replacement shape: 30-day grace, session revocation, listing archive, recovery, day-30 PII purge, and preserved `AuditLog` / S7 `ContentReport` actor references via nullable-after-delete. This ADR records the **content-retention model** and **recovery semantics** decided in the S8 design grill, which those documents left open.

## Decision

1. **Deletion request** — `DELETE /api/v1/me` starts a **30-day grace period**: set `User.deletionScheduledAt = now + 30d`, **revoke all refresh sessions** (log out everywhere), and **archive the user's active listings**, tagged (`archivedByDeletion`) so recovery can distinguish them from listings the user had already archived herself.

2. **Recovery (prompt + auto-republish)** — an OTP login during grace presents an explicit **"Your account is scheduled for deletion on [date] — restore it?"** prompt. On confirm: clear `deletionScheduledAt`, reactivate the account, and **republish the `archivedByDeletion` listings** to their pre-deletion active state. Recovery is an **existing-user** path and is **not blocked by `SIGNUPS_ENABLED=false`** (handled in `VerifyOtp`'s existing-user branch). The phone number stays reserved to the user throughout grace.

3. **Day-30 purge — tombstone-and-retain** — a **daily BullMQ repeatable job in `apps/worker`** finds users with `deletionScheduledAt <= now` and:
   - **Keeps the `User` row**, nulling/tombstoning PII: `phone` freed for future re-registration (nulled or set to a unique `deleted:<id>` tombstone), `displayName`/`avatarUrl` cleared.
   - **Prunes private/personal rows**: sessions, TOTP enrollment + backup codes, FCM devices, notification history/preferences, saved searches, favorites, owned vehicles (garage), blocked-user links, dealership memberships.
   - **Retains marketplace content**, re-attributed to the tombstone: listings (left archived), conversations + messages (so counterparties keep their history), and S7 `ContentReport` actor references (nullable-after-delete; no denormalized reporter/reviewer PII). Reporter deletion or suspension does not invalidate existing reports.
   - The existing `onDelete: Cascade` relations **remain in the schema as a safety net for a true admin erasure**; because the normal deletion path never deletes the `User` row, they do not fire.

## Consequences

- **+** Counterparties keep their conversation history; satisfies the store + legal posture the cascade violated.
- **+** Net-**simpler** at the data layer than expected: not deleting the row means cascades never fire, so deletion is "anonymize PII + prune personal tables," not a delicate cascade rewrite.
- **+** Recovery fully reverses an accidental deletion — account **and** listings.
- **−** New schema: `User.deletionScheduledAt`, a listing `archivedByDeletion` marker, and a phone-freeing scheme (nullable or tombstone) that must respect the `phone` unique constraint — one migration.
- **−** Introduces a **tombstoned-user state** the UI and queries must handle (e.g., rendering "Deleted user" in a thread); contexts reading user summaries must tolerate nulled PII.
- **−** Relies on a reliable scheduled purge worker; a missed run delays PII purge. Acceptable (purge is not real-time-critical) but must be monitored as part of S8b ops.
- **−** Grace-period semantics couple to the signup kill switch and phone re-registration; documented above so they are not rediscovered as bugs.

## Alternatives

- **Delayed full cascade** (today's hard delete, 30 days later) — rejected by the DoD: still destroys counterparties' history at purge.
- **Purge content but keep counterparty message fragments** — rejected: fiddly partial-conversation gutting, loses the user's listings entirely, and is more complex than tombstone-retain for no legal benefit.
- **Immediate hard delete (status quo S2)** — rejected: no grace, no recovery, destroys counterparty data, legally weak for beta, fails store review.
- **Delete the `User` row but switch all relations to `SET NULL`** — rejected: far broader schema churn than keeping the row and anonymizing it; several relations are non-nullable.

## References

- [ADR-0012](0012-multi-device-sessions.md) — sessions / refresh tokens (revoked on deletion)
- [ADR-0020](0020-document-hierarchy-and-mutability.md) — material capability change recorded as an ADR
- [ADR-0027](0027-mlp-beta-scope.md) — MLP beta scope
- `apps/api/src/modules/identity/application/DeleteMe.ts`, `identity/CONTEXT.md` (lines 88–94, 126)
- `docs/prd/ops/83-legal.md`, `docs/prd/ops/84-launch-plan.md` (store account-deletion review)
- Sprint S8a, slice **A3** — `docs/prd/sprints/sprint-08-private-beta-polish.md`
