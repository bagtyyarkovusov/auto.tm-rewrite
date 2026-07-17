# packages/contracts — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Schema files for all 10 bounded contexts exist (most are skeletons — populated as the owning sprint ships its API).

## Purpose

Shared API contracts. Owns:

- Zod schemas describing every API request + response body
- OpenAPI exporter that generates `openapi.json` from those Zod schemas
- TypeScript types derived from the Zod schemas (used by mobile, admin, web)
- A small typed client wrapper for convenient consumption

## What it contains

```
packages/contracts/
├── src/
│   ├── schemas/
│   │   ├── auth.ts             OTP request/verify/refresh/logout schemas + admin TOTP status/enroll/verify schemas (S7)
│   │   ├── identity.ts         User, Dealership, Garage schemas
│   │   ├── catalog.ts          Brand, Model, Generation, Color, BodyType, Region, City schemas
│   │   ├── listings.ts         ListingSummary, ListingDetail, ListingMedia, ListingDraft, ListingFilter, request/response DTOs, cursor helpers, error codes
│   │   ├── uploads.ts          PresignRequest/Response for MinIO uploads
│   │   ├── exchange-rates.ts   ExchangeRate DTOs
│   │   ├── subscriptions.ts    SavedSearch schemas
│   │   ├── conversations.ts    S6 + S10 HTTP/Socket chat DTOs for text, image, post-ref, watermarks, presence, mute, delete, and attachment presign
│   │   ├── notifications.ts    Native push-token registration, direct-message job/history, and preference DTOs
│   │   ├── content.ts          BlogPost schemas
│   │   ├── reports.ts          Inspection report schemas (Phase 2)
│   │   └── admin.ts            Admin moderation/report DTOs, including S10 message-report context and contracts
│   ├── enums.ts                Shared enums (UserRole, ListingStatus, etc.)
│   ├── errors.ts               Error code enum + ErrorResponse schema
│   ├── pagination.ts           Cursor + Offset pagination schemas + AdminTablePaginationRequestSchema (default 50, max 100)
│   ├── openapi.ts              OpenAPI generator
│   └── index.ts                Re-exports
├── tsconfig.build.json         CJS runtime build for Node consumers
├── scripts/build.cjs           Build helper that writes dist/package.json, serializes builds with .build.lock, and runs tsc
├── eslint.config.mjs           Lints source/config files; ignores generated dist output
├── package.json
└── CONTEXT.md
```

## Conventions

- Every API endpoint has a matching schema pair: `XRequest` and `XResponse`
- Enums declared once in `enums.ts`, referenced by Zod via `z.nativeEnum(MyEnum)`
- Admin-only constants (report reasons, content-report statuses, audit actions, canonical `details.reason` values) live in `schemas/admin.ts` so they are not duplicated downstream
- Error responses follow a single shape: `{ statusCode, code, message, details?, timestamp, requestId }`
- Pagination uses two shapes: `CursorPagination` (feeds) and `OffsetPagination` (admin tables)
- Admin-table pagination uses a dedicated `AdminTablePaginationRequestSchema` with default `pageSize = 50` and effective max `pageSize = 100`

## OpenAPI generation

```bash
pnpm --filter contracts run openapi:generate
# → outputs openapi.json + openapi.yaml
```

CI runs this on every PR to detect contract drift. The output is checked in (or generated reproducibly and diffed).

## Versioning

API base path is `/api/v1`. When a breaking change is needed:
1. New schemas added under a `v2/` sub-folder
2. New routes mounted at `/api/v2/...`
3. Old `v1/` deprecated for ≥6 months before removal

## Public API surface (today)

`src/index.ts` re-exports each schema namespace + shared utilities:

```ts
export * as Enums from "./enums";
export { ErrorCode, ErrorResponseSchema, type ErrorResponse } from "./errors";
export { CursorPaginationRequestSchema, CursorPaginationResponseSchema, ...types } from "./pagination";
export { OffsetPaginationRequestSchema, OffsetPaginationResponseSchema, AdminTablePaginationRequestSchema, ...types } from "./pagination";
export * as AuthSchemas from "./schemas/auth";
export * as IdentitySchemas from "./schemas/identity";
export * as CatalogSchemas from "./schemas/catalog";
export * as ListingsSchemas from "./schemas/listings";
export * as UploadsSchemas from "./schemas/uploads";
export * as ExchangeRatesSchemas from "./schemas/exchange-rates";
// ... one namespace per bounded context (10 total)
export { generateOpenApiDocument } from "./openapi";
```

