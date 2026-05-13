# 78-11 — Skeleton

## Purpose

Placeholder shapes shown while content is loading. Reduces perceived load time vs a spinner.

## When to use

- Loading the feed (skeleton listing cards)
- Loading a listing detail (skeleton photo + spec grid)
- Loading the chat list (skeleton conversation rows)
- Anywhere content > 200ms to load and the layout is known

## When NOT to use

- Sub-200ms operations (don't bother — feels jarring)
- Operations of unknown duration (use a spinner)
- Operations triggered by an explicit user action (use a button loading state)
- Errors (use an empty state with retry, not a skeleton)

## Variants

### Shape

- `box` — generic rectangle
- `circle` — for avatars
- `text` — text-line height, varies width (60-90% randomization)
- `image` — aspect-ratio preserved (e.g., 16:10 for listing cover)

### Size

Inherits from context (the skeleton fills the space its content would).

## Anatomy

A skeleton is just a colored shape that animates. The animation is a subtle shimmer:

- Base color: `neutral-200` (light) / `neutral-800` (dark)
- Shimmer gradient: `neutral-100` (light) / `neutral-700` (dark) sweeps across
- Animation: linear, 2000ms loop

## Composite skeletons

### Listing card skeleton

```tsx
<View className="bg-card rounded-lg overflow-hidden">
  <Skeleton variant="image" aspectRatio={16/10} />
  <View className="p-4 gap-2">
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="text" width="40%" />
  </View>
</View>
```

### Conversation row skeleton

```tsx
<View className="flex-row items-center gap-3 px-4 py-3">
  <Skeleton variant="circle" size={40} />
  <View className="flex-1 gap-1">
    <Skeleton variant="text" width="40%" />
    <Skeleton variant="text" width="80%" />
  </View>
</View>
```

## Behavior

- Render skeletons immediately on mount (no delay)
- Replace with real content once data loads (instant swap; no transition)
- If load takes < 200ms: skip skeletons (looks weird to flash them)
- If load takes > 5s: switch from skeleton to a "Still loading…" message + retry button

## Accessibility

- `aria-busy="true"` on the parent during loading
- Screen readers announce "Loading" at start
- Reduce motion: shimmer animation stops; static gray box

## Implementation (web)

```tsx
<Skeleton variant="box" width="100%" height={120} />

<Skeleton variant="text" width="60%" />

<SkeletonGroup count={5}>
  <ListItemSkeleton />
</SkeletonGroup>
```

## Implementation (mobile)

Uses `react-native-reanimated` for the shimmer effect, with reduced-motion fallback:

```tsx
<Skeleton variant="image" aspectRatio={16/10} />
```

## Don'ts

- ❌ Skeletons for entire screens — show some chrome (header, tab bar) so users know they're in the app
- ❌ Mismatched skeleton sizes vs real content (jarring swap)
- ❌ Animated skeletons everywhere — too much noise; use static at low priority surfaces
- ❌ Skeletons that look too realistic — they should be obviously placeholders

## References

- [76-motion.md](../76-motion.md) — shimmer animation
- [70-design-principles.md](../70-design-principles.md) — performance over polish
