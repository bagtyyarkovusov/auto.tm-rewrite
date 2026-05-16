# ADR-0014: Mobile component library — React Native Reusables on top of NativeWind v4

- **Status**: Accepted
- **Date**: 2026-05-16
- **Complements**: ADR-0002 (Technology stack)

## Context

ADR-0002 chose **Expo + expo-router + NativeWind** for the mobile app and **Next.js 15 + shadcn/ui + Tailwind** for web/admin, but left the **mobile composite-component layer unspecified**. Through Sprint S2 (identity / OTP), every mobile screen hand-rolled its primitives: `<Pressable>` styled as a button, `<View>` + `<TextInput>` styled as a field, `<View>` styled as a card. This had three predictable failure modes:

1. **Drift.** Each screen re-derived button height, padding, radius, focus/active styles. `apps/mobile/app/(auth)/phone.tsx` and `apps/mobile/app/(auth)/otp.tsx` already diverged on focus/error border colors.
2. **Verbose dark mode.** Every color class needed an explicit `dark:` counterpart (`bg-neutral-0 dark:bg-neutral-950`, `text-neutral-900 dark:text-neutral-50`, repeated across hundreds of nodes), trivially easy to forget one half.
3. **No reusable surface for higher-order components.** Modal, sheet, dropdown, toast — primitives we'll need across the chat, sell, and listing flows — have no shared home, no shared portal contract, no shared animation strategy.

The web/admin side avoids this via shadcn/ui (`packages/ui/components/*`): components are copied into the repo, owned by the project, styled with `cva` variants over Tailwind tokens. The mobile-equivalent of that pattern is **React Native Reusables (RNR)** — a port of shadcn/ui to React Native that works through NativeWind, ships a CLI that copies component source into the project, and uses `@rn-primitives/*` (a Radix-port) for headless logic. It is unrelated to web shadcn at the import level, but shares the design contract (`Button`, `Input`, `Card`, `Dialog`, `Sheet`, `Tabs`, etc., with the same `variant` / `size` API).

We need to commit to a mobile composite-component story before agents continue building S3 sprint screens, or each new screen ships more divergent hand-rolled primitives.

## Decision

`apps/mobile` adopts **React Native Reusables (RNR)** as its composite-component layer, layered on top of the existing **NativeWind v4** styling primitive chosen in ADR-0002.

Concretely:

