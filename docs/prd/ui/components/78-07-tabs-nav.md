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
- Results condition switch: All / New / Used
- My listings: Active / Drafts / Archive

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

## Mobile rendering

The mobile navigation chrome is four parts. Their geometry lives in `apps/mobile/components/navigation/tabBarHeight.ts` as pure functions with unit tests. The sections above describe the web tabs and the older mobile look; where they disagree with this section about mobile, this section is current.

### Tab bar (`AutoTmTabBar`)

- A full capsule on the glass surface: 64 dp high (`mobileControl.tabBar`), full radius, 12 dp from the side edges, 4 dp of inner padding. Content scrolls underneath it.
- The selected tab sits in a capsule concentric with the bar (4 dp inset on every side, full radius, `bg-foreground/10`). It slides between tabs with the `settle` spring. On Sell it fades out, because Sell carries its own red marker; when another tab is chosen it fades back in already in place.
- Icons are 24 dp in a 28 dp row, with the label 2 dp below, so all five labels share one baseline. The selected icon cross-fades from outline to filled (heavier stroke for the magnifier, which has no inside) and swells once (`pop` spring). Unselected icons and labels use the secondary text colour.
- Labels are `micro` (11/14), medium, and semibold when selected. A label keeps 6 dp from the edge of its slot and shrinks to 80% before it is cut, so "Halanlarym", "Избранное" and "Сообщения" stay whole on a 360 dp phone. Labels stop growing at 1.3 times the system font size, because the bar's height is fixed.
- Sell is a 48 by 28 dp brand-red capsule with a white plus, in the same 28 dp icon row as its neighbours.
- The unread badge on Messages is a 20 dp brand-red disc at the top right of the icon; it never changes the tab's size.
- Every tab gives under a finger (scale 0.96, `press` duration) and is at least 64 dp tall and 65 dp wide.
- Reduce Motion: the capsule, the icon and the press change at once, with no slide, fade or swell.

### Bottom position and safe areas

| Bottom inset | Case | Bar sits above the screen edge |
|---|---|---|
| 0 | No inset | 8 dp |
| about 16 to 24 | Android gesture navigation | inset minus 8, at least 8 |
| 34 | iPhone home indicator | 26 pt |
| 40 or more (about 48) | Android three-button navigation | inset plus 8 |

A tab screen keeps `useTabBarSpace()` clear at its bottom: either its root is padded (`TabScreen`), or its list runs under the bar and ends with that much padding (`TabScreen underTabBar`). Side insets are added to the 12 dp margin.

### Stack header (`StackHeader`, `BackButton`, `HeaderButton`, `HeaderTextAction`)

- One header for every pushed screen: a row at least 44 dp high with 16 dp side padding, on the page surface, with no divider under it.
- Leading: `BackButton`, a 44 dp tonal circle (`bg-secondary`, pressed `bg-accent`). The chevron is 24 dp and sits 1 dp left of centre so it looks centred. `kind="close"` draws a 20 dp cross for a flow or a sheet.
- Title: inline, `headline` (22/28) in the heading face, semibold, one line, with an optional `caption` second line. A screen that is a destination (Help, About, Notifications, Profile, My listings, Messages list, Brand and Model pickers) uses `large`: the title moves under the button row at `title` size (28/34), bold, up to two lines. Tab roots keep `LargeTitle` at `display` size, so a tab root is always the loudest title.
- Trailing: `HeaderButton` (the same 44 dp tonal circle with a 20 dp glyph) or one `HeaderTextAction` in the brand colour (Reset, Change brand). Results keeps its named Sort capsule, 44 dp high.
- The middle can hold something else: the Search field, or the peer's avatar, name and presence in a Conversation.
- Buttons over a photo (Listing detail) are the same circles on `bg-background/90`.

### Sticky action bar (`StickyActionBar`, `useStickyActionBar`)

- The primary action of a screen floats on a glass slab: radius 28, 8 dp padding, 12 dp from the side edges. Buttons inside are 56 dp high with a 20 dp radius, concentric with the slab. A hint, an error or a quiet second action sits in the same slab.
- Content scrolls under the bar. The hook measures the bar and returns the padding the scrolling content must end with, so the last row can always be scrolled clear, also when the bar grows.
- Position: where the bar's parent reaches the screen's bottom edge (Listing detail, a sheet) it sits at the tab bar's level from the table above. Where the parent already ends above the system inset, the tab bar or the keyboard, it sits 8 dp above the parent's edge. Inside a keyboard-avoiding view it rides up with the keyboard.
- Used by: Model picker, Search parameters, Search (All filters), Listing detail (contact bar and owner bar), the Listing preview, and the Sell wizard and edit footer.

### Glass renderings

iOS 26 draws the tab bar and the sticky bar with the system Liquid Glass. Android and older iOS draw a 94% opaque surface with a light hairline edge and the `floating` shadow. Reduce Transparency draws the opaque raised surface. The first two were checked on the iPhone simulator in light and dark (the second by forcing the fallback branch); Reduce Transparency and a real Android device were not.

See `docs/prd/ui/hifi/mobile-tabs-_layout.md`.
