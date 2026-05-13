# admin — CONTEXT

## Purpose

Cross-cutting admin operations: audit log, moderation actions, staff media attribution, broadcast notification tooling. Surfaces consumed by `apps/admin` (the Next.js dashboard).

## Owns (entities + tables)

- `AuditLog` — id, actorUserId (admin who did it), action (enum: `LISTING_BAN` / `USER_SUSPEND` / `DEALERSHIP_VERIFY` / `NOTIFICATION_BROADCAST` / `LISTING_PIN` / etc), targetType (enum), targetId, beforeJson? (state before), afterJson? (state after), reason?, createdAt
- `ContentReport` — id, reporterUserId, targetType (`listing` / `blog_post` / `user` / `message`), targetId, reason, details?, status (`pending` / `actioned` / `dismissed`), reviewedByUserId?, reviewedAt?, createdAt
- `StaffMediaAttribution` — { mediaKey, uploadedByStaff: bool, uploadedByUserId, uploadedAt, note? } — tracks media uploaded by AutoTM staff on behalf of sellers (Phase 2: pro photos/videos)

## Invariants

- Every admin action that mutates user-visible state writes an `AuditLog` entry
- `actorUserId` must be a `User.role='admin'`
- `AuditLog` is append-only — admins cannot delete their own audit entries
- `ContentReport.status='actioned'` requires `reviewedByUserId` + `reviewedAt`

## Admin actions catalog (Phase 1)

| Action | Effect |
|---|---|
| `LISTING_BAN` | Sets `Listing.status = 'banned'`; auto-closes related conversations |
| `LISTING_UNBAN` | Restores listing to `active` if previously banned |
| `USER_SUSPEND` | Sets `User.suspendedAt`; archives all their listings; closes conversations |
| `USER_UNSUSPEND` | Clears `suspendedAt` |
| `DEALERSHIP_VERIFY` | Sets `Dealership.verifiedAt`; adds PRO badge |
| `DEALERSHIP_UNVERIFY` | Clears `verifiedAt` |
| `NOTIFICATION_BROADCAST` | Sends notification to all/segment via `notifications/` |
| `CATALOG_EDIT` | Add / edit / remove catalog rows (trilingual) |
| `CONTENT_REPORT_RESOLVE` | Mark a content report actioned / dismissed |

## Ports exposed

```ts
interface AuditWritePort {
  record(action: AuditAction, target: TargetRef, by: UserId, before?: any, after?: any, reason?: string): Promise<void>
}

interface AdminReadPort {
  recentAuditEntries(limit): Promise<AuditLog[]>
  pendingContentReports(limit): Promise<ContentReport[]>
}
```

## Ports consumed

```ts
IdentityReadPort + IdentityCheckPort
ListingsReadPort
DealershipReadPort
NotificationsDispatchPort
```

## Events emitted

- `AuditEntryRecorded` (mostly for analytics + Loki log entries)

## Events consumed

- (most events from other contexts can be logged here for audit traceability if needed)

## Notable decisions

- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Admin operations as their own context (not scattered through other modules)
