# 78-07 — Tabs / Navigation

## Purpose

Switching between related views or sections. Two distinct concepts here:

1. **Tab bar** (bottom navigation, mobile only) — primary app sections
2. **Tabs** (inside a page) — secondary content switching

## When to use

### Tab bar (bottom nav)

- Top-level app navigation on mobile
- AutoTM has exactly 5 tabs (see [20-information-architecture.md](../../20-information-architecture.md))

### Tabs (inline)

- Filter results: All / Photos only / Videos only
- Favorites screen: Listings / Saved Searches / Comparisons (Phase 3)
- Filter sheet vehicle category: Cars / Commercial / Moto
- Settings profile: Account / Notifications / Privacy

## When NOT to use

- Tab bar with > 5 tabs (cluttered) — pick 5 or use a drawer
- Tabs for sequential flow steps (use a Stepper)
- Tabs for filtering one dimension (use Chips or Select)

## Tab bar (mobile)

### Layout

```
─────────────────────────────────────
        Content
─────────────────────────────────────
[icon]  [icon]  [+]  [icon]  [icon]    ← bottom tab bar
Search  Favs   Sell  Chat   Services
```

### Specs

- Height: 80 (60 content + 20 safe-area)
- Active tab: `primary` color icon + label
- Inactive tab: `textTertiary` icon + label
- Center "+" button: `primary` filled circle, prominent
- Badge: red dot or count on Chat tab (unread)
- Tap haptic on mobile

### Behavior

- Tap a tab → switch to it (state preserved per tab via stack navigation)
- Tap the same tab → scroll to top OR pop to root
- Long-press tab → context menu (Phase 2 — quick actions per tab)

## Inline tabs

### Layout

```
┌─────────────────────────────────┐
│  Listings   Searches   Compare  │
│  ─────────                       │
├─────────────────────────────────┤
│  (tab content)                  │
└─────────────────────────────────┘
```

- Underline indicator below active tab (animated transition between tabs)
- Active tab: `textPrimary` weight `semibold`
- Inactive tab: `textSecondary` weight `regular`
- Tab content area below; swipe-to-switch on mobile (optional, can be disabled)

### Variants

| Variant | Visual |
|---|---|
| `underline` (default) | Underline below active |
| `pills` | Active tab has a filled bg |
| `segmented` | iOS-style segmented control |

### Sizes

| Size | Tab height |
|---|---|
| `sm` | 36 |
| `md` (default) | 44 |
| `lg` | 52 |

## Accessibility

- `accessibilityRole="tab"` / `aria-role="tab"`
- Tab bar: `aria-role="tablist"`
- Active tab: `aria-selected="true"`
- Tab content: `aria-role="tabpanel"` with `aria-labelledby` linking to tab
- Keyboard nav (web): left/right arrows switch tabs

## Implementation (mobile tab bar)

Using `expo-router` with custom tab bar component:

```tsx
// app/(tabs)/_layout.tsx
<Tabs screenOptions={{
  tabBarStyle: { height: 80 },
  tabBarActiveTintColor: tokens.colors.primary,
  tabBarInactiveTintColor: tokens.colors.textTertiary,
}}>
  <Tabs.Screen name="index" options={{ title: t('tabs.search'), tabBarIcon: SearchIcon }} />
  <Tabs.Screen name="favorites" options={{ title: t('tabs.favorites'), tabBarIcon: HeartIcon }} />
  <Tabs.Screen name="sell" options={{ title: '', tabBarIcon: PlusButton }} />
  <Tabs.Screen name="chat" options={{ title: t('tabs.chat'), tabBarBadge: unreadCount, tabBarIcon: MessageIcon }} />
  <Tabs.Screen name="services" options={{ title: t('tabs.services'), tabBarIcon: GridIcon }} />
</Tabs>
```

## Implementation (inline tabs, web)

Using shadcn `Tabs`:

```tsx
<Tabs defaultValue="listings" className="w-full">
  <TabsList>
    <TabsTrigger value="listings">Listings</TabsTrigger>
    <TabsTrigger value="searches">Saved Searches</TabsTrigger>
  </TabsList>
  <TabsContent value="listings">...</TabsContent>
  <TabsContent value="searches">...</TabsContent>
</Tabs>
```

## Don'ts

- ❌ Tab bar with > 5 tabs
- ❌ Tabs without visual difference between active and inactive
- ❌ Tab labels with > 12 characters (gets truncated)
- ❌ Tabs that change underlying URL without preserving state (use `<Link>` or `router.push` carefully)
- ❌ Auto-rotating tabs (no!)
