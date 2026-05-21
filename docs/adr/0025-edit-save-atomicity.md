# ADR-0025: Edit-mode Save changes uses sequential best-effort, not server-side atomic bundle

- **Status**: Accepted
- **Date**: 2026-05-22
- **Deciders**: AutoTM founder + AI architect

## Context

[ADR-0024](0024-owner-post-publish-photo-editing.md) locks the product contract: owners may add, remove, and reorder photos after publish, with all edits staged locally and applied atomically on **Save changes**. The mobile edit route today is read-only for photos and uses a separate `useState`-driven wizard that doesn't share `wizardMachine` with the create flow. Convergence onto `wizardMachine` + the existing `useUploadQueue` is committed as the next chunk of S4 work.

When edit mode supports photo add/remove/reorder, **Save changes** has to apply four independent server operations:

1. `PATCH /api/v1/listings/:id` — field edits via `EditListing` use-case
2. `POST /api/v1/listings/:id/media/attach` — one call per newly uploaded photo (`AttachMedia`)
3. `DELETE /api/v1/listings/:id/media/:mediaId` — one call per removed photo (`RemoveMedia`)
4. `PUT /api/v1/listings/:id/media/order` — one bulk call (`ReorderMedia`)

These endpoints already exist on the API side (S4 #91 shipped them). Each succeeds or fails independently — there is no server-side transaction spanning all four. The question for the converged shell is: what does the seller see when ops 1 and 2 succeed but op 3 fails mid-save?

Three shapes were on the table:

- **A — Sequential best-effort, fail-fast, retry-from-failure.** Fire ops in defined sequence on the client. On any failure, stop and surface "Saved fields ✓, couldn't remove 2 photos. Retry?" Retry resumes from the failed op only. Mid-save the listing is in a transient inconsistent state visible to buyers; failure surfaces clearly to the seller.
- **B — Server-side bundled transactional endpoint.** Introduce `PATCH /api/v1/listings/:id/edit-session` accepting `{ fields, attach[], remove[], reorder }` and apply all four inside a single Prisma transaction (`ApplyEditSession` use-case). All-or-nothing on the server.
- **C — Defer photo edits.** Keep edit mode field-only in Phase 1; ship photo add/remove/reorder as a separate dedicated gesture in S5 or later.

C re-opens ADR-0024, accepted four days earlier, and is rejected on contract grounds.

The trade-off between A and B is **honesty in Phase 1 vs. architectural cleanliness for Phase 2**. The trust layer in Phase 2 (S11–S16) will need to know precisely which edit triggered which classifier and which re-review rule — that requires the edit operation to be a coherent atomic event, not a sequence of independent API calls. So Shape B is unavoidable eventually; the only question is whether the API cost is paid in S4's tail or in Phase 2's prep work.

## Decision

**Phase 1 ships Shape A — sequential best-effort, fail-fast, retry-from-failure. Phase 2 migrates to Shape B as a prerequisite of the trust-layer re-review work.**

### Phase 1 client behavior

The mobile **Save changes** handler runs ops in this defined sequence:

1. `PATCH /api/v1/listings/:id` — field edits
2. `POST /api/v1/listings/:id/media/attach` (parallelized within the step, one per new photo with a server `key`)
3. `DELETE /api/v1/listings/:id/media/:mediaId` (parallelized within the step, one per removed mediaId)
4. `PUT /api/v1/listings/:id/media/order` (single bulk call with the final sortOrder array)

Client tracks per-op state in memory: `pending | in_flight | succeeded | failed`. On the first failure the orchestrator stops the sequence, surfaces an error UI that names the failed op ("Saved fields ✓. Couldn't add 2 photos. Retry?"), and exposes a Retry action that resumes from the failed op only (not from scratch — already-succeeded ops are not re-fired).

The Save changes button is gated by `publishGate` (per the converged shell): no in-flight uploads and no `failed`-state photos. Once green, the seller commits.

Mid-save the listing is in a transient inconsistent state on the server (fields updated, some media attached, others not). Buyers viewing the listing during that window see whatever subset has been applied. AutoTM is reactive-moderation Phase 1; the brief window is accepted.

### Phase 1 known limitation: app backgrounded mid-save

If the user backgrounds the app between op 1 and op 4, the in-memory per-op state is lost. On next app launch the listing has partial server-side changes, but the client has no record of what got applied and what remained. The seller's local edit session is gone.

**Mitigation is deferred as follow-up, not a blocker for the convergence PR.** When QA flags this in practice, persist edit-session state to `AsyncStorage` keyed by `edit-session-{listingId}` immediately before firing op 1. On app launch, if a session key exists for a listing the user navigates back to in edit mode, surface "We were saving changes — would you like to resume?" UX and offer to re-fire pending ops. The persistence layer is additive and ships without a contract change.

### Phase 2 migration to Shape B

When the trust layer (S11–S16) starts wiring re-review classifiers, a single atomic boundary becomes required: classifiers must see the full edit as one unit to compute trust-tier impact correctly. At that point:

- Add `ApplyEditSession` use-case in `apps/api/src/modules/listings/application/`
- Add `PATCH /api/v1/listings/:id/edit-session` controller route
- Body shape: `{ fields, attachMedia[], removeMedia[], reorder }`
- Implementation wraps `EditListing` + `AttachMedia` + `RemoveMedia` + `ReorderMedia` orchestration in a single Prisma transaction
- Emit one `ListingEdited` event with the full diff (instead of N audit-log entries today)
- Mobile `useSaveListingEdit` hook collapses from 4 sequential calls to 1
- Existing per-resource endpoints (`/media/attach`, `/media/order`, etc.) remain available for admin moderation and any non-edit-mode use cases

The migration is non-breaking: the new endpoint is additive, and mobile switches when ready.

## Consequences

### Positive

- **Unblocks ADR-0024 in S4 without API surface changes.** The endpoints `EditListing`, `AttachMedia`, `RemoveMedia`, `ReorderMedia` all shipped in S4 — Phase 1 composes them client-side.
- **Failure is honest.** Sellers see exactly which sub-operation failed and can retry just that part instead of re-doing the whole edit session.
- **No premature abstraction.** The transactional bundle is real architectural work that earns its place in Phase 2 when re-review depends on it.
- **The bundled endpoint is queued, not invented.** Phase 2 starts with a concrete migration target rather than a green-field design decision.

### Negative / accepted costs

- **Transient inconsistent state visible to buyers** during the 2–5s save window when a partial failure happens. Acceptable under Phase 1 reactive moderation; non-acceptable once Phase 2 trust tiers exist (forcing the migration).
- **Client orchestrator gets per-op state machine + retry-from-failure logic** that Phase 2 will throw away. Estimated ~80 LOC in `useSaveListingEdit`; deletion in Phase 2 is mechanical.
- **App-backgrounded edge case** ships unmitigated. Follow-up persistence work lands when QA flags it; users have to manually re-edit if they background mid-save in Phase 1.
- **Audit log fans out** — `listing.price_changed`, `listing.media_attached`, `listing.media_removed`, `listing.media_reordered` write as separate entries instead of one `listing.edited` with a diff. Phase 2 consolidates.

### Neutral

- **The four existing endpoints remain canonical.** Admin tooling and any non-edit-mode flows (e.g., S9 admin moderation) continue using them directly. The Phase 2 bundle endpoint is for the mobile edit-session use case specifically.
- **Atomicity is opt-in by endpoint, not by call site.** Mobile calling four endpoints sequentially does not preclude an admin tool from calling them independently for partial updates.

## Alternatives considered

- **B — Server-side bundled transactional endpoint now.** Rejected for Phase 1: requires designing and shipping a new use-case (`ApplyEditSession`), a new controller route, a new request/response contract in `@auto-tm/contracts`, and a new mobile hook — all before the trust layer requires it. The composition is cleaner, but the cost is real and the requirement is future. Re-considered as Phase 2 prerequisite work.
- **C — Defer photo edits to S5.** Rejected: re-opens ADR-0024 four days after acceptance and leaves sellers unable to fix bad photos in published listings. The product contract is already public-facing.
- **D — Client-orchestrated with rollback.** Tried mentally and rejected: rollback of `DELETE /media/:id` means re-attaching with the same key, but the media row is already gone server-side. Rollback semantics for `RemoveMedia` aren't actually viable without server cooperation, which collapses back into Shape B.
- **E — Fire all four ops in parallel and surface partial failures.** Rejected: ordering matters. Reorder applied before attach references mediaIds that don't yet exist; remove applied before reorder leaves the reorder operation referencing stale ordering. Sequential is the floor.

## References

- [ADR-0024](0024-owner-post-publish-photo-editing.md) — Owner post-publish photo editing (the contract this implements)
- [ADR-0019](0019-context-md-describes-current-state.md) — CONTEXT.md describes current state, not aspirational spec
- [ADR-0020](0020-document-hierarchy-and-mutability.md) — Document hierarchy and mutability rules
- [ADR-0001](0001-architecture.md) — Bounded contexts with ports + per-context use-cases
- `apps/api/src/modules/listings/CONTEXT.md` — `EditListing`, `AttachMedia`, `RemoveMedia`, `ReorderMedia` use-cases + HTTP routes
- `apps/mobile/CONTEXT.md` — Mobile edit gap + convergence roadmap
- `apps/mobile/src/listings/CONTEXT.md` — `useUploadQueue`, `wizardMachine`, autosave + publishGate documentation
