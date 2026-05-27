# 65 — Admin moderation flow

## Summary

A user reports a listing for spam / scam. Admin reviews, acts, and the audit trail is preserved.

**MLP status:** included in reduced form. The beta version covers listing/user reports, listing ban/unban, user suspension, and audit log. Message reports are included only if S6 explicitly ships report-from-thread; blog post reports, automatic reporter feedback, Telegram alerting, report assignment, and bulk operations are post-MLP unless they block safe beta operation.

## Goal

- Report-to-action: ≤ 24 hours (the longer it sits, the more harm)
- Every action traceable (audit log)
- Clear report submission success; resolution feedback is post-MLP unless notifications/feed work is explicitly shaped
- No reporter-facing report history, status tracking, edit, retract, appeals, or support workflow in S7

## Step-by-step

### Step 1 — User reports

- Maral is browsing; she sees a sus listing (e.g., price way too low, sketchy description)
- Tap menu on active non-owner listing detail → Report, or visible non-self public user profile → Report. S7 has no global report action and no message-report entry point unless S6 is explicitly reshaped to ship report-from-thread.
- If anonymous, she must log in first; S7 does not create anonymous reports. Mobile uses the existing auth-on-action pattern: resume the report sheet after login if cheap, otherwise return to the target detail and require one more Report tap.
- Modal: select reason (Spam / Scam / Misleading / Wrong category / Harassment / Other) + free-text details. The client sends canonical reason enum values and optional plain-text details.
- S7 stores reason as `ContentReport.reason`: `spam`, `scam`, `misleading`, `wrong_category`, `harassment`, or `other`. `wrong_category` is valid only for listing reports; `harassment` is valid for user reports. Details are optional except for `other`, where they are required. Details are trimmed before validation/storage, blank-after-trim `other` details are rejected, internal line breaks are preserved, and the max length is 1000 chars after trim. S7 treats details as plain text only: no Markdown/HTML, PII scanning, translation, profanity filter, or moderation classifier.
- Submit → API creates a `ContentReport` record with status `pending`
- Listing reports are accepted only for currently active listings. Missing/non-public listings return `NOT_FOUND`; visible but non-reportable listing states such as sold return `VALIDATION_FAILED` / `REPORT_TARGET_NOT_REPORTABLE`.
- User reports are accepted only for existing, non-deleted users reachable through a public surface. Suspended users remain reportable only while still visible/reachable. Visible admin users are reportable through the same public route; public report creation does not reveal or special-case staff role. Hidden or missing user targets return `NOT_FOUND`.
- If Maral tries to report her own profile or a listing she owns, the API rejects it with `VALIDATION_FAILED` / `SELF_REPORT_NOT_ALLOWED`; owner-facing UI should hide the report affordance where ownership is already known.
- If a suspended user submits a report, the API blocks it through the suspended-user mutation policy; mobile shows generic account-restricted copy, not report-specific suspension copy.
- S7 does not add a report-specific quota or custom report throttling rule. Public report routes rely on the global API throttler plus authenticated-only submission, suspended-user blocking, self-report rejection, duplicate pending dedupe, and no auto-hide-on-report. If queue spam appears during beta, per-reporter quotas and reporting-rate analytics belong in a post-MLP moderation-abuse PRD.
- If Maral already has a pending report for the same listing/user, the API returns HTTP 200 for that existing pending report instead of creating a duplicate. New reports return HTTP 201. Both use `{ reportId, status, createdAt, reusedExisting }`; `reusedExisting` tells the client whether a row was reused, but mobile shows the same generic success state for both cases and does not display report id, report status, or duplicate state. Duplicate reuse preserves the original `createdAt`, does not bump the report in the admin queue, and emits no report-created event. Other users can still report the same target. Public report responses do not expose other reporters' counts.
- Report targets are validated before insert, but stored as polymorphic `targetType` + `targetId` references. If the listing/user later disappears, admin report detail keeps the report and shows the target as unavailable.
- If the target becomes unavailable or non-reportable between page load and submit, mobile shows generic target-unavailable copy: "This item is no longer available to report."
- `reporterUserId` is required when the report is created, but historical reports survive later account deletion by nulling the reporter reference and showing "Deleted user." S7 does not store reporter phone/name snapshots on the report.
- Reporter state is not revalidated after submission. If the reporter is later suspended or deleted, the report remains pending/actionable/dismissible; deleted reporters render as "Deleted user," and suspended reporters are only current-state context for admins. Reporter-trust scoring and auto-invalidating abusive reports are post-MLP moderation-intelligence work.
- S7 does not change `Listing.status` or public visibility when a report is submitted; the listing stays visible until an admin bans it

