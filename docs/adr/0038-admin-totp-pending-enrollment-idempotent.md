# ADR-0038: Admin TOTP pending enrollment is idempotent instead of replaceable

- **Status**: Accepted
- **Date**: 2026-06-13

## Context

`docs/prd/features/30-identity.md` originally specified that a pending (unverified) admin TOTP enrollment could be replaced, so a lost pre-verification QR code would not block setup. During S8a manual admin-login testing we observed a different failure mode: an admin scans the QR, leaves before entering the first TOTP code, logs in again later, and the previous authenticator entry no longer works because `POST /auth/admin/totp/enroll` rotated the secret. The UI then surfaced the verified-conflict path as an "already configured" error banner, which was confusing and forced the admin to delete the old authenticator entry and re-scan.

## Decision

Pending admin TOTP enrollment is **idempotent** until the first successful verification:

- `EnrollAdminTotp` returns the existing pending `encryptedSecret` (decrypted for the response) on repeated calls from any authenticated admin session belonging to the same user.
- The plaintext secret and QR URI are identical across calls and sessions until `VerifyAdminTotp` marks the enrollment verified.
- Verified re-enrollment continues to return `409 TOTP_ALREADY_ENROLLED`.
- A race between two concurrent `enroll` calls for a brand-new admin is handled in `PrismaTotpEnrollmentRepository.createPending` by catching the Prisma `P2002` unique-constraint error and returning the row created by the winner, avoiding a 500.

The PRD wording in `docs/prd/features/30-identity.md` is updated to match this behavior, and the relevant `CONTEXT.md` files record the invariant.

## Security tradeoff

The secret is encrypted at rest (AES-256-GCM) and is already decrypted server-side during both enrollment and verification. Returning the same pending secret to any authenticated admin session for that user does not expand the trust boundary: the secret is exposed only to an already-authenticated admin who could already obtain it by completing enrollment. The tradeoff is accepted because it removes a real setup friction without weakening the air-gap/TM-operator threat model.

## Consequences

- Admins can complete TOTP setup across multiple login sessions with the same authenticator entry.
- `PrismaTotpEnrollmentRepository.createPending` now contains Prisma-specific error handling; this is allowed because it lives in the infrastructure layer.
- New e2e coverage verifies cross-session idempotency and concurrent-enroll safety.
- The PRD feature spec is updated; no new database migration is required.

## References

- `docs/prd/features/30-identity.md` — updated admin TOTP enrollment behavior
- `apps/api/src/modules/identity/CONTEXT.md` — current-state invariant
- `apps/admin/CONTEXT.md` — admin app auth-flow note
- PR #213 — implementation and tests
