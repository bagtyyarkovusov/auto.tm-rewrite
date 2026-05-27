# 63 — Share listing link (deep-link round trip)

## Summary

Aman wants to send Maral a listing he just saw on AutoTM via WhatsApp. The MLP beta scope is the public listing URL and OG preview. In-chat post-card sharing is deferred with rich chat per [ADR-0027](../../adr/0027-mlp-beta-scope.md).

## Goal

- The shared link "looks right" (rich preview with photo, title, price)
- Tapping the link opens the AutoTM app if installed (no browser detour)
- Fallback to web if the app isn't installed
- Works on iOS and Android equally

## Step-by-step

### Step 1 — Aman copies the link

- Inside the AutoTM mobile app, on a listing detail
- Tap Share → "Copy link" or "Send via…"
- Link format: `https://auto.tm/ru/listings/<id>`
- Note: locale prefix included (Aman's locale); if missing, the web app redirects to default locale

### Step 2 — Aman pastes into WhatsApp

- Standard paste; WhatsApp begins fetching OG meta from the URL

### Step 3 — WhatsApp fetches OG meta

- WhatsApp's link preview crawler hits `https://auto.tm/ru/listings/<id>`
- Next.js renders the page with full OG meta:
  - `og:title` = "Toyota Camry, 2019 — 189,000 TMT"
  - `og:image` = first photo of the listing, cropped to 1200×630
  - `og:description` = "47,000 km · Аşgabat · Used"
  - `og:url` = canonical
  - `twitter:card` = `summary_large_image`
- WhatsApp caches the preview

### Step 4 — Maral sees the message

- The chat in WhatsApp now shows:
  - Image preview (car photo)
  - Title (model + price)
  - Description
  - "auto.tm"

### Step 5 — Maral taps the preview

#### If AutoTM app is installed (iOS Universal Link / Android App Link)

- iOS: Apple checks the `/.well-known/apple-app-site-association` file on `auto.tm`
- The AASA file declares that paths matching `/{ru|tk|en}/listings/*` are associated with the AutoTM app
- iOS opens the app directly at the deep link
- App routes to `app://listings/<id>` via `expo-linking`
- Listing detail screen renders

- Android: same flow with `assetlinks.json` declaring the AutoTM app for those paths

#### If AutoTM app is NOT installed

- Default browser opens the URL
- `https://auto.tm/ru/listings/<id>` server-renders the listing detail
- Page shows full listing info + "Open in AutoTM app" + "Get the app" CTAs
- Tapping "Get the app" goes to App Store / Play Store with the listing URL preserved as a deferred deep link (Phase 2 — for now just goes to store)

### Step 6 — Maral is now on the listing in the app

- Same flow as Step 5 of [Flow 62](62-buy-flow.md): she can favorite, message, browse more

## Implementation requirements

### `auto.tm` web side (Next.js)

- `/.well-known/apple-app-site-association` served with `Content-Type: application/json`, no extension
- `/.well-known/assetlinks.json` served similarly
- Public listing detail route has `generateMetadata()` returning full OG tags
- Image used for OG must be 1200×630 (separate variant from listing media)

### Mobile app (Expo)

- `app.json` declares `associatedDomains: ["applinks:auto.tm"]` (iOS) + Android intent filters for `https://auto.tm/*`
- `expo-linking` configured to route paths to internal routes
- Custom URI scheme `autotm://` as a fallback for explicit deep links (rare)

### In-chat post-card sharing (post-MLP)

When rich chat is bet on later, Aman may send Maral a listing **inside the AutoTM chat** (not via WhatsApp):
- He's already in a conversation with Maral
- Tap the attachment icon → "Share listing"
- Picks a listing from his recent views / favorites / my listings
- Sends as a post_ref Message type
- Renders inline as a clickable card in the chat
- Tap → opens that listing inside the app

This is a separate (but related) flow — same UX outcome (Maral sees a clear listing card), different transport.

## Edge cases

- WhatsApp doesn't render the preview → URL still works; Maral sees the bare link
- App is installed but not signed in → opens app; if `/chat/*` link, redirect to login; for `/listings/*`, anonymous view works
- Shared link is to a deleted/banned listing → web page shows "This listing is no longer available"; mobile app shows same message
- Locale mismatch (link is `/ru/listings/x`, Maral's app is set to `tk`) → app respects URL locale OR overrides to user locale; design choice TBD (probably: respect URL locale for shared content, app locale for browsing)

## References

- [Feature 32 — Listings](../features/32-listings.md)
- [Feature 34 — Conversations](../features/34-conversations.md) — rich in-chat sharing deferred
- [Feature 38 — Showroom](../features/38-showroom.md) — same flow for dealer pages after showroom is bet on
- [ADR-0027 — MLP beta scope](../../adr/0027-mlp-beta-scope.md)
- `apps/web/CONTEXT.md` — OG meta generation

## Open questions

- Deferred deep links — show the right listing after install in Phase 2? (Yes; Branch.io alternative is needed since we're air-gapped; could roll our own with a query param + first-launch handler)
- Per-listing canonical URL — never change once set; even on archive
