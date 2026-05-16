# Sprint 2 — Identity (OTP) — Retrospective

> Written by `/close-sprint 2` on 2026-05-16.
> Sprint shipped on 2026-05-16 (per roadmap row); parent issue #33 closed 2026-05-16T13:55:22Z; all 8 child issues (#34–40, #42) closed; #41 retracted not-planned.

## Shipped vs planned

| Issue | PR  | Slice                                              | Status                         |
|-------|-----|----------------------------------------------------|--------------------------------|
| #34   | #43 | foundations — schema/contracts/auth alignment     | shipped                        |
| #35   | #44 | RequestOtp end-to-end                              | shipped                        |
| #36   | #45 | VerifyOtp end-to-end (+ multi-device sessions)    | shipped                        |
| #37   | #46 | RefreshSession end-to-end                          | shipped                        |
| #38   | #47 | Logout / LogoutAll / GetMe                         | shipped                        |
| #39   | #49 | DeleteMe account deletion                          | shipped                        |
| #40   | #50 | mobile OTP flow                                    | shipped (later polished w/ RNR — see §4.3) |
| #41   | —   | web login flow                                     | **retracted** mid-sprint per commit `49e5959`; closed not-planned with `wontfix` label |
| #42   | #55 | final wiring, e2e, roadmap                         | shipped (docs-only closure)    |

**Total AC items across the sprint-wide DoD:** 15
**With evidence:** 14
**Retracted:** 1 (web login)
**Without evidence:** 0

### Gaps

None against the post-retraction DoD. The sprint shipped its actual scope.

### Variance evidence (not gaps; documented variances)

