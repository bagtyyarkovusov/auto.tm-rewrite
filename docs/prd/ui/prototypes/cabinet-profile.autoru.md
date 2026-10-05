# Cabinet, Profile and Settings prototype, Auto.ru-style version, 2026-10-02

Throwaway evidence for #353 on `prototype/cabinet-profile`. It is not application code and nothing in it is approved except the list under "Locked". Recommendations are recommendations. Do not merge or delete this branch.

- Prototype: `cabinet-profile.prototype.html`. The version this note first described is at `8402d60` (SHA256 `814fdb5fd74037b7ca49b20d218df6ac402fdd130865c9d9d5f43070f7418f05`); the founder chose every recommended option there on 2026-10-02.
- The file has since gained the identity states (generated name, name editor, assigned car avatar, profile photo). They are described under [Identity update, 2026-10-05](#identity-update-2026-10-05) at the end. Everything above that section describes `8402d60` and is unchanged, except that "no name editor was added" no longer holds.
- Previous version: `a051fafb`, described in `cabinet-profile.reconciliation.md`. The founder rejected it on 2026-10-02 (second round).
- Source read for the inventory: `origin/main` at `8ed5dcb`.

## What changed and why

The founder asked for three things: Auto.ru-style, minimal Profile and Settings; Contact support used once, not as a repeated button; and the selling functions thought through before the layout.

| Before (`a051faf`) | Now | Why |
|---|---|---|
| Cabinet built from cards: identity card, phone and email rows with verified ticks and Add, four status rows with counts, a List a car button, a Contact support card | One plain list: Profile row, My listings row, then the menu rows with a small grey icon and a hairline divider | Auto.ru's menu is a plain list (AR-41-004). The founder called the old one busy |
| Settings: inline segmented controls, cards, a red Log out button | The same plain rows. Language and Theme show the current value and open a sheet | AR-41-004, AR-42-002 |
| Profile: role badge, helper sentence, verified badges, Member since card | Avatar, the display name if the User has one, Phone and Email rows with a masked value or Add, then Log out and Delete account | Minimal. `User.displayName` exists but nothing sets it, so no name editor was added |
| Contact support card on signed-out Cabinet, signed-in Cabinet and Settings, with an "AutoTM Support ✓ Official" header | One "Help" row in the menu, and one link on the code screen when the daily code limit is reached | Founder: do not overuse Contact support |
| My listings: a placeholder sentence | A stub with status tabs and sample cards so the grouping can be judged; marked as owned by #354 | Founder: think about drafts, archive and what the release keeps |
| Emoji icons, serif title | Stroke icons, system font, one accent colour | Restraint |

The mock account logic is unchanged from `a051faf` (sign-in, add and change, taken value, deletion, 30-day restore). Two small behaviour fixes were made: the "I understand" tick is cleared after a successful deletion (it used to stay ticked for the next visit), and Resend is hidden once the daily code limit is reached.

## Seller functions: what exists and what the release keeps

Read from source, not from memory. "Proposed" is a proposal for the founder, not a decision. Where source and PRD disagree, source is current behaviour and the PRD is intent.

| Status or function | API today | Mobile today | Who triggers | Proposed | Where Cabinet references it |
|---|---|---|---|---|---|
| Draft | Yes. A separate server-side `ListingDraft` table, not a Listing status. `POST/PATCH/DELETE /api/v1/listings/drafts`, `GET /api/v1/me/drafts` (`presentation/DraftsController.ts`). No cap on the number of drafts and no expiry found (`application/CreateDraft.ts`). Removed on publish, on discard, and at account purge (`apps/worker/src/jobs/PurgeExpiredAccounts.ts:78`). The enum value `draft` on `Listing.status` is unused | Yes. Sell tab shows the latest draft with Continue and New listing (`app/(tabs)/sell.tsx`). My listings has a Drafts tab with resume and discard (`app/listings/manage.tsx`). The wizard autosaves | Seller | keep | Inside My listings as a tab. D2 option B adds a Drafts row on Cabinet only when one exists |
| Pending review / moderation | No. `pending_review` is only an enum value (`schema.prisma`, `packages/contracts/src/enums.ts`). `application/PublishListing.ts` creates the Listing as `active`. PRD 32: "MLP beta auto-publishes everything" | No | Nobody today | defer | None. No "Under review" group |
| Active | Yes. `POST /listings/drafts/:id/publish` | Yes. Active tab; owner bar on Listing detail | Seller | keep | My listings, first tab |
| Rejected (reason, edit, resubmit) | No. `rejected` is only an enum value. The Listing model has no rejection-reason field | No | Nobody today | defer | None |
| Sold | Yes. `POST /listings/:id/sold`, active → sold (`domain/ListingStatus.ts`, `application/MarkSold.ts`). Sold cannot go back to active, only to archived. PRD 32 says sold is auto-archived after 14 days; no such job exists (the worker has only `PurgeExpiredAccounts`). **Source and PRD disagree** | Yes. Mark sold on the owner bar; Sold tab | Seller | keep | Inside My listings. Proposed to fold into Archive with a "Sold" label (D3) |
| Archived (removed from sale) | Yes. `POST /listings/:id/archive` from active or sold (`application/ArchiveListing.ts`). Also set by account deletion, tagged `archivedByDeletion` (`identity/infrastructure/PrismaAccountDeletionListingsAdapter.ts`). No expiry: PRD 32 lists automatic expiry as out of scope and no job exists | Yes. Archive in the owner ⋯ menu; Archived tab | Seller; account deletion | keep | Inside My listings, Archive tab |
| Banned | Yes. Admin only, and only from active (`admin/application/BanListing.ts`). Unban returns it to active. Owner edit, mark sold, archive, republish and delete are refused | Partly. `getOwnerCards` returns banned Listings, but `manage.tsx` filters each tab by active, sold or archived, so a banned Listing shows in no tab. `listingStatusLabel.ts` maps it to "unavailable". PRD 32 says the owner sees a generic ban notice. **Source and PRD disagree** | Admin | keep | Proposed: visible in My listings with a "Blocked" label and no actions. Belongs to #354 |
| Restore / relist | Yes. `POST /listings/:id/republish`, archived → active only (`application/RepublishListing.ts`). ADR-0056 requires a contact-phone check on republish; not built | Yes. Republish in the owner menu of an archived Listing | Seller; account restore republishes `archivedByDeletion` Listings | keep | Inside My listings, on Archive cards. A sold Listing has no relist path today |
| Delete a Listing | Yes. `DELETE /listings/:id`, soft delete; refused when banned (`application/DeleteListing.ts`). Deleted Listings leave the owner list; no undo | Yes. Delete in the owner ⋯ menu | Seller | keep | None. No "Deleted" group |
| Edit a live Listing | Yes. `PATCH /listings/:id`. Brand, model, generation, year and VIN are locked (`domain/types.ts` `LOCKED_FIELDS`). Refused when banned | Yes. `app/listings/[id]/edit.tsx` | Seller | keep | None; reached from a My listings card |
| Listing contact phone verification (ADR-0056) | No. The schema has only `Listing.contactPhone`. There is no verified-contact-phone table and no purpose-bound code; publish stores the draft's value unchecked. The ADR is accepted but not built | No. Step 7 is a free-text field prefilled with the account phone (`wizard/Step7DescContact.tsx`) | Seller, inside the wizard | keep | None on Cabinet, and no account-phone gate. The Sell stub shows one line. #354 owns the step |
| View and save counts | Yes. `Listing.viewCount`, `favoriteCount` | Yes, only in the owner status card on Listing detail (`components/ListingDetail.tsx:180`). The My listings DTO does not carry them (`application/ListMyListings.ts`) | System | keep | None on Cabinet |
| Listing total for the Cabinet row | No. `GET /me/listings` and `/me/drafts` are cursor-paginated with no total | No | System | keep | The number on the My listings row needs a small count endpoint; otherwise the row ships without it |
| Listing expiry / days left | No. Out of scope in PRD 32 | No | Nobody | defer | None. Auto.ru shows "60 days until removal" (AR-50-056) |
| Favorites and Conversations counts | Own tabs; count endpoints not checked | Favorites and Messages tabs | Buyer | hide | None on Cabinet |

Paths without a prefix are under `apps/api/src/modules/listings/` (API) or `apps/mobile/` (mobile).

Three findings that matter outside this prototype:

1. Only four statuses are live: active, sold, archived, banned. The transitions are active → sold, active or sold → archived, archived → active. `draft`, `pending_review` and `rejected` are unused enum values.
2. A banned Listing disappears from the seller's My listings in today's app.
3. The 14-day sold auto-archive in PRD 32 and the ADR-0056 contact-phone verification are not built.

## Decisions for the founder

Every option is a proposal. ★ marks the recommendation.

| # | Decision | Options | Why the recommendation |
|---|---|---|---|
| D1 | Settings structure | ★ A. Cabinet is the menu: Profile row, My listings, then the plain rows. B. A gear opens a separate Settings screen with the same rows | The founder asked for Auto.ru-style settings, and Auto.ru has no Settings screen. **A conflicts with #344**, see below |
| D2 | My listings entry | ★ A. One row with a total. B. One row plus a Drafts row when a draft exists. C. No row; the Sell tab holds the listings, as Auto.ru does. D. Status rows on Cabinet (the rejected layout, for comparison) | One row keeps Cabinet minimal and matches the #344 map. Today's Sell tab already links to My listings, which gives Auto.ru's path without moving the screen. **C conflicts with #344 and #354** |
| D3 | Status groups inside My listings | ★ A. Active, Drafts, Archive (Sold folds into Archive with a label). B. Active, Sold, Archived, Drafts (today). C. Active, Archive (drafts continue from Sell) | Sold and archived are both closed Listings. There is no moderation, so no Under review or Rejected tab |
| D4 | "List a car" on Cabinet | ★ A. None; the Sell tab is the entry. B. A plain row under My listings | The Sell tab is always one tap away |
| D5 | Language and Theme picker | ★ A. Bottom sheet. B. Full screen | Auto.ru uses a sheet for theme (AR-42-002) |
| D6 | Where Log out and Delete account live | ★ A. Bottom of Profile. B. End of the menu | They are account actions; the menu then looks the same signed in and out, and Delete is away from everyday rows. The Auto.ru captures do not show where it puts them. **A conflicts with #344** |
| D7 | Warning before Change | A. Straight to the new value. ★ B. A confirm sheet first | A rare action that locks out the old value at once |
| D8 | Value already used by another User | ★ A. Refuse and offer another value. B. Also offer to sign out and use that account | The second button can read as a merge path |

Also still proposals: the "what happens" list and the "I understand" checkbox on Delete account, the Notifications screen (device state and a system-settings row only), the About screen, dropping the role badge and Member since from Profile, and all new RU and TK wording.

A row to prune: "Posting rules" opens the same page as "Terms of Service" today (`legalPageUrl` knows only `privacy` and `terms`). It is kept because today's Settings has it.

## Conflicts with approved decisions

- **D1 option A against #344.** The #344 resolution lists Cabinet, Profile and Settings as three screens. Option A removes the Settings screen. Option B keeps #344 as it is. The founder has to choose; the prototype defaults to A only because that is the recommendation.
- **D6 option A against #344.** The earlier map puts Log out and Delete account under Settings. Option A moves them to Profile.
- **D2 option C against #344 and #354.** It moves My listings to the Sell tab and redesigns a tab #354 owns. Not recommended.
- **#352 D10, outside this file.** It still plans a Support row pinned in Messages and "Need help?" links in Favorites and Messages empty and error states. If Contact support should appear once in the app, #352 needs revisiting.
- **#344 wording already superseded.** #344 says "Selling needs a verified phone". ADR-0056 replaced that; the prototype has no account-phone gate.

## Every place Help or Contact support appears

Two, in every state and option:

1. **Menu row "Help".** On Cabinet with D1 = A, or on Settings with D1 = B. Signed in and signed out. It opens the contact screen: Email us (`mailto:bagtyyarkowusow.dev@gmail.com`), Call us (`tel:+99363989404`), and one line on what to include. No hours, no response time, no chat.
2. **Link "Contact support".** On the code screen, only when the daily code limit is reached, in sign-in and add or change flows. Not on the web deletion page.

Removed: the support card on signed-out Cabinet, on signed-in Cabinet and on Settings, and the "AutoTM Support ✓ Official" header. No error state, empty state, taken-value screen or delete screen links to support.

The harness counted these: across all 61 jump states, controls that open Help exist only on the states that show the menu and on the daily-limit code screen; `mailto:` and `tel:` links exist only on the Help screen; the words "Contact support" appear in exactly one jump state.

## Locked, not reopened

Phone and Email sign-in tabs, both by code, one User; no password, no social sign-in, no merging or removing methods; add or change only after a code; email trimmed and lowercased. No account-phone gate to sell (ADR-0056). In-app deletion by session, web deletion by code, 30-day grace with explicit restore, `autotm.bagtyyar.dev/:locale/account/delete` (staging `staging.autotm.bagtyyar.dev`). No Share. No notification category switches. Five tabs. Signed-out Cabinet has one Sign in entry and the menu rows that make sense signed out.

## Reference captures viewed

Viewed locally; no screenshot was copied into the repository.

- **AR-41-001 to 004, menu.** A hamburger on Home opens a "Меню" sheet: first tile "Войти / Авторизация", service tiles, then seven plain rows with a small grey icon and a hairline divider, no chevrons and no values. Taken: the plain list, the single Help row, sign-in as the first entry.
- **AR-42-002, theme.** A bottom sheet with Light, Dark, System and a red radio mark. Taken for D5.
- **AR-40-002, notification settings.** A plain screen of rows grouped by topic. Categories are deferred in AutoTM.
- **AR-45-001, AR-46-002, help.** Help is one menu row that opens a support chat. AutoTM has no chat for the release.
- **AR-43-002, 004, 005, auth and signed-in profile.** Sign-in is a Yandex ID sheet (not applicable). The signed-in profile is a banner with avatar, name, a gear and a ⋯ button over social counters and Garage tiles. Taken: avatar and name.
- **AR-44-001 to 003, first login.** Splash, the system notification prompt, Home. Nothing taken.
- **AR-50-002, 003, 004, 053 to 056, selling.** The Sell tab is titled "Объявления" and holds the seller's own listings, with a profile icon, "+ Добавить", and per Listing the views, calls, saves, days until removal, Edit and Remove from sale. This is the evidence behind D2 option C.
- **KZ-27-003, KZ-51-002, KZ-51-005, Kolesa, for contrast.** Cabinet shows "На сайте" and, once non-empty, "В архиве". Remove from sale asks a reason and moves the Listing to the archive.

**Not in the archive, or not opened:** no Auto.ru capture shows a drafts list, status tabs or an archive for own listings, what the profile gear or ⋯ open, where Log out is, or account deletion. AR-50-005 to 052 (the wizard steps) were not opened; they belong to #354. AR-36 (favorites) was read from the annotations file, not the images.

## Verification

Headless Chrome over a loopback HTTP server with a private profile under `/tmp`, driven over CDP. Evidence and harnesses: `/tmp/autotm-353-autoru-20261002/` (`sweep.cjs`, `flows.cjs`, `shots.cjs`, `lib.cjs`, `sweep.json`, `flows.json`, `shots/`). All runs below were made against the SHA above.

- **Render sweep.** 768 decision combinations (every option of D1 to D8 crossed) × 61 jump states × EN, RU, TK × light and dark = 281,088 renders, plus 165,888 renders with data variants (display name, no listings, blocked Listing, system theme) on every combination. Total 446,976. Script exceptions: 0. Renders with `undefined`, `null`, `NaN`, `[object`, a missing-translation message or a camelCase raw key in a text node: 0. Empty screens: 0. The side panel rendered for all 19 decision options with no bad text.
- **Strict translation lookup.** A missing key throws; confirmed by calling it with an unknown key. 160 keys, no duplicates, no key used by a literal `t()` call missing.
- **Window globals.** 108 top-level identifiers checked against a clean `window`; no collisions.
- **No external requests.** The page made none.
- **Real DOM flows.** 215 assertions, 215 passed, using rendered rows, buttons, the input and the keypad buttons. They cover: sign-in by phone and by email (trimmed and lowercased); add phone and add email; change phone through the warning sheet and change email without it; taken email and taken phone leave the User unchanged, with and without the account-switch option; wrong, locked and invalid values; the daily-limit Help link and its Back; language and theme pickers as sheet and as screen; My listings entry options and grouping options; Sell tab for an email-only User with no phone gate; web deletion on production and staging hosts; the Help screen link targets. The account block ran four times (D1 A/B × D6 A/B): log out then sign in with each held method returns the same two-method User; a method the account does not hold creates a one-method User; delete then an unrelated phone or email sign-in shows no Restore and leaves the deleted account untouched; delete then a held-method sign-in offers Restore and restores the exact two methods; cancel leaves the User signed out and the deleted account intact, and Restore is offered again.
- **Screenshots.** 39 phone-frame PNGs in `shots/`, also copied to `/tmp/autotm-prototypes/cabinet-autoru-shots/`: signed-out Cabinet, signed-in Cabinet for each layout option, Profile, Theme and Language pick, Help, the My listings stub and others, in light EN, dark RU, and light and dark TK. They were looked at; the status label was moved off the title line, and the gear icon, which read as a sun, was redrawn.
- `node --check` on the extracted script and `git diff --check` passed.

Shortcuts in the flow harness, so they are not mistaken for UI evidence: the tab-history check calls `switchTab` from Profile because the prototype draws the tab bar only on tab root screens; the daily-limit test sets the resend countdown to zero instead of waiting 15 seconds; one-shot results (taken, wrong, locked, delete fails, daily limit) are chosen with the side-panel controls.

## Not evidenced

- Repository unit, typecheck and lint gates were not run; this worktree has no dependencies installed and the change is one HTML file and this note.
- No application build, native Android behaviour, real code delivery, backend call or deployment.
- RU and TK wording was written by the prototype author and not reviewed by a native speaker.
- The seller-function table is from reading source. No API was called and no test was run to confirm a transition. Two cells are inference from reading code rather than from running it: that a banned Listing appears in no My listings tab, and that drafts have no cap.
- Favorites and Conversations count endpoints were not looked up.
- Independent verification and founder review are outstanding.

## Identity update, 2026-10-05

Added to the same file, on top of `8402d60`. Nothing that the founder approved there was changed: the eight decisions keep their defaults, and every earlier jump state still renders.

It follows two founder comments on #353, both of 2026-10-02: answer 5 of "Founder decisions on the #353 slicing questions" (name and photo are in the release) and "Founder decisions: identity design", items (a) to (d). The founder delegated visual approval of this update to the orchestrator, so the choices below were made without stopping to ask. They are choices, not founder decisions.

### What the founder decided

| | Decision | In the prototype |
|---|---|---|
| (a) | A generated name: a neutral, localized prefix and a number. No car-word combinations | "Driver 4821", "Водитель 4821", "Sürüji 4821" on the Cabinet row and the Profile header |
| (b) | 2 to 30 characters, not unique, no moderation, editable in Profile | The name editor and its error states |
| (c) | About 12 car-themed avatars bundled in the app; the server assigns an index stored on the User; shown until a photo is set | 12 marks, the index shown in the side panel, drawn at every size used |
| (d) | The profile photo reuses the Listing upload pipeline (after #536, now merged) | The photo sheet and the upload states, with the Listing pipeline's limits |

### What was added

- **Cabinet row and Profile header.** Every signed-in User now has a name: the one they set, or the generated one. The masked Sign-in Method is always the second line of the Cabinet row. The initial-letter avatar is gone.
- **Name editor.** A screen opened from the name on Profile (the name has a pencil). The field holds the current name. Under it sit the rule and a counter. Save is disabled until the name is valid and different. States: too short, too long, empty, only spaces, saving, a failed save with Retry, offline, and saved.
- **Assigned avatar.** Twelve original line marks on a tinted circle: sedan, hatchback, SUV, pickup, van, steering wheel, wheel, key, speedometer, gear shift, road, headlight. No brand logos and nothing copied from Auto.ru. The side panel shows the set in light and dark and lets the index be changed.
- **Profile photo.** The avatar on Profile carries a camera badge and opens a sheet: Take photo, Choose from library, and Remove photo when one is set. States: camera permission denied, uploading with progress, a failed upload with Retry, offline, a file that is too large, a file that is not a usable picture, success, removal back to the assigned avatar, and a failed removal.
- **Seen by another User.** Three stubs: the seller block on Listing detail, the Conversation header, and the Messages rows. Each can show a User with a generated name and assigned avatar, with a set name and photo, with a set name and no photo, and a deleted User. Listing detail belongs to #351 and Messages to #352; only the name and avatar are designed here.
- **Side panel.** An "Identity" block (name, photo, the assigned number and index, how another User is shown), the avatar library, one-shot results for the next name save and the next photo, and a camera permission switch.
- **Deep links.** `#j=<jump name>&lang=ru&theme=dark` opens a state directly, so a ticket can point at one.

### Jump states added (36)

- **Identity: name and assigned avatar:** Cabinet: generated name · Profile: generated name · Cabinet: set name + photo · Profile: set name + photo · Profile: set name, assigned avatar · Cabinet: 30-character name · Profile: 30-character name
- **Identity: name editor:** Name: editor opens · Name: editor, set name · Name: valid, changed · Name: too short · Name: too long · Name: empty · Name: only spaces · Name: saving · Name: save failed · Name: offline · Name: saved
- **Identity: profile photo:** Photo: entry point on avatar · Photo: sheet (no photo) · Photo: sheet (photo set) · Photo: camera permission denied · Photo: uploading · Photo: upload failed · Photo: offline · Photo: too large · Photo: unsupported file · Photo: success · Photo: removed, assigned avatar back · Photo: remove failed
- **Identity: seen by another User:** Seller card: generated name + avatar · Seller card: set name + photo · Conversation header: generated name + avatar · Conversation header: set name + photo · Conversation header: deleted user · Messages rows

"Messages stub" under "Other tabs" now opens the same Messages rows.

### Draft wording for a native-speaker pass

| Key | EN | RU | TK |
|---|---|---|---|
| Generated-name prefix | Driver | Водитель | Sürüji |

"Водитель" and "Sürüji" are the plain words for a person who drives. Both are masculine by form; Russian has no neutral everyday word, and "Sürüji" is used for either sex. Every other new string (the rule, the four errors, the photo sheet, the permission dialog, the upload messages) is a draft too. The slicing answer 4 on #353 says to build with the drafts.

### Design choices the founder decisions did not settle

Each is one line with its reason.

**Name**

1. The number has four digits, 1000 to 9999, and is random and not unique. Names are not unique anyway (b), and four digits are quick to read out.
2. The server stores the number, not the text, and each viewer sees the prefix in their own language. A Russian reader should not see "Driver" on someone's Listing, and the stored name stays empty until the User sets one.
3. The name on Profile is the entry point, marked with a pencil. No extra "Name" row, so Profile stays as minimal as the founder approved.
4. The editor is its own screen, like Add phone and Add email. A sheet leaves too little room for the keyboard and an error.
5. The field opens holding the current name, also when it is the generated one. The User sees exactly what others see before changing it.
6. Spaces at the ends are dropped, runs of spaces become one, and the length is counted in characters after that. "  A  " is one character, and no name can look empty.
7. The field lets the User type past 30 and shows the error and a red counter, up to a hard stop at 40. Silently cutting a pasted name hides the reason.
8. The rule line is neutral until the field is edited; after that an error replaces it at once. No error is shown for a name the User has not touched.
9. An empty name is refused, and there is no "back to the generated name" control. The founder did not ask for one; it is listed as an open question.
10. Nothing but length is checked: any script, digits and emoji pass. Decision (b) says no moderation.
11. Back with unsaved text leaves without asking. It is one short field.
12. Leaving while a save is in flight does not cancel it; Profile shows the result when it lands. The earlier review asked for exactly this (P3-3 on the code screen).
13. A failed save keeps the typed text and turns the button into Retry; offline uses the app's existing offline sentence. Nothing has to be typed twice.
14. After a save the User is back on Profile with a short "Name saved". In the build that message uses Profile's notice line, which never covers a button.

**Assigned avatar**

15. The twelve marks and their order are fixed: 0 sedan, 1 hatchback, 2 SUV, 3 pickup, 4 van, 5 steering wheel, 6 wheel, 7 key, 8 speedometer, 9 gear shift, 10 road, 11 headlight. The server stores the position, so the order may only ever grow at the end.
16. An app that receives an index it does not have takes it modulo its own set size. An older build then still draws a car instead of nothing.
17. Each mark has its own soft tint, lighter in light theme and deeper in dark, and none is the brand red. Twelve grey circles look alike in a chat list, and red means an action in this app.
18. The User cannot choose a car avatar. Decision (c) says the server assigns it; a picker is listed as an open question.
19. A signed-out Cabinet row and a deleted User show the neutral person icon, not a car. A car there would suggest an account.
20. Sizes: 72 on Profile, 48 on the Cabinet row, 44 on the seller block, 36 in the Conversation header, 24 on a Messages row. The first three are the sizes those screens use today.

**Photo**

21. The avatar itself is the entry point and carries a small camera badge. It is where people look for it, and it needs no new row.
22. The sheet has Take photo and Choose from library, and Remove photo only when a photo is set. A Remove that does nothing should not be offered.
23. Only the camera asks for permission. Choosing from the library uses Android's system photo picker, which needs none, so there is no "library access denied" state.
24. When camera permission is denied, a dialog explains and offers Open settings and Cancel. The app cannot ask again once Android has stopped showing the prompt.
25. There is no crop screen in the app. The system picker's square crop is used and the photo is shown in a circle.
26. While uploading, the avatar shows the chosen photo dimmed with a progress ring, and a line gives the percent. There is no Cancel: the file is small and the upload is short.
27. The earlier avatar stays until the upload succeeds. A failure never leaves the User without an avatar.
28. A failed upload shows a box under the header with Retry and Cancel; Retry reuses the chosen photo. Offline uses the same box with the offline sentence.
29. Too large and unsupported are found on the device before anything is sent, and offer "Choose another photo". Retrying the same file cannot help.
30. The limits shown are the Listing pipeline's: 5 MB, and JPEG, PNG or WebP. The app compresses to JPEG first, so the size error should be rare.
31. Remove photo has no confirm dialog. Choosing a photo again undoes it.
32. A failed removal keeps the photo and offers Retry in the same box.

**Seen by another User**

33. In the seller block the avatar replaces the grey person icon, and "Private seller" always sits under the name. The role is a fact about the seller and no longer stands in for a missing name.
34. In the Conversation header the avatar sits to the left of the name.
35. In a Messages row the Listing thumbnail still leads (#352 D8) and the other User's avatar is a 24-point badge on its corner. The row keeps its layout and gains the face.
36. A deleted User keeps today's "Deleted user" name with the person icon.
37. "Private seller" and "Buyer" stop being used as names. Every User now has one.
38. A name is always one line and ends in "…" when it does not fit. Thirty wide characters do not fit beside an avatar on a small phone.

### Not designed here

- Name and avatar on the web Listing page, in the admin console and in push notification titles. The same rule applies (name, or prefix and number in the reader's language), but no screen was drawn.
- A "Report this name or photo" path. Decision (b) puts moderation outside the reviewer release.
- The system camera, the system photo picker and its crop. They are Android's own screens; the prototype goes straight from the sheet to the upload.

### Verification of the identity update

- `node /tmp/identity-353/check.cjs`: the page script run in Node against a stub document. All 97 jump states in EN, RU and TK, light and dark (582 renders, each also rebuilding the side panel): no exception, no `undefined`, `NaN` or `[object` in visible text or attributes, and every string key has three values. 42 assertions passed: the name rule at its edges (0, 1, 2, 30, 31 characters, spaces), Save disabled until valid and changed, save, a failed save and its retry, offline keeping the text, a save that lands after the User left, upload to success, Remove offered only with a photo, removal restoring the assigned avatar, a failed upload and its retry, too large, unsupported, camera permission denied, a failed removal and its retry, and the generated name in three languages.
- Headless Chrome on the file URL with a private profile under `/tmp`, nine states screenshotted and looked at (Profile, the editor's too-long error in Russian dark, uploading in Turkmen, the failed upload in Russian, the photo sheet in dark, the seller block in Russian dark, the Conversation header in Turkmen, the Messages rows, and Cabinet with a 30-character name in Turkmen dark). No console error was logged. Two defects were found and fixed this way: the tints did not apply in light theme, and a 30-character name wrapped onto two lines on the Cabinet row.
- Not evidenced: the 446,976-render sweep and the 215 DOM flows above were not rerun; no independent review of this commit; no native Android check; no screen reader or keyboard check; RU and TK wording not reviewed by a native speaker; repository gates not run (one HTML file and two notes changed).
