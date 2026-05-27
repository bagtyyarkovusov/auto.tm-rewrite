# 37 — My Garage

## Summary

A user's personal vehicles — cars they own or want — separate from listings (which are for sale). Sourced from auto.ru's "Гараж" feature. Builds profile depth, enables sell-from-Garage shortcut, and seeds dream-car SavedSearches.

**MLP status:** deferred by [ADR-0027](../../adr/0027-mlp-beta-scope.md). Build when repeat sellers need a faster listing path or profile trust becomes a bottleneck.

## Why it exists

Empty profiles look like bots. A profile that shows "I drive a Lada Granta and dream of an Audi" demonstrates the user is a real human + a car enthusiast, which lifts seller credibility and surfaces blog content. Plus, when Aman wants to sell his Lada, having it in Garage already means his listing creation takes 3 steps instead of 7.

## What it does (user-visible behavior)

### Add a Garage entry

1. Profile → My Garage → "+ Add car"
2. Status toggle: "I own this" or "I want this (dream)"
3. Brand → Model → Generation → Year (shared catalog picker)
4. Optional: photo (single), nickname ("Daily", "Project", "Мечта"), VIN, mileage
5. Public toggle (default ON — shown on public profile)
6. Save → entry in My Garage

### My Garage screen

- Counter at top: "3 cars"
- Grid of cards: photo, brand+model, year, status badge (Owned / Dream / Sold)
- "+ Add car" floating button
- Tap card → Garage Detail

### Garage detail

- Photo, full spec, nickname, mileage
- Status: Owned / Dream / Sold
- Actions:
  - **Sell this car** (status=owned) → opens listing wizard pre-filled with the vehicle specs
  - **Notify me when one is listed** (status=dream) → creates a SavedSearch
  - Edit
  - Delete (confirm)

### Public profile display

- Visit `/users/<id>` → see their public Garage entries (those with `isPublic=true`)
- Garage cars displayed as a row of small cards under user header
- Helps establish that user is a real car person, not a flipper

### Sell-from-Garage shortcut

When user taps "Sell" tab:
- If they have Garage cars with `status=owned`: show "Sell from Garage" option above the "New listing" button
- Tap one → listing wizard opens with steps 3-4 (vehicle spec) pre-filled; user proceeds from photos onward
- After listing is published: garage entry stores `linkedListingId`
- When listing is marked sold: garage entry auto-updates to `status=sold`

### Notify-when-listed shortcut

From a Dream Garage entry:
- "Notify me when one is listed" button
- Creates SavedSearch with `{brandId, modelId, generationId, yearRange}` from the dream entry
- One-click setup; user can refine filters later via the SavedSearch screen

## Screens / states

| Screen | State | Notes |
|---|---|---|
| My Garage | Empty | "Add a car to your garage" + benefits explainer (3 bullets) |
| My Garage | Has entries | Grid of cards |
| Garage detail | Owned | "Sell this car" CTA prominent |
| Garage detail | Dream | "Notify me when one is listed" CTA |
| Garage detail | Sold | Sold badge; link to closed listing |
| Add car | Default | Status toggle at top; rest is shared catalog picker |
| Public profile | Has public garage | Garage row below header |
| Public profile | All private | Garage section hidden entirely (no "0 cars" empty state) |

## Data references

- `apps/api/src/modules/identity/CONTEXT.md` — OwnedVehicle lives under identity
- Catalog ports for brand/model/generation resolution

## Decisions

- Garage lives **inside the identity bounded context**, not a separate context (it's user profile data)
- Public-by-default to maximize the trust signal (with per-entry toggle)

## Phase

**Post-MLP marketplace bet.**

## Out of scope (deferred to v2+)

- Service / maintenance records ("Oil change at 50k km")
- Fuel logs
- Insurance / valuation widgets
- Recalls / model news subscription
- Multi-photo per garage car (1 in MVP)
- Vehicle history report attached to a garage entry

## Open questions

- Sold history visibility — show on public profile or hide? (Likely show as "trophy case")
- Should garage cars also appear in catalog model pages? ("47 AutoTM users drive this model")
