# AutoTM admin release scope audit and decision tree

Founder session checkpoint, 2026-10-04. Q46–Q61 were explicitly accepted. Q40–Q45 remain pending. Q40–Q45 remain pending. This records planning choices and source evidence, not an approved governing PRD, ADR, implementation instruction or release claim. The founder requested a handoff while usage was low, then resumed after the limit reset.

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

Read this record and issue checkpoints before asking new questions. Continue with Q62 onward in dependency-aware batches. Put a question in the next batch only when its prerequisites are settled. State recommendations clearly and wait for the founder's decision. Preserve previously accepted choices; do not silently treat the analytics prototype as approved.

Last-photo visibility, a private correction path for moderated Listings, suspension/public visibility policy, owner notices and initial review cadence were accepted in Q52–Q56. Continue with public reason categories, repeat abuse, appeal handling, restoration checks, report priority and related report disposition. Then resolve Message evidence, staff permissions, detailed evidence lifecycle and release phase boundaries. Review a Trust & Safety/Support prototype before production work. Governing documentation and any superseding ADR must be approved through the repository shaping workflow.

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

## Accepted dependent batch Q52–Q56

- Q52: Public Listings require at least one usable photo. Staff removal must be permitted even for the final photo; hide a zero-photo Listing until correction. Prevent owner last-photo removal while public unless replaced in the same saved change.
- Q53: Permit private correction submissions for a moderated Listing, with an operator approving restoration after checking the correction. Keep ordinary publication immediate. Uncorrectable fraud/unsafe offers use appeal, not automatic restoration.
- Q54: Keep ordinary User suspension separate from Listing visibility, but give staff an explicit separately audited action to hide all currently public Listings when the seller poses a fraud/safety risk. Lifting suspension must not automatically republish hidden Listings.
- Q55: Provide an owner-visible moderation notice with a safe public reason category, affected Listing/photo, required next step and Help/appeal entry. Keep reporter identity, private evidence and internal notes hidden. Delivery channel and exact copy follow later.
- Q56: Founder checks urgent reports promptly during staffed hours and performs one daily ordinary-report/new-or-edited-Listing review during the small Ashgabat pilot. No mandatory prepublication approval or overnight response promise; later staffing thresholds remain pending.

The founder explicitly answered "okay accpeted" to all five recommendations. These are accepted planning decisions, not implemented behavior. Exact restoration state, appeal handling, repeat abuse, evidence lifecycle and phase admission remain to be decided. Q40–Q45 are still pending.


## Decision log continuation

2026-10-04: Q52–Q56 accepted as a complete batch. Preserve private correction and operator approval without introducing general prepublication moderation. Explicitly hiding risky seller Listings is a separately audited action; unsuspension does not imply republication. Production state representation and governing documentation are unresolved. No production files changed.


## Accepted dependent batch Q57–Q61

The founder answered "okay agreed" to all five recommendations. This checkpoint records planning decisions, not implementation or completed governing documentation approval.

- Q57: Public owner reasons cover photo/content problems, incorrect information/category, spam/duplicates, scam/safety concerns, harassment and other issues with an approved safe explanation. Each notice states the required next step. Internal notes remain separate.
- Q58: Ordinary correctable violations receive content removal and correction guidance. Deliberate reposting of removed content triggers staff review for stronger restrictions. Serious fraud/safety concerns allow immediate enforcement. Pilot escalation stays manual and reasoned.
- Q59: Link one Support case to each moderation decision; subsequent messages stay in that case. Suspended users retain appeal access. The accepted four staffed-hour target applies to first meaningful human response, not final resolution. The solo founder may review their own decisions; another moderator should review disputed decisions when staffing permits. Reviewer releases retain email/phone Help.
- Q60: An operator approves the exact correction version reviewed. Later edits require a new check before restoration. Require usable photo and valid Listing information, preserve sold/archived status, and check other publication restrictions.
- Q61: Prioritize credible safety threats/ongoing fraud, then account access/appeals, then ordinary content problems. Work oldest first within each group. Multiple reports draw attention but never by count alone automatically hide content or suspend someone.

