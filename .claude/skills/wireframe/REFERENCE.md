# Wireframe reference

## Required source routing

Read only what the target needs, but never skip higher authority:

- product/scope: `docs/prd/20-information-architecture.md`, owning feature/flow, roadmap, issue/sprint;
- mobile findability: `docs/prd/ui/kolesa-findability-reference.md`;
- design principles: `docs/prd/ui/70-design-principles.md`;
- accessibility: `docs/prd/ui/77-accessibility.md`;
- platform boundary: `docs/prd/ui/79-web-vs-mobile.md`;
- current state: relevant `CONTEXT.md`, routes, components, and i18n.

For a shipped screen, label future changes as a proposal until implemented. Do not rewrite a current-state mirror as if the proposal already shipped.

## UX rubric

Apply these checks even when user-global UX skills are unavailable:

1. **Goal and mental model:** What job is the user completing, and what do they expect to happen?
2. **Gulf of execution:** Are the next action, control, affordance, signifier, and mapping obvious?
3. **Gulf of evaluation:** Is state and action feedback immediate and understandable?
4. **Findability:** Can users orient, navigate, search/filter, and recognize rather than recall?
5. **Constraints:** Does the structure prevent errors without trapping the user?
6. **Control:** Are back, cancel, undo, and safe exits available where appropriate?
7. **Recovery:** Does an error explain what happened, what remains saved, and how to retry?
8. **Cognitive load:** One primary action, clear hierarchy, progressive disclosure, concise copy.
9. **Ethics:** No fake urgency, dark patterns, hidden costs, or deceptive progress.
10. **Accessibility structure:** logical reading/focus order, visible labels, non-color meaning, adequate target space.

Score usability and discoverability 0–10, list what prevents 10/10, and rate findings 0 cosmetic/non-issue through 4 task-blocking. Resolve severity 3–4 before delivery.

## Output contract

```markdown
# <Platform> — <Screen/flow> wireframe

## Status and sources
- New target | proposal | current-state maintenance
- Owning issue/PRD/flow
- Resolved constraints and source paths

## User goal and entry/exit
- Primary user/job
- Entry points
- Success condition
- Back/cancel/escape behavior

## ASCII wireframe
<phone frame, desktop regions, or flow sequence>

## Numbered content blocks
1. <block, hierarchy, purpose>

## Interactions and constraints
| Trigger | Action/rule | Feedback | Error/recovery |

## Page-state matrix
| State | Structure | Primary action | Recovery/preserved data |

## Accessibility structure
- Reading/focus order, labels/roles, target risks

## Copy inventory
- Realistic placeholder + new-string flags

## UX review
- Usability: N/10
- Discoverability/understandability: N/10
- Severity findings and fixes toward 10/10

## Open product decisions
- None, or numbered user decisions

## Hi-fi handoff
- Tokens/components/motion/copy questions for `/hifi-design`
```

## Platform rules

- Mobile: honor the five-tab IA, reachability, keyboard/safe areas, native navigation, slow data, and anonymous-default entry.
- Public web: keep its deliberately minimal share/SEO/fallback scope.
- Admin: desktop productivity, keyboard flow, dense-but-readable information hierarchy.
- Never rely on hover for critical meaning or gestures without visible alternatives.

At wireframe stage, omit exact colors, typography values, shadows, final icon choices, and decorative illustration detail.