1. RNR components are CLI-installed into `apps/mobile/components/ui/` via `npx @react-native-reusables/cli@latest add <name>`. The repo owns the source; there is no runtime library to version-pin.
2. Mobile gains a **two-layer token surface** while keeping `packages/ui/tokens/` as the single shared source of truth:
   - **Layer A — raw palette** (`bg-brand-500`, `text-neutral-900`, `text-error-500`, …) for brand identity and status semantics. Same as today.
   - **Layer B — shadcn semantic tokens** (`bg-background`, `bg-card`, `bg-popover`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-destructive`, …) defined as CSS variables in `apps/mobile/global.css` under `:root` / `.dark:root`, mapped from the same palette. RNR components consume these. They auto-swap between light and dark — no `dark:` modifier pairs needed for app chrome.
3. **`tailwind.config.js` runs `darkMode: "class"`** so a future user-driven theme toggle is possible. The default behavior (no `setColorScheme` call) tracks the OS via NativeWind's `useColorScheme`.
4. `<PortalHost />` from `@rn-primitives/portal` is mounted in `apps/mobile/app/_layout.tsx`. RNR `Dialog`, `AlertDialog`, `DropdownMenu`, `Popover`, `Sheet`, `Tooltip`, `ContextMenu`, `HoverCard`, `Command`, `Select`, and `Toast` all require it.
5. Icons go through RNR's `<Icon as={LucideX} className="…">` wrapper (`@/components/ui/icon`) — `lucide-react-native` icons styled by class, not prop. Color/size via Tailwind utility, not `color={…}`/`size={…}`.
6. `<Text>` inside any RNR composite (`Button`, `Card`, `Badge`, `Toast`, etc.) is the RNR `<Text>` (`@/components/ui/text`), NOT `react-native`'s. Reason: RNR uses `TextClassContext` to propagate inherited styles through `Button` etc.; raw RN `<Text>` ignores that context.
7. `packages/ui/components/*` remains **web-only**. Importing it from `apps/mobile/**` is forbidden — its components emit HTML elements (`<button>`, `<input>`) that cannot render in React Native. The boundary is enforced by convention in `CLAUDE.md` and by an `eslint` no-restricted-imports rule in `apps/mobile/eslint.config.mjs` (to be added during setup).
8. **The authoritative reference for this layer is `docs/agents/nativewind-v4.md`.** Every mobile-UI-touching agent must read it. CLAUDE.md, `apps/mobile/CONTEXT.md`, the `/wireframe` and `/hifi-design` skills, and the `prototype` skill have been updated to point there.

Tailwind version split is unchanged: web (`@auto-tm/ui` + `apps/web` + `apps/admin`) on Tailwind v4, mobile (`apps/mobile`) on Tailwind v3 (NativeWind v4 requirement). Tokens cross the boundary; component source does not.

## Consequences

### Positive

- One canonical component vocabulary across the mobile app (Button, Input, Card, Dialog, Sheet, Tabs, Accordion, Badge, Avatar, Switch, Checkbox, Toast, Select, DropdownMenu, Popover, Tooltip, AlertDialog, Separator, Skeleton, etc.). Wireframes, hi-fi specs, and implementation all speak the same names.
- Mobile dark mode becomes automatic for chrome: semantic tokens auto-swap, eliminating the `bg-x dark:bg-y` repetition that already crept into S2 screens.
- Brand customization is centralized. Changing AutoTM brand red updates `--primary` in `apps/mobile/global.css` and every RNR Button, Badge, focused Input border, and link picks it up. No grep-and-replace through component files.
- Components are copy-into-repo — no NPM upgrade cycle for the component layer, no breaking changes from upstream RNR. We diff against new RNR releases manually if we want a new variant.
- Mobile + web share the *shape* of design specs (same component names, same `variant` slots), so agents context-switching between the platforms stay oriented. Imports differ by design.
- The RNR setup pulls in `react-native-reanimated` (already a peer dep per ADR-0002 SDK alignment), `@rn-primitives/portal`, `tailwindcss-animate` — all stable, well-supported, and shared with the broader RN ecosystem.
- Wireframe / hi-fi skills (`/wireframe`, `/hifi-design`) and prototype skill now enforce the RNR vocabulary in their self-checks. Drift gets caught at the design stage, not implementation.

### Negative / accepted costs

- **Two component packages coexist.** `@auto-tm/ui/components` (web/admin, shadcn flavor, Tailwind v4, HTML elements) and `apps/mobile/components/ui/` (mobile, RNR, NativeWind v4 / Tailwind v3, RN elements). Agents must read `docs/agents/nativewind-v4.md` §11 (web-vs-mobile component map) to learn the boundary. Cross-imports are a class of bug we now have to guard against (lint rule + reviewer attention).
- **Tailwind version split** between web (v4) and mobile (v3). Snippets don't copy 1:1. `@theme` blocks (web v4) vs `:root` CSS variables (mobile v3) is a real seam.
- **One-time setup work.** A standalone PR (`chore(mobile): adopt React Native Reusables`) must land before any RNR component is imported — installs `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@rn-primitives/portal`; creates `components.json`, `lib/utils.ts`, `lib/theme.ts`; rewrites `global.css` and `tailwind.config.js`; wires `<PortalHost />` + `ThemeProvider` in `app/_layout.tsx`. Setup recipe is in `docs/agents/nativewind-v4.md` §2.
- **S2 screens (`(auth)/phone.tsx`, `(auth)/otp.tsx`) become migration candidates.** Already shipped using raw RN primitives. Their hi-fi spec (`docs/prd/ui/hifi/mobile-otp-login-flow.md`) was updated to reflect the target RNR shape, but the migration itself is deferred to a follow-up sprint (`docs/agents/nativewind-v4.md` §7.3 documents the recipe).
- **New rule surface for agents.** `TextClassContext` (`<Text>` inside `Button` must be RNR `<Text>`), `PortalHost` (required for dialog/menu surfaces), `<Icon as={…}>` (class-based icons), `asChild` (Link-inside-Button). Web devs touching mobile have to internalize these — covered in nativewind-v4.md §6.
- **Status hues do NOT auto-swap.** `text-error-500`, `bg-warning-500`, `text-success-500`, `text-info-500` resolve to the same hex in light + dark by design. That's a feature (status meaning shouldn't shift with theme), but it's a footgun if an agent expects swap behavior.

### Neutral

- NativeWind v4 itself (from ADR-0002) is unchanged. This ADR fills in the composite layer; it does NOT supersede.
- shadcn/ui on web (also from ADR-0002) is unchanged.
- `packages/ui/tokens/` remains the cross-platform source of truth for brand/neutral/status palette, spacing, radius, type, shadow, motion. Both Tailwind configs derive from it.
- Lucide-react-native (already a mobile dep) is unchanged; only the way icons are rendered changes (RNR `<Icon>` wrapper).

## Alternatives considered

### Keep hand-rolling primitives per screen
Rejected. S2 already showed compounding visual debt: phone.tsx and otp.tsx diverged on border colors and focus states within a single sprint. No shared dark-mode contract; every screen reinvents the same eight classes. Doesn't scale across the planned S3–S8 surface (chat, sell wizard, listing detail, garage, favorites, etc.).

### Gluestack UI — universal component library for web + native
Rejected. Newer ecosystem, smaller community, and bundles web + native concerns into one runtime. We already use shadcn/ui on web; adopting Gluestack would force migrating web away from shadcn too, multiplying the change surface for marginal benefit.

### Tamagui — universal, compile-time-optimized
Rejected. Strong universal-component story, but introduces a separate styling system (Tamagui tokens, `styled()` API) that does NOT consume our `packages/ui/tokens/` exports. Lock-in risk is higher; a future migration off it would mean rewriting every styled component, not just swapping imports. Also adds compile-time complexity to the Metro pipeline.

### Build our own mobile component library from scratch on `@rn-primitives/*`
Rejected. RNR essentially IS that — it sits directly on top of `@rn-primitives/*` and adds the variant tables, accessibility wiring, animations, and `TextClassContext` plumbing that we would otherwise hand-write. Reinventing it would burn weeks for no differentiation.

### Use `@auto-tm/ui/components` on mobile (the web library we already have)
Rejected — and structurally impossible. Those components import HTML elements (`<button>`, `<input>`) and depend on `React.ButtonHTMLAttributes<HTMLButtonElement>`. They cannot render in React Native; the Metro bundler would fail. The "fix" would be forking them to use RN elements, which IS exactly what RNR already provides.

### Defer the decision; add primitives ad-hoc as we hit them
Rejected. Every sprint that ships before this decision will inherit the S2 hand-rolled style. Migrating one screen at a time without a foundation produces inconsistent results because each agent re-derives the variant table. Better to land the foundation once and migrate against a fixed target.

## References

- [ADR-0002](0002-stack.md) — Technology stack (defined NativeWind for mobile + shadcn/ui for web; this ADR fills the mobile composite layer)
- [ADR-0003](0003-monorepo.md) — Monorepo with Turborepo + pnpm (the shared-tokens boundary lives in `packages/ui`)
- [`docs/agents/nativewind-v4.md`](../agents/nativewind-v4.md) — authoritative mobile UI stack guide (token architecture, RNR setup recipe, customization patterns, anti-patterns, verification gate, troubleshooting)
- [`apps/mobile/CONTEXT.md`](../../apps/mobile/CONTEXT.md) — updated to point at the guide and clarify packages/ui/components is web-only
- [`CLAUDE.md`](../../CLAUDE.md) — mobile-UI rule updated for RNR + web-only-import boundary
- [`docs/prd/ui/hifi/mobile-otp-login-flow.md`](../prd/ui/hifi/mobile-otp-login-flow.md) — hi-fi spec rewritten to use semantic tokens + RNR component shapes (the migration target for the S2-shipped screens)
- [`/wireframe` skill](../../.claude/commands/wireframe.md) and [`/hifi-design` skill](../../.claude/commands/hifi-design.md) — design skills updated to require nativewind-v4.md reading + RNR vocabulary on mobile output
- React Native Reusables: https://www.reactnativereusables.com/
- NativeWind v4: https://www.nativewind.dev/

---

*This ADR was scaffolded on 2026-05-16.*
