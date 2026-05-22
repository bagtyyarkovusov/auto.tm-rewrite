# Mobile UI styling guide — NativeWind v4 + React Native Reusables

> **This is the authoritative styling reference for `apps/mobile`.** Every agent that touches a mobile screen, component, theme token, or visual asset must follow this guide end to end.
>
> If a single rule below is skipped, the change WILL fail one of: dark mode, brand fidelity, accessibility, or the mobile verification gate in `docs/agents/mobile-expo.md`.
>
> The mobile app uses **NativeWind v4** (for the styling primitive) plus **React Native Reusables (RNR)** (for composite components, shadcn-style). The two together replace any need to write `StyleSheet.create` blocks, hand-roll a button, or import a web-only `packages/ui` component.

---

## 0 — MANDATORY pre-styling research (do every single time)

Before you write or edit any styling code, run this checklist. If you skip it, you will style the wrong tokens, miss platform quirks, or land code that breaks dark mode.

### 0.1 Read these in order

1. **`docs/agents/nativewind-v4.md`** — this file. Re-read it; the rules drift.
2. **`apps/mobile/CONTEXT.md`** — what the mobile app contains and its known runtime issues.
3. **`apps/mobile/tailwind.config.js`** + **`apps/mobile/global.css`** — the live token surface.
4. **`packages/ui/tokens/`** — the raw palette, spacing, radius, type, shadow, motion. **Source of truth for brand values.**
5. **The screen you are about to touch** — read its current classNames before changing anything.

### 0.2 Run these Context7 queries (always, even when you "know" the answer)

Your training data lags. Run these via the Context7 MCP server (`plugin:context7:context7`):

```text
resolve-library-id: nativewind          → pick /nativewind/nativewind (v4.2.0)
query-docs <id> "<your specific question about NativeWind>"

resolve-library-id: react-native-reusables → pick /websites/reactnativereusables
query-docs <id> "<your specific question about RNR>"
```

Use it for: any new component install, dark mode behavior, platform modifier behavior, `cssInterop`, `vars()`, `iconWithClassName`, `PortalHost`, `asChild`, `useColorScheme`, animations, Tailwind v3 vs v4 syntax.

Do NOT use it for: refactoring our own code, business logic, or architecture decisions inside `apps/mobile/src/` modules.

### 0.3 Confirm the install state before you import anything

```bash
# Is RNR installed?
ls apps/mobile/components/ui 2>/dev/null
ls apps/mobile/lib 2>/dev/null
test -f apps/mobile/components.json && echo "RNR initialized" || echo "RNR NOT initialized — go to §2 first"

# Are RNR peer deps in place?
grep -E '"(tailwindcss-animate|@rn-primitives/portal|class-variance-authority|clsx|tailwind-merge)"' apps/mobile/package.json
```

If RNR is **not** initialized and the issue you are working on needs an RNR component (dialog, dropdown, popover, sheet, accordion, command, select, tabs, toast, etc.), STOP and run §2 first.

### 0.4 Never assume — verify the four boundaries

- **Web ≠ mobile.** `packages/ui/components/*.tsx` is **web-only** (uses HTML `<button>`, `React.ButtonHTMLAttributes`). NEVER import from it in `apps/mobile/`.
- **Tailwind v3 ≠ v4.** Mobile is locked to Tailwind v3 syntax (`@tailwind base; @tailwind components; @tailwind utilities;`). RNR's manual install snippets are v3. The web apps use Tailwind v4 (`@theme` blocks). Don't copy snippets between sides.
- **Brand tokens (`bg-brand-500`) ≠ semantic tokens (`bg-primary`).** Both exist on mobile, both are valid, but they serve different purposes (see §3).
- **NativeWind classes ≠ web CSS.** A long list of utilities silently no-ops on native (see §5.6).

### 0.5 — Mobile stack ≠ web stack: the boundary rule

Mobile = **NativeWind v4 + Tailwind v3 + React Native Reusables (RNR)** (`@/components/ui/*`). Web/admin = **Tailwind v4 + shadcn/ui** (`@auto-tm/ui/components`). Token **VALUES** are shared via `packages/ui/tokens/`. CSS **syntax** is NOT shared: mobile uses `@tailwind base; @tailwind components; @tailwind utilities;` (Tailwind v3), web uses `@theme inline { … }` (Tailwind v4). Components are NOT shared: RN `<Pressable>` ≠ DOM `<button>` — importing `@auto-tm/ui/components` in mobile will crash at runtime. The full matrix lives in `docs/prd/ui/79-web-vs-mobile.md`; read it for any cross-platform decision.

---

## 1 — The contract

1. **All styling is via NativeWind `className`.** No `StyleSheet.create` for new code. Inline `style={{ ... }}` is only for genuinely dynamic values that cannot be expressed as classes (e.g., `transform: [{ translateX: shake }]` for a Reanimated/Animated value).
2. **All composite components come from React Native Reusables.** Button, Input, Card, Dialog, Dropdown, Popover, Sheet, Accordion, Tabs, Toast, Avatar, Badge, Checkbox, Switch, etc. Do NOT hand-roll them. If RNR doesn't have it, see §6.9 ("Building a new primitive").
3. **All icons come from `lucide-react-native` rendered through the RNR `<Icon>` wrapper** (which applies `className` correctly via `cssInterop`). Never set color via prop when you can set it via class.
4. **Brand identity uses `bg-brand-*`, `text-brand-*`, etc.** Semantic UI roles use `bg-primary`, `text-foreground`, `bg-muted`, `bg-card`. Both come from the same source palette; the difference is communicative (see §3).
5. **Every visual state ships in both light and dark.** No exceptions. Pair every `bg-`, `text-`, `border-`, `placeholder-` with its `dark:` counterpart unless the class is already a semantic token (`bg-background`, `text-foreground` automatically switch).
6. **Tokens never get inlined.** No hex codes (`#E60000`), no raw px outside the spacing scale, no magic numbers. If a needed value isn't in `packages/ui/tokens/`, ADD it there first.
7. **Mobile is air-gapped TM.** Any link or asset URL must resolve from inside Turkmenistan. Don't introduce a CDN dependency to style something.

Anything that violates rules 1–6 fails review.

---

## 2 — One-time setup: enabling React Native Reusables

Run this **only once per repo**. After it lands, the rest of this guide assumes the setup is in place. Track the install as a sprint task; do not improvise it in the middle of a feature PR.

### 2.1 Install peer deps

```bash
pnpm --filter @auto-tm/mobile add \
  tailwindcss-animate \
  class-variance-authority \
  clsx \
  tailwind-merge \
  @rn-primitives/portal

# Confirm Expo-pinned versions are still aligned
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

### 2.2 Create `apps/mobile/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "global.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 2.3 Add path aliases to `apps/mobile/tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 2.4 Rewrite `apps/mobile/global.css`

