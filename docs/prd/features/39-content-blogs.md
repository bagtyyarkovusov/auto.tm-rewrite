# 39 — Bortzhurnal (blogs)

## Summary

A user blog feature inspired by auto.ru's "Бортжурнал." Users post about their cars, ownership experience, repairs, road trips. Posts can be tagged with a Garage vehicle and/or a Brand/Model.

**MLP status:** deferred by [ADR-0027](../../adr/0027-mlp-beta-scope.md). Build only after marketplace activity exists and content/community pull is visible.

## Why it exists

Ata (the power buyer / enthusiast persona) writes blog posts about his cars and reads others'. Blogs:
- Add stickiness (users return for content even when not buying)
- Build community around brand/model pages
- Provide a low-cost ad surface (a popular blogger driving a Toyota Camry creates implicit endorsement)
- Surface trustworthy content that helps first-time buyers (Maral reading "what I learned owning a Lada")

## What it does (user-visible behavior)

### Create a blog post

1. Services tab → "Bortzhurnal" → "+ New post"
2. Form:
   - Title (max 200 chars)
   - Body (Markdown editor; preview tab)
   - Optional: 1-30 photos (compressed, max 5 MB each)
   - Optional: 1 video (≤60s, ≤10 MB)
   - Tag: vehicle from your Garage / brand / model (optional)
   - Category tag: Опыт владения / Покупка / Ремонт / Тюнинг / Путешествия / Другое
   - Visibility: Public / Followers only / Unlisted (URL only)
3. Save draft / Publish

### View blog post

- Title, author (avatar + name + tenure), publish date
- Body (Markdown rendered; images inline; videos play in-line)
- Tags clickable (open brand/model page)
- Like button + count
- Share button (URL + native share sheet)
- Comments section: **NOT in MVP** (rejected per Phase 1 cut list — DMs replace comments)

### Blog feed

- Services tab → Bortzhurnal → posts from people you follow + popular posts
- Tabs: "Follow" (people you follow) | "Discover" (popular)

### Following

- On any user's public profile: "Follow blog" button
- Followed users' new posts appear in your "Follow" tab
- Notifications: opt-in per BLOG_ACTIVITY category

### Public sharing

- Post URLs work on web: `auto.tm/<lang>/blog/<id>`
- OG meta: title, cover image, author, snippet

### Moderation placement

- Blog/content reports are post-MLP because blogs are post-MLP. Do not add `blog_post` report targets to S7 before content ships.
- When shaped, Content owns blog visibility/deletion policy and validates reportable blog targets; Admin owns queue display, resolution actions, and audit rows.
- Blog moderation should be shaped with content author privacy, Markdown rendering/sanitization, media handling, and editorial/admin workflow. It should not be treated as a copy-paste of listing reports.

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Blog feed | Empty (no follows) | "Follow people to see their posts" + suggestions |
| Blog feed | Has posts | Card list with cover + title + snippet + author |
| Create post | Default | Markdown editor; preview tab |
| Create post | Publishing | Disable submit; spinner |
| Post detail | Default | Full layout |
| Post detail | Author viewing own | Edit / Delete buttons |
| Post detail | Unlisted | Banner: "This post is unlisted. Only people with the link can see it." |

## Data references

- `apps/api/src/modules/content/CONTEXT.md`
- Entities: `BlogPost`, `BlogMedia`, `BlogLike`, `BlogFollow`, `BlogTag`

## Decisions

- [ADR-0001](../../adr/0001-architecture.md) — Content as its own bounded context
- No comments on blog posts in MVP (DMs replace them; reduces moderation load)

## Phase

**Post-MLP marketplace bet.**

## Out of scope

- Public comments / threading on posts (chat replaces)
- Blog/content reporting and moderation in S7; shape it with the content bet after blogs exist
- Polls inside posts (auto.ru has these — defer to Phase 2)
- Featured posts / editorial curation (Phase 2+)
- Public blog feed aggregation by hashtag (defer)
- Long-form Markdown features (footnotes, mermaid diagrams) — basic Markdown only

## Open questions

- Should we provide a default "first post" prompt for new users? ("Tell us about your car")
- Like notifications — fall under LISTING_ACTIVITY or BLOG_ACTIVITY? (Likely BLOG_ACTIVITY since it's about content)
- Auto.ru shows blog post counts on user profiles publicly — should we?
