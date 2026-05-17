# Sprint 10 — Polish + Blog + app-store readiness

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 (final) |
| **Milestone** | M8 — Soft launch |
| **Demo audience** | TM beta market |
| **Estimated time** | ~1 week |

## Goal

Cross the finish line of Phase 1:

1. **Public web** — landing page, listing detail (SEO + OG), dealer pages, blog (Bortzhurnal) read-only
2. **Blog (Bortzhurnal)** — full CRUD on the web/admin side; in-app feed entries for follows
3. **App-store readiness** — TestFlight + Play Console internal track; privacy + terms in 3 locales; account-delete endpoint verified
4. **Performance + accessibility polish pass** — image variant tuning, query plans, contrast checks, tap-targets

## User capability (the demo line)

> "I open auto.tm on a desktop browser. I see a real landing page. I find a listing via Google. I share it on Telegram — the OG preview is correct. The TestFlight build passes Apple review."

## Bounded contexts touched

- **Primary**: `content/` (Bortzhurnal)
- **Supporting**: all surfaces — but mostly polish, not new domain logic

## Acceptance criteria (DoD)

### Schema additions (Prisma migration — Bortzhurnal)

S10 broadens the `BlogPost` model and adds the supporting blog entities (see `apps/api/src/modules/content/CONTEXT.md` Planned section). Note: full Bortzhurnal was previously framed as Phase 2; S10 ships a "Phase 1.5" subset focused on read + basic author CRUD + follow:

- [ ] `BlogPost` adds: `visibility` enum (`public` | `followers_only` | `unlisted`), `taggedVehicleId?` (FK → OwnedVehicle), `taggedBrandId?` (FK → Brand), `taggedModelId?` (FK → Model), `viewCount @default(0)`, `likeCount @default(0)`.
- [ ] New `BlogMedia` entity: id, blogPostId (FK → BlogPost, Cascade), kind (`photo` | `video`), key (MinIO), position. Max 30 photos / 1 video per post (application-layer).
- [ ] New `BlogLike` junction: id, userId (FK → User, Cascade), blogPostId (FK → BlogPost, Cascade), createdAt. Unique on `(userId, blogPostId)`.
- [ ] New `BlogFollow` junction: id, followerUserId (FK → User, Cascade), followedUserId (FK → User, Cascade), createdAt. Unique on `(followerUserId, followedUserId)`. Application-layer: cannot follow yourself.
- [ ] **Deferred to Phase 2**: `BlogTag` + `BlogPostTag` (tag taxonomy with trilingual names) — S10 ships untagged blog posts; tag UI lands later.
- [ ] Prisma migration is reversible.

### Public web (`apps/web`)
- [ ] Landing page (`/{locale}`) — hero, search-as-CTA, top brands carousel, featured dealerships, blog teaser, footer with legal links
- [ ] Listing detail SSR with full OG meta (`og:title`, `og:image` from largest variant, `og:description` from listing description); structured data (`schema.org/Vehicle`)
- [ ] Dealer page (`/{locale}/d/{slug}`) polished
- [ ] Blog index (`/{locale}/blog`) + post detail (`/{locale}/blog/{slug}`) with read-only display
- [ ] Sitemap.xml + robots.txt generated; per-locale alternate links

### Bortzhurnal (Phase 1.5 scope)
- [ ] `POST /api/v1/blog-posts` (authenticated user)
- [ ] `GET /api/v1/blog-posts?authorId=&followingFeed=true` paginated
- [ ] `POST /api/v1/blog-posts/{id}` edit (author only); soft-delete supported
- [ ] Follow another user (`POST /api/v1/users/{id}/follow`) — populates blog feed
- [ ] Admin can moderate (`admin/` already supports this from S9)

### App-store readiness
- [ ] Privacy Policy (RU/TK/EN) — written, lawyer-checked, hosted at `/legal/privacy`
- [ ] Terms of Service (RU/TK/EN) — same
- [ ] In-app links to legal pages from Settings + onboarding
- [ ] `DELETE /api/v1/me` exposed in Settings (Apple requirement)
- [ ] EAS Build profiles: `development`, `preview` (internal TestFlight + Play internal), `production`
- [ ] iOS App Store metadata (screenshots, description, keywords) in 3 locales
- [ ] Android Play Console listing in 3 locales
- [ ] First TestFlight submission accepted; first Play internal track green

