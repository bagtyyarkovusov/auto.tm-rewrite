# Wireframe — Mobile Services Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/services.tsx`

==============================================
WIREFRAME — Mobile Services Tab
Platform: mobile
==============================================

## Purpose

Hub for profile, garage, settings, blog, and help. Design archive shows a list-row layout; current code uses a card grid.

## ASCII wireframe

Current code (card grid):
```text
┌────────────────────────────────────────────┐
│ Services                                   │
├────────────────────────────────────────────┤
│ ┌────────────┐  ┌────────────┐             │
│ │   ◐User    │  │  ◐Wrench   │             │
│ │  Profile   │  │  Garage    │             │
│ └────────────┘  └────────────┘             │
│ ┌────────────┐  ┌────────────┐             │
│ │  ◐Settings │  │  ◐FileText │             │
│ │  Settings  │  │   Blog     │             │
│ └────────────┘  └────────────┘             │
└────────────────────────────────────────────┘
```

Design archive target (list rows):
```text
┌────────────────────────────────────────────┐
│ Services                                   │
├────────────────────────────────────────────┤
│ Profile                              >     │
│ Settings                             >     │
│ Bortzhurnal                          >     │
│ Help & Support                       >     │
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Screen title** — "Services" (display font, 32px).
2. **Service rows** — Tappable list rows (design archive style):
   - "Profile" with chevron
   - "Settings" with chevron
   - "Bortzhurnal" with chevron
   - "Help & Support" with chevron
   - Each row: 15px label, black; right chevron `gray-400`; top border `gray-200`; press feedback `opacity-70`.

## Customization preview

- **Service row** — custom composition wrapping `Pressable` + `Text` + `Icon`; no single RNR primitive matches this exactly.

## Interactions

- Tap row → navigate to respective route (all S5/S6; today shows toast).
- Long-press → no action.

## States

- **Loading**: `Skeleton` rows.
- **Empty**: not applicable (rows are static chrome).
- **Error**: not applicable.
- **Offline**: rows remain visible; individual screens handle offline.

## Content / copy

- Title: "Services"
- Row labels: "Profile", "Settings", "Bortzhurnal", "Help & Support"

## Open questions for /hifi-design

- Should Services keep the current card grid or switch to the design archive's list-row layout? The issue says "update only the shell/chrome and keep existing placeholder/content behavior intact" for tabs without full design screens. However, the design archive does show a Services tab body in `app-shell.html`. Decision: align with design archive since a screen is provided.
- Are icons needed on the left of each row? The design archive shows text-only rows with chevrons.

## Design archive mapping

- `app-shell.html` tab "Services" content → `app/(tabs)/services.tsx`.
