# Admin alignment with live mobile release work, 2026-10-04

Dated source/issue/PR audit for founder decision making. This is not a governing specification, design approval, implementation instruction or release readiness verdict. Q46–Q61 are accepted planning; Q40–Q45 and Q62–Q67 are pending. The founder asked for inspection of actual issues, current PRs and mobile Listing/posting UI, rather than a generic scope reminder.

## Evidence and authority

Remote main was fetched and independently pinned to `ecf95306c6f108b102a0c763e7d4071ce023d75a`. Current checkout stays on the separate prototype/checkpoint branch; no other checkout, PR or implementation queue was modified. Inventoried55 open issues and16 open PRs; detailed review focused on the product/UI work below. Source at main, approved prototype decisions, unmerged PR implementations and historical native evidence are distinct.

Read #354 body and founder acceptance/slicing comments, #353/#500 current decisions, issue scopes #581–#589/#593/#609/#624, #511/#512/#599/#623/#492, and reviewer/physical proof maps #320/#345. Inspected current PR bodies and fetched named product PR heads to read actual source/diffs. No tests, deployed-runtime checks or native UI recaptures were performed. PR body claims about other main SHAs do not replace the observed remote main reference.

The approved Sell prototype is [21a3ae2e](https://github.com/bagtyyarkovusov/auto.tm-rewrite/blob/21a3ae2ee74a132b3506edaddf3ee1c74e0ed83e/docs/prd/ui/prototypes/sell-wizard.prototype.html). [D1–D11](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354#issuecomment-5947666654), [D12](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354#issuecomment-5950697656), and [slicing answers](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354#issuecomment-5961320337) establish acceptance. Historical captions in the prototype note, including "nothing approved", must be read with those later comments and current issue criteria.

## Live PR inventory

These were open at the read snapshot, not merged or certified by this audit. Listing every PR here is an inventory, not an independent code review of every workflow PR.

| PR | Scope | Observed head | State |
|---|---|---|---|
| [#626](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/626) | fix(media): retain full chat attachment keys in public URLs | `227e5d505fc4d13ac913c7c12dbc6c7a4f1b049b` | Draft |
| [#625](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/625) | fix(mobile): keep toasts clear of screen headers | `1b38a1ce48ad0585e77bc7284d722094e6831fa1` | Draft |
| [#622](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/622) | Drafts card: show the steps filled, not a constant "Step 1 of 7" | `5135e6e702859f325ea86722903f6ae6de96e81b` | Draft |
| [#621](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/621) | test(api): purpose-bound code follow-ups from #598 | `3d641799ed7649183fd0ce936a3509e4d6095b61` | Draft |
| [#620](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/620) | Native PR seed follow-ups: load-order probe and db scripts typecheck (#492 findings 1–2) | `4d27d9b0d5cce760246a3fb3ec48e7d873b8b4cd` | Draft |
| [#619](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/619) | feat(mobile): one City picker on Description and place, inline currency buttons (#583) | `4a67f1941447861d91c961347952bcda34299171` | Draft |
| [#618](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/618) | feat(listings): chain Car step pickers for Brand, Model, Year and Generation (#582) | `fe8be3990e6bd4160785da85704a28420a873446` | Draft |
| [#617](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/617) | Worktree cleanup gate follow-ups from the PR #487 reviews | `98aeb7deef3af0f26722cb418f76a1f99b7db978` | Draft |
| [#615](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/615) | Remove remaining Settings-screen references from UI and legal docs | `2297b98b53bc2a92e544f6084d047d583e1d5d84` | Draft |
| [#597](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/597) | feat(listings): Sell wizard in seven steps, with VIN on the Car step | `21e8509c5490139c90557153c8410287440af777` | Draft |
| [#596](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/596) | My listings: Active, Drafts and Archive with an action sheet | `14fd86d6acb3d87b922fa5e1ebd1fbc01ed13337` | Draft |
| [#594](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/594) | feat(listings): Sell tab with the latest draft first and a five-draft limit | `3bc657ca631914c8321e5c93d0ea75f0269d51ac` | Draft |
| [#579](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/579) | Long-press a Message to Copy or Report | `3f0ac90496c080e0fd71c30c363f61ee51d7c37f` | Draft |
| [#577](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/577) | Sold and closed Listing states in a Conversation | `adba21b3d80341daf83fdd687f53d75847b740cf` | Draft |
| [#572](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/572) | chore: combined Cabinet and Messages native evidence session | `ed436a2effe158f94b624905417cd37c10e22334` | Draft |
| [#557](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/557) | fix(mobile): agree Show N with its count and drop the repeated City heading | `7698dd386f1b044d6ba24f5c4c633cde9563bd52` | Draft |

PR572 is explicitly evidence-only and never merges. Its combined backend/native states are not automatically evidence for the latest individual slice head. PR594/596/597 and618/619/625/626 report remaining review/native/runtime or exact-head evidence tasks in their own records. This audit does not waive them.

## Posting wizard alignment

| Area | Approved release target and owning work | Observed implementation and admin consequence |
|---|---|---|
| Sections/order | #354/#581, PR597: Car → Details and condition → Photos → Price → Description and place → Contact → Check and publish | Main still has eight steps with a separate VIN step. Use approved section names and stable fields for future admin inspection; do not infer final UI from old component filenames or draft numeric currentStep. Seven-step implementation is unmerged. |
| Car | #582/PR618: chained Brand, Model, Year, Generation; optional VIN on Car; no decoder | Preserve the locked published Car identity and existing Catalog relationships. Admin must not promise decoding/verification or silently permit correction of identity fields locked by the ordinary editor. Exact escalation for mistaken locked identity remains a decision. |
| Details | ADR0080 is in main; #609 owns the remaining order/grouping | New hides Damaged and stores not-damaged; any seller may select New. Used needs the disclosure answer. Known issues remains optional. Review seller declarations as declarations, not AutoTM-certified condition. Do not flag skipped New-only fields as incomplete or add an inspection badge. |
| Photos | #584: third step, Continue once a photo is picked, upload continues; Publish still waits for valid uploaded media | Local/picked/uploaded/attached/usable-public/reported-evidence media are different states. Admin photo enforcement concerns attached public content, not a background upload spinner. Public minimum-photo validation must hold across removal, republish and restoration too. |
| Place/price | #583/PR619: Description and one grouped City picker; inline TMT/USD/AED, currency change clears amount | Reuse the same catalog labels, derived region/city relationship and currency semantics in admin detail/correction. City is Listing location, not measured physical user location. Do not create a second Region/City wizard or infer raw analytics location. |
| Contact | ADR0056/0081 backend present; #593 mobile picker/code flow remains open | Listing Verified Contact Phone is distinct from a Sign-in Method. Required even calls off. Account phone/reusable confirmation rules apply to publish/relist; ordinary edits check only changed phone. A new restoration check must explicitly reconcile those rules rather than require OTP for every correction. |
| Check/publish | #588: preview card, sections with Change/Fill in, return with Done, named blockers, persistent mapped errors, then owner detail/toast | PR597 only reorders current Review; PR625 changes toast clearance, not publish semantics. Admin correction review should share section vocabulary/preview conventions, but a private Submit correction action must not call ordinary Publish or public Save. |
| Close/resume | #585: save and close, honest save failure choices and resume | Main still creates/discards drafts differently. Awaiting forceSave is not itself proof of a durable save because current autosave catches errors. Do not show an admin correction as submitted merely because local editing or upload succeeded. |

Source-only reconciliation items stay with their existing owners: prototype invalid Continue attempts versus PR597 validity-disabled behavior; first-incomplete resume versus #585's intended resume; #609 Details grouping; #584 unresolved upload states; #588 Change→Done→Check. The audit does not amend those acceptance criteria.

Current `computePublishGate` does not explicitly block waiting_for_network/lost when another photo is uploaded. Issue624's observed upload stall/retry has no request trace. Treat both as focused evidence/triage tasks, not a shared proven cause with chat media URL failures. Keep existing upload compression, ownership and staging safeguards.

## My listings, correction and media lifecycle

| Existing approved work | Alignment requirement or unresolved conflict |
|---|---|
| #586/PR594: latest draft first, five ordinary Sell drafts, no automatic expiry | A correction to an existing moderated Listing should preserve that Listing/decision/version identity. Recommended boundary: a separate correction submission rather than a new Sell draft or new Listing. Whether it consumes any draft quota or appears in latest-draft/progress counts must be explicitly decided; do not assume. |
| #587/PR596: Active, Drafts, Archive; Sold inside Archive; blocked row in Active with no tap/actions/reason/appeal | Q53/Q55/Q57/Q59 require correction, safe reasons and appeal. They need an explicitly approved later amendment of the restricted row/detail flow. Preserve current reviewer acceptance; do not silently add actions to PR596 or create an extra tab. |
| #589 after #588: ordinary edit starts with a section list, Car locked, dirty Save/leave confirmation/Retry; active/removed editable, sold/blocked not editable | Reuse the interaction pattern through a proposed private correction mode. Ordinary Edit remains immediate/public and has no edit-triggered re-review in #589. New private version submission/approval, rejected correction, retries and staff decisions during editing exceed that slice. |
| ADR0024/0025: staged client edit, sequential public field patch→attach→remove→reorder with retry-from-failure | Q52/Q60 need a deliberate publication-eligibility and reviewed-version boundary. Do not call this sequence a server transaction. Architecture implications require reviewed documentation; no bundled endpoint is approved by this audit. |
| Attach before remove and max20 images | Replacing a photo at20 currently hits AttachMedia's cap before removal, by source inference. Solve both the public minimum1 and maximum20 across the intended saved change; a last-photo warning alone is insufficient. |
| Current media attach/remove/reorder and ordinary cleanup | `Listing.updatedAt` alone is not a full revision because media/order writes do not update that row. Bind enforcement and approval to fields plus ordered media IDs/revision. Ordinary removal deletes provenance and owned objects, with no retained moderation evidence or staff audit. |
| Buyer/owner photos and contact | Removal changes cover, first-two-photo cards, total count, selected gallery/viewer index, Favorites and Conversation previews. Reconcile server results and caches, including stale contact affordances. A backend hide cannot recall a phone/photo already viewed. |

Main and PR596 retain a sold Edit affordance in Listing detail while the planned My listings action sheet says Sold→Delete only and #589 forbids sold edit. That is current slice consistency work, not new admin scope. PR622 draftProgress, PR594's inline progress and PR596's old currentStep/stepCount must reconcile with PR597's field-derived completion. Keep correction progress outside the ordinary draft contract until scoped.

## Messages and enforcement alignment

- [#511/PR579](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/579) includes reports for incoming text, image and Listing-reference Messages. Copy is text-only; reported text remains Copy-only; own/delete/pending/failed rules remain distinct. It requires a native build including clipboard. Admin cannot treat every Message report as text-only just because current snapshot stores body.
- Main `ConversationReportContextPort` captures body/IDs/timestamps/deletion and up to10 preceding plus10 following Messages. It omits Message kind/image/post-reference metadata. Admin detail currently does not render that context. Pending Q64 should name supported reported kinds and relevant protected attachments within this same bounded context.
- [#512/PR577](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/577) preserves existing messaging for sold/archived Listings, with status banners and no quick replies; unavailable/chat-disabled/participant-unavailable suppress the composer and keep readable history. Reuse its sendRestriction vocabulary. A moderation hide must not be labelled a normal seller sale/archive action. Zero-photo hidden-state send/contact behavior still requires an explicit decision.
- [PR626](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/626) fixes full object-key addressing on API/mobile. Its current media/runtime/native evidence is incomplete; it does not implement protected moderation evidence. Avoid inventing a different incompatible URL helper, but never equate a public image URL with authorized case access.
- #599 and #623 retain their own realtime/composer/acknowledgement evidence and polish scopes. No admin decision closes those issues or proves delivery. #572 integration evidence is historical and not a mergeable app implementation.

## Changes recommended to pending Q62–Q67

These are amendments to recommendations awaiting founder decision, not newly accepted choices.

| Question | Grounded recommendation |
|---|---|
| Q62 related reports | Group the same reviewed issue/version, recheck changes and owner/staff races, select dispositions explicitly and keep unrelated reports pending. Do not reapply old complaints blindly after correction/restoration. |
| Q63 Listing/photo evidence | Bind selected photo to server media ID and reported fields/media revision, not its gallery number or public key alone. Show Reported, Current and submitted Correction distinctly. Decide protected capture before ordinary cleanup, access and lifecycle; never treat draft preview or a local URI as retained evidence. |
| Q64 Message evidence | Support reported text, image and Listing-reference Messages from #511 within existing up-to10-before/10-after bounds. Display necessary attachment/reference evidence with authorization/audit. Public Listing lookup does not grant private-message or private-correction access. |
| Q65 grants | Include separately authorized private correction read, exact-version restoration approval, retained photo/Message evidence and related report resolution. Match backend grants to actual actions and UI visibility; existing all-or-nothing admin role is not aggregate-only access. |
| Q66 owner notices | Design a later amended blocked row/owner detail within Active/Drafts/Archive, using affected section/photo, safe reason and correction/appeal entry. Keep reviewer neutral-row and Help rules until explicit admission; optional generic push is not a new notification center. |
| Q67 reporter feedback | Preserve current generic acknowledgement; any later reviewed confirmation must not expose groups, private correction content, owner appeals or restoration decisions. Full report history remains separately scoped. |

Additional scope choices now exposed include correction draft-quota/count behavior, restricted-row phase admission, zero-photo hidden Conversation behavior, exact content-version ownership, and restoration/contact checks. Do not presume these answers from previously accepted principles.

## Improvement dashboard and telemetry alignment

The posting funnel must use the actual field/stage contract and release version, not translated labels or old numeric positions. PR597 removes the standalone VIN stage; #585 can change when a real Draft is created; PR622/594/596 disagree today about progress. Specify those mappings before comparing completion/dropoff across releases. Preserve the accepted seven-day publish outcome window while resolving draft-start denominator semantics, rather than silently changing the metric.

Show upload pipeline failures separately from validation, contact confirmation, final publication and later moderation correction/restoration. A picked preview or a successful upload is not a published Listing. Public hiding changes the time-weighted eligible inventory/contact denominator already chosen for the scorecard. Keep private report/Message/photo evidence, VIN, phone, descriptions and internal reasons out of product telemetry. Founder/QA/reviewer fixture exclusions and account/guest cohort separation still apply. This is contract work on #606/#605, not authorization to invent more collection or declare the improvement mock approved.

## Release and documentation treatment

Preserve #320 reviewer scope and #345 physical Android gate, five tabs, current approved Listing/Conversation actions, photos-only release and Help without Support chat. Future Support is owned by #500; it is a separate context, not an arbitrary Listing-free marketplace Conversation. Do not expand inspector tooling, video, payments, dealerships, broadcasts or public sharing through admin alignment.

ADR0057 already defers all in-app inspection-demand CTA/post-publish prompts and leaves its component/API/admin aggregate unused/readable. Do not revive it because a table/page exists. The separate ADR0037 trust-pilot versus new20-user app-pilot relationship remains unresolved; this audit does not reopen or decide it.

Mutable specifications/UI amendments and required new/superseding ADRs must be reviewed before feature implementation slices. Current defect triage and inflight slice fixes keep their own owners. No current issue criteria, PR code, canonical design, accepted ADR, locked sprint, native fixture environment or other chat was changed.

## Source entry points

Pinned main `ecf95306c6f108b102a0c763e7d4071ce023d75a`:

- `packages/contracts/src/schemas/wizard.ts`, `apps/mobile/app/(tabs)/sell.tsx`, `src/listings/wizard/wizardMachine.ts`, `useWizardAutosave.ts`, `uploadStaging/queueState.ts`, `edit/useSaveListingEdit.ts`.
- `apps/mobile/app/listings/manage.tsx`, `app/listings/[id]/edit.tsx`, `src/listings/components/OwnerActions.tsx`, `PhotoGallery.tsx`, `PhotoViewer.tsx`, `detail/ListingPreview.tsx`.
- `apps/api/src/modules/listings/application/{PublishListing,AttachMedia,RemoveMedia,RepublishListing,EditListing}.ts`, `infrastructure/PrismaListingMediaRepository.ts`, `domain/CardPhotos.ts`.
- `apps/api/src/modules/admin/application/CreateMessageReport.ts`, `GetReportDetail.ts`, `apps/api/src/modules/conversations/domain/ports/ConversationReportContextPort.ts`, `infrastructure/PrismaConversationRepository.ts`.
- `docs/adr/0025-edit-save-atomicity.md`, `0080-a-new-car-skips-the-damaged-question.md`, `0081-contact-phone-confirmation-api-for-listings.md`, `0057-defer-the-in-app-inspection-demand-signal.md`.

Individual PR source is pinned to the head table above, not inferred from current main or historical integration screenshots. All runtime/concurrency concerns in this audit remain source findings or inferences unless their owning issue already records a reproduction.


## Founder acceptance of revised Q62-Q67, 2026-10-04

The founder replied "okay agreed what do we do next are there reaming decisons" after the live issue/PR/mobile alignment review. This accepts the revised Q62-Q67 recommendations as planning decisions. Earlier pending labels above describe the state at their checkpoint; this verdict supersedes those labels for Q62-Q67 only. Q40-Q45 remain pending.

- Q62: group related reports for the same reviewed issue/version, explicitly select and audit dispositions, recheck content changes and concurrent actions, and leave unrelated reports pending. Restoration does not automatically close reports or blindly reapply old complaints.
- Q63: bind Listing/photo evidence to server media ID and the reported fields/media revision. Distinguish Reported, Current and private submitted Correction. Capture protected evidence before ordinary cleanup, with authorized access. Local previews and public URLs do not establish retained evidence. Retention/deletion durations remain undecided.
- Q64: support reported text, image and Listing-reference Messages, with necessary authorized/audited attachment/reference evidence and the existing bounds of up to 10 preceding and 10 following Messages. Public Listing lookup grants no private Message/correction access. Wider context expansion remains undecided.
- Q65: separate grants for public enforcement, private correction reads, exact-version restoration approval, retained photo/Message evidence and related report resolution. Support needs an enforcement grant to enforce. Aggregate viewers receive aggregates only; diagnostic investigators receive pseudonymous diagnostics without private chat/contact content. Founder access/recovery remains distinct. Backend grants must enforce UI boundaries; grant lifecycle remains undecided.
- Q66: design the later owner restriction/correction/appeal journey within Active/Drafts/Archive, with affected content, safe reason and next step. Notices must persist independently of push. Optional generic push does not establish a new notification center. Keep reviewer neutral blocked-row and Help behavior until explicit phase admission and approved UI amendment.
- Q67: preserve generic report acknowledgement; later reviewed feedback may confirm disposition generically without exposing internal reasons, grouped private content, correction, appeal or restoration details. A full report-history feature is not automatically admitted.

This acceptance changes no production behavior, current issue acceptance criteria, canonical UI/PRD, immutable ADR, locked sprint or native evidence. Future phase admission, documentation approval and implementation shaping remain required.
