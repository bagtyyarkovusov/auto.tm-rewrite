---
description: Produce a high-fidelity design spec for an AutoTM screen or flow. Token-precise, dark-mode aware, motion-specified, accessibility-checklisted, trilingual copy, with implementation shape for Tailwind v4 + shadcn (web/admin) or NativeWind v4 (mobile). Standalone-paste-able into Claude.ai for design iteration.
---

# AutoTM — High-fidelity design

> **Invocation:** `/hifi-design <screen-or-feature>` — `$ARGUMENTS` is free text. Examples:
>
> - `/hifi-design listing detail page`
> - `/hifi-design OTP login flow`
> - `/hifi-design sell wizard step 3 (photos)`
> - `/hifi-design admin moderation queue`
>
> If `$ARGUMENTS` is empty, ask. Don't invent one.
>
> You are producing a **high-fidelity design spec** — token-precise, every state covered, every interaction mapped to motion + easing tokens, dark mode covered, accessibility checked, trilingual copy laid out. The output is what a frontend engineer would implement directly.
>
> If a `/wireframe` for this screen exists at `docs/prd/ui/wireframes/<slug>.md`, **read it first** and treat it as the structural baseline. Hi-fi layers tokens, state, motion, copy, and a11y on top.

---

## 0. Hard rules (non-negotiable)

- **Mobile-first by default.** Cover phone first, then web/admin if the screen lives on those too (per the platform decision tree in §3).
- **Every visual value references a token.** Never inline a hex code or pixel value in the output. Use `var(--color-brand-500)` / `text-neutral-900` / `gap-4` / `rounded-lg` style. If a value isn't in the token system, flag it and propose a new token.
- **Both modes specified.** Every color must list light AND dark. If they're the same, say "same in both modes."
- **Every state spelled out.** Default, loading, empty, error, offline. If a state isn't applicable, write "N/A — reason."
- **Trilingual copy.** Every user-visible string in RU, TK, EN. If you don't have a translation, mark `[needs translation]` — do not invent translations.
- **Accessibility checklist on every output.** Contrast ratios, tap-target sizes (≥44×44 mobile, ≥24×24 dense desktop), focus-visible behavior, screen-reader labels for icon-only buttons.
- **No emoji in system copy.** Same rule as the brand brief.
- **No anti-patterns** from BRAND CONTEXT below.

---

## 1. Read these first (skip if working standalone)

If running inside the repo, read for context — otherwise BRAND CONTEXT below is self-contained:

1. `docs/prd/ui/70-design-principles.md` through `docs/prd/ui/77-accessibility.md` — full UI doc set
2. `docs/prd/ui/wireframes/<slug>.md` (if `/wireframe` ran first) — structural baseline
3. `packages/ui/tokens/*.ts` and `packages/ui/theme/theme.css` (if the repo has the implementation) — verify token names
4. `docs/prd/features/<NN>-<name>.md` — the feature PRD if `$ARGUMENTS` matches
5. `docs/prd/flows/<NN>-<name>.md` — the end-to-end flow if `$ARGUMENTS` is a flow

---

## 2. BRAND CONTEXT (paste-able for standalone use in Claude.ai)

Self-contained brand brief. Same as `/wireframe`'s but with precise token values.

### What AutoTM is

A mobile-first multilingual car marketplace for Turkmenistan. Buyers find used cars; sellers post listings; per-listing chat replaces phone tag; admins moderate. Self-hosted inside TM, air-gapped. Reference visual: auto.ru, simplified for TM market.

### Audience

Private sellers (1-3 listings/lifetime), private buyers (search→message→meet in person), dealerships (PRO-verified), admins (desktop-only). All bilingual minimum (RU+TK, often +EN). UI ships in three locales (`/ru/`, `/tk/`, `/en/`).

### Five design principles

1. **Mobile-first, anonymous-default** — <2s first paint on TM mobile data; show real content (listings), not splash; no login wall on browse
2. **Honest UX** — no fake trust badges, no urgency manipulation, no pay-for-placement, default sort label visible
3. **Multilingual without forcing translation** — chrome in RU/TK/EN; user content stays in whatever language seller wrote
4. **Trust earned, not paid** — tenure, response time, admin-verified PRO badge, Phase 2 inspection tier
5. **Performance over polish** — faster beats prettier; lazy-load; native scroll over custom; animation ≤ 50KB

