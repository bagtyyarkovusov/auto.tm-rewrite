# Auto.ru and Kolesa reference screens, index

> Noncanonical research, written 2026-09-21 for [Inventory and label the Auto.ru and Kolesa screen archives](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/343). It indexes the founder's local captures so a design agent can find the right image by ID instead of guessing from numbered filenames. It does not set release scope. [ADR-0051](../../../adr/0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md) and the founder-approved AutoTM screen map do that. This work did not edit the separate Kolesa browse note, `kolesa-browse-2026-09-21.md`, which is not yet committed.

## Files

| File | What it holds |
|---|---|
| This file | Sources, ID scheme, counts, journey map, gaps, next batches |
| [Annotations](reference-screens-2026-09-21-annotations.md) | One row per inspected release-relevant capture: screen name, state, controls, transition, text, adopt/avoid |
| [Inventory table](reference-screens-2026-09-21-inventory.md) | Every file in both archives with ID, category, relevance, duplicate marker |
| [Inventory CSV](reference-screens-2026-09-21-inventory.csv) | Same rows as the table, plus a SHA-256 prefix, for scripts |

## Sources and provenance

| Source | Local archive | Files | Public reference |
|---|---|---|---|
| Auto.ru iOS app | `auto.ru-screens/` | 599 JPG, 3 MP4, 51 flow folders | [Screen Gallery, Auto.ru](https://scrn.gallery/app/auto-ru?flow=68aa008fb7e7cf3909f5d4f9), [search flow](https://scrn.gallery/app/auto-ru?flow=68aa00f2b7e7cf3909f5d6d0), [Auto.ru search guide](https://auto.ru/support/autoru/ru/buyers-filtering-ads) |
| Kolesa iOS app | `kolesa.kz-screens/` | 291 JPG, 2 MP4, 50 flow folders | None recorded |

Both archives sit under `/Users/bagtyyar/Projects/learning/software-engineering-product-management/` on the founder's Mac. That path is not portable. The inventory stores paths relative to that root (`$REF_ARCHIVE_ROOT`), so another machine needs a copy of the archive at any location. No screenshot binaries are in this repository. Keep it that way unless the founder approves a lawful asset store.

The Screen Gallery page, checked 2026-09-21, labels the Auto.ru set "July 2025, 564 screens, 51 flows, 3 videos" and hides individual screens behind sign-in. The local archive has 599 JPGs. I did not reconcile the gap of 35. Treat the captures as July 2025 state, not the live app. The Kolesa captures carry no date in the archive. Every image is 1176×2556 with an iOS status bar, so none of them show Android behavior.

Nothing in the archives was renamed, moved, or rewritten. The one `.DS_Store` file in the Auto.ru folder is excluded from the counts.

## ID scheme

`<source>-<flow>-<seq>`, for example `AR-06-017` or `KZ-03-010`.

- `AR` is Auto.ru, `KZ` is Kolesa.
- `<flow>` is the two-digit prefix of the archive folder, so `AR-06` is `auto.ru-screens/06-search-params/`.
- `<seq>` is the number after the underscore in the filename, zero-padded to three digits. Videos use `V` and two digits, so `06-search-params_1.mp4` is `AR-06-V01`.

The ID maps back to one file without a lookup: `AR-06-017` is `auto.ru-screens/06-search-params/06-search-params_17.jpg`. Kolesa has no flows 20 or 21. The numbering skips them in the source.

## Categories and relevance

Each file gets one journey category, taken from its flow folder. A few frames inside release flows are overridden: saved-search and comparison screens in Auto.ru Favorites, and saved-search and followed-seller tabs in Kolesa Favorites. Categories for files I did not open come from the flow name alone.

Relevance has three values:

- `release-core` is the ADR-0051 journey: Home, brand/model search, filters, results, listing detail.
- `release-supporting` covers other screens a Google Play reviewer will reach: Favorites, Conversations, selling, onboarding and auth, Profile and settings, account deletion, legal pages.
- `reference-only` means the file is indexed and nothing more. It is not a candidate requirement.

## Counts

"Files" counts every JPG and MP4. "Unique" drops byte-identical duplicates. The first capture by ID order counts as the original.

| Source | Files | Duplicates | Unique | release-core (unique) | release-supporting (unique) | reference-only (unique) |
|---|---|---|---|---|---|---|
| Auto.ru | 602 | 55 | 547 | 117 (102) | 89 (80) | 396 (365) |
| Kolesa | 293 | 75 | 218 | 30 (27) | 117 (92) | 146 (99) |
| Total | 895 | 130 | 765 | 147 (129) | 206 (172) | 542 (464) |

Duplicates cluster where Screen Gallery starts several flows from the same screen. The Auto.ru home screen appears seven times. The Kolesa login and registration code screens repeat across register, password recovery, and change password.

| Category | Auto.ru files | Kolesa files | Unique | Relevance |
|---|---|---|---|---|
| home-discovery | 2 | 8 | 9 | release-core |
| brand-model-filters | 97 | 12 | 94 | release-core |
| results-detail | 18 | 13 | 28 | release-core; Kolesa call-seller is supporting |
| favorites | 2 | 4 | 5 | release-supporting, one Kolesa tab reference-only |
| conversations | 7 | 7 | 11 | release-supporting |
| selling | 56 | 44 | 98 | release-supporting |
| onboarding-auth | 8 | 51 | 29 | release-supporting; Kolesa password flows reference-only |
| profile-settings | 16 | 34 | 32 | release-supporting |
| saved-searches | 10 | 16 | 19 | reference-only |
| comparison | 15 | 0 | 15 | reference-only |
| other-verticals | 9 | 19 | 22 | reference-only |
| vehicle-history | 40 | 17 | 51 | reference-only |
| valuation | 30 | 0 | 29 | reference-only |
| catalog-editorial | 58 | 0 | 52 | reference-only |
| garage-logbook | 74 | 0 | 66 | reference-only |
| content-community | 82 | 4 | 82 | reference-only |
| owner-reviews | 50 | 20 | 66 | reference-only |
| payments-finance | 9 | 22 | 23 | reference-only |
| ads-promo | 0 | 8 | 7 | reference-only |
| notification-center | 4 | 0 | 3 | reference-only |
| support-help | 15 | 14 | 24 | reference-only |

This session annotated 173 captures, 127 from Auto.ru and 46 from Kolesa. Twenty-three of them are duplicates, marked as such. That covers every release-core image plus the Favorites, Conversations, and call-seller captures. The two release-core videos were not reviewed.

## Journey map

Start here, then open the annotations for the listed IDs.

**Home and discovery.** Auto.ru Home puts a "Марка, модель" search card with a live offer count above everything else (`AR-01-001`). That card is the entry ADR-0051 asks for. Kolesa Home has stories, a category tile grid, and a feed, with no brand/model entry (`KZ-01-001`). Its cars screen reaches filters through a header button (`KZ-02-002`). Both feeds carry things AutoTM rules out: a personalized heading on Auto.ru, ads and promoted cards on Kolesa.

**Brand/model and filters.** Both apps use one full-screen parameters form with a sticky "Show N" button whose count updates live (`AR-02-002`, `KZ-03-002`). Both brand pickers put search first, then popular brands with logos, then A to Z (`AR-08-002`, `KZ-03-007`). Model pickers follow the same shape (`AR-08-004`, `KZ-03-008`). Auto.ru opens each filter row as a bottom sheet with its own Apply button showing the resulting count (`AR-06-016` through `AR-06-072`). Kolesa puts year and price inputs inline in the form. Exclusion, generation, radius, and the long tail of Auto.ru technical filters are marked defer or avoid.

**Results and detail.** Auto.ru opens a separate results screen with the count in the header and a row of removable filter chips led by a "Filters" chip with a badge (`AR-05-001`). The chips float over the list after scrolling (`AR-05-003`). There is an empty state (`AR-05-005`) and a sort sheet (`AR-05-007`). Kolesa results show a count and a badge on the Filter button but no chips (`KZ-03-012`). Its sort list is shorter and closer to AutoTM's data (`KZ-04-002`). Both detail screens keep a two-button contact bar pinned to the bottom (`AR-11-003`, `KZ-07-002`). Kolesa's footer has "Report listing" (`KZ-07-007`), which matters for Google Play UGC review.

**Favorites.** Saved cards with contact buttons and a hide-sold toggle (`AR-36-001`, `AR-36-002`). Empty states with one CTA back to browsing (`KZ-26-002`). The Searches, Comparisons, and Sellers tabs are reference-only.

**Conversations.** A pinned listing strip at the top of the thread, quick-reply chips, and read ticks (`AR-37-002`, `AR-37-003`). The thread menu offers mute, report, and block (`AR-37-004`). Kolesa shows prepayment-scam warnings in new threads and when the buyer reveals the seller's phone number (`KZ-11-002`, `KZ-12-002`, `KZ-49-003`).

**Selling, onboarding and auth, Profile and settings.** Indexed but not yet annotated. See next batches.

## What AutoTM supports today

The notes' adopt/avoid calls were checked against the current feed filter contract, `ListingFilterFieldsSchema` in `packages/contracts/src/schemas/listings.ts`. It accepts brand, one model or several models of one brand, city, price range, year range, and condition. It has no sort parameter, and its cursor is timestamp-based, so results come newest first. Mileage, body, gearbox, fuel, and color exist on listings but are not feed filters. The annotations mark those "consider", not "adopt".

## Gaps

- All captures are iOS. None show Android back-button behavior, Material components, or edge-to-edge insets.
- No capture proves that returning from a listing restores the results scroll position. `AR-11-002` shows the results screen still in place with a toast. The 80-second listing-detail video `AR-11-V01` may show the full round trip.
- Neither archive shows Turkmen-language UI, TMT prices, or Turkmen city data.
- The Auto.ru listing detail "more" menu was never opened, so its report flow is not captured. Kolesa's report button appears, but its complaint flow does not.
- No Auto.ru account-deletion or legal-page captures exist. Kolesa has both (`KZ-48`, `KZ-43`, `KZ-44`).

## Next annotation batches

Each batch fits one session and covers release-supporting captures only. Duplicates inside a batch need only a pointer.

| Batch | IDs | Files (unique) | Why it matters for the release |
|---|---|---|---|
| 1. Auto.ru selling | `AR-50-002` to `AR-50-056`, video `AR-50-V01` (73.5 s) | 55 images (55) + video | Compare with AutoTM's 7-step listing wizard |
| 2. Kolesa selling and remove from sale | `KZ-50-001` to `KZ-50-039`, `KZ-51-001` to `KZ-51-005` | 44 (42) | Wizard comparison and the sold/remove flow behind `listings/manage` |
| 3. Onboarding and auth | `AR-43`, `AR-44`, `KZ-28`, `KZ-29`, `KZ-52`, video `KZ-52-V01` | 33 (24) + video | Phone-OTP sign-in and first-run screens a reviewer sees first |
| 4. Profile, settings, legal, deletion | `AR-40` to `AR-42`, `KZ-27`, `KZ-31`, `KZ-32`, `KZ-35`, `KZ-37`, `KZ-38`, `KZ-41` to `KZ-44`, `KZ-48` | 50 (32) | Account deletion, privacy policy, and posting rules are Play review items |
| 5. Core-journey videos | `AR-06-V01` (56.8 s), `AR-11-V01` (79.6 s) | 2 videos | Transitions and back navigation that stills cannot show, including scroll restoration |

Reference-only flows need no further annotation unless a later decision pulls one into scope.
