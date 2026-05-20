# Wireframe — Mobile Favorites Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/favorites.tsx`

==============================================
WIREFRAME — Mobile Favorites Tab
Platform: mobile
==============================================

## Purpose

Surface saved listings and saved searches. Currently a stub empty state.

## ASCII wireframe

```text
┌────────────────────────────────────────────┐
│ Favorites                                  │
├────────────────────────────────────────────┤
│                                            │
│         ◐ Heart (56px, gray-400)           │
│                                            │
│      No favorites yet                      │
│  Tap the heart on any listing to save it   │
│  here for quick access.                    │
│                                            │
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Screen title** — "Favorites" (display font, 32px, left-aligned, `safe-area-top` padding).
2. **Empty state** — Large `Heart` icon (56px, `text-muted-foreground`), heading "No favorites yet", body copy explaining how to save.

## Customization preview

(none — all primitives use stock RNR)

## Interactions

- Tap heart on a listing card ( elsewhere ) → adds to favorites; this screen updates.
- Empty state is static; no CTA needed because saving happens from browse.

## States

- **Loading**: `Skeleton` card while favorites load.
- **Empty**: empty state shown above.
- **Error**: inline retry row "Could not load favorites. Try again."
- **Offline**: show last cached favorites if available; else empty state with offline helper.
- **Authenticated-only**: if user is anonymous, show "Sign in to save listings" with a `Button` that opens auth sheet.

## Content / copy

- Title: "Favorites"
- Empty heading: "No favorites yet"
- Empty body: "Tap the heart on any listing to save it here for quick access."
- Anonymous CTA: "Sign in to save listings"
- Error: "Could not load favorites. Try again."

## Open questions for /hifi-design

- Should anonymous users see the empty state or an immediate sign-in prompt?
- Does the design archive show a "Saved searches" sub-section? Not in the current export.

## Design archive mapping

- `app-shell.html` tab "Favorites" content → `app/(tabs)/favorites.tsx`.
