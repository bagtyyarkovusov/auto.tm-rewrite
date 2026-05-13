# Domain docs — multi-context layout

This repo uses a **multi-context** layout. There is no single top-level `CONTEXT.md`. Instead:

- `CONTEXT-MAP.md` at the repo root is the **index** — it points to every `CONTEXT.md` in the tree
- Each app has its own `CONTEXT.md` describing what that workspace owns
- Each bounded context under `apps/api/src/modules/<context>/` has its own `CONTEXT.md` describing its domain language, invariants, ports, and events

Skills that read these files (`improve-codebase-architecture`, `diagnose`, `tdd`) must:

1. **Start at `CONTEXT-MAP.md`** to find the right context file for the area they're working in
2. **Read the relevant `CONTEXT.md`** for domain language and current invariants
3. **Cross-reference ADRs** in `docs/adr/` and `apps/*/docs/adr/` for the "why" behind decisions

## File locations

| File | Purpose |
|---|---|
| `/CONTEXT-MAP.md` | Index of every CONTEXT.md |
| `/apps/api/CONTEXT.md` | API service overview, layering rules |
| `/apps/api/src/modules/<context>/CONTEXT.md` | Per-bounded-context domain language, ports, events |
| `/apps/admin/CONTEXT.md` | Admin app overview |
| `/apps/web/CONTEXT.md` | Public web app overview |
| `/apps/mobile/CONTEXT.md` | Mobile app overview |
| `/apps/sms-gateway/CONTEXT.md` | SMS gateway service |
| `/apps/phone-agent/CONTEXT.md` | Kotlin Android phone agent |
| `/apps/worker/CONTEXT.md` | BullMQ worker |
| `/packages/db/CONTEXT.md` | Prisma schema overview |
| `/packages/contracts/CONTEXT.md` | Shared type contracts |
| `/packages/ui/CONTEXT.md` | Design tokens + shared components |
| `/docs/adr/` | Global ADRs (cross-cutting decisions) |
| `/apps/*/docs/adr/` | Per-app ADRs (UI choices, frame­work-specific) |

## CONTEXT.md template

Every `CONTEXT.md` follows this skeleton:

```markdown
# <Context name>

## Purpose
<one paragraph — what this context is for>

## Owns (entities + tables)
- `EntityA` — <one-line description>
- `EntityB` — ...

## Invariants
- <a rule that always holds, e.g. "a Listing has exactly one User as owner">
- <another rule>

## Ports exposed (for other contexts to consume)
- `interface XReadPort { ... }`

## Ports consumed (from other contexts)
- `SomethingReadPort` from `<other context>`

## Events emitted
- `EventName` — fired when <condition>; payload: `{ ... }`

## Events consumed
- `EventName` from `<other context>` — handler: `<UseCase>`

## Notable decisions (ADR refs)
- ADR-0006 (auth)
- ADR-0009 (notifications) — for the FCM port abstraction
```

## When to update a CONTEXT.md

- **Add a new entity / table** → update Owns
- **Change a domain invariant** → update Invariants (consider an ADR if it's an architectural shift)
- **Add a new port or event** → update Ports / Events
- **Rename or split a context** → update CONTEXT.md + CONTEXT-MAP.md + write an ADR

Treat `CONTEXT.md` as living code documentation — drift = bugs.
