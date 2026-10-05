import type { WizardSchemas } from "@auto-tm/contracts";
import type { TFunction } from "i18next";

import type { UploadCounts } from "../uploadStaging/uploadCounts";

export interface PublishBlockerInput {
  validatedSteps: WizardSchemas.WizardStep[];
  /** `null` until the upload queue holds the open draft's photos. */
  uploads: UploadCounts | null;
}

/** What keeps Publish disabled, one line each, in the order a screen reader reads them. */
export function publishBlockerLines(_t: TFunction, _input: PublishBlockerInput): string[] {
  return [];
}
