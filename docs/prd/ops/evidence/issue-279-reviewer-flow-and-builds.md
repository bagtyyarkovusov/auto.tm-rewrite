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

## Part 2 — Installable Builds: **not ready, both platforms**

Recorded per criterion 4: neither platform may be claimed partially ready.

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
      *"does not introduce EAS Update channels or OTA update URLs"*.

### What is blocked, and on what

| Gate | State | Blocked on |
|---|---|---|
| Expo account / EAS CLI | **Not available.** `eas` is not installed and `~/.expo/state.json` holds no session. | A human with the AutoTM Expo organization credentials. |
| EAS project linkage | **Absent.** `app.config.js` has no `extra.eas.projectId`, and `eas.json` sets `appVersionSource: "remote"`, which requires one. `eas init` must be run by an authenticated human. | Same. |
| Android signing | Not provisioned in EAS credentials. | Human; Google Play console / EAS keystore. |
| iOS signing | No Apple Developer team, bundle id registration, or provisioning profile in EAS credentials for `tm.auto.app`. | Human; Apple Developer Program. |
| `production-smoke` target environment | Railway `production` has no application services. | Issue #281 (see Finding 4). |

**Android: not ready. iOS: not ready.** No installable staging or
`production-smoke` binary exists for either platform. Criterion 2 is unmet on
both.

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
| 1 | Signup disabled while ≥2 reserved accounts complete browse/create, rich chat, report/block, and live-admin moderation/enforcement | **Met.** 8/8 checks green in one pass, plus a positive-code signup-gate probe returning `FEATURE_DISABLED` and creating no user. |
| 2 | Installable Android and iOS staging and production-smoke builds with intended URLs and no OTA update URL | **Not met.** The URL gate and the OTA-negative are proven; no binary exists on either platform. Blocked on Expo/EAS, store signing, and #281. |
| 3 | Offline direct-message push opens the intended conversation on physical Android and iOS | **Not met** on both platforms. Blocked on FCM/APNS credentials, Firebase config files, physical devices, and a binary to install. |
| 4 | A platform that cannot pass is explicitly recorded not-ready; no partial readiness claim | **Met.** Android and iOS are each recorded not-ready for criteria 2 and 3, with the specific external gate named. The issue remains open. |
| 5 | Build identifiers, commit SHA, environment, timestamps, and smoke results recorded without credentials or private keys | **Met for what exists.** SHA, environment, hosts, timestamps, per-check results, listing/conversation/report/audit identifiers recorded. Build identifiers are absent because no build exists. |
| 6 | No production store build or submission | **Met.** No store build, no submission, no EAS session. The `production` profile was validated only by running its URL gate locally. |

**Two of six criteria are unmet, both on external human gates.** Per criterion 4
the issue stays open.

## What a human needs to do next

1. Authenticate the EAS CLI against the AutoTM Expo organization, run `eas init`
   so `extra.eas.projectId` exists, and provision Android and iOS signing.
2. Build and install `staging` binaries for both platforms, then re-run
   `scripts/staging-reviewer-flow-smoke.mjs` alongside a manual pass through the
   installed app.
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