### Performance + a11y
- [ ] Image variant sizes verified vs. real-data distribution (charter §11 sizes); WebP enabled
- [ ] Top 10 query EXPLAIN plans reviewed; missing indexes added (charter §16 — explicit on every query path)
- [ ] Contrast pass — every text/background combination meets WCAG AA (4.5:1) for body, 3:1 for large text
- [ ] Tap targets ≥ 44×44 on mobile
- [ ] Lighthouse score on web landing: ≥ 90 perf / ≥ 95 a11y / ≥ 90 SEO
- [ ] `content/CONTEXT.md` updated
- [ ] `docs/prd/03-roadmap.md` updated (S10 🟢, Phase 1 complete; Phase 2 placeholder rows promoted to real sprint files)

## Tests required (TDD mandatory)

- **Domain**: `BlogPost`, `BlogFollow` invariants (can't follow yourself, only one follow per pair)
- **Application**: `CreateBlogPost`, `EditBlogPost`, `DeleteBlogPost`, `FollowUser`, `UnfollowUser`, `ListFollowingFeed`
- **Infrastructure** (Testcontainers): repositories; feed query performance
- **E2E**:
  - Playwright: web landing + listing detail SEO snapshot
  - Maestro: mobile happy paths (login → create listing → browse → chat → notification)
  - Manual: TestFlight submission walkthrough

## Files this sprint creates / touches

```
apps/api/src/modules/content/
├── domain/
│   ├── BlogPost.ts, BlogFollow.ts
│   └── ports/{BlogPostRepository,BlogFollowRepository}.ts
├── application/
│   ├── CreateBlogPost.ts, EditBlogPost.ts, DeleteBlogPost.ts
│   ├── ListBlogFeed.ts, ListAuthorBlog.ts
│   ├── FollowUser.ts, UnfollowUser.ts
├── infrastructure/
│   └── PrismaBlog*Repository.ts
├── presentation/
│   └── BlogPostsController.ts
└── content.module.ts

apps/web/src/app/[locale]/
├── page.tsx                              Real landing (replaces S8 placeholder)
├── blog/{page.tsx,[slug]/page.tsx}
├── legal/{privacy/page.tsx,terms/page.tsx}
└── sitemap.ts, robots.ts

apps/mobile/{app.config.ts,eas.json}      EAS Build profiles
apps/mobile/app/blog/{index.tsx,[slug].tsx}

docs/prd/ops/83-legal.md (already exists — fill content if not)
```

## References

- **PRD features**: [`../features/39-content-blogs.md`](../features/39-content-blogs.md)
- **End-to-end flows**: all (this sprint polishes them)
- **Charter sections**: §10 (i18n + URL locale), §11 (Media variants), §15 (Documentation systems)
- **Ops PRD**: [`../ops/80-deployment-runbook.md`](../ops/80-deployment-runbook.md), [`../ops/83-legal.md`](../ops/83-legal.md), [`../ops/84-launch-plan.md`](../ops/84-launch-plan.md)

## Previous-sprint dependencies

- All of S1-S9 — this sprint polishes everything that came before

## Open questions / risks

- **Privacy + Terms drafting**: requires a lawyer review in TM jurisdiction. Charter §19 item 7 flags this as a parallel action item. **Block S10 ship until done.**
- **Apple developer account**: charter §19 item 6 — $99/yr — must be in place before TestFlight upload. Same for Play Console ($25).
- **Domain registration**: `auto.tm` + subdomains must be active and reachable.
- **First-real-user load**: a soft launch can swing from 0 → 100 users overnight. Make sure S9's monitoring dashboard is being watched the first week.
- **Phase 2 prep**: at the end of S10, retro the launch and convert the Phase 2 placeholder rows in `03-roadmap.md` into real `sprints/sprint-11-...md` files.

## Definition of "Phase 1 complete"

After this sprint:
- [ ] M1-M8 all 🟢 in `03-roadmap.md`
- [ ] TestFlight build live; Play internal track live
- [ ] Public web reachable at `auto.tm`
- [ ] Admin team trained (one walk-through + runbook)
- [ ] Monitoring dashboards being watched
- [ ] First 10 real users onboarded
- [ ] Phase 1 retro filed in `docs/prd/ops/` (template TBD)