The older PRD65 absolute action-time expectations and report-volume alert suggestions need reconciliation with staffed coverage and the accepted priority rules during canonical shaping. No existing ADR or PRD was changed by this checkpoint.

## Completed report-resolution and freshness source audit

Read-only source/test inspection after continuation, no tests run and no live reproduction:

- CreateReport pending dedupe is per reporter/target, not reason or content revision. Other reporters can submit separate reports. Schema lacks a pending-report uniqueness constraint, so concurrent duplicate creation is possible by source inference. Source: apps/api/src/modules/admin/application/CreateReport.ts:138; apps/api/src/modules/admin/infrastructure/PrismaContentReportRepository.ts:43; packages/db/prisma/schema.prisma:750.
- BanListing resolves only the explicitly supplied report. Direct ban resolves none; sibling pending reports remain. Unban does not touch them. Old sibling reports can become actionable after restoration, by source inference. Source: BanListing.ts:129; DismissReport.ts:63; UnbanListing.ts:68 under apps/api/src/modules/admin/application.
- Listing reports have no reported-content/photo snapshot or revision marker. GetReportDetail reads the current target summary. Message reports have a separate messageContext snapshot. Source: apps/api/src/modules/admin/domain/ContentReport.ts:36; application/CreateReport.ts:157 and GetReportDetail.ts:108 in the same module.
- Ban/unban write adapters guard target status but not reviewed content revision. Unban does not validate photo count, contact or owner restrictions. Report resolution checks pending before the transaction and writes by ID alone, lacking an atomic pending predicate. Source: apps/api/src/modules/listings/infrastructure/PrismaListingsAdminRepository.ts:10; apps/api/src/modules/admin/infrastructure/PrismaContentReportRepository.ts:111.
- A stale owner EditListing can overwrite a newer banned status, by source inference: it reads and reconstructs observed status then its repository writes by ID alone. Attach/remove likewise check banned status before separate media mutation. This is a safety concern to reproduce and fix through issue/shaping workflow, not a verified incident. Source: apps/api/src/modules/listings/application/EditListing.ts:58 and146; apps/api/src/modules/listings/infrastructure/PrismaListingRepository.ts:94.
- Ordinary RemoveMedia deletes its row/adopted upload and attempts owned-object cleanup. It writes no moderation audit or retained evidence. Old deleted upload keys cannot be reused, but a newly uploaded copy of the same image bytes is not blocked by image hashing. Source: apps/api/src/modules/listings/application/RemoveMedia.ts:59; infrastructure/PrismaListingMediaRepository.ts:77; presentation/MediaOwnership.e2e.spec.ts:484 in the same module.

Earlier statements about stale/conflicting failure safeguards should be read narrowly: target status guards exist, but atomic report resolution and owner-edit races are unresolved source findings. Do not claim complete concurrency safety.

Next frontier concerns related report disposition, reported-versus-current evidence, private Message scope and reporter feedback. Staff grants/revocation and notice delivery source facts are being gathered separately. Evidence retention/deletion, exact phase admission and prototype review remain pending.


## Completed staff access and notice delivery source audit

