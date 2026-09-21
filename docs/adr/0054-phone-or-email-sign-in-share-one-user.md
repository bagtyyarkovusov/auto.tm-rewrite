# ADR-0054: Phone or email sign-in share one User

- **Status**: Accepted
- **Date**: 2026-09-22
- **Deciders**: AutoTM founder + AI architect
- **Supersedes**: the phone-only sign-in rule of [ADR-0006](0006-auth.md) and its rejection of email sign-in. The `+993` phone OTP path, the SMS gateway and admin TOTP remain in force.
- **Amends**: the reserved reviewer entries of [ADR-0030](0030-reviewer-demo-account-otp-bypass.md). Its narrow-scope rules remain in force.

## Context

ADR-0006 made phone OTP the only sign-in method, and ADR-0030 rejected adding email just for store review. Today `User.phone` is required and unique, there is no email column, and the day-30 deletion purge writes `phone = deleted:<id>` because the column cannot be null.

In [Approve the release screen map and Auto.ru-inspired buyer journey](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/344), the founder decided that the Google Play reviewer release lets people sign in by phone **or** by an emailed code, with no password. Publishing a Listing still needs a verified phone, and "Phone verified" appears only for Users who have one. Passwords, social sign-in and merging Users are out of scope.

The listings context already gets seller trust through a `SellerProfilePort` adapter, built in [Show the real seller and a public ID on Listing detail](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/362). Until now, that adapter reported `phoneVerified` as true whenever the User had a phone.

The email provider is a separate decision. It needs its own ADR after [Compare email code delivery options for Railway now and TM later](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/349).

## Decision

**A User signs in with a code sent to their phone or their email. Each is an optional, unique, always-verified Sign-in Method on the same User, and a live User has at least one.**

### User shape

- `User.phone` and `User.email` are nullable and unique. Each is paired with `phoneVerifiedAt` / `emailVerifiedAt`. A value is only ever stored together with its verified-at time, so a stored value is a verified value.
- A live User has at least one Sign-in Method. A User purged after deletion has none.
- Email is stored trimmed and lowercased. No provider-specific rewriting (for example Gmail dot removal).
- Phone numbers stay `+993` only (ADR-0006). Email addresses may be on any domain.
- The migration sets `phoneVerifiedAt = createdAt` for every existing User.

### Signing in

- A confirmed code for a value that no User holds creates a User with only that method. `UserRegistered` is emitted. `SIGNUPS_ENABLED=false` blocks creation on both channels while existing Users still sign in.
- Requesting a code answers the same way whether or not the value belongs to a User.
- Signing in by either method during the deletion grace period recovers the account, as phone does today.

### Adding and changing a method

- A signed-in User adds the missing method, or replaces an existing one, by confirming a code sent to the new value.
- The code is always sent. If the value belongs to another User, including one in the deletion grace period, the request is refused only after the code is confirmed, with `SIGN_IN_METHOD_TAKEN`. Nothing changes on either User. The unique index settles concurrent claims the same way.
- A replacement frees the old value immediately. It revokes no sessions and does not affect Listings.
- Sign-in Methods cannot be removed in this release. So the last method can never be removed, and a User with published Listings always keeps a phone.

### Deletion

- In-app deletion (`DELETE /me`) is unchanged for every User.
- The day-30 purge sets `phone`, `email` and both verified-at times to null, freeing both values. This replaces the `deleted:<id>` phone tombstone.
- The web deletion-request link required by Google Play is a self-serve page. The person enters a phone or email, confirms a code sent to it, and the same 30-day grace period starts as with `DELETE /me`.
- The privacy policy and terms describe deletion for a phone or email.

### Codes and limits

| | Phone | Email |
|---|---|---|
| Code | 6 digits, SHA-256 hashed | 6 digits, SHA-256 hashed |
| Expiry | 5 minutes | 10 minutes |
| Wrong attempts before invalidation | 5 | 5 |
| Requests per destination | 5 per 24 hours | 5 per 24 hours |
| Backoff | `60 × 2^N` seconds | `60 × 2^N` seconds |
| Requests per IP | 10 per hour, shared across both channels | same |

A code is bound to one channel and destination. Sign-in, add/change and web deletion codes share the per-destination and per-IP budgets.

### Seller trust and selling

