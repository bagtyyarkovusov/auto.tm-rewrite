# Sprint 4 — Listings CRUD — Retro

> Append-only per [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md). Closure-time changes to a sprint plan that already shipped (🟡 → 🟢) land here, not in `sprint-04-listings-crud.md`.

## Closure pass — 2026-05-19

End-of-sprint hardening of the mobile create-listing wizard and media pipeline against the wireframe + hifi spec. Driven by visual review of in-app screenshots that surfaced inconsistencies between code and design intent.

### Scope of this pass

Targeted closure work in two PRs:

1. **Mobile wizard structural fixes + visible bugs.** Brings the wizard into structural parity with the wireframe and hifi spec, fixes brand/model pagination, removes duplicate error rendering, hides the bottom tab bar inside the focused flow.
2. **Docs + retro.** This file plus the banner update on the wireframe and hifi spec, plus the mobile listings CONTEXT.md.

Maintainability refactors (unifying `wizardMachine` + `useUploadQueue`, consolidating the three retry systems, the 23-dep autosave `useEffect`) were explicitly scoped **out** of this pass. They're captured as a follow-up issue and naturally fold into S8 when the variant generator moves to BullMQ.

### Changes that diverge from the original sprint lock

#### 1. Step count: 7 → 8 (Review as its own step)

The original spec (`sprint-04-listings-crud.md:232`) and the wireframe (`docs/prd/ui/wireframes/mobile-create-listing-wizard.md:580–609`) put the Review summary inline at the bottom of Step 7 (Description + Contact), with Publish as the Step-7 primary CTA. The implementation already shipped Review as a distinct screen (`Step8Review.tsx`) accessed via `dispatch({ type: "GO_TO_STEP", step: "review" })`, and at closure time we chose to formalize that shape rather than collapse it back.

