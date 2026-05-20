# Wireframe — Mobile Edit Listing (Wizard Edit Mode)

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/listings/[id]/edit.tsx`

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
3. **Overflow menu** — Same as create mode: opens `Sheet` with "Discard draft" (if draft exists) or "Cancel edit".
4. **Save status** — "Saved", "Saving…", or "Could not save — Retry".
5. **Progress** — Full progress bar; edit mode may show "Edit mode" label instead of "Step N of 8".
6. **Locked fields** — VIN, Brand, Model, Generation, Year are disabled with locked helper text. Visual: row opacity 0.4, "locked" badge or chevron replaced by lock icon.
7. **Editable fields** — Same step layouts as create: Photos, Specs, Price, Location, Description/Contact.
8. **Review step** — Shows current published data; CTA is "Save changes" instead of "Publish".
9. **Footer** — Back + Save changes.

## Customization preview

- **Locked row** — custom composition: `PickerRow` or `Input` wrapped in a disabled state with a trailing `Lock` icon.

## Interactions

- Tap locked row → show tooltip/helper "This field cannot be changed after publishing."
- Tap editable row → same interaction as create mode.
- Tap Save changes → validates, forces autosave, calls `useUpdateDraft` or equivalent edit mutation.
- Success → toast "Changes saved", route back to listing detail.
- Overflow → Sheet with "Cancel edit" (returns without saving) or "Discard draft" (if a draft was created).

## States

- **Loading**: wizard shell shows `Skeleton` while existing listing data loads.
- **Locked-field tap**: tooltip/helper appears.
- **Save loading**: CTA shows spinner, disabled.
- **Save error**: keep wizard state; show retry banner.
- **Discard loading**: destructive CTA in dialog shows spinner.
- **Discard error**: keep dialog open; show "Could not discard draft. Try again."

## Content / copy

- Title: "Edit listing"
- Locked helper: "This field cannot be changed after publishing."
- Save CTA: "Save changes"
- Success toast: "Changes saved"
- Discard dialog title: "Cancel edit?"
- Discard dialog body: "Any unsaved changes will be lost."

## Open questions for /hifi-design

- Does edit mode create a server draft first, or PATCH the published listing directly? Current code uses `useEditListing` hook.
- Should the progress bar show step numbers or just "Edit mode" text?

## Design archive mapping

- `screens/08-review.html` (`?mode=edit`) → edit-mode chrome.
- `screens/02-photos.html` (`?mode=edit`) → edit-mode photo step.
- `screens/03-vehicle.html` → locked fields pattern.
- `screens/09-discard.html` → discard confirmation.
