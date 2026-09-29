import type { ListingsSchemas } from "@auto-tm/contracts";

export interface ConditionDisclosureFieldErrors {
  damaged?: string;
  knownIssuesText?: string;
}

/**
 * Reads the Damaged / needs repair and Known issues errors out of the field
 * error map that `WizardSchemas.validateStep` returns for the specs step.
 */
export function conditionDisclosureFieldErrors(
  fieldErrors: Record<string, string> | undefined,
  _disclosure: ListingsSchemas.DraftConditionDisclosure | undefined,
): ConditionDisclosureFieldErrors {
  return {
    damaged: fieldErrors?.["conditionDisclosure.damaged"],
    knownIssuesText: fieldErrors?.["conditionDisclosure.knownIssuesText"],
  };
}
