# 70 — Design principles

Five rules. Everything else (tokens, components, screen layouts) descends from these.

## 1. Mobile-first, anonymous-default

Most users open the app from a Telegram link on a phone, on slow mobile data, having never signed in. The first screen they see must:

- Load < 2 seconds on TM mobile data
- Show real content (listings) not a login screen
- Require zero taps before something useful happens

This rules out: splash screens with delays, login walls, marketing modals on first launch.

## 2. Honest UX

No fake AI features, no fake "trust" badges, no pay-for-placement, no urgency manipulation ("3 people viewing now!").

If we say a listing is "Trusted by AutoTM" (Phase 2), it's because a human inspector with a rubric scored it that way. Not because the seller paid us.

The default sort label is always visible ("Sort: newest"). Users see what's ranking and why.

## 3. Multilingual without forcing translation

The UI chrome (buttons, labels) ships in Russian, Turkmen, and English from day one.

User-generated content (listings, blog posts, messages) stays in the language the user wrote it. We do not force sellers to write in multiple languages. We do not auto-translate.

Why: most TM users are bilingual; forcing translation deters sellers; auto-translation produces garbage at this volume.

## 4. Trust earned, not paid

Trust signals on the platform:

- **Tenure** ("X years on auto.tm") — earned with time
- **Response time** — earned by being responsive
- **PRO badge** — earned by admin verification (KYC for dealerships)
- **Tier badge** (Phase 2) — earned via inspection score, never editable

We will never sell:
- Featured / promoted placement
- "Verified" stamps without real verification
- Pay-to-skip-moderation

## 5. Performance over polish

When in doubt, choose the faster option, not the prettier one.

- A grid of listings with crisp 600×400 thumbnails ships faster than 4K hero images
- Lazy-loading 30 photos is fine; eager-loading them isn't
- A 50 KB animated transition is wasteful when a fade does the job
- Native scroll always beats a custom infinite-scroller

This means we accept some "could be prettier" UX in exchange for speed.

---

## Tone of voice

| Trait | Example |
|---|---|
| Direct | "Sign in to save listings" — not "Discover the joy of saving with our delightful registration experience" |
| Local | Currencies in TMT first; cities by their actual TM name |
| Respectful | Address users formally ("Здравствуйте" not "Привет" by default) — TM convention |
| No fake urgency | "1 hour ago" — not "🔥 HOT! Just listed!" |
| No emoji in system copy | Emojis can be user-generated (in chat); avoid them in UI labels and notifications |

## Things we don't do

- Onboarding tutorials with multiple slides (we ship without; if users struggle, we add tooltips)
- Achievement / gamification (no badges for "first listing!")
- Push notifications during quiet hours (24/7 push in MVP; Phase 2 might add quiet hours)
- Carousel autoplay
- Auto-playing videos in the feed (tap to play)
- Heavy parallax / scroll-jacking effects
- Splash screens with brand animations longer than 1 second

## References

- [71-design-tokens.md](71-design-tokens.md) — the token system that operationalizes this
- [73-typography.md](73-typography.md)
- [77-accessibility.md](77-accessibility.md)
