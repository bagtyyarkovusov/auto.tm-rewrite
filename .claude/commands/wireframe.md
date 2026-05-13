---
description: Produce a low-fidelity wireframe for an AutoTM screen or flow. Mobile-first. Encodes the project's brand voice, tone, and anti-patterns so output is on-vibe without needing to read 12 UI docs. Also paste-able standalone into Claude.ai for iteration.
---

# AutoTM — Wireframe a screen

> **Invocation:** `/wireframe <screen-or-feature>` — `$ARGUMENTS` is free text naming what to wireframe. Examples:
>
> - `/wireframe listing detail page`
> - `/wireframe OTP login flow`
> - `/wireframe sell wizard step 3 (photos)`
> - `/wireframe dealer showroom page`
>
> If `$ARGUMENTS` is empty, ask the user what to wireframe. Don't invent one.
>
> You are a Claude Code agent producing a **low-fidelity** wireframe — structure, content blocks, hierarchy, key interactions, content/copy stubs, and state variations. **Not** exact tokens, not pixel-precise spacing, not dark mode color values. That's `/hifi-design`'s job.

---

## 0. Hard rules (non-negotiable)

- **Mobile-first by default.** Always start with a phone-sized wireframe (~390 × 844 mental model). If the screen is web-only (per §4 below), say so and produce a desktop wireframe instead. If the screen lives on both, show both — mobile first, web second.
- **No fake content.** Use realistic placeholder strings ("Toyota Camry 2018, 95 000 TMT") not lorem ipsum. Currencies in TMT first. Cities by actual TM name. Years 2010-2025 range. Phone numbers `+99362XXXXXX`.
- **No emoji in system copy.** Buttons, labels, notifications — no emoji. (Emojis are allowed in user-generated content only, e.g., chat messages.)
- **No anti-patterns from the brand brief** (see BRAND CONTEXT below).
- **Don't write CSS or component code.** Wireframes are pre-implementation. Save code for after hi-fi.

---

## 1. Read these first (skip if working standalone)

If running inside the repo, read for context — otherwise the BRAND CONTEXT block below is self-contained:

1. `docs/prd/ui/70-design-principles.md` — the 5 rules
2. `docs/prd/ui/79-web-vs-mobile.md` — what lives where (Phase 1)
3. `docs/prd/features/` (if `$ARGUMENTS` matches a feature) — the feature PRD that contains screen specs
4. `docs/prd/flows/` (if `$ARGUMENTS` is a flow name) — the end-to-end flow doc

---

## 2. BRAND CONTEXT (paste-able for standalone use in Claude.ai)

Everything an LLM needs to wireframe on-vibe, with no repo access.

### What AutoTM is

A **mobile-first, multilingual car marketplace for Turkmenistan**. Buyers find used cars; sellers post listings; chat per-listing replaces phone-call chaos; admins moderate. Self-hosted inside TM. Reference design: auto.ru, simplified.

### Audience

- **Private sellers** (1-3 listings in a lifetime) — primary
- **Private buyers** (search → message → meet in person) — primary
- **Dealerships** (many listings, verified PRO) — secondary
- **Admins** (moderation, broadcast) — internal, desktop-only
- All audiences are **bilingual minimum** (RU+TK, often +EN). UI ships in three locales (URL-prefixed: `/ru/`, `/tk/`, `/en/`).

### Five design principles (from `docs/prd/ui/70-design-principles.md`)

1. **Mobile-first, anonymous-default.** No login wall on browse. < 2s first paint on TM mobile data. Show real content (listings) not a marketing splash.
2. **Honest UX.** No fake trust badges, no urgency manipulation, no "3 people viewing now!", no pay-for-placement. Default sort label always visible.
3. **Multilingual without forcing translation.** UI chrome in RU/TK/EN; user content stays in whatever language the seller wrote.
4. **Trust earned, not paid.** Tenure, response time, PRO badge (admin-verified), tier badge (Phase 2 inspection score). Never sellable.
5. **Performance over polish.** Faster always beats prettier. Lazy-load 30 thumbnails over eager-loading 4K hero images. Native scroll over custom scrollers. Animations < 50KB.

### Tone of voice

Direct, local, respectful, no fake urgency.

- "Sign in to save listings" ← not "Discover the joy of saving with our delightful registration experience"
- "1 hour ago" ← not "🔥 HOT! Just listed!"
- Address users formally in RU ("Здравствуйте" not "Привет")
- Currencies: TMT first, USD and AED supported (admin-edited FX rates — no live API since air-gapped)

### Visual identity (cheat sheet)

