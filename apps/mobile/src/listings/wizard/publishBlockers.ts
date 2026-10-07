import { WizardSchemas, ListingsSchemas } from "@auto-tm/contracts";
import type { TFunction } from "i18next";

import type { UploadCounts } from "../uploadStaging/uploadCounts";

export interface PublishBlockerInput {
  validatedSteps: WizardSchemas.WizardStep[];
  /** `null` until the upload queue holds the open draft's photos. */
  uploads: UploadCounts | null;
}

/**
 * What keeps Publish disabled, one line each, in the order a screen reader reads
 * them: the incomplete steps by name, then photos still uploading, then photos
 * that failed.
 *
 * Seam for the contact phone (#593, ADR-0056): a phone that needs confirming is
 * not a blocker here. The server refuses the publish and the route sends the
 * seller to Contact.
 */
export function publishBlockerLines(t: TFunction, { validatedSteps, uploads }: PublishBlockerInput): string[] {
  const lines: string[] = [];

  const missing = WizardSchemas.WIZARD_STEPS.filter(
    (step) => step !== "review" && !validatedSteps.includes(step),
  );
  if (missing.length > 0) {
    lines.push(t("publishFillIn", { steps: missing.map((step) => t(`wizardSteps.${step}`)).join(", ") }));
  }
  if (uploads && uploads.total < ListingsSchemas.MIN_LISTING_PHOTOS) {
    lines.push(t("wizardErrors.photosRequired", { minimum: ListingsSchemas.MIN_LISTING_PHOTOS }));
  }
  if (uploads && uploads.inflight > 0) {
    lines.push(t("photosGateUploading", { count: uploads.inflight }));
  }
  if (uploads && uploads.failed > 0) {
    lines.push(t("photosGateFailed", { count: uploads.failed }));
  }
  return lines;
}
