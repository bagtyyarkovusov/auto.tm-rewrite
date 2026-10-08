# Issue 743 verification

Owner: Codex, provider OpenAI, client Codex CLI, model gpt-6.1-sol, effort high.
Worktree: `.claude/worktrees/codex-issue-743`; branch: `agent/issue-743`; draft PR: [#745](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/745).

The founder accepted Option 2 on 2026-10-08 in chat: exactly one admin process and one Railway replica for the first release, with one or two operators. All seven criteria are implemented and verified locally. The PR stays draft without auto-merge or GitHub reviewer requests. Its mutable Execution state records the fixed-commit review and required hosted `pr` result on the final head.

| Criterion | Before / red evidence | After / green evidence | Outcome |
| --- | --- | --- | --- |
| 1. API address forms | `79255d72`, `api-address.spec.ts`: three wrong-URL assertion failures and one pass. | `7ff5694c`: origin, origin with slash, `/api/v1`, and `/api/v1/` all pass. Final address suite 8/8. | Pass |
| 2. Production configuration | `a8bc26ec`: four invalid/missing configuration failures. `f85db369`: one build-phase failure. `0925f92e`, instrumentation tests: four missing `process.exit(1)` failures. Earlier initialization-only rejection left Next listening. | Configuration 8/8; instrumentation 5/5. Built standalone process exits **1**, with an `API_BASE_URL` error, for missing, FTP and invalid addresses. Valid HTTP configuration becomes healthy. Image build succeeds without the runtime address. | Pass |
| 3. Real admin-to-API path | Test-only checkpoint `ef44f033`, using the old client from `79255d72`: three API404 failures instead of API400; boundary relocation `bf2b1ba9`. | `AdminApiBridge.spec.ts` 5/5: actual admin client and real `fetch` over loopback HTTP to running Nest/Fastify AuthController and error filter. Invalid input avoids database/Sign-in Code delivery; use-case providers are inert, router/controller/filter real. Wrong-prefix negative control returns 404. Carried by local `pnpm test:unit` and the hosted required `pr` job's `pnpm test`. | Pass |
| 4. Writable renewal and resumed request | `464ee7bf`, `middleware.spec.ts`: required GET/POST cookies missing. `11a7a0df`, API-client tests: three unsafe render-refresh failures. `0925f92e`: login POST bypass, caught redirect and absent session message. `9c3be46b`: five native-action cancellation/marker failures. Built smoke against old `548ae54a` artifact and then `91bbb98a` misplaced-root-proxy build: expired GET HTTP307 instead of200. | Final `src/proxy.spec.ts` 16/16; API-client 8/8. Built GET reads the renewed bearer and persists both cookies. Actual Next Server Action preserves its arguments and performs one mutation after renewal. Rejected actions use an early guard and native Next redirect before validation/API work; ordinary POSTs return 303 login GET. Corrected proxy location/imports: `7275adf2`/`3590b163`. | Pass |
| 5. Concurrent single-use refresh | `464ee7bf`: near-simultaneous requests and five-second handoff expiry failed. | Unit and built HTTP GET/Server Action overlap produce **one** rotation and the same pair. Unit tests prove separate operator keys, at most 128 pending/completed entries, five-second expiry, ten-second abort, and unchanged production cookie restrictions/lifetimes. Real expiry and restart losers clear both cookies, navigate to login, and perform no mutation. API identity behavior and reuse detection are unchanged. | Pass |
| 6. Russian wrong-code message | `3ad25948`: API400 INVALID_OTP returned English. Replaying the rendered login test against that exact action source fails with rendered `Invalid OTP code` (one failure/one pass). `0925f92e`: absent rendered session-expired message. `541d1cea`: mounted TOTP form failed to reset after query-only expiry navigation. | Real login component/children rendered in Happy DOM, submitted through the real action with the external API boundary returning400: Russian wrong-code message, no English, no navigation. Three rendered tests also prove the fresh expired-session form and reset of an already mounted TOTP form. Green action mapping `5d952a7d`; mounted reset `a608f565`. | Pass |
| 7. Configuration/bootstrap docs | Docs-only exemption. | `.env.template`, runbook and Railway notes describe both API forms and optional slash. First-admin SQL sets `phoneVerifiedAt` with `phone`, matching `users_phone_verified_check` in migration `20260922000000_add_user_sign_in_methods`. One-process constraint appears in operator docs and accepted ADR-0089. ADR-0045 remains unchanged. | Pass |

## Commands and checkpoints

Each behavior's failing test was committed and pushed before its production fix. Supplementary rendered replay and built-smoke failures exercise the original behavior with the real component/runtime; they do not replace the earlier pushed red checkpoints.

- URL/config: `pnpm --filter @auto-tm/admin exec vitest run src/lib/api-address.spec.ts`.
- Runtime initialization: `pnpm --filter @auto-tm/admin exec vitest run src/instrumentation.spec.ts`.
- Renewal red: `pnpm --filter @auto-tm/admin exec vitest run middleware.spec.ts` at `464ee7bf` (five failures/two passes); migrated Node proxy green `08160a58` (seven passes), then final location `src/proxy.spec.ts` (16 passes).
- Render-time refresh red: `pnpm --filter @auto-tm/admin exec vitest run src/lib/api-client.spec.ts` at `11a7a0df` (three failures/five passes); green `518b2441` (eight passes).
- Guards/UI red `0925f92e`: `pnpm --filter @auto-tm/admin exec vitest run proxy.spec.ts src/lib/validators.spec.ts 'src/app/(admin)/actions.spec.ts' src/app/login/page.spec.tsx` (five failures/47 passes); green `a28ad192`. Catalog redirect red `342e346c` (one failure/seven passes), green `8bb2fb7d` (eight passes).
- Native action red `9c3be46b`: `pnpm --filter @auto-tm/admin exec vitest run proxy.spec.ts src/app/actions.spec.ts 'src/app/(admin)/actions.spec.ts' 'src/app/(admin)/catalog/brands/actions.spec.ts'` (five failures/48 passes); green `e09f220c`.
- Public-origin red `87fc01cc`: `pnpm --filter @auto-tm/admin exec vitest run proxy.spec.ts` (one failure/15 passes); green `91bbb98a`.
- Rendered login: `pnpm --filter @auto-tm/admin exec vitest run src/app/login/page.spec.tsx` (three passes). Login is statically prerendered with a client search-parameter boundary, so raw HTTP HTML is not evidence of hydrated error copy. DOM tests carry that proof.
- Real API bridge: `pnpm --filter @auto-tm/api exec vitest run src/modules/identity/presentation/AdminApiBridge.spec.ts` (five passes, no mocked fetch).
- Built smoke: `node scripts/admin-session-runtime-smoke.mjs` after admin build. Local loopback API fixture enforces single-use rotation and records bearer/mutation behavior; actual standalone Next handles proxy, rendering, action decoding, cookie propagation and redirects. It is additional to the running real API bridge.

## Final local gates

On the production inputs of `3590b163`, with `origin/main` merged (including `d75f7e45`):

- `pnpm install --frozen-lockfile`: pass. Only admin gains the existing pinned Happy DOM20.9.0 test dependency; hoisting and mobile dependencies are unchanged.
- `DATABASE_URL=postgresql://auto_tm_ci:auto_tm_ci_pass@127.0.0.1:1/auto_tm_ci pnpm typecheck`: pass, 11/11 tasks.
- Same literal prefix with `pnpm test:unit`: pass, 10/10 tasks; final admin 12 files/111 tests.
- `pnpm --filter @auto-tm/admin lint` and `pnpm --filter @auto-tm/api lint`: pass. Initial new-test non-null/type-import and import-order failures were repaired; subsequent affected checks passed.
- Focused real API bridge: 5/5 pass; rerun explicitly because its dynamic cross-app source import is outside the API task's cache inputs.
- `pnpm --filter @auto-tm/admin build`: pass, installed Next.js16.2.6. One necessary rebuild repaired the misplaced proxy detected by the real runtime smoke. Final build lists `Proxy (Middleware)`. Turbopack still warns about the Node-only `process.exit` reference in its Edge instrumentation analysis; this app's proxy/server run in Node and real standalone invalid-startup probes exit1.
- Built runtime smoke: all six groups pass: renewed GET, concurrent GET/action, cache-expiry loser, ordinary POST loser, restart loser, invalid production startup.
- `git diff --check`: pass. `git fetch origin; git merge origin/main`: merged without conflicts; final synchronization is recorded in PR state.
- Full container-backed repository tests and fixed-commit independent review are recorded in the PR Execution state. The final hosted check must be green on its exact head; earlier-head passes do not substitute.

No browser is connected for a human visual smoke. Rendered DOM behavior and actual HTTP runtime evidence are present; no screenshot or manual browser result is claimed. No UI look redesign or native feature is part of this change. No Docker, emulator, simulator or native build was started. All local runtime children and loopback fixture servers are stopped by the smoke's cleanup.

## Accepted limitation and action semantics

Admin must remain at **one Node process and one Railway replica** until a shared session store exists ([#746](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/746), [ADR-0089](../../adr/0089-single-process-admin-session-renewal-for-the-first-release.md)). A SHA-256 hash of the old refresh token keys a single-flight owner and memory-only five-second handoff. Pending/completed entries are bounded to128; successful pairs expire even without more requests. Token values are never logged.

An expired action renews first and runs once with the original body on success. On failed JavaScript action renewal, the proxy clears both cookies and forwards only a trusted failure marker; every action's first guard redirects through Next before validation or API work. A caller-supplied marker is stripped. Ordinary POSTs are canceled with a303 login GET. No failed mutation executes or automatically replays; after sign-in the operator must submit it again. Restarts, multiple processes, handoff expiry/capacity, timeout and API rejection can require sign-in. TOTP elevation still expires on the API's existing schedule.

No API identity production source, token lifetime, reuse detection, Railway variable, deployment or production state was changed. Merged ADRs remain immutable.

## Documentation lookups

The package range minimum is16.2.2, but the frozen lockfile, installed package and build establish Next.js16.2.6. Context7 resolved `/vercel/next.js`; the exact version index was unavailable, and the narrower retry returned canary. Official tagged upstream docs were used as fallback (curl where the web reader returned a cache miss):

- [Instrumentation/register](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/03-file-conventions/instrumentation.mdx): initialization and build/runtime boundaries.
- [Cookies](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/04-functions/cookies.mdx): Components read, writable request boundaries persist.
- [Proxy](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx): Node default, request/response cookie APIs, placement beside `src/app`, and general cross-process/global-state limitations.
- [unstable_rethrow](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/04-functions/unstable_rethrow.mdx): propagate framework navigation errors from catches.

The installed action-handler/client source confirms plain proxy redirects can yield unexpected HTML to an action fetch; the implementation uses public `headers`/`redirect` APIs inside an early action guard rather than emitting private Next redirect headers itself. The HTTP smoke inspects Next's resulting redirect protocol.

Other Context7 IDs: `/websites/nodejs_latest-v22_x_api` (SHA-256 and timer unref), `/reactjs/react.dev` (createRoot/act DOM event testing), `/capricorn86/happy-dom` (Vitest DOM environment), `/nestjs/nest/v11.1.16` (running Fastify testing). Earlier `/mdn/content` browser-lock option was not implemented. Supplied `.claude/skills/pr/SKILL.md` is absent; repository PR contract comes from run-issue/FINALIZATION.md, complemented by the host PR-body skill.
