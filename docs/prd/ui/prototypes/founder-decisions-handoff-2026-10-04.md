# AutoTM admin release scope audit and decision tree

Founder session checkpoint, 2026-10-04. Q46–Q51 were explicitly accepted. Q40–Q45 remain pending. This records planning choices and source evidence, not an approved governing PRD, ADR, implementation instruction or release claim. The founder requested a handoff while usage was low, then resumed after the limit reset.

## Evidence boundary

Checkout commit: 4fbd8db5d0a63037e48703a2a5392bf38cf45fc3. That commit adds only the accepted Profile prototype over the inspected main baseline. The admin-improvement prototype is a draft mock artifact preserved on codex/prototype-decisions-2026-10-04. Its interaction decisions Q40–Q45 are not approved. Existing production code was not changed. Source and existing tests were inspected; release tests, production behavior and live data were not verified.

## What changed in the photo-review model

- Founder decision #328 removed unused ListingStatus.reported, implemented by #497 / PR #498. A report is a separate ContentReport, not a Listing publication state.
- pending_review and rejected remain reserved schema/contract values. Their presence does not establish an approval workflow.
- PublishListing creates active immediately after technical/payload/contact/media checks. Upload provenance, object metadata and variant generation do not screen objectionable image contents.
- NullContentClassifier accepts images. AttachMedia's rejected-classification branch is a future seam, not a functioning moderation service or queue.
- PRD32 line232 states immediate publication and reactive moderation. ADR0024 permits owner photo corrections without prepublication re-review in Phase1. Changing this requires an explicit governing decision, not merely restoring an enum value.

Sources: docs/prd/features/32-listings.md:223–234; docs/adr/0024-owner-post-publish-photo-editing.md; apps/api/src/modules/listings/application/PublishListing.ts:247–267; apps/api/src/modules/listings/infrastructure/NullContentClassifier.ts; packages/db/prisma/schema.prisma:364–372; https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/328.

## Current operator capabilities and gaps

| Area | Current source behavior | Gap or decision for the wider release |
|---|---|---|
| Authentication | OTP, TOTP/backup codes, session elevation, server-side cookies; admin guard | No scoped staff/read-only access management. Analytics viewers are approved future scope, not a shipped role. |
| Reports | Pending/actioned/dismissed queue, oldest-first pagination, listing/user filters; target summaries and report details | No built-in listing gallery, searchable target directory, assignment/severity/age views. Assignment and SLA expansion are product choices. |
| Enforcement | Dismiss, Listing ban/unban, User suspend/unsuspend, internal reason, transactional audit/report resolution | Known-ID action forms are not evidence review pages. Per-photo enforcement, warnings/correction, temporary restrictions and appeals need explicit policy. |
| Message reports | Participant report API with text and bounded surrounding-message snapshots; message target backend support | Admin does not render messageContext, filters omit messages, and message image kind/metadata are absent from saved context. A message report cannot be passed to the current user-target report-backed suspend operation. |
| Listing and photo inspection | Public listing/media and lean report target summary | No protected admin gallery, approval queue, individual-photo action or content-screening implementation. Report-linked evidence preservation/deletion remains a decision. |
| Audit | Moderation action list, actor/target/reason summaries; audit failure rolls back moderation | No detail/diff UI. Catalog event names/Brand/Model targets exceed current audit filter/link handling; catalog rows can link to reports incorrectly. |
| Catalog | Brand-logo list/upload/replace/remove; backend brand/model CRUD | Essential correction UI versus full taxonomy editor must be scoped; the broad PRD does not establish shipped UI. |
| Analytics | Inspection-interest aggregate table; new mock improvement walkthrough | General product/reliability scorecard and audited pseudonymous investigation remain unbuilt and require reviewed design and contracts. |
| Support | Accepted planning decisions and prior prototype #500 | No Support context/module or matching Support case model was found in the inspected API/admin/schema. Release timing and operational integration must be explicit. |
| Other operations | Existing flags and runbooks | No admin control UI for feature flags, incident/recovery drills, SMS fleet, budgets or alert routing. Do not assume a dashboard makes dangerous operations safe or production-ready. |

