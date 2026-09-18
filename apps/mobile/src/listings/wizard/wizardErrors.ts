import { WizardSchemas } from "@auto-tm/contracts";
import type { TFunction } from "i18next";

/**
 * Wizard validation messages arrive from `@auto-tm/contracts` as
 * `wizardErrors.*` keys rather than display text (ADR-0050), so every locale
 * renders its own copy. The numeric limits come from the contract too — the
 * translations interpolate them instead of hardcoding 17 / 200 / 2000.
 *
 * Anything that is not a wizard key is passed through untouched: it is already
 * a server or network message that was localized elsewhere.
 */
const INTERPOLATION = {
  vinMaxLength: WizardSchemas.WIZARD_LIMITS.vinMaxLength,
  yearMin: WizardSchemas.WIZARD_LIMITS.yearMin,
  yearMax: WizardSchemas.WIZARD_LIMITS.yearMax,
  locationTextMaxLength: WizardSchemas.WIZARD_LIMITS.locationTextMaxLength,
  descriptionMaxLength: WizardSchemas.WIZARD_LIMITS.descriptionMaxLength,
};

export function translateWizardError(t: TFunction, message: string): string;
export function translateWizardError(
  t: TFunction,
  message: string | undefined,
): string | undefined;
export function translateWizardError(
  t: TFunction,
  message: string | undefined,
): string | undefined {
  if (!message) return message;
  if (!message.startsWith(WizardSchemas.WIZARD_ERROR_KEY_PREFIX)) return message;
  return t(message, INTERPOLATION);
}

export function translateWizardFieldErrors(
  t: TFunction,
  fieldErrors: Record<string, string>,
): Record<string, string> {
  const translated: Record<string, string> = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    translated[field] = translateWizardError(t, message);
  }
  return translated;
}