### Step 2 — Admin sees it

- After TOTP elevation, S7 admins land directly on `/admin/reports`; `/dashboard` is post-MLP full-admin overview work
- Telegram alerting is post-MLP unless beta safety explicitly reshapes it
- The S7 report list defaults to `status=pending`, uses offset pagination, sorts oldest reports first by `createdAt ASC, id ASC` for deterministic ties, and allows only `status` + `targetType` filters. Invalid filters or invalid `page`/`pageSize` return `VALIDATION_FAILED`; the admin UI resets to the default pending queue. List rows expose exactly `id`, `status`, `createdAt`, `reason`, `targetType`, `targetId`, and `targetSummary`. `targetSummary` is live-resolved: listing targets use a display title such as year/make/model or listing title when available; user targets use a public display label when available; missing targets use an unavailable/deleted marker. They do not include report `details` preview text, reporter identity fields, full target state, counts, actionability flags, or `target.role`; full details, reporter summary, target state, counts, actionability, and role are available only on report detail. The pending queue uses a simple empty state; dashboard cards/analytics and a `status=reported` listing filter are post-MLP unless separately shaped

### Step 3 — Admin reviews

- The reported listing detail opens with moderation toolbar
- Shows: reporter summary or deleted-user state, target summary, report reason/details rendered as escaped plain text with preserved line breaks, status, timestamps, and the target's current moderation state. For listing targets, detail summary may include title/year/make/model/status. For user targets, the admin-only target summary includes `target.role` so admin-target suspension can be disabled/explained; public report creation and report list rows never expose this role. Reporter/reviewer summaries are live minimal identity summaries or deleted-user state; `ContentReport` stores no phone/name/profile snapshots.
- Shows simple counts only: pending reports on this exact target, and historical reports submitted by this reporter when the reporter still exists. `pendingReportsOnTargetCount` counts currently pending reports for the same `targetType` + `targetId`, including the current report if still pending. `reportsSubmittedByReporterCount` counts all historical S7 report rows by that reporter across listing/user targets and all statuses. Both counts are computed live when report detail loads; S7 does not add denormalized count columns, counter tables, client-side aggregate state, rolling windows, trust scores, severity scores, or public aggregate exposure.
- If the target disappeared after report creation, the report stays visible and shows target unavailable. If the reporter or reviewing admin account was later deleted, the detail shows "Deleted user" for that person.
- Does not show conversation excerpts, deep reporter/owner history, reporter reputation, cross-report clustering, or moderation-intelligence signals in S7

### Step 4 — Admin acts

Options:

| Action | Effect |
|---|---|
| **Dismiss report** | Pending report → `dismissed`; target untouched; `reviewedById`/`reviewedAt` set; no automatic reporter notification in S7 |
| **Ban listing** | Active listing → `banned`; if acting from a matching pending listing report, only that supplied report → `actioned` in the same transaction; hidden from public surfaces; new contact/messages blocked; existing conversations remain readable |
| **Unban listing** | Banned listing → `active`; no `previousStatus` restoration model in S7 |
| **Suspend user** | Unsuspended non-admin user → `suspendedAt`, `suspendedById`, and internal `suspensionReason` set; if acting from a matching pending user report, only that supplied report → `actioned` in the same transaction; future authenticated marketplace mutations blocked. Admin can separately ban listings if needed. |
| **Unsuspend user** | Suspended non-admin user → clears `suspendedAt`, `suspendedById`, and `suspensionReason`; full history remains in `AuditLog` |

If a pending report's target changes before review, dismiss remains available. Report-backed ban requires the listing still exists and is active; report-backed suspend requires the user still exists, is not deleted, and is not already suspended. If the target is no longer actionable, the API returns `CONFLICT` / `REPORT_TARGET_NOT_ACTIONABLE` with current target state when known; it leaves the report pending and writes no audit row.

Pending reports do not freeze target lifecycle in S7. Listing owners can still archive/delete their listings, and users can still delete their accounts through the normal identity flow. If the target disappears before review, the report stays visible with target unavailable, dismiss remains available, and report-backed ban/suspend returns `REPORT_TARGET_NOT_ACTIONABLE`. Target locks, moderation holds, and legal holds are post-MLP trust/legal ops work if needed.

