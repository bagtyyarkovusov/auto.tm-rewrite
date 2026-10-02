> Archived assessment, 2 October 2026. Evidence uses the original audit baseline. Live GitHub and the release map govern execution. Private raw transcripts and temporary indexes are intentionally omitted. This note contains sanitized evidence summaries, not a portable copy of the private corpus.

> Durable follow-ups: #536 upload/media ownership, #537 returned media IDs and retry, #538 dirty edit/refetch. #518 remains the existing restore-confirmation issue. The reproduction output below is archived; rerun against current source before implementation.

# AutoTM code and verification audit

Inspected checkout: `8ed5dcbdd2ecbca3e494f4e18e17edd91f3c0edb`, current local main, 2 October 2026. This was a read-only code assessment. No tracked files, Git branches, issues, pull requests, databases, or deployed services were changed. Temporary tests and reports live under `/tmp`.

## My judgment

The codebase is worth preserving. It is not a prototype that needs another rewrite. The main risk is that many individually reasonable components can still form a broken or unsafe complete journey. One issue can pass its own tests while a neighboring component assumes a different identifier, lifecycle, or ownership rule.

The immediate engineering priority is a short stabilization pass through listing media ownership and edit-save behavior. After that, build a repeatable release smoke covering the few journeys that make this a marketplace. More feature work, more generic abstractions, and a wholesale architectural cleanup would have lower value right now.

## Three concrete findings

### 1. Listing media storage ownership is not enforced through attachment and cleanup

**Priority: first coding fix before admitting untrusted public users. Confidence: high at the application boundary. Live storage impact was not tested.**

The API authenticates the caller and checks that their own Listing is mutable. It does not establish that the object key they attach belongs to their upload. This distinction matters because removing that newly attached media tells storage to delete the original and its derivatives.

Evidence chain:

- `packages/contracts/src/schemas/listings.ts:260` accepts an arbitrary string `key` in `AttachMediaRequestSchema`.
- `apps/api/src/modules/listings/presentation/listings.controller.ts:316` checks suspension, parses the body, and forwards its key to the use case at line 333. There is no upload-provenance check at this transport.
- `apps/api/src/modules/listings/application/AttachMedia.ts:54` checks only that the parent Listing is owned by the caller and not deleted; line 58 blocks banned Listings. Lines 65 to 81 enforce counts. None of these binds the storage key to the caller.
- `apps/api/src/modules/listings/infrastructure/NullContentClassifier.ts:7` always accepts. This is an intentional placeholder for classification, not an ownership policy.
- `apps/api/src/modules/listings/infrastructure/SharpImageVariantGenerator.ts:70` reads the supplied key and writes variants alongside that key. Its bucket decision is at line 133.
- `apps/api/src/modules/listings/application/GetListingDetail.ts:124` includes raw media keys in public Listing detail. `listings.controller.ts:188` declares the detail route public. Keys therefore cannot be treated as secret capabilities.
- `packages/db/prisma/schema.prisma:446` has a `ListingMedia` key without a uniqueness or provenance constraint. `PrismaListingMediaRepository.ts:12` creates the supplied key unchanged.
- `apps/api/src/modules/listings/application/RemoveMedia.ts:36` checks ownership of the attached Listing, then checks that its media row belongs to that Listing at line 47. Lines 55 to 72 delete the stored key's original and derivatives. A duplicate reference to another Listing's key reaches those deletes.
- Presigning also drops user ownership: `UploadsController.ts:25` uses `userId` only for suspension; line 37 passes kind, type and size to `PresignUpload`. `PresignUpload.ts:68` generates `pending/<random UUID>/original.<ext>` without an owner or an upload record. `PublishListing.ts:136` takes keys from the draft and generates variants, so the correction needs to cover publication as well as later attachment.

