# 36 — Notifications

## Summary

Push delivery + in-app notification feed + per-category opt-out. 6 categories. FCM + APNS happy path with fallback abstraction. Admin broadcast tooling.

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

### In-app feed

- Bell icon in top-right of main screens
- Tap → list of recent notifications (last 30 days)
- Filter by category
- Tap → deep link to relevant screen
- Mark all read button
- Old notifications fade visually

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
| Permission prompt (first launch) | iOS / Android | Native dialog asks "Allow notifications?" — declining is OK, user can enable later |
| Permission denied | After settings change | Banner in Preferences: "Notifications are off. Enable in System Settings." |

## Data references

- `apps/api/src/modules/notifications/CONTEXT.md`
- Entities: `PushToken`, `NotificationHistory`, `NotificationPreference`

## Decisions

- [ADR-0009](../../adr/0009-notifications.md) — Dual-stack transport, categories, debouncing

## Phase

**Phase 1.**

## Out of scope

- Per-day "quiet hours" — Phase 2 if users ask
- Notification grouping by category on the lock screen — relies on OS behavior; default acceptable
- Rich push (images / actions) — defer; text-only is enough for MVP
- Web push for the public site / admin — defer; admins use desktop notifications via browser if needed

## Open questions

- iOS notification sound — default or custom? (default, less brand-y but app-store-friendly)
- "Always-on" sound for direct messages (regardless of system silent mode) — auto.ru does this; we won't (UX-hostile)
- Should the in-app feed show *all* historical notifications, or just last 30 days? (Last 30 days is enough; older fades)
