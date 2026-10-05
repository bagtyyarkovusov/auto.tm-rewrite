import type { WizardSchemas } from "@auto-tm/contracts";

import type { StagedPhoto } from "../uploadStaging/types";

export interface CheckAndPublishProps {
  payload: WizardSchemas.WizardDraftPayload;
  validatedSteps: WizardSchemas.WizardStep[];
  /** Opens a step from Check; Done on that step returns here. */
  onChangeStep: (step: WizardSchemas.WizardStep) => void;
  /** Every picked photo in order, the cover first. */
  photos: StagedPhoto[];
}

/** The last step of the Sell wizard: the Listing as buyers will see it, and what is left to fix. */
export default function CheckAndPublish(_props: CheckAndPublishProps) {
  return null;
}
