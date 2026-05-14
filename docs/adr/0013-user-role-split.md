# ADR-0013: Split `User.role` (marketplace identity) from `DealershipMember.role` (membership role)

- **Status**: Accepted
- **Date**: 2026-05-14
- **Deciders**: bagtyyar + Claude (Sprint 2 grilling session, post-S1 retro)

## Context

Sprint 1 shipped two divergent `UserRole` enums:

- `packages/contracts/src/enums.ts`: `buyer | seller | dealer_owner | dealer_member | admin | super_admin` (6 values)
- `packages/db/prisma/schema.prisma`: `buyer | seller | moderator | admin` (4 values)

`DealershipMember` was shipped without any `role` column at all (it's a `{dealershipId, userId}` junction with timestamps).

The contracts enum is conflating two distinct domain concepts:

1. **Marketplace identity** — who is this user, in marketplace terms? (a buyer browsing, a seller posting their own listings, staff doing internal work)
2. **Dealership membership role** — within a *specific* dealership row, what is this user's responsibility there? (owner who controls settings + roster, sales rep who can post listings under the dealership)

The two are independent. A private seller can also be a sales rep at his cousin's dealership without needing his `User.role` to change. Likewise, an admin (staff) might also be a buyer-as-a-user. Conflating them into a single `User.role` forces unnatural state transitions (a user joining a dealership has to "upgrade" their User.role from `seller` to `dealer_member`; leaving requires a downgrade; we'd need to handle every edge case in code).

S2 is the first sprint that returns a `User` shape over HTTP. Before that ships, the schema and contracts must agree on what `User.role` means.

## Decision

**`User.role` carries marketplace identity only. Dealership membership role gets its own column on `DealershipMember`.**

### `User.role` enum (final)

```prisma
enum UserRole {
  buyer
  seller
  moderator
  admin
}
```

