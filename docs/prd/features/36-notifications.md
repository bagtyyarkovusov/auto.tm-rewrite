# 36 — Notifications

## Summary

Push delivery + in-app notification feed + per-category opt-out. 6 categories. FCM + APNS happy path with fallback abstraction. Admin broadcast tooling.

**MLP status:** deferred by [ADR-0027](../../adr/0027-mlp-beta-scope.md). Direct-message push may be shaped first after contact usage proves response delay is hurting the loop. The full 6-category platform is not part of the MLP beta.

## Why it exists

A marketplace chat without push notifications is dead — by the time Maral checks the app, Aman has already sold the car to someone else. Notifications turn the app from "I'll check it later" to "responding in 2 minutes."

## What it does (user-visible behavior)

### Categories

| Category | Purpose | Default |
|---|---|---|
| Direct messages | New chat message | ON (per-conversation mute only) |
| Saved-search matches | New listing matches your search | ON (per-search) |
| Listing activity | Favorites + views on your listings | ON (digest option) |
| Admin announcements | Platform announcements | ON (`important` flag bypasses mute) |
| Blog activity | New posts from followed users | OFF (opt-in) |
| Marketing | Promotional content | OFF (opt-in — store policy) |

### Preferences screen

- `Profile → Notifications`
- Toggle per category
- For Direct messages: explainer "Mute per conversation in chat header"
- For Saved searches: tap to manage individual searches' notify settings

### Push behavior

- Foreground: in-app banner only (no native notification — user is already looking)
- Background: native FCM/APNS notification with deep link to the relevant screen
- App badge count: total unread across DMs + saved-search matches + announcements
- Native OS permission is requested at most once automatically, only after a user action that clearly benefits from notifications. OTP login never asks for push permission.

### Native permission prompt timing

App-level notification preferences and OS permission are separate:

- Direct messages stay ON by default in app preferences, but lock-screen delivery requires OS permission and a registered device token.
- Saved-search matches stay ON per saved search, but lock-screen delivery requires OS permission and a registered device token.
- Blog activity and marketing remain OFF until explicit opt-in.

Ask with an AutoTM rationale prompt before the native dialog:

| User action | Category | Rationale copy |
|---|---|---|
| Sends first chat message | Direct messages | "Allow notifications so you know when the seller replies." |
| Saves a search with notify enabled | Saved-search matches | "Allow notifications when new cars match this search." |
| Publishes first listing | Listing activity / buyer messages | "Allow notifications when buyers message you or your listing gets updates." |
| Follows blog activity | Blog activity | Ask only after opt-in intent |
| Enables marketing | Marketing | Ask only after explicit marketing opt-in |

If the user declines, store `notificationPermissionPrompted=true` locally. Later notification-using actions show: "Notifications are off. Enable them in System Settings." Do not open the native prompt again automatically. Server stores a push token only after permission is granted.

### In-app feed

- Bell icon in top-right of main screens
- Tap → list of recent notifications (last 30 days)
- Filter by category
- Tap → deep link to relevant screen
- Mark all read button
- Old notifications fade visually
- Post-MLP moderation feedback may add a generic "report reviewed" feed item or consume moderation events, but S7 ships no user-facing moderation notifications. Future moderation notifications must not expose an admin's private free-text reason.

### Moderation alerts

- Admin-facing report alerts are post-MLP unless beta safety explicitly reshapes them before launch.
- Future alerting should consume `ContentReportCreated` or aggregate thresholds such as pending report age/count, repeated targets, or admin-set severity. Reporters do not provide an `urgent` flag.
- Telegram paging and incident routing are owned by [81 — Monitoring + alarms](../ops/81-monitoring-alarms.md); user-facing feed/push copy is owned here.

### Admin broadcast

(See [Feature 40 — Admin](40-admin.md) for full admin UI)
- Admin composes: title (RU/TK/EN), body, target (all users / specific user / dealership members / saved-search subscribers), optional deep link, `important` flag
- Preview shown
- Send → fans out via worker queue → records `NotificationHistory`
- Stats: total recipients, delivered, failed

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Notification feed | Empty | "All caught up" with checkmark illustration |
| Notification feed | Has unread | Bold rows; tap to read |
| Notification feed | Has old (>30d) | "Showing last 30 days. Tap to load more." |
| Preferences | Default | Toggles per category; off ones grayed |
| Permission prompt | iOS / Android | Asked after a concrete notification-using action, not on first launch or OTP login |
| Permission denied | After settings change | Banner in Preferences: "Notifications are off. Enable in System Settings." |

## Data references

- `apps/api/src/modules/notifications/CONTEXT.md`
- Entities: `PushToken`, `NotificationHistory`, `NotificationPreference`

## Decisions

- [ADR-0009](../../adr/0009-notifications.md) — Dual-stack transport, categories, debouncing

## Phase

**Post-MLP marketplace bet.**

## Out of scope

- Per-day "quiet hours" — Phase 2 if users ask
- Notification grouping by category on the lock screen — relies on OS behavior; default acceptable
- Rich push (images / actions) — defer; text-only is enough for MVP
- Web push for the public site / admin — defer; admins use desktop notifications via browser if needed

## Open questions

- iOS notification sound — default or custom? (default, less brand-y but app-store-friendly)
- "Always-on" sound for direct messages (regardless of system silent mode) — auto.ru does this; we won't (UX-hostile)
- Should the in-app feed show *all* historical notifications, or just last 30 days? (Last 30 days is enough; older fades)
