# Sprint 3 — Catalog — Retrospective

> Written by `/close-sprint 3` on 2026-05-18.
> Sprint shipped on 2026-05-17 (one wall-clock day end-to-end; estimate was ~1 week).

## Shipped vs planned

| Issue | PR  | What |
|-------|-----|------|
| #67   | [#75](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/75) | Foundations — catalog module + Accept-Language middleware + Slug VO |
| #68   | [#76](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/76) | Contracts — read DTOs (7 entities) + admin write DTOs + OpenAPI |
| #69   | [#77](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/77) | Seed — port + fresh data for 6 entities (Generation empty) |
| #70   | [#78](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/78) | Read API — brands + models + generations |
| #71   | [#79](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/79) | Read API — regions + cities + body-types + colors |
| #72   | [#80](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/80) | Admin write API — Brand + Model + mintAdminJwt helper |
| #73   | [#81](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/81) | Dev smoke — /dev/catalog mobile route + useBrands hook |
| #74   | [#82](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/82) | Sprint-final — CONTEXT.md + roadmap |
| #53 (pre-S3) | [#60](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/60) | Mobile data-fetching infra (TanStack Query + apiClient wrapper) |
| #56 (pre-S3) | [#59](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/59) | IdentityCheckPort.isAdmin + AdminGuard |
| pre-S3 housekeeping | [#64](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/64) | Trim sprint-03 scope + ADR-0018 + fix drift |

**Total AC items:** 12
**With evidence:** 12
**Without evidence (gaps):** 0

### Bonuses (above the AC line)

- TanStack Query `useBrands` hook (AC asked only for `apiClient`); positions S4/S5 to reuse the hook factory.
- `mintAdminJwt` test helper at `apps/api/test/helpers/`.

### Gaps

None.

## Drift findings

### CONTEXT.md drift

- **Seed counts in [`apps/api/src/modules/catalog/CONTEXT.md`](../../../apps/api/src/modules/catalog/CONTEXT.md) lines 149-153 are wrong**: claims "131 brands" (actual 130), "~1,700 models" (actual 2,447), "10 colors" (actual 15), "9 body types" (actual 10). Cleanup commit proposed.
- No aspirational content leak — entity list matches `packages/db/prisma/schema.prisma`.

### ADR drift

- None. [ADR-0018](../../adr/0018-api-port-3006.md) (api port 3006), [ADR-0019](../../adr/0019-context-md-describes-current-state.md) (CONTEXT.md current-state), and [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md) (doc hierarchy) all landed during the window.

### Sprint file accuracy

- Planned files: all shipped.
- Naming: `CatalogController.ts` in plan → `catalog.controller.ts` in code (NestJS dotted-kebab). Cosmetic.
- `catalog-stub.json` was retained (not folded in) but CONTEXT.md correctly documents it as unread. Not drift.

### Roadmap drift

- **Parent issue [#66](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/66) left OPEN** — sprint-final PR #82 only closed the children. Cleanup proposed: `gh issue close 66`.
- Shipped log entry exists ([03-roadmap.md line 150](../03-roadmap.md)). Current Sprint block bumped to S4. Both correct.

### Dependency / version drift

- None. No mid-sprint major-version bumps.

### Test coverage

- Sprint-final PR body asserts: 218 api, 6 contracts, 2 db, 13 mobile tests passing.
- Visual scan confirms `.spec.ts` per use-case + Testcontainers `*.e2e.spec.ts` for repositories and both controllers.
- Coverage % not measured in this retro (would require running tests; plan-mode pass is spot-check only).

### Process drift (lesson, not remediation)

- The catalog spec churned mid-sprint: `tighten → revert → broaden → revert → sweep`. The final state shipped via PR #65 + ADR-0019 + ADR-0020. Future sprints should treat CONTEXT.md edits as PR-only (no direct-to-main commits); the lock from ADR-0019 + ADR-0020 already prevents this from recurring.

## Prerequisites for sprint 4

### Hard blockers (must resolve before /create-sprint-issues 4)

- None. S4 is already 🟡 In progress.

### Soft prereqs (nice-to-have)

- Generation seed data — half-day standalone issue before S5 (not before S4).

### Parallel action items from charter §19 relevant to S4

- None directly. S4 reuses MinIO presigned uploads (charter §11) — already in the API Docker stack.

## Proposed doc updates

- [ ] **Close parent issue [#66](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/66)** via `gh issue close 66`.
- [ ] **Update [`apps/api/src/modules/catalog/CONTEXT.md`](../../../apps/api/src/modules/catalog/CONTEXT.md)** — fix seed counts on lines 149-153 to match actual file contents.

## Lessons for sprint 4

- **Sprint pace: fast.** S3 was estimated ~1 week, shipped in one wall-clock day (2026-05-17). The pre-S3 housekeeping ([PR #64](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/64)) trimmed scope to a backend slice + dev smoke, deferring picker UX to S4/S5; that scope trim was the single biggest reason the sprint shipped fast. S4 should similarly defer non-essential UX work if the wizard cliff looks steep.
- **CONTEXT.md drift is recurrent — keep verifying numbers.** Three count claims in CONTEXT.md were wrong by sprint close even though the file was updated in the same PR as the change. Reviewers should sanity-check numeric claims, not just structure. Adding a "count seed rows" check to the sprint-final issue's DoD would prevent this class of drift.
- **Sprint-final PR should also close the parent issue.** Closing the children via `Closes #67` etc. left #66 hanging. `/run-issue`'s sprint-final step (or the issue template for sprint-final) should explicitly mention closing the parent.
- **TanStack Query hook factory works.** The `useBrands` extra mile in PR #81 gives S4 a clear reuse pattern; the create-listing wizard should follow the same `useBrands → queryKeys.catalog.brands.list(locale)` shape for `useModelsForBrand`, `useRegions`, `useCities`, etc.

## Sign-off

After both "Proposed doc updates" above are applied (or skipped), run `/create-sprint-issues 4` if S4 issues need creating, **or** continue the existing S4 work — the sprint has already started (🟡 since 2026-05-17).
