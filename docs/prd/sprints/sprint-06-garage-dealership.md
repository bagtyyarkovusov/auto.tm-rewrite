# Sprint 6 — Garage + Dealership pages

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | — (incremental) |
| **Demo audience** | Beta testers |
| **Estimated time** | ~1 week |

## Goal

Two distinct features that both build on `identity/` but feel different to users:

1. **Garage** — a user's personal vehicles (owned + dream). Dream entries pre-fill a saved search ("notify me when this car is listed").
2. **Dealership showroom** — public storefront page per dealership; admin can verify dealers for the PRO badge.

## User capability (the demo line)

> Garage: "I add my 2018 Hyundai Sonata to My Garage; I add a dream car (2023 BMW X5) which prompts me to save a search for it; both show on my public profile."
>
> Dealership: "I open the AutoMir Ashgabat page and see their 27 active listings, their PRO badge, and a contact button that opens chat about a specific car."

## Bounded contexts touched

- **Primary**: `identity/OwnedVehicle` + `Dealership` use-cases
- **Supporting**: `subscriptions/` (dream-car → saved-search shortcut); `apps/admin` (dealer verification); `apps/web` (public dealer page); `apps/mobile` (Garage tab)

## Acceptance criteria (DoD)

### Schema additions (Prisma migration)

S6 broadens the skinny `OwnedVehicle` model (see `apps/api/src/modules/identity/CONTEXT.md` Planned section) into the full garage entity:

- [ ] `OwnedVehicle` adds: `vin?` (String), `mileage?` (Int), `nickname?` (String), `status` (`OwnedVehicleStatus` enum: owned | dream | sold), `photoUrl?`, `isPublic: Boolean @default(false)`, `linkedListingId?` (FK → Listing, SetNull) for "this is the car I'm selling" linkage.
- [ ] `Dealership.verifiedAt?` (DateTime) for PRO badge state (used by `POST /api/v1/admin/dealerships/{id}/verify-pro`).
- [ ] Prisma migration is reversible.

### Garage
- [ ] `POST /api/v1/me/garage` adds an `OwnedVehicle` with `status=owned | dream | sold`
- [ ] `GET /api/v1/me/garage` lists the user's vehicles
- [ ] `PATCH /api/v1/me/garage/{id}` updates status (e.g., owned → sold)
- [ ] `DELETE /api/v1/me/garage/{id}` removes the entry
- [ ] **Dream → SavedSearch shortcut**: adding a dream entry prompts "Notify me when this car is listed?" → creates a SavedSearch with the brand+model+year window pre-filled
- [ ] **Sell-from-Garage shortcut**: tapping "Sell this car" pre-fills the listing wizard with brand/model/year
- [ ] Mobile Garage tab shows the list with status chips
- [ ] Public profile shows owned cars publicly (visibility opt-out per car)

### Dealership
- [ ] `GET /api/v1/dealerships/{slug}` returns public dealership page data (name, city, logo, PRO status, listing count) — **anonymous-readable**
- [ ] `GET /api/v1/dealerships/{slug}/listings` returns paginated listings for that dealership
- [ ] **Admin**: `POST /api/v1/admin/dealerships/{id}/verify-pro` flips PRO badge; writes audit log
- [ ] **Admin**: dealer-member management (add/remove members)
- [ ] Web `/{locale}/d/{slug}` renders the storefront with OG metadata
- [ ] Listing detail shows dealership branding when `publishedAsDealership = true`
- [ ] `identity/CONTEXT.md` updated to reflect Garage + Dealership invariants
- [ ] `docs/prd/03-roadmap.md` updated (S6 🟢, S7 🟡)

## Tests required (TDD mandatory)

- **Domain**: `OwnedVehicleStatus` transitions (owned → sold, dream → owned), `DealershipMember` role rules, `ProBadge` toggle invariants
- **Application**: `AddOwnedVehicle`, `MarkOwnedAsSold`, `SellFromGarage` (pre-fills draft), `GetDealershipPublic`, `VerifyDealershipPro`
- **Infrastructure** (Testcontainers): repository round-trips
- **Presentation** (e2e): anonymous request to dealership page works; admin-only verify is gated

## Files this sprint creates / touches

```
apps/api/src/modules/identity/
├── domain/
│   ├── OwnedVehicle.ts
│   ├── Dealership.ts
│   ├── DealershipMember.ts
│   └── ports/{OwnedVehicleRepository,DealershipRepository,DealershipMemberRepository}.ts
├── application/
│   ├── garage/
│   │   ├── AddOwnedVehicle.ts, UpdateOwnedVehicle.ts, RemoveOwnedVehicle.ts, ListMyGarage.ts
│   │   └── SellFromGarage.ts                Pre-fills listing draft
│   └── dealership/
│       ├── GetDealershipPublic.ts, ListDealershipListings.ts
│       ├── VerifyDealershipPro.ts           Admin only
│       ├── AddDealershipMember.ts, RemoveDealershipMember.ts (admin or dealer owner)
└── presentation/
    ├── GarageController.ts
    ├── DealershipsController.ts             Public
    └── AdminDealershipsController.ts        Admin write

apps/mobile/app/(tabs)/garage.tsx (real list)
apps/mobile/app/(modals)/add-to-garage.tsx
apps/web/src/app/[locale]/d/[slug]/page.tsx
apps/admin/src/app/(admin)/dealerships/page.tsx
```

## References

- **PRD features**: [`../features/37-garage.md`](../features/37-garage.md), [`../features/38-showroom.md`](../features/38-showroom.md)
- **Charter sections**: §5 (Identity context — Garage + Dealership ownership)

## Previous-sprint dependencies

- S2 — auth
- S3 — Catalog (Garage entries reference brand/model)
- S4 — Listings (Sell-from-Garage pre-fills wizard; dealership page needs listings)
- S5 — SavedSearch persistence (dream → notify shortcut)

## Open questions / risks

- **Garage visibility default**: "show my owned cars publicly?" — likely yes-default, opt-out per car. Confirm with personas doc.
- **Dealership slug collisions**: two dealers can't claim the same slug. Reservation is admin-side at verification.
- **Dealer-member impersonation**: a sales member listing a car should attribute to the Dealership, not their personal profile. `publishedAsDealership` flag on Listing — set during create when context is dealership.
