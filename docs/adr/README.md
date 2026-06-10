# Architecture Decision Records

This directory contains architecture decisions for AutoTM. ADRs are **immutable after merge** — they document what was decided, when, and why.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-architecture.md) | Level 2 bounded-contexts architecture | Accepted | 2026-05-13 |
| [0002](0002-stack.md) | Technology stack | Accepted | 2026-05-13 |
| [0003](0003-monorepo.md) | Monorepo with Turborepo + pnpm | Accepted | 2026-05-13 |
| [0004](0004-migrations.md) | Prisma migrations discipline | Accepted | 2026-05-13 |
| [0005](0005-hosting.md) | Fully-in-Turkmenistan air-gapped hosting | Accepted | 2026-05-13 |
| [0006](0006-auth.md) | Phone OTP + custom Android SMS gateway | Accepted | 2026-05-13 |
| [0007](0007-i18n.md) | i18n strategy (RU + TK + EN) | Accepted | 2026-05-13 |
| [0008](0008-media.md) | Media upload + serving pipeline | Accepted | 2026-05-13 |
| [0009](0009-notifications.md) | Push notifications (FCM + APNS + fallback) | Accepted | 2026-05-13 |
| [0010](0010-testing-obs.md) | Testing pyramid + observability stack | Accepted | 2026-05-13 |
| [0011](0011-version-deltas.md) | Latest-stable version uplift | Accepted | 2026-05-13 |
| [0012](0012-multi-device-sessions.md) | Multi-device sessions with per-session refresh tokens (supersedes ADR-0006 §Refresh token storage) | Accepted | 2026-05-14 |
| [0013](0013-user-role-split.md) | Split `User.role` from `DealershipMember.role` | Accepted | 2026-05-14 |
| [0014](0014-mobile-component-library.md) | Mobile component library — React Native Reusables on top of NativeWind v4 (complements ADR-0002) | Accepted | 2026-05-16 |
| [0015](0015-mobile-data-fetching.md) | Mobile data fetching — TanStack Query v5 + custom fetch wrapper (complements ADR-0002, ADR-0012) | Accepted | 2026-05-16 |
| [0016](0016-typescript-runtime-boundaries.md) | TypeScript runtime boundaries for workspace packages | Accepted | 2026-05-17 |
| [0017](0017-context7-as-canonical-doc-source.md) | Context7 MCP as the canonical doc source for AI agents | Accepted | 2026-05-17 |
| [0018](0018-api-port-3006.md) | API runs on port 3006 in development | Accepted | 2026-05-17 |
| [0019](0019-context-md-describes-current-state.md) | CONTEXT.md describes current state, not aspirational spec | Accepted | 2026-05-17 |
| [0020](0020-document-hierarchy-and-mutability.md) | Document hierarchy and mutability rules | Accepted | 2026-05-17 |
| [0021](0021-feed-ranking-port.md) | Feed ranking via port abstraction | Accepted | 2026-05-18 |
| [0022](0022-city-first-listing-location.md) | City-first listing location | Accepted | 2026-05-18 |
| [0023](0023-first-party-product-analytics.md) | First-party product analytics for MVP | Accepted | 2026-05-18 |
| [0024](0024-owner-post-publish-photo-editing.md) | Owner post-publish photo editing | Accepted | 2026-05-21 |
| [0025](0025-edit-save-atomicity.md) | Edit-mode Save changes uses sequential best-effort, not server-side atomic bundle | Accepted | 2026-05-22 |
| [0026](0026-edit-mode-review-first-entry.md) | Edit mode opens at Review; create mode stays linear | Accepted | 2026-05-22 |
| [0027](0027-mlp-beta-scope.md) | MLP beta scope before full marketplace MVP | Accepted | 2026-05-22 |
| [0028](0028-kimi-sandcastle-afk-orchestrator.md) | Kimi-Sandcastle as the AFK parallel orchestrator | Accepted | 2026-06-04 |
| [0029](0029-self-hosted-ota-air-gap-delivery.md) | Self-hosted Expo Updates (OTA) + hybrid air-gapped app delivery | Accepted | 2026-06-07 |
| [0030](0030-reviewer-demo-account-otp-bypass.md) | Reviewer demo-account OTP bypass for store review | Accepted | 2026-06-07 |
| [0031](0031-mobile-i18n.md) | Mobile i18n runtime — locale store + Accept-Language transport + query-key cache (implements ADR-0007; supersedes its §catalog client-side rendering) | Accepted | 2026-06-09 |
| [0032](0032-account-deletion-grace-period.md) | Account deletion — 30-day grace, tombstone-retain content, recoverable by login | Accepted | 2026-06-09 |
| [0033](0033-sandcastle-copy-to-worktree-dependencies.md) | Sandcastle dependencies via copy-to-worktree — prebuilt Linux node_modules cloned per worktree (supersedes ADR-0028 §D3) | Accepted | 2026-06-10 |
| [0034](0034-kolesa-ux-findability-reference.md) | Kolesa.kz as the UX / information-architecture reference (revises charter §1 auto.ru, findability scope only) | Accepted | 2026-06-10 |
| [0035](0035-multi-vertical-platform-direction.md) | Multi-vertical platform direction — cars as the MLP wedge (extends ADR-0034; MLP stays cars-only) | Accepted | 2026-06-11 |

## Per-app ADRs

| Location | Scope |
|---|---|
| `apps/api/docs/adr/` | API-specific (DTO patterns, error envelopes, controller conventions) |
| `apps/admin/docs/adr/` | Admin UI specific (component library choices, layout) |
| `apps/web/docs/adr/` | Public web specific (SSR strategy, OG generation) |
| `apps/mobile/docs/adr/` | Mobile specific (navigation, state mgmt, deep linking) |

## Format

Every ADR follows this skeleton:

```markdown
# ADR-NNNN: <Title>

- **Status**: Accepted | Superseded by ADR-XXXX | Rejected
- **Date**: YYYY-MM-DD
- **Deciders**: <names>

## Context
<the situation that forced a decision — constraints, alternatives in scope>

## Decision
<what was chosen, stated as a present-tense declarative sentence>

## Consequences
### Positive
- ...

### Negative / accepted costs
- ...

### Neutral
- ...

## Alternatives considered
- **<Option B>** — <why rejected>
- **<Option C>** — <why rejected>

## References
- Charter §X
- Related ADR-NNNN
```

## Rules

1. **Numbered sequentially.** Don't reuse numbers.
2. **Dated on creation.** Update the date on a superseded note, never the original.
3. **Immutable after merge.** To change a decision, write a new ADR that supersedes the old one and updates this index.
4. **One decision per ADR.** Don't bundle five decisions into one document.
5. **Concrete, not aspirational.** "We will use NestJS" — not "we should consider NestJS."
