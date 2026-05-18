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

Sprint 4 starts from the Sell tab only:

1. Tap "+" (center) tab → Sell entry
   - If drafts exist: show latest draft as primary Continue action plus New listing
   - If no drafts exist: create/open the 7-step wizard directly
2. Edit an existing listing uses the same wizard state with post-publish identity fields disabled

Sell-from-Garage entry and Garage prefill are deferred to S6.

### Step 1 — VIN entry

- "Введите VIN или номер кузова" (Enter VIN or chassis number)
- Skip button prominent — VIN is optional
- Manual text entry only in Sprint 4. No OCR button, VIN checking, decode call, or auto-fill promise in the mobile wizard.
- Real VIN decode/OCR is Phase 2.

### Step 2 — Photos

- "Add photos" with two buttons: Camera / Library
- Multi-select from library; compression + upload staging starts immediately
- During upload: thumbnail with progress overlay
- Drag to reorder; first photo is cover and shows a Cover badge. No separate Set cover action in Sprint 4.
- Min 1, max 20
- Helper text: "Photos under 5 MB upload faster"
- "Continue" disabled until ≥1 photo

### Step 3 — Brand / Model / Generation / Year

- Brand trigger row opens searchable picker sheet (shared catalog picker, see Feature 31)
- Model trigger row is disabled until Brand; sheet is scoped to selected brand
- Generation trigger row is optional; disabled until Model; empty state says no generations exist for this model yet
- Year input/picker is required; no generated default
- "Continue"

### Step 4 — Vehicle specs

- Condition segmented control defaults to Used
- Mileage visible and required when Used; optional/hidden when New
- Optional completeness fields, not publish-blocking in Sprint 4:
  - Color (swatches)
  - Body type
  - Transmission
  - Drive type
  - Engine type
  - Engine power
- "Continue"

### Step 5 — Price & currency

- Price input
- Currency selector: TMT (default) / USD / AED
- Changing currency clears the entered amount and focuses the price input; the wizard does not auto-convert seller-entered prices.
- Helper: "About 1,990,000 TMT" if a non-TMT currency selected (using admin FX)
- If the required non-TMT exchange rate is unavailable, Publish is blocked and the helper says "Exchange rate unavailable. Try TMT or contact support."
- Seller terms switches, both optional and default OFF:
  - Exchange possible
  - Installment possible
- No separate negotiable toggle in Sprint 4; sellers can mention negotiation in Description.
- Helper: "Enter the full asking price. AutoTM does not finance or verify seller payment terms."
- "Continue"

### Step 6 — Location

- Header: "Car location"
- Region picker
- City picker (scoped to region)
- Free-text area/landmark (optional, e.g., "30 mkr near Lukoil")
- Helper text: "Choose where the car can be inspected. Do not enter your home address."
- No current-location button, GPS prompt, map pin, or exact address field.
- "Continue"

The location is the car's location, not the user's current GPS location. A user posting for a dealer, family member, or remote seller chooses where the car is physically available.

### Step 7 — Description & contact

- Description textarea (required; max 2000 chars; no minimum beyond non-empty)
- Store seller text exactly as written; no auto-translation or language selector in Sprint 4.
- Phone defaults to the user's account phone and can be edited as a per-listing override
- Contact preferences:
  - Allow calls (default ON)
  - Allow chat (default ON) with helper that messaging launches later
  - At least one of calls/chat must remain enabled
- Compact Review summary above Publish: photo count, vehicle identity, price, city, contact method
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

- Wizard navigation is linear Next/Back in Sprint 4. The Review summary may link back to completed steps for corrections; no arbitrary step-jump navigation.
- Auto-save on every step transition
- "Discard draft" lives in the wizard header overflow menu and only runs after destructive AlertDialog confirmation
- Sell tab shows latest draft only plus New listing when drafts exist; full draft list is visible in "My Listings"
- Resume picks up at the last completed step
- Staged media is stored locally with the draft until it is uploaded/attached, removed, published, or the draft is discarded.
- Media uploads run in the background relative to the wizard UI; the user can continue filling later steps while photos upload.
- Publish is blocked until at least one photo is attached successfully and all pending/failed required uploads are resolved.

## Edge cases

- Photo upload fails on slow data → retry per failed photo (don't restart wizard)
- User loses connection mid-wizard → server autosave may fail; keep the user on the current step and show Retry. Sprint 4 does not promise offline draft persistence.
- App backgrounds/kills mid-upload → draft and staged compressed files remain; upload retries when the app is reopened and online
- Upload retry is whole-file retry from the staged compressed file; Phase 1 does not promise multipart byte-level resume
- VIN decode is not called from the Sprint 4 mobile wizard
- Publish fails (server error) → keep wizard state, show retry

## References

- [Feature 32 — Listings](../features/32-listings.md)
- [Feature 31 — Catalog](../features/31-catalog.md)
- [ADR-0008 — Media](../../adr/0008-media.md)
- [ADR-0022 — City-first listing location](../../adr/0022-city-first-listing-location.md)

## Open questions

None for Sprint 4 create-listing wireframe. Sell-from-Garage, fixed-angle guidance enforcement, VIN OCR/decode, and translation assistance are deferred outside #93.
