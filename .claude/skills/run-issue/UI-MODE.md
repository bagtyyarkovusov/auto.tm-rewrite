# UI mode

Use this gate only when the issue changes a user-visible screen, flow, component behavior, or copy.

## Design readiness

1. Identify every affected screen/platform and whether it is new, current-state maintenance, or a target redesign.
2. Search `docs/prd/ui/wireframes/` and `docs/prd/ui/hifi/` for applicable specs.
3. Verify existing specs against the issue, current PRD/flow, roadmap/sprint delta, `CONTEXT.md`, and current components/tokens. A stale file is not design authority.
4. Trivial conformance work may continue with a short rationale.
5. For a nontrivial screen without adequate design, recommend `/design-grill <N>` and pause. “Continue without design” remains available only after explicit user choice.

## UX and platform sources

Apply the authority order used by the design skills:

1. locked charter and accepted ADRs;
2. target PRD/flow and the active issue/sprint delta;
3. current-state `CONTEXT.md` and code;
4. actual token/component/i18n sources;
5. mutable UI guidance.

For mobile IA/findability, use the Kolesa reference without copying its visual language or deferred feature breadth. For UI details, require clear user goal, affordances/signifiers, constraints, feedback, recovery, page states, accessibility, localization, and microinteraction behavior.

## Implementation grouping

The main session remains the owner. Apply [SUBAGENT-MODE.md](SUBAGENT-MODE.md) when its mandatory gate triggers; outside that gate, subagents are optional mechanics. Whenever they are used:

- group work by non-overlapping files and coherent acceptance criteria;
- give each implementer the issue, exact scope, relevant design specs, and verification target;
- review each group against the spec, UX decisions, code quality, and project rules;
- integrate centrally and run the full cross-workspace verification gate after all groups.

Do not let a subagent invent product behavior, modify locked documents, or claim a host-only gate it did not run.