Source entry points: apps/admin/CONTEXT.md; apps/api/src/modules/admin/CONTEXT.md; apps/admin/src/app/(admin)/reports/[id]/page.tsx; apps/admin/src/app/(admin)/listings/[id]/page.tsx; apps/admin/src/app/(admin)/users/[id]/page.tsx; apps/api/src/modules/admin/application/CreateMessageReport.ts; apps/api/src/modules/admin/application/GetReportDetail.ts; apps/api/src/modules/admin/application/SuspendUser.ts; apps/admin/src/app/(admin)/audit/page.tsx; apps/api/src/modules/admin/application/ListAuditEntries.ts; apps/api/src/common/admin.guard.ts.

## Constraints already accepted

Preserve the Ashgabat20→50 then Mary admission plan, real-user monitoring gates, reviewer release deferral of analytics/Support chat, first-party measurement boundaries, account/guest separation, staffed incident schedule and provisional budgets. Existing moderation report/action switches remain separate. User suspension does not automatically ban all their Listings; unban does not automatically resolve reports. Do not infer analytics access from staff moderation access, or private Message access from pseudonymous diagnostic access. Trusted TM equipment handler is a planned physical/connectivity role, not a blanket staff permission.

Google Play's current UGC policy requires ongoing moderation, reporting/blocking functionality appropriate to the UGC experience, and terms acceptance before content creation/upload. It does not mandate a specific admin page layout or say that every photo must await manual approval. Source: https://support.google.com/googleplay/android-developer/answer/9876937?hl=en, checked 2026-10-04. Exact native reporting/blocking/terms and enforcement evidence still needs a release audit. This report does not certify store acceptance.

## Accepted scope framework, Q46

Treat the existing moderation admin and the analytics prototype as parts of one operator workspace. Shape Trust & Safety, Support/appeals, marketplace improvement, reliability/incident evidence, essential catalog maintenance, and staff access/audit. Decide which capabilities block the first real-user pilot and which are later growth work. Preserve existing first-reviewer boundaries; do not admit every broad PRD40 feature automatically.

## Accepted foundation decisions, Q46–Q51

- Q46: Integrated operator scope. Accepted: shape one console spanning Trust & Safety, Support/appeals, Improvement, Reliability/operations, essential Catalog maintenance and Access/Audit; label reviewer, pilot and later-growth requirements separately. Preserve the controlled Ashgabat rollout and already accepted release gates.
- Q47: Publication approval model. Accepted: retain immediate publication after technical checks and strengthen post-publication evidence/review, explicit enforcement and appeals; no mandatory approval gate for every photo at the pilot stage. Proactive-review cadence follows after this choice.
- Q48: Enforcement on published media. Accepted: allow targeted removal of an isolated offending photo, whole-Listing ban for a fraudulent/unsafe Listing, and separate User suspension for account abuse. Exact minimum-photo, correction, restoration and reupload behavior follows after this principle is settled.
- Q49: Private-content investigation principle. Accepted: report-linked access to the reported Message and bounded relevant context/attachments, with scoped authorization and recorded access, rather than an unrestricted private-inbox browser. Evidence fields, retention/deletion and cases follow.
- Q51: Staff permission model. Accepted: separate founder control, moderation/Support operator rights, aggregate viewers and explicitly authorized diagnostic investigation. Bind grants to actual individuals; verify permissions before onboarding. Exact permissions and role management follow.
- Q50: Operator evidence and lookup. Accepted: searchable Listings/users and protected target detail with actual media/current state/related moderation history, including actionable banned/suspended targets, before destructive/restrictive actions. Exact search fields and evidence states follow.

## Dependent rounds to resolve