- Current User.role is a single enum; the moderator enum alone does not grant AdminGuard access. All guarded admin moderation, report details, audit and inspection-interest aggregates require current admin role plus matching live elevated session. No per-person scoped staff grants or founder-only grant management ship. Source: packages/db/prisma/schema.prisma:15 and47; apps/api/src/common/admin.guard.ts:46; apps/admin/src/app/actions.ts:86.
- Every elevated admin can currently receive private Message report context. There is no separate private-evidence permission. Aggregate-only viewers cannot safely be onboarded by assigning the existing admin role. Source: apps/api/src/modules/admin/application/GetReportDetail.ts:140; ReportsController.ts:182 in that module.
- TOTP elevation lasts12 hours; backup-code consumption/elevation is transactional. Demotion/session deletion/expiry/elevation expiry blocks the next guarded admin request, but does not cancel in-flight actions. Ordinary JWT routes do not reread sessions. Admin TOTP endpoints check JWT role rather than current role, leaving a narrower stale-role concern. Source: apps/api/src/modules/identity/application/VerifyAdminTotp.ts:18; apps/api/src/common/admin.guard.ts:46 and61; common/jwt-auth.guard.ts:54; identity/presentation/AdminAuthController.ts:108.
- Manual operator recovery is required when both TOTP device and backup codes are lost. No founder grant UI, last-founder protection or self-service recovery exists. Source: docs/prd/ops/86-admin-bootstrap-runbook.md:23; packages/db/src/promote-admin.ts:71.
- No shipped in-app notification inbox exists. The mobile notifications screen manages device permission/settings; notification endpoints manage device tokens. NotificationHistory/readAt/schema/contracts are not proof of a history/read-state UI. Source: apps/mobile/app/notifications.tsx:16; apps/api/src/modules/notifications/presentation/notifications.controller.ts:42; packages/db/prisma/schema.prisma:691.
- Direct Message push has queue/worker transport, but its decision use-case suppresses online/muted recipients before writing history. Reusing that decision logic would lose required durable moderation notices. Moderation needs a distinct notice producer/job and durable owner-visible decision record; transport reuse alone is not full delivery proof. Source: apps/api/src/modules/notifications/application/DecideDirectMessageNotification.ts:54 and72; apps/worker/src/queues/notification-fanout.processor.ts:24.

Read-only source inspection only; no tests or production/device delivery checks were run. These facts do not change accepted governing ADRs.

## Next proposed frontier Q62–Q67, not accepted

- Q62: Group related reports for review, permit explicit audited resolution of selected reports concerning the same reviewed issue, keep unrelated issues pending, and recheck current content before enforcing an old report. Restoration does not automatically close reports.
- Q63: Capture a minimal reported Listing version and selected relevant photo as protected case evidence; show current content separately and label changed/deleted/unavailable evidence. Evidence is not telemetry; retention/deletion policy follows after capture scope is settled.
- Q64: Limit private Message inspection to the reported Message plus up to20 nearby Messages in the same conversation. Display attachments only when relevant; audit private-evidence access. Further context comes through a reasoned case process, not arbitrary inbox browsing. Exact expansion rules remain later scope.
- Q65: Founder controls grants/recovery; moderators handle public-content enforcement; private Message evidence requires an additional grant; Support handles cases and requires a moderation grant for enforcement; aggregate viewers see aggregates only; diagnostic investigators see authorized pseudonymous diagnostics without private chats/contact content.
- Q66: Persist owner moderation decisions on account/Listing surfaces regardless of push availability; use optional generic push as a hint/deep link with no sensitive detail. Build no broad notification center as an automatic requirement. Reviewer Help and later Support remain phase-separated.
- Q67: Reporters retain submission acknowledgement and may receive a generic reviewed state after disposition, without reporter counts, private action reasons, owner appeal details or full case access. A report history/product inbox remains separately scoped.

All six are recommendations only. Exact role grant lifecycle, evidence retention/deletion, Message enforcement, notice copy/translations and launch phase admission are unresolved.


## Founder release, application scope and UI constraint, 2026-10-04

Founder steering: "make sure to keep this in mind with our release scope and overall scope of the application our ui and impact of these changes". This requires explicit cross-application impact and phase admission for every decision. It does not accept Q62–Q67 or approve new production UI. Highest accepted question is Q61; Q40–Q45 and Q62–Q67 remain pending.

### Release boundaries rechecked

Sources re-read: live #320 and #608 on2026-10-04; docs/prd/03-roadmap.md; locked docs/prd/sprints/sprint-11-railway-deployment.md; ADR0051; ADR0037; app overviews and affected PRDs. No release map, locked sprint or governing ADR was edited.

| Delivery boundary | Settled scope | Treatment of current admin decisions |
|---|---|---|
| First reviewer-only Android submission | Railway, seeded reviewer accounts, public signup disabled, approved whole-app redesign/core journey and physical Android evidence; existing report/block/moderation/enforcement proof | Preserve existing proof. Analytics, GlitchTip, TM VPS and Support chat stay deferred as already accepted. New admin scope does not automatically expand the reviewer gate. Defects affecting admitted flows still need safety/correctness triage; do not blanket-defer them as new features. |
| First real-user Ashgabat pilot |20 invitees after accepted monitoring/disclosure/delivery/incident/recovery and phase-specific readiness gates | Decide the minimum safe operator and user correction/appeal experience explicitly. Six console areas are a requirements map, not six completed apps or automatic blockers. Exact admission of each proposed capability remains pending. |
| Ashgabat50, Mary and later growth | Evidence-based expansion and manageable Support; later cities retain their accepted entry rules | Add staff/grant tooling, broader workflows or automation when admitted by need/capacity. Verify aggregate-only and private-evidence boundaries before granting those accesses, regardless of whether a full staff-management UI exists. |

