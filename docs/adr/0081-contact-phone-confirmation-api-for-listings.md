# ADR-0081: Contact phone confirmation API for Listings

- **Status**: Accepted
- **Date**: 2026-10-03
- **Deciders**: AutoTM founder, who asked on 2026-10-03 for a short design ADR before the contact phone API and Contact step slices are ticketed ([#354, Q7](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354#issuecomment-5961320337)); drafted by the orchestrator. The founder chose the six open points on 2026-10-03, all as recommended, and accepted ADR-0081 on 2026-10-03 in Claude Code desktop, [recorded on PR #590](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/590)
- **Amends**: the editing rule of [ADR-0056](0056-listing-contact-phones-are-verified.md): an edit is checked only when it changes the contact phone (see Edit below). The rest of ADR-0056 stays in force.
- **Complements**: [ADR-0056](0056-listing-contact-phones-are-verified.md), by naming the endpoints, records, error codes, SMS text and ownership it left to implementation. It works within the code limits of [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md) and the client-IP rule of [ADR-0078](0078-the-api-trusts-one-configured-header-for-the-client-ip.md).

## Context

ADR-0056 decided that every Listing contact phone is verified. A seller may use their account phone without a code, or confirm another `+993` number by SMS code and then reuse it for 7 days. Contact-phone codes are 6 digits, SHA-256 hashed, expire after 5 minutes, allow 5 wrong attempts, share ADR-0054's per-destination and per-IP budgets, and are bound to their purpose. The server checks the contact phone on publish, republish and edit. ADR-0056 named no endpoint, error code, record or SMS text. The prototype note for [#354](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354) (`docs/prd/ui/prototypes/sell-wizard.md` at `21a3ae2`, sections 5 and 9) assumes one "send code" call and one "confirm code" call. When a publish fails on the contact phone, the app sends the seller back to the Contact step. Founder decision D7 makes the contact phone required even when calls are off.

What the code does today (`origin/main` at `e61b8b22`):

- **The contact phone is free text.** `Listing.contactPhone` is a nullable string. `ListingDraftPayload`, `StepContactSchema` and `EditListingRequestSchema` accept any string. `PublishListing`, `RepublishListing` and `EditListing` do not check it. `PHONE_REQUIRED` and `IdentityCheckPort.hasVerifiedPhone` were never built, so removing them under ADR-0056 costs nothing.
- **Code records do not store a purpose.** Sign-in, Sign-in Method change and web deletion codes all live in one `otp_requests` table (`OtpRequest`: `channel`, `destination`, `codeHash`, `expiresAt`, `verifiedAt`, `attempts`, `userId`, `ip`). Storage is Postgres; Redis is not used for codes. `VerifyOtp` checks the newest record for the channel and destination, whatever flow created it (`PrismaOtpRequestRepository.findLatestByDestination`). A contact-phone code stored in this table today would therefore sign its recipient in. ADR-0056 forbids that.
- **The limits are shared code.** `OtpAttemptLedger` with `SIGN_IN_CODE_RATE_POLICY` allows 5 requests per destination per 24 hours and 10 per IP per hour, with a backoff of `60 × 2^N` seconds. `RequestOtp`, `RequestSignInMethodChange` and `RequestAccountDeletion` each count every `otp_requests` row for the destination and IP. `VerifySignInCode` has `MAX_ATTEMPTS = 5` and `SignInCodeDestination` sets a 5-minute expiry for phone codes. A refused request throws `SignInCodeRateLimitedError`. Controllers map it to `RATE_LIMITED` with `details: { reason, retryInSeconds }` (`destination_limit`, `ip_limit` or `backoff`) through `signInCodeRateLimitedException`.
- **Code errors already have stable codes.** `@auto-tm/contracts` `ErrorCode` defines `INVALID_OTP`, `OTP_LOCKED`, `OTP_EXPIRED`, `OTP_ALREADY_USED`, `OTP_NOT_FOUND` and `RATE_LIMITED`. Controllers return all of them as HTTP 400. Listing rule errors live in `ListingsErrorCode`, for example `CONTACT_METHOD_REQUIRED`, also returned as 400.
- **SMS goes out synchronously and is not sent through the worker.** The API calls `OtpSenderPort.send(phone, code)` (`HttpOtpSenderAdapter`). With `SMS_DRIVER=mock` that adapter logs the code. In `gateway` mode it only logs today. The intended target is AutoTM's own `apps/sms-gateway` `POST /v1/send { phone, body, requestId }` (ADR-0006). That gateway is still a mock scaffold. Only email codes go through a BullMQ job to the worker (ADR-0055). No SMS text exists in the repository yet.
- **Ownership is already written down.** The identity overview says that Listing contact verification belongs to Listings and cannot authenticate a User. The listings overview lists "listing-contact verification" among the things Listings owns. Other modules may import identity only through `identity.public.ts`, and `SELLER_PROFILE_READ_PORT` exposes no Sign-in Method values. Listings owner routes already live under `/api/v1/me/...` (`/me/drafts`, `/me/listings`). Listings controllers refuse suspended Users through `IdentityCheckPort.isSuspended`.
- **PRD 32 reads the edit rule differently from ADR-0056.** The listings PRD says that an edit which changes the contact phone is checked, and that an unrelated edit may keep a phone whose window has ended. ADR-0056 says the server rejects any edit unless the contact phone is currently verified. This ADR settles it in favour of PRD 32; see Edit below.

## Decision

**Listings owns the Verified Contact Phone record and the three `/api/v1/me/contact-phones` endpoints. Identity issues and checks contact-phone codes in the shared `otp_requests` table. Each code record stores its purpose, and that purpose is checked on verify. The code counts against the same per-number and per-IP budgets as sign-in. Publish, republish and edit accept a contact phone only if it is the seller's account phone or one of the seller's numbers confirmed in the last 7 days.**

### Endpoints

All three endpoints need a signed-in User. They refuse a suspended User with the existing 403 `FORBIDDEN` and `details.reason = USER_SUSPENDED`. A User whose deletion is scheduled is refused by the global `AccountDeletionPendingGuard`. Shapes are Zod schemas in `@auto-tm/contracts` `ListingsSchemas`. `PhoneTm` is the existing `+993[67]XXXXXXX` schema.

```ts
// One number the seller may put on a Listing now.
VerifiedContactPhoneSchema = z.object({
  phone: PhoneTm,
  source: z.enum(["account", "confirmed"]),
  confirmedAt: z.string().datetime().nullable(),   // null for "account"
  reusableUntil: z.string().datetime().nullable(), // confirmedAt + 7 days; null for "account"
});
```

| Method and path | Request | 200 response |
|---|---|---|
| `POST /api/v1/me/contact-phones/request` | `{ phone: PhoneTm }` (strict) | `{ status: "confirmed", contactPhone: VerifiedContactPhone }`, or `{ status: "code_sent", requestId: uuid, resendInSeconds: int, testCode?: string }` |
| `POST /api/v1/me/contact-phones/verify` | `{ phone: PhoneTm, code: /^\d{6}$/ }` (strict) | `{ contactPhone: VerifiedContactPhone }` with `source: "confirmed"` |
| `GET /api/v1/me/contact-phones` | none | `{ items: VerifiedContactPhone[] }`: the seller's numbers whose reuse window has not ended, newest `confirmedAt` first |

- **Request.** If the number is the seller's account phone, the endpoint answers `confirmed` with `source: "account"` and sends nothing. It does the same, with `source: "confirmed"`, when the number is still inside its reuse window. This is the prototype's "typing a number that is already confirmed skips the code". Otherwise the endpoint applies the shared limits, stores a code bound to this seller and the contact-phone purpose, sends the SMS and answers `code_sent`. `resendInSeconds` and `testCode` mean what they mean on `POST /auth/otp/request`. `testCode` is present only when `OTP_TEST_MODE` is on, and that mode is allowed only in CI.
- **Verify.** Checks the newest contact-phone code that this seller requested for this number. On success it consumes the code with `consumeIfUnused` and then records the confirmation. A confirmation always restarts the 7 days, so `confirmedAt` becomes the time of the newest confirmation.
- **List.** The list leaves out the account phone. The wizard takes that number from `GET /api/v1/me` (`phone`), so Listings never reads a Sign-in Method value. The app derives "days left" from `reusableUntil`.

### Purpose binding

- `otp_requests` gains a required `purpose` column. It is a Prisma enum `CodePurpose` with the values `sign_in`, `sign_in_method`, `account_deletion` and `listing_contact_phone`. Every code-creating use-case sets it. The migration backfills existing rows as `sign_in`. Every existing row is already past its 5-minute expiry.
- Verification looks up the newest record for the channel, destination **and purpose**. Contact-phone verification also matches the requesting User. `VerifyOtp` (sign-in) never accepts a `listing_contact_phone` record. Contact-phone verification accepts only `listing_contact_phone` records that the same seller requested.
- Budgets stay shared. The per-destination count, the per-IP count and the backoff's "latest request" all read every purpose, as they do today.
- The reviewer bypass (ADR-0030, as amended by ADR-0054) covers sign-in only. Contact-phone codes are always real codes. A reviewer User uses their reserved account phone, which needs no code.
- **Decided (founder, 2026-10-03):** the three existing flows also become strictly bound to their own purpose. Today sign-in accepts a deletion or method-change code for the same destination. **Chosen: yes, each verify accepts only its own purpose.** One rule is easier to test than "contact phone is special", and the code's own comments already defend against codes crossing between flows.

### Verified Contact Phone record

- Listings owns a new table, `verified_contact_phones`: `id`, `sellerId` (references `User`), `phone` (E.164 `+993…`), `confirmedAt` (UTC), `createdAt` and `updatedAt`. It has a unique key on `(sellerId, phone)`, and each confirmation upserts `confirmedAt`. Several sellers may hold rows for the same number. A row never touches `User.phone` and never becomes a Sign-in Method.
- A number is **reusable** while `now < confirmedAt + 7 × 24 hours`, compared in UTC on the server. The domain object `VerifiedContactPhone.isReusableAt(now)` holds this rule. Listings code outside the domain object does not repeat the arithmetic.
- **The account phone counts as confirmed without a code.** Identity's exported `IdentityCheckPort` gains `holdsSignInPhone(userId, phone): Promise<boolean>`. It answers a yes/no question and never returns the value. Every stored `User.phone` is verified (ADR-0054), so this is the "verified account phone" of ADR-0056. If the seller later replaces their sign-in phone, a Listing that already shows the old number keeps it. Any new use of the old number needs a code.
- The day-30 purge (`apps/worker` `PurgeExpiredAccounts`) deletes the User's `verified_contact_phones` rows in the same transaction as its other per-User deletes. During the grace period the rows remain.

### Checks on publish, republish and edit

One listings domain policy decides whether a contact phone may be used now. It returns one of: account phone, reusable confirmed number, missing, never confirmed, or confirmation expired.

- **Publish** (`PublishListing`): the draft's `contactPhone` is required (D7) and must pass the policy. `StepContactSchema` and the publishable payload make `contactPhone` a required `PhoneTm`. The Contact step's Continue relies on the request and verify responses; `validate-step` stays a schema check.
- **Republish** (`RepublishListing`): the Listing's stored `contactPhone` must pass the policy. The request keeps no body. To relist with a different number the seller edits first. The prototype's "Relisting a Listing whose number is past its 7 days asks for a code first" maps to a request and verify for the same number, followed by republish.
- **Edit** (`EditListing`): `EditListingRequestSchema.contactPhone` becomes `PhoneTm`. **Decided (founder, 2026-10-03):** when an edit is checked. **Chosen: check only when the patch changes `contactPhone`, as PRD 32 says. Other edits keep the stored number after its window ends.** ADR-0056 says that a Listing keeps its contact phone after the 7 days and that the window limits only new uses. Checking every edit would charge an SMS for a price change. This amends ADR-0056's sentence that the server rejects "editing a Listing" unless its contact phone is currently verified.
- A failed check answers with the listing errors below. A publish that fails keeps the draft. A failed republish or edit changes nothing.

### Error codes

All errors use the existing `ErrorResponse` envelope. As today, they all return HTTP 400 except the suspension 403.

| Situation | Endpoint | `code` | `details` |
|---|---|---|---|
| Number is not a TM mobile number, or the body is malformed | request, verify | `VALIDATION_FAILED` (existing) | Zod `flatten()`, field `phone` |
| Wrong code, attempts left | verify | `INVALID_OTP` (existing) | **new** `InvalidOtpDetails`: `{ attemptsLeft: 1..4 }` |
| Fifth wrong code, or any try after it | verify | `OTP_LOCKED` (existing) | none. The app asks for a new code |
| Code past 5 minutes | verify | `OTP_EXPIRED` (existing) | none |
| Code already consumed | verify | `OTP_ALREADY_USED` (existing) | none |
| No contact-phone code requested by this seller for this number | verify | `OTP_NOT_FOUND` (existing) | none |
| Resend too soon | request | `RATE_LIMITED` (existing) | `{ reason: "backoff", retryInSeconds }` |
| 5 codes for this number in 24 hours, counting sign-in and every other purpose | request | `RATE_LIMITED` | `{ reason: "destination_limit", retryInSeconds: 0 }` |
| 10 code requests from this IP in an hour | request | `RATE_LIMITED` | `{ reason: "ip_limit", retryInSeconds: 0 }` |
| Publish or republish with no contact phone | publish, republish | **new** `CONTACT_PHONE_REQUIRED` | none |
| Contact phone neither the account phone nor confirmed in the last 7 days | publish, republish, edit | **new** `CONTACT_PHONE_NOT_CONFIRMED` | `{ reason: "not_confirmed" \| "expired" }` |

- `CONTACT_PHONE_REQUIRED` and `CONTACT_PHONE_NOT_CONFIRMED` are added to `ListingsErrorCode` in contracts and to `LISTING_ERROR_CODES` in the API. `InvalidOtpDetailsSchema` is added next to `RateLimitedDetailsSchema`. It is additive and also safe for the sign-in verify endpoint, which may adopt it later.
- `expired` lets the app say "confirm this number again" instead of treating it as a new number. Either reason sends the seller to the Contact step.
- **Decided (founder, 2026-10-03):** the daily-limit copy. **Chosen: keep `retryInSeconds: 0` for `destination_limit` and say "No more codes to this number today. Try again tomorrow or use another number".** This matches the existing sign-in contract and needs no new field. Showing the exact time would reveal when someone, possibly the number's owner signing in, last asked for a code.
- **Decided (founder, 2026-10-03):** no per-seller limit on top of the shared ones. **Chosen: not for this release.** ADR-0056 sets only the shared budgets, and the per-number and per-IP limits already bound the SMS cost.

### SMS text

- `OtpSenderPort.send` changes to `send({ phone, code, purpose, locale, requestId })`. The API renders the message body for the purpose and locale. `HttpOtpSenderAdapter` sends `{ phone, body, requestId }` to the gateway, which is the shape `apps/sms-gateway` already expects. This ADR sets only the contact-phone text. Sign-in SMS text belongs to its own ticket.
- Cyrillic, and Turkmen with `ň`, `ş`, `ý` or `ž`, is sent in UCS-2, so one segment holds at most 70 characters. Each text names AutoTM, says that the code puts this number on a listing, and says to share it only by agreement. None contains a link.

| Locale | Text (with a sample code) | Characters | Encoding |
|---|---|---|---|
| RU | `AutoTM 123456: номер покажут в объявлении. Не давайте код без согласия` | 70 | UCS-2, 1 segment |
| TK | `AutoTM 123456: belgiňiz bildirişde görüner. Razy bolmasaňyz bermäň` | 66 | UCS-2, 1 segment |
| EN | `AutoTM code 123456 puts this number on a car listing. Share it only if you agree.` | 81 | GSM-7, 1 segment |

- **Decided (founder, 2026-10-03):** the RU and TK wording is approved subject to a native speaker reading it; any change is recounted against the one-segment limit. ADR-0056 leaves final wording to the implementing ticket. EN is added for EN-locale sellers, as in ADR-0055's email.
- **Decided (founder, 2026-10-03):** the language of the SMS. The recipient is often not the seller. **Chosen: the seller's request locale (`req.locale`, default RU).** A two-language text does not fit one UCS-2 segment, and sellers usually confirm a number for someone who speaks their language.

### Where it lives

- **Listings** owns the domain object, the policy, `VerifiedContactPhoneRepository`, the use-cases `RequestContactPhoneCode`, `ConfirmContactPhone` and `ListMyContactPhones`, the publish, republish and edit checks, and a `ContactPhonesController`. Each use-case has its own file.
- **Identity** owns code creation, hashing, limits, attempts, consumption and SMS dispatch. It exports a `CONTACT_PHONE_CODE_PORT` through `identity.public.ts` with two methods, `requestCode({ userId, phone, ip, locale })` and `confirmCode({ userId, phone, code })`. The purpose is fixed inside identity, so Listings cannot ask for a sign-in code. Identity also exports one mapper, like `accountDeletionPendingException`. It turns `SignInCodeRateLimitedError` and code-verification failures into the HTTP errors above, so the Listings controller does not import identity internals. `holdsSignInPhone` is added to the exported `IdentityCheckPort`.
- **Delivery** uses the same path as sign-in SMS today: the API calls `OtpSenderPort` synchronously, which goes to AutoTM's own `apps/sms-gateway` (ADR-0006). It does not use the worker or the email queue. This adds no external egress. Moving SMS onto a worker queue would be a separate decision that covers sign-in too.
- The per-IP budget counts the address from `resolveClientIp` (ADR-0078).

## Consequences

### Positive

- A contact-phone code cannot sign anyone in, and a sign-in code cannot confirm a contact phone. Both rules are enforced by a stored purpose, not by a convention.
- One table, one ledger and one sender serve every code. The budget ADR-0056 asks for is shared by construction.
- Listings never reads a Sign-in Method value. The only new identity question is a yes/no `holdsSignInPhone`.
- The wizard needs three calls, and none of them sends an SMS for a number that is already usable.
- The error codes reuse what the app already handles for sign-in. Only `CONTACT_PHONE_REQUIRED`, `CONTACT_PHONE_NOT_CONFIRMED` and `InvalidOtpDetails` are new.

### Negative / accepted costs

- A seller's contact-phone requests count against the number owner's sign-in budget. A seller can use up a stranger's 5 codes for the day. Anyone can already do the same through the public `POST /auth/otp/request`, so this adds no new exposure.
- The `otp_requests` migration and the purpose filter touch all three existing code flows and their tests.
- `OtpSenderPort` changes shape for every caller, even though only the contact-phone text is set here.
- SMS delivery is still synchronous inside the API request, and the gateway is still a mock. Real delivery depends on the gateway work under ADR-0006 and ADR-0039.
- The RU text uses all 70 characters, so any wording change must be counted again.

### Neutral

- `Listing.contactPhone` stays a nullable column. ADR-0056 already decided to discard existing values. Requiring the phone happens in the publish, republish and edit use-cases and in contracts.
- The listings and identity overviews change when the slices ship (ADR-0060). The glossary's Verified Contact Phone entry already matches.
- The "AutoTM verifies sellers' numbers" caption and the seller-trust page follow ADR-0056 and are not decided here.

## Alternatives considered

- **A separate code table and ledger in Listings.** Rejected: it would duplicate hashing, attempts and backoff, and the shared budget would need two tables counted together.
- **Identity owns the Verified Contact Phone record.** Rejected: both overviews and the glossary place it in Listings, and it is not a Sign-in Method.
- **A `purpose` field on the public `/auth/otp/request` and `/verify`.** Rejected: the client would choose the purpose on unauthenticated endpoints, and a mistake there signs someone in.
- **Send the code with the publish request.** Rejected: the wizard confirms at the Contact step, and 7-day reuse needs a stored record anyway.
- **List the account phone from Listings.** Rejected: Listings would read a Sign-in Method value, which the identity boundary forbids, and the app already has it from `/me`.
- **Let the app check the list before requesting a code.** Rejected as the only guard: the server is the authority, and answering `confirmed` saves an SMS when the app's list is stale.
- **A new error code for every refusal (cooldown, daily limit).** Rejected: `RATE_LIMITED` with a `reason` already serves sign-in, and the app handles it in one place.
- **Deliver SMS through a worker queue now.** Deferred: today no SMS goes through the worker, and changing that affects sign-in delivery, so it needs its own decision.

## References

- [ADR-0056](0056-listing-contact-phones-are-verified.md), [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md), [ADR-0006](0006-auth.md), [ADR-0030](0030-reviewer-demo-account-otp-bypass.md), [ADR-0032](0032-account-deletion-grace-period.md), [ADR-0055](0055-resend-sends-sign-in-codes-from-the-worker.md), [ADR-0078](0078-the-api-trusts-one-configured-header-for-the-client-ip.md), [ADR-0039](0039-phased-cloud-first-hosting.md), [ADR-0042](0042-domain-glossary-authority-and-mutability.md), [ADR-0060](0060-source-first-agent-context-and-task-scoped-guidance.md)
- [#354 founder slicing answers, Q7](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354#issuecomment-5961320337) and decision D7 on [#354](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354)
- Sell wizard prototype note, `docs/prd/ui/prototypes/sell-wizard.md` at `21a3ae2`, sections 5 and 9
- [Listings PRD](../prd/features/32-listings.md), "Listing contact phone policy"
- [Domain glossary](../domain/GLOSSARY.md), Verified Contact Phone
- [Identity overview](../../apps/api/src/modules/identity/CONTEXT.md) and [Listings overview](../../apps/api/src/modules/listings/CONTEXT.md)
- Source: `apps/api/src/modules/identity/application/{RequestOtp,VerifyOtp,VerifySignInCode,RequestSignInMethodChange,RequestAccountDeletion}.ts`, `domain/OtpAttemptLedger.ts`, `domain/SignInCodeDestination.ts`, `infrastructure/{PrismaOtpRequestRepository,HttpOtpSenderAdapter}.ts`, `presentation/signInCodeRateLimited.ts`; `apps/api/src/modules/listings/application/{PublishListing,RepublishListing,EditListing}.ts`; `packages/contracts/src/errors.ts`, `schemas/auth.ts`, `schemas/listings.ts`, `schemas/wizard.ts`; `packages/db/prisma/schema.prisma` (`OtpRequest`, `Listing`); `apps/sms-gateway/src/routes/send.ts`
