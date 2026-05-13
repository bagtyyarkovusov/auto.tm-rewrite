---
name: wireframe-agent-skill
description: Produces a low-fidelity wireframe for an AutoTM screen or flow. Use when the user asks to "wireframe X", "sketch the layout for Y", "draft a low-fi for Z", or wants structural design output before committing to a hi-fi spec. The skill encodes AutoTM's brand voice (mobile-first, anonymous-default, honest UX, multilingual without forced translation, trust earned not paid, performance over polish), tone (direct, local, respectful, no emojis in system copy), and full anti-pattern list inline so output stays on-vibe without reading 12 separate UI docs. Output is structured markdown — ASCII layout + numbered content blocks + interactions + states (loading/empty/error) + placeholder copy. Mobile-first by default; web/admin per the platform decision tree. Offers to save to docs/prd/ui/wireframes/<slug>.md after approval. Also paste-able standalone into Claude.ai for design iteration in a separate context.
---

# AutoTM — Wireframe a screen (agent skill)

> **Source:** Mirrors `.claude/commands/wireframe.md` adapted for cross-agent use.
>
> **Invocation:** When the user names a screen or flow to wireframe ("wireframe the listing detail page", "sketch the OTP login"), produce a low-fi wireframe for it. If no screen named, ask.
>
> **Low-fidelity** = structure, content blocks, hierarchy, interactions, content/copy stubs, state variations. **Not** exact tokens, not pixel-precise spacing, not dark mode color values. That's hifi-design-agent-skill's job.

---

## 0. Hard rules

- **Mobile-first by default.** Phone (~390 × 844 mental model). Web only if §4 decision tree says so. Both if shared.
- **No fake content.** Realistic placeholders ("Toyota Camry 2018, 95 000 TMT"), not lorem ipsum. Currencies TMT first. Cities by actual TM name. Phone numbers `+99362XXXXXX`.
- **No emoji in system copy.** Buttons, labels, notifications — no emoji. (User-generated content like chat messages exempted.)
- **No anti-patterns from BRAND CONTEXT below.**
- **Don't write CSS or component code.** Wireframes are pre-implementation.

---

## 1. Read first (skip if standalone)

1. `docs/prd/ui/70-design-principles.md` — 5 rules
2. `docs/prd/ui/79-web-vs-mobile.md` — what lives where (Phase 1)
3. Feature PRD or flow doc if applicable

---

## 2. BRAND CONTEXT (paste-able for standalone use in Claude.ai)

Self-contained brand brief.

### What AutoTM is

A **mobile-first, multilingual car marketplace for Turkmenistan**. Buyers find used cars; sellers post listings; chat per-listing replaces phone tag; admins moderate. Self-hosted inside TM. Reference: auto.ru, simplified.

### Audience

- Private sellers (1-3 listings/lifetime) — primary
- Private buyers (search → message → meet in person) — primary
- Dealerships (PRO-verified) — secondary
- Admins — desktop-only, internal
- All bilingual minimum (RU+TK, often +EN). UI in three locales (`/ru/`, `/tk/`, `/en/`).

### Five design principles

1. **Mobile-first, anonymous-default.** <2s first paint on TM mobile data. No login wall on browse.
2. **Honest UX.** No fake trust badges, no urgency manipulation, no pay-for-placement. Default sort label always visible.
3. **Multilingual without forcing translation.** Chrome in RU/TK/EN; user content stays in whatever language seller wrote.
4. **Trust earned, not paid.** Tenure, response time, admin-verified PRO badge, Phase 2 inspection tier.
5. **Performance over polish.** Faster always beats prettier.

### Tone of voice

Direct, local, respectful, no fake urgency.
- "Sign in to save listings" — not "Discover the joy of saving"
- "1 hour ago" — not "🔥 HOT!"
- Address users formally in RU ("Здравствуйте")
- Currencies: TMT first, USD + AED supported

### Visual identity (cheat sheet)