Replace the current `@tailwind base; @tailwind components; @tailwind utilities;` with the dual-layer file below. **Light tokens live in `:root`, dark tokens in `.dark:root`** — this is the layout RNR expects.

HSL values below are derived from `packages/ui/tokens/colors.ts` (`palette.red[500] = #E60000`, etc.). Keep this file and `packages/ui/tokens/colors.ts` in lockstep.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Surfaces — driven by neutral palette */
    --background: 0 0% 100%;          /* neutral-0  #FFFFFF */
    --foreground: 0 0% 9%;            /* neutral-900 #171717 */
    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 9%;

    /* Brand — AutoTM red #E60000 */
    --primary: 0 100% 45%;
    --primary-foreground: 0 0% 100%;  /* on-primary = white */

    /* Neutrals as secondary/muted/accent */
    --secondary: 60 7% 95%;           /* neutral-100 #F4F4F2 */
    --secondary-foreground: 0 0% 9%;
    --muted: 60 7% 95%;
    --muted-foreground: 0 0% 45%;     /* neutral-500 */
    --accent: 60 7% 95%;
    --accent-foreground: 0 0% 9%;

    /* Status (kept distinct from brand red) */
    --destructive: 351 89% 60%;       /* error-500 #F43F5E */
    --destructive-foreground: 0 0% 100%;

    /* Strokes & focus */
    --border: 40 8% 90%;              /* neutral-200 #E7E6E3 */
    --input: 40 8% 90%;
    --ring: 0 100% 45%;               /* brand red for focus rings */

    /* Radius — base for shadcn calc() math */
    --radius: 0.5rem;                 /* 8px = our radius-md */
  }

  .dark:root {
    --background: 0 0% 4%;            /* neutral-950 #0A0A0A */
    --foreground: 0 0% 98%;           /* neutral-50 */
    --card: 0 0% 9%;                  /* neutral-900 */
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 98%;

    /* Brand — same hue, slightly brighter for dark surfaces */
    --primary: 0 100% 50%;
    --primary-foreground: 0 0% 100%;

    --secondary: 0 0% 15%;            /* neutral-800 */
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 65%;     /* neutral-300/400 mix */
    --accent: 0 0% 15%;
    --accent-foreground: 0 0% 98%;

    --destructive: 351 89% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 0 0% 23%;               /* neutral-700 #3A3A39 */
    --input: 0 0% 23%;
    --ring: 0 100% 50%;
  }
}
```

### 2.5 Update `apps/mobile/tailwind.config.js`

Extend the existing AutoTM theme with shadcn semantic tokens. **Keep the brand/neutral palette intact** — both layers must coexist.

```js
const { tailwindTheme } = require("@auto-tm/ui/theme/tailwind");
const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      ...tailwindTheme,
      colors: {
        ...tailwindTheme.colors,
        // Semantic shadcn-style tokens (used by RNR components)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        ...tailwindTheme.borderRadius,
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [require("tailwindcss-animate")],
};
```

**Why `darkMode: "class"`?** It lets the in-app theme toggle work even though we default to `"system"`. NativeWind's `useColorScheme` resolves `"system"` against the OS at runtime, so users on iOS dark mode still get dark surfaces. The class strategy is required for any future explicit toggle.

### 2.6 Create `apps/mobile/lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 2.7 Create `apps/mobile/lib/theme.ts` (mirrors `global.css`)

```ts
import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

export const THEME = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(0 0% 9%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(0 0% 9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(0 0% 9%)",
    primary: "hsl(0 100% 45%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(60 7% 95%)",
    secondaryForeground: "hsl(0 0% 9%)",
    muted: "hsl(60 7% 95%)",
    mutedForeground: "hsl(0 0% 45%)",
    accent: "hsl(60 7% 95%)",
    accentForeground: "hsl(0 0% 9%)",
    destructive: "hsl(351 89% 60%)",
    destructiveForeground: "hsl(0 0% 100%)",
    border: "hsl(40 8% 90%)",
    input: "hsl(40 8% 90%)",
    ring: "hsl(0 100% 45%)",
    radius: "0.5rem",
  },
  dark: {
    background: "hsl(0 0% 4%)",
    foreground: "hsl(0 0% 98%)",
    card: "hsl(0 0% 9%)",
    cardForeground: "hsl(0 0% 98%)",
    popover: "hsl(0 0% 9%)",
    popoverForeground: "hsl(0 0% 98%)",
    primary: "hsl(0 100% 50%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(0 0% 15%)",
    secondaryForeground: "hsl(0 0% 98%)",
    muted: "hsl(0 0% 15%)",
    mutedForeground: "hsl(0 0% 65%)",
    accent: "hsl(0 0% 15%)",
    accentForeground: "hsl(0 0% 98%)",
    destructive: "hsl(351 89% 60%)",
    destructiveForeground: "hsl(0 0% 100%)",
    border: "hsl(0 0% 23%)",
    input: "hsl(0 0% 23%)",
    ring: "hsl(0 100% 50%)",
    radius: "0.5rem",
  },
} as const;

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
```

### 2.8 Wire `PortalHost` + `ThemeProvider` into the root layout

`apps/mobile/app/_layout.tsx`:

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

`PortalHost` MUST be the last child inside `ThemeProvider`. Without it, RNR's `Dialog`, `DropdownMenu`, `Popover`, `Sheet`, `Tooltip`, `ContextMenu`, `Toast`, `Command`, `HoverCard`, and `Select` render nothing on native.

### 2.9 Add the Icon primitive

```bash
pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add icon
pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add text
pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add button
```

These three are the minimal floor: every other RNR component depends on `Text` and `Icon`.

### 2.10 Verify the install

```bash
pnpm --filter @auto-tm/mobile typecheck
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
pnpm --filter @auto-tm/mobile exec expo export -p ios --clear
```

All three must pass. Then commit the setup as a single PR titled `chore(mobile): adopt React Native Reusables`.

---

## 3 — Token architecture (three layers, all live at the same time)

The mobile app exposes three layers of classes. Use the right one for the right job. Mixing them randomly is the #1 visual-debt source.

### Layer A — Raw palette (`brand-*`, `neutral-*`, `success-500`, …)

Source: `packages/ui/tokens/colors.ts` → surfaced by `@auto-tm/ui/theme/tailwind` → merged into `tailwind.config.js`.

| Class family | Purpose | Use when |
|---|---|---|
| `bg-brand-50` … `bg-brand-900` | AutoTM red ramp | Brand surfaces, primary buttons that need a specific tint (e.g., `bg-brand-700` for pressed state) |
| `bg-neutral-0` … `bg-neutral-950` | Warm-gray ramp | Custom surfaces that aren't a card/popover (rare) |
| `text-success-500`, `bg-warning-500`, `border-error-500`, `text-info-500` | Status hues | Inline feedback that should remain semantically the SAME hue in both light + dark |