Schema files are populated as their owning surfaces ship. Current substantive contracts cover auth and admin TOTP, identity, catalog, listings/search/favorites/trust, uploads, exchange rates, rich conversations, native push registration and direct-message delivery, inspection-interest reports, and admin moderation including message reports. `subscriptions.ts`, `content.ts`, and the Phase-2 portion of `reports.ts` remain intentionally skeletal until their owning bets are shaped.

S7 auth contract additions keep the normal OTP/refresh response schemas unchanged and add separate admin TOTP schemas in `schemas/auth.ts` for `GET /auth/admin/totp/status`, `POST /auth/admin/totp/enroll`, and `POST /auth/admin/totp/verify`. Status returns only `enrolled`, `elevated`, and `adminTotpExpiresAt?`; it never returns secret material, QR material, backup codes, or backup-code counts. Enroll returns QR/enrollment material only, using issuer label `auto.tm Admin`; verified re-enroll returns HTTP 409 `CONFLICT` with `details.reason = "TOTP_ALREADY_ENROLLED"`, while pending unverified enrollment may be replaced. Verify accepts a single `code` field: during first enrollment it must be a TOTP code and returns `adminTotpExpiresAt` plus the 10 plaintext backup codes exactly once; after enrollment it accepts either a TOTP code or one backup code for elevation and returns `adminTotpExpiresAt` only. TOTP accepts the current 30-second step plus one adjacent step for small clock skew. Wrong TOTP and wrong backup code share the same generic error shape; throttled verification uses the standard rate-limit error. `AdminGuard` returns 403 when TOTP elevation is expired; refresh preserves but does not extend `adminTotpExpiresAt`.

S9a reports contract additions populate `schemas/reports.ts` with the fake-door `InspectionInterest` DTOs: `InspectionInterestSide` (`buyer` | `seller`), `CreateInspectionInterestRequestSchema` (optional `willingnessToPayTmt` int 0–10000), `CreateInspectionInterestResponseSchema` (includes `reusedExisting`), `InspectionInterestCountItemSchema` (aggregate counts + willingness-to-pay sum/count/avg by listing), and `ListInspectionInterestStatsResponseSchema` (admin-table pagination). The Phase-2 `InspectionReportSummarySchema` stub remains.

S9a admin config additions expose `inspectionInterestEnabled` in `schemas/admin.ts` `ConfigResponseSchema` without leaking internal flag names.

S10 rich-chat contracts (consumed by the shipped API, worker, and mobile behavior):
- `schemas/conversations.ts` gains `MessageKindSchema`, `ImageMessageMetadataSchema`, `PostRefMessageMetadataSchema`, `MessageMetadataSchema`, a richer `MessageSummarySchema` with `kind`, nullable `text`, optional `metadata`, `deletedAt`, and `clientMessageId`, and `unreadCount` on `ConversationSummarySchema`. Existing S6 text DTOs (`SendTextMessageRequestSchema`/`SendTextMessageResponseSchema`) remain unchanged for backward compatibility.
- `ConversationSummarySchema` also gains optional nullable `mutedAt` — the requesting participant's own mute timestamp — so clients can render per-conversation mute state that survives a refetch (#246).
- New request/response/event DTOs in `schemas/conversations.ts`: `SendMessageRequestSchema` (text/image discriminated union), dedicated post-ref send DTOs, `SendMessageResponseSchema`, `UpdateWatermarkRequestSchema`/`UpdateWatermarkResponseSchema`, `MuteConversationRequestSchema`/`MuteConversationResponseSchema`, `DeleteMessageResponseSchema`, `DeleteMessageSocketRequestSchema`, `PresignChatAttachmentRequestSchema`/`PresignChatAttachmentResponseSchema`, `JoinConversationRequestSchema`/`JoinConversationResponseSchema`, `LeaveConversationRequestSchema`/`LeaveConversationResponseSchema`, `ConversationSocketErrorSchema`, plus socket payloads `ChatMessageEventSchema`, `MessageDeletedEventSchema` (includes `conversationId`), `TypingStartRequestSchema`, `TypingStopRequestSchema`, `TypingEventSchema`, `PresenceEventSchema`, and `WatermarkEventSchema`.
- `schemas/notifications.ts` gains `PushPlatformSchema`, `RegisterPushTokenRequestSchema`/`RegisterPushTokenResponseSchema`, and `NotificationPreferencesSchema`/`UpdateNotificationPreferencesRequestSchema`/`UpdateNotificationPreferencesResponseSchema`.
- `schemas/admin.ts` gains `ReportTargetType` constant (listing/user/message/content_report), `CreateMessageReportRequestSchema`, and `MessageReportContextSchema`; `ReportListItemSchema` and `ReportDetailTargetSchema` now accept `message` targets and carry optional message/conversation context fields.
- `src/enums.ts` adds `PushPlatform` (`android` | `ios` | `web`).
- `src/openapi.ts` registers all new DTOs so the OpenAPI document reflects them.