- **Brand red** `#E60000` — primary, CTAs. Hover `#C20000`, active `#9E0000`.
- **Error rose** `#F43F5E` — intentionally distinct from brand red.
- **Neutrals**: warm gray. Light bg `#FFFFFF`, dark bg `#0A0A0A`. Borders `#E7E6E3` / `#3A3A39`.
- **Status hues**: success `#10B981`, warning `#F59E0B`, info `#3B82F6`.
- **Type**: Inter for everything; Menlo for VINs / aligned prices.
- **Sizes**: xs 11 / sm 13 / base 15 / lg 17 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36 / 5xl 44.
- **Spacing**: 4px grid (4 / 8 / 12 / 16 / 24 / 32 / 48 commonly).
- **Radius**: cards 12, buttons 8, inputs 8, avatars full.
- **Shadows**: sparingly. Most flat with borders.
- **Motion**: 150ms default, 250ms list transitions, 400ms modals.
- **Icons**: Lucide.
- **Mode**: light + dark, system-default + per-user override.

### Web vs mobile scope (Phase 1)

- **Mobile** (Expo): full feature set
- **Public web** (Next.js `auto.tm`): minimal — landing, listing detail, dealer page, blog read, legal. No search/chat/sell/feed.
- **Admin web** (Next.js `admin.auto.tm`): desktop-only, full admin

### Anti-patterns — never wireframe these

- Onboarding tutorials with multiple slides
- Achievement / gamification badges
- Carousel autoplay
- Auto-playing videos in the feed
- Heavy parallax / scroll-jacking
- Splash screens >1s
- Login walls before browse
- "Featured" / "Promoted" / "Sponsored" listings
- Urgency theatre ("🔥 5 left!")
- Marketing pushes without explicit opt-in

---

## 3. Decide platform(s)

```
Is the audience an admin?
├── YES → apps/admin (desktop-only) — one web wireframe
└── NO → continues

Is it a transaction (buy / sell / message / favorite)?
├── YES → apps/mobile only — one mobile wireframe
└── NO → continues

Is it shareable / SEO-worthy / openable from a link?
├── YES → apps/mobile + apps/web — two wireframes (mobile first)
└── NO → apps/mobile only — one mobile wireframe
```

---

## 4. Produce the wireframe

### Output structure (per platform):

```
==============================================
WIREFRAME — <screen name>
Platform: <mobile | web | admin web>
==============================================

## Purpose (one sentence)

## ASCII wireframe

<use:>
<  ━━ for horizontal dividers>
<  │  for vertical>
<  [ ] for buttons/tappable>
<  ┌──┐ ... └──┘ for cards/blocks>
<  ◐    for icons (notes icon name)>

## Numbered content blocks

1. **<block name>** — <what it shows>
...

## Interactions

- Tapping <block N> → <result>
- Long-pressing <block N> → <result>
- Pull-to-refresh → <result>
- ...

## States

- **Loading**: <one line>
- **Empty**: <one line>
- **Error**: <one line>
- **Offline**: <one line, if relevant>

## Content / copy (English placeholder; trilingual in hi-fi)

- Title: "<exact string>"
- Empty state heading: "<exact string>"
- CTA button: "<exact string>"
- ...

## Open questions for hi-fi

- <ambiguity that hi-fi must resolve>
```

### Mobile mental model

390 × 844 (iPhone 14-ish). ~50 char wide ASCII.

### Web mental model

1280 × 800 (mid-range laptop). ~80 char wide ASCII.

---

## 5. What to skip at wireframe stage

- Exact paddings ("16px gap" — that's hi-fi)
- Exact font sizes (say "headline" / "body" / "caption")
- Color values (say "brand red" / "neutral" / "error")
- Dark mode wireframes
- Animation timing
- Component-level decisions (Radix Dialog vs custom)
- Trilingual copy (single language placeholder)

---

## 6. Self-check before printing

- [ ] No anti-pattern from BRAND CONTEXT
- [ ] Mobile-first respected (or explicitly justified)
- [ ] Empty-state present
- [ ] Error-state present
- [ ] No "Featured"/"Promoted"/"Trending" blocks
- [ ] Anonymous-default respected on browse screens
- [ ] CTA primary action visible above the fold
- [ ] Copy in plain, respectful tone

---

## 7. Print + offer save

Print the wireframe block. Ask:

> *"Save to `docs/prd/ui/wireframes/<screen-slug>.md`? (yes / no / different-path)"*

- `yes` → write, commit on fresh branch, open PR (lightweight — wireframes are markdown)
- `no` → leave in conversation
- `different-path` → ask

PR title: `docs: wireframe <screen-slug>`.

---

## 8. Bail conditions

Stop when:
- Screen requested doesn't fit Phase 1 scope
- Producing wireframe requires inventing data (PRD missing)

Suggest reading the relevant PRD first.

---

## Cross-agent notes

Pure markdown output. Works in any agent host with file read/write + shell.
