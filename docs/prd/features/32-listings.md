# 32 — Listings

## Summary

The core economic object: car ads. Sellers create listings via a 7-step wizard, with photo + optional video, brand/model/generation specs, price, location. Buyers browse anonymously, favorite, chat, and (Phase 2) see the trust tier.

## Why it exists

A marketplace without listings is empty. This is the central feature; everything else (chat, search, notifications) revolves around it.

## What it does (user-visible behavior)

### Create wizard (7 steps for MVP)

1. **VIN entry** — optional; if filled, attempts auto-fill from VIN decoder (mocked in MVP, real in Phase 2). Skip button.
2. **Photo capture** — pick from library OR camera; min 1, max 20; client-side compress + reorder UI; first photo = cover
3. **Brand → Model → Generation → Year** — uses shared catalog picker component
4. **Mileage + Condition** (`new` / `used`) + **Color** + **Transmission** + **Drive type** + **Engine type** + **Engine power**
5. **Price + Currency** (TMT / USD / AED). Show "approximate price in user's display currency" using admin FX
6. **Car location** — Region + City + optional area/landmark text ("Aşgabat, 30 mkr"). This is the physical location where the car can be inspected, not the seller's current GPS location.
7. **Description + Phone + Contact preferences** (call / chat / both, hours of availability)

Drafts auto-saved on every step. Resume on next visit. Cancel discards (with confirm).

### Listing location policy

Per [ADR-0022](../../adr/0022-city-first-listing-location.md), listing location means **car location**:

- The listing stores the city/region where the car is physically available for inspection.
- A user posting for a dealer, family member, or remote seller chooses the car's city, not their own current location.
- Phase 1 does not store exact listing GPS coordinates.
- `locationText` is optional area/landmark text, not a home-address field. UX copy should discourage exact private addresses ("Do not enter your home address. Add only the area where the car can be inspected.").
- Dealer showroom location may become more precise later because it is a business location. Inspection or meeting coordinates are private appointment data, not public listing data.

### Media upload + refresh behavior

- Selected photos/videos are compressed into an app-owned local staging area before upload.
- Upload starts as early as possible and runs in the background relative to the wizard UI. The user can continue later steps while media uploads.
- Background upload is best-effort only. If the app is backgrounded, killed, or the network drops, uploads may pause/fail; on reopen/reconnect the app retries from the staged compressed file as a whole-file retry.
- Publish is blocked until required media is either attached successfully or removed from the draft.
- Phase 1 does not promise byte-level resumable/multipart uploads, full offline listing creation, or guaranteed OS-level background upload.
- Listing/feed screens use last-seen data while reconnecting, then refresh on app foreground/reconnect. This is not an offline browsing mode promise.
- Remote listing images are displayed through a native image cache (`expo-image` in mobile) using immutable media URLs. TanStack Query caches listing JSON, not image/video bytes.
- Listing videos are streamed in Phase 1. We do not promise offline video playback or persistent video caching.

### View listing