Report-backed actionability is current-state only. A still-pending report is not invalidated by an earlier direct ban/unban or suspend/unsuspend cycle; if the target is currently actionable at review time, the report can be actioned. S7 does not add moderation epochs, report invalidation snapshots, or staleness-lock fields.

Direct moderation actions also re-check current target state at write time. Missing/deleted targets return `NOT_FOUND`; existing targets in the wrong state return `CONFLICT` / `MODERATION_TARGET_STATE_CONFLICT` with current state when known. These failed requests do not mutate the target or write audit rows.

Banned listings are removed from public feed/search/favorites and non-owner detail. Owner surfaces may show only a generic banned notice, with no report metadata or admin reason. Owner edit, media changes, mark-sold, archive, republish, and delete are blocked until admin unban; owner archive/delete is not a workaround for admin ban. Unban restores only `banned -> active` and does not clear favorites, emit saved-search notifications, or resolve/dismiss pending reports.

S7 moderation is not staff management. Suspend/unsuspend rejects `role = admin` targets with `FORBIDDEN` / `ADMIN_TARGET_NOT_MODERATABLE`; self suspend/unsuspend returns `FORBIDDEN` / `SELF_MODERATION_NOT_ALLOWED`. These failed requests do not mutate users, resolve reports, or write audit rows. Compromised or abusive admin accounts require operator/admin-account-management work outside the report queue.

Suspended users keep login, browsing, account deletion, and existing conversation history. Authenticated marketplace mutations return `FORBIDDEN` / `USER_SUSPENDED` with generic client copy: create/edit/publish listing, contact/message, submit report, and similar actions are blocked. Suspension does not auto-ban, hide, archive, or delete the user's listings; admins ban listings separately when needed.

If a pending report targets a visible admin account, admins can dismiss the report. Report-backed suspend remains forbidden by the admin-target rule, and S7 does not add a public staff-reporting distinction or automatic staff-abuse workflow.

Each action requires:
- Required internal plain-text reason, trimmed before validation/storage, non-empty after trim, capped at 1000 chars after trim, and stored with internal line breaks preserved. S7 has no admin reason enum, preset picker, templates, or classifier.
- Confirmation modal with static, action-specific impact copy:
  - Ban listing: hides this listing from public surfaces and blocks new contact/messages; existing conversations remain readable.
  - Suspend user: blocks future authenticated marketplace mutations; does not automatically ban listings or close conversations.
  - Unban/unsuspend/dismiss: states the exact state change and that an audit entry will be written.
- After confirm: action executes + audit log entry written
- Direct ban/suspend outside a report is allowed and does not touch any `ContentReport`; pending reports on that listing/user remain pending for manual dismissal. S7 has no separate "action report" endpoint.
- Direct ban/suspend confirmations do not compute or warn with pending-report counts in S7. If the action succeeds, the admin UI refreshes/navigates from the server response; if it fails, the UI discards optimistic state and refreshes the report detail or action page.
- Report-backed ban/suspend does not cascade to other pending reports on the same listing/user. Sibling pending reports remain pending and can be dismissed manually; S7 avoids hidden bulk resolution so audit causality stays tied to the supplied `reportId`.
- If a ban/suspend request supplies `reportId`, the API validates the report before mutation. Unknown report id returns `NOT_FOUND`; an existing report for a different target returns `VALIDATION_FAILED` / `REPORT_TARGET_MISMATCH`; a matching already-resolved report returns `CONFLICT` / `REPORT_ALREADY_RESOLVED`; a matching pending report whose target is no longer actionable returns `CONFLICT` / `REPORT_TARGET_NOT_ACTIONABLE`. These failed requests do not mutate the target or write audit rows.
- Admin UI hides or disables impossible direct actions when current state is known, but still handles `MODERATION_TARGET_STATE_CONFLICT` because state can change after page load.
- S7 has no assignment/claim workflow. If two admins act on the same pending report, the first committed resolution wins. The second request gets HTTP 409 with `details.reason = "REPORT_ALREADY_RESOLVED"` and must refresh the report; it does not overwrite reviewer fields, mutate the target, or write an audit entry.
- When an action includes a matching pending `reportId`, the supplied report status update, target mutation, and audit write are one transaction.
- S7 admin mutation endpoints return HTTP 200 with small JSON response bodies, not `204`: dismiss returns `reportId`, `status`, `reviewedAt`, and `auditLogId`; report-backed ban/suspend returns target id/state, `reportId`, `reportStatus`, and `auditLogId`; direct ban/suspend/unban/unsuspend returns target id/state and `auditLogId`. Unban/unsuspend do not accept `reportId`.
- S7 does not add idempotency keys for admin mutations. Double submits rely on current-state validation: after a successful first request, the second returns `REPORT_ALREADY_RESOLVED` for the same report or `MODERATION_TARGET_STATE_CONFLICT` for the changed target state.