These are static — they do NOT switch with the theme. They're for **brand identity** and **status semantics**.

### Layer B — Semantic shadcn tokens (`bg-background`, `text-foreground`, …)

Defined as CSS variables in `global.css` (light) and `.dark:root` (dark). NativeWind reads them at runtime; they automatically swap when the color scheme changes.

| Class | What it is | Light | Dark |
|---|---|---|---|
| `bg-background` / `text-foreground` | Screen base | `neutral-0` / `neutral-900` | `neutral-950` / `neutral-50` |
| `bg-card` / `text-card-foreground` | Card surface | `neutral-0` / `neutral-900` | `neutral-900` / `neutral-50` |
| `bg-popover` / `text-popover-foreground` | Overlays | `neutral-0` / `neutral-900` | `neutral-900` / `neutral-50` |
| `bg-primary` / `text-primary-foreground` | Brand action | `brand-500` / `white` | `brand-500*` / `white` |
| `bg-secondary` / `text-secondary-foreground` | Soft action | `neutral-100` / `neutral-900` | `neutral-800` / `neutral-50` |
| `bg-muted` / `text-muted-foreground` | Subtle background, helper text | `neutral-100` / `neutral-500` | `neutral-800` / `neutral-400` |
| `bg-accent` / `text-accent-foreground` | Hover/active backdrop | `neutral-100` / `neutral-900` | `neutral-800` / `neutral-50` |
| `bg-destructive` / `text-destructive-foreground` | Destructive action | `error-500` / `white` | `error-500` / `white` |
| `border-border` | Default stroke | `neutral-200` | `neutral-700` |
| `border-input` | Form field stroke | `neutral-200` | `neutral-700` |
| `ring-ring` | Focus ring | brand red | brand red |

Use these for ALL composite-component internals. RNR components are pre-wired to them — if you don't customize, they Just Work in both themes.

### Layer C — Component variants (via `cva` inside a component file)

Each RNR component file defines its own `variants` map. `Button` ships with `default | destructive | outline | secondary | ghost | link` and `size: default | sm | lg | pill | icon`. `size="pill"` (52px `rounded-full`) is reserved for commit buttons — wizard footer actions, Sell entry CTAs, and any primary flow completion step. To add a "brand" variant, edit the component file in place (see §7.1).

### When to use which