### Color tokens (semantic)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-brand-50` to `--color-brand-900` | (10-step ramp from `#FFEBEB` to `#560000`) | same | Brand red surfaces, hover/active variants |
| `--color-brand-500` | `#E60000` | `#E60000` | **Primary CTA, brand mark** — never used for error |
| `--color-brand-600` | `#C20000` | `#C20000` | Primary CTA hover |
| `--color-brand-700` | `#9E0000` | `#9E0000` | Primary CTA active |
| `--color-neutral-{0..950}` | warm gray ramp | same | Backgrounds, borders, text |
| `--background` | `var(--color-neutral-0)` `#FFFFFF` | `var(--color-neutral-950)` `#0A0A0A` | Root background |
| `--surface` | `var(--color-neutral-50)` `#FAFAF9` | `var(--color-neutral-900)` `#171717` | Card surface |
| `--surface-elevated` | `var(--color-neutral-0)` `#FFFFFF` | `var(--color-neutral-800)` `#27272A` | Modals, popovers |
| `--border` | `var(--color-neutral-200)` `#E7E6E3` | `var(--color-neutral-700)` `#3A3A39` | Dividers, input borders |
| `--text-primary` | `var(--color-neutral-900)` `#171717` | `var(--color-neutral-50)` `#FAFAF9` | Body text |
| `--text-secondary` | `var(--color-neutral-600)` `#525251` | `var(--color-neutral-300)` `#D2D0CB` | Captions, helper text |
| `--text-tertiary` | `var(--color-neutral-500)` `#737170` | `var(--color-neutral-400)` `#A8A6A0` | Disabled, metadata |
| `--color-success-500` | `#10B981` | `#10B981` | Success badges |
| `--color-warning-500` | `#F59E0B` | `#F59E0B` | Warning chips |
| `--color-error-500` | `#F43F5E` | `#F43F5E` | **Error states** — intentionally rose, NOT brand red |
| `--color-info-500` | `#3B82F6` | `#3B82F6` | Info chips, links |
| `overlayScrim` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | Modal scrim |

### Typography (Inter for everything; Menlo for VINs and aligned prices)

| Size token | px | Use |
|---|---|---|
| `xs` | 11 | Tiny labels, badges |
| `sm` | 13 | Captions, helper text, timestamps |
| `base` | 15 | Body text default |
| `lg` | 17 | Larger body, list items |
| `xl` | 20 | Section headings |
| `2xl` | 24 | Page headings |
| `3xl` | 30 | Hero text |
| `4xl` | 36 | Marketing |
| `5xl` | 44 | Marketing big number |

| Weight | Value | Use |
|---|---|---|
| `regular` | 400 | Body |
| `medium` | 500 | Subtle emphasis, button text |
| `semibold` | 600 | Headings, prices |
| `bold` | 700 | Reserved for special emphasis |

Line-heights: `tight` 1.2 (headlines), `snug` 1.35 (section), `normal` 1.5 (body), `relaxed` 1.65 (long-form blog).

### Spacing (4px grid)

`0 → 0px`, `1 → 4`, `2 → 8`, `3 → 12`, `4 → 16`, `5 → 20`, `6 → 24`, `8 → 32`, `10 → 40`, `12 → 48`, `16 → 64`, `20 → 80`, `24 → 96`.

Common patterns: card padding `4` (16px), list-item gap `3` (12px), section gap `8` (32px), page-edge horizontal padding `4` mobile / `8` desktop.

### Radius

`none` 0, `sm` 4, `md` 8 (buttons/inputs), `lg` 12 (cards default), `xl` 16, `2xl` 24, `full` 9999 (avatars).

### Shadow (used sparingly — most surfaces flat with borders)

- `shadow-sm`: `0 1px 2px rgba(0,0,0,0.05)` — tiny lifts on cards
- `shadow-md`: `0 4px 8px rgba(0,0,0,0.08)` — floating buttons, dropdowns
- `shadow-lg`: `0 8px 24px rgba(0,0,0,0.12)` — modals

### Motion tokens

| Duration | ms | Use |
|---|---|---|
| `instant` | 0 | (no animation) |
| `fast` | 150 | UI feedback (button press, toggle, hover) |
| `base` | 250 | List transitions, tab switches, content cross-fade |
| `slow` | 400 | Modal open/close, drawer slide, route change |

| Easing | Curve | Use |
|---|---|---|
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default state change |
| `decel` | `cubic-bezier(0.0, 0, 0.2, 1)` | Element entering screen |
| `accel` | `cubic-bezier(0.4, 0, 1, 1)` | Element exiting screen |

Performance budget: 60fps on mid-range Android (Redmi Note 9). Animate transform/opacity, not width/height. Honor `prefers-reduced-motion`.

### Iconography

Lucide. Common: `Home`, `Search`, `PlusCircle`, `Heart`, `MessageSquare`, `MapPin`, `Bell`, `User`, `ChevronRight`, `X`, `Camera`, `Filter`, `ArrowUpDown`, `Phone`, `Mail`. Always 24×24 default, 20×20 dense, 16×16 inline. Stroke 1.5 default.

### Anti-patterns (never design these)

