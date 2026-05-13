# content — CONTEXT

## Purpose

Bortzhurnal (Бортжурнал) — user blog posts about cars and ownership experience. Inspired by auto.ru's eponymous feature. Free-text content with optional media and optional vehicle tagging.

## Owns (entities + tables)

- `BlogPost` — id, authorUserId, title, body (Markdown), visibility (`public` / `followers_only` / `unlisted`), taggedVehicleId? (links to author's `OwnedVehicle`), taggedBrandId?, taggedModelId?, viewCount, likeCount, createdAt, updatedAt, deletedAt?
- `BlogMedia` — id, blogPostId, kind (`photo` / `video`), key, position
- `BlogLike` — { userId, blogPostId, createdAt }
- `BlogFollow` — { followerUserId, followedUserId, createdAt } — follow another user's blog (foundation for blog feed)
- `BlogTag` — id, slug, name_ru, name_tk, name_en (predefined categories: "Опыт владения", "Покупка", "Ремонт", "Тюнинг", etc.)
- `BlogPostTag` — { blogPostId, blogTagId } junction

## Invariants

- A `BlogPost` always has an `authorUserId`
- `taggedVehicleId` (if set) must reference an `OwnedVehicle` owned by the author
- `taggedBrandId` / `taggedModelId` (if set) reference valid catalog entries
- `visibility = 'unlisted'` means hidden from feeds but accessible by direct URL
- `BlogMedia` photos: max 30 per post; videos: max 1 per post, ≤60s
- Body is stored as Markdown, sanitized on render

## Ports exposed

```ts
interface ContentReadPort {
  getBlogPostSummary(id): Promise<{ id, title, authorUserId, photoUrl?, createdAt } | null>
  getBlogPostsForUser(userId): Promise<BlogPostSummary[]>
}
```

## Ports consumed

```ts
IdentityReadPort     // resolve author summary
CatalogReadPort      // resolve tagged brand/model names
```

## Events emitted

- `BlogPostPublished` — consumed by `notifications/` for follower activity feed
- `BlogPostLiked`
- `BlogFollowAdded`

## Events consumed

- `UserSuspended` — archives all blog posts of suspended user
- `OwnedVehicleDeleted` — nullifies `taggedVehicleId` on affected posts

## Notable decisions

- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Content is its own context
- Content shares the media pipeline with listings (ADR-0008)