| Situation | Layer |
|---|---|
| AutoTM splash, logo lockup, hero CTA that must scream brand | A (`bg-brand-500`) |
| App chrome — screen background, card, default text | B (`bg-background`, `bg-card`, `text-foreground`) |
| Form input, default button, dialog, accordion, etc. | B (let RNR's pre-baked classes carry it) |
| Status pill: success / warning / error / info | A (`bg-success-500/10`, `text-success-500`) |
| One-off pressed state for a brand button | C (extend the variant) |

Anti-patterns:
- Using `bg-neutral-0 dark:bg-neutral-950` everywhere instead of `bg-background`. Verbose, drift-prone, defeats the variable system.
- Using `bg-primary` for the AutoTM logo color. Wrong — that's brand identity, use `text-brand-500`.
- Inlining `#E60000`. Never.

---

## 4 — `global.css` + `tailwind.config.js` — what is and isn't legal to change

These two files are the source of truth for the entire theme. Treat them like a contract.

| Change | Rule |
|---|---|
| Adjust an HSL value | Update **both** `global.css` AND `lib/theme.ts` AND, if it's a brand/neutral value, `packages/ui/tokens/colors.ts`. They must agree. |
| Add a new semantic token | Add it to all four: `global.css :root`, `global.css .dark:root`, `tailwind.config.js theme.extend.colors`, `lib/theme.ts`. |
| Add a new raw palette color | Add it to `packages/ui/tokens/colors.ts` → it flows automatically through `@auto-tm/ui/theme/tailwind`. |
| Change the radius scale | Edit `packages/ui/tokens/radius.ts`. The `--radius` CSS var (used for `rounded-lg`/`md`/`sm` in RNR) should match `radius.md` (8px) at the base. |
| Change the spacing scale | Edit `packages/ui/tokens/spacing.ts`. The `tailwindTheme.spacing` derives from it. Spacing tokens are raw px values and must convert to rem with `/ 16` because `apps/mobile/metro.config.js` sets `inlineRem: 16`. |

**When to add a token vs use a bracket utility:** Add a new token only if it's used in 3+ screens OR represents a brand identity moment (logo, brand-locked accent). Otherwise reach for a bracket utility: `bg-destructive/10`, `text-foreground/60`, `border-primary/40`. Bracket utilities are free, don't burden the four-file cascade, and read at the call site. Adding a token for a single-use tint is an anti-pattern — see §7.8.

Spacing scale (4px grid):

| Tailwind | px | Use for |
|---|---|---|
| `p-1`, `m-1`, `gap-1` | 4 | Icon-to-text micro spacing |
| `p-2`, `gap-2` | 8 | Tight rows (form rows) |
| `p-3` | 12 | Compact buttons, list items |
| `p-4`, `gap-4` | 16 | Default container padding |
| `p-5` | 20 | Section padding |
| `p-6`, `gap-6` | 24 | Card padding, screen vertical rhythm |
| `p-8` | 32 | Hero spacing |
| `p-10`, `p-12` | 40, 48 | Empty states |

Radius scale:

| Tailwind | px | Use for |
|---|---|---|
| `rounded-sm` (`calc(var(--radius) - 4px)`) | 4 | Tiny chips, small buttons |
| `rounded-md` (`calc(var(--radius) - 2px)`) | 6 | Inputs, secondary buttons |
| `rounded-lg` (`var(--radius)`) | 8 | Default buttons, cards |
| `rounded-xl` | 16 | Modals, hero cards |
| `rounded-2xl` | 24 | Marketing-grade emphasis surfaces |
| `rounded-full` | ∞ | Avatars, badges, pills |

Typography:

| Class | Token |
|---|---|
| `font-sans` | Inter |
| `font-mono` | Menlo |
| `text-xs` … `text-5xl` | from `packages/ui/tokens/type.ts` |
| `font-regular`, `font-medium`, `font-semibold`, `font-bold` | 400 / 500 / 600 / 700 |

---

## 5 — NativeWind v4 essentials (the platform's rules)

NativeWind compiles Tailwind utilities into RN `StyleSheet` at build time and resolves dark mode / pseudo-classes at runtime. The rules below are non-negotiable on native — many web habits silently break here.

### 5.1 className first; `StyleSheet.create` never

```tsx
// ✅
<View className="flex-1 bg-background p-4">

// ❌
const styles = StyleSheet.create({ container: { flex: 1 } });
<View style={styles.container}>
```

Inline `style={{ transform: [...] }}` IS allowed when the value depends on a `Reanimated`/`Animated` shared value or is a one-off geometry calc that can't be a class. Example: the shake animation in `app/(auth)/otp.tsx`.

### 5.2 Platform differences (CRITICAL — these will bite you)

**`flexDirection` defaults to `column` on RN.** Always set `flex-row` explicitly when you want horizontal.

```tsx
<View className="flex-row items-center gap-2">  // ✅ horizontal
<View className="flex items-center gap-2">      // ❌ stacks vertically on RN
```

**Use `flex-1`, never bare `flex`.** Bare `flex` is `flex: 1` on web; on native it's ambiguous.

**`View` ignores text classes.** `text-*`, `font-*`, `leading-*` only apply to `Text` (and RNR's `<Text>` wrapper).

```tsx
<Text className="text-foreground text-lg font-semibold">…</Text>
<View  className="text-foreground">…</View>  // ❌ no-op
```

**This app's rem baseline is 16.** NativeWind can default differently on native, but `apps/mobile/metro.config.js` pins `inlineRem: 16`. Shared px spacing tokens must therefore be emitted as `px / 16` rem values. If `spacing[10] = 40`, Tailwind must receive `2.5rem`, not `10rem`.

**Children don't inherit text styles.** Setting `className="text-foreground"` on a parent `View` does nothing for a child `<Text>` unless you go through `TextClassContext` (which is exactly what RNR's `Button`/`Card`/etc. do — see §6.3).

### 5.3 Platform modifiers

| Prefix | Applies on |
|---|---|
| `ios:` | iOS |
| `android:` | Android |
| `web:` | Web (irrelevant for us today) |
| `native:` | iOS + Android (both) |
| `windows:`, `osx:` | desktop targets (unused) |

```tsx
<View className="ios:pt-2 android:pt-4">
<Text className="native:text-base web:text-sm">
```

### 5.4 Dark mode

We use **system-driven dark mode by default**. `app.json` already has `"userInterfaceStyle": "automatic"`. After §2 we use `darkMode: "class"` so we can override per-user in the future, but with no `setColorScheme` call NativeWind tracks the OS automatically.

**Hard rule:** every visible color class ships with a `dark:` counterpart UNLESS the class is already a semantic token (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, etc. — those swap on their own).

```tsx
// ✅ Either form works
<View className="bg-background"> {/* auto-swaps */}
<View className="bg-white dark:bg-neutral-950"> {/* explicit pair */}

// ❌ Breaks in dark mode
<View className="bg-white">
```

Reading the current scheme programmatically (e.g., to pass a color into a non-NativeWind icon prop): use `useColorScheme()` from `react-native` for read-only, or from `nativewind` if you also need `setColorScheme` / `toggleColorScheme`.

```tsx
import { useColorScheme } from "nativewind";

const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
```

`colorScheme` is `"light" | "dark" | undefined` — guard for `undefined` (first render).

### 5.5 States & pseudo-classes

| Modifier | Triggered by | Works on |
|---|---|---|
| `active:` | `onPressIn`/`onPressOut` | `Pressable`, `TouchableOpacity`, RNR `Button` |
| `hover:` | `onHoverIn`/`onHoverOut` | `Pressable`, `TextInput` (NOT `View`/`Text`) |
| `focus:` | `onFocus`/`onBlur` | `TextInput`, `Pressable` |
| `disabled:` | `disabled` prop | any component supporting it |
| `empty:` | no children | any |

Group states for parent-driven styling:

```tsx
<Pressable className="group/cta">
  <Text className="group-active/cta:text-primary-foreground">Press</Text>
</Pressable>
```

The trailing `/name` is required when you have nested groups — pick a descriptive name and use it on both sides.

### 5.6 What does NOT work on native

Do not reach for these — they silently no-op or crash:

| Category | Unsupported |
|---|---|
| Backgrounds | `bg-gradient-*` (use `expo-linear-gradient`), `bg-attachment`, `bg-clip`, `bg-origin`, `bg-position`, `bg-repeat`, `bg-size` |
| Borders | `border-double`, `border-hidden` (use `border-0`) |
| Layout | CSS Grid (`grid-cols-*`, `grid-rows-*`) — use Flexbox |
| Tables | All CSS table utilities |
| Filters | `backdrop-blur-*`, `backdrop-*` — use `expo-blur` |
| Transforms via CSS | use RN `transform` style instead |
| Animations | CSS `@keyframes` — use `react-native-reanimated`; the `tailwindcss-animate` plugin we install is for accordion height transitions handled by RNR via Reanimated, not arbitrary CSS animations |
| Transitions | most CSS transitions — prefer Reanimated |
| Effects | `mix-blend-mode`, `background-blend-mode` |
| Content | `content-*` |
| Scroll snap | `scroll-snap-*` |
| Cursor | `cursor-*` |

What DOES work: Flexbox, spacing, sizing, typography, colors, borders, border-radius, opacity, position, z-index, overflow, display, `aspect-ratio`.

### 5.7 `calc()` rules

Supports same-unit operands. Does NOT mix units.

```tsx
<View className="w-[calc(100%-20px)]">     // ✅
<View className="w-[calc(100%-20rem)]">    // ❌ mixed units
```

### 5.8 Bridging third-party components — `cssInterop` and `remapProps`

For RN components you didn't write that don't accept `className` (or accept it on the wrong prop), bridge them:

```ts
import { cssInterop, remapProps } from "nativewind";

// Map className → style on a single style prop
cssInterop(SomeThirdPartyComponent, { className: "style" });

// Map a custom prop name → another style prop (without runtime overhead)
remapProps(SomeOtherComponent, { containerClass: "containerStyle" });
```

**`cssInterop` adds per-mount runtime cost.** Only use it for third-party components. For your own components, accept `className` directly and use `cn(...)`.

RNR's `Icon` component is already bridged for `lucide-react-native`. Use it instead of bridging icons yourself.

### 5.9 Safe area

Don't reach for `react-native-safe-area-context` props when classes will do:

```tsx
<View className="pt-safe pb-safe-offset-2">
```

`pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` apply the inset directly. `*-safe-offset-N` adds N spacing units beyond the inset.

When you need a `SafeAreaView` (e.g., for full-screen modals that should respect the notch in landscape), keep importing `react-native-safe-area-context` and applying `className` to it.

### 5.10 SVG / images

- Local `.svg` files: import directly. `react-native-svg-transformer` is already configured in `metro.config.js`.
- `react-native-svg` shapes accept `fill-*` and `stroke-*` via NativeWind's pre-configured `cssInterop`.
- For raster images, prefer `expo-image` only when remote images need caching/placeholders. Local PNGs/JPGs can use RN's `Image`.

### 5.11 Performance

1. **Opacity utilities cost more than `opacity`.** Avoid `bg-opacity-50` etc. Use `opacity-50` on the element, or use an RGBA token (`bg-black/50` works but compiles to an inline color).
2. **`cssInterop` is per-component overhead.** Don't bridge components you own; accept `className` directly.
3. **`!important` (`!`) forces runtime style recalculation.** Use only for inline-style overrides, not as a normal escape hatch.
4. **Prefer `Pressable` over `TouchableOpacity`** — supports more pseudo-classes, no implicit opacity animation.
5. **Lists: don't put complex `cn(...)` calls inside `renderItem`.** Memoize the class string outside, or precompute.

---

## 6 — React Native Reusables (RNR) essentials

RNR is shadcn for React Native. The CLI copies component source into `apps/mobile/components/ui/` — you own the code; there's no runtime dependency to wrestle with versions of. Customize freely.

### 6.1 What lives where

```
apps/mobile/
├─ components.json            # CLI config
├─ components/
│  └─ ui/                     # ← RNR components live here (button.tsx, text.tsx, …)
├─ lib/
│  ├─ utils.ts                # cn(...)
│  └─ theme.ts                # THEME + NAV_THEME mirror of global.css
├─ global.css                 # CSS variables
└─ tailwind.config.js         # Maps vars to Tailwind classes
```

### 6.2 Installing components

```bash
# One component
pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add button

# Several at once
pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add button input label card dialog

# Interactive multi-select
pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add
```

After install, **immediately** open the file under `components/ui/`. The agent owns the file from that point — edit variants, swap defaults, hook up brand tokens. Do not treat RNR files as off-limits.

### 6.3 The Text inheritance trick (`TextClassContext`)

In RN, child `<Text>` does NOT inherit color/font from a parent `<View>`. RNR solves this with `TextClassContext`: composite components (Button, Card, Badge…) wrap their children in a context that the RNR `<Text>` reads. **This is why every `Button` body MUST be wrapped in `<Text>` from `@/components/ui/text`** — a raw `react-native` `<Text>` won't read the context.

```tsx
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

<Button variant="default">
  <Text>Sign in</Text>            {/* RNR Text — picks up white from context */}
</Button>

<Button variant="default">
  Sign in                          {/* ❌ TypeError — Button doesn't accept raw strings */}
</Button>

<Button variant="default">
  <RNText>Sign in</RNText>        {/* ❌ Wrong color — raw RN Text ignores context */}
</Button>
```

### 6.4 The Icon primitive

`<Icon as={LucideIcon} className="…">` is the only sanctioned way to render an icon. It wraps `lucide-react-native` with `cssInterop` so `text-*`, `size-*`, `fill-*`, `stroke-*` all work.

```tsx
import { Icon } from "@/components/ui/icon";
import { Heart, Search, X } from "lucide-react-native";

<Icon as={Heart}  className="size-5 text-foreground" />
<Icon as={Search} className="size-6 text-muted-foreground" />
<Icon as={X}      className="size-4 text-destructive" />
```

Never pass `color={…}` or `size={…}` when you can pass a class. The class form respects dark mode automatically; the prop form does not.

Lucide icons must stay outline-only by default. The wrapper should preserve `fill="none"` unless a caller explicitly supplies a fill class/prop; passing `fill={undefined}` through to `react-native-svg` can override Lucide's default and make icons render as black filled shapes.

The deprecated `lib/icons/iconWithClassName` pattern from RNR's pre-August-2025 rewrite is gone — do not reintroduce it.

### 6.5 `PortalHost` and the components that depend on it

Already mounted in `app/_layout.tsx` (§2.8). Required for: `Dialog`, `AlertDialog`, `DropdownMenu`, `Popover`, `Sheet`, `Tooltip`, `ContextMenu`, `HoverCard`, `Command`, `Select`, `Toast`.

If you ever see "portal not registered" or a dropdown that just doesn't appear, check that `<PortalHost />` is still the last child inside `ThemeProvider`.

### 6.6 The `asChild` pattern

Use `asChild` on RNR primitives that need to delegate styling to a child instead of rendering their own element. The classic case: wrapping `expo-router`'s `<Link>` in a `<Button>`.

```tsx
import { Link } from "expo-router";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

<Link href="/(auth)/phone" asChild>
  <Button>
    <Text>Sign in</Text>
  </Button>
</Link>
```

Alternative: use `buttonVariants`/`buttonTextVariants` directly:

```tsx
import { Link } from "expo-router";
import { Text } from "@/components/ui/text";
import { buttonVariants, buttonTextVariants } from "@/components/ui/button";

<Link href="/legal/terms" className={buttonVariants({ variant: "outline" })}>
  <Text className={buttonTextVariants({ variant: "outline" })}>Terms</Text>
</Link>
```

### 6.7 Available components

The full RNR catalogue (status as of 2026-05). Install via `npx @react-native-reusables/cli@latest add <name>`.

| Component | Purpose | Requires PortalHost |
|---|---|---|
| `accordion` | Collapsible sections | No |
| `alert` | Inline alert banner | No |
| `alert-dialog` | Modal confirm dialog | Yes |
| `aspect-ratio` | Fixed-ratio container | No |
| `avatar` | User avatar with fallback | No |
| `badge` | Status pill | No |
| `button` | Pressable with variants (`default`/`brand`/`destructive`/`outline`/`secondary`/`ghost`/`link` + `default`/`sm`/`lg`/`pill`/`icon`) | No |
| `card` | Card with header/content/footer | No |
| `checkbox` | Boolean input | No |
| `collapsible` | Generic collapsible | No |
| `command` | Command palette | Yes |
| `context-menu` | Long-press menu | Yes |
| `dialog` | Modal dialog | Yes |
| `dropdown-menu` | Menu surface | Yes |
| `hover-card` | Hover preview | Yes |
| `icon` | Lucide wrapper | No |
| `input` | Text input | No |
| `label` | Form label | No |
| `menubar` | Top menu bar | Yes |
| `navigation-menu` | Nav menu | Yes |
| `popover` | Floating panel | Yes |
| `progress` | Progress bar | No |
| `radio-group` | Radio selection | No |
| `select` | Native picker | Yes |
| `separator` | Divider | No |
| `sheet` | Bottom/side sheet | Yes |
| `skeleton` | Loading placeholder | No |
| `slider` | Range input | No |
| `switch` | Toggle | No |
| `table` | Data table | No |
| `tabs` | Tab navigation | No |
| `text` | Themed Text wrapper | No |
| `textarea` | Multi-line input | No |
| `toast` | Transient notification | Yes |
| `toggle` | On/off button | No |
| `toggle-group` | Segmented control | No |
| `tooltip` | Hover/focus tooltip | Yes |

If the component you need isn't listed, fall back to `@rn-primitives/*` (the underlying Radix-port) or build it raw (§6.9).

### 6.8 Differences from shadcn web

RNR is *almost* shadcn but with constraints:

- **No DOM portals** — uses `@rn-primitives/portal` and a `PortalHost`.
- **No `data-*` attributes** — variants live in component props/state.
- **No CSS animations** — uses `react-native-reanimated`.
- **No automatic text inheritance** — `TextClassContext` handles it (§6.3).
- **No `hover` on plain `View`/`Text`** — only `Pressable` and `TextInput` respond.

If a shadcn snippet you find online doesn't compile, these five differences are why.

### 6.9 Building a new primitive (when RNR doesn't have it)

Order of preference:

1. Use an RNR component as a starting point — copy it to a new name and adapt.
2. Use `@rn-primitives/*` (e.g., `@rn-primitives/slot`, `@rn-primitives/portal`) if you need Radix-style headless logic.
3. Hand-build using `Pressable` + `View` + RNR `<Text>` + `cva` for variants.

Every new primitive MUST:

- Live in `apps/mobile/components/ui/` (lower-case kebab-case filename).
- Accept and merge `className` via `cn(...)`.
- Use `cva` for variants.
- Pair every color/background/border class with a `dark:` counterpart OR use semantic tokens.
- Use RNR `<Text>` for any text descendant — or set up its own `TextClassContext.Provider` if it must pass styles down.

---

## 7 — Daily styling workflow

### 7.1 Customize an RNR component to use the AutoTM brand

After installing `button`, open `apps/mobile/components/ui/button.tsx`. The default `default` variant maps to `bg-primary` — and `bg-primary` already resolves to brand red because of the CSS var in §2.4. So **most of the time you don't customize at all; the theme cascade does it for you.**

When you DO need to add a variant (say, an "outline-brand" with a brand-tinted border on light surfaces):

```tsx
// apps/mobile/components/ui/button.tsx (excerpt)
const buttonVariants = cva(
  "group flex items-center justify-center rounded-md ...",
  {
    variants: {
      variant: {
        default: "bg-primary active:bg-primary/90 ...",
        destructive: "bg-destructive active:bg-destructive/90 ...",
        outline: "border border-input bg-background ...",
        secondary: "bg-secondary active:bg-secondary/80 ...",
        ghost: "active:bg-accent ...",
        link: "...",
        // ↓ Add the new variant
        "outline-brand":
          "border-2 border-brand-500 bg-background active:bg-brand-50 dark:active:bg-brand-900/20",
      },
      size: { default: "h-10 px-4", sm: "h-9 px-3", lg: "h-11 px-8", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "group-active:text-accent-foreground text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "group-active:text-accent-foreground text-foreground",
      link: "text-primary group-active:underline",
      "outline-brand": "text-brand-500",
    },
    size: { default: "", sm: "", lg: "text-base", icon: "" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

Then `<Button variant="outline-brand"><Text>Test drive</Text></Button>` Just Works.

### 7.2 Build a screen with RNR + NativeWind

```tsx
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-semibold text-foreground">Notifications</Text>
        <Icon as={Bell} className="size-6 text-muted-foreground" />
      </View>

      <View className="px-4 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>New match</CardTitle>
            <CardDescription>BMW X5 2018 fits your saved search.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" size="sm">
              <Text>View listing</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
}
```

Notes on the above:
- `bg-background` and `text-foreground` carry dark mode automatically — no `dark:` modifiers needed.
- `Card` already styles itself via semantic tokens; you don't pass a single color.
- `Button variant="default"` resolves to brand red because `--primary` is brand red.
- `Icon as={Bell}` sizes and colors via class, not props.

### 7.3 Migrating an existing hand-rolled screen

Look at `apps/mobile/app/(auth)/phone.tsx` — it's the current pattern (works, but verbose).

Steps to migrate a screen to RNR:

1. Identify hand-rolled primitives in the file: a `<Pressable>` styled as a button, a `<View>+<TextInput>` styled as a field, a `<View>` styled as a card.
2. Install the RNR equivalent: `npx @react-native-reusables/cli@latest add button input card`.
3. Replace the JSX. Pull color classes out (now handled by the component) and keep only layout/spacing classes on outer wrappers.
4. Replace inline ternary classNames for state (e.g., focus/error border) with the component's `variant` or `aria-invalid`-style prop.
5. Replace any `<Text>` inside the new component with `<Text>` from `@/components/ui/text`.
6. Replace any `useColorScheme()` + `palette.neutral[…]` pattern with `<Icon as={X} className="text-foreground" />`.
7. Run the verification gate (§9).

### 7.4 Customization decision tree

Not every change to an RNR component requires a new CVA variant. Use the lightest touch that solves the problem.

```
Need a styling/behavior change vs the RNR default?
├─ One call site, one-off?                                  → cn() at the call site
├─ 2 call sites, same change?                               → still cn() — extract only if it grows
├─ 3+ call sites OR brand-locked?                           → Add a CVA variant to the component file (§7.6)
├─ Need a structural slot RNR lacks
│   (leading prefix, trailing button)?                      → Custom composition wrapping RNR (§7.5)
├─ Visual contract of the whole primitive
│   changes for AutoTM (rare)?                              → Edit CVA BASE classes — ADR required (§7.6)
├─ Need a fork due to incompatible variant sets?
│   (the component must serve two contradictory contracts)  → New sibling file — ADR required (§7.7)
└─ Primitive doesn't exist in RNR                           → New file in components/ui/ via @rn-primitives or §6.9
```

Rules of thumb:
- Default to editing the RNR file in place. RNR components live in your tree; you own them.
- Prefer `cn()` over new variants — it's discoverable at the call site and doesn't grow the component's public API.
- A `className` prop on a custom composition is the primary customization API for consumers; `hasError`-style booleans are for state-driven toggling.

### 7.5 Custom composition wrapping an RNR primitive

When an RNR component doesn't have the slot you need (e.g., a leading icon or locked prefix on `Input`), wrap it in a styled container. Do NOT hand-roll a new `Pressable`+`TextInput` stack — still use the RNR primitive inside.

**File location:** `apps/mobile/components/<feature>/<Name>.tsx`. **NOT** `apps/mobile/components/ui/` — that path is reserved for RNR-installed primitives so `npx @react-native-reusables/cli@latest add` doesn't clobber your custom code.

**Rules:**
- Import the RNR primitive and use it as the core element.
- Additional chrome (prefix, suffix, divider) lives in styled `<View>` wrappers — semantic tokens only (`bg-card`, `border-input`, `border-border`).
- **Prop API includes parent-controlled booleans** (e.g., `hasError`) so the call site never ternary-classNames inline.
- Accept and merge `className` via `cn(...)`.
- For text: use the RNR `<Text>` inside the composition if it sits inside an RNR composite; raw RN `<Text>` is fine for non-contextual slots (e.g., the locked `+993` prefix).

**Worked example — `PhoneInput`:**

```tsx
// apps/mobile/components/auth/PhoneInput.tsx
import { forwardRef } from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

