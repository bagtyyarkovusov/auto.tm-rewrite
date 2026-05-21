# ADR-0026: Edit mode opens at Review; create mode stays linear

- **Status**: Accepted
- **Date**: 2026-05-22
- **Deciders**: AutoTM founder + AI architect

## Context

The mobile listing wizard ships with two entry points:

- **Create** (`/(tabs)/sell`) — new listing, sequential 8-step flow ending in Review/Publish
- **Edit** (`/listings/[id]/edit`) — modify an already-published listing

Today's edit route uses a separate `useState`-driven 7-step shell with no Review screen. Per the converged-shell decision documented in `apps/mobile/CONTEXT.md` roadmap §2 and locked in this grilling session, edit converges onto the same `wizardMachine` + `WizardLayout` as create, with Review added as Step 8 to give parity.

Convergence on the state machine does not automatically mean the two flows should *feel* the same to the user. The intents are different:

| Aspect | Create | Edit |
|---|---|---|
| User intent | "Guide me — I don't know what fields exist yet" | "I want to fix the one thing that's wrong" |
| Time per step | Variable, often long | Usually zero (most fields untouched) |
| Preferred navigation | Sequential top-down | Direct to the one they came for |
| Sentinel question | "What comes next?" | "Where's the price field?" |

If edit mode shipped the create flow's linear progression, a seller fixing a typo on price would need to Back through six untouched steps from VIN to Price, or Continue through them to reach a Save button at Review. Both fight the intent. A modern marketplace expectation — same as Avito's, Auto.ru's, eBay's — is **direct access to the field you want to fix, plus an obvious save**.

Three navigation shapes were considered:

- **A — Strict linear, same as create.** Back / Continue only. Save changes button on Step 8 (Review).
- **B — Tappable step jump in both modes.** Header's "Step N of 8" opens a sheet listing all steps; tap to jump. Save changes still on Step 8.
- **C — Review-first for edit only.** Edit lands on Step 8 (Review) directly. Each section shows an Edit affordance that jumps to the relevant step. Detour steps show a "Done" footer that returns to Review. Create stays linear.

## Decision

**Edit mode opens at Step 8 (Review). Detour steps show a "Done" footer that returns to Review. Create mode stays linear.**

### Edit entry flow

```
User taps "Edit listing" in /me/listings or listing detail
  → Wizard initializes with mode="edit", entryStep="review", payload=listingToPayload(listing)
  → Lands on Step 8 (Review)
  → Sees full listing summary with per-section "Edit" affordance
  → Taps "Edit Price"
  → Wizard navigates to Step 5 (Price)
  → Footer shows single full-width "Done" button (no Back / Continue / Skip)
  → Seller edits the field locally
  → Taps Done → wizardMachine dispatches GO_TO_STEP("review")
  → Back on Review with the edit visible in the summary
  → Taps "Save changes" → applies edit session per ADR-0025
```

### State machine extensions

`wizardMachine` `INIT` action accepts a new `mode: 'create' | 'edit'` discriminator and an optional `entryStep` override:

```ts
dispatch({
  type: "INIT",
  draftId: null,
  listingId: listing.id,
  payload: listingToPayload(listing),
  mode: "edit",
  entryStep: "review",
});
```

`buildMachineContext` exposes an `editDetourActive` boolean: `mode === "edit" && currentStep !== "review"`. `WizardFooter` reads it and renders:

| `mode` | `currentStep` | Footer shape |
|---|---|---|
| `create` | non-review | Back + Continue (existing) |
| `create` | `review` | Back + Publish (existing) |
| `edit` | `review` | (no Back from Review) + Save changes |
| `edit` | non-review (detour) | single full-width Done → `GO_TO_STEP("review")` |

There is intentionally no Back button on edit detour steps. Back and Done would do the same thing (return to Review without committing) — collapsing them into a single Done action removes the ambiguity.

### Locked-field handling in edit detour

