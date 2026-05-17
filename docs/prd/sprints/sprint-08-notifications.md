# Sprint 8 — Notifications + saved-search match

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | M6 — I get notified |
| **Demo audience** | Beta testers (full notifications loop) |
| **Estimated time** | ~1 week |

## Goal

Two intertwined deliverables:

1. **Notifications stack** — 6 categories, per-category opt-out, per-item mute, in-app feed, FCM/APNS push, history, admin override for outages/security.
2. **Saved-search match** — `ListingCreated` event triggers MatchEvaluator → fans out push + in-app entries, rate-limited (max 1/saved-search/hour bundled digest).
3. **Async media pipeline** — worker takes over video transcoding (ffmpeg → HLS) + image variant generation that S4 ran synchronously.

## User capability (the demo line)

> "I save a search for BMW X5 in Ashgabat. Later that day, somebody lists one. My phone buzzes — push notification 'New match: 2023 BMW X5'. I tap it and land on the listing. If three more match in the next hour, they bundle into a digest instead of three separate buzzes."

## Bounded contexts touched

- **Primary**: `notifications/` (full four-layer), `subscriptions/MatchEvaluator`
- **Supporting**: `apps/worker` (BullMQ consumers for fan-out + transcode); `apps/admin` (broadcast tool)

## Acceptance criteria (DoD)

### Schema additions (Prisma migration)

S8 broadens the schemas in `apps/api/src/modules/notifications/CONTEXT.md` + `subscriptions/CONTEXT.md` (Planned sections):

- [ ] `FcmDevice` adds: `deviceId` (String), `registeredAt`, `lastUsedAt`, `invalidatedAt?` — on FCM/APNS "token invalid" response, set `invalidatedAt` and skip future sends. (Optional rename to `PushToken`.)
- [ ] `NotificationHistory` adds broadcast-tracking fields: `recipientGroup?` (e.g., `"all-admins"`), `sentByUserId?` (admin-initiated), `deliveryDetails` (JSON of per-token success/fail), `totalRecipients` (Int), `successfulDeliveries` (Int), `failedDeliveries` (Int).
- [ ] New `SavedSearchMatchHistory` entity (in subscriptions): id, savedSearchId (FK → SavedSearch, Cascade), listingId (FK → Listing, Cascade), notifiedAt. Prevents duplicate alerts when the same listing matches the same search.
- [ ] `apps/mobile` adds `expo-notifications` dep (not in package.json today) for FCM/APNS device token registration.
- [ ] `apps/worker` adds `firebase-admin` dep + a new `push.processor.ts` BullMQ consumer + `sharp` dep for image variants + ffmpeg toolchain for video transcoding.
- [ ] Prisma migration is reversible.

### Notifications transport
- [ ] `PushPort` interface (charter §8) with three implementations: FCM, APNS, test
- [ ] `POST /api/v1/me/fcm-devices` registers a device token; `DELETE` unregisters
- [ ] APNS token registration parallel
- [ ] `POST /api/v1/me/notification-preferences` updates per-category opt-out
- [ ] `GET /api/v1/me/notifications` returns paginated in-app feed
- [ ] `POST /api/v1/me/notifications/{id}/read` marks read
- [ ] `GET /api/v1/me/notifications/unread-count` for badge

### Categories (6 — charter §8)
- [ ] `direct_message` — one push per chat message when offline
- [ ] `saved_search` — bundled digest, rate-limited
- [ ] `listing_activity` — favorited / shared / sold
- [ ] `admin_announcement` — admin broadcast
- [ ] `blog_activity` — new post from someone I follow (basic)
- [ ] `marketing` — admin tool, separate opt-in
- [ ] Admin "important" override (charter §8) for outages/security: bypasses category opt-out but stays per-user opt-out-able

### Saved-search match
- [ ] On `ListingCreated` event (emitted from `listings/PublishListing.ts`), `MatchEvaluator` queries all active SavedSearches
- [ ] Match algorithm: same filter shape as `SearchListings` (re-use to prevent drift)
- [ ] Rate limit: max 1 notification per saved-search per hour; if matches accumulate, bundle into a "3 new BMW X5s match your search" digest
- [ ] Saved-search digest writes one `NotificationHistory` row + one push (not N)
- [ ] Per-search mute respected
- [ ] `lastDigestAt` on `SavedSearch` updated atomically with the digest send

