import type { ListingsSchemas } from "@auto-tm/contracts";

export interface ConditionDisclosureFieldErrors {
  damaged?: string;
  knownIssuesText?: string;
}

/**
 * Reads the Damaged / needs repair and Known issues errors out of the field
 * error map that `WizardSchemas.validateStep` returns for the specs step.
 *
 * `validateStep` keys errors by the top-level field only, so both questions
 * report under `conditionDisclosure`. While Damaged is unanswered, the missing
 * answer is the error to show, under the question. Once it is answered, any
 * remaining disclosure error can only come from Known issues.
 */
export function conditionDisclosureFieldErrors(
  fieldErrors: Record<string, string> | undefined,
  disclosure: ListingsSchemas.DraftConditionDisclosure | undefined,
): ConditionDisclosureFieldErrors {
  const error = fieldErrors?.conditionDisclosure;
  if (!error) return {};
  return disclosure?.damaged === undefined ? { damaged: error } : { knownIssuesText: error };
}
