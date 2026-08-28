# Domain docs — multi-context layout

> **Three foundational ADRs govern domain documentation in this repo:**
> - [ADR-0019](../adr/0019-context-md-describes-current-state.md) — `CONTEXT.md` describes **current implemented state** (mirrors code; updated in the same PR that changes invariants). Aspirational content lives in PRD features / sprint files.
> - [ADR-0020](../adr/0020-document-hierarchy-and-mutability.md) — full doc hierarchy + mutability rules (PRD features, sprint files, retros, ADRs, CONTEXT.md). Read this before adding a new PRD, revising a sprint file mid-flight, or editing any merged ADR.
> - [ADR-0042](../adr/0042-domain-glossary-authority-and-mutability.md) — [`docs/domain/GLOSSARY.md`](../domain/GLOSSARY.md) is the canonical source for domain and engineering vocabulary. A term may precede implementation; it does not make `CONTEXT.md` aspirational.

This repo uses a **multi-context** layout. There is no single top-level `CONTEXT.md`. Instead:

- `CONTEXT-MAP.md` at the repo root is the **index** — it points to every `CONTEXT.md` in the tree
- Each app has its own `CONTEXT.md` describing what that workspace owns **today**
- Each bounded context under `apps/api/src/modules/<context>/` has its own `CONTEXT.md` describing its **current** domain language, invariants, ports, and events

Skills that reason about the domain must:

1. **Read the canonical glossary** for term meanings, synonyms to avoid, and bounded-context ownership.
2. **Start at `CONTEXT-MAP.md`** to find the right context file for the area they're working in.
3. **Read the relevant `CONTEXT.md`** for **current** domain invariants, ports, events, and implemented language (per ADR-0019, this describes shipped code, not what's planned).
4. **Cross-reference ADRs** in `docs/adr/` and `apps/*/docs/adr/` for the "why" behind decisions.
5. **For "what's planned but not yet shipped"**, read the relevant PRD feature file in `docs/prd/features/` or sprint file in `docs/prd/sprints/` — never CONTEXT.md (per ADR-0020).
6. **For deferred features**, check `docs/prd/03-roadmap.md` first, then the owning feature PRD/flow. Do not infer scheduled work from old sprint labels or historical retros.

## File locations

| File | Purpose |
|---|---|
| `/docs/domain/GLOSSARY.md` | Canonical domain and engineering terms; no implementation status, feature scope, or translations |
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
- **Move a planned capability between phases** → update roadmap + owning PRD/flow; add an ADR if the move changes material capability scope
- **Close a phase/beta gate** → verify `CONTEXT-MAP.md`, local `CONTEXT.md` files, roadmap bet table, and open issues agree before marking the phase complete

Treat `CONTEXT.md` as living code documentation — drift = bugs.
