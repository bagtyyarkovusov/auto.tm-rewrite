---
name: hifi-design-agent-skill
description: Produces a high-fidelity design spec for an AutoTM screen or flow. Use when the user asks "hi-fi the listing detail", "design the OTP screen", "produce an implementation-ready spec for X", or wants every visual value mapped to a design token. Token-precise (no hex/no raw px — references like `text-base text-neutral-900` and CSS vars `var(--background)`). Both light and dark mode covered. All five states spelled out (default + loading + empty + error + offline). Motion mapped to fast/base/slow + standard/decel/accel timing tokens. Full accessibility checklist (contrast ratios, tap targets ≥44×44, focus-visible, aria labels, reduced-motion). Trilingual copy in a 3-column table with [needs translation] markers — never invents translations. Component shape in NativeWind v4 (mobile) or Tailwind v4 + shadcn (web/admin). Reads existing wireframe at docs/prd/ui/wireframes/<slug>.md if present as structural baseline. Saves to docs/prd/ui/hifi/<slug>.md after approval. Also paste-able standalone into Claude.ai.
---

# AutoTM — High-fidelity design (agent skill)

> **Source:** Mirrors `.claude/commands/hifi-design.md` adapted for cross-agent use.
>
> **Invocation:** When the user names a screen to design ("hi-fi the listing detail", "design the chat composer"), produce a high-fidelity spec. If no screen named, ask.
>
> **High-fidelity** = token-precise, every state covered, motion mapped to timing tokens, accessibility checklisted, trilingual copy. The output is what a frontend engineer implements directly. If `/wireframe` for this screen exists at `docs/prd/ui/wireframes/<slug>.md`, read it first and treat it as the structural baseline.

---

## 0. Hard rules

