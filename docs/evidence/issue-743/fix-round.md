# Single fix round at c240525f

Founder-authorized FIX1–9 from [the independent review](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/745#issuecomment-6050120972). Codex, OpenAI, Codex CLI, gpt-6.1-sol, high. No re-review; Deferred late-spent-token retry is not implemented. Main fetch/merge was already up to date through c0076661, including #747/#740/#738/#748. Files owned by #749 are untouched.

## Red/green evidence

- FIX1 red: `pnpm --filter @auto-tm/admin exec vitest run src/proxy.spec.ts` fails: capacity, random-token admission, 429/500/503, network/malformed responses and timeout all destroy cookies instead of retaining the session. Committed and pushed before implementation.

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
