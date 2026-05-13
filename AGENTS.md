# Agents — auto.tm-rewrite

Same policy as `CLAUDE.md` in this repository. AI agents working in this repo should treat the two files as identical sources of truth.

## Read first

1. `GRILL-OUTCOME.md` — locked design decisions
2. `CONTEXT-MAP.md` — index of every `CONTEXT.md`
3. The local `CONTEXT.md` for the area you're working in
4. Relevant ADRs in `docs/adr/`

For the full agent policy (architecture rules, never-do list, verification checklist, documentation system), read `CLAUDE.md`.

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context — see `CONTEXT-MAP.md` and `docs/agents/domain.md`.
