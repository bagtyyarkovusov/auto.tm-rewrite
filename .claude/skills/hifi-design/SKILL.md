---
name: hifi-design
description: Produces an implementation-ready AutoTM high-fidelity design specification with current tokens and components, light and dark modes, complete states, motion, accessibility, localization, and microinteraction behavior. Use when a wireframe or settled screen flow needs precise visual and engineering handoff.
argument-hint: "<screen-or-flow> [platform] [standalone]"
---

# High-fidelity AutoTM design

Turn settled structure into an implementation-ready spec. Do not use visual precision to hide unresolved product behavior.

## Establish authority

1. Parse `$ARGUMENTS` and locate the owning wireframe, issue, PRD/flow, and platform.
2. Read authority in this order: charter/ADRs → target PRD/flow and issue/sprint delta → `CONTEXT.md`/code → actual tokens/components/i18n → mutable UI guidance.
3. Treat code and current-state docs as present reality, the PRD/issue as target behavior, and shipped UI specs as current mirrors. Label a redesign proposal until it ships.
4. If structure or product decisions remain open, return them to the user or `/wireframe`; do not guess.

## Apply UX and interaction frameworks

When available, apply user-global `ux-heuristics`, `design-everyday-things`, and `microinteractions`. The mandatory fallback rubric in [REFERENCE.md](REFERENCE.md) covers usability, affordances, constraints, feedback/recovery, and Trigger → Rules → Feedback → Loops/Modes for each key interaction.

Use Kolesa only for mobile IA/findability. AutoTM's actual tokens, components, typography, copy, and brand remain authoritative for visuals.

## Specify

Follow [REFERENCE.md](REFERENCE.md) and [EXAMPLES.md](EXAMPLES.md):

- exact semantic tokens and current component/variant names;
- light and dark modes;
- Default, Loading, Empty, Error, and Offline states (`N/A` requires a reason);
- applicable hover, pressed, focus-visible, disabled, validation, success, permission, auth-deferred, optimistic, pending, and retry states;
- exact motion and reduced-motion behavior;
- platform-specific accessibility and verification;
- exact RU/TK/EN keys/copy, with new translations marked `PROPOSED — native review required`; and
- implementation shape without inventing unsupported APIs.

Rate heuristic usability, discoverability/error tolerance, and microinteraction quality 0–10. Resolve severity 3–4 findings before delivery and list concrete improvements toward 10/10.

## Preview and save

Preview the full spec in chat. Save only after confirmation to `docs/prd/ui/hifi/<platform>-<route-or-screen>.md` on the current safe branch. Do not silently branch, push, or open a PR.

In `standalone` mode, include resolved constraints and source-derived values so the artifact can travel without embedding an evergreen copy of project guidance in this skill.
