# Wireframe — Mobile Search / Feed Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/index.tsx`

==============================================
WIREFRAME — Mobile Search / Feed Tab
Platform: mobile
==============================================

## Purpose

Primary browse surface. Currently a stub; design handoff gives it a branded header and search affordance.

## ASCII wireframe

```text
┌────────────────────────────────────────────┐
│ AutoTM                         ◐ Search    │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐    │
│  │ ◐ Search…                          │    │
│  └────────────────────────────────────┘    │
│                                            │
│                                            │
│         ◐ House (56px, gray-400)           │
│                                            │
│         Feed                               │
│  Personalized listings will appear here    │
│  once the recommendation engine ships.     │
│                                            │
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Header** — Left: "AutoTM" display title (UberMove Bold, 32px, tracking tight). Right: search icon button (circular hit area, `bg-background` → `bg-gray-100` on press).
2. **Search bar** — `Input` with `Search` icon leading, placeholder "Make, model, or keyword…". Rounded (`rounded-lg`), border `border-gray-200`.
3. **Empty state** — Large `Home` icon (56px, `text-muted-foreground`), heading "Feed", body copy explaining personalized listings ship in S5.

## Customization preview

- **Header title** — needs `Text` with `font-display` (UberMove) token; may need a custom `font-family` class if UberMove is loaded.

## Interactions

- Tap search icon → focus search input.
- Tap search bar → opens search / filter flow (S5 scope; today just focuses).
- Pull-to-refresh → no-op until feed API exists.

## States

- **Loading**: `Skeleton` placeholders for feed cards (not shown today; no feed API).
- **Empty**: empty state block shown above.
- **Error**: inline retry row "Could not load feed. Try again."
- **Offline**: subtle top banner or icon change; feed may show cached content later.

## Content / copy

- Title: "AutoTM"
- Search placeholder: "Make, model, or keyword…"
- Empty heading: "Feed"
- Empty body: "Personalized listings will appear here once the recommendation engine ships in S5."
- Error: "Could not load feed. Try again."

## Open questions for /hifi-design

- Is the first tab label "Home" or "Search"? The design archive header says "AutoTM" but the tab bar says "Home".
- Should the search bar be sticky under the header while scrolling?

## Design archive mapping

- `app-shell.html` tab "Home" content → `app/(tabs)/index.tsx`.