The scope ledger must distinguish existing defect repair, accepted new behavior, pending recommendation and later bet. Proposed pilot/later placement is not a founder-approved gate until explicitly settled. No delivery date or reliable cost estimate can be derived from this planning record alone.

### Product and UI impact map

| Application area | Required impact analysis before shaping/implementation |
|---|---|
| Internal admin | Actual media/evidence detail, report disposition, selected-photo removal, safe action confirmation, current versus reviewed version, restoration checks, public reason versus internal notes, audit and separately granted access. Console scope is wider than the improvement mock; its approved screen plan remains unfinished. |
| Seller My listings and Listing detail | Sellers must find restricted Listings and understand affected content, visibility, next step and correction/appeal state. Keep hidden corrections private; preserve sold/archived intent; reconcile counts/status and stale actions. Current active/sold/archived filters omit banned items. |
| Sell/photo editor | Maintain at least one usable public photo; coordinate replacement and final Save with existing staged-upload/editor behavior. Failure, retry and concurrent staff enforcement must not reveal an unapproved correction or undo a ban. Ordinary publication remains immediate. |
| Buyer discovery, Favorites and Listing/contact views | Apply public hiding consistently to feed/search/detail, media presentation, Favorites and contact eligibility. Reconcile loaded/cached screens after unavailable/changed state; fresh backend enforcement does not prove cached UI safety. Preserve results/filter/scroll behavior. |
| Conversations | Existing history/readability, listing preview/gallery, Call/new Message eligibility, reported Message image/context and moderation status must agree with Listing/User restrictions. Product chat and future Support stay distinct. |
| Profile, Cabinet and Help | Show meaningful restriction guidance and the appropriate existing Help or future appeal route while retaining sign-in/account-deletion access. Cabinet stays a menu; no new Settings screen, sixth tab or automatic broad notification center. |
| Public web/share | Legal/deletion pages may need truthful policy updates. Public Listing pages and App Links are not shipped in this baseline; Share/Copy remain hidden in reviewer scope. Do not add a public web marketplace as an incidental admin dependency. Future shared pages must enforce the same visibility policy. |
| Product analytics and diagnostics | Hiding changes publicly eligible inventory and contact denominators. Distinguish ordinary publish, correction submission and restoration in approved metric contracts. Private report text/photos/Message evidence/internal reasons remain case content, not product telemetry or diagnostics. |
| API, storage and worker | Cross-context policy, immutable/reviewed revisions, atomic target/report/audit changes, restricted evidence reads, cleanup/retention/deletion/recovery and optional notice delivery are real work behind the UI. Do not assume existing public-photo storage or direct-message push decisions already implement private evidence and durable notices. |

Preserve cars-first scope, five-tab navigation, anonymous browsing/auth-on-action, Auto.ru structural discovery, AutoTM tokens, supported RU/TK/EN mobile copy, accessibility/theme/loading/error states, and the accepted Turkmen "akkaunt" terminology. Exact initial admin language Q45 is still pending. Moderation approval does not establish vehicle inspection/verification or a trust badge. The assigned name/avatar/Profile verdict remains separate from the future restricted-account UI design.

### Overall-product conflict that must be resolved

ADR0037 explicitly makes the first real-world test a trust/inspection pilot replacing a generic10–50 beta, with5–10 manual concierge inspections and an on-ground requirement. The later accepted20-user Ashgabat marketplace pilot has not yet specified its relationship to that test. Preserve both recorded intentions, flag their sequencing conflict, and settle whether the app pilot is a controlled operational stage supporting a separate inspection test or a changed launch strategy. A TM equipment/connectivity handler is not automatically a qualified mechanic/inspector. Existing immutable ADR text cannot be silently rewritten; a changed governing decision needs approved supersession. Inspection-demand capture is not inspection booking, completed inspections, payments or a new inspector app.

