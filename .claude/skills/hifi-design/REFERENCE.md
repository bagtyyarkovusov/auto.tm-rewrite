# Hi-fi reference

## Source routing

Read the owning product/flow and current implementation first. Then resolve current visual facts from:

- `packages/ui/tokens/` and actual web/mobile theme files;
- `packages/ui/components/` for web/admin;
- `apps/mobile/components/ui/` and `apps/mobile/CONTEXT.md` for mobile RNR;
- app i18n resources for existing copy;
- `docs/prd/ui/70-design-principles.md` through `79-web-vs-mobile.md`; and
- `docs/prd/ui/kolesa-findability-reference.md` for mobile IA only.

When guidance conflicts with code/current `CONTEXT.md` or a later ADR, cite the conflict and use higher authority. Never repeat stale constants from memory.

## UX and microinteraction gate

For the screen and every primary interaction, verify:

- clear goal, mental model, hierarchy, primary action, and orientation;
- perceived affordance and signifier for each control;
- natural mapping between control and result;
- constraints that prevent slips/mistakes without removing meaningful choice;
- user control, back/cancel/undo, preserved input, and actionable recovery;
- recognition over recall, progressive disclosure, concise copy, and no dark patterns;
- Trigger, Rules, Feedback, Loops/Modes, interruption, repeated trigger, zero/max, and completion behavior;
- immediate honest feedback scaled to action significance; and
- no invisible critical trigger, hidden mode, fake progress, or decorative delay.

Score three dimensions 0–10 and rate findings 0–4. Severity 3–4 blocks delivery; list exact work needed to reach 10/10.

## Required spec shape

```markdown
# <Platform> — <Screen/flow> hi-fi

## Status, purpose, and sources
## Layout and responsive/safe-area behavior
## Token map (light and dark)
## Component and customization map
## Page-state matrix
## Interaction-state and microinteraction matrix
## Motion and reduced motion
## Accessibility
## Trilingual copy and i18n keys
## UX scores and severity findings
## Implementation notes
## Open decisions (must be empty or explicitly deferred)
```

## Page and control states

Page states are Default, Loading, Empty, Error, and Offline. For each, specify structure, copy, action availability, retryability, cached/preserved data, and transition back to healthy state.

Add applicable control states: hover (web), pressed, focus-visible, disabled with explanation, validation error, success, permission denied, auth-deferred, optimistic/pending, retry, repeated trigger, interrupted action, and max/zero boundary.

## Accessibility

Specify—not merely assert:

- contrast pairs: 4.5:1 normal text, 3:1 large text;
- targets: 44pt iOS, 48dp Android, 44px web;
- semantic roles, localized labels, state/value announcements;
- reading and focus order, modal trap, Esc/Enter, and keyboard behavior on web;
- visible labels and associated error/help text;
- non-color meaning, reduced motion, and screen-reader behavior; and
- intended manual/automated verification.

## Localization

Reuse existing keys first. Provide RU/TK/EN for every new chrome string, accessibility label, error, empty state, and action. Mark unreviewed translations as proposed. Include long-text expansion and locale formatting for numbers, dates, currency, and phone numbers. User content remains untranslated.

## Implementation boundary

Use NativeWind v4 + RNR and current mobile component variants; use Tailwind v4 + shadcn/Base UI for web/admin. Prefer existing components. Document a customization plan only when call-site classes, a variant, composition, or a justified primitive change is required. Never prescribe a raw component path contradicted by current code.