1. Trust & Safety: content/report categories, urgent versus ordinary review, proactive review cadence, duplicate/sibling reports, assignment/oldest-first, freshness of content after edits, individual-photo removal versus Listing ban, all-photos-removed behavior, reuploads, warning/correction, suspension versus hiding existing Listings, Message/sender enforcement, appeals and notices.
2. Evidence: selected photo identification, reported-image metadata, bounded chat context, current versus reported version, authorized protected reads after a ban/deletion, retention and erasure rules, read/export audits, content storage versus telemetry exclusion.
3. Staff: who can read report contents, inspect private content, moderate, answer Support, edit catalog, inspect analytics, export, change access or operate flags; TOTP, revocation, founder recovery and operational coverage.
4. Console structure: shared home/work queues, searchable directories, Trust & Safety detail, existing audit and catalog integration, Support linking, analytics tabs/drawers and independent visibility rules. Revisit Q40–Q45 within this settled scope.
5. Release boundary: reviewer minimum, pilot blockers, current concrete UI/API mismatches, later growth gates, rollout and migration, public terms/disclosures, staffed expectations, failure/recovery paths.
6. Later bets: full catalog editing, dealerships, broadcasts, SMS controls, bulk moderation, automatic screening/review holds, fraud detection and long-term moderation intelligence. Explicitly admit/defer each; do not treat PRD listing or placeholder code as commitment.

## Delivery sequence

After each accepted round, save the decisions without claiming implementation. Build a Trust & Safety/Support walkthrough covering report→actual photo/Message evidence→action→audit→user notice/appeal and the failure/stale states. Review console integration with the existing analytics walkthrough. Fold approved behavior into owning mutable PRDs/flows and write a superseding ADR where publication, ownership or existing architecture changes. Preview and approve the full documentation diff before a shaping PR. Only after its review/merge create executable slices with meaningful acceptance evidence, then implement and verify the release gates. Locked sprint plans and accepted ADR text remain unchanged.


## Acceptance and pending boundaries

The founder answered "okay agreed" to the complete Q46–Q51 batch. Record all six as accepted. The later continuation resumes grilling; it does not approve Q40–Q45, a production implementation, or every proposed admin capability as a launch blocker.

Q40–Q45 remain unanswered:

- Q40: Improvement tabs Overview, Journeys & returns, Reliability & fixes, with Overview first.
- Q41: Evidence drawer that preserves the dashboard filters.
- Q42: Seven completed UTC days versus the preceding seven; Today separate; comparisons withheld when collection is incomplete.
- Q43: Short reason before detailed diagnostic timeline reads/exports, with both audited.
- Q44: Existing GitHub issues for fixes, owner/status/evidence links and manual verification.
- Q45: Russian initial production admin, matching the existing app; Turkmen/English as staff needs develop. Prototype English is a draft convenience.

## Last checked media and restriction facts

- PublishListing requires at least one attached photo, application schema line64.
- RemoveMedia has no remaining-photo-count check and does not change Listing status. Its current behavior permits removing the last photo from an active Listing. The existing unit case removes a sole photo.
- RepublishListing checks the archived transition, contact and exchange rate, but does not check photo count. An archived zero-photo Listing can therefore be republished through the current application behavior.
- EditListing, AttachMedia, RemoveMedia and other owner mutations reject banned Listings. Sellers cannot currently correct a banned Listing through those paths.
- BanListing accepts active only; UnbanListing restores banned to active. They do not preserve and restore a previous sold/archived status.
- User suspension does not automatically ban or hide their Listings. Current restrictions on new contact/messages and marketplace mutations are distinct from public visibility.
- Notice/appeal source audit was completed after continuation; findings are recorded below. No runtime verification was performed.

Source entry points: apps/api/src/modules/listings/application/RemoveMedia.ts; RepublishListing.ts; EditListing.ts; apps/api/src/modules/admin/application/BanListing.ts; UnbanListing.ts; SuspendUser.ts. These findings describe inspected source, not live runtime verification.

## Portable resume instructions

Read this record and issue checkpoints before asking new questions. Continue with Q52 onward in dependency-aware batches. Put a question in the next batch only when its prerequisites are settled. State recommendations clearly and wait for the founder's decision. Preserve previously accepted choices; do not silently treat the analytics prototype as approved.

Start with last-photo visibility, a private correction path for moderated Listings, suspension/public visibility policy and photo reupload handling. Then resolve notices, appeals, review cadence, Message evidence, staff permissions and release phase boundaries. Review a Trust & Safety/Support prototype before production work. Governing documentation and any superseding ADR must be approved through the repository shaping workflow.

