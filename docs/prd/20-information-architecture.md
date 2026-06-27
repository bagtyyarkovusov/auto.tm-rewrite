# 20 — Information architecture

The map of every screen, route, and navigation surface. If you can't find where a feature lives in this document, it's either not designed yet or it doesn't belong.

## Mobile (Expo) — bottom tab nav

Five tabs. Center button is the visual "do something" CTA.

| Tab | Label (RU) | Label (TK) | Label (EN) | Default route |
|---|---|---|---|---|
| 1 | Поиск | Gözle | Search | Feed (latest listings + MLP filters) |
| 2 | Избранное | Saýlanan | Favorites | Favorites list (saved listings; S8a) |
| 3 | + | + | + | Sell entry point |
| 4 | Сообщения | Habarlar | Messages | Simple contact threads |
| 5 | Кабинет | Kabinet | Cabinet | Cabinet/Profile + Settings + About |

### Mobile route map

```
/(tabs)/
  index                Feed
  favorites            Favorites list (saved listings; saved searches post-MLP)
  sell                 Sell entry — New listing
  chat                 Simple contact thread list
  services             Cabinet/Profile surface

/(auth)/
  phone                Phone entry
  otp                  OTP code entry
  totp                 Admin TOTP (required if admin UI exposed)

/(public)/
  listings/[id]        Listing detail
  dealers/[slug]       Post-MLP dealer showroom
  blog/[id]            Post-MLP blog post

/sell/wizard           Listing wizard (steps 1-7)
/sell/wizard/[step]    Specific step deep link
/me                    My profile
/me/garage             Post-MLP My Garage
/me/garage/[id]        Post-MLP Garage vehicle detail
/me/listings           My listings
/me/saved-searches     Post-MLP my saved searches
/me/notifications      Post-MLP notification preferences
/me/settings           App settings (theme, language)
/me/edit               Edit profile
/dealers/me            Post-MLP "My dealership" if user is a member

/chat/[conversationId] Simple text contact thread
```

### Tab 1 — category browse surface (multi-vertical seam)

Tab 1 is structured as a self-contained **category browse surface** (today: cars), not a hardcoded "home." Per [ADR-0035](../adr/0035-multi-vertical-platform-direction.md) and [ADR-0036](../adr/0036-multi-vertical-seam-resolutions-mlp.md), when a second vertical lands a home-hub can slot in front of it with no rebuild, and the browse body lives in a reusable `CategoryBrowse`-style surface reached through a **dedicated filter funnel — not feed chips**. In MLP the single cars category renders as the default surface; the hub appears with the second vertical. The browse-body extraction is owned by issue #200 (blocked pending S8a), not built ahead of it.

## Mobile navigation patterns

- **Stack navigation** inside each tab via expo-router
- **Modal sheets** for filter, login, action sheets (cancel-able from anywhere)
- **Deep linking** opens at the correct nested route (e.g., `/chat/abc-123` lands inside the chat tab stack)
- **Action-gated auth** — tapping any auth-required action triggers the `(auth)/phone` modal stack with intent state; returns to original screen after success

## Admin (Next.js) — at `admin.auto.tm`

Sidebar layout. Top-bar shows admin's name + current TOTP state + logout.

| Route | Purpose |
|---|---|
| `/login` | Phone OTP + TOTP entry |
| `/reports` | MLP report queue |
| `/reports/[id]` | MLP report detail + actions |
| `/listings/[id]` | MLP listing moderation actions |
| `/users/[id]` | MLP user suspension action |
| `/audit` | MLP audit log |
| `/dashboard` | Post-MLP overview: active counts, queues, gateway health |
| `/listings` | Post-MLP listing table with filters |
| `/users` | Post-MLP user search/list |
| `/dealers` | Post-MLP dealership verification |
| `/dealers/[id]` | Post-MLP dealership detail |
| `/notifications` | Post-MLP notification broadcast |
| `/sms` | Post-MLP phone fleet health UI |
| `/catalog` | Post-MLP catalog CRUD UI unless beta-critical |
| `/settings` | Post-MLP admin profile + TOTP re-enroll |

Phase 2 additions:
| `/reports` | Inspection reports — pending, published, drafts |
| `/reports/new/[listingId]` | Create new inspection report |
| `/reports/[id]` | View / edit / publish a report |
| `/rubric` | Rubric template editor (versioned) |

## Public web (Next.js) — at `auto.tm`

Minimal — only what's needed for OG / SEO / share-link landing.

| Route | Purpose |
|---|---|
| `/[lang]` | MLP landing — simple browse/contact CTA |
| `/[lang]/listings/[id]` | Listing detail (server-rendered with full OG) |
| `/[lang]/dealers/[slug]` | Post-MLP dealer showroom (public) |
| `/[lang]/blog/[id]` | Post-MLP blog post (read-only) |
| `/[lang]/legal/privacy` | Privacy policy |
| `/[lang]/legal/terms` | Terms of service |
| `/.well-known/apple-app-site-association` | Post-MLP or beta-required iOS Universal Links manifest |
| `/.well-known/assetlinks.json` | Post-MLP or beta-required Android App Links manifest |

`/<no-lang>/path` redirects to user's preferred locale (default `/ru`).

## Deep link manifest

URLs that open the mobile app via Universal Links / App Links:

| Path | What happens |
|---|---|
| `/listings/*` | Open listing detail in app |
| `/dealers/*` | Post-MLP dealer page in app |
| `/blog/*` | Post-MLP blog post in app |
| `/chat/*` | Open contact thread (auth-gated; redirect to login if not authed) |

URLs that always open in browser (never in app):

| Path | Why |
|---|---|
| `/admin/*` | Admin is web-only |
| `/legal/*` | Legal docs are web canonical |
| `/.well-known/*` | OS-only fetches |

## Notification deep-link targets (post-MLP)

When a push notification is tapped, the app routes to:

| Notification category | Deep link target |
|---|---|
| Direct message | `/chat/<conversationId>` |
| Saved-search match | `/listings/<listingId>` (or `/me/saved-searches` if multi-match digest) |
| Listing activity | `/me/listings/<listingId>` |
| Admin announcement | In-app modal showing the announcement; deep link optional |
| Blog activity | `/blog/<postId>` |
| Marketing | Custom; usually a landing or a specific listing |

## Empty states map

Each major surface has an explicit empty state — see [`ui/75-illustration-style.md`](ui/75-illustration-style.md):

- Feed (anonymous, no recent views): "Find your next car"
- Feed (authed, no preferences): "Personalize your feed" + filter CTA
- Favorites: "Tap ♥ on listings you like"
- Conversations: "Start by messaging a seller"
- Saved searches: "Save searches to get notified" (post-MLP)
- My listings: "List your first car" + Sell CTA
- Garage: "Add a car to your garage" + benefits explainer (post-MLP)
- Notifications feed: "All caught up" (post-MLP)
