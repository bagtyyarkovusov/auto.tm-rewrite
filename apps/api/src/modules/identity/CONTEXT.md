# Identity

Identity owns Users, Sign-in Methods, sessions, admin elevation, account deletion, and identity checks consumed by other contexts. Marketplace Role and Dealership Member role are different concepts. Listing contact verification belongs to Listings and cannot authenticate a User.

Refresh tokens are hashed on Session. Refresh rotates in place with a compare-and-swap check so a concurrent retry cannot reuse the old token. Admin TOTP elevation has its own deadline; ordinary refresh preserves it without extending it. Pending TOTP enrollment is idempotent, including concurrent creation, so returning to setup does not invalidate an already scanned secret.

Phone and email code flows share ownership and one-time-consumption rules. Account-deletion codes bind to the holder at request time; do not replace that with an unbound sign-in lookup. Reviewer bypass is narrower than normal authentication and never authorizes deletion. Inspect the use-cases and integration tests before changing rate limits, verification, or enumeration protection.

Other modules import identity only through [`identity.public.ts`](identity.public.ts), plus `identity.module.ts` for Nest composition; `apps/api` lint rejects imports of identity internals or `identity.tokens`. It mirrors the providers `IdentityModule` exports: identity check, identity read, identity admin, seller profile read, session repository, and clock.

The exported `SELLER_PROFILE_READ_PORT` gives other contexts a seller's display name and join date from `User.createdAt`. It exposes no Sign-in Method values or verification state.

The identity read port answers lists in one read per question: `findUsersByIds` for display names and `findBlockedUserIds` for which of a set of Users a blocker has blocked. Callers use them instead of one `findUserById` or `isUserBlockedBy` call per row. Neither returns Sign-in Method values.

Suspension blocks marketplace mutations while preserving permitted reads and account deletion. Deletion has a grace period followed by worker purge; inspect both sides and database history-retention rules before changing the lifecycle.

## Start here

- [Module composition](identity.module.ts)
- [Refresh concurrency and tests](application/RefreshSession.ts)
- [Idempotent TOTP enrollment and tests](application/EnrollAdminTotp.ts)
- [Sign-in method invariants](domain/SignInMethods.ts)
- [Deletion integration tests](presentation/AccountDeletionController.e2e.spec.ts)
- [Cross-context entry point](identity.public.ts)
- [Purge implementation](../../../../worker/src/jobs/PurgeExpiredAccounts.ts)
- [Phone or email decision](../../../../../docs/adr/0054-phone-or-email-sign-in-share-one-user.md)
- [Schema](../../../../../packages/db/prisma/schema.prisma)
