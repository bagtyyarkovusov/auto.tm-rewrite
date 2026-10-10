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
- The selected tab sits in one lighter capsule that encloses its icon and its label: the full width of the tab's slot (about 74 dp on a 402 dp phone) and 56 dp high, 4 dp inside the bar on every side, so its 28 dp radius is concentric with the bar's 32 dp ends. It is opaque: `bg-secondary` in light (a step darker than the white glass), `bg-accent` in dark (a step lighter than the charcoal glass).
- When the selection moves, the capsule travels like a drop of liquid: the edge on the side it is heading to leads on the `glide` spring (220 ms, critically damped) and the other edge follows on `settle`, so the capsule stretches along its path and then settles into the new slot, with no bounce. It is drawn as two round ends and a straight middle, so the stretch is transforms only; no width is laid out on any frame. On Sell it fades out where it stands, because Sell carries its own red pill; when another tab is chosen it fades back in already in place.
- Icons are 22 dp in a 32 dp row, with the label 4 dp below, so all five labels share one baseline. The selected icon cross-fades from outline to filled (heavier stroke for the magnifier, which has no inside), and the label cross-fades from medium in the secondary text colour to semibold in the text colour. There is no swell. Unselected icons and labels use the secondary text colour.
- Labels are `micro` (11/14) and all five share one size. A label's box is its slot less 10 dp on each side. Each label is measured once, unseen, in its semibold face; the widest decides how far all five shrink together (to 85% at most), so no label touches the capsule and no label is a different size from its neighbours. Measured on an iPhone 17 in Russian: "Сообщения" selected keeps 10 dp each side. Labels stop growing at 1.3 times the system font size, because the bar's height is fixed.
- The icon row and label sit one dp above the bar's centre: a label has room under its baseline that an icon does not have above it, so the true centre looks low.
- Sell is a 56 by 32 dp brand-red pill with a white plus, in the same 32 dp icon row as its neighbours.
- On iOS 26 the system glass carries a tone inside it (`bg-glass/glass-tint`, 64%), so labels stay readable over a photo. Where the content runs under the bar on iOS 26 (Home, Results, Brands, Cabinet), nothing is drawn between the content and the glass, so photos show through the bar, softened, exactly as they do through the floating Filters chip. Everywhere else (Android, iOS below 26, Reduce Transparency, and a screen that stops above the bar) the content fades into the page tone below and behind the bar (`ScrollEdgeFade`), so no line of list text shows through or under a bar that cannot soften it.
- The unread badge on Messages is a 20 dp brand-red disc at the top right of the icon; it never changes the tab's size.
- Under a finger a tab grows to 1.08 (`mobilePressScale.lift`) on the `snappy` spring, with no overshoot, and returns the same way on release or when the finger slides off. The selected tab's capsule grows with it, about its own centre. The whole bar swells to 1.03 (`swell`) while a finger is on it and settles back on release. Every tab is at least 64 dp tall and 65 dp wide.
- **The lens.** A finger that rests on the bar (90 ms) or slides along it (6 dp sideways) lifts the capsule into a lens: a drop of the capsule's tone, a shade clearer, with a bright hairline rim, 12 dp wider than a tab on each side and 6 dp taller than the bar above and below. It follows the finger. Inside it the tab row is drawn again in its selected look, 1.18 times larger (`magnify`) about the lens's centre, so what is under the lens reads as magnified while the row outside stays quiet. The copy is laid out at the larger size (icon 26 dp, label type 13 dp), never a drawn tab stretched, so icons and type stay sharp. Letting go chooses the tab under the lens: the lens lands on that tab (`settle`), closes after 140 ms, and the capsule is already there. Ending a slide on the tab that is already open changes nothing; a tap still re-selects a tab. A quick tap never opens the lens. The lens's copy is hidden from assistive technology and carries no test id.
- Native selection feedback gives one light tick for an accepted unfocused tab tap, or each distinct tab slot crossed by the slide lens. Repeated and prevented taps do not tick; releasing a slide adds no tick.
- On Android 12+, the bar blurs its focused tab screen through `BlurTargetView`; older Android keeps the tuned translucent fallback. Reduce Transparency keeps the opaque surface.
- The bar is see-through: on iOS 26 the tone inside the system glass is 40%, so what scrolls under the bar shows through, softened; labels keep their contrast over a photo.
- Reduce Motion: the capsule, the icon, the label and the press change at once, with no travel, stretch or fade, and the bar does not swell; the lens still follows the finger, because it is under the finger's direct control. Reduce Transparency: the bar is the opaque raised surface and the lens is opaque; the capsule is opaque already.

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
- Trailing: `HeaderButton` (the same 44 dp tonal circle with a 20 dp glyph) or one `HeaderTextAction`, medium weight in the text colour (Reset, Change brand); brand red stays with the screen's primary action. Results keeps its named Sort capsule, 44 dp high.
- The middle can hold something else: the Search field, or the peer's avatar, name and presence in a Conversation.
- Buttons over a photo or over scrolling content (Listing detail and its preview: Back, Favorite, the ⋯ menu, the owner's ⋯ menu) are the same 44 dp circles in glass (`tone="glass"`): interactive system Liquid Glass on iOS 26, which swells and lights under a finger in place of the press scale; the tuned glass surface with the press scale elsewhere. Favorite and ⋯ stand 8 dp apart in one `GlassGroup`, so on iOS 26 they are one glass layer and a circle swelling under a finger reaches toward its neighbour. Page headers keep the tonal circles: there the header is on the page tone, not over content.
- The photo position on Listing detail (`n / N`, bottom-right of the photo, above a status strip when there is one) is a 28 dp glass chip with a `footnote` medium label in the text colour and tabular figures.

### Sticky action bar (`StickyActionBar`, `useStickyActionBar`)

- The primary action of a screen floats 12 dp from the side edges with no slab behind it (#808): each button is its own `GlassButton` capsule, 56 dp high. On iOS 26 it is interactive Liquid Glass, the primary action tinted brand red with a white label and the rest clear glass with the foreground label; on Android, older iOS and with Reduce Transparency it is a solid capsule (brand red or the card tone) with the `floating` shadow. A hint or a quiet second action sits above the buttons over the soft edge fade; an error line has a solid surface of its own.
- Content scrolls under the bar. The hook measures the bar and returns the padding the scrolling content must end with, so the last row can always be scrolled clear, also when the bar grows.
- Position: where the bar's parent reaches the screen's bottom edge (Listing detail, a sheet) it sits at the tab bar's level from the table above. Where the parent already ends above the system inset, the tab bar or the keyboard, it sits 8 dp above the parent's edge. Inside a keyboard-avoiding view it rides up with the keyboard.
- Used by: Model picker, Search parameters, Search (All filters), Listing detail (contact bar and owner bar), and the Listing preview.
- Not used by the Sell wizard and Listing edit. Their one action (Continue, Done, Publish or Save changes) is a full-width 56 dp button on the page itself, below the scrolling step and above the system inset, with no slab behind it; the step ends above the button instead of scrolling under it. Back is the header's chevron.

### Glass renderings

iOS 26 draws the tab bar, the sticky bar's buttons, the floating filter chips, the glass header circles and the photo position chip with the system Liquid Glass. Android and older iOS draw a 94% opaque surface (solid for the sticky bar's buttons, above) with a light hairline edge and the `floating` shadow. Reduce Transparency draws the opaque raised surface. The tab bar and sticky bar were checked on the iPhone simulator in light and dark (the fallback by forcing its branch); the header circles and the photo chip were not yet seen on a simulator, and Reduce Transparency and a real Android device were not checked.

See `docs/prd/ui/hifi/mobile-tabs-_layout.md`.