`Listing.canEditField()` already rejects edits to `vin`, `brandId`, `modelId`, `generationId`, `year`. In edit mode, the corresponding step bodies render the fields as `disabled` (already in code for Step 1 and Step 3). Edit detour can still navigate to these steps — the user sees the locked fields with their values plus a "This field cannot be changed after publishing" helper — but Done is the only available footer action.

### Save changes from a detour step

Locally-staged edits persist across detours because they live in `machineState.payload`, not in the step component. Save changes is only available from the Review screen — a user mid-detour must Done back to Review before committing. This keeps the commit gesture in one place.

## Consequences

### Positive

- **Mental model match.** Edit users know what they want to fix. Show what's there, let them point at it, fix it, see the change reflected.
- **Zero new UI surface.** Step 8 Review already has the per-section "Edit" affordance for the create flow's post-completion corrections (`onGoToStep` plumbing exists). Edit mode just starts in the state create mode ends in.
- **Create remains linear.** New sellers genuinely don't know what fields exist; sequential progression ensures completeness. The pattern that works for create is not broken for edit's benefit.
- **Single commit destination.** Save changes lives on Review, the same screen edit users land on. No hunt-the-button moment.
- **Reuses `wizardMachine` cleanly.** `GO_TO_STEP` already validates dependencies (downstream-of-dependencies behavior). Detour navigation is exactly what `GO_TO_STEP` was built for.

### Negative / accepted costs

- **`wizardMachine` reducer gains a `mode` discriminator.** ~10 LOC; the reducer stays small. `buildMachineContext` adds the `editDetourActive` flag.
- **`WizardFooter` branches on mode + step.** Already branches on `isLastStep`; adding the detour case is a small extension.
- **Edit users never see steps 1–7's progress bar position counter.** Review is always Step 8/8. The progress bar visually disappears in edit (or shows 100% always). Acceptable — edit isn't a progression activity.
- **Two distinct flows to QA.** Create's linear path and edit's review-first path each need their own walkthrough. The shared state machine reduces duplication; the flows still differ.

### Neutral

- **Tappable step jump (Shape B) is permanently rejected** for both modes. Create is intentionally linear; edit gets jumping for free via Review's section-edit affordance — there is no remaining use case for header tap-to-jump.
- **Edit-from-deep-link (`/listings/:id/edit?focus=photos`)** is forward-compatible. Phase 2 may add `entryStep` override via search param. Current API supports it.
- **Save changes vs Publish** stay visually distinct: Save changes is `variant="brand"` (red commit), same as Publish, just labeled differently. ADR-0025 covers the atomicity of the commit itself.

## Alternatives considered

- **A — Strict linear, same as create.** Rejected: forces edit users to Back through untouched steps. Fails the basic mental model of "fix the thing that's wrong."
- **B — Tappable step jump in both modes.** Rejected: adds UI chrome (step list sheet, jump affordance in header) that benefits edit at the cost of cluttering create. The same jumping behavior is achievable in edit via the existing Review section-edit affordance with zero new chrome.
- **Open at the step that has the most "incomplete" indicator.** Considered for edit — e.g., open at Photos if there's only one. Rejected: heuristic; doesn't generalize; surprises the user. Review-first is predictable.
- **Open at the field that was most recently edited.** Rejected: requires tracking edit history; speculative UX value; predictability of "always Review-first" wins.

## References

- [ADR-0024](0024-owner-post-publish-photo-editing.md) — Owner post-publish photo editing (the contract; reachable via the Review section-edit affordance)
- [ADR-0025](0025-edit-save-atomicity.md) — Edit-mode Save changes uses sequential best-effort (the commit gesture this flow lands on)
- [ADR-0019](0019-context-md-describes-current-state.md) — CONTEXT.md describes current state, not aspirational spec
- `apps/mobile/CONTEXT.md` — Mobile app routes + planned refactor roadmap
- `apps/mobile/src/listings/CONTEXT.md` — `wizardMachine` step dependency graph + navigation rules
- `apps/mobile/src/listings/wizard/wizardMachine.ts` — reducer
- `apps/mobile/src/listings/wizard/Step8Review.tsx` — existing per-section edit affordance via `onGoToStep`
