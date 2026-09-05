# ADR-0045: The first admin in a signups-disabled environment is bootstrapped by break-glass identity insert, never by lifting the signup flag

- **Status**: Accepted
- **Date**: 2026-09-06
- **Deciders**: AutoTM founder + AI architect

## Context

[ADR-0039](0039-phased-cloud-first-hosting.md) put staging and reviewer-only production on Railway, and both run with public signup closed: `SIGNUPS_ENABLED=false`, `SMS_DRIVER=mock`, no real users. Sprint 11 issue #279 then requires an integrated reviewer proof in which a live admin moderates a report **while general signup remains disabled** — those two requirements sit in the same acceptance criterion.

Executing that against staging exposed a gap none of the individual pieces is wrong about on its own. Three deliberate constraints intersect and leave no path:

- `VerifyOtp` refuses to create a `User` when `SIGNUPS_ENABLED=false` ([`apps/api/src/modules/identity/application/VerifyOtp.ts`](../../apps/api/src/modules/identity/application/VerifyOtp.ts)), so OTP login cannot bootstrap the operator's identity.
- `packages/db/scripts/promote-admin.ts` refuses to run when the phone has no existing `User`, by design and by invariant in [86 — admin bootstrap runbook](../prd/ops/86-admin-bootstrap-runbook.md): "The script must not create users or bypass OTP."
- The [ADR-0030](0030-reviewer-demo-account-otp-bypass.md) reviewer bypass returns no session for any user whose role is not `buyer` or `seller`, precisely so that it can never create or elevate an admin.

So runbook 86's step 4 — "ask the intended admin to complete normal OTP login once" — is unexecutable in exactly the environments that need an admin most. This is not staging-specific; reviewer-only production has the same posture and will hit it again.

Two resolutions were available.

**Lift `SIGNUPS_ENABLED` temporarily**, log the operator in through the normal OTP path, then put it back. This needs no new mechanism. It is also the one thing the reviewer-era posture must be able to state was never done: "public signup was disabled throughout" is a claim made to store reviewers and recorded in deploy evidence, and a flag that was off, then on, then off is not that claim. It also cannot satisfy #279's criterion, which requires signup to stay disabled *while* the reviewer flow runs.

**Break-glass insert the identity only**, then promote through the audited script. Runbook 86 already sanctions direct SQL as break-glass and requires an incident note; this bounds that break-glass to its smallest useful form.

## Decision

**In an environment where public signup is disabled, the first admin identity is created by a break-glass `INSERT` of a single `users` row with role `buyer` — no session, no privilege — and the privilege change is then made only through `pnpm --filter @auto-tm/db admin:promote`. `SIGNUPS_ENABLED` is never lifted to bootstrap an admin.**

- The break-glass step creates **only what OTP would have created**: one identity row. It does not mint a session, a token, a TOTP enrollment, or an elevated role, and it writes no audit row of its own.
- The privilege change stays on the sanctioned path, so `ADMIN_BOOTSTRAP_PROMOTE` is written with `actorId = null`, the operator-supplied reason, and the before/after role. The audit trail for *becoming an admin* is unchanged.
- `--dry-run` is run first, as runbook 86 already requires.
- The operator then signs in through the normal OTP path — the identity now exists, so the signup gate is not involved — enrolls TOTP, and verifies. The **first** successful verify is what returns the ten backup codes.
- The procedure is recorded in [80 — deployment runbook](../prd/ops/80-deployment-runbook.md) and cross-referenced from runbook 86. Each use is an operator finding recorded in that environment's evidence, per runbook 86's existing direct-DB-edit rule.
- This does not widen the reviewer bypass. ADR-0030's constraint that the bypass can never produce an admin stands untouched, and is in fact what makes this ADR necessary.

Drilled in staging on 2026-09-05 under issue #279, which also satisfies runbook 86's standing requirement that bootstrap be drilled in a prod-like environment before the first production admin promotion. Evidence: `docs/prd/ops/evidence/issue-279-reviewer-flow-and-builds.md`.

## Consequences

**Positive**

- "Public signup was never enabled" stays a true statement about every reviewer-era environment, which is what store review and the deploy evidence depend on.
- The break-glass surface is one row in one table, reviewable at a glance, rather than a window during which the whole signup path is open.
- The audit trail for admin privilege is unaffected; the promotion is still the only thing that grants it.
- Reviewer-only production has a documented, drilled bootstrap rather than an improvisation at the worst moment.

**Negative**

- Direct SQL against a deployed environment is normalised for one narrow case. Mitigated by keeping it to an identity-only insert, requiring the audited promotion for the privilege, and requiring an evidence record per use.
- The identity's phone must be chosen carefully: it must not collide with a reserved reviewer number, or the reviewer bypass would start resolving to a user it must never authenticate. The bypass's role check would refuse the session, but the collision is still a configuration error worth avoiding.
- A future admin-provisioning CLI would supersede this. That is post-MLP work; runbook 86 already notes there is no admin-account management UI in the MLP.

## Alternatives considered

- **Temporarily lift `SIGNUPS_ENABLED`.** Rejected above: it destroys the claim the reviewer-era posture exists to make, and #279's criterion forbids it outright.
- **Let `admin:promote` create the user when it does not exist.** Rejected. It collapses two separately auditable actions — identity creation and privilege grant — into one command, and removes the invariant that makes the script safe to hand to an operator.
- **Widen the reviewer bypass to cover an admin account.** Rejected. ADR-0030 forbids it, and it would put a fixed, long-lived code in front of the moderation surface.
- **Seed an admin from the reviewer scenario seed.** Rejected. The seed is reviewer content and must stay buyer/seller only; an admin appearing in it would be shipped to every environment that runs it.

## References

- [ADR-0030 — reviewer demo account OTP bypass](0030-reviewer-demo-account-otp-bypass.md)
- [ADR-0039 — phased cloud-first hosting](0039-phased-cloud-first-hosting.md)
- [80 — deployment runbook](../prd/ops/80-deployment-runbook.md)
- [86 — admin bootstrap runbook](../prd/ops/86-admin-bootstrap-runbook.md)
- [Issue 279 evidence](../prd/ops/evidence/issue-279-reviewer-flow-and-builds.md)
