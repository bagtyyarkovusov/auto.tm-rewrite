# Compact examples

## Mobile screen skeleton

```text
┌─ Search results ─────── Filter (3) ─┐
│ 49 listings · Newest                │
│ ┌─ photo ─────────────────┐  │
│ │ Toyota Camry, 2021          │ ♡│
│ │ 185 000 TMT · Ashgabat    │  │
│ └────────────────────────────┘  │
│                ⋮                    │
└─ Home ─ Favorites ─ + ─ Chat ─ Profile ┘
```

The accompanying spec must explain filter entry, active-filter feedback, favorite optimistic/retry behavior, five page states, and reading/focus order.

## Multi-step flow

```text
Listing detail
  ├─ Message → auth gate when anonymous → return to same listing/thread
  ├─ Call → reveal/confirm phone action
  └─ Report → reason sheet → submit pending → success/retry
```

Prefer a flow artifact when transition and deferred-action behavior matter more than any one screen layout.