- **Brand red** `#E60000` (kept from previous Flutter app) — primary, CTAs, brand marks. Hover `#C20000`, active `#9E0000`.
- **Error rose** `#F43F5E` — intentionally distinct from brand red so errors don't compete with the CTA.
- **Neutrals**: warm gray, slightly off pure gray. Background `#FFFFFF` (light) / `#0A0A0A` (dark). Borders `#E7E6E3` (light) / `#3A3A39` (dark). Text primary `#171717` / `#FAFAF9`.
- **Status hues**: success `#10B981`, warning `#F59E0B`, info `#3B82F6`.
- **Type**: Inter for everything; Menlo for VINs and aligned price columns.
- **Sizes**: xs 11 / sm 13 / base 15 / lg 17 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36 / 5xl 44.
- **Spacing**: 4px grid. Common: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- **Radius**: cards 12, buttons 8, inputs 8, avatars full circle.
- **Shadows**: used sparingly. Most surfaces are flat with borders. `sm` for tiny lifts, `md` for floating buttons, `lg` for modals.
- **Motion**: 150ms default, 250ms list transitions, 400ms modals. Easings: `standard` for most, `decel` for entering, `accel` for leaving.
- **Icons**: Lucide (`Heart`, `Search`, `MessageSquare`, `MapPin`, etc.).
- **Mode**: light + dark, system-default with per-user override.

### Web vs mobile scope (Phase 1)

- **Mobile** (Expo): full feature set — browse, search, chat, sell, garage, favorites, profile, push
- **Public web** (Next.js at `auto.tm`): **minimal** — landing, listing detail (for OG/SEO/shared-link unfurl), dealer page, blog read, legal. No search/chat/sell/feed.
- **Admin web** (Next.js at `admin.auto.tm`): **desktop-only** — full admin (moderation, users, broadcasts, catalog edit, gateway health, audit, Phase 2 inspections)

### Anti-patterns — never wireframe these