S7 admin web session contracts keep `apps/api` bearer-only. Admin cookies are an `apps/admin` server concern, not accepted by API guards: production names are `__Host-auto_tm_admin_access` and `__Host-auto_tm_admin_refresh` when host-prefix constraints are available, with local-dev unprefixed names allowed only when needed. Admin server actions / route handlers may refresh once after API 401 and retry once, but 403 from expired TOTP elevation redirects to TOTP verification with relative-only `returnTo`. Browser-posted admin route handlers validate `Origin`; rendered admin pages and client-readable payloads must not expose access/refresh tokens.

S7 moderation contract additions populate `schemas/admin.ts` with `ContentReport` DTOs and use the shared report reason enum `spam | scam | misleading | wrong_category | harassment | other`. Public report creation keeps resource-shaped paths (`POST /api/v1/listings/{id}/report`, `POST /api/v1/users/{id}/report`) but uses admin-owned request/response schemas because `ContentReport` belongs to `admin/`; there is no global report route and no message report contract unless S6 is explicitly reshaped. `details` is optional except when `reason = other`, where it is required as non-empty plain text after trimming leading/trailing whitespace and capped at 1000 chars after trim; internal line breaks are preserved, and S7 does not support Markdown/HTML, linkification, rich previews, truncation-contract fields, PII scanning, translation, profanity filtering, or moderation classifiers for report details. Reason values stay canonical enum values in the API; admin UI labels are local presentation. `wrong_category` is valid only for listing reports; `harassment` is valid for user reports. Report target references are polymorphic DTO fields (`targetType`, `targetId`) with application-level existence validation, not DB FK exposure. Listing reports require an `active` listing; missing, soft-deleted, draft, archived, banned, and other non-public listing targets return HTTP 404 using the standard `NOT_FOUND` error code. Visible but non-reportable listing states such as `sold` return HTTP 400 `VALIDATION_FAILED` with `details.reason = "REPORT_TARGET_NOT_REPORTABLE"`. User reports require an existing, non-deleted user reachable through a public surface; hidden/missing user targets return `NOT_FOUND`, and suspended users are reportable only while visible/reachable. Self-report attempts are rejected with HTTP 400 using the standard `VALIDATION_FAILED` error code and `details.reason = "SELF_REPORT_NOT_ALLOWED"` when the user target is the reporter or the listing target belongs to the reporter. Public report creation uses the standard global throttler behavior and standard `RATE_LIMITED` error if that throttler rejects; S7 exposes no report-specific quota, remaining-count, or reset-time contract. Public report creation returns HTTP 201 for new rows and HTTP 200 for duplicate pending reuse by the same reporter/target. Both responses use `{ reportId, status, createdAt, reusedExisting }`; duplicate reuse preserves the original `createdAt`, emits no `ContentReportCreated`, and public responses do not expose other reporters' report counts. S7 exposes no public report history, public status-detail, edit-report, retract-report, appeal, or support-ticket schemas/routes; only admin routes inspect and resolve `ContentReport` rows. Admin report list requests use the existing `OffsetPaginationRequestSchema` (`page`, `pageSize`; default page size 50) refined to max 100, default to `status = pending`, sort by `createdAt ASC, id ASC`, and allow only `status` + `targetType` filters in S7; invalid filters or invalid `page`/`pageSize` return HTTP 400 `VALIDATION_FAILED`. List response rows expose exactly `id`, `status`, `createdAt`, `reason`, `targetType`, `targetId`, and `targetSummary`. `targetSummary` is live-resolved: listing targets use a display title such as year/make/model or listing title when available; user targets use a public display label when available; missing targets use an unavailable/deleted marker such as `{ available: false, label: "Unavailable target" }` while preserving `targetType` + `targetId`. List rows do not include report `details` preview text, reporter identity fields, full target state, counts, actionability flags, or `target.role`. Admin report detail DTOs must tolerate deleted reporters/reviewers and unavailable targets, and contain only lean S7 context: reporter summary or deleted-user state, target summary or target-unavailable state, reason/details, status/timestamps, target current moderation state, `reportsSubmittedByReporterCount` when reporter still exists, and `pendingReportsOnTargetCount`. Detail target summaries may include listing title/year/make/model/status and, for user targets, admin-only `target.role`; public report creation and report list rows never expose target role. Reporter/reviewer summaries are live minimal identity summaries or deleted-user state; `ContentReport` stores no phone/name/profile snapshots. `pendingReportsOnTargetCount` counts currently pending reports for the same `targetType` + `targetId`, including the current report if still pending. `reportsSubmittedByReporterCount` counts all historical S7 report rows by that reporter across listing/user targets and all statuses; omit it when `reporterUserId` is null after deletion. Both counts are computed live by `GetReportDetail`; S7 does not expose denormalized count columns, counter resources, or client-maintained aggregate state. Admin moderation command request schemas (`dismiss`, `ban`, `unban`, `suspend`, `unsuspend`) require a non-empty internal plain-text `reason` after trim, capped at 1000 chars after trim, with line breaks preserved; there is no admin reason enum/picker/template/classifier in S7. Admin mutation endpoints return HTTP 200 JSON with `auditLogId` (never `204`); shapes per `admin/CONTEXT.md` (dismiss / report-backed / direct / unban-unsuspend variants). Unban/unsuspend request schemas do NOT accept `reportId`. Direct moderation actions return `NOT_FOUND` for missing/deleted targets and HTTP 409 `CONFLICT` with `details.reason = "MODERATION_TARGET_STATE_CONFLICT"` when an existing target is in the wrong state; failed state conflicts write no audit row and perform no mutation. Direct ban/suspend without `reportId` leaves all pending reports on that target untouched and does not expose pending-report warning counts in S7. Admin ban/suspend request schemas also include optional `reportId`; when present, the API validates before mutation: unknown referenced reports return `NOT_FOUND`, existing reports whose `targetType`/`targetId` does not match the route target return HTTP 400 `VALIDATION_FAILED` with `details.reason = "REPORT_TARGET_MISMATCH"`, matching already-resolved reports return HTTP 409 `CONFLICT` with `details.reason = "REPORT_ALREADY_RESOLVED"`, and only the supplied matching pending report can be marked `actioned` atomically if the current target remains actionable. Other pending reports on the same target remain pending for manual dismissal; S7 does not cascade `actioned` or `dismissed` to sibling reports. Pending reports are always dismissible; report-backed ban requires an existing active listing, and report-backed suspend requires an existing non-deleted, unsuspended user. Report-backed actionability is current-state only: a still-pending report is not invalidated by earlier direct ban/unban or suspend/unsuspend cycles, and S7 adds no moderation epoch, report invalidation snapshot, staleness-lock contract fields, or idempotency keys. Double submits rely on current-state validation: after a successful first request, the second returns `REPORT_ALREADY_RESOLVED` for the same report or `MODERATION_TARGET_STATE_CONFLICT` for the changed target state. Pending reports do not expire or auto-dismiss; S7 exposes no age-based report state, SLA timer field, scheduled-cleanup contract, or auto-close behavior. A pending report whose target is no longer actionable returns HTTP 409 with the standard `CONFLICT` error code, `details.reason = "REPORT_TARGET_NOT_ACTIONABLE"`, and current target state when known; the failed request leaves the report pending and writes no audit row. The dismiss-report schema is the only report-only resolution command. Concurrent attempts to resolve an already-resolved report return HTTP 409 with the standard `CONFLICT` error code and `details.reason = "REPORT_ALREADY_RESOLVED"` plus current report status.

