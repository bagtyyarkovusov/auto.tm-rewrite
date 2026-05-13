# 65 — Admin moderation flow

## Summary

A user reports a listing for spam / scam. Admin reviews, acts, and the audit trail is preserved.

## Goal

- Report-to-action: ≤ 24 hours (the longer it sits, the more harm)
- Every action traceable (audit log)
- Clear feedback to reporter (they're not shouting into the void)

## Step-by-step

### Step 1 — User reports

- Maral is browsing; she sees a sus listing (e.g., price way too low, sketchy description)
- Tap menu on listing detail → Report
- Modal: select reason (Spam / Scam / Misleading / Wrong category / Other) + free-text details
- Submit → API creates a `ContentReport` record with status `pending`

### Step 2 — Admin sees it

- Admin dashboard `/dashboard` shows "Pending moderation: N" card
- Telegram alert fires (via TM Proxy PC) if N > 5 (configurable threshold)
- Admin clicks → goes to `/listings?status=reported` or `/admin/reports`

### Step 3 — Admin reviews

- The reported listing detail opens with moderation toolbar
- Shows: the report details (who, when, why, free-text), reporter's history (so admin can spot trolls)
- Listing's full data + photos
- Owner's history (other listings, account age, prior reports)
- Conversation samples (recent messages in chats about this listing)

### Step 4 — Admin acts

Options:

| Action | Effect |
|---|---|
| **Dismiss report** | `ContentReport.status='dismissed'`; listing untouched; reporter sees "Report reviewed" in their notifications |
| **Warn the seller** | Push notification + flag account; no listing change |
| **Hide listing** | Listing → `archived`; conversations stay; seller can fix and republish |
| **Ban listing** | Listing → `banned`; conversations closed; reason recorded |
| **Suspend user** | User → `suspendedAt` set; all their listings archived; conversations closed |
| **Escalate** | Mark report for super-admin review (Phase 2+) |

Each action requires:
- Reason (admin selects from preset list + free-text)
- Confirmation modal showing impact ("This will affect 3 active listings and 12 conversations")
- After confirm: action executes + audit log entry written

### Step 5 — Reporter feedback

- Reporter (Maral) receives a notification: "We reviewed your report. Action taken: <action>"
- Listed on her notification feed in-app
- No specific reason shared (privacy of the reported user); just "thanks, action taken"

### Step 6 — Audit trail

Every admin action writes to `AuditLog`:
- `actorUserId` = the admin
- `action` = `LISTING_BAN` / `USER_SUSPEND` / `CONTENT_REPORT_RESOLVE` / etc.
- `targetType` + `targetId`
- `beforeJson` (snapshot of state before)
- `afterJson` (snapshot after)
- `reason` (admin's reason)
- `createdAt`

Audit log is **append-only** — admins cannot delete their own entries.

## Bulk operations

For obvious spam waves (one bad actor posting 30 fake listings):

- Admin selects multiple listings → "Ban all"
- Single audit entry per action with `targetIds` array (or N separate entries — TBD)
- Telegram confirmation

## Special case: reported chat message

- User reports a message inside a chat (Flow: chat thread → message menu → Report)
- Admin sees the conversation context (the messages around the reported one)
- Admin can: delete message (soft), block user from app, warn user
- Same audit trail discipline

## SLAs

| Severity | Target action time |
|---|---|
| Active scam (mass-reporting from multiple users) | ≤ 1 hour |
| Normal spam / wrong-category | ≤ 24 hours |
| Edge cases / disputes | ≤ 72 hours |

## Telegram alerts

Conditions that page admin via Telegram:

- Pending reports > 5 for > 1 hour
- Single user receives ≥ 3 reports in 24h (likely scammer)
- Listing receives ≥ 5 reports (mass concern)
- Critical: any report flagged `urgent` by reporter (Phase 2 if abused)

## References

- [Feature 40 — Admin](../features/40-admin.md)
- `apps/api/src/modules/admin/CONTEXT.md`
- [ADR-0010 — Observability](../../adr/0010-testing-obs.md) — Telegram alert routing

## Open questions

- Should reporters see the admin's free-text reason for their report's resolution? (Likely no — privacy; just "actioned / dismissed")
- Should we auto-hide listings with ≥ N reports pending review? (Reduces harm but enables abuse; defer with a manual setting)
- Anonymous reporting — yes/no? (Default no — reporters are authed; helps weed out troll reports)
