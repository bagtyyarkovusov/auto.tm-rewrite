# Issue 279 — Staging Reviewer Flow, Installable Builds, and Physical Push

Secret-free evidence for GitHub issue
[#279](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/279), the
human-operated integrated proof: exercise the complete staging reviewer path,
produce installable staging and `production-smoke` Android/iOS builds, and prove
offline direct-message native push plus conversation deep links on physical
devices. No store submission occurs.

Do not paste secret values, connection strings, access keys, JWT or TOTP
secrets, reviewer codes, admin backup codes, FCM/APNS credentials, dashboard
screenshots containing values, or provider logs containing secret values into
this file, GitHub issues, PRs, or chat. Record names, identifiers, commit SHAs,
variable names, timestamps, command names, and pass/fail results only.

## Context

| Field | Value |
|---|---|
| Evidence status | **Partial — issue remains open.** The staging reviewer path is fully proven and repeatable. The build and physical-push half is **not ready on either platform** and is blocked on external credentials and an upstream environment. |
| Environment | `staging` |
| Railway project | `auto-tm` (`176ddec0-dd65-4087-b82c-798599fc2ebe`) |
| Railway environment id | `652abc79-fdb0-48b0-9f6c-ad0ff572d7b2` |
| Deployed commit SHA under proof | `d1471212079ffccb6f9ea4cce66bfb1f7f98acff` |
| Public API host | `api-staging-2861.up.railway.app` |
| Public media host | `minio-staging-5795.up.railway.app` |
| Operator | Founder-authorized agent session, worktree `issue-279-bf365a` |
| Reviewer-flow smoke started at | `2026-09-05T19:34:18Z` |
| Reviewer-flow smoke finished at | `2026-09-05T19:34:41Z` |

## Prerequisites

- [x] #274 closed — idempotent reviewer scenario seed, rotation, revocation.
- [x] #275 closed — native FCM/APNS transport and token-history hygiene.
- [x] #276 closed — EAS profiles, production URL gate, OTA-negative proof.
- [x] #278 closed — staging applications deployed, CI gate proven, cold start measured
      (`docs/prd/ops/evidence/issue-278-staging-applications.md`).
- [x] The reviewer scenario is seeded in staging: 3 reserved accounts
      (`Reviewer Buyer 1`, `Reviewer Seller 1`, `Reviewer Buyer 2`), 2 seeded
      listings, 1 conversation, 1 report.

## Part 1 — Integrated Staging Reviewer Flow: **proven**

### The harness

The flow is driven by a checked-in, repeatable harness,
[`scripts/staging-reviewer-flow-smoke.mjs`](../../../../scripts/staging-reviewer-flow-smoke.mjs).
It exercises the real deployed surfaces — HTTPS, the Socket.IO `/ws/chat`
namespace over a real WebSocket upgrade, and MinIO signed `PUT`s — rather than
an in-process test double. It reads every credential from a local `0600` JSON
file and prints only check names, status codes, roles, identifiers, timings, and
`PASS`/`FAIL`. Nothing it emits is a secret, which is why its raw output can be
pasted into evidence.

`#278`'s equivalent script was ad hoc and local; this one is versioned so the
same proof can be re-run on every promotion, which is what the sprint's
"repeatable" requirement asks for. It is wired into the repo rather than left
loose: `pnpm smoke:reviewer-flow` runs it, `socket.io-client` is resolved
explicitly through `apps/mobile`'s package so the harness drives the same client
the shipped app uses and does not depend on `shamefully-hoist`, and its pure
helpers (base32 decode, RFC-6238 TOTP, detail formatting) have a `node --test`
suite that CI runs as `pnpm test:reviewer-flow-smoke`. That step is a separate
CI line rather than part of `pnpm test`, because ADR-0042's glossary check pins
the exact contents of the root `test` script.

The run below was reproduced three times end to end, including after the
harness was refactored to derive the catalogue from the seeded listing and to
pin each endpoint's response shape. Identifiers differ per run because each run
publishes a fresh listing; the check set and the result do not.

### Result — 8/8 checks passed

Against commit `d1471212079ffccb6f9ea4cce66bfb1f7f98acff`, environment
`staging`, in a single 23-second pass:

| # | Check | Observed | Result |
|---|---|---|---|
| 1 | Two distinct reserved accounts authenticate | All 3 reserved accounts signed in through the ADR-0030 OTP bypass; roles `buyer`/`seller`/`buyer`; all user ids distinct; no account resolved to `admin`. 1078ms | [x] |
| 2 | Browse | Authenticated feed `200` with the seeded content; the seeded primary listing is readable **anonymously** at `GET /api/v1/listings/:id` → `200`, `status=active`. 452ms | [x] |
| 3 | Create a listing | The seller ran the real wizard path: `POST /uploads/presign` → signed `PUT` of real JPEG bytes to MinIO → `POST /listings/drafts` → `PATCH` the draft → `POST /listings/drafts/:id/publish`. Published `07d06ccd-a0ab-4b9c-b7a7-e508438673be`, immediately readable anonymously. 3535ms | [x] |
| 4 | Rich chat | Conversation `c631b53b-16bf-4340-b3a0-161d486375ec` opened by the buyer on the new listing. Both accounts connected to `/ws/chat` over the `websocket` transport and joined the room. Buyer's `message:send` (text) delivered to the seller as `message:new`; seller's `message:send` (image, after a signed chat-attachment upload) delivered to the buyer as `message:new`; a third image sent over `POST /messages/rich` persisted. All three appear in `GET /messages` history. 9722ms | [x] |
| 5 | Report and block | Buyer filed `POST /listings/:id/report` (`misleading`) → report `d9c459d2-56a7-48aa-b910-1e599536f50c`, `status=pending`. Buyer blocked the seller, `GET /me/blocked-users/:id` returned `blocked=true`, then released the block so the scenario is left as found. 1218ms | [x] |
| 6 | Admin session and TOTP elevation | Operator admin session refreshed, `/api/v1/me` returned `role=admin`, `POST /auth/admin/totp/verify` accepted a computed RFC-6238 code, and `GET /auth/admin/totp/status` was asserted to return both `enrolled=true` and `elevated=true`. 2800ms | [x] |
| 7 | Live admin moderation | The report filed in check 5 was present in `GET /admin/reports?status=pending`. `POST /admin/listings/:id/ban` with that `reportId` returned `reportStatus=actioned` and audit row `c7fcf36c-b1d4-4094-a110-73c385c65769`. 757ms | [x] |
| 8 | Public enforcement | The banned listing returned `404` to an anonymous reader and was absent from the authenticated feed. 443ms | [x] |

### General signup remained disabled throughout

The strong form of the proof, not the weak one. A wrong code proves nothing —
it fails on the code, before the signup gate is consulted. So the probe uses a
**correct** code for an unreserved number, obtained from the mock SMS driver's
API log line:

- [x] `POST /auth/otp/request` for unreserved `+9936…279` → `201`.
- [x] `POST /auth/otp/verify` with that correct code → **`403`,
      `details.reason = FEATURE_DISABLED`**.
- [x] `select count(*) from users where phone = '<probe phone>'` → **`0`**. The
      gate did not merely refuse the session; it created no identity.
- [x] `SIGNUPS_ENABLED=false`, `SMS_DRIVER=mock`, `APP_ENV=staging` unchanged
      for the whole window. `OTP_TEST_MODE` and `OTP_TEST_CODE_RESPONSE` remain
      unset on `api`.
- [x] The ADR-0030 bypass was the only route to a session, and it cannot produce
      an admin: `VerifyOtp.tryReviewerBypass` returns `null` for any user whose
      role is not `buyer` or `seller`.

### Environment left as found

- [x] The block asserted in check 5 was released.
- [x] The listing published in check 3 ends the run `banned`, therefore invisible
      to the feed and to anonymous readers. The harness also archives its listing
      if a run fails before moderation, so a failed run cannot leave live smoke
      content in the reviewer feed.
- [x] Three stray listings from pre-fix runs were archived through the product's
      own `POST /listings/:id/archive`, not by SQL. The reviewer feed is back to
      the two seeded listings.
- [x] One stray `pending` report left by a partial run was dismissed through the
      admin API, again not by SQL. Final staging state: 3 reviewer accounts plus
      1 operator admin, the 2 seeded listings `active` and everything the smoke
      created `archived` or `banned`, and **exactly one** `pending` report — the
      seeded one (`67e970fd-…`), which is what the reviewer scenario is supposed
      to present.

## Findings from Part 1

### Finding 1 — a reviewer-era environment has no supported path to its first admin

**Blocking for this issue's moderation half, and it will recur in production.**

Criterion 1 requires live-admin moderation. An elevated admin needs an existing
`users` row, and in a reviewer-era environment there is no way to create one:

- `SIGNUPS_ENABLED=false` makes `VerifyOtp` refuse to create a user, so OTP
  login cannot bootstrap the operator.
- `packages/db/scripts/promote-admin.ts` deliberately refuses to create users —
  correctly, since creating users is not a promotion script's job.
- The ADR-0030 reviewer bypass returns no session for a non-`buyer`/`seller`
  role, by design, so a reviewer account cannot be promoted into the gap.

Runbook 86 step 4 ("ask the intended admin to complete normal OTP login once")
is therefore unexecutable in exactly the environments that need it most.

**Resolved without weakening the gate.** Turning `SIGNUPS_ENABLED` on
temporarily was rejected: it is the one flag the reviewer-era posture must be
able to claim was never off, and criterion 1 explicitly requires signup to stay
disabled *while* the flow runs. Instead the drill break-glass inserted only the
identity — one `users` row, role `buyer`, no session, no privilege — and then
used the audited script for the privilege change:

- [x] Identity `eb0d2819-6486-416d-baaa-f09022676a95` created by a single
      `INSERT` inside the `api` container.
- [x] `admin:promote --dry-run` reported the planned change, then the real run
      printed `Promoted user eb0d2819-… to admin`, writing the
      `ADMIN_BOOTSTRAP_PROMOTE` audit row with the operator-supplied reason.
- [x] OTP sign-in as the operator (code read from the API's mock SMS log line
      and consumed immediately), then `POST /auth/admin/totp/enroll`, then
      `POST /auth/admin/totp/verify`.

Locked in [ADR-0045](../../../adr/0045-first-admin-bootstrap-in-signups-disabled-environments.md)
and recorded in [80 — deployment runbook](../80-deployment-runbook.md) and
[86 — admin bootstrap runbook](../86-admin-bootstrap-runbook.md). This also
satisfies runbook 86's standing requirement that bootstrap be drilled in staging
before the first production admin promotion.

### Finding 2 — TOTP backup codes come from the first verify, not from enroll

`POST /auth/admin/totp/enroll` returns `{ secret, qrCodeUrl }` and nothing else.
The ten backup codes are generated and returned by the **first successful**
`POST /auth/admin/totp/verify`. Runbook 86 step 9 said "completes … enrollment
or verification, and copies the 10 backup codes", which reads as though enroll
would produce them; an operator who follows it literally, records the enroll
response and stops has an admin with no recovery path — and per ADR-0006, lost
device plus lost backup codes is manual operator recovery with no self-service
UI. Runbook corrected. Ten codes were issued and stored in the drill.

### Finding 3 — messages sent over HTTP are never broadcast to connected peers

**Not fixed here; it needs its own change.** `message:new` is emitted in exactly
one place, `ConversationGateway.handleSendMessage` (the socket handler).
`POST /conversations/:id/messages` and `POST /conversations/:id/messages/rich`
persist the message and emit the `MessageSent` application event that drives
push, but they never reach the realtime room.

This matters because it is the path the product actually uses for images:
`apps/mobile/src/api/conversations/useSendImageMessage.ts` posts to
`/messages/rich`, while text goes over `message:send`. So a reviewer who sends a
photo has it appear instantly for themselves and not at all for the recipient
who is sitting in the same conversation — until a refetch or a push tap. It was
observed directly: a `message:new` listener registered before an HTTP
`/messages/rich` send timed out at 15s, while the identical payload sent over
`message:send` arrived immediately.

The obvious fix — have the gateway broadcast from an `@OnEvent("MessageSent")`
handler and drop the direct emit, so both transports converge — changes the
event payload contract (`MessageSentEvent` carries no `clientMessageId`, which
the mobile client uses to reconcile optimistic messages). That is a real design
change in the conversations context, not a smoke-test fix, so it is recorded
here and filed as
[#312](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/312). The
harness proves realtime delivery over the
socket and proves HTTP-sent messages persist and appear in history, which is the
reviewer-visible outcome available today.

### Finding 4 — the production-smoke build has no environment to point at yet

Criterion 2 asks for `production-smoke` builds "using the intended environment
URLs". The reviewer-production environment is issue
[#281](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/281), which the
approved slice map places **downstream** of this issue (S11-11 depends on
S11-09). No `api`/`worker`/`admin`/`web` service instance exists in the Railway
`production` environment today. A `production-smoke` binary can be configured
and its environment contract validated — both are done below — but it cannot be
smoked against a live production API until #281 lands. This is a dependency-order
observation for the S11 retro, not a defect.

### Finding 5 — `staging` and `production-smoke` share one EAS environment

Both profiles in `apps/mobile/eas.json` name the EAS environment `preview`,
because custom EAS environment names require a higher Expo plan than the account
holds. The two profiles therefore read the same `EXPO_PUBLIC_API_URL`,
`EXPO_PUBLIC_WS_URL`, and `EXPO_PUBLIC_MEDIA_URL`, while `production-smoke` still
declares `EXPO_PUBLIC_ENV: "production"`. The URL gate accepts Railway-generated
hosts for both profiles, so it cannot detect a `production-smoke` binary built
against staging hosts, and no test pins the two profiles to distinct
environments.

Nothing is mis-built today: `production-smoke` has no target environment at all
until #281 lands (Finding 4), so there is no correct value the profile is failing
to use. The hole becomes real the moment #281 creates one. Recorded here so the
#281 work picks it up rather than rediscovering it, and noted as current state in
[`apps/mobile/CONTEXT.md`](../../../../apps/mobile/CONTEXT.md).

## Part 2 — Installable Builds: **Android staging binary exists; iOS not ready**

Recorded per criterion 4: a platform that cannot pass is named, and no
readiness is claimed beyond what was observed.

### What is proven

- [x] `apps/mobile/eas.json` declares `base`, `staging`, `production-smoke`, and
      `production` profiles. `staging` and `production-smoke` are
      `distribution: internal`; `production` is `distribution: store`.
- [x] The build-time environment gate behaves as specified. Run directly against
      `apps/mobile/scripts/validate-eas-build-env.ts`:

| Profile | URLs supplied | Result |
|---|---|---|
| `staging` | staging Railway API/WS/media hosts | valid |
| `production-smoke` | staging Railway API/WS/media hosts | valid |
| `production` | Railway-generated hosts | **rejected** — "must not use localhost, IP literals, or Railway-generated hosts in production", exit `1`, on all three URLs |
| `production` | `https://api.auto.tm`, `wss://api.auto.tm`, `https://media.auto.tm` | valid |

- [x] The gate runs as the `eas-build-post-install` hook, so a store build
      fails **before** bundling rather than shipping a wrong host.
- [x] **No OTA update surface exists.** `app.config.js` has no `updates` key,
      `eas.json` has no `channel` or `updates` key, and `expo-updates` is not a
      dependency of `apps/mobile`. The only repository match for the concept is
      the regression test that asserts its absence.
- [x] `apps/mobile` config tests pass: 2 files, 14 tests, including
      *"does not introduce EAS Update channels or OTA update URLs"*, which
      asserts the absent `expo-updates` dependency as well as the absent config
      keys.

The mobile gate in [`docs/agents/mobile-expo.md`](../../../agents/mobile-expo.md)
was run in full on the final tree:

| Gate command | Result |
|---|---|
| `pnpm --filter @auto-tm/mobile typecheck` | exit `0` |
| `CI=1 pnpm --filter @auto-tm/mobile exec expo install --check` | "Dependencies are up to date" |
| `pnpm --filter @auto-tm/mobile exec expo export -p ios --clear` | exit `0`, `Exported: dist` |
| `pnpm --filter @auto-tm/mobile test -- src/config/` | 2 files, 14 tests |
| `node --test scripts/staging-reviewer-flow-smoke.test.mjs` | 5 tests |

The iOS export needs `pnpm --filter @auto-tm/contracts build` first in a fresh
worktree, which is the same `dist/` requirement the `eas-build-post-install` hook
satisfies on the EAS builder. The Expo Go simulator leg was **not** run: this
slice changes build configuration, documentation, and a Node script, and touches
no runtime UI code. Per `docs/agents/mobile-expo.md` that leg is for runtime-only
bugs and simulator crashes.

### Android `staging` build — succeeded

| Field | Value |
|---|---|
| Build id | `657eb3cc-3bd5-4271-b18e-d858c303295a` |
| Status | `FINISHED` |
| Commit | `1b3463e2e3086b4a6d675ae56d2783424f0c9dd9` |
| Profile / distribution | `staging` / `INTERNAL` |
| Application id | `tm.auto.app` |
| Version / build number | `0.1.0` / `1` |
| Expo SDK | `55.0.0` |
| Started (UTC) | `2026-09-05T21:25:22Z` |
| Wall time | 24.7 min |
| Artifact | Signed APK retained in EAS. Not recorded here: the EAS artifact link is an unauthenticated, non-expiring capability URL and this repository is public. Fetch it with `eas build:view 657eb3cc-3bd5-4271-b18e-d858c303295a` from `apps/mobile`. |

Reaching a signed APK took four fixes to `apps/mobile`, each one only visible
after the previous was cleared. All four are regression-tested in
`src/config/easBuildConfig.spec.ts`:

| # | Phase that failed | Cause | Fix |
|---|---|---|---|
| 1 | `INSTALL_CUSTOM_TOOLS` | `corepack: true` and the `pnpm` pin are mutually exclusive. Corepack creates the shim first, so the pin's `npm i -g pnpm@9.12.0` fails `EEXIST`. | Removed `corepack` from `base`. |
| 2 | `INSTALL_DEPENDENCIES` | EAS installs the whole workspace, so `@auto-tm/db`'s Prisma 7 `preinstall` engine gate (20.19+ / 22.12+ / 24.0+) applies. `node: "22.11.0"` is below the floor. | Pinned `node: "22.23.2"`. |
| 3 | `PREBUILD` | EAS appends `--platform <platform>` to `prebuildCommand`; the URL gate rejects the unknown flag. | Moved the gate to the `eas-build-post-install` hook. |
| 4 | `EAGER_BUNDLE` | Metro could not resolve `@auto-tm/contracts` — it is a built package and nothing on the builder runs the local `predev` build. | Hook now also runs `pnpm --filter @auto-tm/contracts build`. |

Phase timings on the successful run, for future comparison: everything up to
Gradle totalled ~110 s; `RUN_GRADLEW` alone took 1198 s, dominated by
`buildCMakeRelWithDebInfo` running once per ABI against a cold cache. The
`RUN_EXPO_DOCTOR` phase hit its fixed 30 s cap and was skipped by EAS — an
advisory phase, not a failure. The local `expo install --check` gate in
`docs/agents/mobile-expo.md` remains the binding check.

**What this does not prove.** The APK has not been installed on any device, and
no flow has been exercised through it. Criterion 2 asks for installable builds
on *both* platforms and for `production-smoke` as well as `staging`; that
remains unmet.

### What is blocked, and on what

| Gate | State | Blocked on |
|---|---|---|
| Android install + in-app pass | **Not done.** APK exists but has not been installed or exercised. | A human with a physical Android device. |
| iOS build | **Not started.** No Apple Developer team, no registered bundle id for `tm.auto.app`, no distribution certificate or provisioning profile in EAS credentials. | Apple Developer Program membership. |
| `production-smoke` target environment | Railway `production` has no application services. | Issue #281 (see Finding 4). |

**Android: staging APK built, not yet installed or exercised. iOS: not
ready — no binary, blocked on Apple Developer Program membership.** Criterion 2
is unmet: it requires both platforms and both profiles.

## Part 3 — Offline Physical-Device Push: **not ready, both platforms**

### What is proven

- [x] The worker's push contract is fail-visible rather than silently degrading:
      `PUSH_TRANSPORT=fcm-apns` with an incomplete credential set crashes the
      deploy and names every missing variable (proven in #278).
- [x] Staging `worker` currently runs `PUSH_TRANSPORT=test`, and **zero**
      `FCM_*` / `APNS_*` variables are set on it. Read back by name only.
- [x] `MessageSent` is emitted for every persisted message on both the socket and
      the HTTP paths, so the notification decision runs regardless of transport.

### What is blocked

| Gate | State | Blocked on |
|---|---|---|
| FCM credentials | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` unset. | Human; a Firebase project and service-account key. |
| APNS credentials | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION` unset. | Human; Apple Developer Program `.p8` key. |
| `google-services.json` / `GoogleService-Info.plist` | Not supplied. `app.config.js` reads them from `GOOGLE_SERVICES_JSON` / `GOOGLE_SERVICES_INFO_PLIST` and omits the config when absent. | Human; Firebase console. |
| Physical devices | Not reachable from this session. A simulator cannot receive a real APNS or FCM push and cannot substitute for the criterion. | Human with a physical Android device and a physical iPhone. |
| Installable binary to push to | None (Part 2). | Part 2's gates. |

**Android: not ready. iOS: not ready.** Criterion 3 is unmet on both. Per
criterion 4, no partial readiness is claimed and the issue stays open.

## Repository changes this slice made

Issue #279's own file list is credential stores, evidence, and runbook
corrections. These four additions are the corrections that the observed
behavior required, plus the harness the sprint's "repeatable" requirement asks
for:

| Change | Why |
|---|---|
| `scripts/staging-reviewer-flow-smoke.mjs` + its `node --test` suite | The repeatable proof itself. Sprint 11 §6 asks for a repeatable procedure; #278 left it as an unversioned local script. |
| [ADR-0045](../../../adr/0045-first-admin-bootstrap-in-signups-disabled-environments.md) | Finding 1 is an operational decision with a rejected alternative, which CLAUDE.md requires be captured as an ADR rather than only as runbook prose. |
| `docs/prd/ops/80-deployment-runbook.md`, `86-admin-bootstrap-runbook.md` | Findings 1 and 2. Runbook 86's step 4 and its "No user found" failure line were unexecutable in a reviewer-era environment and are now cross-referenced to the exception. |
| `.github/workflows/ci.yml` | One line, so the harness's helper tests are not shipped unowned. |

No application code changed. No bounded-context invariant, port, route, event,
or environment contract changed, so no `CONTEXT.md` was owed under
[ADR-0019](../../../adr/0019-context-md-describes-current-state.md).

## Secret Hygiene

- [x] No secret value appears in this file.
- [x] Reviewer phone/code pairs were extracted from the Railway variable set
      **straight into a local `0600` file** through a pipe, never rendered to a
      terminal, a transcript, a git-tracked file, an issue, or a PR. Only the
      derived facts — 3 accounts, `+99365…` prefix, 6-digit codes — were printed.
      This deliberately avoids #278's recorded trap: `railway variable list` for
      *name* discovery renders values, so names come from `get-service-config`
      and values only ever go down a pipe.
- [x] Reviewer codes were **not** rotated for this drill. The existing #278 set
      was reused, so no operator-held credential was invalidated.
- [x] The admin TOTP secret, the ten backup codes, and the rotating refresh token
      live only in `0600` files under an operator-local directory outside the
      repository. None was printed.
- [x] Two one-time OTP codes (operator sign-in, signup probe) were extracted from
      `railway logs` by `grep`/`sed` into `0600` files, consumed immediately, and
      the files deleted. Both codes are now spent. Note that the mock SMS driver
      writing OTP codes to the API log is inherent to `SMS_DRIVER=mock` and is
      the documented way an operator signs in to a `mock` environment.
- [x] The smoke harness holds access and refresh tokens in process memory only.
      Its output is status codes, roles, identifiers, timings, and PASS/FAIL.
- [x] No secret was written to `scripts/staging-reviewer-flow-smoke.mjs`; the
      credentials file path is supplied by environment variable and defaults
      outside the repository.
- [x] The signup probe takes its code on **stdin**, not argv, so a live (if
      single-use) OTP never lands in shell history or `ps` output. The runbook
      documents the piped form.
- [x] The harness `chmod`s the credentials file back to `0600` after rewriting
      the rotated admin refresh token; `writeFileSync`'s `mode` only applies
      when it creates the file.

### Inherited open finding

- [ ] #278 recorded that a `railway variable list --service Postgres` call
      rendered the staging Postgres connection string into an operating agent's
      transcript, and recommended rotating the staging Postgres password. That
      remains open and is not re-litigated here.

## Acceptance Criteria Status

Against the criteria in [#279](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/279):

| # | Criterion | Status |
|---|---|---|
| 1 | Signup disabled while ≥2 reserved accounts complete browse/create, rich chat, report/block, and live-admin moderation/enforcement | **Met, with a known defect.** 8/8 checks green in one pass, plus a positive-code signup-gate probe returning `FEATURE_DISABLED` and creating no user. The rich-chat leg passed only because the harness also sent the image over the socket: `POST /messages/rich`, the path the shipped app uses, never broadcasts to the connected peer. Filed as [#312](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/312) and detailed in Finding 3. |
| 2 | Installable Android and iOS staging and production-smoke builds with intended URLs and no OTA update URL | **Not met.** The URL gate and the OTA-negative are proven, and a signed Android `staging` APK now exists (`657eb3cc`). It has not been installed or exercised. iOS has no binary; `production-smoke` has no target environment. Blocked on Apple Developer Program membership, a physical Android device, and #281. The "intended environment URLs" half also carries a known hole: `staging` and `production-smoke` share Expo's default `preview` environment, so they resolve identical URLs and the gate cannot catch a `production-smoke` build carrying staging hosts. See Finding 5. |
| 3 | Offline direct-message push opens the intended conversation on physical Android and iOS | **Not met** on both platforms. Blocked on FCM/APNS credentials, Firebase config files, physical devices, and a binary to install. |
| 4 | A platform that cannot pass is explicitly recorded not-ready; no partial readiness claim | **Met.** Android and iOS are each recorded not-ready for criteria 2 and 3, with the specific external gate named. The issue remains open. |
| 5 | Build identifiers, commit SHA, environment, timestamps, and smoke results recorded without credentials or private keys | **Met for what exists.** SHA, environment, hosts, timestamps, per-check results, and listing/conversation/report/audit identifiers recorded, plus the Android build id, its commit, profile, version, and timings. No credentials or key material recorded. The EAS artifact link is deliberately omitted: it is an unauthenticated, non-expiring capability URL for a signed binary, and this repository is public. |
| 6 | No production store build or submission | **Met.** No store build, no submission, no EAS session. The `production` profile was validated only by running its URL gate locally. |

**Two of six criteria are unmet, both on external human gates.** Per criterion 4
the issue stays open.

## What a human needs to do next

1. Install the Android `staging` APK from build `657eb3cc` on a physical
   device and re-run `scripts/staging-reviewer-flow-smoke.mjs` alongside a
   manual pass through the installed app. Note that staging has
   `SIGNUPS_ENABLED=false` and `SMS_DRIVER=mock`, so the only accounts that can
   sign in are the three reserved reviewer demo phones.
2. Obtain Apple Developer Program membership, register the `tm.auto.app` bundle
   id, provision iOS signing in EAS credentials, and build iOS `staging`.
3. Create the Firebase project and the Apple `.p8` APNS key; set the `FCM_*` /
   `APNS_*` variables on staging `worker` and flip `PUSH_TRANSPORT` to
   `fcm-apns`. The deploy failing loudly on an incomplete set is the expected
   behavior, not a problem.
4. With the recipient device offline, send a direct message and confirm both
   delivery and that the notification opens the intended conversation, on a
   physical Android device and a physical iPhone.
5. `production-smoke` builds wait on #281.

## Out of Scope

Store submission, public launch, domain/DNS mutation, real SMS or real users,
production promotion, and TM cutover.

## References

- [ADR-0030 — reviewer demo account OTP bypass](../../../adr/0030-reviewer-demo-account-otp-bypass.md)
- [ADR-0039 — phased cloud-first hosting](../../../adr/0039-phased-cloud-first-hosting.md)
- [ADR-0043 — native APNS delivery via node-apn](../../../adr/0043-native-apns-delivery-via-node-apn.md)
- [ADR-0045 — first admin bootstrap in signups-disabled environments](../../../adr/0045-first-admin-bootstrap-in-signups-disabled-environments.md)
- [Sprint 11 — Railway deployment](../../sprints/sprint-11-railway-deployment.md)
- [80 — Deployment runbook](../80-deployment-runbook.md)
- [86 — Admin bootstrap runbook](../86-admin-bootstrap-runbook.md)
- [Issue 278 — staging applications evidence](issue-278-staging-applications.md)
- [`scripts/staging-reviewer-flow-smoke.mjs`](../../../../scripts/staging-reviewer-flow-smoke.mjs)

### Documentation lookups

Per [ADR-0017](../../../adr/0017-context7-as-canonical-doc-source.md) and
[`docs/agents/documentation-lookups.md`](../../../agents/documentation-lookups.md),
the EAS claims in this slice were checked against current docs through Context7
(`/expo/eas-cli`), not from memory. `CommonBuildProfile` in
`packages/eas-json/src/build/types.ts` confirms every field this slice depends
on: `node`, `pnpm`, and `corepack` are sibling build-environment fields;
`environment` is a single string per profile, which is why `staging` and
`production-smoke` cannot be separated without a second EAS environment
(Finding 5); `prebuildCommand` is a build-configuration field, not a lifecycle
hook, which is why the URL gate moved to `eas-build-post-install`; and `channel`
and `releaseChannel` are the OTA fields `easBuildConfig.spec.ts` asserts absent.