- The `SellerProfilePort` adapter derives `phoneVerified = phoneVerifiedAt != null`. No other listings code changes.
- `IdentityCheckPort` gains `hasVerifiedPhone(userId)`. Listings checks it when a Listing is published or republished and fails with `PHONE_REQUIRED`.
- The mobile Sell entry shows an "Add a phone" step to Users without a phone.

### Reviewer accounts

- A reviewer entry in secret-managed config is either a reserved phone or a reserved email, each with a fixed 6-digit code. Reserved emails use a domain AutoTM controls.
- Each reviewer User holds both a reserved phone and a reserved email, so a reviewer who signs in by email can still sell.
- Google Play review notes give email as the main login and phone as the alternative. Reserved values and codes live only in the secret store and Play Console, never in git or issues.
- The bypass covers sign-in only. Adding or changing a method and web deletion always need a real code. The rate-limit exemption and the buyer/seller-only rule from ADR-0030 apply to email entries too.

### API contract

- `POST /api/v1/auth/otp/request` and `/verify` accept `{ phone }` or `{ email }` (plus `code` on verify). Existing phone callers are unchanged.
- `GET /api/v1/me` returns `phone: string | null`, `email: string | null` and `phoneVerified: boolean`.
- `POST /api/v1/me/sign-in-methods/request` and `/verify` add or replace a method.
- `POST /api/v1/account-deletion/request` and `/confirm` are public and back the web deletion page.
- Shapes are Zod schemas in `@auto-tm/contracts`.

## Consequences

### Positive

- Reviewers abroad and TM users without a working SIM can sign in through a channel that reaches them.
- One User model serves both channels. There are no linked accounts and no merge path.
- Seller trust stays honest: "Phone verified" comes from a stored verification time, and only verified Users can publish.
- Removing the phone tombstone hack makes the purge clearer.

### Negative / accepted costs

- AutoTM now sends email, which adds a new outbound dependency. Its provider and TM-era egress are decided in a separate ADR, and Google Play Data safety must declare the email address.
- Users cannot remove a Sign-in Method. Someone who wants to drop their email must replace it or delete the account.
- A person with a phone-only User and an email-only User cannot combine them. They get `SIGN_IN_METHOD_TAKEN` and must keep using each account separately.
- The web deletion page adds a public, code-protected endpoint pair that must be rate-limited like sign-in.

### Neutral

- The API keeps `otp` in its sign-in paths for compatibility. Domain language uses "Sign-in Code".
- The glossary redefines User and adds Sign-in Method and Sign-in Code under ADR-0042.
- `apps/api/src/modules/identity/CONTEXT.md` changes when the implementation ships, not before (ADR-0019).

## Alternatives considered

- **Phone-only User creation, with email added later as a secondary method.** Rejected: the approved screen map offers phone and email as equal entry points.
- **A separate Sign-in Method table.** Rejected: there are only two fixed kinds, and merging is out of scope, so columns on User are simpler.
- **Refusing a taken value before sending the code.** Rejected: any signed-in User could probe which phones and emails are registered.
- **Allowing method removal.** Deferred: it needs an identity-to-listings port for sellers and extra Profile states that the release does not need.
- **An instructions-only or support-mailbox web deletion page.** Rejected: Google Play requires a working request path without the app, and a mailbox adds manual work and a weaker identity check.
- **Email-only reviewer entries.** Rejected: most TM users will sign in by phone, so reviewers should be able to exercise that path.

## References

- [ADR-0006](0006-auth.md), [ADR-0012](0012-multi-device-sessions.md), [ADR-0030](0030-reviewer-demo-account-otp-bypass.md)
- [ADR-0005](0005-hosting.md) and [ADR-0039](0039-phased-cloud-first-hosting.md)
- [ADR-0019](0019-context-md-describes-current-state.md), [ADR-0020](0020-document-hierarchy-and-mutability.md), [ADR-0042](0042-domain-glossary-authority-and-mutability.md)
- [Decide how phone and email sign-in share one User](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/348)
- [Approve the release screen map and Auto.ru-inspired buyer journey](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/344)
- [Check current Google Play requirements against AutoTM](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/324)
- [Identity current state](../../apps/api/src/modules/identity/CONTEXT.md)
- [Domain glossary](../domain/GLOSSARY.md)