Successful moderation events may be emitted internally after owning state changes, but S7 does not consume them for push, feed items, owner/reporter notifications, conversation auto-close, conversation system messages, or worker jobs. Enforcement is synchronous current-state checking.

Post-MLP action candidates:
- Warn seller — depends on notifications and account-warning semantics.
- Hide listing — overlaps with seller archive and admin ban; shape separately if admins need a softer visibility action.
- Escalate — requires role hierarchy or assignment workflow.
- Suspension durations / automatic expiry / warning ladder — requires policy design and scheduling; S7 keeps manual suspend/unsuspend only.
- Conversation excerpts / reporter reputation / cross-report clustering — useful moderation intelligence, but out of MLP scope.

### Step 5 — Reporter feedback

- In MLP beta, reporter feedback stops at successful report submission. Resolution is internal to admins.
- Successful submission copy is generic for both new and duplicate reports: "Thanks, we received your report."
- Public reporting is submit-only in S7: reporters cannot view a report history, track status, edit submitted report details, retract reports, or start appeals/support workflows.
- S7 does not send push notifications, in-app feed items, or "report reviewed" messages to reporters.
- Admin free-text reasons are rendered to admins as escaped plain text and are never shown to reporters, listing owners, suspended users, or public users.
- Reported listing owners and reported users do not see report metadata: no report count, report reason/details, reporter identity, report status, or admin notes. Banned-listing owners and suspended users see generic state notices only; appeals, transparency, and owner-facing reason templates are post-MLP support/trust work.
- Post-MLP, a notification/feed bet may add a generic reviewed state such as "We reviewed your report"; it must not expose the admin's private reason.

### Step 6 — Audit trail

Every admin action writes to `AuditLog`:
- `actorId` = the admin
- `action` = canonical String constant (`LISTING_BAN`, `USER_SUSPEND`, `CONTENT_REPORT_RESOLVE`, etc.). Dismiss uses `CONTENT_REPORT_RESOLVE`; ban/suspend from a report use the action audit (`LISTING_BAN` or `USER_SUSPEND`) and include `reportId` in `details`.
- `targetType` + `targetId` = the thing mutated by the action. Dismiss mutates the report ticket, so `CONTENT_REPORT_RESOLVE` uses `targetType = "content_report"` and `targetId = reportId`. Ban/suspend rows target the moderated listing/user.
- `details` JSON with required normalized plain-text `reason`, `reportId?`, `reportedTargetType?`, `reportedTargetId?`, `before?`, `after?`, and action-specific fields. Dismiss stores the reported listing/user in `reportedTargetType` + `reportedTargetId`; ban/suspend from a report stores `reportId`.
- `before` / `after` stay minimal and structured: dismiss records report status before/after; report-backed ban/suspend records supplied report status before/after plus listing status or user suspension fields before/after; direct ban/unban records listing status before/after; direct suspend/unsuspend records user suspension fields before/after.
- `createdAt`
- Audit lists sort newest first by `createdAt DESC, id DESC` for deterministic ties.
- Audit list rows expose only `id`, `createdAt`, `action`, `actorSummary`, `targetType`, `targetId`, a short target label, and optionally a one-line escaped plain-text reason preview. Full `details` JSON stays in row expansion/side panel detail, not the table.
- Deleted/null actors render as "Deleted admin" for normal admin actions and "Operator script" for `ADMIN_BOOTSTRAP_PROMOTE`.
- Unavailable targets render as "Unavailable target"; audit history remains visible even if the target listing/user/report disappeared after the action.
- S7 audit filters stay limited to `action`, `targetType`, and `targetId`; invalid filters or invalid `page`/`pageSize` return `VALIDATION_FAILED`.

S7 keeps `AuditLog.action` as a String and does not add `beforeJson`, `afterJson`, or a top-level `reason` column. A Prisma enum/backfill is post-MLP hardening after the admin action catalog stabilizes.

Audit log is **append-only** — admins cannot delete their own entries. S7 has no CSV export or retention controls; rows are retained indefinitely for the MLP.

## Bulk operations (post-MLP)

For obvious spam waves (one bad actor posting 30 fake listings):