- Onboarding tutorial slides
- Achievement / gamification badges
- Carousel autoplay
- Feed video autoplay
- Parallax / scroll-jacking
- Splash screens > 1s with brand animation
- Login wall before browse
- "Featured" / "Promoted" / "Sponsored" listings
- Urgency theatre ("🔥 5 left!")
- Marketing pushes without explicit opt-in

### Tone of voice

Direct, local, respectful. Address users formally in RU. No emoji in system copy. No fake urgency. Currencies: TMT first.

---

## 3. Decide platform(s)

Same decision tree as `/wireframe`:

```
Is the audience an admin?
├── YES → apps/admin (desktop-only)
└── NO → continues

Is it a transaction (buy / sell / message / favorite)?
├── YES → apps/mobile only
└── NO → continues

Is it shareable / SEO-worthy / openable from a link?
├── YES → apps/mobile + apps/web (both)
└── NO → apps/mobile only
```

State your platform decision at the top of the output.

---

## 4. Produce the high-fidelity spec

### 4.1 Output structure (per platform)

Print one full block per platform. Use this exact shape:

```
==============================================
HIGH-FIDELITY DESIGN — <screen name>
Platform: <mobile | public web | admin web>
Mode: light + dark
==============================================

## Purpose

<one or two sentences>

## Layout

<ASCII / structural sketch — same conventions as /wireframe but you may compress
if the wireframe already exists; reference its slug>

## Token map

### Backgrounds + surfaces
- Root background: `bg-[var(--background)]` (light `#FFFFFF` / dark `#0A0A0A`)
- Card: `bg-[var(--surface)]` (light `#FAFAF9` / dark `#171717`)
- Modal / popover: `bg-[var(--surface-elevated)]`
- ...

### Borders + dividers
- Card border: `border border-[var(--border)]` 1px (light `#E7E6E3` / dark `#3A3A39`)
- ...

### Typography
- Page title: Inter `2xl/tight/semibold` (24 / 1.2 / 600) — `text-[var(--text-primary)]`
- Body text: Inter `base/normal/regular` (15 / 1.5 / 400) — `text-[var(--text-primary)]`
- Caption / timestamp: Inter `sm/normal/regular` — `text-[var(--text-secondary)]`
- Price: Menlo `lg/snug/semibold` — `text-[var(--text-primary)]`
- ...

### Spacing
- Page horizontal padding: `px-4` mobile (16px) / `px-8` desktop (32px)
- Card internal padding: `p-4` (16px)
- Vertical gap between sections: `space-y-8` (32px)
- ...

### Radius
- Cards: `rounded-lg` (12px)
- Buttons: `rounded-md` (8px)
- Inputs: `rounded-md` (8px)
- Avatars: `rounded-full`

### Shadows
- Listing card resting: `shadow-sm`
- Floating "back-to-top" button: `shadow-md`
- ...

### Icons
- Tab bar: 24×24 Lucide, stroke 1.5
- Inline meta (mileage): 16×16 Lucide
- ...

## Component shape

### Implementation (mobile — NativeWind v4)

