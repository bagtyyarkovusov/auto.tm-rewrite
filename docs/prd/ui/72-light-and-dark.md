# 72 — Light and Dark mode

## Strategy

**System-default with per-user override.** Both modes are first-class — neither is "added later."

- App reads OS preference on first launch
- User can override in Settings → Theme: System / Light / Dark
- Preference stored in `User.themePreference` (synced across devices) + AsyncStorage (offline cache)

## Implementation

### Mobile (Expo)

- `useColorScheme()` from `react-native` for system preference
- A `ThemeProvider` context wraps the app
- Tokens with `{ light, dark }` resolve at render time
- NativeWind: `dark:bg-neutral-900` syntax works after configuring dark mode strategy in `tailwind.config.js`

### Web (Next.js)

- `prefers-color-scheme` media query in CSS
- `[data-theme="light"]` / `[data-theme="dark"]` attribute on `<html>` for explicit override
- CSS variables flip between light/dark sets
- Tailwind `darkMode: 'class'` strategy

## Contrast and quality rules

- Every text-on-surface pair must meet **WCAG AA contrast** (4.5:1 for body, 3:1 for large text)
- Brand red (`#E60000`) on white: 5.39:1 ✓
- Brand red on neutral.950: 4.96:1 ✓
- Light/dark mode versions of the same screen should feel like the same app, not two different apps
- Avoid pure black (`#000000`) on dark mode — use `neutral.950` (`#0A0A0A`) for depth
- Avoid pure white (`#FFFFFF`) on light mode for elevated surfaces — use `neutral.50` (`#FAFAF9`) for warmth

## Mode-specific token resolution

```ts
// Semantic token usage example
import { colors } from '@auto-tm/ui/tokens'

const { mode } = useTheme()  // 'light' | 'dark'

const styles = {
  background: colors.background[mode],
  border:     colors.border[mode],
  text:       colors.textPrimary[mode],
}
```

Or with Tailwind classnames:

```tsx
<View className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700">
```

## What stays the same across modes

- Brand red `#E60000` is the same in both modes (we don't adjust brand hue based on mode)
- Status colors (success / warning / error / info) are the same hex
- Spacing, radius, shadow, motion tokens — same
- Icons — same Lucide stroke; color resolves via context

## What changes

- Background / surface / border colors (theme-aware)
- Text colors (theme-aware)
- Some illustrations need light/dark variants (empty states with gradients)
- Photo overlays may darken in dark mode for better contrast

## OG / share images

OG meta images (1200×630 cards in WhatsApp) are always **light mode** — they're shown by other apps that don't know about our theme. Pick the most universally-readable variant.

## Edge cases

- iOS lock screen widget — uses system mode (no in-app override)
- Notification body — system mode (no theming on system surfaces)
- Splash screen — fixed (light or dark; pick one per platform)
- WhatsApp share preview — controlled by WhatsApp, not us

## References

- [71-design-tokens.md](71-design-tokens.md)
- `packages/ui/tokens/colors.ts`
- Charter §12 — Mode strategy