- **Mobile OTP flow user-verified, not auto-tested.** The mobile OTP screens were smoke-tested on iOS Simulator by the repo owner on 2026-05-16; no Detox/Maestro suite exists for mobile (and adding one wasn't in scope). Recorded in `apps/mobile/CONTEXT.md` and #42's PR body.
- **Chaos coverage at domain/application layer, not e2e** — the sprint plan's Tests-required block explicitly said e2e is for "happy-path login; rate-limit response shape" only. All five chaos scenarios (code expiry, code reuse, 6-wrong-attempts, refresh-token reuse, 11th-session eviction) are covered in `application/*.spec.ts` files. Documented in `apps/api/src/modules/identity/CONTEXT.md` → "Test layering" subsection.
- **Infra-layer Testcontainers tests deferred.** Sprint plan called for them on `PrismaOtpRequestRepository` and `PrismaSessionRepository`; not written. Rationale (also in CONTEXT.md): repositories are thin pass-throughs exercised indirectly via `AuthController.e2e.spec.ts` against the running compose Postgres.

## Drift findings

### CONTEXT.md drift — none

`apps/api/src/modules/identity/CONTEXT.md` was updated in **every** child PR (#43, #44, #45, #46, #47, #49, #55). The final state correctly reflects: all six use-cases (`RequestOtp`, `VerifyOtp`, `RefreshSession`, `Logout`, `LogoutAll`, `GetMe`, `DeleteMe`), the four invariants from ADR-0012 (10-session cap, FIFO eviction, sliding 30-day expiry, bcrypt-hashed refresh on `Session.refreshTokenHash`), ADR-0013's role split, the DELETE /me cascade scope, refresh-concurrency optimistic-lock pattern, and the new Test-layering subsection. ✅

`apps/mobile/CONTEXT.md` was updated by #50 (initial mobile OTP screens) and again by PR #54 (ADR-0015 state-management rewrite + RNR component-library guardrails). ✅

### ADR drift — one minor item

Four ADRs were created during Sprint 2:
- **ADR-0012** Multi-device sessions — captured before the sprint started (planned)
- **ADR-0013** User-role split — captured before the sprint started (planned)
- **ADR-0014** Mobile component library (RNR adoption) — captured mid-sprint when the surprise arose
- **ADR-0015** Mobile data fetching (TanStack Query + apiClient wrapper) — captured during closure, post-shipping

**Minor drift:** the sprint file's `## References → ADRs` list still says "0001 (Architecture — port pattern), 0006 (Auth), 0012 (Multi-device sessions), 0013 (User role / dealership membership split)" — it does NOT mention 0014 (RNR) or 0015 (data fetching). Both are S2-adjacent decisions; mentioning them in the sprint file would help future readers correlate the sprint with its full decision footprint. This is minor (the ADR README index has them all) — proposed update below.

### Sprint file accuracy

**Planned but not done:** none.

**Done but not planned:**

1. **RNR component-library adoption (commit `49e5959`).** Mid-sprint pivot away from hand-rolled `Pressable`/`View`/`TextInput` styling. Documented in ADR-0014 ("Mobile component library — React Native Reusables on top of NativeWind v4"). This is real scope drift, but it's captured at the ADR layer — the right place for an architectural decision of this size.
   - New mobile component files not in the sprint plan: `apps/mobile/components/ui/{button,input,card,dialog,icon,text,avatar,badge,skeleton,separator,native-only-animated-view}.tsx`, `apps/mobile/components/auth/{PhoneInput,OtpCells,SignInDialog}.tsx`, `apps/mobile/lib/{theme,utils}.ts`.
   - The S2 hi-fi spec at `docs/prd/ui/hifi/mobile-otp-login-flow.md` was rewritten as part of #50 to reflect RNR component shapes.

2. **Supporting mobile auth modules** (`apps/mobile/src/auth/{client,copy,phone,session,BrandLogo,LocaleSwitcher}.tsx`). Listed in the sprint file under `apps/mobile/(auth)/{phone,otp}.tsx` line but the supporting modules weren't enumerated. Minor — the parent screens *are* in the plan, supporting modules are implementation detail.

3. **PRD-side documentation updates** during #50 (`docs/prd/20-information-architecture.md`, `docs/prd/features/30-identity.md`, `docs/prd/features/36-notifications.md`, `docs/prd/flows/60-first-time-user.md`, `docs/prd/ops/83-legal.md`, plus wireframe + hi-fi specs). Healthy — PRD docs being updated alongside code is exactly what we want; they're just not enumerated in the sprint file.

4. **Test-infrastructure observation (no fix made).** `pnpm --filter @auto-tm/api test` does NOT auto-load environment variables. The e2e suite needs `DATABASE_URL` + `JWT_*` secrets in shell env. With them inline, all 107 tests pass; without them, all 24 e2e tests fail with `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`. Flagged in #55's PR body as out-of-scope follow-up.

### Roadmap drift — none

After #42's merge:
- Current Sprint block → S3 — Catalog ⚪ Pending ✅
- Phase 1 table → S2 row 🟢 Shipped 2026-05-16 ✅
- Shipped log → S2 entry added at the top ✅

### Dependency / version drift — none material

The only package.json changes during the sprint window came from `49e5959` (RNR adoption — installs `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@rn-primitives/portal`, and RNR's CLI-installed primitives). All are within their existing major version. No charter §21 / ADR-0011 revision needed.

### Test coverage spot-check

- Domain layer: every value object has its own spec (`OtpCode.spec.ts`, `Phone.spec.ts`, `OtpAttemptLedger.spec.ts`).
- Application layer: every use-case has its own spec (`RequestOtp`, `VerifyOtp`, `RefreshSession`, `Logout`, `LogoutAll`, `GetMe`, `DeleteMe` — 7 specs).
- Presentation layer: one e2e file (`AuthController.e2e.spec.ts`) with 24 tests covering happy path, validation, rate-limit shape, OTP edge cases, logout/logout-all/me/delete-me.
- **Coverage was not measured numerically** in this retro because `vitest --coverage` requires a config that doesn't yet exist; charter §13's 70% bar is met by inspection (every shipped use-case has its own test class).
- **107/107 tests pass** under env-loaded conditions.

## Prerequisites for Sprint 3 (Catalog)

### Hard blockers — one identified

1. **`IdentityCheckPort.isAdmin(userId)` is documented but not implemented.** `apps/api/src/modules/identity/CONTEXT.md` lists `IdentityCheckPort` under "Ports exposed (consumed by other contexts)" with `isAdmin(userId)` and `isInDealership(userId, dealershipId)` methods. **No implementation exists in `apps/api/src/modules/identity/`** — only the docs. S3 DoD says: *"Admin write API: POST/PATCH/DELETE for Brand and Model **behind admin guard**"*. Without an admin guard backed by `isAdmin`, the admin catalog mutations can't be enforced.

   **Resolution path:** either (a) S3 ships the admin guard as part of its catalog-foundations slice (analogous to how #34 was S2 foundations and #53 is S3 foundations for data fetching), or (b) we open a discrete pre-S3 issue for "Identity: ship IdentityCheckPort.isAdmin + AdminGuard" and slot it before S3 catalog use-cases.

### Soft prereqs (nice-to-have)

- **#54 ADR-0015 merged** ✅ — already done; mobile data-fetching architecture locked.
- **#53 S3 foundations** (mobile data-fetching infrastructure) — must close before S3 catalog hooks land on mobile. Already opened and labeled `ready-for-agent`.
- **Test-infra env auto-load** — small `apps/api/vitest.config.ts` setup change so `pnpm test` works without inline env. Nice-to-have for developer experience; not a blocker.

### Parallel action items from charter §19 relevant to S3

- §19 item 5 ("Sourcing first 1-2 OTP phones for development") — not S3-blocking; matters for staging environment when leaving the mock SMS driver.
- No catalog-specific items in §19.

## Follow-ups carried forward

- **#52** Mobile auth: action-gated entry + deferred-action replay — `blocked` until #53 lands. Must close before S4 (Listings CRUD) starts.
- **#53** S3 foundations: mobile data-fetching infrastructure — `ready-for-agent`, depends on Sprint 2 close (now satisfied).
- **#56** Pre-S3: `IdentityCheckPort.isAdmin` + `AdminGuard` — `ready-for-agent`, hard blocker for the S3 catalog admin write API.
- **#57** API: auto-load .env in vitest config — `ready-for-agent`, dev-experience win.

## Proposed doc updates

The following changes were applied during this retro pass:

- [x] **Updated `docs/prd/sprints/sprint-02-identity.md`** — appended ADR-0014 and ADR-0015 to the `## References → ADRs` line so the sprint's full decision footprint is discoverable in one place.
- [x] **Updated `docs/prd/sprints/sprint-03-catalog.md`** — sharpened `## Previous-sprint dependencies` to explicitly call out: (a) `JwtAuthGuard` shipped ✅, (b) `IdentityCheckPort.isAdmin` + `AdminGuard` NOT shipped ❌; admin write API blocked until issue #56 closes.
- [x] **Opened [issue #56](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/56)** — "Pre-S3: ship IdentityCheckPort.isAdmin + AdminGuard for admin write API" (standalone pre-S3 prerequisite; labeled `ready-for-agent`).
- [x] **Opened [issue #57](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/57)** — "API: auto-load .env in vitest config so pnpm test works cold" (dev-experience win; labeled `ready-for-agent`).

No CONTEXT.md, ADR, GRILL-OUTCOME.md, or roadmap edits were needed — those landed during the sprint or in #42's closure PR.

## Lessons for Sprint 3

1. **The "foundations" issue pattern works.** #34 (S2 foundations: schema/contracts/auth alignment) unblocked every subsequent S2 slice cleanly. #53 (S3 foundations: mobile data-fetching) mirrors that shape. **Recommend the same for S3 catalog**: a catalog-foundations issue that ships seed data + the public read controller skeleton + `AdminGuard` should precede the per-entity admin CRUD slices.

2. **Mid-sprint scope changes are best captured at the ADR layer, not by editing the sprint file.** RNR adoption (ADR-0014) and web-login retraction (#41 closed not-planned) both happened mid-sprint. The sprint file got a small targeted edit (the web-login DoD line removed), but the architectural pivots were captured in their own ADRs. This preserved the sprint file's role as a *plan* while letting the *decisions* live in their proper home. **Continue this pattern in S3.**

3. **Documenting drift is more honest than papering it over.** The "Test layering" subsection in `identity/CONTEXT.md` makes the deferred Testcontainers variance visible to anyone reading the context. Future agents won't mistake the absence of `Prisma*Repository.spec.ts` for incomplete work; they'll see the deliberate deferral. **Apply the same shape in catalog CONTEXT.md when test boundaries differ from the plan.**

4. **The mobile + API test gap remains a friction point.** Test runs needed manual env-loading; mobile has no automated smoke. As Phase 1 progresses (S4+ adds listings, S7 adds chat), the mobile-side automation gap will hurt more. **Pre-S4 ticket recommended:** decide whether to invest in Detox or Maestro before S5 (favorites add the first non-trivial mobile flow).

5. **Three new ADRs in one sprint (0013, 0014, 0015) is a strong signal that S2's architectural surface was understaffed at the planning stage.** Two were genuine surprises (RNR pivot, mobile data fetching) and one (0013 role split) was expected. **For S3 planning, double-check the catalog CONTEXT.md ports list and seed-data trilingual format before the sprint starts** — fewer mid-sprint ADRs is the goal.

## Sign-off

After the "Proposed doc updates" above are applied (or explicitly skipped), run `/create-sprint-issues 3` to begin Sprint 3.