I reproduced the application behavior with in-memory repositories and a fake storage port. An attacker-owned Listing accepted a key already referenced by a second Listing; removing the attacker Listing's newly attached media scheduled deletes under the second Listing's object prefix. The regression assertion, “do not schedule removal of another Listing's original and variants,” failed. No network or storage call was made.

Recommended correction: make upload ownership explicit and validate it in both publish and attach. Bind upload state to the User, validate object type/size/existence server-side, prevent cross-user adoption and duplicate ownership, and make cleanup depend on authoritative ownership/reference state. Add a two-user negative test and a race/retry test. A user-controlled path prefix alone is not sufficient. Do not solve this by hiding object keys in responses.

Related historical issue [#91](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/91) is closed. Its acceptance criteria say “verifies parent ownership”; they do not require ownership of the uploaded object. Targeted issue searches found no open issue specifically addressing this chain. That search is not a guarantee that none exists under other wording.

### 2. Edit-save discards the server ID of newly attached media

**Priority: immediately after the ownership fix. Confidence: reproduced with the real mobile hook and fake API mutation boundaries. Native end-to-end behavior was not tested.**

`useSaveListingEdit.ts:259` attaches each new photo but ignores the returned response. At line 283 it reorders using `photo.photoId`, the local staging UUID. The API creates a different random UUID in `AttachMedia.ts:105` and returns it in `listings.controller.ts:340`. `PrismaListingMediaRepository.ts:52` updates by the server media ID and Listing ID.

The result is that adding a new photo during edit supplies an ID to reorder that the database does not own. This can leave fields and attachments saved while final ordering fails. Retry retains the same local UUID, so the simple retry path does not repair the mismatch.

Why tests missed it: `useSaveListingEdit.spec.tsx:212` already mocks an attach response with a distinct server UUID, but the reorder mock at line 227 blindly returns success without validating the request payload. The happy-path assertions at line 247 check the sequence of calls, not whether their data can be accepted by the next service. This is a particularly clear example of tests proving local choreography while missing the joined contract.

The temporary regression test asserted that reorder uses the server ID returned by attach. It failed with the local ID in the actual request. Preserve the sequential best-effort design approved by ADR-0025; retain a local-to-server ID map and a stable operation plan across retries, then assert the IDs and final order against a realistic API fixture. A bundled transactional endpoint is not required to fix this bug.

Related completed work is [#131](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/131), the Save changes orchestrator, and [#130](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/130), edit photo operations.

### 3. Listing refetch overwrites unsaved edit state

**Priority: same edit stabilization task. Confidence: reproduced through the rendered route with the repo's native test adapter. Refetch timing on an actual device is untested.**

`apps/mobile/app/listings/[id]/edit.tsx:164` dispatches `INIT` every time the query's `listing` object changes. `wizardMachine.ts:153` replaces the edit payload and sets the step back to specs or review. The query is not a one-time seed: `useEditListing.ts:23`, `useAttachMedia.ts:17`, and `useRemoveMedia.ts:16` all invalidate Listing detail while the save sequence remains active.

I rendered the actual edit route, chose an unsaved Damaged answer, and returned a new Listing object that changed only `favoriteCount`. The first assertion confirmed the user's answer was selected. After rerender, the assertion that it stayed selected failed; both options were unselected again. This demonstrates the edit-state reset without relying on network timing.

Recommended correction: establish an edit session with an immutable server baseline and initialize it once per Listing/session. Keep dirty edits and the operation plan separate from background query snapshots. Reconcile only after successful save or an explicit reload choice. Exercise a refetch during a dirty edit and between successful/failed media operations.

## Reproduction evidence

The clean isolated run contains exactly three new tests. All three fail the expected safety/correctness assertion and thereby reproduce the missing guarantees. This is not a claim that the repository's existing suite is red or that hosted CI passed.

- Config: `docs/research/evidence/workflow-review-2026-10-02/vitest.config.ts`
- Media-ID test: `docs/research/evidence/workflow-review-2026-10-02/edit-id-mapping.spec.tsx`
- Refetch test: `docs/research/evidence/workflow-review-2026-10-02/edit-refresh-state.spec.tsx`
- Fake-port ownership test: `docs/research/evidence/workflow-review-2026-10-02/media-ownership.spec.tsx`
- Machine-readable result: `docs/research/evidence/workflow-review-2026-10-02/archived-results.json`
- Clean human-readable result: `docs/research/evidence/workflow-review-2026-10-02/archived-results.txt`

Run the preserved fixtures using the relative command in [their README](evidence/workflow-review-2026-10-02/README.md). The archived run predates relocation; portable-form verification is recorded separately in the PR.

An exploratory copied route test initially also ran two existing legacy assertions against the temporary setup. Those two assertions were removed from the final isolated run and are not counted as new findings.

## Verification is substantial, but incomplete at the joins

Handwritten source inventory, excluding dependencies, compiled output, Prisma-generated code, native generated directories, and Expo output:

| Area | Production source files | Production lines | Test files | Test lines |
|---|---:|---:|---:|---:|
| API | 326 | 23,843 | 167 | 37,509 |
| Mobile | 303 | 30,770 | 169 | 19,406 |
| Admin | 31 | 3,211 | 9 | 1,482 |
| Public web | 24 | 1,980 | 9 | 800 |
| Worker | 42 | 2,089 | 17 | 2,134 |
| SMS gateway | 9 | 137 | 1 | 54 |
| Phone agent | 4 | 93 | 0 | 0 |
| Shared packages | 65 | 7,924 | 15 | 5,625 |

This is 1,191 handwritten code/test files and 137,057 lines in the counted extensions. Counts establish scale, not test adequacy or coverage percentage. API has 20 `*.e2e.spec.ts` files and worker has two. The migration directory has 21 migration directories.

51 of the 169 mobile test files read source text in some way, about 30%. This count includes mixed behavioral/structural tests and legitimate configuration/route-contract checks. It does not mean all 51 are useless. Examples such as `components/ErrorState.spec.tsx:10` check that strings/classes appear in source, which can pass without proving a user can see an error or retry. The repo has already started moving toward rendered behavior tests; `docs/agents/mobile-testing.md:154` explicitly describes that migration.

The native test adapter has useful, clearly documented limits. `docs/agents/mobile-testing.md:127` says it cannot establish NativeWind resolution, measured layout, native services, virtualization, keyboard behavior, portals or screen-reader output. Its focus hook is a no-op, and router mocks do not mount a navigation tree. Existing screenshots/device evidence should be retained, but a unit pass cannot substitute for a release journey.

CI is a strength. `.github/workflows/pr-checks.yml:14` cancels obsolete PR runs; lines 73 to 79 migrate a disposable database and bootstrap object storage; lines 81 to 91 run lint, typecheck and repository tests. Docs-only changes use a tested lane. However, the required PR job stops without `pnpm build`; the main workflow builds only after merge. Build dependencies in Turbo cover shared packages, not automatically every app production build. Add affected application builds to PR evidence where they are currently left to an implementer's manual step. There is no automatic native journey runner in the checked GitHub workflows.

## A small release proof that would pay back quickly

Use a repeatable backend fixture and a signed native development/reviewer build. Record the build ID, Git commit, backend environment, date, platform and result in one release record. Keep the gate small enough that one developer actually repeats it.

1. Anonymous browsing, search, filters, listing detail and Back behavior.
2. Sign-in from a protected action, replaying exactly one Favorite or Message, followed by token expiry/refresh and sign-out/account switch.
3. Create a listing with real photo picking, compression, upload, lost network, resumed upload and publication.
4. Edit it with a field change, photo add/remove/reorder, and a forced failure after one successful operation; retry and verify server state.
5. Buyer/seller chat over two sessions, reconnect, duplicate-send protection, suspension/blocking and one actual push delivery.
6. Account deletion request and privacy lifecycle, plus moderation/report access as the intended admin.

The ID and refetch findings show why this needs both focused contract tests and a device pass. Begin with listing create/edit and auth replay. Do not spend a month designing a universal mobile test framework first.

## What is unfinished, and what that implies

- SMS delivery is a scaffold. `apps/sms-gateway/src/server.ts:20` selects `OtpSenderMock` for both `mock` and `fleet`. The mock returns a successful generated ID without sending. `apps/phone-agent/CONTEXT.md:3` describes an unconnected Android service/client shell. Email delivery/reviewer auth can support the currently approved release path, but do not promise ordinary real-phone SMS until there is real delivery evidence. Consider making unavailable fleet mode fail visibly before operational use.
- Saved-search matching and blog publishing are deferred boundaries, not shipped behavior. Their `CONTEXT.md:3` files correctly say there is no registered public API module. The main API composition confirms that absence. Leave these deferred until the marketplace loop is reliable.
- `apps/worker/src/queues/orphan-cleanup.processor.ts:10` and `video-transcode.processor.ts:10` throw permanent unsupported errors. This is honest failure behavior and should be preserved. Broad object cleanup remains absent, so storage growth needs monitoring and a later ownership-aware cleanup plan. Do not rush deletion before fixing ownership semantics.
- The public web currently provides landing/legal/trust/account-deletion pages. `apps/web/CONTEXT.md:3` explicitly says listing/dealer/blog and SSR marketplace fetching are absent. [#95](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/95) is closed as deferred web SSR work. This is product scope, not a reason to rewrite Next.js or split repos.
- Real push credentials/device delivery remain an operational proof item. Provider code and worker tests are present, but that alone establishes no delivered notification. The worker overview states this correctly.

## Maintenance priorities after stabilization

Refactor only where repeated changes justify it. `app/conversations/[id].tsx` is 1,033 lines, `Step4Specs.tsx` is 894, `ConversationGateway.ts` is 672, and the sell route is 582. These are candidates to separate orchestration/state from view content, using behavioral tests at the boundary. File length alone is not proof of a defect. Do not fragment them into dozens of one-line wrappers merely to hit a limit.

`DraftsController.ts:58` logs the entire invalid request body. A malformed draft can contain contact phone, freeform description and location text, as well as unexpected extra fields. Replace full body logging with route, error code, field names and request correlation information. `FavoritesController.ts:55` has the same debug pattern for query data. The privacy concern is concrete for draft content; I did not inspect production logs or observe a leak.

Architecture checks protect identity imports in `apps/api/eslint.config.mjs:19`. Other boundary rules mostly rely on reviews. Domain source scanning found no imports from Nest, Prisma, database runtime, BullMQ or Socket.IO in API domain files. Keep that strength. A later small automated boundary check may reduce reviewer effort, but architecture policy expansion is not more urgent than the reproduced issues.

Synchronous Sharp processing does 8 derivative writes per image. `PublishListing.ts:138` processes all attached images concurrently before the database transaction. Measure resource usage and publish latency before adding an async architecture. A concurrency cap may be enough initially. No load regression was measured in this audit.

## What not to rewrite

Keep pnpm/Turbo, the monorepo, contracts package, the API's domain entities and ports, the shared conversation-send policy, the upload staging state machine, existing migration history, hosted disposable CI services, and durable Git/PR evidence. Each removes a real coordination or correctness problem for a solo developer.

There are strong concrete designs here: refresh rotation uses compare-and-swap in `RefreshSession.ts:52`; repeated message sends reuse the shared path and client ID in `SendConversationMessage.ts:52`; readiness checks are bounded and redact raw dependency failures in `common/readiness.ts:25`; admin tokens stay server-side behind cookie/forwarding logic. Preserving these is more valuable than a new framework or a second rewrite.

The next technical work should narrow uncertainty in a complete user journey, not increase the number of implemented modules.
