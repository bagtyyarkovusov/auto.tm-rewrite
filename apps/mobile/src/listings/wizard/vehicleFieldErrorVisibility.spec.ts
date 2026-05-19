import { describe, expect, it } from "vitest";

import { shouldShowVehicleFieldError } from "./vehicleFieldErrorVisibility";

describe("shouldShowVehicleFieldError", () => {
  it("hides field errors before the step has been submitted or touched", () => {
    expect(
      shouldShowVehicleFieldError({
        field: "brandId",
        showAllErrors: false,
        touchedFields: {},
      }),
    ).toBe(false);
  });

  it("shows only the touched field before a continue attempt", () => {
    expect(
      shouldShowVehicleFieldError({
        field: "brandId",
        showAllErrors: false,
        touchedFields: { brandId: true },
      }),
    ).toBe(true);
    expect(
      shouldShowVehicleFieldError({
        field: "modelId",
        showAllErrors: false,
        touchedFields: { brandId: true },
      }),
    ).toBe(false);
    expect(
      shouldShowVehicleFieldError({
        field: "year",
        showAllErrors: false,
        touchedFields: { brandId: true },
      }),
    ).toBe(false);
  });

  it("shows every current field error after a continue attempt", () => {
    expect(
      shouldShowVehicleFieldError({
        field: "modelId",
        showAllErrors: true,
        touchedFields: {},
      }),
    ).toBe(true);
  });
});