### Worker async media
- [ ] `ListingMediaUploaded` event enqueues a `video-transcode` job (for video) or `image-variants` job (for image)
- [ ] Video: ffmpeg → 720p + 320p HLS + poster frame at 2 s
- [ ] Image: Sharp → thumbnail/list/detail/fullscreen JPEG + WebP per charter §11
- [ ] Variants registered back on `ListingMedia` (URLs by variant key)
- [ ] Orphan cleanup nightly cron: MinIO objects not referenced after 24 h are deleted (charter §11)
- [ ] `notifications/CONTEXT.md` + `subscriptions/CONTEXT.md` updated
- [ ] `docs/prd/03-roadmap.md` updated (S8 🟢, S9 🟡)

## Tests required (TDD mandatory)

- **Domain**: `NotificationCategory` enum + opt-out logic; `MatchEvaluator` predicate composition (mirror of `ListingFilter` from S5); `Digest` bundling rules + 1-hour window
- **Application**: `SendPush`, `EvaluateMatchesForListing`, `BuildDigest`, `UpdateNotificationPreferences`, `RegisterFcmDevice`
- **Infrastructure** (Testcontainers): repositories; `FcmPushAdapter` against a fake FCM server (use `nock` or the FCM emulator if reachable from TM Proxy PC)
- **Worker**: BullMQ consumers smoke-tested with `bullmq` test mode
- **Presentation**: e2e covering preference update → next match respects the new opt-out

## Files this sprint creates / touches

```
apps/api/src/modules/notifications/
├── domain/
│   ├── Notification.ts, NotificationCategory.ts, NotificationPreference.ts
│   ├── FcmDevice.ts
│   └── ports/{PushPort,NotificationHistoryRepository,FcmDeviceRepository,NotificationPreferenceRepository}.ts
├── application/
│   ├── RegisterFcmDevice.ts, UnregisterFcmDevice.ts
│   ├── ListMyNotifications.ts, MarkRead.ts, GetUnreadCount.ts
│   ├── UpdatePreferences.ts
│   └── SendPush.ts                       Central dispatch — checks prefs + mute + category
├── infrastructure/
│   ├── FcmPushAdapter.ts, ApnsPushAdapter.ts, TestPushAdapter.ts
│   └── PrismaNotification*Repository.ts
├── presentation/
│   ├── NotificationsController.ts
│   ├── FcmDevicesController.ts
│   └── PreferencesController.ts
└── notifications.module.ts

apps/api/src/modules/subscriptions/
├── application/
│   ├── EvaluateMatchesForListing.ts       Sync — listens on ListingCreated
│   └── BuildDigest.ts                     Bundles within 1-hour window

apps/worker/src/queues/
├── notification-fanout.processor.ts       Real impl (replaces S1 stub)
├── video-transcode.processor.ts           Real impl (ffmpeg)
├── image-variants.processor.ts            Real impl (Sharp)
└── orphan-cleanup.processor.ts            Real impl (nightly cron)

apps/admin/src/app/(admin)/broadcast/page.tsx   Admin announcement tool
```

## References

- **PRD features**: [`../features/35-subscriptions.md`](../features/35-subscriptions.md), [`../features/36-notifications.md`](../features/36-notifications.md)
- **End-to-end flow**: [`../flows/64-saved-search-match.md`](../flows/64-saved-search-match.md)
- **Charter sections**: §8 (Notifications + Subscriptions), §11 (Media pipeline + orphan cleanup)
- **ADRs**: 0009 (Notifications)

## Previous-sprint dependencies

- S2 — auth (preferences are per-user)
- S5 — SavedSearch persistence (match needs the data)
- S7 — Conversations (direct-message push uses the same `PushPort`)
- S4 — Listings (media variants slot into the existing ListingMedia rows)

## Open questions / risks

- **FCM/APNS reachability from TM**: charter says verified reachable from VM provider. Run a synthetic ping per hour and alert if it drops (S9 admin dashboard surfaces this).
- **Digest cron schedule**: every minute? every 5 min? Decision: enqueue digest evaluation on `ListingCreated`; use a 1-hour delayed job to flush if no further matches happen.
- **`important` override abuse**: lock to a tiny admin role (`super_admin` only). Logged loudly in audit log.
- **Video transcode CPU on Server A**: ffmpeg is CPU-heavy. Decision: cap worker concurrency at 1-2 jobs simultaneously; longer queue is OK for a marketplace.
