# Wireframe — Mobile Sell Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/sell.tsx`

==============================================
WIREFRAME — Mobile Sell Tab
Platform: mobile
==============================================

## Purpose

Entry point to the listing wizard. Shows the latest draft (if any) with progress, or a direct "New listing" CTA.

## ASCII wireframe

```text
┌────────────────────────────────────────────┐
│ Sell                                       │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ┌──────────────────────────────────┐   │ │
│ │ │         [car placeholder]        │   │ │
│ │ │                    8 photos       │   │ │
│ │ └──────────────────────────────────┘   │ │
│ │ LATEST DRAFT                           │ │
│ │ 2018 Toyota Camry                      │ │
│ │ Saved 2 min ago  ·  Price missing      │ │
│ │ 6 of 8  [==========------]             │ │
│ │ [Continue draft]            (black)    │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [New listing]                   (outline)  │
│                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ My listings                    0 active  > │
│ My garage                                > │
│                                            │
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Screen title** — "Sell" (display font, 32px).
2. **Latest draft card** — `Card` with:
   - Thumbnail area (140px height, dark gradient placeholder, photo count badge bottom-left).
   - "Latest draft" label (uppercase, 12px, muted).
   - Draft title (display font, 20px): "2018 Toyota Camry" or similar.
   - Meta line: "Saved 2 min ago · Price missing".
   - Progress row: "6 of 8" + mini progress bar (`Progress`, 4px, black fill on gray track).
   - CTA: `Button variant="default"` (black bg) "Continue draft".
3. **New listing button** — `Button variant="outline"` (black border, white bg) "New listing".
4. **Helper rows** — Tappable rows below divider:
   - "My listings" with count badge / chevron
   - "My garage" with chevron
   - (Future) "Help & Support"

## Customization preview

- **Draft card** — custom composition using `Card`, `Button`, `Progress`, `Badge` for photo count.
- **Thumbnail placeholder** — custom `View` with gradient background; no RNR primitive for gradient.

## Interactions

- Tap "Continue draft" → opens wizard at last reached step (via `INIT` action with existing draft payload).
- Tap "New listing" → creates new draft via `useCreateDraft`, then opens wizard at Step 1.
- Tap "My listings" → routes to `/me/listings` (S6; today shows toast "My listings — S5").
- Tap "My garage" → routes to `/me/garage` (S6; today shows toast).
- Sell tab tapped while wizard is already open → no-op (wizard is full-screen inside the same tab).

## States

- **Loading**: `Skeleton` card (180px height, shimmer) while `useMyDrafts` is pending.
- **Empty (no drafts)**: hide draft card; show only "New listing" button and helper rows.
- **Error**: inline error row "Could not load draft. Try again." with retry tap.
- **Offline**: show last known draft if cached; else empty state with offline helper.
- **Unauthenticated**: show `SignInDialog` sheet instead of opening wizard.

## Content / copy

- Title: "Sell"
- Card label: "Latest draft"
- Continue CTA: "Continue draft"
- New listing CTA: "New listing"
- My listings: "My listings"
- My garage: "My garage"
- Error: "Could not load draft. Try again."

## Open questions for /hifi-design

- Should the draft thumbnail show the actual cover photo or a generic placeholder when no photo is staged?
- Is the progress bar inside the card 4px or thicker? What color for incomplete track?
- Should "My listings" and "My garage" rows be visible when unauthenticated?

## Design archive mapping

- `screens/00-sell-entry.html` → `app/(tabs)/sell.tsx` entry screen (non-wizard state).
- `app-shell.html` Sell tab body → same surface.