## Earlier decisions to preserve

The detailed acceptance records are in the linked issues. This abbreviated index is intended to prevent reopening settled choices.

- Launch Ashgabat with 20 invited users, aiming for ten sellers and ten buyers. After at least two weeks of actual activity, stable core journeys, no unresolved critical issues and manageable Support, expand to 50 total. Mary follows two stable weekly reviews of the 50-user stage, five committed Mary sellers and ten real Listings, starting with 20 invitees.
- Early-city review minimums are ten real public active Listings from five sellers and five Listings receiving qualifying contacts. These supplement technical/Support gates and do not prove completed sales or product-market fit.
- Founder learning cadence is five seller and two buyer conversations weekly in the first month. Use personal networks and voluntary referrals, with no paid campaign during the 20/50 stages. No agent is authorized to contact people.
- Use Turkmen "akkaunt" across web/mobile. Audience planning includes Turkmenistan, China, Russia, Turkey, UAE/Dubai, Uzbekistan, Georgia, Germany and South Korea. This is not automatic store distribution or nine required deployments.
- First Google Play reviewer submission stays Railway-only, with analytics, GlitchTip, TM VPS and Support chat deferred. Real-user invitations have separate monitoring, disclosure, delivery, recovery and phase-specific regional readiness gates.
- Chosen future measurement is first-party explicit product events plus self-hosted GlitchTip. No session replay/autocapture, private chat text, contact details, credentials/tokens, precise GPS, advertising IDs, contacts or keystrokes in telemetry.
- Raw product data retention is 90 days, diagnostics 30 days, nonidentifying aggregate retention 24 months. Guest installation/visit pseudonyms support at most 90-day continuity; only the current guest visit links at sign-in. Account/guest cohorts remain separate and do not count unique people.
- Collection/deletion rights and regional storage/transfer requirements still require validation. Accepted preference for broad default collection is not proof of an applicable collection basis. Support/moderation content is separate from product telemetry.
- Product visit ends after 30 minutes without foreground activity. Returns use exact UTC D1/D7/D30 with matured cohorts; seller reply window is 24 hours after the first accepted buyer Message; publish outcome window is seven days after draft start.
- Main contact measure uses starts divided by average publicly eligible active inventory; separate Call/new Conversation components and contacted Listings. Call primary counts once per measured account/guest installation, Listing and UTC day; chat counts new Conversation creation, not reopen. Calls indicate intent, not a completed call or sale.
- Combine groups below five measured accounts/installations; flag rates below 30 eligible starts as small samples. Protect against filter disclosure. Known QA/reviewer/demo/dev/test and own-Listing activity have separate treatment; genuine admin marketplace use counts.
- Founder is the sole incident responder, Monday–Friday 08:00–20:00 Shanghai time, weekends best effort. Urgent acknowledgement target 30 minutes and investigation start one hour during coverage. No automatic production rollback/pause. Telegram routing remains to be proven.
- Trusted TM equipment handler is planned, with identity/access to be verified before cutover. This is not a backup incident responder or an analytics/private-message grant.
- Provisional Railway two-environment estimate is USD50–75/month, ceiling USD100, including incremental monitoring USD15–25. TM monthly ceiling is TMT8000 including monitoring/storage/backup. Quotes and approval precede spending. Alert at projected 80 percent without cutting off core services.
- Recovery pilot targets are at most 24 hours of core data loss and four staffed hours to restore after declaration. Drills are unproven; targets are not public promises. Backup retention and deletion replay require reviewed contracts.
- Support later has separate context, AutoTM identity, TOTP staff, inbound/replies and reasoned one-to-one service/moderation outreach, no broadcasts/marketing. One compressed image up to 5MB, no other attachments/video. Reviewer Help is email/phone only.
- Support retained while open and for 90 days after latest closure; account deletion requirements apply. First meaningful human response target is four staffed hours from the oldest unanswered User Message. Followups and receipts do not reset it. Manual closure after 14 days waiting for customer input needs a notice; never close unanswered/investigating cases automatically.
- Restore #553 includes atomicity and confirmation/UI reconciliation before the signed candidate. Native evidence belongs to its owning work, not this planning checkpoint.