### Design and acceptance procedure

For each remaining decision record purpose, actor/permission, affected screens/APIs, existing/new behavior, reviewer/pilot/later disposition, dependencies, privacy/data lifecycle, failure/stale/offline states, operational burden, and concrete acceptance evidence. If a change alters approved UI, show its before/after journey and revise the owning design through review. Prototype the integrated report→evidence→action→seller notice/correction→appeal→restoration flow before production implementation. The English improvement mock and accepted Profile interaction prototype do not approve the full admin or mobile moderation design.

Canonical destinations remain the owning mutable Listing, Identity, Conversation, Admin, notification and Support specifications/flows, approved UI designs and required new/superseding ADRs. The checkpoint is not a second governing specification. Reviewed shaping must precede executable feature slices. Reproduced defects affecting current release scope follow the existing coding workflow. Preserve other chat ownership; do not duplicate its implementation queue or send it messages without founder authorization.


### Additional source evidence for UI impact

Read-only UI audit completed, with no tests or device reproduction. Current Edit Save applies field update, attachment, removal and reorder sequentially; replacements attach before removals, but the sequence does not atomically enforce public minimum-photo or an operator-approved revision. See apps/mobile/src/listings/edit/useSaveListingEdit.ts:337.

Gallery removal affects cover/count/order and the full-screen viewer's selected item. Changes must reconcile buyer cards, Favorites, detail, Conversation preview and owner management. Existing buyer404 UI supplies unavailable/Home/Back, while owner moderation/correction states need design. See apps/mobile/app/(public)/listings/[id].tsx:64; apps/mobile/src/listings/components/ListingDetail.tsx:173; apps/mobile/app/listings/manage.tsx:34.

Source-inferred cache/contact risks: detail inherits30-second freshness and lacks route-focus refresh; Call uses a cached phone locally. Conversation Call checks cached active status but does not check detail.error, so old active data alongside failed refetch can still provide Call. Backend hiding cannot revoke a phone already delivered to a person/device. Verify fresh public eligibility and reconcile cached UI/action availability; do not promise that server enforcement erases previously viewed content. See apps/mobile/app/_layout.tsx:55; apps/mobile/src/api/listings/useListingDetail.ts:7; apps/mobile/src/listings/components/ContactCtaBar.tsx:57; apps/mobile/src/conversations/useConversationCallPhone.ts:18. Reproduction and release-admission triage remain pending.

The audit confirmed that current backend Message report context is not rendered by the admin detail UI and that Listing action pages lack a gallery. Protected evidence, owner correction and notices therefore affect both internal and public product journeys. Exact hidden-zero-photo Conversation behavior remains unresolved and must not be inferred from existing banned/sold/archived rules.


## Live issue/PR/wizard alignment replaces the generic scope reminder

The founder clarified that alignment requires reading actual current issue scopes, PR source and mobile Listing/posting UI. Completed read-only audit: [admin/mobile release alignment](admin-mobile-release-alignment-2026-10-04.md), pinned to remote main ecf95306 and the individually captured open PR heads. It distinguishes accepted target, merged source, unmerged implementations and missing native/runtime evidence. No old issue/PR criteria were changed.

Key conflicts: #587/PR596 approved a neutral blocked row without actions/reasons/appeals, while accepted Q53/Q55/Q57/Q59 need a separately admitted future correction/notice/appeal journey. #589 ordinary editing excludes edit-triggered review; private correction cannot simply use public Save. Main still has eight wizard steps; seven-step target is PR597, with separate unfinished Photos/exit/Check/contact/Details slices. Proposed correction quota/count behavior is a new unresolved choice. Snapshot/media revision must cover media/order, not only Listing.updatedAt. PR579 supports reported image and Listing-reference Messages; current admin snapshots omit their metadata. ADR0057 already defers in-app inspection-demand UI.

