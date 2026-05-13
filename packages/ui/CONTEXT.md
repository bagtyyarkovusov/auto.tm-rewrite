# packages/ui — CONTEXT

## Purpose

Design tokens (the single source of truth) + shared shadcn/ui components for `apps/admin` and `apps/web`. Mobile (`apps/mobile`) consumes the tokens but has its own React Native component implementations because the rendering primitives differ.

## What it contains

```
packages/ui/
├── tokens/                  Design tokens — used by all 3 frontends
│   ├── colors.ts            Palette + semantic colors
│   ├── type.ts              Font scale + weights + line-heights
│   ├── spacing.ts           4px-grid spacing
│   ├── radius.ts            Border-radius scale
│   ├── shadow.ts            Elevation shadows
│   ├── motion.ts            Durations + easings
│   └── index.ts             Re-exports
├── theme/
│   ├── theme.css            Tailwind v4 @theme directive — imported by web + admin globals.css
│   └── tailwind.ts          JS token export — consumed by NativeWind v4 (mobile)
├── components/              Shared shadcn components (web only)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── ...
│   └── index.ts
├── package.json
└── CONTEXT.md
```

## Token system

| Token | What it controls |
|---|---|
| `palette` | Raw color values: `red[50-900]`, `neutral[0-950]`, `green/amber/rose/blue[500]` |
| `colors` | Semantic mappings: `primary`, `surface`, `textPrimary`, `error`, etc. — resolved by theme mode |
| `type` | Font family (`Inter`), scale (xs/sm/base/lg/xl/2xl/3xl/4xl/5xl), weights (400/500/600/700), line-heights |
| `spacing` | 4px-base grid: `0`, `1`, `2`, `3`, ... `16` (multiples of 4px) |
| `radius` | Border-radius: `none / sm / md / lg / xl / 2xl / full` |
| `shadow` | Elevation: `sm / md / lg` |
| `motion` | Durations (`instant / fast / base / slow`) + standard easing |

## Critical token decision

Brand red is `#E60000` (palette `red[500]`).
Error red is rose `#F43F5E` (palette `rose[500]`) — distinct hue from brand, fixes the previous app's brand-vs-error collision.

## Theme mode

- Light mode + dark mode supported
- Resolved by `useColorScheme()` (system) + per-user override (stored in profile prefs)
- Mode-aware tokens declared as `{ light, dark }` pairs in `colors.ts`
- shadcn uses CSS variables; mobile uses runtime theme provider

## Implementation per frontend

| App | Style system | How tokens consumed |
|---|---|---|
| `apps/web` (Next.js) | Tailwind v4 + shadcn | `globals.css` imports `theme/theme.css` via `@import`; CSS variables from `@theme` directive |
| `apps/admin` (Next.js) | Tailwind v4 + shadcn | Same as web |
| `apps/mobile` (Expo) | NativeWind v4 (Tailwind for RN) | `tailwind.config.js` extends `theme/tailwind.ts`; theme provider supplies mode |

## Iconography

Lucide:
- `lucide-react` on web + admin
- `lucide-react-native` on mobile
- Same icon names, same visual style, just different bindings

## Component library scope

For web + admin only. Mobile re-implements equivalents using React Native primitives because:
- React Native primitives differ (`<View>` vs `<div>`)
- Accessibility props differ
- Gesture handling differs (touch vs click)

The component **names** match across platforms (`Button`, `Card`, `Input`, etc.) so designers / engineers can think in one vocabulary.

## Public API surface

```ts
export * as tokens from './tokens'
export * from './components'  // web/admin only — mobile imports from its own component lib
```

## Dependencies

- `tailwindcss`
- `@radix-ui/*` (underlying shadcn primitives)
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react`

## Tailwind v4 migration note

Sprint 1 uplifted Tailwind from v3 (charter baseline) to **v4.1** per ADR-0011.

What changes:
- `packages/ui` uses CSS-first configuration: `@import "tailwindcss"` and `@theme` blocks in a CSS file.
- No `tailwind.config.js` / `tailwind.config.ts` preset file in `packages/ui`.
- Web and admin apps extend the CSS theme via `@import` rather than a JS preset.
- NativeWind v4 is used on mobile; its configuration syntax differs from v3 — consult NativeWind v4 docs when wiring `tailwindcss` in `apps/mobile`.

## Notable decisions

- Charter §12 — Token system structure
- shadcn/ui chosen for web (code copied into repo, no `node_modules` dependency for components)
- NativeWind chosen for mobile (Tailwind classnames in React Native, consistent DX)