## Durable issue and prototype index

- Root scope and accepted admin foundation: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/602
- Services/budget: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/604
- Data boundaries/delivery: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/605
- Metrics/admin walkthrough: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/606
- Operation/coverage: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/607
- Release/pilot gates: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/608
- Support: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/500
- Profile accepted interaction verdict Q36–Q39: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353
- Terminology: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/427
- Restore: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/553
- Reviewer readiness: https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/320

Both prototypes are self-contained HTML under docs/prd/ui/prototypes. profile-identity-2026-10-04.prototype.html has an accepted interaction verdict on commit4fbd8db5; art/translations/native/accessibility remain unproven. admin-improvement-2026-10-04.prototype.html is a draft mock with sample data only. Browser walkthrough checks were performed, not production telemetry or authorization verification. Preserve the older prototype/cabinet-profile branch as separate broader coverage.

This checkpoint branch is codex/prototype-decisions-2026-10-04. It is not intended to merge mock artifacts into production. No production code, deployment, invitations, purchase, automation or other Codex chat was changed. Two earlier agents were stopped when requested; one narrow read-only notices audit was started after the founder resumed. Another Codex chat owns implementation/native evidence. Do not message it without founder authorization.


## Completed notice/appeal source audit after continuation

- Reports show submission acknowledgement only. Public report history/resolution notification is explicitly outside current PRD65 scope. Admin action reasons remain internal and action use-cases have no notification delivery dependency.
- PRD30 promises a generic account-suspension banner, but GetMe currently returns no suspension state and mobile Profile does not render it. Failed restricted actions provide generic error copy referring users to Support.
- Owner detail can read a banned Listing; non-owner gets404. Mobile listing management has only active/sold/archived status filters and omits banned Listings. Direct detail has no dedicated ban/help notice or banned translation. Delete remains exposed and fails through the API ban guard.
- Help currently provides email/phone only. No moderation-specific appeal case, prefilled decision reference, status tracking or response promise ships. Appeals via future Support remain planning scope.
- Suspension changes User suspension fields only. Public feed/detail/seller reads do not hide the seller's active Listings, photos, price or phone. Listing Call has no suspension signal. Existing private messaging restrictions do not prevent someone using a visible phone outside the app.

Source paths: apps/mobile/src/admin/components/ReportSheet.tsx:124; docs/prd/flows/65-admin-moderation.md:97 and106; apps/api/src/modules/identity/application/GetMe.ts:10; apps/mobile/app/profile.tsx:236; apps/mobile/app/listings/manage.tsx:45; apps/mobile/src/listings/components/ListingDetail.tsx; apps/mobile/app/help.tsx:73; apps/api/src/modules/identity/infrastructure/PrismaIdentityAdminRepository.ts:25. Governing intended behavior and shipped UI differ as described. No tests were run in this audit.

## Next proposed batch Q52–Q56, not accepted

- Q52: Public Listings require at least one usable photo. Staff removal must be permitted even for the final photo; hide a zero-photo Listing until correction. Prevent owner last-photo removal while public unless replaced in the same saved change.
- Q53: Permit private correction submissions for a moderated Listing, with an operator approving restoration after checking the correction. Keep ordinary publication immediate. Uncorrectable fraud/unsafe offers use appeal, not automatic restoration.
- Q54: Keep ordinary User suspension separate from Listing visibility, but give staff an explicit separately audited action to hide all currently public Listings when the seller poses a fraud/safety risk. Lifting suspension must not automatically republish hidden Listings.
- Q55: Provide an owner-visible moderation notice with a safe public reason category, affected Listing/photo, required next step and Help/appeal entry. Keep reporter identity, private evidence and internal notes hidden. Delivery channel and exact copy follow later.
- Q56: Founder checks urgent reports promptly during staffed hours and performs one daily ordinary-report/new-or-edited-Listing review during the small Ashgabat pilot. No mandatory prepublication approval or overnight response promise; later staffing thresholds remain pending.

These are recommendations to present to the founder, not settled behavior. Exact restoration state, appeal timing, repeat abuse, evidence lifecycle and phase admission depend on the answers.
