# Single fix round at c240525f

Founder-authorized FIX1–9 from [the independent review](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/745#issuecomment-6050120972). Codex, OpenAI, Codex CLI, gpt-6.1-sol, high. No re-review; Deferred late-spent-token retry is not implemented. Main fetch/merge was already up to date through c0076661, including #747/#740/#738/#748. Files owned by #749 are untouched.

## Red/green evidence

- FIX1 red: `pnpm --filter @auto-tm/admin exec vitest run src/proxy.spec.ts` fails: capacity, random-token admission, 429/500/503, network/malformed responses and timeout all destroy cookies instead of retaining the session. Red `15bdd333`: eight failures/14 passes, committed and pushed before implementation. Green: 22/22. Only API 400/401 rejects; temporary failures return a Russian 503 page, preserve cookies and allow retry. One pending owner serializes admission; only API-proven successful pairs occupy the bounded handoff cache.

- FIX2 red: optional-auth 403/429/500/503 errors were null; layout 429/500/503 redirected to session-expired login; Russian retry error page absent. `pnpm --filter @auto-tm/admin exec vitest run src/lib/api-client.spec.ts src/app/actions.spec.ts src/app/error.spec.tsx`. Green: only 401 returns null and triggers the reason; other failures surface through the rendered Russian retry boundary without cookie writes.

- FIX3 red: four failures/22 passes, expiry login URL erases current, renewable and temporarily unavailable sessions without consulting the API. Command: `pnpm --filter @auto-tm/admin exec vitest run src/proxy.spec.ts`. Green: query-only expiry no longer clears a current session, healthy TOTP mode survives, refresh-only sessions renew, outages preserve cookies, and only missing/API-rejected refresh clears before rendering login without a loop.

- FIX4 red: one failure/26 passes, `pnpm --filter @auto-tm/admin exec vitest run src/proxy.spec.ts`: `/` did not renew. Green: root GET renews before `src/app/page.tsx` redirects to reports. The built route manifests identify `src/app/page.tsx` as the served root; the duplicate `(admin)/page.tsx` is removed. Final built root smoke proves the route/renewal end to end.

- FIX5 red: two wrong-TOTP failures, real action and rendered login. `pnpm --filter @auto-tm/admin exec vitest run src/app/actions.spec.ts src/app/login/page.spec.tsx`. Green: API400 INVALID_TOTP maps to Russian; unreachable action-level 401 branches removed because apiFetch handles 401 with navigation.

- FIX6 red: eight failures/eight passes, `pnpm --filter @auto-tm/admin exec vitest run src/lib/api-address.spec.ts`. Green: trim first, build from parsed origin/pathname, reject search/hash/userinfo, including empty delimiters. Configuration errors never echo the supplied address or credentials.

- FIX7: documentation-only correction to unmerged ADR-0090, mirrored in operator docs. API reuse code is unchanged, but the five-second admin handoff accepts old-token replays without reaching it. Explicit accepted cost; forced logout by a healthy-session link no longer remains.
- FIX8: retained existing behavior, no production behavior change. Four new proxy tests pass: missing/wrong/correct configured Origin across reports, catalog and cookie-bearing login POSTs; catalog anonymous/current GET coverage. ADMIN_ORIGIN now explicitly required in template/runbook, with mismatch 403 at TOTP.

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