- Admin selects multiple listings → "Ban all"
- Bulk action fans out to one normal `AuditLog` row per affected target, not one bulk row with a `targetIds` array
- Each row keeps the real `targetType` + `targetId` so target audit history remains queryable; `details.batchId` and `details.batchReason` tie the rows back to the same bulk operation
- Telegram confirmation

## Special case: reported chat message

- Not part of S7 unless S6 is explicitly reshaped to ship report-from-thread.
- User reports a message inside a contact thread (Flow: thread → report)
- Admin sees the conversation context (the messages around the reported one)
- Admin can: delete message (soft), block user from app, warn user
- Same audit trail discipline

## SLAs

| Severity | Target action time |
|---|---|
| Active scam (mass-reporting from multiple users) | ≤ 1 hour |
| Normal spam / wrong-category | ≤ 24 hours |
| Edge cases / disputes | ≤ 72 hours |

These are operating expectations, not product state transitions. S7 does not expire, auto-dismiss, auto-close, or schedule cleanup for pending reports. A report stays pending until an admin dismisses it or actions the supplied matching report through ban/suspend. Age filters, escalation, and auto-close belong in post-MLP moderation-operations/dashboard work if queue volume proves they are needed.

## Telegram alerts (post-MLP unless beta safety requires them)

Conditions that page admin via Telegram:

- Pending reports > 5 for > 1 hour
- Single user receives ≥ 3 reports in 24h (likely scammer)
- Listing receives ≥ 5 reports (mass concern)
- No reporter-controlled `urgent` flag. Future paging severity is computed from report volume, repeated targets, target history, or an admin-set severity after review.

## References

- [Feature 40 — Admin](../features/40-admin.md)
- `apps/api/src/modules/admin/CONTEXT.md`
- [ADR-0010 — Observability](../../adr/0010-testing-obs.md) — Telegram alert routing
- [ADR-0027 — MLP beta scope](../../adr/0027-mlp-beta-scope.md)

## Post-MLP candidates

- Auto-hide listings with ≥ N pending reports — can reduce harm, but creates a mass-report abuse vector. Shape only after beta report volume and abuse patterns are known.
- Anonymous reporting — only reconsider if beta data shows safety reports are being lost because login is too much friction.
- Reporter-facing report history/status, edit/retract, appeals, and support inbox workflows — shape together in a post-MLP trust/support PRD if beta operations need transparency or dispute handling.

## Deferred feature placement

| Deferred capability | Future home | Trigger / note |
|---|---|---|
| Message reports | [Feature 34 — Conversations](../features/34-conversations.md) + this flow | Shape with rich chat/report-from-thread, including context excerpts and message deletion policy. |
| Blog/content reports | [Feature 39 — Bortzhurnal](../features/39-content-blogs.md) + [Feature 40 — Admin](../features/40-admin.md) | Shape only after content ships; likely `targetType = blog_post` with content-owned validation. |
| Reporter history/status/edit/retract | Future trust/support PRD + this flow | Keep S7 public reporting submit-only until transparency or correction becomes a real operating need. |
| Appeals/support inbox | Future trust/support PRD + support ops | Do not bolt onto S7 moderation reasons; it needs user-facing policy, copy, and owner/reporter privacy rules. |
| Report spam quotas/rate analytics | [85 — Launch analytics](../ops/85-launch-analytics-plan.md) + [Feature 40 — Admin](../features/40-admin.md) | Shape only after beta shows queue spam across many targets. |
| Assignment/claim/SLA/escalation | [Feature 40 — Admin](../features/40-admin.md) | Full moderation-operations dashboard work, not the minimal queue. |
| Bulk moderation | [Feature 40 — Admin](../features/40-admin.md) | One audit row per target with shared `details.batchId` / `details.batchReason`. |
| Telegram/admin alerts | [Feature 36 — Notifications](../features/36-notifications.md) + [81 — Monitoring + alarms](../ops/81-monitoring-alarms.md) | Consume `ContentReportCreated` or aggregate thresholds; no reporter-controlled urgency. |
| CSV export/audit retention controls | [Feature 40 — Admin](../features/40-admin.md) + compliance ops | S7 keeps append-only audit rows retained indefinitely; export/retention controls are later. |
| Admin deprovision/role hierarchy | [Feature 30 — Identity](../features/30-identity.md) + [Feature 40 — Admin](../features/40-admin.md) | Staff-account management is separate from user moderation; S7 report queue cannot suspend admins. |
