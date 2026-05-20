# Wireframe — Mobile Tab Bar Layout

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/_layout.tsx`

==============================================
WIREFRAME — Mobile Tab Bar Layout
Platform: mobile
==============================================

## Purpose

Provide the primary navigation chrome for the mobile app: five tabs with a distinctive central sell action pill.

## ASCII wireframe

```text
┌────────────────────────────────────────────┐
│                                            │
│              (tab screen content)          │
│                                            │
│                                            │
├────────────────────────────────────────────┤
│ ◐Home   ◐Fav   ┌──┐   ◐Chat   ◐Services  │
│                 │+ │                       │
│                 └──┘                       │
└────────────────────────────────────────────┘
```

Expanded tab bar (design archive style):

```text
┌─────────────────────────────────────────────────────────┐
│  ◐Home        ◐Favorites    ┌────┐     ◐Chat   ◐Serv  │
│  Home         Favorites     │  + │     Chat    Services│
│                             └────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Home tab** — `Search` label per existing route; `Home` icon (house). Active = black icon + label; inactive = gray-400.
2. **Favorites tab** — `Favorites` label; heart icon. Active = black; inactive = gray-400.
3. **Sell tab** — Central action. Black pill (`rounded-full`, `bg-black`, `w-14 h-8`) with white plus icon. Label "Sell" sits below the pill (label text is black when active). The tab icon area is custom — not a raw `PlusCircle` outline.
4. **Chat tab** — `Chat` label; message-square icon. Active = black; inactive = gray-400.
5. **Services tab** — `Services` label; settings/grid icon. Active = black; inactive = gray-400.
6. **Tab bar chrome** — `bg-background/92` with `backdrop-blur` (or solid fallback on Android), top border `border-gray-200`, height `64px + safe-area-inset-bottom`.

## Customization preview

- **Tab bar** — custom composition around Expo Router `Tabs`; the sell tab needs `tabBarButton` override or a custom `AutoTmTabBar` component to render the black pill.
- **Active tint** — design archive uses `black` for active, not brand red. This diverges from the current `tabBarActiveTintColor: primary`. Wire to semantic `text-foreground` or explicit black token.

## Interactions

- Tap any tab → switch to that tab route.
- Tap Sell while unauthenticated → show `SignInDialog` sheet (auth-on-action), then on success open wizard.
- Long-press on tab → no action (no hidden menus).

## States

- **Loading**: Tab bar hidden while wizard overlay is active (sell tab hides tab bar via `navigation.setOptions`).
- **Empty**: Not applicable.
- **Error**: Not applicable.
- **Offline**: Tab bar remains visible; offline state is handled per-screen.

## Content / copy

- Tab labels: "Home" (design archive says "Home"; current code says "Search" — preserve existing route name, update label to match design if product approves), "Favorites", "Sell", "Chat", "Services"

## Open questions for /hifi-design

- The existing code labels the first tab "Search"; the design archive labels it "Home". Which label ships?
- Should inactive tab labels use `gray-400` (#afafaf) exactly, or the semantic `text-muted-foreground` token?
- Is the sell pill tap target 44×44 minimum? The pill is 56×32; the whole tab cell must still meet 44×44.

## Design archive mapping

- `app-shell.html` → `(tabs)/_layout.tsx` tab bar chrome.
- The design archive uses "Home" label; current code uses "Search". Decision needed.