export interface PhoneInputProps extends TextInputProps {
  hasError?: boolean;
  prefix?: string;
}

export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(
  ({ hasError, prefix = "+993", className, ...rest }, ref) => {
    return (
      <View
        className={cn(
          "h-12 flex-row items-center rounded-md bg-card",
          hasError
            ? "border-2 border-destructive"
            : "border border-input",
          className,
        )}
      >
        <View className="h-full justify-center border-r border-border px-3">
          <Text className="text-base text-foreground">{prefix}</Text>
        </View>
        <Input
          ref={ref}
          className="flex-1 border-0 bg-transparent px-3 text-base text-foreground"
          {...rest}
        />
      </View>
    );
  },
);

PhoneInput.displayName = "PhoneInput";
```

Notes on the above:
- `border-input` → `border-border` for the divider — both auto-swap in dark mode.
- `bg-card` on the wrapper, same surface as an RNR `Input`.
- `hasError` drives the border switch so the call site doesn't ternary-classNames.
- `ref` is `TextInput` — the consumer can call `.focus()` directly.

### 7.6 Adding a CVA variant vs editing base classes

When a component already uses `cva()` (Class Variance Authority), you have two touch points:

**VARIANTS map** (second argument to `cva()`): visual **states** — `default | outline | brand-outline`. Add a new variant key when ≥3 screens need the same visual state. Variant keys use kebab-case: `"outline-brand"`, `"brand-locked"`.

**BASE classes** (first argument to `cva()`): apply to **all** variants of that component. Change ONLY when the change is universal across every screen — e.g., bumping `rounded-md` → `rounded-lg` for ALL buttons in the app. Universal base-class edits require an **ADR** because they affect every consumer.

**LOCKSTEP rule:** Many RNR components have TWO `cva()` calls — one for the container (`buttonVariants`), one for the text (`buttonTextVariants`). When you add a new variant key, you MUST add it to both. The anti-pattern: adding `"outline-brand"` to `buttonVariants` but skipping `buttonTextVariants` → button text renders white on a white border, invisible. The RNR Button, Badge, and Toggle have this paired-CVA pattern; check each component's file for a second `cva()` call before committing.

**Example — adding `"outline-brand"` and `"pill"` to Button:**

`"pill"` is a size variant, not a color variant. It is orthogonal to `variant` — combine them as `variant="brand" size="pill"`.

```tsx
// apps/mobile/components/ui/button.tsx
const buttonVariants = cva(
  "group flex items-center justify-center rounded-md ...",
  {
    variants: {
      variant: {
        // ... existing variants ...
        "outline-brand":
          "border-2 border-brand-500 bg-background active:bg-brand-50 dark:active:bg-brand-900/20",
      },
      size: { /* unchanged */ },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      // ... existing text variants ...
      "outline-brand": "text-brand-500",
    },
    size: { /* unchanged */ },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

### 7.7 Forking a primitive (last resort)

**Default:** edit the RNR file in place under `components/ui/`. The RNR philosophy is "you own the file after `npx @react-native-reusables/cli add` copies it."

**Fork** to a sibling file (e.g., `components/ui/button-brand.tsx`) ONLY when:
- The semantic contract of the component diverges from RNR's default (e.g., a "BrandButton" that explicitly cannot have a `destructive` variant).
- Multiple incompatible variant sets are needed for the same primitive and one file would become a CVA megafactory with 20+ variants.

**Cost:** every `npx @react-native-reusables/cli@latest add button` upgrade now requires manual reconciliation against your fork.

**ADR REQUIRED.** No fork lands without one. The ADR must justify why in-place editing or a custom composition wouldn't suffice.

### 7.8 Anti-patterns when customizing

Do not:

- Fork a component when `cn()` at the call site would do. (§7.4, row 1)
- Add a new CSS variable / token when a bracket utility would do. (`bg-destructive/10` — see §4)
- Add a new CVA variant for a one-off used on a single screen. (use `cn()`)
- Hand-roll a `Pressable` + `TextInput` in a custom composition when the RNR primitive could be wrapped instead. (§7.5)
- Forget the `buttonVariants` / `buttonTextVariants` lockstep when adding a variant. (§7.6 LOCKSTEP rule)
- Place a custom composition inline in a route file. They belong in `components/<feature>/`. (§7.5 file location)
- Edit CVA base classes for what should be a variant. (BASE classes affect every consumer; use VARIANTS for visual states)
- Inline a hex code (`#E60000`) in a custom composition. Everything references tokens — including code you write.

---

## 8 — Anti-patterns (don't do these)

| Anti-pattern | Why it's wrong | Do instead |
|---|---|---|
| Over-customizing an RNR component (forking, unnecessary variants, one-off tokens) | See the full list at §7.8 for customization-specific anti-patterns | Follow the §7.4 decision tree — lightest touch first |
| `import { Button } from "@auto-tm/ui/components"` in mobile | That's the WEB Button — uses `<button>` element | `import { Button } from "@/components/ui/button"` (RNR copy) |
| `style={{ backgroundColor: "#E60000" }}` | Hard-coded hex, no dark mode, no tokens | `className="bg-brand-500"` or `className="bg-primary"` |
| `<View className="text-foreground">…</View>` | `View` ignores text classes | Apply text classes to `<Text>` |
| Raw `<Text>` from `react-native` inside `<Button>` | No `TextClassContext` — wrong color | Import `<Text>` from `@/components/ui/text` |
| Building a Modal with `react-native`'s `<Modal>` | Doesn't match Sheet/Dialog visual language | Use RNR `dialog` or `sheet` |
| Long ternary class strings inline | Hard to read, drifts from system | Lift to `cva` or use a `cn(...)` call with named conditions |
| Forgetting `<PortalHost />` | Dialogs render nothing on native | Keep it in `app/_layout.tsx`, last child of `ThemeProvider` |
| Using `bg-opacity-50` | Runtime cost; opacity utility is disabled by default | Use `opacity-50` on the element OR `bg-black/50` |
| `colorScheme === "dark" ? palette.neutral[50] : palette.neutral[900]` to compute icon color | Imperative — re-renders, doesn't track theme system | `<Icon as={X} className="text-foreground" />` |
| `darkMode: "media"` in tailwind.config | Locks out manual override | `darkMode: "class"` (NativeWind treats `"system"` as the default value) |
| Inlining `h-[52px] rounded-full` instead of `size='pill'` | Repeats the same 6+ call sites; drifts from system when design tokens change | Add a CVA size variant at 3+ occurrences (§7.4); use `size="pill"` |
| Patching `node_modules` to "fix" a styling issue | Always wrong — see `docs/agents/mobile-expo.md` | Run `expo install --check` first |

---

## 9 — Verification gate (BEFORE marking a styling task done)

```bash
# Type safety
pnpm --filter @auto-tm/mobile typecheck

# Expo + native module alignment
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check

# Production bundle compiles, all classes valid
pnpm --filter @auto-tm/mobile exec expo export -p ios --clear

# For runtime-visible changes only:
pnpm --filter @auto-tm/mobile exec expo start --clear --go --ios
node apps/mobile/scripts/expo-logs.js --once

# Screenshot for evidence
xcrun simctl io booted screenshot /tmp/auto-tm-expo-go.png
```

All four (or six, for UI-visible work) must succeed. Then stop Metro before handing back.

If `expo export` fails with "unknown utility class", the class doesn't exist in `tailwind.config.js`. If it fails with "cssInterop ... not registered", a custom component lacks its interop call. Don't push a "fix" that disables the check.

---

## 10 — Troubleshooting

### Styles don't apply

1. `pnpm --filter @auto-tm/mobile exec expo start --clear` (kills Metro cache).
2. Confirm `global.css` is imported in `app/_layout.tsx` (the `import "../global.css";` at the top).
3. Verify the file you edited is matched by `content` in `tailwind.config.js`.
4. Did you put a `text-*` class on a `View`? Move it to `<Text>`.
5. Did you forget `flex-row`? RN defaults to column.
6. Enable debug: `DEBUG=nativewind pnpm --filter @auto-tm/mobile exec expo start`.

### Dark mode doesn't switch

1. `app.json` must have `"userInterfaceStyle": "automatic"`.
2. `tailwind.config.js` must have `darkMode: "class"` (post-§2 setup).
3. You're using `bg-white` but no `dark:bg-neutral-950`. Switch to `bg-background`.
4. `useColorScheme()` returns `undefined` on first render — guard for it.

### Dialog / dropdown / popover doesn't appear

`PortalHost` missing or in the wrong place. Reopen `app/_layout.tsx`; it must be inside `ThemeProvider`, after `<Stack />`.

### `<Text>` inside `<Button>` is the wrong color

You imported `<Text>` from `react-native` instead of `@/components/ui/text`. Switch the import.

### Icon color doesn't change with theme

You passed `color={…}` as a prop. Remove the prop, add `className="text-foreground"`.

### `expo install --check` complains after I `add`ed a component

The CLI `add` command can install peer deps at non-SDK-aligned versions. Run:

```bash
CI=1 pnpm --filter @auto-tm/mobile exec expo install --fix
pnpm install --force
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

If a runtime crash follows (e.g., `RNSSafeAreaView` view-config), see `docs/agents/mobile-expo.md` — do NOT patch `node_modules`.

### `tailwindcss-animate` "unknown utility"

You're on Tailwind v4 (web side) but typing v3 syntax (or vice versa). Mobile is locked to Tailwind v3; check `apps/mobile/package.json devDependencies.tailwindcss = ^3.x`.

### "Unknown utility: bg-primary"

`tailwind.config.js` is missing the shadcn-style color extension from §2.5, OR `global.css` is missing the CSS variable definitions from §2.4. Both files must be in sync.

---

## 11 — Web vs mobile component map (which package, when)

| App | Component package | Styling primitive |
|---|---|---|
| `apps/admin` (Next.js, admin console) | `@auto-tm/ui/components` (HTML elements) | Tailwind v4 (`@theme` blocks) |
| `apps/web` (Next.js, public storefront) | `@auto-tm/ui/components` (HTML elements) | Tailwind v4 |
| `apps/mobile` (Expo / RN) | `apps/mobile/components/ui` (RNR copies, RN elements) | NativeWind v4 + Tailwind v3 |

**Cross-app imports of components are forbidden.** Tokens (the `packages/ui/tokens/` exports + `@auto-tm/ui/theme/tailwind`) ARE shared and MUST be the source of truth for both sides. If a token doesn't exist yet, add it in `packages/ui/tokens/` and let it flow into both Tailwind configs.

---

## 12 — Appendix: Context7 query recipes

Run these via the Context7 MCP server when you need fresh, authoritative answers.

| Topic | Library ID | Query template |
|---|---|---|
| NativeWind setup, classes, modifiers | `/nativewind/nativewind` | "How do I {do X} in NativeWind v4 on Expo SDK 55?" |
| NativeWind dark mode internals | `/websites/nativewind_dev` | "NativeWind v4 dark mode class strategy with useColorScheme and setColorScheme" |
| RNR component API | `/websites/reactnativereusables` | "{component name} component anatomy, props, customization variants" |
| RNR CLI flags | `/websites/reactnativereusables` | "react-native-reusables CLI add command flags overwrite" |
| RNR theming customization | `/websites/reactnativereusables` | "Customizing global.css and theme.ts to a brand palette" |
| Tailwind v3 plugin behavior | `/tailwindlabs/tailwindcss` (resolve first) | "tailwindcss-animate keyframes accordion-down accordion-up in v3" |
| Lucide icons + className | `/lucide-icons/lucide` (resolve first) | "lucide-react-native size and color via Tailwind className" |
| Expo Router + theme | `/expo/expo` (resolve first) | "expo-router StatusBar ThemeProvider integration" |

When in doubt, add `researchMode: true` to `query-docs` and rerun — it pulls live source repos.

---

## 13 — TL;DR checklist for the next agent

Print this and tape it to the wall:

- [ ] I read this file end to end this session.
- [ ] I read `apps/mobile/CONTEXT.md` and the screen's own `CONTEXT.md` (if any).
- [ ] I ran `expo install --check` first.
- [ ] I confirmed RNR is initialized (`apps/mobile/components.json` exists) OR I followed §2 to initialize it.
- [ ] I styled via `className`, not `StyleSheet.create`.
- [ ] Every color/background/border class either uses a semantic token (`bg-background`, etc.) or includes a `dark:` pair.
- [ ] Every composite component (button, input, dialog, etc.) is imported from `@/components/ui/*`, not hand-rolled.
- [ ] Every `<Text>` descendant of an RNR component is the RNR `<Text>` (not `react-native`'s).
- [ ] Every icon is `<Icon as={LucideX} className="…">`.
- [ ] `PortalHost` is intact in `app/_layout.tsx`.
- [ ] I did NOT import from `@auto-tm/ui/components` (that's web-only).
- [ ] I ran the verification gate (§9) and captured a screenshot for UI-visible work.
- [ ] I stopped Metro before handing back.

If any box is unchecked, the change is not done.
