# Wireframe — Mobile Edit Listing (Wizard Edit Mode)

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/listings/[id]/edit.tsx`
> **Locked decision:** Owners can add, remove, and reorder photos after publishing. Current read-only mobile photos are an implementation gap, not the product contract. See [ADR-0024](../../../adr/0024-owner-post-publish-photo-editing.md).

==============================================
WIREFRAME — Edit Listing
Platform: mobile
==============================================

## Purpose

Reuse the 8-step wizard for editing an already-published listing while protecting post-publish identity fields.

## ASCII wireframe

```text
┌────────────────────────────────────────────┐
│ [<] Edit listing                    [•••]  │
│ Saved                                      │
│ [====================================]     │
├────────────────────────────────────────────┤
│                                            │
│ Vehicle                                   │
│                                            │
│ [ Toyota                         locked ]  │
│ [ Camry                          locked ]  │
│ [ XV70                           locked ]  │
│ [ 2018                           locked ]  │
│ This field cannot be changed after         │
│ publishing.                                │
│                                            │
│ Photos                                     │
│ […photo grid…]                             │
│                                            │
│ … (remaining steps same as create) …       │
│                                            │
├────────────────────────────────────────────┤
│ [Back]                       [Save changes]│
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Back icon** — Returns to previous step or to the listing detail if on Step 1.
2. **Title** — "Edit listing" instead of "Sell car".
3. **Overflow menu** — Opens `Sheet` with "Cancel edit"; edit mode does not create a draft to discard.
4. **Save status** — "Saved", "Saving…", or "Could not save — Retry".
5. **Progress** — Full progress bar with `Step N of 8`, matching create-mode orientation.
6. **Locked fields** — VIN, Brand, Model, Generation, Year are disabled with locked helper text. Visual: row opacity 0.4, "locked" badge or chevron replaced by lock icon.
7. **Editable fields** — Same step layouts as create: Photos, Specs, Price, Location, Description/Contact. Photos support add, remove, retry failed upload, and reorder; first photo remains cover.
8. **Review step** — Shows current published data; CTA is "Save changes" instead of "Publish".
9. **Footer** — Back + Save changes.

## Customization preview

- **Locked row** — custom composition: `PickerRow` or `Input` wrapped in a disabled state with a trailing `Lock` icon.

## Interactions

- Tap locked row → show tooltip/helper "This field cannot be changed after publishing."
- Tap editable row → same interaction as create mode, but changes update local edit state only.
- Edit photos → add from camera/library, remove, retry failed upload, or reorder in local edit state. New photo uploads may start during editing; reordering changes the pending cover photo.
- Tap Save changes → validates and PATCHes the published listing through `useEditListing`; edit mode does not create or autosave a `ListingDraft`.
- Until Save changes succeeds, buyers keep seeing the previous published listing, including its previous photos.
- Success → toast "Changes saved", route back to listing detail.
- Overflow → Sheet with "Cancel edit" (returns without saving, clears local edit staging, and best-effort cleans newly uploaded media that was never attached).

## States

- **Loading**: wizard shell shows `Skeleton` while existing listing data loads.
- **Locked-field tap**: tooltip/helper appears.
- **Save loading**: CTA shows spinner, disabled.
- **Save error**: keep wizard state; show retry banner.
- **Unsaved changes exit**: show "Discard changes?" confirmation before leaving edit mode; discard uses the same local staging cleanup as Cancel edit.

## Content / copy

- Title: "Edit listing"
- Locked helper: "This field cannot be changed after publishing."
- Save CTA: "Save changes"
- Success toast: "Changes saved"
- Discard dialog title: "Cancel edit?"
- Discard dialog body: "Any unsaved changes will be lost."

## Resolved decisions

- Edit mode PATCHes the published listing directly through `useEditListing`; it does not create a server draft.
- Edit mode does not autosave. Changes are private/local until the seller taps **Save changes**.
- Photo adds/removes/reorders follow the same rule: stage locally, upload new files during edit for responsiveness, then attach/remove/reorder listing media on **Save changes**.
- Abandoned uploaded-but-unattached edit photos are private storage orphans: cancel/discard cleans up best-effort, and server-side orphan cleanup handles leftovers.
- Edit mode shows `Step N of 8`, not a generic `Edit mode` label.

## Design archive mapping

- `screens/08-review.html` (`?mode=edit`) → edit-mode chrome.
- `screens/02-photos.html` (`?mode=edit`) → edit-mode photo step.
- `screens/03-vehicle.html` → locked fields pattern.
- `screens/09-discard.html` → discard confirmation.