The S7 paragraph above records that sprint's listing/user-only boundary. S10 supersedes the message-report exclusion with `CreateMessageReportRequestSchema`, message target/context DTOs, and the resource-shaped conversation message report route; there is still no global report route.

S7 admin contracts own their constants. `schemas/admin.ts` exports report reason values, content-report status values, admin audit action constants, and canonical admin `details.reason` values so `apps/api` and `apps/admin` do not duplicate string literals. `enums.ts` hosts values shared beyond admin; admin-only constants stay in `schemas/admin.ts` unless they become cross-context.

S7 public report response DTOs expose only `{ reportId, status, createdAt, reusedExisting }`. `reusedExisting` is the only duplicate indicator. Public report responses must not expose `targetSummary`, sibling counts, reporter history counts, target role/staff state, reviewer state, admin notes, or actionability.

S7 target and actor summaries are stable DTOs. `targetSummary` uses an `available` boolean plus `label`, `targetType`, and `targetId`; unavailable targets use `available = false` and label `"Unavailable target"` while preserving ids. Audit `actorSummary` distinguishes deleted authenticated admins from operator scripts; `ADMIN_BOOTSTRAP_PROMOTE` with `actorId = null` is operator provenance, not a deleted admin.

Visible admin users are valid public user-report targets if reachable through the same public surfaces as any other user; public report creation exposes no staff role field or special staff-target error. Admin report detail includes admin-only `target.role` for user targets so clients can explain/disable admin-target suspension, but admin report list rows do not include target role or reporter identity fields. List rows may include a minimal target summary that does not expose staff role. Admin-target reports can be dismissed, but report-backed suspend/unsuspend remains forbidden by the admin-account moderation policy below.

