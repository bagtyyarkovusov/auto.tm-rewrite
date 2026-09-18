# ADR-0050: Wizard validation messages are translation keys, not prose

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: AutoTM founder + AI architect

## Context

The sell wizard's per-step Zod schemas in `packages/contracts/src/schemas/wizard.ts` carried English message strings — `"Price is required"`, `"Region is required"`, `"Mileage is required for used cars"`. `validateStep` returned them verbatim in `errors` and `fieldErrors`, the mobile wizard machine put them straight into `ctx.fieldErrors`, and each step screen rendered them under the offending field.

The device sweep for [#321](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/321) found the consequence: a seller running the app in Turkmen or Russian hits an English sentence the moment they leave a required field blank. Zod's own untranslated defaults leaked the same way — a missing `condition` enum surfaced as the bare word `"Required"`. The upload publish gate in `apps/mobile/src/listings/uploadStaging/queueState.ts` hardcoded four more English blockers.

Turkmen and Russian are the launch locales. A Google Play reviewer taking the first-run path sees these strings, and so does every real seller.

The same messages cross the API boundary: `POST /api/v1/listings/drafts/:id/validate-step` returns them to whichever client asked. Translating inside `@auto-tm/contracts` would mean teaching a framework-free contracts package about locales and giving the API a request-locale concern it does not otherwise have.

## Decision

**Contracts emit stable message keys; clients own the display text.**

- Every user-facing message in the wizard step schemas is a dotted key under the `wizardErrors.` prefix, exported as `WizardSchemas.WIZARD_ERROR_KEY_PREFIX`.
- A contextual `z.ZodErrorMap` maps Zod's own defaults (a missing value, a bad enum) to `wizardErrors.required`, so no built-in English reaches a client either. Schema-level messages outrank it.
- Numeric limits the messages interpolate (VIN length, year range, description and area caps) are exported as `WizardSchemas.WIZARD_LIMITS` rather than baked into the sentence, so a translation can place the number where its own grammar wants it and the two can never drift.
- The mobile publish-gate blockers use the same `wizardErrors.*` namespace.
- `apps/mobile/src/listings/wizard/wizardErrors.ts` translates at the render boundary. Anything not carrying the prefix passes through untouched — server and network messages are already localized elsewhere.

Translations live in `apps/mobile/src/i18n/resources.ts` under `common.wizardErrors` for all three locales.

## Consequences

### Positive

- Turkmen and Russian sellers read validation errors in their own language, including the ones Zod generates itself.
- The API's `validate-step` response is now locale-neutral. A future web or admin client translates the same keys without a second vocabulary.
- Limits are declared once. A test asserts every translation interpolates them rather than restating "2000".

### Negative / accepted costs

- `validate-step` responses changed shape-compatibly but content-incompatibly: a consumer that displayed `errors[0]` raw now shows a key. Today the only consumers are this mobile app and the API's own tests, both updated here.
- A new step field needs a key in three locales, not just an inline English string. `resources.spec.ts` now fails the build when Turkmen or English lags Russian, which makes the cost visible rather than silent.

### Neutral

- Turkmen still falls back to Russian at runtime. The new test asserts parity without a fallback so a gap fails in CI instead of on a device.

## Alternatives considered

- **Translate inside contracts.** Rejected: puts locale state in a framework-free shared package and forces the API to negotiate a request locale.
- **Map English prose to keys on the client.** Rejected: string matching against sentences that a later edit would silently break.
