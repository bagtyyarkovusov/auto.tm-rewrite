# 20 — Information architecture

The map of every screen, route, and navigation surface. If you can't find where a feature lives in this document, it's either not designed yet or it doesn't belong.

## Mobile (Expo) — bottom tab nav

Five tabs. Center button is the visual "do something" CTA.

| Tab | Label (RU) | Label (TK) | Label (EN) | Default route |
|---|---|---|---|---|
| 1 | Поиск | Gözle | Search | Feed (personalized listings) |
| 2 | Избранное | Saýlanan | Favorites | Favorites + Saved Searches + Comparisons (Phase 3) |
| 3 | + | + | + | Sell entry point |
| 4 | Сообщения | Habarlar | Chat | Conversation list (with unread badge) |
| 5 | Сервисы | Hyzmatlar | Services | Profile + Garage + Settings + Blog + About |

### Mobile route map

```
/(tabs)/
  index                Feed
  favorites            Saved searches + favorites
  sell                 Sell entry — buttons: "Sell from Garage" / "New listing"
  chat                 Conversation list
  services             Profile menu

/(auth)/
  login                Phone entry
  login/otp            OTP code entry
  totp                 Admin TOTP (admin-flagged users)

/(public)/
  listings/[id]        Listing detail
  dealers/[slug]       Dealer showroom
  blog/[id]            Blog post

/sell/wizard           Listing wizard (steps 1-7)
/sell/wizard/[step]    Specific step deep link
/me                    My profile
/me/garage             My Garage
/me/garage/[id]        Garage vehicle detail
/me/listings           My listings
/me/saved-searches     My saved searches
/me/notifications      Notification preferences
/me/settings           App settings (theme, language)
/me/edit               Edit profile
/dealers/me            "My dealership" if user is a member

/chat/[conversationId] Chat thread
```

## Mobile navigation patterns

- **Stack navigation** inside each tab via expo-router
- **Modal sheets** for filter, login, action sheets (cancel-able from anywhere)
- **Deep linking** opens at the correct nested route (e.g., `/chat/abc-123` lands inside the chat tab stack)
- **Action-gated auth** — tapping any auth-required action triggers `/login` modal stack with intent state; returns to original screen after success

## Admin (Next.js) — at `admin.auto.tm`

Sidebar layout. Top-bar shows admin's name + current TOTP state + logout.

| Route | Purpose |
|---|---|
| `/login` | Phone OTP + TOTP entry |
| `/dashboard` | Overview: active counts, queues, gateway health |
| `/listings` | List + moderate listings (filter by status / region / brand) |
| `/listings/[id]` | View + actions on a listing |
| `/users` | List users, search, suspend |
| `/users/[id]` | User detail, listings owned, suspend action |
| `/dealers` | List dealerships + verify |
| `/dealers/[id]` | Dealership detail, members, verify/unverify |
| `/notifications` | Send notification + history view + stats |
| `/sms` | Phone fleet health, per-phone status, recent SMS log |
| `/catalog` | Brand / Model / Generation / Color / Region CRUD (trilingual editor) |
| `/audit` | Audit log search + filter + export |
| `/settings` | Admin profile + TOTP re-enroll |

Phase 2 additions:
| `/reports` | Inspection reports — pending, published, drafts |
| `/reports/new/[listingId]` | Create new inspection report |
| `/reports/[id]` | View / edit / publish a report |
| `/rubric` | Rubric template editor (versioned) |

## Public web (Next.js) — at `auto.tm`

Minimal — only what's needed for OG / SEO / share-link landing.

| Route | Purpose |
|---|---|
| `/[lang]` | Landing — hero, features, "Get the app" CTA, app store badges |
| `/[lang]/listings/[id]` | Listing detail (server-rendered with full OG) |
| `/[lang]/dealers/[slug]` | Dealer showroom (public) |
| `/[lang]/blog/[id]` | Blog post (read-only) |
| `/[lang]/legal/privacy` | Privacy policy |
| `/[lang]/legal/terms` | Terms of service |
| `/.well-known/apple-app-site-association` | iOS Universal Links manifest |
| `/.well-known/assetlinks.json` | Android App Links manifest |

`/<no-lang>/path` redirects to user's preferred locale (default `/ru`).

## Deep link manifest

URLs that open the mobile app via Universal Links / App Links:

| Path | What happens |
|---|---|
| `/listings/*` | Open listing detail in app |
| `/dealers/*` | Open dealer page in app |
| `/blog/*` | Open blog post in app |
| `/chat/*` | Open chat thread (auth-gated; redirect to login if not authed) |

URLs that always open in browser (never in app):

| Path | Why |
|---|---|
| `/admin/*` | Admin is web-only |
| `/legal/*` | Legal docs are web canonical |
| `/.well-known/*` | OS-only fetches |

## Notification deep-link targets

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
- Saved searches: "Save searches to get notified"
- My listings: "List your first car" + Sell CTA
- Garage: "Add a car to your garage" + benefits explainer
- Notifications feed: "All caught up"