S7 exposes no reported-owner/reported-user report metadata contracts: no public or owner-facing report count, report reason/details, reporter identity, report status, or admin-note DTO fields. Moderated targets expose only generic banned/suspended state through the owning context surfaces.

S7 exposes no target-lock, moderation-hold, legal-hold, or pending-report lifecycle-freeze contract. Existing owner/account lifecycle routes remain owned by `listings/` and `identity/`; if a reported listing/user disappears before review, admin report detail uses the target-unavailable shape and report-backed ban/suspend returns `REPORT_TARGET_NOT_ACTIONABLE`.

S7 report validity is creation-time for the reporter: later reporter suspension or deletion does not change report status/actionability. Deleted reporters use the existing deleted-user state, and S7 exposes no reporter-trust score, abusive-reporter invalidation flag, or retroactive report purge contract.

S7 moderation contracts do not allow admin account moderation. Suspend/unsuspend requests against `role = admin` targets return HTTP 403 `FORBIDDEN` with `details.reason = "ADMIN_TARGET_NOT_MODERATABLE"`; self suspend/unsuspend returns HTTP 403 `FORBIDDEN` with `details.reason = "SELF_MODERATION_NOT_ALLOWED"`. These responses do not mutate user state, write audit rows, or resolve a supplied report.

S7 enforcement contracts are synchronous current-state checks, not async event side effects. Public banned listing detail for non-owners returns `NOT_FOUND`, public feed/search/favorites omit banned listings, owner surfaces may show only a generic banned state, and owner listing mutations are blocked for banned listings until admin unban. Unban restores only `banned -> active`; it does not clear favorites, emit saved-search notifications, or resolve/dismiss pending reports. Suspended-user marketplace mutations return HTTP 403 `FORBIDDEN` with `details.reason = "USER_SUSPENDED"` and generic client copy. Existing conversations remain readable, but new contact/message sends are blocked when either participant is suspended. S7 moderation events have no user-facing notification, conversation system-message, or worker contract.

Private-beta disabled-feature contracts use the standard error envelope with HTTP 403 `FORBIDDEN` and canonical `details.reason = "FEATURE_DISABLED"`. Public clients must not receive internal flag names. The planned MLP flags are `SIGNUPS_ENABLED`, `LISTING_PUBLISH_ENABLED`, `LISTING_MUTATIONS_ENABLED`, `CONTACT_ENABLED`, `REPORT_ENTRY_ENABLED`, and `ADMIN_MODERATION_ACTIONS_ENABLED`; the flags themselves are server/operator config, while contracts expose only the disabled-feature reason.

