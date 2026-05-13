# 75 — Illustration style

## Where illustrations appear

Limited to:

- **Empty states** — "Add your first car", "No conversations yet", "All caught up"
- **Onboarding helper screens** (if added in Phase 1.5)
- **Error / 404 pages**
- **Marketing landing page hero**

That's it. We don't decorate every screen.

## Style

- **Flat, single-line, monochromatic** — matches the Lucide icon language
- **Stroke-based**, similar to icons but at illustration scale
- **Brand red accents** allowed sparingly (e.g., a heart in red on a "Favorites" empty state)
- **No anthropomorphic mascots** (no AutoTM cat / dog / character)
- **No 3D / isometric** illustrations
- **No emoji-style** doodles

## Production

- Source: SVG files (vector, scales perfectly)
- Stored: `packages/ui/illustrations/`
- Naming: `<context>-<state>.svg` (e.g., `favorites-empty.svg`, `chat-empty.svg`)
- Dark mode: separate `<name>-dark.svg` if needed (often the same file with `currentColor` strokes works for both)

## Recommended sources

- Draw our own (small set, consistent style)
- **Storyset.com** (free with attribution; aesthetic is mostly compatible)
- **unDraw.co** (free, customizable colors; aesthetic is bolder than our preference)

If we draw our own:
- Match Lucide stroke (2px)
- Use brand red sparingly as accent
- 1-2 colors max per illustration (foreground + accent)
- 400×400 viewbox typically
- Subject is car-related where possible (steering wheel, dashboard, key, road, etc.)

## Empty states matrix

| Screen | Illustration concept | Headline | Sub-copy | CTA |
|---|---|---|---|---|
| Feed (anon, no recent views) | Magnifying glass + car | "Find your next car" | (Browse listings below) | Filter button |
| Favorites empty | Heart outline | "Tap ♥ on listings you like" | "We'll save them here" | None |
| Conversations empty | Speech bubble | "Start by messaging a seller" | "Conversations show up here" | Browse listings |
| Saved searches empty | Bell + magnifying glass | "Save searches to get notified" | "We'll ping you when matches appear" | Save current search |
| My Listings empty | Car key | "List your first car" | "Reach thousands of buyers" | Sell button |
| Garage empty | Garage door | "Add a car to your garage" | "Track what you own and what you want" | Add car |
| Notifications feed empty | Bell with checkmark | "All caught up" | None | None |
| 404 web | Road with question mark | "Wrong turn" | "This page doesn't exist." | Go home |
| Error / network | Car with flat tire | "Something went wrong" | "We'll try again." | Retry |

## Light vs dark mode

- Use `currentColor` for strokes in SVG so they pick up theme automatically
- Background fills: use CSS variables when SVG is inline; otherwise provide light + dark file variants

## Don'ts

- ❌ Stock photos (everyone uses them; not on-brand)
- ❌ Brand mascot (AutoTM cat / etc.) — adds maintenance burden
- ❌ Animated illustrations (Lottie etc.) in MVP — Phase 2 maybe
- ❌ Multiple illustration styles across the app — pick one and stick to it
- ❌ Illustrations bigger than the empty-state copy they accompany (max 200×200 px on mobile, 320×320 web)

## References

- [74-iconography.md](74-iconography.md) — visual language to match
- [70-design-principles.md](70-design-principles.md) — "performance over polish"