- Onboarding tutorials with multiple slides
- Achievement / gamification ("first listing!" badges)
- Carousel autoplay
- Auto-playing videos in the feed (tap to play)
- Heavy parallax / scroll-jacking effects
- Splash screens with brand animations longer than 1 second
- Login walls before showing real content
- "Featured" or "Promoted" listings (we don't sell placement)
- Urgency theatre ("🔥 5 left!")
- Push notifications for marketing without explicit opt-in

---

## 3. Decide platform(s)

For `$ARGUMENTS`, decide which surfaces this screen exists on. Use this decision tree:

```
Is the audience an admin?
├── YES → apps/admin (desktop-only) — produce one web wireframe
└── NO → continues

Is it a transaction (buy / sell / message / favorite)?
├── YES → apps/mobile only — produce one mobile wireframe
└── NO → continues

Is it shareable / SEO-worthy / openable from a link?
├── YES → apps/mobile + apps/web — produce two wireframes (mobile first, then web)
└── NO → apps/mobile only — produce one mobile wireframe
```

Examples:
- "Listing detail page" → both mobile + web (shared via Telegram, OG unfurl)
- "Sell wizard step 3" → mobile only (it's a transaction)
- "Admin moderation queue" → web only (admin)
- "Garage page" → mobile only (personal feature, not shareable)

If you're unsure, state your assumption in the output and ask the user.

---

## 4. Produce the wireframe

### 4.1 Output structure

Print one block per platform:

```
==============================================
WIREFRAME — <screen name>
Platform: <mobile | web | admin web>
==============================================

## Purpose (one sentence)
<what this screen does for whom>

## ASCII wireframe (~ phone or desktop)

<ASCII layout — use these conventions:>
<  ━━ for horizontal dividers>
<  │  for vertical dividers>
<  [  ] for buttons / tappable areas>
<  ┌──┐ ... └──┘ for cards / contained blocks>
<  •••  for paginated content>
<  ◐    for icons (notes the icon name next to it)>

## Numbered content blocks

1. **<block name>** — <what it shows>
2. **<block name>** — <what it shows>
...

## Interactions

- Tapping <block N> → <result>
- Long-pressing <block N> → <result>
- Pull-to-refresh → <result>
- ...

## States

- **Loading**: <one line — what shows>
- **Empty** (e.g., no listings match): <one line>
- **Error** (network / 5xx): <one line>
- **Offline**: <one line, if relevant>

## Content / copy (English placeholder; trilingual in hi-fi)

- Title: "<exact string>"
- Empty state heading: "<exact string>"
- CTA button: "<exact string>"
- ...

## Open questions for /hifi-design

- <anything ambiguous about exact spacing / colors / motion that hi-fi must resolve>
- <any state variations not yet considered>
- <any localization considerations specific to this screen>
```

### 4.2 ASCII wireframe shape — mobile

Mobile mental model: 390 × 844 (iPhone 14-ish proportions). Use ~50 char wide ASCII.

Example for a listing detail header:

```
┌────────────────────────────────────────────────┐
│  ◐ Back              ◐ Share    ◐ Heart (fav) │
├────────────────────────────────────────────────┤
│                                                │
│       [   Hero photo (16:9, swipeable)   ]    │
│       ◐ ◐ ◐ ◐ ◐  3 / 18                       │
│                                                │
├────────────────────────────────────────────────┤
│  Toyota Camry 2018                             │
│  95 000 TMT       (USD 27 100 · AED 99 500)    │
│  Ashgabat · 1 hour ago · ID #L0049281          │
├────────────────────────────────────────────────┤
│  [        Send message       ] (brand red)     │
│  [        Call seller        ] (outlined)      │
└────────────────────────────────────────────────┘
```

### 4.3 ASCII wireframe shape — web

Web mental model: 1280 × 800 (mid-range laptop). Use ~80 char wide ASCII.

Example for the listing-detail public web page:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  auto.tm   /ru  /tk  /en      Search   Categories      [Install app]       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────┐    Toyota Camry 2018                  │
│  │                                 │    95 000 TMT                         │
│  │      Hero photo                 │    (USD 27 100 · AED 99 500)          │
│  │                                 │                                       │
│  └─────────────────────────────────┘    Ashgabat · 1 hour ago              │
│  ◐ ◐ ◐ ◐ ◐ thumbnail strip              ID #L0049281                       │
│                                                                            │
│                                          [   Open in app   ] (brand red)   │
│                                          [   Send message  ] (outlined)    │
│                                                                            │
│  Description                                                               │
│  Single owner, no accidents, full service history. ...                     │
│                                                                            │
│  Specs                                                                     │
│  Mileage   95 432 km                                                       │
│  Body      Sedan                                                           │
│  Engine    2.5L                                                            │
│  ...                                                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 What to skip at wireframe stage

- Exact paddings / margins ("16px gap" — that's hi-fi)
- Exact font sizes (just say "headline" / "body" / "caption" — hi-fi maps to tokens)
- Color values (just say "brand red" / "neutral" / "error" — hi-fi maps to tokens)
- Dark mode wireframes (one wireframe; hi-fi resolves both modes)
- Animation timing (just say "fade in" / "slide up" — hi-fi assigns the token)
- Component-level decisions ("use Radix Dialog vs custom") — hi-fi or implementation
- Trilingual copy (single language placeholder; hi-fi adds RU/TK/EN columns)

---

## 5. Self-check before printing

Before showing the user, scan your output for:

- [ ] Does it violate any anti-pattern from BRAND CONTEXT?
- [ ] Is mobile-first respected? (or explicitly justified as web/admin)
- [ ] Is the empty-state present?
- [ ] Is the error-state present?
- [ ] Are there any made-up "Featured" / "Promoted" / "Trending" blocks? (kill them)
- [ ] Is anonymous-default respected? (no login wall on browse-able screens)
- [ ] Is the CTA primary action visible above the fold?
- [ ] Is copy in plain, respectful tone? No exclamation marks for marketing reasons.

Fix anything that fails before printing.

---

## 6. Print + offer save

Print the wireframe block to the conversation. Then ask:

> *"Save this wireframe to `docs/prd/ui/wireframes/<screen-slug>.md`? (yes / no / different-path)"*

- `yes` → write to that path on a fresh branch, commit + open PR (lightweight — wireframes are easy to review in markdown form)
- `no` → leave in conversation only
- `different-path` → ask where

If saving, the path should be `docs/prd/ui/wireframes/` (create the dir if missing). PR title: `docs: wireframe <screen-slug>`.

---

## 7. Bail conditions

Stop and tell the user when:

- `$ARGUMENTS` is empty and the user can't clarify
- The screen requested doesn't fit the Phase 1 scope (per `docs/prd/02-phases.md`'s in/out list)
- Producing the wireframe would require inventing data we don't have (e.g., a feature whose PRD doesn't exist yet)

On bail, suggest reading the relevant PRD first or running `/grill-me` (or similar) to nail the spec.

---

## Tooling reference

- `Read` — feature PRD or flow doc if the screen maps to one
- `Bash` — `gh pr create` if user picks save+PR
- **No `Write`/`Edit` unless the user explicitly picks save.**
- **No `TodoWrite`** — single-screen output is short enough.

End of prompt.