S7 audit contracts expose canonical action string constants rather than a Prisma enum. S7 constants are `ADMIN_BOOTSTRAP_PROMOTE`, `LISTING_BAN`, `LISTING_UNBAN`, `USER_SUSPEND`, `USER_UNSUSPEND`, and `CONTENT_REPORT_RESOLVE`. Audit detail DTOs expose `details` JSON for required internal plain-text `reason`, `reportId?`, `reportedTargetType?`, `reportedTargetId?`, `before?`, `after?`, and action-specific fields. Audit list DTO rows expose only `id`, `createdAt`, `action`, `actorSummary`, `targetType`, `targetId`, short target label, and optional one-line escaped plain-text `reasonPreview`; list rows do not expose full `details` JSON. `actorSummary` renders deleted/null actors as "Deleted admin" for normal admin actions and "Operator script" for `ADMIN_BOOTSTRAP_PROMOTE`. Missing/deleted target lookups return an unavailable-target summary such as `{ available: false, label: "Unavailable target" }` while preserving `targetType` + `targetId`; the audit list must not fail because the current target disappeared. `details.before` / `details.after` stay minimal and structured: dismiss records report status before/after; report-backed ban/suspend records supplied report status before/after plus listing status or user suspension fields before/after; direct ban/unban records listing status before/after; direct suspend/unsuspend records user suspension fields before/after. `ADMIN_BOOTSTRAP_PROMOTE` rows use `actorId = null`, `targetType = "user"`, `targetId = promotedUserId`, required normalized `details.reason`, and `details.before.role` / `details.after.role`; they do not store phone snapshots, and idempotent already-admin no-ops write no duplicate audit row. `CONTENT_REPORT_RESOLVE` rows use `targetType = "content_report"` and `targetId = reportId`, with `details.reportedTargetType` and `details.reportedTargetId` preserving the listing/user target. Report-backed `LISTING_BAN` and `USER_SUSPEND` rows target the moderated listing/user and carry `details.reportId`. Audit list requests use `OffsetPaginationRequestSchema` refined to max 100, default `createdAt DESC, id DESC`, and allow only `action`, `targetType`, and `targetId` filters in S7. Invalid filters or invalid `page`/`pageSize` use HTTP 400 `VALIDATION_FAILED`. S7 exposes no CSV/export or audit-retention-control contract; audit rows are append-only and retained indefinitely for the MLP.

S7 report and audit list contracts use a stricter admin-table pagination contract than the shared `OffsetPaginationRequestSchema` currently enforces globally: default `pageSize = 50`, effective max `pageSize = 100`, valid pages beyond the current result set return HTTP 200 with empty rows plus normal pagination metadata, and invalid `page` / `pageSize` values return HTTP 400 `VALIDATION_FAILED`. S7 report/audit filters remain column-backed only; there is no `details` JSON filter contract.

All S7 admin/auth datetime fields use ISO-8601 strings validated with the existing `z.string().datetime()` convention: `createdAt`, `reviewedAt`, `adminTotpExpiresAt`, audit timestamps, mutation response timestamps, and error timestamps. Contracts do not exchange raw `Date` objects or locale-formatted date strings.

OpenAPI generation is part of S7 contract ownership. The contracts child issue adds/administers the Zod schemas and reproducible OpenAPI diff before API/admin route consumers depend on them.

The package export points at built CommonJS output in `dist/` so runtime consumers (`apps/api`, `apps/mobile`) do not execute raw TypeScript. `dist/` is ignored by git and package lint, then regenerated by `pnpm --filter @auto-tm/contracts build`. The `.cjs` build helper is intentionally CommonJS because it runs before the package emits CommonJS `dist/package.json`. See [ADR-0016](../../docs/adr/0016-typescript-runtime-boundaries.md).

## Dependencies

- `zod` (^3.23)
- `zod-to-openapi` for spec generation
- Consumed by `apps/api`, `apps/admin`, `apps/web`, `apps/mobile`

## Notable decisions

- Centralizing contracts here prevents drift between server (NestJS DTOs) and clients (mobile/admin/web)
- Zod chosen over class-validator for the contract layer; NestJS still uses class-validator for HTTP DTOs internally, derived from Zod schemas at module boundary
- [ADR-0016](../../docs/adr/0016-typescript-runtime-boundaries.md) — Built package exports for Node + bundler consumers
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
