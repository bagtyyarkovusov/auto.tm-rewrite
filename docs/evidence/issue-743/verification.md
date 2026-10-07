# Issue 743 verification

Owner: Codex, provider OpenAI, client Codex CLI, model gpt-6.1-sol, effort high.
Worktree: `.claude/worktrees/codex-issue-743`; branch: `agent/issue-743`; draft PR: #745.

This is a partial implementation. Session renewal remains blocked; the PR must stay draft.

| Criterion | Evidence | Outcome |
| --- | --- | --- |
| 1. API address forms | `src/lib/api-address.spec.ts`: red `79255d72` had 3 URL assertion failures and 1 pass; green `7ff5694c` passed all four forms. | Pass |
| 2. Production configuration | Address tests: red `a8bc26ec` had 4 missing/invalid-config failures; green `f733ac0a` passed 8/8. Instrumentation tests: red `f85db369` had 1 build-phase failure and 4 passes; green `42378a50` passed 5/5. Built standalone server rejects missing and FTP addresses during initialization with an API_BASE_URL error; `/healthz` returns 500. Valid HTTP address returns 200. | Initialization/readiness fail closed; process-exit limitation below |
| 3. Real admin-to-API path | `apps/api/src/modules/identity/presentation/AdminApiBridge.spec.ts`: real admin client, real fetch over loopback HTTP, running Nest/Fastify API AuthController and real error filter. Red against client source from `79255d72` yielded 3 API404 failures instead of expected API400; restored fixed client passed 5/5, including a wrong-prefix negative control. Test-only gate checkpoint `ef44f033`; boundary relocation `bf2b1ba9`. | Pass |
| 4. Writable renewal and resumed request | Existing Server Component refresh cannot persist rotated cookies. No replacement implemented while coordination authority is missing. | Blocked |
| 5. Concurrent single-use refresh | API source establishes an atomic old-hash compare-and-swap. Two requests with the same old token have at most one successful rotation; subsequent lookup cannot recover the new plaintext pair. No process-independent coordinator exists in admin. | Blocked |
| 6. Russian INVALID_OTP message | `src/app/actions.spec.ts`: red `3ad25948` returned English for API400 INVALID_OTP; green `5d952a7d` passed 4/4 with Russian wrong-code text. | Action pass; rendered UI unverified |
| 7. Configuration/bootstrap docs | Docs-only exemption. `.env.template`, deployment runbook and Railway variable notes describe both API address forms and trailing slash. First-admin SQL sets phoneVerifiedAt with phone, matching `users_phone_verified_check` in `20260922000000_add_user_sign_in_methods/migration.sql`. ADR-0045 unchanged. | Pass |

## Gate record

- `pnpm install --frozen-lockfile`: pass.
- `DATABASE_URL=postgresql://auto_tm_ci:auto_tm_ci_pass@127.0.0.1:1/auto_tm_ci pnpm typecheck`: pass, 11 tasks. One repair isolated the UI test fixture's DOM/Next types from API production compilation.
- Same literal DATABASE_URL prefix with `pnpm test:unit`: pass, 10 tasks; admin 11 files/89 tests; API 199 files/1939 passed and 1 existing skip. Rerun after test relocation/import-order repairs passed.
- `pnpm --filter @auto-tm/admin lint`: pass after fixing one import-group warning.
- `pnpm --filter @auto-tm/api lint`: pass after moving the network test inside identity's test boundary. No API production code changed.
- Focused real HTTP bridge: `pnpm --filter @auto-tm/api exec vitest run src/modules/identity/presentation/AdminApiBridge.spec.ts`: 5/5 pass.
- `pnpm --filter @auto-tm/admin build`: pass, once, installed Next.js 16.2.6; no API address required during image build.
- Built standalone runtime: missing and non-HTTP API addresses reject initialization and yield HTTP500 health; valid address yields HTTP200 health. Next.js logs Ready and keeps the listener bound after an instrumentation failure. Therefore this is not proof of a nonzero startup process exit.
- UI browser check unavailable: CUA reported Chrome unavailable and `cua.listBrowsers()` returned `[]`. No renderer or screenshot evidence is claimed.
- Full container-backed repository tests belong to the hosted required `pr` check. Its final-head result is recorded in the PR Execution state after the watch; pending is not pass.
- `git fetch origin; git merge origin/main`: already up to date before final checkpoint. No review was requested; PR stays draft, with no merge or auto-merge.

## Renewal decision and options

The unchanged API RefreshSession rotates by atomically replacing the old refresh-token hash. An overlapping loser gets TOKEN_ALREADY_USED; a later old-token lookup fails. Middleware or a Route Handler can write cookies, but moving the refresh there alone does not coordinate concurrent requests. Process-local promises or a short result cache do not guarantee safety across workers/restarts. The Next.js proxy contract specifically says not to rely on shared modules or globals.

Options requiring direction:

1. Approve a shared admin session coordinator/store, with an opaque browser session identifier and a serialized API refresh owner. This can preserve normal GET and Server Action behavior without changing API token lifetimes or rotation rules, but introduces an architecture/infrastructure dependency.
2. Explicitly constrain admin to one process and accept its restart/scaling limitation, then use process-local single-flight coordination with a tightly bounded handoff cache. No such hosting guarantee was assumed or imposed here.
3. Approve a browser-coordinated renewal flow and define how to recover expired POST/Server Actions. Web Locks can serialize same-origin tabs, but a redirect through a renewal page alone cannot transparently replay an original mutation. The initially proposed browser option was not implemented because that gap remains.

No API identity behavior, token lifetime, production variable, deployment, or merged ADR was changed. No Docker, native build, emulator, or simulator was started. Local runtime probes were stopped.

## Documentation lookup correction

The initial record mistook the package range's 16.2.2 minimum for the installed version. The frozen lockfile, installed package and build output establish 16.2.6. Context7 resolved `/vercel/next.js`, but its exact v16.2.6 index was unavailable and the narrower retry returned canary material. Official tagged upstream documentation was used as the fallback:

- [16.2.6 instrumentation register](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/03-file-conventions/instrumentation.mdx): must complete before handling requests.
- [16.2.6 cookies](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/04-functions/cookies.mdx): Server Components read cookies; Server Functions/Route Handlers write them. Retrieved with curl after the web reader returned a cache miss.
- [16.2.6 proxy](https://github.com/vercel/next.js/blob/v16.2.6/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx): request/response cookie APIs; do not rely on shared modules/globals.

Other lookups: `/nestjs/nest/v11.1.16` for live Fastify testing and `/mdn/content` for the browser lock option. `.claude/skills/pr/SKILL.md` is absent on current main; the canonical body contract is in run-issue/FINALIZATION.md.
