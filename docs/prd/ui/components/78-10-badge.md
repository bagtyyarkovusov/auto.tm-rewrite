# 78-10 — Badge

## Purpose

Small, pill-shaped label that communicates status, count, or category. Visual emphasis without taking space.

## When to use

- Status: "New", "Sold", "Banned", "Draft"
- Count: unread messages on Chat tab
- Verification: "PRO", "Trusted by AutoTM" (Phase 2)
- Category: "Used", "New" condition

## When NOT to use

- Multi-word labels — use a Chip or plain text
- Buttons that trigger actions — use Button
- Persistent metadata — use Card metadata fields

## Variants

### Intent

| Intent | Color | Use |
|---|---|---|
| `default` | `neutral-200` bg, `textPrimary` text | Generic labels |
| `primary` | `primary` bg, `onPrimary` text | Brand badges, "New" |
| `success` | `green.500` bg, white text | "Sold", "Verified" |
| `warning` | `amber.500` bg, white text | "Pending", "Draft" |
| `error` | `error` bg, white text | "Banned", "Reported" |
| `info` | `blue.500` bg, white text | "PRO", general info |
| `outline` | transparent bg, 1px border | Subtle category labels |

### Size

| Token | Height | Padding |
|---|---|---|
| `xs` | 16 | 4 horizontal |
| `sm` (default) | 20 | 6 horizontal |
| `md` | 24 | 8 horizontal |

### Shape

- `pill` (default) — radius `full`
- `square` — radius `sm`

## Anatomy

```
[ Label text or count or icon ]
```

- Text: `xs` or `sm` size, `medium` or `semibold` weight, all-caps for tiny ones (xs)
- Optional leading icon (12×12 max)

## Special badges

### PRO badge

- `info` intent (blue)
- Text: "PRO" (uppercase)
- Always paired with verified dealerships

### Trusted by AutoTM badge (Phase 2)

- `success` intent (green) for Gold tier
- Or `default` with brand colors for the other tiers
- Tap → opens the inspection report

### Notification badge (count)

- `error` intent (red) — small dot or count
- Maximum displayed: "99+"
- Position: top-right corner of an avatar or icon

## Accessibility

- Decorative badges: `aria-hidden="true"` (the surrounding text describes the state)
- Functional badges (e.g., notification count): `aria-label="3 unread messages"`

## Implementation

```tsx
<Badge intent="success">Sold</Badge>

<Badge intent="info" size="sm">PRO</Badge>

<Badge intent="error" size="xs">3</Badge>   // unread count

<Badge intent="primary" leading={<Sparkles />}>Trusted</Badge>
```

## Don'ts

- ❌ Long text in badges (max 10 chars)
- ❌ Multiple badges on the same item (max 2 — primary + secondary)
- ❌ Badges that are clickable (they look static; use a Button instead)
- ❌ Badges in colors that conflict with their semantic meaning (e.g., red badge for "Sold")