- Photo gallery (swipe through; pinch zoom; tap to fullscreen)
- Video below photos if present (HLS adaptive playback, poster frame first)
- Title block: Brand Model, Year — Price (in user's currency; original price shown if different)
- Spec grid: mileage, transmission, drive, engine, color, body type, condition, year, VIN (masked if seller hides)
- Description block
- Seller block: avatar, name (or dealership name + PRO badge), tenure, city, response time stat
- CTA buttons: **Call** (green primary) + **Message** + ♥ Favorite + Share
- Related listings: "Похожие предложения" with 4-6 thumbnails

### Edit listing

- Same wizard, pre-filled
- Some fields locked (VIN, year cannot be changed; would invalidate identity of the car)
- Update photo order, add/remove photos
- Change price (price-change history kept for analytics)

### Mark sold

- Button in My Listings: "Mark as sold"
- Confirm modal: "This car is sold. Is the buyer from AutoTM?" (yes / no — analytics signal)
- Listing transitions to `sold` state, shows "Sold" badge for 14 days, then auto-archived
- Garage entry (if linked) auto-updates to `status=sold`

### Listing states

| State | Visible to | Action available |
|---|---|---|
| `draft` | Owner only | Continue / discard |
| `active` | Public | Favorite, chat, share, owner-edit |
| `sold` | Public (badged) | View only (chat closed) |
| `archived` | Owner + admin | Owner can republish |
| `reported` | Admin only | Admin review queue |
| `banned` | Owner sees ban notice + reason; not in feed | None |

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Wizard step 1 (VIN) | Empty | Optional, skip button prominent |
| Wizard step 2 (photos) | <1 photo | Submit disabled; helper text |
| Wizard | Upload failed | Retry button per failed photo |
| Wizard | Network slow | Show progress + "Slow connection" badge |
| Listing detail | Anonymous | All buttons present; tap → login modal |
| Listing detail | Owner viewing own | "Edit" / "Mark sold" / "Delete" instead of action buttons |
| Listing detail | Sold | Badge prominent; chat button replaced with "Sold" pill |
| Listing detail | Banned | Owner sees: "This listing was removed. Reason: …" |
| Listing detail | Reported (admin view) | All actions + moderation toolbar |
| My listings | Empty | "List your first car" CTA |
| My listings | Has drafts | "Continue draft" pinned at top |

## Data references

- `apps/api/src/modules/listings/CONTEXT.md`
- `apps/api/src/modules/catalog/CONTEXT.md` (referenced by ID)
- Entities: `Listing`, `ListingMedia`, `Favorite`, `ListingDraft`

## Decisions

- [ADR-0001](../../adr/0001-architecture.md) — Listings as bounded context
- [ADR-0008](../../adr/0008-media.md) — Photo + video pipeline
- [ADR-0007](../../adr/0007-i18n.md) — Single-locale content
- [ADR-0022](../../adr/0022-city-first-listing-location.md) — City-first listing location; no exact listing GPS in Phase 1

## Phase

**Phase 1.**

## Out of scope

- Listing auto-renewal / bumping (Phase 1.5 if needed)
- Featured / promoted listings (paid placement) — explicitly against vision
- Listing expiry (never automatic in MVP; sellers mark sold/archived themselves)
- Exact listing GPS coordinates, first-open GPS prompt, and map/radius search in Phase 1
- Map view in feed (Phase 2+ only if city-first search proves insufficient)
- Compare 2 listings side-by-side (Phase 3)

## Open questions

- Auto-archive policy for `active` listings older than X months — yes or no?
- Should the seller be able to hide their phone number until the buyer messages? (Auto.ru does this — "защищён" badge)
- Photo watermarking — Phase 2 once we have AutoTM-staffed media

### Trust + moderation signals (surfaced during pre-S4 grill 2026-05-18)

These are future product capabilities — most map to Phase 2 trust-layer work alongside inspection reports. Captured here so the foundation laid in S4 (audit log, port abstractions, `pending_review` enum value) supports them cleanly when their sprints arrive.

- **Flipper / re-seller detection** — Auto.ru exposes "active listings count" + "listings history" + "average time-to-sell" on the seller profile page so buyers can self-detect flippers. AutoTM equivalent should ship in Phase 2 when seller profile pages exist (likely S9 admin + S15 trust polish). No explicit "flipper" label — let data speak.
- **"First owner" claim** — Seller self-declares «первый хозяин» equivalent in the wizard; admin verifies post-hoc via registration documents or trust signals. Buyer-side filter in S5 if added. Implementation: `Listing.isFirstOwner: Boolean @default(false)` + admin verification flag.
- **Phone-number-reuse detection** — "5 other listings from this phone number" surfaced on listing detail (Auto.ru pattern). Phase 2 candidate; uses `Listing.contactPhone ?? seller.phoneE164` as the key. Strong flipper signal.
- **Edit-triggered re-review** — Auto.ru flags edits that change >50% of photos, drop price >30% in 24h, or rewrite >50% of description. AutoTM equivalent should land in Phase 2 alongside trust tiers. S4's AuditLog scope captures price changes + state transitions; Phase 2 needs to add audit entries for media operations + description edits to enable detection.
- **Inspected-listing edit policy** — When trust tier exists (Phase 2 inspection reports), structural edits (specs, condition, photos) should invalidate the tier until re-inspection; metadata edits (price, description) should not. Decide policy when S11-S15 plan.
- **Inappropriate / non-car photo screening** — Phase 1 auto-publishes everything; reactive moderation only via S9. Phase 2 should add self-hosted ML screening: NudeNet for NSFW, YOLO or CLIP for car-detection, pHash for stolen-photo detection (all offline-compatible per air-gap constraint). Implementation: `MediaContentClassifierPort` ships in S4 with `NullContentClassifier` adapter; Phase 2 swaps in `MlContentClassifier`. Failed classifications transition listing to `pending_review` status (enum value already in schema).
- **Stolen photo detection** — Auto.ru fingerprints photos via perceptual hashing (pHash) to catch reuse across listings. Self-hostable. Phase 2 candidate; companion to NSFW classifier.
- **Reporting flow** — "Report this listing" button on listing detail page + `POST /listings/:id/report` endpoint + admin queue + `ListingReported` event. Ships in S9 alongside `reported`/`banned` status activation.
