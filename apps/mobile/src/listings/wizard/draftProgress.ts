import { WizardSchemas } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";

/** The wizard's data steps; Review only checks them. */
const DATA_STEPS = WizardSchemas.WIZARD_STEPS.filter((step) => step !== "review");

export interface DraftProgress {
  filled: number;
  total: number;
  percent: number;
}

/**
 * How far a saved draft is, for every screen that lists drafts. Counts the
 * data steps the wizard recorded as filled; the payload's `currentStep` is
 * always written as 1 and says nothing about progress.
 */
export function draftProgress(payload: ListingsSchemas.ListingDraft["payload"]): DraftProgress {
  const filled = DATA_STEPS.filter((step) => payload.validatedSteps?.includes(step)).length;
  const total = DATA_STEPS.length;
  return { filled, total, percent: Math.round((filled / total) * 100) };
}
