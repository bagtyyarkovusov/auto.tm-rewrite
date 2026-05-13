# 78-06 — Toast / Snackbar

## Purpose

Brief, non-blocking notification of a system event ("Saved", "Failed to send", "3 new matches").

## When to use

- Confirming a user action ("Listing saved")
- Reporting a transient error ("Failed to send message — retry")
- Background event notification ("3 new matches for your saved search")
- Status updates that don't require action

## When NOT to use

- Critical information that requires acknowledgment — use Modal
- Persistent status (e.g., "You're offline") — use Banner
- Notifications that need a deep link — use the in-app feed
- Long messages (> 2 sentences) — find another surface

## Variants

### Intent

| Intent | Color | Icon |
|---|---|---|
| `default` | `surface` bg, `textPrimary` text | none |
| `success` | `green.500` accent | `Check` |
| `error` | `rose.500` accent | `AlertCircle` |
| `warning` | `amber.500` accent | `AlertTriangle` |
| `info` | `blue.500` accent | `Info` |

### Position

- **Top** (default) — appears below the navigation/status bar
- **Bottom** — above the tab bar (mobile) or bottom-center (web)

### Duration

| Duration | Use |
|---|---|
| `short` | 2 seconds (default for success/info) |
| `long` | 5 seconds (for errors that may need action) |
| `persistent` | Until user dismisses |

## Anatomy

```
┌────────────────────────────────────────┐
│ [icon]  Message text         [action]  │
└────────────────────────────────────────┘
```

- Leading icon (intent-based)
- Message — single line ideal; max 2 lines
- Optional action button — "Retry" / "Undo" / "View"
- Dismiss: tap anywhere outside, or auto-dismiss after duration

## Behavior

- Slides in from top/bottom with `base` (250ms) duration, `decel` easing
- Stacks vertically if multiple — newest on top (others shift)
- Max stack: 3; older ones auto-dismiss to make room
- On tap (when action exists): runs the action + dismisses
- Swipe to dismiss (mobile)
- Esc dismisses focused toast (web)

## Accessibility

- `role="status"` (default) — polite announcement to screen readers
- `role="alert"` for error intent — assertive announcement
- Focusable when action exists; otherwise non-focusable

## Implementation (web)

Using `sonner` (or shadcn's toast adapter):

```tsx
import { toast } from '@/components/ui/toast'

// Simple success
toast.success("Listing saved")

// With action
toast.error("Failed to send message", {
  action: { label: "Retry", onClick: handleRetry }
})

// Persistent (won't auto-dismiss)
toast.info("3 new matches", {
  duration: Infinity,
  action: { label: "View", onClick: () => router.push("/saved-searches") }
})
```

## Implementation (mobile)

Custom toast manager or `react-native-toast-message`:

```tsx
import { toast } from '@/lib/toast'

toast.success("Listing saved")

toast.error("Failed to send message", {
  action: { label: "Retry", onPress: handleRetry }
})
```

## Don'ts

- ❌ Multi-paragraph messages (use the in-app notification feed instead)
- ❌ Toasts for things the user already sees (e.g., "Photo added" while photo is right there)
- ❌ Toasts that block other UI (it's non-blocking by definition)
- ❌ Auto-redirect to another screen from a toast tap (use the action button)
- ❌ Toasts during full-screen flows (camera, photo viewer) — defer the toast
