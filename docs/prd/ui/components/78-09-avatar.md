# 78-09 — Avatar

## Purpose

Visual representation of a user or dealership. Circle by default.

## When to use

- User in chat header
- User in list items
- Dealership logo in showroom
- Profile section

## Variants

### Size

| Token | Size | Use |
|---|---|---|
| `xs` | 24 | Tiny inline, message author |
| `sm` | 32 | List rows |
| `md` (default) | 40 | Chat list, content cards |
| `lg` | 56 | Profile screens |
| `xl` | 80 | Detail screens, dealership headers |
| `2xl` | 120 | User profile screen header |

### Shape

- `circle` (default) — for User
- `rounded` (radius `lg`) — for Dealership logos (more brand-like)
- `square` — rare; specific cases

## Anatomy

```
[ Image or initials or icon ]    [optional badge in corner]
```

### Fallback hierarchy

1. If `src` provided and loads → image
2. If user has no avatar → initials (`AB` for "Aman Berdyýew") on `neutral-200` bg, `textPrimary` color
3. If user has no name yet → `User` icon (Lucide) on `neutral-200` bg

### Badge

Small dot or icon overlay (12×12) on the bottom-right corner:

- Online indicator (green dot, Phase 2)
- Verified badge (`BadgeCheck` icon, blue) for PRO dealerships
- Admin badge (purple) — admin-only views

## Specs

- Border: optional `1.5px solid background` (separates from busy backgrounds)
- Image: `object-fit: cover` so faces don't distort
- Initials: `font-weight: semibold`, `font-size` scales with avatar size

## Accessibility

- Image has alt text: user/dealership name
- Decorative if used purely visually (`aria-hidden`)
- Initials don't need separate alt (the name is shown adjacent)

## Implementation (web)

```tsx
<Avatar size="md" src={user.avatarUrl} alt={user.name} fallback={user.name} />

<Avatar size="lg" src={dealership.logoUrl} alt={dealership.name} shape="rounded" />

// With badge
<Avatar size="md" src={user.avatarUrl} alt={user.name}>
  {user.isVerified && <BadgeCheckBadge />}
</Avatar>
```

## Implementation (mobile)

```tsx
<Avatar size="md" uri={user.avatarUrl} name={user.name} />
```

## Don'ts

- ❌ Pixel sizes other than the tokens (`md` vs custom 38px)
- ❌ Avatars over busy/colorful backgrounds without a border ring
- ❌ Initials in lower-case (always uppercase)
- ❌ Round dealership logos (use rounded-square — distinguishes user from dealership)