\`\`\`tsx
<View className="bg-[var(--background)] flex-1">
  <View className="px-4 py-3 border-b border-[var(--border)]">
    <Text className="text-2xl font-semibold text-[var(--text-primary)]">
      {title}
    </Text>
  </View>
  ...
</View>
\`\`\`

(or — implementation web — Tailwind v4 + shadcn)

\`\`\`tsx
<main className="bg-[var(--background)] min-h-dvh">
  <header className="px-8 py-4 border-b border-[var(--border)]">
    <h1 className="text-2xl font-semibold">{title}</h1>
  </header>
  ...
</main>
\`\`\`

Show the component skeleton for THIS platform. Don't fully implement; give the engineer the layout + token bindings.

## States

### Default

<one paragraph describing the default rendered state>

### Loading

- Skeleton: <which elements get a shimmer placeholder; mention shimmer duration `2000ms linear loop`>
- First paint target: <1.5s (mobile data) | 0.5s (web)>

### Empty (e.g., no listings match filter)

- Illustration: <small Lucide icon, e.g., `Search` size 48, stroke 1.5, color `text-[var(--text-tertiary)]`>
- Heading: <one short sentence>
- Body: <one sentence with suggested action>
- CTA: <button label or "none">

### Error (network / 5xx)

- Pattern: <inline error banner | full-screen error | toast>
- Color: `bg-[var(--color-error-500)]/10 text-[var(--color-error-500)]` (rose on rose-tint, NOT brand red)
- Icon: Lucide `AlertCircle` size 20
- Copy: "<actionable, no jargon>" + retry button
- Retry behavior: <one sentence>

### Offline (if relevant)

- Banner: `bg-[var(--color-warning-500)]/10 text-[var(--color-warning-500)]`
- Copy: "<short sentence acknowledging offline + what works in cache>"

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| <block name> | <e.g., fade in + slide up 8px> | `base` (250ms) | `decel` |
| <button press> | scale 0.96 + opacity 0.7 | `fast` (150ms) | `standard` |
| <modal open> | slide up from bottom + scrim fade | `slow` (400ms) | `decel` |
| ... | | | |

Reduced motion: <one line — what becomes instant when prefers-reduced-motion is on>

## Accessibility

- **Contrast ratios**: <list each text/background combination; must be ≥4.5:1 for body, ≥3:1 for large text per WCAG AA>
- **Tap targets**: <list any element approaching 44×44; flag if any below>
- **Focus-visible**: <visible 2px outline using `outline-[var(--color-brand-500)]` on keyboard nav>
- **Screen reader**: <list icon-only buttons and their `aria-label`s>
- **Semantic HTML** (web): <headings hierarchy, landmarks like `<main>`, `<nav>`, `<aside>`>
- **Reading order**: <one line confirming logical top-to-bottom or noting exceptions>

## Trilingual copy

Lay out copy strings in a 3-column table. If you can do RU + TK + EN, do it. If not, mark `[needs translation]` for TK or RU — never invent.

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | <ru> | <tk> | <en> |
| `screen.subtitle` | <ru> | <tk> | <en> |
| `cta.primary` | <ru> | <tk> | <en> |
| `empty.heading` | <ru> | <tk> | <en> |
| `error.network` | <ru> | <tk> | <en> |
| ... | | | |

For prices: always show TMT first, USD and AED in a smaller secondary line with a `·` separator.

For phone numbers: format as `+993 6X XX-XX-XX` (groups of 2 after the country code).

For dates: short — "1 hour ago", "yesterday", "3 days ago", then absolute date for older. Use the user's locale for "ago" strings.

## Implementation notes for the engineer

- shadcn components to use (web/admin): `<Button>`, `<Card>`, `<Input>`, `<Dialog>` if modal, `<Sheet>` if bottom-sheet, `<Skeleton>` for loading
- NativeWind equivalents (mobile): map to React Native primitives — `<View>`, `<Text>`, `<TouchableOpacity>` (or `Pressable`), no shadcn (mobile doesn't use it)
- Forms: HTML `<form>` + Zod schema validation on web; controlled React state + Zod on mobile. Inherit schemas from `@auto-tm/contracts`
- Data fetch: `<Suspense>` boundaries on web; SWR or React Query on both
- Images: `next/image` on web with proper `sizes`; `expo-image` on mobile with cache. Lazy-load below the fold.

## Open questions / decisions deferred to engineer

- <list anything where the design has options the engineer picks at implementation time>
- <list anything that needs product input>

```

### 4.2 Self-check before printing

- [ ] No hex codes or raw px values in the output (all via tokens / Tailwind classes)
- [ ] Both light and dark covered for every color reference
- [ ] All 5 states present (default + loading + empty + error + offline if applicable)
- [ ] All motion specifies a duration token and an easing token
- [ ] Reduced-motion behavior stated
- [ ] Contrast ratios spot-checked (text-secondary on surface gets close to the AA threshold — verify)
- [ ] Tap targets ≥ 44×44 on mobile
- [ ] Trilingual table present (or `[needs translation]` placeholders where genuine)
- [ ] Currency order: TMT first
- [ ] No emoji, no fake urgency, no fake trust signals
- [ ] Anonymous-default respected if this is a browse screen
- [ ] Anti-pattern scan: nothing from the brand-brief's never-list

Fix anything that fails before printing.

---

## 5. Print + offer save

After the spec block, ask:

> *"Save this hi-fi spec to `docs/prd/ui/hifi/<screen-slug>.md`? (yes / no / different-path)"*

- `yes` → write to that path on a fresh branch `docs/hifi-<slug>`, commit, open PR
- `no` → leave in conversation only
- `different-path` → ask

If saving, the path is `docs/prd/ui/hifi/` (create dir if missing). PR title: `docs: hi-fi spec — <screen-slug>`.

---

## 6. Bail conditions

Stop and tell the user when:

- `$ARGUMENTS` is empty and the user can't clarify
- The screen requires Phase 2 / Phase 3 features the project doesn't have specs for yet
- Producing on-vibe hi-fi would require inventing tokens that don't exist (propose extending the token system as a separate task)
- A `/wireframe` is recommended first (e.g., a complex flow with multiple branches — wireframe each step low-fi before going hi-fi on any)

On bail, suggest:
- `/wireframe <screen>` first if structure is unclear
- Read the relevant feature PRD if scope is unclear
- File a separate ticket if the token system needs extending

---

## Tooling reference

- `Read` — wireframe, feature PRD, flow doc
- `Write` — the spec file (only if user picks save)
- `Bash` — `gh pr create` if saving + opening PR
- **No `TodoWrite`** — single-screen output
- **No subagents.**

End of prompt.
