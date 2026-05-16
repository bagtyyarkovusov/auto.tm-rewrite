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
