import type { ListingsSchemas } from "@auto-tm/contracts";

import type { StagedPhoto } from "../uploadStaging/types";

export interface WizardPayload extends ListingsSchemas.ListingDraftPayload {
  // Photos tracked separately from payload.photos for UI state
  photoStates?: StagedPhoto[];
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
