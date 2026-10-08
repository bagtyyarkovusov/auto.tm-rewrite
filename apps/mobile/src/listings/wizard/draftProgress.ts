import { WizardSchemas } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { completedSteps } from "./wizardMachine";

/**
 * Every step the wizard header counts ("Step N of 7"), Check and publish
 * included, so the draft card and the header state the same total. Only the
 * data steps can be filled; the last one is done by publishing.
 */
const TOTAL_STEPS = WizardSchemas.WIZARD_STEPS.length;

export interface DraftProgress {
  filled: number;
  total: number;
  percent: number;
}

/**
 * How far a saved draft is, using the wizard resume rule: each data step
 * whose saved fields validate counts, regardless of stored step metadata.
 */
export function draftProgress(payload: ListingsSchemas.ListingDraft["payload"]): DraftProgress {
  // The stored step names are free strings in the draft contract; completion ignores them.
  const filled = completedSteps(payload as WizardSchemas.WizardDraftPayload).length;
  const total = TOTAL_STEPS;
  return { filled, total, percent: Math.round((filled / total) * 100) };
}
