import type { ListingsSchemas, WizardSchemas } from "@auto-tm/contracts";

import type { StagedPhoto } from "../uploadStaging/types";

/** The Listing fields an edit can change and Save changes sends. */
export const EDITABLE_FIELDS: (keyof ListingsSchemas.EditListingRequest)[] = [
  "priceAmount",
  "priceCurrency",
  "description",
  "condition",
  "mileageKm",
  "colorId",
  "bodyTypeId",
  "transmissionId",
  "driveTypeId",
  "engineTypeId",
  "enginePower",
  "regionId",
  "cityId",
  "locationText",
  "contactPhone",
  "allowCalls",
  "allowChat",
  "acceptsExchange",
  "installmentAvailable",
  "conditionDisclosure",
];

/**
 * A value as the comparison sees it: an empty field is no field, however it is
 * stored. A text the seller typed and cleared again is therefore not a change.
 */
function comparable(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return value.map(comparable);
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, inner]) => [key, comparable(inner)] as const)
      .filter(([, inner]) => inner !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  return value;
}

/**
 * Whether an edit differs from the published Listing: in a field Save changes
 * would send, or in which photos it has and their order. Undoing every change
 * makes it false again.
 *
 * `photos` is null while the upload queue does not hold this Listing's photos
 * yet; the photos then count as unchanged.
 */
export function hasEditChanges(
  published: WizardSchemas.WizardDraftPayload,
  edited: WizardSchemas.WizardDraftPayload,
  photos: readonly StagedPhoto[] | null,
): boolean {
  const fieldChanged = EDITABLE_FIELDS.some(
    (field) =>
      JSON.stringify(comparable(published[field])) !== JSON.stringify(comparable(edited[field])),
  );
  if (fieldChanged || photos === null) return fieldChanged;

  const publishedPhotoIds = (published.photos ?? []).map((photo) => photo.photoId);
  return (
    publishedPhotoIds.length !== photos.length ||
    photos.some((photo, index) => photo.photoId !== publishedPhotoIds[index])
  );
}