- **What changed**: `WizardStepSchema` and `WIZARD_STEPS` in `packages/contracts/src/schemas/wizard.ts` now include `"review"` as a real step. `STEP_DEPENDENCIES["review"]` requires every prior data step to be validated. `validateStep("review", ...)` always returns valid (no fields of its own). The mobile header reads "Step N of 8" and the progress bar is position-based.
- **Why**: Review-as-its-own-screen tests better with users when the data set above it is large enough that a single scroll-view of Description + Contact + Review feels crowded. Keeping it as a distinct step also makes the "Publish" affordance unambiguous (it's the only CTA on the Review screen) and avoids confusion about whether scrolling further reveals more required fields.
- **Spec docs touched**: a banner has been added to both `docs/prd/ui/wireframes/mobile-create-listing-wizard.md` and `docs/prd/ui/hifi/mobile-create-listing-wizard.md` pointing back to this retro. The original specs are otherwise left intact for historical reference.

#### 2. Error display: global stack → per-field inline

The original layout rendered the current step's Zod errors as a global stack at the top of the step body (`WizardLayout.tsx:145–153`). Each step component also rendered the same flat error list. This produced:

- Doubled error text in the UI (the photo step and brand-and-model step in the closure-time screenshots both showed every error twice).
- Bare `"Required"` messages because the schemas used `.uuid()` without per-field messages.
- Errors disconnected from the fields they referred to — three identical `"Required"` lines with no visual link to Brand / Model / Year.

- **What changed**: `validateStep` now returns `{ valid, errors, fieldErrors }` where `fieldErrors` is keyed by the Zod issue's first path segment. `errors` remains a flat string list for backward compatibility with the API endpoint (`ValidateDraftStep`). Each step component reads `fieldErrors[fieldName]` and renders the error directly under the relevant input. Custom user-facing messages on each field (e.g. `"Brand is required"`, `"Year is required"`) replace the bare `"Required"` defaults. `WizardLayout` no longer renders a global error block; the layout-level error UI is reserved for save-failure banners and a one-line `disabledReason` helper below a disabled Continue/Publish.
- **Why**: matches the hifi spec's stated rule ("Field validation: inline under field with `text-destructive`") and eliminates the duplicate rendering. Custom messages make each error self-explanatory without spatial context.

#### 3. Brand / Model pagination — fetch-all-then-search

The wireframe described a searchable picker but the mobile hook only fetched one cursor page from the API (default 50). The data set is 130 brands and 2,447 models seeded; for a single brand the model list maxes out around ~80, so the picker silently truncated.

- **What changed**: `useBrands` requests `limit=300`, `useModels` and `useGenerations` request `limit=500`. The shared `CursorPaginationRequestSchema` (`packages/contracts/src/pagination.ts`) had its `max` bumped from 50 to 500 — only catalog endpoints consume it; the listings feed has its own schema that retains the 50-item cap appropriate for feed reads. Search remains client-side; the wireframe's "Popular" section is deferred (no popularity field on `Brand` today).
- **Why**: fastest fix that makes the picker honest. Server-side `?search=` is the longer path but unnecessary for lists this size.

#### 4. Picker sheet UX

- Bottom `Cancel` buttons replaced with an `X` close icon in the sheet header (matches the wireframe pattern at `wireframes/mobile-create-listing-wizard.md:343–356`).
- Inner `<ScrollView className="max-h-80">` constraints removed; the RNR `Sheet` handles its own scroll containment, so the fixed max-height was clipping the list on tall phones.

#### 5. Wizard route — tab bar hidden while open

The wizard renders inside `(tabs)/sell.tsx`, so the bottom tab bar was visible alongside the focused flow. Rather than pushing the wizard to a separate route hierarchy, we set `tabBarStyle: { display: "none" }` via `navigation.setOptions()` when `machineState.status !== "idle"`. The tab bar restores when the user exits the wizard (Discard, Publish success, or back-out).

#### 6. Header structure

The header now renders two rows of metadata above the progress bar:

- Row 1: Back / route title ("Sell car" / "Edit listing") / overflow.
- Row 2: bold step title (e.g. "VIN or chassis number", "Vehicle", "Specs"), with `Step N of 8` on the left of the meta row and `Saved` / `Saving...` / `Could not save — Retry` on the right.
- Progress bar is **position-based**: `(stepNumber / 8) × 100`. Previously the bar showed `(validatedSteps.length / 7) × 100`, which read 0% on Step 1 with nothing validated yet — disorienting.

#### 7. VIN step Skip behaviour

The Skip button on Step 1 used to clear the VIN but stay on the step. It's now a footer secondary action that clears the field *and* advances to Step 2, matching the wireframe footer pattern.

### Maintainability follow-ups (NOT in this pass)

These are real but were scoped out under "structural parity + bugs":

- `wizardMachine` and `useUploadQueue` are two independent state machines hand-synced via a 23-dep `useEffect` in `sell.tsx`. Worth unifying when S8 swaps the variant generator to BullMQ — the queue boundary gets revisited then anyway.
- Three independent retry systems: `useWizardAutosave` exponential-backoff, `useUploadQueue` concurrency runner, `appStateResume` network listener. None observe each other.
- `useUploadQueue` carries four parallel refs (`queueRef`, `runningUploads`, `uploadQueue`, `uploadPhotoRef`) implementing a hand-rolled concurrency limiter inside a hook.
- Locale is hardcoded `"ru"` across catalog hooks; there's no `useLocale()` provider on mobile yet. Add when the bilingual UI work begins.

### Verification

- `pnpm --filter @auto-tm/contracts test`: 79/79 pass after schema + message updates.
- `pnpm --filter @auto-tm/mobile typecheck`: clean.
- `pnpm --filter @auto-tm/mobile test`: 89/89 pass (includes updated `useBrands.spec.tsx` URL assertion + new `wizardMachine.spec.ts` cases for `mapLegacyStep(8)`, `fieldErrors`, and position-based progress).
- Manual smoke in Expo Go: pending; see closure PR description for the walked path.

### Files changed (closure pass)

```
packages/contracts/src/schemas/wizard.ts                  — review step, fieldErrors, custom messages
packages/contracts/src/pagination.ts                       — limit cap 50 → 500 (catalog only)
packages/contracts/tests/schemas.test.ts                   — test updates
apps/mobile/src/listings/wizard/wizardMachine.ts           — review in enum, position-based progress, fieldErrors expose
apps/mobile/src/listings/wizard/wizardMachine.spec.ts      — mapLegacyStep(8), fieldErrors assertions
apps/mobile/src/listings/wizard/WizardLayout.tsx           — routeTitle, stepTitle, stepNumber/Count, secondaryAction, no global error stack
apps/mobile/src/listings/wizard/Step1Vin.tsx               — fieldErrors prop, helper text restored
apps/mobile/src/listings/wizard/Step2Photos.tsx            — fieldErrors prop, dropped duplicate error block
apps/mobile/src/listings/wizard/Step3VehicleId.tsx         — fieldErrors prop, sheet header X, max-h removed
apps/mobile/src/listings/wizard/Step4Specs.tsx             — fieldErrors prop, sheet header X, max-h removed
apps/mobile/src/listings/wizard/Step5Price.tsx             — fieldErrors prop, sheet header X
apps/mobile/src/listings/wizard/Step6Location.tsx          — fieldErrors prop, helper text, sheet header X, max-h removed
apps/mobile/src/listings/wizard/Step7DescContact.tsx       — fieldErrors prop, helper text, contact labels
apps/mobile/src/listings/wizard/Step8Review.tsx            — STEP_LABELS adds review
apps/mobile/app/(tabs)/sell.tsx                            — routeTitle/stepTitle split, Skip secondaryAction, navigation.setOptions to hide tab bar
apps/mobile/app/listings/[id]/edit.tsx                     — updated WizardLayout props
apps/mobile/src/api/catalog/useBrands.ts                   — limit=300
apps/mobile/src/api/catalog/useModels.ts                   — limit=500
apps/mobile/src/api/catalog/useGenerations.ts              — limit=500
apps/mobile/src/api/catalog/useBrands.spec.tsx             — assertion URLs updated
apps/mobile/src/listings/CONTEXT.md                        — 8-step shape, per-field error rule
docs/prd/ui/wireframes/mobile-create-listing-wizard.md     — closure banner
docs/prd/ui/hifi/mobile-create-listing-wizard.md           — closure banner
docs/prd/sprints/sprint-04-listings-crud-retro.md          — this file
```

## MLP roadmap reshape note — 2026-05-23

[ADR-0027](../../adr/0027-mlp-beta-scope.md) supersedes the old broad Phase 1 forward references inside the locked S4 sprint plan and this pre-retro. Those references were correct when S4 was shaped, but they no longer describe the current trajectory.

Interpretation rule for future agents:

- Do not edit the locked S4 sprint plan just to rename old future sprints.
- Treat `docs/prd/03-roadmap.md`, `docs/prd/02-phases.md`, and ADR-0027 as the current sequencing source of truth.
- S5 now means Search + listing detail.
- S6 now means Contact seller.
- S7 now means Minimal admin + moderation.
- S8 now means Private beta polish.
- Old references to S5 Listings UX, S6 Garage + Dealership, S8 Notifications + Subscriptions, S9 Admin dashboard, and S10 Polish should be read as post-MLP candidates unless a current pending sprint file explicitly includes the work.

This is a documentation interpretation note only. It does not change what S4 shipped or what S4 committed to build.
