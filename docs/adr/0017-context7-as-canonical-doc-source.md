# ADR-0017: Context7 MCP as the canonical doc source for AI agents

- **Status**: Accepted
- **Date**: 2026-05-17

## Context

This repo is built largely by AI agents (Claude Code, Cursor, Codex, future tools) operating against a fast-moving stack: NestJS 11, Prisma 7, Next.js 16, React 19, Expo SDK 55, React Native 0.83, NativeWind v4, TanStack Query v5, Tailwind CSS v4, and ~25 other major libraries. Every model's training data lags the current state of these libraries by months or longer.

We have seen, repeatedly, agents:

- Recommend `expo-router` APIs that were removed before SDK 55.
- Hand-pin `react-native-screens` versions that conflict with Expo's compatibility matrix (caused the `RNSSafeAreaView` runtime crash documented in CLAUDE.md).
- Use TanStack Query v4 patterns (`useQuery(key, fn, opts)`) against the v5 signature (`useQuery({ queryKey, queryFn, ...opts })`).
- Reference Prisma 5/6 syntax against our Prisma 7 schema.
- Invent Next.js 16 App Router behavior that does not exist.

Before this ADR, the rule "use Context7 MCP for library docs" lived in three places:

1. The user's personal global `~/.claude/rules/context7.md` (Claude Code only, not visible to Cursor / Codex / other devs).
2. `CLAUDE.md:31` — narrowly scoped to "Expo SDK 55 docs."
3. Embedded inside `docs/agents/nativewind-v4.md` and `docs/agents/mobile-data-fetching.md` — narrow to those two domains.

A non-Claude agent landing in this repo would see no general doc-lookup policy. A new contributor's Claude session without that global rule would see only the Expo line. Both miss the wider stack.

## Decision

**Context7 MCP is the canonical doc source for every external library, framework, SDK, API, CLI tool, and cloud service this repo depends on.** Before writing or debugging code that touches one of these, agents resolve it through Context7 (`resolve-library-id` → `query-docs`) — even when they believe they already know the answer.

The policy is enforced as a **loud documentation norm + a verification-gate (Definition of Done) item**, not as mechanical tooling. We do not block `WebFetch` via hooks, and we do not write CI checks that grep commit messages for "Context7." The norm is visible enough, and aligned enough across the agent surfaces, that drift is the bigger risk than bypass.

Surfaces that carry the rule:

1. `CLAUDE.md` — `Always do` rule generalized from "Expo SDK 55" to "every external library"; new bullet linking to the canonical lookup guide; new item in the verification-before-completion checklist.
2. `AGENTS.md` — new section pointing every non-Claude agent (Cursor, Codex, etc.) at the same rule and the same guide.
3. `docs/agents/documentation-lookups.md` — the canonical lookup guide. Contains the workflow, the pinned library-ID table for this stack, and recipes for the most-touched libraries.
4. `CONTEXT-MAP.md` — gains an "Agent Policy" section so agents orienting themselves see the policy files alongside the domain files.
5. This ADR — locks the policy so it does not silently drift back to the narrow Expo-only rule.

The pinned library-ID table covers the ~25 stack libraries that drive most agent lookups. For everything not on the table (utility libraries like `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`), agents call `resolve-library-id` on demand — the table is a starting point, not a closed set.

## Consequences

### Positive

- Every AI agent landing in the repo, regardless of vendor, sees the same canonical rule with the same canonical library IDs.
- Outdated training-data hallucinations against fast-moving libraries (Expo, Next.js, Prisma, React Native, TanStack Query) drop because agents reach for live docs first.
- The verification gate makes "did you consult Context7?" a checkable Definition of Done item, not a vibes-based norm.
- Drift is bounded: when a stack library moves (e.g., NativeWind v5 ships), updating one table in `docs/agents/documentation-lookups.md` propagates the new pin everywhere.

### Negative / accepted costs

- One more MCP dependency in every agent session. If Context7 is down, agents fall back to `WebFetch` against official docs — slower and less structured but not blocking.
- The library-ID table will need periodic refresh as Context7 publishes new versions or library IDs shift. Reviewed at sprint-close.
- Soft enforcement means a non-compliant agent can still ship code that skipped Context7. Reviewers catch this at the verification gate.

### Neutral

- No code change. Docs-only.
- No new tooling, no new MCP servers (Context7 was already installed).

## Alternatives considered

- **Do nothing — rely on the user's personal global rule.** Rejected: the global rule only applies to that user's Claude Code sessions. Other devs, Cursor, Codex, and future tooling see nothing.
- **Mechanical enforcement via `PreToolUse` hooks blocking `WebFetch` for library docs.** Rejected: heuristic at best (hard to distinguish library doc lookup from legitimate `WebFetch` use), brittle (would also need to block `WebSearch`), and only enforces against Claude Code anyway.
- **Per-library agent guides only (extend `nativewind-v4.md` / `mobile-data-fetching.md` pattern to every library).** Rejected: 25+ guides to maintain, with massive overlap. One canonical guide + a pinned table is the same coverage at a fraction of the maintenance cost.
- **CI gate that requires "Context7-consulted: yes" in PR descriptions.** Rejected: theatre. An agent that wants to skip Context7 will write the line anyway. The verification gate puts the burden on the reviewer instead.

## References

- `CLAUDE.md` (root agent policy)
- `AGENTS.md` (cross-agent policy mirror)
- `docs/agents/documentation-lookups.md` (canonical guide + library ID table)
- `~/.claude/rules/context7.md` (user-global rule that motivated this — not in repo, referenced for posterity)
- ADR-0015 (mobile data fetching) — `docs/agents/mobile-data-fetching.md` was the first agent guide to embed Context7 recipes
- ADR-0014 (mobile component library) — `docs/agents/nativewind-v4.md` was the second
