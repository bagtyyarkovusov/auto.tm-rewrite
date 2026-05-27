# content — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). The Bortzhurnal (Бортжурнал) feature is a **post-MLP bet** per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md). Today, only a stub schema exists for `BlogPost`. Aspirational content lives in [`docs/prd/features/39-content-blogs.md`](../../../../../docs/prd/features/39-content-blogs.md) until a future sprint is shaped.

## Purpose

Bortzhurnal (Бортжурнал) — user blog posts about cars and ownership experience. Inspired by auto.ru's eponymous feature. Free-text content with optional media and optional vehicle tagging.

## Owns (entities + tables)

> Today: only a stub `BlogPost` table exists. None of the supporting entities (BlogMedia, BlogLike, BlogFollow, BlogTag, BlogPostTag) are in schema — they ship only when a post-MLP blog bet gets sprint-scoped.

- `BlogPost` — id, slug (unique), locale, title, body (text/Markdown), authorId (FK → User, Cascade), publishedAt?, deletedAt?, createdAt, updatedAt. Index on `(locale, publishedAt DESC)`.

## Invariants (enforced today)

- `BlogPost.slug` is globally unique.
- `BlogPost.authorId` references an existing User (FK; deletes cascade).
- Soft-delete via `BlogPost.deletedAt`.

## Module shape (today)

- `apps/api/src/modules/content/`:
  - `domain/`, `application/`, `infrastructure/`, `presentation/` — empty
  - `content.module.ts` — empty module

## Ports exposed

- (none today)

## Ports consumed

- (none today)

## Shipped use-cases

- (none today)

## Events emitted

- (none today)

## Events consumed

- (none today)

## Planned additions (post-MLP — not MLP beta scope)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the Bortzhurnal feature is post-MLP work. The MLP beta does NOT include blog functionality. The items below are placeholders for the future sprint that owns Content; the authoritative spec lives in [`docs/prd/features/39-content-blogs.md`](../../../../../docs/prd/features/39-content-blogs.md) and the eventual sprint file.

- **Supporting entities** (none in schema today):
  - `BlogMedia` — id, blogPostId, kind (`photo` / `video`), key, position
  - `BlogLike` — junction (userId, blogPostId, createdAt)
  - `BlogFollow` — junction (followerUserId, followedUserId, createdAt) — follow another user's blog
  - `BlogTag` — id, slug, nameRu, nameTk, nameEn (predefined categories: "Опыт владения", "Покупка", "Ремонт", "Тюнинг", …)
  - `BlogPostTag` — junction (blogPostId, blogTagId)

- **`BlogPost` schema additions** (not in schema today):
  - `visibility` enum (`public` | `followers_only` | `unlisted`)
  - `taggedVehicleId?` (FK → `OwnedVehicle` owned by the author)
  - `taggedBrandId?` + `taggedModelId?` (FK → Catalog entries)
  - `viewCount` (Int)
  - `likeCount` (Int)

- **Application invariants** (to be enforced when use-cases ship):
  - `taggedVehicleId` (if set) references an `OwnedVehicle` owned by the author
  - `taggedBrandId` / `taggedModelId` (if set) reference valid catalog entries
  - `visibility = 'unlisted'` hidden from feeds but accessible by direct URL
  - `BlogMedia` photos: max 30 per post; videos: max 1 per post, ≤60s
  - Body stored as Markdown, sanitized on render

- **Ports** (none today):
  - `ContentReadPort` (`getBlogPostSummary`, `getBlogPostsForUser`)
  - Consumed: `IdentityReadPort`, `CatalogReadPort`

- **Events** (none emitted/consumed today):
  - Emit: `BlogPostPublished`, `BlogPostLiked`, `BlogFollowAdded`
  - Consume: `OwnedVehicleDeleted` (nullifies `taggedVehicleId`). If Bortzhurnal ships later, user-suspension content handling must be shaped then; S7 suspension does not auto-archive blog posts.

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Content is its own context
- Content shares the media pipeline with listings (ADR-0008)
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
