# ADR-0040: Repo-canonical workflow skills — one layer at `.claude/skills/`; commands, cross-agent mirrors, and global `*-kimi` variants retired

- **Status**: Accepted
- **Date**: 2026-07-22
- **Deciders**: AutoTM founder + AI architect
- **Supersedes**: the pre-0040 AGENTS.md skill-storage statement ("Claude Code commands are the canonical source; the SKILL.md variants are mirrors"). Also records the staleness — without editing them, per ADR-0020 immutability — of the skill-path references in ADR-0020 (`.claude/commands/sprint-status.md` + `.agents/skills/sprint-status-agent-skill/SKILL.md`) and ADR-0014 (`.claude/commands/wireframe.md` / `hifi-design.md`). This ADR is the pointer forward for skill locations.

## Context

The nine sprint + design workflow skills (`run-issue`, `create-sprint-issues`, `resume-issue`, `sprint-status`, `close-sprint`, `new-adr`, `wireframe`, `hifi-design`, `design-grill`) existed in up to five overlapping layers:

1. `.claude/commands/*.md` — tracked slash commands, declared canonical.
2. `.agents/skills/*-agent-skill/SKILL.md` — tracked cross-agent mirrors of the commands, declared non-divergent "as long as both are updated together".
3. `.claude/skills/*` — 43 symlinks into untracked `.agents/skills/<generic>/` copies of generic skills (grill-me, tdd, expo-*, …) that duplicated the user's global skill farm. Measured drift: repo `grill-me` ≠ global `grill-me`. On a fresh clone every symlink dangled, since the targets were never committed.
4. `~/.claude/skills/*-kimi/` — eight user-global Kimi-CLI-era workflow variants, AutoTM-specific, version-controlled nowhere.
5. `~/.agents/skills/*-kimi/` — their cross-agent mirrors.

Consequences observed: every workflow edit landed 2–3 times; the declared mirror layers drifted anyway; `design-grill` existed only in layer 1 (no mirror, no global variant — coverage was accidental, not designed); `run-issue.md` had grown to ~760 lines, far past the Claude Code skill-authoring guidance (tight entry file + progressive-disclosure reference files); and the global copies were personal, un-backed-up, and invisible to anyone cloning the repo.

## Decision

**Exactly one executable workflow-skill layer exists, and it lives in the repo: `.claude/skills/<name>/SKILL.md` in Claude Code skill format — a tight SKILL.md (name + trigger-rich description) plus split reference files where size warrants — tracked in git and reviewed via PR like any other process document.**

- The nine skills are **rewritten** into that format, not moved. Names stay plain: `run-issue`, `create-sprint-issues`, `resume-issue`, `sprint-status`, `close-sprint`, `new-adr`, `wireframe`, `hifi-design`, `design-grill`.
- Retired and deleted: `.claude/commands/`, `.agents/skills/*-agent-skill/`, the untracked symlink/generic-duplicate layer (including repo-only strays `review`, `to-issues`, `to-prd`, `zoom-out` — reinstallable globally from the user's skill installer if ever missed), and the user-global `*-kimi` workflow variants in both `~/.claude/skills/` and `~/.agents/skills/`.
- Generic skills (grilling, tdd, write-a-skill, expo plugin skills, …) remain **user-global personal tooling** and are never committed to this repo.
- Kimi-Sandcastle (ADR-0028) is unaffected: sandboxes consume self-contained prompts baked into `.sandcastle/`, never skill files from any of these layers.

## Consequences

- Workflow process is versioned with the code it governs: fresh clones, PR review, and git history all cover the skills. One edit location eliminates the drift class instead of mitigating it.
- The global skill farm becomes generic-only; AutoTM-specific skills no longer surface in unrelated repos and no longer exist solely on one disk.
- Kimi CLI `/flow:<name>-kimi` invocations of the workflow no longer exist. The synchronous path is Claude Code + `/run-issue`; the Docker AFK path stays Sandcastle (ADR-0028).
- Historical documents (ADR-0014, ADR-0020, sprint-07, `docs/superpowers/*`) keep their now-stale skill-path references — immutable per ADR-0020; this ADR records the supersession.
- AGENTS.md's skill table and `docs/agents/issue-tracker.md` were updated in the same change; the table is the canonical index of the nine skills.

## Alternatives considered

- **Global-canonical (all nine as user-global skills; repo keeps zero)** — rejected: takes the executable form of project process out of version control (against the ADR-0020 governance model), loses fresh-clone presence, and sprays AutoTM-specific triggers across every unrelated repo the user opens.
- **Keep commands canonical and regenerate mirrors via script/CI** — rejected: keeps two surfaces where one suffices; generation tooling mitigates drift rather than eliminating it; plain commands lack skill frontmatter controls and progressive disclosure.
- **Status quo** — rejected: measured drift, triple edits, silent divergence of the global copies, accidental coverage (`design-grill`).

## References

- [ADR-0019](0019-context-md-describes-current-state.md), [ADR-0020](0020-document-hierarchy-and-mutability.md), [ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md), [ADR-0014](0014-mobile-component-library.md) (stale skill-path reference, superseded here)
- Claude Code skill-authoring guidance (write-a-skill): tight SKILL.md, third-person `Use when …` trigger descriptions ≤1024 chars, reference files one level deep
- Grill session of 2026-07-22 (layer audit + decision) and `/tmp/auto-tm-skill-consolidation-handoff.md` (rewrite brief; session artifact, not a repo doc)
