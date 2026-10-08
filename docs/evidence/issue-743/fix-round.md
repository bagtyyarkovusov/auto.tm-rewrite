# Single fix round at c240525f

Founder-authorized FIX1–9 from [the independent review](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/745#issuecomment-6050120972). Codex, OpenAI, Codex CLI, gpt-6.1-sol, high. No re-review; Deferred late-spent-token retry is not implemented. Main fetch/merge was already up to date through c0076661, including #747/#740/#738/#748. Files owned by #749 are untouched.

## Red/green evidence

- FIX1 red: `pnpm --filter @auto-tm/admin exec vitest run src/proxy.spec.ts` fails: capacity, random-token admission, 429/500/503, network/malformed responses and timeout all destroy cookies instead of retaining the session. Red `15bdd333`: eight failures/14 passes, committed and pushed before implementation. Green: 22/22. Only API 400/401 rejects; temporary failures return a Russian 503 page, preserve cookies and allow retry. One pending owner serializes admission; only API-proven successful pairs occupy the bounded handoff cache.

- FIX2 red `eb8d4e7a`: seven failures/14 passes plus the missing error-page suite; optional-auth 403/429/500/503 errors were null; layout 429/500/503 redirected to session-expired login; Russian retry error page absent. `pnpm --filter @auto-tm/admin exec vitest run src/lib/api-client.spec.ts src/app/actions.spec.ts src/app/error.spec.tsx`. Green `96293add`: only 401 returns null and triggers the reason; other failures surface through the rendered Russian retry boundary without cookie writes.

- FIX3 red `0a5c83bd`: four failures/22 passes, expiry login URL erases current, renewable and temporarily unavailable sessions without consulting the API. Command: `pnpm --filter @auto-tm/admin exec vitest run src/proxy.spec.ts`. Green: query-only expiry no longer clears a current session, healthy TOTP mode survives, refresh-only sessions renew, outages preserve cookies, and only missing/API-rejected refresh clears before rendering login without a loop. Supplemental red `f6026051` catches a loop through the layout for a current JWT hint whose access is API-rejected; green strips the reason and stays at login instead of bouncing back into the protected layout.

- FIX4 red `37895ff1`: one failure/26 passes, `pnpm --filter @auto-tm/admin exec vitest run src/proxy.spec.ts`: `/` did not renew. Green: root GET renews before `src/app/page.tsx` redirects to reports. Final built routing has only `src/app/page.tsx` at `/`; the duplicate `(admin)/page.tsx` is removed. Final built root smoke proves the route/renewal end to end.

- FIX5 red `a4053deb`: two wrong-TOTP failures, real action and rendered login. `pnpm --filter @auto-tm/admin exec vitest run src/app/actions.spec.ts src/app/login/page.spec.tsx`. Green: API400 INVALID_TOTP maps to Russian; unreachable action-level 401 branches removed because apiFetch handles 401 with navigation.

- FIX6 red `63a2bd64`: eight failures/eight passes, `pnpm --filter @auto-tm/admin exec vitest run src/lib/api-address.spec.ts`. Green: trim first, build from parsed origin/pathname, reject search/hash/userinfo, including empty delimiters. Configuration errors never echo the supplied address or credentials.

- FIX7: documentation-only correction to unmerged ADR-0090, mirrored in operator docs. API reuse code is unchanged, but the five-second admin handoff accepts old-token replays without reaching it. Explicit accepted cost; forced logout by a healthy-session link no longer remains.
- FIX8: retained existing behavior, no production behavior change. Four new proxy tests pass: missing/wrong/correct configured Origin across reports, catalog and cookie-bearing login POSTs; catalog anonymous/current GET coverage. ADMIN_ORIGIN now explicitly required in template/runbook, with mismatch 403 at TOTP.

- FIX9 cache-input red: `pnpm exec turbo run test:unit --filter @auto-tm/api --dry=json`, then assert the API task inputs contain `apps/admin/src/lib/api-client.ts`: fails, missing cross-package input. Strengthened instrumentation test uses an unrelated termination sentinel and independently asserts the real console error names API_BASE_URL; the mock no longer supplies that message. Red checkpoint `fa7926fc`; green dry-run resolves package-relative paths and confirms the admin lib inputs. Both API test/test:unit tasks now declare those cross-package inputs. `pnpm --filter @auto-tm/admin verify:runtime` builds once, then runs the real session smoke and asset/runtime-origin smoke; the required hosted pr workflow runs this gate after its full tests. Error recovery supplemental red `34077d49` failed because reset did not refetch; green uses installed Next 16.2.6’s unstable_retry prop. The tagged upstream docs/source verify it; Context7 exact version was unavailable and the narrower query returned canary, so tagged v16.2.6 fallback was used. Turborepo 2.9.12 input semantics verified with Context7 /vercel/turborepo/v2.9.0 and actual dry JSON.

## Final local gates

Production checkpoint `4eed1e1d`, with main already merged through c0076661. Heavy commands were run one at a time; no emulator, native or Docker build.

- `pnpm install --frozen-lockfile`: pass.
- `DATABASE_URL=postgresql://auto_tm_ci:auto_tm_ci_pass@127.0.0.1:1/auto_tm_ci pnpm typecheck`: pass, 11/11 tasks. First attempt saw the deleted duplicate root in stale generated `.next/types/validator.ts`; `pnpm --filter @auto-tm/admin exec next typegen` regenerated it without a build, then typecheck passed.
- Same literal prefix with `pnpm test:unit`: pass, 10/10 tasks; admin 16 files/187 tests, API 1963 passes/one existing skip, including the real HTTP AdminApiBridge.
- `pnpm --filter @auto-tm/admin lint` and `pnpm --filter @auto-tm/api lint`: pass.
- `pnpm --filter @auto-tm/admin verify:runtime`: pass. Exactly one final admin build, Next16.2.6, Proxy listed. Ten actual standalone HTTP groups pass: root renewal, transient GET/action recovery, expired GET, harmless/renewable expiry links, layout outage, concurrent GET/action one rotation, handoff expiry loser, ordinary POST loser, restart loser and invalid startup. Asset/runtime-media-origin smoke also passes. The existing Node-only process.exit Edge-analysis warning remains; real invalid-startup probes exit1.
- API bridge cross-package cache input: old dry-run omits the imported admin client; corrected API test:unit dry-run includes it after resolving its package-relative path. Both test and test:unit have the same declared admin inputs and retain TURBO_DEFAULT.
- `git diff --check`: pass. No #749 reports pages or API suspension files changed.
- Exact final-head hosted `pr` result and check URL are recorded in the mutable [PR Execution state](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/745). The required workflow now also runs the build/runtime gate; earlier-head green results do not substitute.

No re-review. Deferred late-spent-token retry is untouched. No live deployment, production access or Railway-variable change was performed. No connected browser/manual visual smoke is claimed; rendered UI tests and actual HTTP evidence are present. All runtime child processes and loopback fixture servers were stopped by cleanup.

## Live staging checklist, not performed

Owner: orchestrator with the founder, after deployment. This fix round does not deploy, change Railway variables or touch production.

- ADMIN_ORIGIN equals the public origin; complete TOTP and one moderation action.
- Idle 16 minutes, then navigate; separately submit an action. Stay signed in, rotate cookies and execute the action once.
- Hard reload with parallel requests after expiry.
- Two tabs across expiry.
- Log out after 16 idle minutes: no auth cookies remain.
- Sign in over a stale refresh cookie.
- Redeploy the API during a session: retain the session through temporary unavailability.
- Wrong Sign-in Code and wrong TOTP code both show Russian text.
- Unset API_BASE_URL: deployment fails with the named error.