Pending Q62–Q67 should be read with the audit's amended recommendations. They remain unaccepted. Do not silently alter current reviewer blocked-row/editor scope, consume normal Sell draft slots for corrections, add another tab, restore inspection CTA or treat historical PR572 screenshots as current-head proof. The scope record is dated evidence, not a governing replacement specification. Recheck live PR/issue state before implementation dispatch.


## Founder acceptance of revised Q62-Q67, 2026-10-04

The founder replied "okay agreed what do we do next are there reaming decisons" after the live issue/PR/mobile alignment review. This accepts the revised Q62-Q67 recommendations as planning decisions. Earlier pending labels above describe the state at their checkpoint; this verdict supersedes those labels for Q62-Q67 only. Q40-Q45 remain pending.

- Q62: group related reports for the same reviewed issue/version, explicitly select and audit dispositions, recheck content changes and concurrent actions, and leave unrelated reports pending. Restoration does not automatically close reports or blindly reapply old complaints.
- Q63: bind Listing/photo evidence to server media ID and the reported fields/media revision. Distinguish Reported, Current and private submitted Correction. Capture protected evidence before ordinary cleanup, with authorized access. Local previews and public URLs do not establish retained evidence. Retention/deletion durations remain undecided.
- Q64: support reported text, image and Listing-reference Messages, with necessary authorized/audited attachment/reference evidence and the existing bounds of up to 10 preceding and 10 following Messages. Public Listing lookup grants no private Message/correction access. Wider context expansion remains undecided.
- Q65: separate grants for public enforcement, private correction reads, exact-version restoration approval, retained photo/Message evidence and related report resolution. Support needs an enforcement grant to enforce. Aggregate viewers receive aggregates only; diagnostic investigators receive pseudonymous diagnostics without private chat/contact content. Founder access/recovery remains distinct. Backend grants must enforce UI boundaries; grant lifecycle remains undecided.
- Q66: design the later owner restriction/correction/appeal journey within Active/Drafts/Archive, with affected content, safe reason and next step. Notices must persist independently of push. Optional generic push does not establish a new notification center. Keep reviewer neutral blocked-row and Help behavior until explicit phase admission and approved UI amendment.
- Q67: preserve generic report acknowledgement; later reviewed feedback may confirm disposition generically without exposing internal reasons, grouped private content, correction, appeal or restoration details. A full report-history feature is not automatically admitted.

This acceptance changes no production behavior, current issue acceptance criteria, canonical UI/PRD, immutable ADR, locked sprint or native evidence. Future phase admission, documentation approval and implementation shaping remain required.


## Next founder frontier, Q68-Q71, pending

These recommendations remain unanswered. Their prerequisites are the accepted correction, evidence, exact-version restoration and cross-application alignment principles.

- Q68 correction workspace/counts: recommend a private correction workspace attached to the original Listing, excluded from the five ordinary Sell draft slots and normal Drafts count. Limit it to one editable correction and one submitted version per restricted Listing. Submission does not create or publish another Listing.
- Q69 editing during review: recommend an immutable submitted correction snapshot. Allow further edits to the private working correction without changing what staff are reviewing or publishing those edits. A new submission replaces the reviewed version only through an explicit version transition; cancellation/replacement mechanics depend on this answer and belong to the next frontier.
- Q70 hidden Listing contacts: recommend readable existing Conversation history, but no new Conversation, new Message or Call while moderation hides the Listing, including removal of its final usable photo. Apply the existing unavailable restriction language. Ordinary sold/archived messaging remains governed by its existing accepted policy. Reconcile cached UI and enforce eligibility on the backend.
- Q71 restoration contact eligibility: recommend reusing publish/relist contact eligibility checks at actual restoration. If confirmation has expired, retain the approved correction privately and route the owner through the existing Contact confirmation flow. Restore only the approved content after current eligibility passes. Price-only ordinary edits retain ADR0081's existing no-reconfirmation policy.

After these answers, remaining branches include correction submission/cancellation and locked identity edge cases, evidence lifecycle/deletion, staff grant/revocation/recovery, Message enforcement, queue operations, exact release admission, the ADR0037/pilot relationship, and Q40-Q45 improvement prototype choices. Then prototype the integrated journey and seek approval for governing specifications/required new or superseding ADRs before implementation.
