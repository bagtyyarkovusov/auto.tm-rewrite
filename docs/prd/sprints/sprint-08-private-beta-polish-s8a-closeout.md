# Sprint 8 — Private beta polish — S8a closeout

> Written by Codex on 2026-06-27 UTC for issue #199.
> Updated 2026-07-05: the human decision is to close S8 as the shipped S8a remote slice and defer the former S8b on-site distribution, real OTP, monitoring, and ops drills to a future deployment/on-site cutover sprint.

## Outcome

S8a shipped the remotely verifiable product-completeness slice:

- Mobile i18n foundation, string migration, onboarding, Cabinet/Profile, Settings/logout/language, broken-UI sweep, and top-5 error/accessibility pass.
- Account deletion grace period, recovery, tombstone purge worker, and launch-safety flags.
- Favorites API + mobile saved-listing surface.
- RU/TK/EN legal pages.
- AFK MLP e2e smoke, admin moderation smoke, and real browser/admin TOTP closeout.

## Issue state

All S8a child issues are closed:

| Slice | Issues |
|---|---|
| Account deletion backend + mobile | #187, #197 |
| Favorites API + mobile | #188, #193 |
| i18n/profile/settings/string sweep | #189, #191, #192, #194 |
| Legal, broken UI, errors/a11y | #190, #195, #196 |
| E2E/admin smoke | #198 |
| Docs drift closeout | #199 |

## Drift findings

### Roadmap and deferred ledger

- `docs/prd/03-roadmap.md` now marks S8 as shipped on the S8a remote product-completeness outcome, with the former S8b hardware/deployment work deferred to a future deployment/on-site cutover sprint.
- The S8a shipped-log entry captures the remote product-completeness slice and links back here.
- Favorites is removed from the post-MLP bet table. The remaining discovery bet is broader filters / free-text search; saved searches remain in `features/35-subscriptions.md`.
- `docs/prd/02-phases.md`, `docs/prd/features/33-search-discovery.md`, `docs/prd/20-information-architecture.md`, and launch-planning docs now distinguish shipped Favorites from still-deferred saved searches and discovery expansion.

### CONTEXT.md

Reviewed current-state docs against S8a scope:

- `apps/mobile/CONTEXT.md` documents i18n, onboarding, Cabinet/Profile, Settings/logout, Favorites, error copy, accessibility fixes, and shipped route/hook state.
- `apps/api/src/modules/identity/CONTEXT.md` documents account deletion grace/recovery/purge semantics and admin TOTP hardening.
- `apps/api/src/modules/listings/CONTEXT.md` documents `Favorite`, favorite use-cases, routes, and banned-listing favorite enforcement.
- `apps/worker/CONTEXT.md` documents the account-purge repeatable job.
- `apps/web/CONTEXT.md` documents RU/TK/EN legal pages.
- `apps/admin/CONTEXT.md` documents the admin auth/TOTP returnTo and browser-auth closeout state.
- `packages/db/CONTEXT.md` documents S8 account-deletion fields and notes Favorites schema as shipped.
- `packages/contracts/CONTEXT.md` already reflects the relevant admin/auth/listing contract state for the shipped surfaces.

No new bounded context or app/package `CONTEXT.md` was introduced by S8a.

### CONTEXT-MAP

`CONTEXT-MAP.md` matches the current in-repo `CONTEXT.md` set when generated worktrees and dependency directories are excluded:

```bash
find . -path './.git' -prune -o -path './.sandcastle' -prune -o -path './node_modules' -prune -o -name CONTEXT.md -print | sort
```

No map row is missing for current implementation.

### ADRs

- ADR-0031 (mobile i18n) is present and accepted.
- ADR-0032 (account deletion grace period) is present and accepted.
- ADR-0037 already records the trust-wedge sequencing after S8a.
- No additional ADR is required for this closeout; the Favorites move was recorded in the S8 reshape before implementation.

### Future-sprint files

The only current pending future-sprint file is `docs/prd/sprints/sprint-09-trust-wedge.md`, which is intentionally referenced by the roadmap after ADR-0037. Historical old-label references such as "S9 admin" or "S10 polish" remain in locked historical sprint/retro artifacts and are covered by the roadmap's historical-label note.

## Deferred deployment/on-site cutover

The following items are no longer treated as blockers to closing S8a. They should be shaped later as a deployment/on-site cutover sprint when TM presence or a trusted helper is available:

- Real OTP delivery through TM phones/SIMs.
- Physical-device distribution through TestFlight / Play internal track or documented equivalent, plus APK fallback.
- Production-like deploy, TLS/domains, and air-gap transfer rehearsal.
- Monitoring/runbook drills: alert delivery, rollback, backup restore, feature-pause flags, bad-moderation reversal.
- The actual first-user invites.

S9a may begin after a human start decision as the remote trust foundation. S9b shares this same on-ground dependency.
