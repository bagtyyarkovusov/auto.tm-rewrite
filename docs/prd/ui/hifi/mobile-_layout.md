# Hi-Fi — Mobile Root Layout

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/_layout.tsx`  
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-_layout.md`

==============================================
HIGH-FIDELITY DESIGN — Mobile Root Layout
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Mount the global provider stack, navigation container, and portal infrastructure so every downstream screen inherits theme, query client, toast, and safe-area behavior. This is a chrome-only surface with no user-visible UI of its own.

## Layout

```text
┌────────────────────────────────────────────┐
│  (System status bar — light/dark adaptive) │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Current route content                │  │
│  │ (Stack pushes tabs or auth modals)   │  │
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces
- Root screen base: `bg-background` (light #FFFFFF / dark #0A0A0A)
- Status bar: adaptive via `expo-status-bar` `style` prop driven by `colorScheme`

### Typography
- None at this layer.

### Spacing
- None at this layer; safe-area insets are consumed by downstream screens.

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

```tsx
import "../global.css";

import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

import { NAV_THEME } from "../lib/theme";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? "light";

  return (
    <ThemeProvider value={NAV_THEME[scheme]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/phone" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="(auth)/otp" options={{ presentation: "fullScreenModal" }} />
      </Stack>
      <PortalHost />
    </ThemeProvider>
  );
}
```

## Customization plan

None — all primitives used at defaults. `PortalHost` is a required RNR primitive with no styling surface.

## States

### Default
Providers mounted; `(tabs)` index shown. Status bar color matches OS scheme.

### Loading
Native Expo splash screen until JS bundle loads; no custom splash.

### Empty
N/A — no own UI.

### Error
Unhandled JS error crashes to Expo error boundary (red screen in dev). No custom error boundary at this layer.

### Offline
`onlineManager` pauses queries; refetchOnReconnect resumes. Offline is surfaced per-screen, not at root.

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Auth modal open | iOS sheet slide-up (Expo Router `presentation: "fullScreenModal"`) | system | system |
| Auth modal close | iOS sheet slide-down | system | system |

Reduced motion: system `prefers-reduced-motion` governs Expo Router transitions.

## Accessibility

- **Contrast ratios**: N/A (no text at this layer).
- **Tap targets**: N/A.
- **Focus-visible**: N/A.
- **Screen reader**: `PortalHost` has no accessible elements.
- **Reading order**: N/A.

## Trilingual copy

(none — chrome-only surface)

## Implementation notes

- `PortalHost` MUST be the last child inside `ThemeProvider`. Without it, RNR `Dialog`, `Sheet`, `DropdownMenu`, `Toast`, etc. render nothing on native.
- Do NOT wrap the entire tree in `SafeAreaView` here; leave safe-area handling to each screen so modals and full-screen flows can manage their own insets.
- `NAV_THEME` colors must stay in lockstep with `global.css` and `lib/theme.ts`.

## Open questions

- Should a global `SafeAreaView` wrapper be added for the `(tabs)` stack only? Decision: no, handle per-screen.
