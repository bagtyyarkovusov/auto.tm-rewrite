# 32 — Listings

## Summary

The core economic object: car ads. Sellers create listings via a 7-step wizard, with photos, brand/model/generation specs, price, location. Buyers browse anonymously, favorite, chat, and (Phase 2) see the trust tier. Video media is future-facing and should not appear in the Sprint 4 mobile create wizard.

## Why it exists

A marketplace without listings is empty. This is the central feature; everything else (chat, search, notifications) revolves around it.

## What it does (user-visible behavior)

### Create wizard (7 steps for MVP)

1. **VIN entry** — optional manual text only in Sprint 4; no OCR, decoder, checking, or auto-fill promise in the mobile wizard. Skip button is prominent. Real VIN decode is Phase 2.
2. **Photo capture** — pick from library OR camera; min 1, max 20; freeform photo set with lightweight guidance only; client-side compress + reorder UI; first photo = cover and gets a Cover badge; drag-reorder changes cover; failed uploads expose Retry + Remove
3. **Brand → Model → Generation → Year** — input-like rows open searchable picker sheets; Brand first, Model disabled until Brand, Generation optional/skippable when no catalog data exists, Year required
4. **Condition** (`used` default / `new`) + **Mileage** (visible and required for used cars; optional/hidden for new cars) + optional completeness fields: **Color**, **Body type**, **Transmission**, **Drive type**, **Engine type**, **Engine power**. These completeness fields do not block publish in Sprint 4.
5. **Price + Currency** (TMT default / USD / AED) + **Seller terms**. Switching currency clears the amount instead of auto-converting; non-TMT shows approximate TMT using admin FX; missing non-TMT FX blocks publish with an inline helper. Optional terms: Exchange possible and Installment possible. No separate negotiable toggle in Sprint 4. Price is always the full asking price, never a down payment.
6. **Car location** — Region + City + optional area/landmark text ("Aşgabat, 30 mkr"). This is the physical location where the car can be inspected, not the seller's current GPS location.
7. **Description + Phone + Contact preferences** — description is required but has no minimum word count beyond non-empty, max 2000 chars. Store seller text exactly as written; no auto-translation or language selector in Sprint 4. Profile phone is prefilled as a per-listing editable override; calls/chat switches have at-least-one validation; chat can be enabled now with honest helper text that messaging launches later. No separate Preview route in Sprint 4; show a compact Review summary above Publish.

Navigation is linear Next/Back in Sprint 4. The compact Review summary can link back to completed steps for corrections; do not build arbitrary step-jump navigation. Drafts auto-save to the server while editing and force-save on step transition. Do not promise offline draft persistence in Sprint 4. Resume on next visit. If drafts exist, Sell opens a lightweight entry with latest draft as the primary Continue action and New listing as secondary; full draft management belongs in My Listings. Discard draft lives in the wizard header overflow menu and requires destructive confirmation.

### Listing location policy

Per [ADR-0022](../../adr/0022-city-first-listing-location.md), listing location means **car location**:

- The listing stores the city/region where the car is physically available for inspection.
- A user posting for a dealer, family member, or remote seller chooses the car's city, not their own current location.
- Phase 1 does not store exact listing GPS coordinates.
- `locationText` is optional area/landmark text, not a home-address field. UX copy should discourage exact private addresses ("Do not enter your home address. Add only the area where the car can be inspected.").
- Dealer showroom location may become more precise later because it is a business location. Inspection or meeting coordinates are private appointment data, not public listing data.

### Media upload + refresh behavior

- Selected photos are compressed into an app-owned local staging area before upload.
- Upload starts as early as possible and runs in the background relative to the wizard UI. The user can continue later steps while media uploads.
- Background upload is best-effort only. If the app is backgrounded, killed, or the network drops, uploads may pause/fail; on reopen/reconnect the app retries from the staged compressed file as a whole-file retry.
- Publish is blocked until at least one photo is attached successfully and there are no required pending or failed uploads.
- Phase 1 does not promise byte-level resumable/multipart uploads, full offline listing creation, or guaranteed OS-level background upload.
- Listing/feed screens use last-seen data while reconnecting, then refresh on app foreground/reconnect. This is not an offline browsing mode promise.
- Remote listing images are displayed through a native image cache (`expo-image` in mobile) using immutable media URLs. TanStack Query caches listing JSON, not image/video bytes.
- Listing video playback is deferred with the video media UX. We do not promise offline video playback or persistent video caching.

### View listing

- Photo gallery (swipe through; pinch zoom; tap to fullscreen)
- Video below photos only after the video media UX ships; Sprint 4 photo listings do not need a video player
- Title block: derived `Year + Brand + Model + Generation/trim when available`; no manual title field in Sprint 4. Price display follows the S4 TMT-display policy.
- Seller terms badges when true: Exchange possible, Installment possible. Feed/listing cards show small secondary badges under price; detail shows badges near price with helper text. These are informational; AutoTM does not finance, broker, match exchange vehicles, or verify payment terms in Sprint 4.
- Spec grid: mileage, transmission, drive, engine, color, body type, condition, year, VIN (masked if seller hides)
- Description block
- Seller block: avatar, name (or dealership name + PRO badge), tenure, city, response time stat
- CTA buttons: **Call** (green primary) + **Message** + ♥ Favorite + Share
- Related listings: "Похожие предложения" with 4-6 thumbnails

### Edit listing

- Same wizard, pre-filled
- Published edits PATCH the `Listing` directly. They do not create or autosave a `ListingDraft`; drafts are only for pre-publish listing creation.
- Edit changes stay local inside the edit screen until the seller taps **Save changes**. Buyers keep seeing the old published listing while the seller is editing, including the old photo set.
- Locked identity fields: VIN, brand, model, generation, and year cannot be changed; they define the identity of the car.
- Owners can update photo order, add photos, and remove photos after publishing. The first photo remains the cover. Photo edits are staged locally in edit mode and applied only on **Save changes**. New photo uploads may start during editing for responsiveness, but uploaded files are not public until attached on Save; abandoned unattached uploads are storage orphans for cleanup. This is locked by [ADR-0024](../../adr/0024-owner-post-publish-photo-editing.md).
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
| Wizard step 3 (vehicle identity) | Missing year | Continue disabled; year is required for marketplace-quality listings |
| Wizard step 4 (specs) | Used car missing mileage | Continue disabled; mileage is required for used-car listings |
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
- [ADR-0024](../../adr/0024-owner-post-publish-photo-editing.md) — Owners may edit photos after publishing

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
