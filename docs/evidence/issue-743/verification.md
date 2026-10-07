# Issue 743 verification

Owner: Codex, provider OpenAI, client Codex CLI, model gpt-6.1-sol, effort high.
Worktree: `.claude/worktrees/codex-issue-743`; branch: `agent/issue-743`.

| Criterion | Planned evidence |
| --- | --- |
| 1. API address forms | API-client tests for origin and versioned URL, each with trailing slash |
| 2. Production startup validation | Runtime registration rejects absent/non-HTTP API_BASE_URL |
| 3. Real admin-to-API path | Hosted required `pr` integration gate against a running API |
| 4. Writable renewal and resumed request | Request/route tests plus runtime cookie verification |
| 5. Concurrent single-use refresh | Concurrency test; coordination must work across admin workers |
| 6. Russian INVALID_OTP message | Auth action regression and rendered login error |
| 7. Configuration/bootstrap docs | Docs-only exemption; inspect SQL against schema constraint |

## Initial inspection

- Next.js lockfile and installed dependency: 16.2.2. Context7 `/vercel/next.js/v16.2.2` confirms read-only Server Component cookies and writable Route Handler/response cookies.
- API RefreshSession rotates with compare-and-swap on the old hash. A concurrent loser gets TOKEN_ALREADY_USED; a later reuse gets INVALID_REFRESH_TOKEN. No API changes or token lifetime changes are authorized.
- `.claude/skills/pr/SKILL.md` is absent. The repository's run-issue FINALIZATION.md contains the canonical PR body contract.
- `pnpm install --frozen-lockfile` passed. Reservation branch pushed before edits.
- No production/configuration changes, deployments, native builds, or emulator/simulator work.