- `buyer` (default) — can browse, favorite, message sellers, save searches
- `seller` — same as buyer + can post listings under their own User
- `moderator` — staff role for content moderation (delete listings, ban users, resolve reports) per S9 admin dashboard
- `admin` — staff role with full powers (moderator's powers + manage staff + system config) per S9; subject to TOTP per ADR-0006

Removed from the contracts enum: `dealer_owner`, `dealer_member`, `super_admin`.

### `DealershipMember.role` (new column + enum)

```prisma
enum DealershipMemberRole {
  owner
  sales
}

model DealershipMember {
  id           String                @id @default(uuid())
  dealershipId String
  dealership   Dealership            @relation(fields: [dealershipId], references: [id])
  userId       String
  user         User                  @relation(fields: [userId], references: [id])
  role         DealershipMemberRole  // NEW
  createdAt    DateTime              @default(now())

  @@unique([dealershipId, userId])
  @@map("dealership_members")
}
```

- `owner` — can edit dealership settings (name, logo, city), add/remove other members, decide who has `owner` vs `sales`
- `sales` — can post listings under the dealership, respond to chats on those listings, edit their own dealership-posted listings; cannot edit dealership settings or manage members

A user's *effective capabilities for a given dealership* are derived by joining: "Is this user a member of dealership X, and if so, with what role?" — answered by a `dealership_members` row, not by `User.role`.

### Invariants preserved across the split

- A `User` belongs to **at most one** `Dealership` (existing CONTEXT.md invariant; expressed as `@@unique([userId])` on `dealership_members` — *added in the S2 foundations migration*; today's schema only has `@@unique([dealershipId, userId])` which permits a user in multiple dealerships).
- A `Dealership` must have at least one `DealershipMember` with `role = owner` (application-level invariant, enforced in `CreateDealership` use-case and on `RemoveMember` if the last owner would be removed).
- Staff roles (`moderator`, `admin`) are orthogonal to dealership membership. A staff member can in principle also be a dealership owner; in practice we'd avoid this for conflict-of-interest reasons but the model doesn't prohibit it.

### No `super_admin` tier

Any `admin` user can grant `admin` to another user (subject to ADR-0006's TOTP requirement). For a Phase-1 team of 2-3 staff this is fine: privilege escalation is rare and reviewable through audit log. Revisit if the team grows past ~5 staff and we want to distinguish "can administer the system" from "can grant administer access."

## Consequences

### Positive

- **`DealershipMember` becomes a meaningful entity** with its own domain content (`role` is a real invariant, not just a junction marker). Earlier confusion in `identity/CONTEXT.md` ("DealershipMember role (`owner` / `sales`) junction" — a role that didn't exist in the schema) is resolved.
- **No fragile state transitions** when a user joins or leaves a dealership. `User.role` stays put; the membership row is created or deleted.
- **Simpler `User.role` enum** (4 values) → smaller switch statements, smaller admin-grant-UI surface, fewer reviewer mistakes.
- **Matches charter §5's bounded-context modeling**: `identity/` owns `User, Dealership, DealershipMember` as three distinct entities, not one entity with role values stuffed in.

### Negative / accepted costs

- **Contracts enum update** — `packages/contracts/src/enums.ts` must drop `dealer_owner / dealer_member / super_admin`, add `moderator`. This is a breaking change to the OpenAPI surface; greenfield (no clients yet) so the cost is just the edit + a generated OpenAPI re-export.
- **Two places to look** when asking "what can this user do for this dealership?" — the `User.role` (irrelevant here) and the `DealershipMember.role` (relevant). A `getDealershipMembership(userId)` helper in the identity port surface makes this a one-call lookup.
- **New `DealershipMember.role` column requires a migration**, and the at-most-one-dealership-per-user invariant requires changing the existing composite-unique constraint to a single-column-unique constraint. Greenfield, so the migration is one Prisma migration with no backfill.

### Neutral

- **`super_admin` is gone for now.** If we add it later it'll be a new ADR superseding this one. It costs nothing to defer.
- **No "dealer-only" listing posting flow yet** — S4 (Listings CRUD) and S6 (Garage + Dealership) will use the new `DealershipMember.role` to gate who can attach a listing to which dealership. Spec'd here, implemented there.

## Alternatives considered

- **Keep both enums conflated (today's contracts).** Rejected: forces awkward role upgrades on dealership join/leave, doesn't match the bounded-context modeling, and `DealershipMember` stays semantically empty.
- **Drop `User.role` entirely, derive everything.** Rejected: most role checks (is this user a buyer? a seller?) don't need a join, and "buyer/seller" is a fact about the User, not a derivation. Adds query cost for no clarity gain.
- **`User.role` as `string[]`** (multi-role per user). Rejected: Postgres `text[]` columns are awkward to index and query; staff vs marketplace roles are different concerns and shouldn't live in the same list.
- **Keep `super_admin`.** Rejected: no Phase-1 use case. Easy to add later if needed (new ADR + enum extension).

## Migration plan (S2 foundations PR)

```sql
-- Conceptual; actual SQL emitted by `prisma migrate dev --name user-role-split`

-- 1. Shrink User.role enum (greenfield; no rows to backfill)
--    Prisma migration drops the moderator-and-admin only enum and recreates with the 4-value set
--    (this is the same shape Prisma already had — no value changes — but is included for clarity).

-- 2. Add DealershipMember.role column + enum
CREATE TYPE dealership_member_role AS ENUM ('owner', 'sales');
ALTER TABLE dealership_members
  ADD COLUMN role dealership_member_role NOT NULL DEFAULT 'sales';
-- Drop the default after the column exists; new rows must specify role explicitly.
ALTER TABLE dealership_members ALTER COLUMN role DROP DEFAULT;

-- 3. Enforce at-most-one-dealership-per-user
ALTER TABLE dealership_members DROP CONSTRAINT dealership_members_dealership_id_user_id_key;
CREATE UNIQUE INDEX dealership_members_user_id_key ON dealership_members(user_id);

-- 4. Contracts:
--    Edit packages/contracts/src/enums.ts:
--      UserRole = { Buyer, Seller, Moderator, Admin }
--      DealershipMemberRole = { Owner, Sales }
--    Re-export from packages/contracts/src/index.ts.
--    Re-run `pnpm --filter @auto-tm/contracts openapi:generate`.
```

## References

- Charter [§3 Monorepo apps](../../GRILL-OUTCOME.md#3-monorepo-apps-7), [§5 Bounded contexts](../../GRILL-OUTCOME.md#5-bounded-contexts-9--in-appsapisrcmodules)
- [ADR-0006](0006-auth.md) — Admin role + TOTP
- Sprint plan [sprint-02-identity.md](../prd/sprints/sprint-02-identity.md)
- Sprint retro [sprint-01-scaffold-retro.md](../prd/sprints/sprint-01-scaffold-retro.md) §4.1 — drift that surfaced this
