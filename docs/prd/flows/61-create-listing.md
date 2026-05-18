# 61 — Create listing flow

## Summary

Aman wants to sell his Lada. From "Sell" button tap to publish, ≤ 5 minutes (with photos).

## Goal

- Minimize fields shown at once
- Save draft automatically — never lose work
- Defer blocking on photo upload — start staging/upload early, but let user fill specs while media finishes
- Successful first listing should feel rewarding

## Step-by-step

### Step 0 — Entry

Three ways to start:

1. Tap "+" (center) tab → Sell entry
   - If user has Garage cars with `status=owned`: show "Sell from Garage" prominently
   - Else: just "Create new listing"
2. Garage entry detail → "Sell this car" button
3. Edit an existing listing (skips most steps)

### Step 1 — VIN entry

- "Введите VIN или номер кузова" (Enter VIN or chassis number)
- Camera icon to OCR from registration document (Phase 2)
- Skip button prominent — VIN is optional
- If filled: API attempts VIN decode (mocked in MVP via TM Proxy PC, real in Phase 2)
- On success: pre-fills brand/model/year for step 3
- On failure: silently skip, user fills manually

### Step 2 — Photos

- "Add photos" with two buttons: Camera / Library
- Multi-select from library; compression + upload staging starts immediately
- During upload: thumbnail with progress overlay
- Drag to reorder; first photo is cover
- Min 1, max 20
- Helper text: "Photos under 5 MB upload faster"
- "Continue" disabled until ≥1 photo

### Step 3 — Brand / Model / Generation / Year

- Brand picker (shared catalog picker, see Feature 31)
- Model picker (scoped to selected brand)
- Generation picker (optional — shows year range)
- Year picker (defaults to current year - 2)
- "Continue"

### Step 4 — Vehicle specs

- Mileage
- Condition (New / Used)
- Color (swatches)
- Transmission
- Drive type
- Engine type
- Engine power (optional)
- Body type
- "Continue"

### Step 5 — Price & currency

- Price input
- Currency selector: TMT (default) / USD / AED
- Helper: "About 1,990,000 TMT" if a non-TMT currency selected (using admin FX)
- "Continue"

### Step 6 — Location

- Header: "Car location"
- Region picker
- City picker (scoped to region)
- Free-text area/landmark (optional, e.g., "30 mkr near Lukoil")
- Helper text: "Choose where the car can be inspected. Do not enter your home address."
- "Continue"

The location is the car's location, not the user's current GPS location. A user posting for a dealer, family member, or remote seller chooses where the car is physically available.

### Step 7 — Description & contact

- Description textarea (max 2000 chars)
- Phone (defaults to user's account phone; can hide for "messaging only")
- Contact preferences:
  - Allow calls (default ON)
  - Allow chat (default ON)
  - Availability hours (always / specific hours)
- Preview button → shows what the listing will look like
- "Publish" button

### Publish

- Loading state with spinner
- On success:
  - Confetti micro-animation (optional)
  - Toast: "Listing published"
  - Land on the new listing's detail page
  - "Share to WhatsApp" CTA
- If draft: just "Saved as draft, continue later"

## Draft behavior

- Auto-save on every step transition
- "Discard draft" only after explicit cancel + confirm
- Draft list visible in "My Listings"
- Resume picks up at the last completed step
- Staged media is stored locally with the draft until it is uploaded/attached, removed, published, or the draft is discarded.
- Media uploads run in the background relative to the wizard UI; the user can continue filling later steps while photos upload.
- Publish is blocked until required media is either attached successfully or removed from the draft.

## Edge cases

- Photo upload fails on slow data → retry per failed photo (don't restart wizard)
- User loses connection mid-wizard → state preserved locally; sync on reconnect
- App backgrounds/kills mid-upload → draft and staged compressed files remain; upload retries when the app is reopened and online
- Upload retry is whole-file retry from the staged compressed file; Phase 1 does not promise multipart byte-level resume
- VIN decoder times out → silent fallback to manual entry
- Publish fails (server error) → keep wizard state, show retry

## References

- [Feature 32 — Listings](../features/32-listings.md)
- [Feature 31 — Catalog](../features/31-catalog.md)
- [Feature 37 — Garage](../features/37-garage.md) — Sell-from-Garage shortcut
- [ADR-0008 — Media](../../adr/0008-media.md)
- [ADR-0022 — City-first listing location](../../adr/0022-city-first-listing-location.md)

## Open questions

- "Sell from Garage" wizard skips steps 1-4 — confirm vehicle data is right or let user edit? (Likely: show pre-filled, allow edit per field)
- Photo capture order — fixed angles (front/side/rear/interior) like auto.ru does, or freeform? (Likely freeform with optional guide tips; angle detection is Phase 2)
- Auto-translate description if user prefers TK but writes in RU? (No — single-locale content per ADR-0007)
