# Sprint 9 — Admin dashboard

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | M7 — Admins run the place |
| **Demo audience** | Go-to-market planning |
| **Estimated time** | ~1 week |

## Goal

A non-technical admin runs the marketplace day-to-day: moderates content, manages users, verifies dealers, broadcasts announcements, watches SMS gateway health — all in the web UI, without SSH.

## User capability (the demo line)

> "I log in to admin.auto.tm with my phone + TOTP. I see the moderation queue (3 reports pending), I open one, look at the conversation context, suspend the offending user, and write a note. I check the SMS gateway: all 5 phones green. I broadcast 'New blog post: Tips for buying a used Land Cruiser' to everyone subscribed to blog activity."

## Bounded contexts touched

- **Primary**: `admin/` (audit log, moderation, staff-media attribution)
- **Supporting**: each of the 8 other contexts gets at least one admin-facing query/command; `apps/admin` is the consumer UI

## Acceptance criteria (DoD)

### Schema additions (Prisma migration)

S9 broadens the schemas in `apps/api/src/modules/admin/CONTEXT.md` + `identity/CONTEXT.md` (Planned sections) to support the admin dashboard end-to-end:

- [ ] `AuditLog.action` evolves from `String` to a typed Prisma enum `AuditAction` (`LISTING_BAN` | `LISTING_UNBAN` | `USER_SUSPEND` | `USER_UNSUSPEND` | `DEALERSHIP_VERIFY` | `DEALERSHIP_UNVERIFY` | `NOTIFICATION_BROADCAST` | `LISTING_PIN` | `CATALOG_EDIT` | `CONTENT_REPORT_RESOLVE`). Migration backfills existing String rows.
- [ ] `AuditLog` adds: `beforeJson?` (state before action), `afterJson?` (state after), `reason?` (free-form admin note). `details` JSON column may stay alongside for complex cases.
- [ ] New `ContentReport` entity: id, reporterUserId (FK → User), targetType (`listing` | `blog_post` | `user` | `message`), targetId, reason, details?, status (`pending` | `actioned` | `dismissed`), reviewedById? (FK → User), reviewedAt?, createdAt.
- [ ] New `TotpEnrollment` entity (per ADR-0006 / ADR-0012 deferral): id, userId (FK → User, unique), encryptedSecret (the TOTP shared secret), confirmedAt?, createdAt. Admin login enforces this on first elevation.
- [ ] `Dealership` adds `verifiedAt?` (DateTime) for PRO badge state.
- [ ] `Listing.status` enum adds `reported` and `banned` if not added in S4 (coordinate with S4 outcome).
- [ ] Prisma migration is reversible.

### Identity ports + events (the dependencies the rest of S9 needs)

- [ ] `IdentityReadPort` interface lands in `apps/api/src/modules/identity/domain/ports/`: `getUserSummary(userId)`, `getDealershipSummary(dealershipId)` (returns `verifiedAt?` after the migration), `isUserBlockedBy(userId, possibleBlockerId)`.
- [ ] `UserSuspended`, `UserUnsuspended`, `DealershipVerified`, `SessionRevoked` event emissions wired to admin moderation actions.
- [ ] `AuditEntryRecorded` event emitted on every audit-log write (consumed by Loki + analytics).

### Auth
- [ ] Admin login enforces TOTP 2FA (charter §6)
- [ ] `super_admin` distinct from `admin`; certain actions (e.g., delete user, push important override) gated on super
- [ ] Session timeouts shorter than mobile (e.g., 60 min idle)

### Moderation
- [ ] Reports queue: `GET /api/v1/admin/reports?status=open` paginated
- [ ] Open report detail: shows reporter, reported user/listing, context (last 10 chat messages if applicable), prior history
- [ ] Actions: dismiss, warn (sends a system message to user), suspend (X days), ban permanently, delete content
- [ ] Every action writes an `AuditLog` row with actor + target + reason

### User management
- [ ] User search by phone / display name
- [ ] User detail: listings, conversations count, reports filed against, reports filed by
- [ ] Suspend / reinstate / delete (super-admin only for delete)

### Dealer verification
- [ ] Pending-verification queue
- [ ] One-click PRO badge toggle (built in S6; this surfaces the queue UI)

### SMS gateway health
- [ ] Dashboard widget shows: phone status (online/offline), last successful send, queue depth, daily quota usage per phone
- [ ] Polls `apps/sms-gateway` `/v1/health` endpoint every 30 s