- **Mobile-first by default.** Phone first, then web/admin if §3 decision tree says so.
- **For ANY mobile hi-fi spec, read `docs/agents/nativewind-v4.md` end to end first.** Mobile UI stack is NativeWind v4 + React Native Reusables (RNR). Mobile output MUST:
  - Prefer semantic shadcn-style tokens (`bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `text-primary-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-destructive`) for app chrome — auto-swap with dark mode.
  - Use raw brand utilities (`bg-brand-500`, `text-brand-500`) only for brand identity moments. Status hues: `text-success-500`, `bg-warning-500/10`, `text-error-500`, `text-info-500`.
  - Name composites by their RNR component (`Button`, `Input`, `Card`, `Dialog`, `Sheet`, `Accordion`, `Tabs`, `Badge`, `Avatar`, `Switch`, `Checkbox`, `Toast`, `Select`, `DropdownMenu`, `Popover`, `Tooltip`, `AlertDialog`, `Separator`, `Skeleton`). No hand-rolled Pressable/View when RNR covers it. Catalogue: `docs/agents/nativewind-v4.md` §6.7.
  - Icons via `<Icon as={LucideIcon} className="size-N text-…">` from `@/components/ui/icon`, NOT `color`/`size` props.
  - Text inside RNR composites uses the RNR `<Text>` (`@/components/ui/text`), NOT `react-native`'s.
  - Web/admin specs still use shadcn/ui (Tailwind v4) vocabulary. DO NOT mix RNR and shadcn imports — they share API but differ in import paths and platform contracts.
- **Every visual value references a token.** Never inline hex / px. Prefer Tailwind classes (`bg-background`, `gap-4`); use `var(--…)` only as fallback for one-off bracket utilities. If a value isn't in the token system, flag it and propose a new token in `packages/ui/tokens/`.
- **Both modes specified.** Every color lists light AND dark. Semantic tokens auto-swap — call that out (e.g., "`bg-background` resolves to neutral-0 light / neutral-950 dark") instead of redundantly pairing classes.
- **Every state spelled out.** Default + loading + empty + error + offline. If not applicable: "N/A — reason."
- **Trilingual copy.** Every user-visible string in RU + TK + EN. If you don't have a translation, mark `[needs translation]` — never invent.
- **Accessibility checklist on every output.** Contrast (≥4.5:1 body, ≥3:1 large text per WCAG AA), tap targets (≥44×44 mobile, ≥24×24 dense desktop), focus-visible, aria-labels for icon-only buttons.
- **No emoji in system copy.** Same rule as brand brief.
- **No anti-patterns** from BRAND CONTEXT.

---

## 1. Read first (skip if standalone)

1. `docs/prd/ui/70-design-principles.md` through `77-accessibility.md`
2. `docs/prd/ui/wireframes/<slug>.md` if exists — structural baseline
3. **`docs/agents/nativewind-v4.md` — REQUIRED for mobile specs.** Sections 3 (token layers), 4 (config), 5 (NativeWind rules), 6 (RNR essentials + component catalogue), 7 (customization patterns), 11 (web vs mobile component map). Without this, the spec will drift from the implementation surface.
4. `packages/ui/tokens/*.ts` and `packages/ui/theme/theme.css` — verify token names. Shared brand/neutral/status palette flows to both Tailwind configs. Mobile's shadcn semantic layer (`--primary`, `--background`, `--foreground`, `--muted`, etc.) is in `apps/mobile/global.css` + `apps/mobile/lib/theme.ts`.
5. Relevant feature PRD or flow doc

---

## 2. BRAND CONTEXT (paste-able for standalone use in Claude.ai)

### What AutoTM is

A mobile-first multilingual car marketplace for Turkmenistan. Self-hosted, air-gapped. Reference visual: auto.ru, simplified for TM.

### Audience

Private sellers, private buyers, dealerships, admins (desktop). All bilingual minimum (RU+TK, often +EN).

### Five design principles

1. Mobile-first, anonymous-default
2. Honest UX
3. Multilingual without forcing translation
4. Trust earned, not paid
5. Performance over polish

### Color tokens (semantic)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-brand-500` | `#E60000` | `#E60000` | Primary CTA, brand mark |
| `--color-brand-600` | `#C20000` | `#C20000` | CTA hover |
| `--color-brand-700` | `#9E0000` | `#9E0000` | CTA active |
| `--background` | `#FFFFFF` | `#0A0A0A` | Root |
| `--surface` | `#FAFAF9` | `#171717` | Card surface |
| `--surface-elevated` | `#FFFFFF` | `#27272A` | Modal/popover |
| `--border` | `#E7E6E3` | `#3A3A39` | Dividers, input borders |
| `--text-primary` | `#171717` | `#FAFAF9` | Body text |
| `--text-secondary` | `#525251` | `#D2D0CB` | Caption/helper |
| `--text-tertiary` | `#737170` | `#A8A6A0` | Disabled/metadata |
| `--color-success-500` | `#10B981` | same | Success |
| `--color-warning-500` | `#F59E0B` | same | Warning |
| `--color-error-500` | `#F43F5E` | same | **Error — NOT brand red** |
| `--color-info-500` | `#3B82F6` | same | Info/link |
| `overlayScrim` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | Modal scrim |

### Typography (Inter, with Menlo for VINs / aligned prices)

| Size | px | Use |
|---|---|---|
| `xs` | 11 | Tiny labels, badges |
| `sm` | 13 | Captions, timestamps |
| `base` | 15 | Body default |
| `lg` | 17 | Larger body |
| `xl` | 20 | Section headings |
| `2xl` | 24 | Page headings |
| `3xl` | 30 | Hero |
| `4xl` | 36 | Marketing |
| `5xl` | 44 | Marketing big num |

Weights: regular 400, medium 500, semibold 600, bold 700.
Line-heights: tight 1.2, snug 1.35, normal 1.5, relaxed 1.65.

### Spacing (4px grid)

`0 → 0px`, `1 → 4`, `2 → 8`, `3 → 12`, `4 → 16`, `5 → 20`, `6 → 24`, `8 → 32`, `10 → 40`, `12 → 48`.

Common: card padding `4` (16px), list gap `3` (12px), section gap `8` (32px), page edge `4` mobile / `8` desktop.

### Radius

`none` 0, `sm` 4, `md` 8 (buttons/inputs), `lg` 12 (cards default), `xl` 16, `2xl` 24, `full` 9999 (avatars).

### Shadow

- `sm`: `0 1px 2px rgba(0,0,0,0.05)` — tiny lifts on cards
- `md`: `0 4px 8px rgba(0,0,0,0.08)` — floating buttons, dropdowns
- `lg`: `0 8px 24px rgba(0,0,0,0.12)` — modals

### Motion

| Duration | ms | Use |
|---|---|---|
| `instant` | 0 | No animation |
| `fast` | 150 | UI feedback (button press, toggle) |
| `base` | 250 | List transitions, tab switches |
| `slow` | 400 | Modal open/close, drawer, route change |

| Easing | Curve | Use |
|---|---|---|
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default |
| `decel` | `cubic-bezier(0.0, 0, 0.2, 1)` | Entering |
| `accel` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting |

Performance budget: 60fps on Redmi Note 9. Animate transform/opacity, not width/height. Honor `prefers-reduced-motion`.

### Iconography

Lucide. Common: `Home`, `Search`, `PlusCircle`, `Heart`, `MessageSquare`, `MapPin`, `Bell`, `User`, `ChevronRight`, `X`, `Camera`, `Filter`, `ArrowUpDown`, `Phone`, `Mail`. Default 24×24, dense 20×20, inline 16×16. Stroke 1.5 default.

### Anti-patterns

Onboarding slides; gamification badges; carousel autoplay; feed video autoplay; parallax / scroll-jacking; >1s splash; login wall before browse; "Featured"/"Promoted"/"Sponsored"; urgency theatre; marketing pushes without explicit opt-in.

### Tone

Direct, local, respectful. Formal RU. No emojis in system copy. TMT first for currencies.

---

## 3. Decide platform(s)

```
Admin audience? → admin web only
Transaction (buy/sell/message/favorite)? → mobile only
Shareable / SEO-worthy / link-openable? → mobile + web
Otherwise → mobile only
```

State your platform decision at the top of output.

---

## 4. Produce the spec (per platform)

```
==============================================
HIGH-FIDELITY DESIGN — <screen name>
Platform: <mobile | public web | admin web>
Mode: light + dark
==============================================

## Purpose

## Layout

<ASCII / structural sketch — compressed if wireframe exists>

## Token map

### Backgrounds + surfaces
- Root: `bg-[var(--background)]` (light #FFFFFF / dark #0A0A0A)
- Card: `bg-[var(--surface)]`
- Modal: `bg-[var(--surface-elevated)]`
...

### Borders + dividers
- Card border: `border border-[var(--border)]` 1px
...

### Typography
- Page title: Inter `2xl/tight/semibold` — `text-[var(--text-primary)]`
- Body: Inter `base/normal/regular` — `text-[var(--text-primary)]`
- Caption: Inter `sm/normal/regular` — `text-[var(--text-secondary)]`
- Price: Menlo `lg/snug/semibold` — `text-[var(--text-primary)]`
...

### Spacing
- Page horizontal: `px-4` mobile / `px-8` desktop
- Card padding: `p-4`
- Section gap: `space-y-8`
...

### Radius
- Cards: `rounded-lg`
- Buttons/Inputs: `rounded-md`
- Avatars: `rounded-full`

### Shadows
- Listing card: `shadow-sm`
- Floating button: `shadow-md`
...

### Icons
- Tab bar: 24×24 Lucide, stroke 1.5
- Inline meta: 16×16
...

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

\`\`\`tsx
import { View } from "react-native";
import { Bell } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

<View className="flex-1 bg-background">
  <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
    <Text className="text-2xl font-semibold text-foreground">{title}</Text>
    <Icon as={Bell} className="size-6 text-muted-foreground" />
  </View>
  <View className="px-4 gap-3 pt-4">
    <Card>
      <CardHeader>
        <CardTitle>{itemTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" size="sm" onPress={onPress}>
          <Text>{cta}</Text>
        </Button>
      </CardContent>
    </Card>
  </View>
</View>
\`\`\`

Mobile rules (per `docs/agents/nativewind-v4.md`):
- Use RNR components from `@/components/ui/*` for composites.
- Text inside an RNR component MUST be the RNR `<Text>` (`@/components/ui/text`).
- Icons MUST be `<Icon as={LucideX} className="…">` — class-based, not props.
- Semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `text-muted-foreground`, `border-border`, `bg-destructive`) for chrome — auto-swap with dark mode.
- Raw brand utilities (`bg-brand-500`, `text-brand-500`) only for brand identity (logo, brand-locked accents).
- DO NOT import from `@auto-tm/ui/components/*` (web-only).

### Implementation (web — Tailwind v4 + shadcn)

\`\`\`tsx
<main className="bg-background min-h-dvh">
  <header className="px-8 py-4 border-b">
    <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
  </header>
  ...
</main>
\`\`\`

Web/admin uses `@auto-tm/ui/components` (shadcn/ui, Tailwind v4) — separate from mobile RNR.

Show the component skeleton for THIS platform.

## States

### Default
<one paragraph>

### Loading
- Skeleton: <which elements get shimmer; shimmer `2000ms linear loop`>
- First paint target: <1.5s mobile data | 0.5s web>

### Empty
- Illustration: <Lucide icon e.g. `Search` size 48 stroke 1.5 `text-[var(--text-tertiary)]`>
- Heading: <one sentence>
- Body: <one sentence with suggested action>
- CTA: <button label or "none">

### Error
- Pattern: <inline banner | full-screen | toast>
- Color: `bg-[var(--color-error-500)]/10 text-[var(--color-error-500)]` (rose tint, NOT brand red)
- Icon: Lucide `AlertCircle` size 20
- Copy: actionable + retry button
- Retry behavior: <one sentence>

### Offline (if relevant)
- Banner: `bg-[var(--color-warning-500)]/10 text-[var(--color-warning-500)]`
- Copy: <what works in cache>

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| <block> | <e.g., fade in + slide up 8px> | `base` | `decel` |
| <button press> | scale 0.96 + opacity 0.7 | `fast` | `standard` |
| <modal open> | slide up + scrim fade | `slow` | `decel` |
...

Reduced motion: <what becomes instant>

## Accessibility

- **Contrast ratios**: <each text/background combination; ≥4.5:1 body, ≥3:1 large>
- **Tap targets**: <list any approaching 44×44; flag if below>
- **Focus-visible**: 2px outline `outline-[var(--color-brand-500)]` on keyboard nav
- **Screen reader**: <icon-only buttons + their aria-labels>
- **Semantic HTML** (web): <heading hierarchy, landmarks>
- **Reading order**: <logical top-to-bottom or exceptions>

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | <ru> | <tk> | <en> |
| `cta.primary` | <ru> | <tk> | <en> |
| `empty.heading` | <ru> | <tk> | <en> |
| `error.network` | <ru> | <tk> | <en> |
...

- Prices: TMT first, USD + AED secondary with `·` separator
- Phone numbers: `+993 6X XX-XX-XX` (groups of 2 after country code)
- Dates: short relative ("1 hour ago", "yesterday", "3 days ago"), absolute for older

## Implementation notes

- shadcn/ui (web/admin, `@auto-tm/ui/components`): `<Button>`, `<Card>`, `<Input>`, `<Dialog>` if modal, `<Sheet>` if bottom-sheet, `<Skeleton>` for loading.
- RNR (mobile, `apps/mobile/components/ui/*`): `<Button>`, `<Card>`, `<Input>`, `<Dialog>`, `<Sheet>`, `<Tabs>`, `<Accordion>`, `<Badge>`, `<Avatar>`, `<Switch>`, `<Checkbox>`, `<Toast>`, `<Skeleton>` — install via `pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add <name>`. Modal/menu/popover/sheet/toast need `<PortalHost />` in root (already wired). Catalogue: `docs/agents/nativewind-v4.md` §6.7.
- Forms: HTML form + Zod on web; controlled state + Zod on mobile. Schemas from `@auto-tm/contracts`.
- Data: `<Suspense>` on web; SWR or React Query on both.
- Images: `next/image` on web with `sizes`; `expo-image` on mobile only when caching/placeholders are needed.
- Animations: web CSS/Framer Motion; mobile `react-native-reanimated` (CSS animations don't work on native).

## Open questions

<list anything for the engineer or product>
```

---

## 5. Self-check before printing

- [ ] No hex codes or raw px in output (all via tokens)
- [ ] Both light + dark covered for every color (semantic tokens auto-swap; call that out)
- [ ] All 5 states present (default + loading + empty + error + offline if applicable)
- [ ] Motion specifies duration + easing tokens
- [ ] Reduced-motion behavior stated
- [ ] Contrast ratios spot-checked
- [ ] Tap targets ≥ 44×44 on mobile
- [ ] Trilingual table present (or `[needs translation]`)
- [ ] Currency: TMT first
- [ ] No emoji, no fake urgency, no fake trust
- [ ] Anonymous-default respected on browse screens
- [ ] Anti-pattern scan: nothing from BRAND CONTEXT's never-list
- [ ] **Mobile specs only:** Every composite in the Component shape sample is an RNR import (`@/components/ui/*`). Every `<Text>` inside an RNR component is the RNR `<Text>`. Every icon is `<Icon as={…}>`. Semantic tokens used for chrome; raw brand tokens only for brand identity. NO imports from `@auto-tm/ui/components/*`. Cross-checked against `docs/agents/nativewind-v4.md` §6 + §8.

---

## 6. Print + offer save

> *"Save to `docs/prd/ui/hifi/<screen-slug>.md`? (yes / no / different-path)"*

- `yes` → write, commit on fresh branch, open PR
- `no` → leave in conversation
- `different-path` → ask

PR title: `docs: hi-fi spec — <screen-slug>`.

---

## 7. Bail conditions

Stop when:
- Screen requires Phase 2/3 features without specs
- On-vibe hi-fi requires inventing tokens (propose extending token system instead)
- Wireframe is recommended first (complex flow with multiple branches)

Suggest wireframe-agent-skill first if structure unclear.

---

## Cross-agent notes

Pure markdown output. Works in any agent host. Tool naming varies; logic identical.
