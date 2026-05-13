# 76 — Motion

## Principles

1. **Motion communicates state change** — buttons press in, modals slide up, content fades on load.
2. **Snappy by default.** 150ms or less for most feedback.
3. **Never block input.** If something animates, the user can still tap through.
4. **Respect prefers-reduced-motion.** Disable non-essential animations when the OS asks.
5. **No motion for decoration's sake.** A spinning logo is a Phase ∞ feature.

## Duration tokens (from `motion.ts`)

| Token | ms | Use |
|---|---|---|
| `instant` | 0 | No animation (debugging or explicit) |
| `fast` | 150 | Default UI feedback (button press, toggle, hover) |
| `base` | 250 | List item appear/disappear, tab switches |
| `slow` | 400 | Modal open/close, route changes, drawer slide |

## Easings (from `motion.ts`)

| Token | Curve | Use |
|---|---|---|
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default; most state changes |
| `decel` | `cubic-bezier(0.0, 0, 0.2, 1)` | Elements entering screen |
| `accel` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving screen |

## Where motion is used

| Surface | Animation | Duration / easing |
|---|---|---|
| Button press | Scale 0.96 + opacity 0.7 | `fast` / `standard` |
| Toggle / switch | Slide thumb | `fast` / `standard` |
| Tab switch | Content cross-fade | `base` / `standard` |
| Modal open | Slide up from bottom + scrim fade | `slow` / `decel` |
| Modal close | Slide down + scrim fade | `slow` / `accel` |
| Bottom sheet | Slide up from bottom | `slow` / `decel` |
| Drawer | Slide from right | `slow` / `decel` |
| Toast | Slide down from top + auto-dismiss | `base` / `decel` / `accel` |
| Skeleton loader | Shimmer animation | `2000ms` / linear, looping |
| Pull-to-refresh | Standard native (don't customize) | platform |
| Page transition (mobile) | Standard native push/pop | platform |
| Page transition (web) | None (instant) — Next.js default |
| Photo gallery swipe | Native gesture (don't customize) | platform |
| Listing favorite ♥ | Pop scale 1.0 → 1.3 → 1.0 + heart fills | `base` / `standard` |
| Chat new message appear | Slide up from bottom + fade in | `base` / `decel` |
| OTP digit input fill | Subtle scale + color shift | `fast` / `standard` |

## What NOT to animate

- Route changes on web (we want instant page loads)
- Search results appearing (paint instantly)
- Listing cards in the feed (no per-card stagger animation — too much)
- Tab bar icons (no bounce on tap)
- Form field focus (rely on native + a subtle border color)

## Reduced motion

- iOS: check `UIAccessibility.isReduceMotionEnabled`
- Android: check `Settings.Global.TRANSITION_ANIMATION_SCALE`
- Web: `prefers-reduced-motion: reduce` media query
- When reduced motion is requested:
  - All animations < 100ms become instant (zero duration)
  - Modal slides become fade-only
  - Skeleton shimmer stops (static placeholder)
  - Pop animations (heart, etc.) skip

## Performance budget

- 60fps target on TM mobile data with mid-range Android hardware
- Avoid simultaneous animations (one at a time per surface)
- Don't animate properties that trigger reflow (height, width — use transform + scale)
- Worth testing on a real low-end phone (Redmi Note 9, etc.)

## Implementation libraries

- Mobile: Built-in `Animated` API + `react-native-reanimated` for complex animations
- Web: CSS transitions for simple, `framer-motion` for complex orchestration
- shadcn/ui components ship with sensible animations built in — don't override unless needed

## References

- Token source: `packages/ui/tokens/motion.ts`
- [70-design-principles.md](70-design-principles.md) — performance over polish