### Broadcast tool
- [ ] Compose announcement (RU/TK/EN); preview; send to: all / by-category-opt-in / specific dealership members
- [ ] Categorized correctly (so a marketing broadcast respects marketing opt-out — see S8)
- [ ] `important` override (super_admin only) for outages/security — bypasses category but stays opt-out-able

### Catalog edit (re-exposes S3 admin APIs in the UI)
- [ ] CRUD for Brand / Model / Generation / City; locale-aware editor showing missing translations

### Misc
- [ ] **Account-deletion-requests dashboard**: GDPR-style audit trail of `DELETE /api/v1/me` invocations
- [ ] **Marketplace metrics dashboard**: DAU/WAU, active listings 7-day trend, and city supply/demand aggregates (active listings, searches, saved searches, favorite/chat/call starts by listing city). Per ADR-0022, this stores catalog `regionId` / `cityId` aggregates only, not raw GPS coordinates.
- [ ] `admin/CONTEXT.md` updated (now contains real audit-log invariants)
- [ ] `docs/prd/03-roadmap.md` updated (S9 🟢, S10 🟡)

## Tests required (TDD mandatory)

- **Domain**: `AdminAction` enum, `AuditLogEntry` invariants (actor required, target required, timestamp immutable), `SuspensionDuration` VO
- **Application**: each moderation use-case — `DismissReport`, `WarnUser`, `SuspendUser`, `BanUser`, `DeleteUserContent`
- **Infrastructure** (Testcontainers): audit log writes are atomic with the action
- **Presentation** (e2e): admin-only route guard; non-admin gets 403

## Files this sprint creates / touches

```
apps/api/src/modules/admin/
├── domain/
│   ├── AuditLog.ts, AdminAction.ts, ReportTicket.ts
│   └── ports/{AuditLogRepository,ReportTicketRepository}.ts
├── application/
│   ├── moderation/
│   │   ├── ListOpenReports.ts, GetReportDetail.ts
│   │   ├── DismissReport.ts, WarnUser.ts, SuspendUser.ts, BanUser.ts, DeleteListing.ts
│   ├── users/
│   │   ├── SearchUsers.ts, GetUserDetail.ts, ReinstateUser.ts, ForceDeleteUser.ts (super)
│   ├── broadcast/
│   │   ├── ComposeAnnouncement.ts, SendAnnouncement.ts
│   ├── sms/
│   │   ├── GetGatewayHealth.ts          Proxies sms-gateway health
└── presentation/
    ├── AdminReportsController.ts
    ├── AdminUsersController.ts
    ├── AdminBroadcastController.ts
    └── AdminSmsHealthController.ts

apps/admin/src/app/(admin)/
├── moderation/{page,[id]/page}.tsx
├── users/{page,[id]/page}.tsx
├── dealerships/page.tsx (S6 wired)
├── broadcast/page.tsx (S8 wired)
├── catalog/{brands,models,regions}/page.tsx (S3 wired)
├── sms/page.tsx
└── settings/page.tsx (TOTP enroll, etc.)
```

## References

- **PRD feature**: [`../features/40-admin.md`](../features/40-admin.md)
- **End-to-end flow**: [`../flows/65-admin-moderation.md`](../flows/65-admin-moderation.md)
- **Launch analytics plan**: [`../ops/85-launch-analytics-plan.md`](../ops/85-launch-analytics-plan.md)
- **Charter sections**: §5 (Admin context), §6 (Admin auth — TOTP), §8 (Announcement override)
- **Location decision**: [`../../adr/0022-city-first-listing-location.md`](../../adr/0022-city-first-listing-location.md)
- **Analytics decision**: [`../../adr/0023-first-party-product-analytics.md`](../../adr/0023-first-party-product-analytics.md)

## Previous-sprint dependencies

- S2 — auth (admin role)
- S3 — Catalog admin endpoints (S9 surfaces them in UI)
- S4 — Listings (moderation needs content to moderate)
- S6 — Dealership verification queue
- S7 — Conversations (chat context in report detail; system messages from "warn user")
- S8 — Notifications (broadcast respects categories)

## Open questions / risks

- **TOTP enrollment**: how do new admins enroll? Decision: bootstrap via direct DB insert + recovery codes printed; UI flow for the second-onwards admin. Document the bootstrap in `ops/82-incident-template.md`.
- **Audit log retention**: forever? GDPR concern. Decision: keep for 7 years (TM commercial-record norm); anonymize personal identifiers after 2 years if user requested deletion.
- **Moderation queue ownership**: if 2 admins click "suspend" on the same report, only one wins. Decision: optimistic lock on `ReportTicket.status`.
