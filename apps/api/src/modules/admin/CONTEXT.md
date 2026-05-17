# admin — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Admin operations + the admin dashboard ship in S9. Today, only the audit log table exists in schema. Aspirational content lives in `docs/prd/sprints/sprint-09-admin.md`.

## Purpose

Cross-cutting admin operations: audit log, moderation actions, staff media attribution, broadcast notification tooling. Surfaces consumed by `apps/admin` (the Next.js dashboard, currently stub-only — full implementation in S9).

## Owns (entities + tables)

- `AuditLog` — id, actorId? (FK → User, onDelete: SetNull — admin user who performed the action; nullable to preserve audit history when an admin user is deleted), action (String — not yet an enum), targetType (String), targetId (String), details? (JSON), createdAt. Indexes on `(targetType, targetId)` and `(actorId, createdAt)`.

## Invariants (enforced today)

- `AuditLog.actorId` references a User if non-null; on user delete, `actorId` is set to NULL (audit row survives for compliance).
- `AuditLog` is append-only at the schema level (no soft-delete; no schema-level update restriction — must be enforced at application layer in S9).

## Module shape (today)

- `apps/api/src/modules/admin/`:
  - `domain/`, `application/`, `infrastructure/`, `presentation/` — empty
  - `admin.module.ts` — empty module
- No admin endpoints, no audit writer service, no moderation actions today.

## Ports exposed

- (none today — S9 adds `AuditWritePort` and `AdminReadPort`)

## Ports consumed

- (none today)

## Shipped use-cases

- (none today)

## Events emitted

- (none today)

## Events consumed

- (none today)

## Planned additions (S9 — Admin dashboard)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in `docs/prd/sprints/sprint-09-admin.md`:

- **`AuditLog.action`** evolves from String to a typed enum (`AuditAction`): `LISTING_BAN`, `LISTING_UNBAN`, `USER_SUSPEND`, `USER_UNSUSPEND`, `DEALERSHIP_VERIFY`, `DEALERSHIP_UNVERIFY`, `NOTIFICATION_BROADCAST`, `LISTING_PIN`, `CATALOG_EDIT`, `CONTENT_REPORT_RESOLVE`. May require a Prisma migration that backfills existing string rows.
- **`AuditLog`** also gets `beforeJson?` + `afterJson?` (state diff for non-trivial changes; `details` JSON may already be sufficient for some cases) and `reason?`.
- **New `ContentReport` entity**: id, reporterUserId (FK → User), targetType (`listing` | `blog_post` | `user` | `message`), targetId, reason, details?, status (`pending` | `actioned` | `dismissed`), reviewedById? (FK → User), reviewedAt?, createdAt.
- **`StaffMediaAttribution` entity** (Phase 2 — pro photos/videos feature): { mediaKey, uploadedByStaff: bool, uploadedByUserId, uploadedAt, note? } — tracks media uploaded by AutoTM staff on behalf of sellers.
- **Application-level invariants**:
  - Every admin action that mutates user-visible state writes an `AuditLog` entry
  - `actorId` must reference a `User.role = 'admin'` (TOTP-enrolled per ADR-0006 / ADR-0012)
  - `ContentReport.status = 'actioned'` requires `reviewedById` + `reviewedAt`
- **Admin actions catalog (Phase 1, S9)**:

  | Action | Effect |
  |---|---|
  | `LISTING_BAN` | Sets `Listing.status = 'banned'`; auto-closes related conversations |
  | `LISTING_UNBAN` | Restores listing to `active` if previously banned |
  | `USER_SUSPEND` | Suspends a user; archives all their listings; closes conversations |
  | `USER_UNSUSPEND` | Reverses suspend |
  | `DEALERSHIP_VERIFY` | Sets `Dealership.verifiedAt`; adds PRO badge |
  | `DEALERSHIP_UNVERIFY` | Clears `verifiedAt` |
  | `NOTIFICATION_BROADCAST` | Broadcasts via `notifications/` |
  | `CATALOG_EDIT` | Add / edit / remove catalog rows |
  | `CONTENT_REPORT_RESOLVE` | Mark a content report actioned / dismissed |

- **Ports**:
  - Exposed: `AuditWritePort.record(action, target, by, before?, after?, reason?)`, `AdminReadPort.recentAuditEntries`, `AdminReadPort.pendingContentReports`
  - Consumed: `IdentityReadPort` + `IdentityCheckPort` + `ListingsReadPort` + `DealershipReadPort` + `NotificationsDispatchPort`
- **Events emitted**: `AuditEntryRecorded` (analytics + Loki)
- **Events consumed**: any event with audit interest may be subscribed here for traceability

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Admin operations as their own context
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
