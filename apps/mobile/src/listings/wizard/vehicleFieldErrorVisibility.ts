export type VehicleField = "brandId" | "modelId" | "year";

interface VehicleFieldErrorVisibilityInput {
  field: VehicleField;
  showAllErrors: boolean;
  touchedFields: Partial<Record<VehicleField, boolean>>;
}

export function shouldShowVehicleFieldError({
  field,
  showAllErrors,
  touchedFields,
}: VehicleFieldErrorVisibilityInput): boolean {
  return showAllErrors || touchedFields[field] === true;
}
