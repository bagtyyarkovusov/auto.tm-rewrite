import { describe, expect, it } from "vitest";

import { draftProgress } from "./draftProgress";

describe("draftProgress", () => {
  it("counts the data steps the seller has filled, out of every step but Review", () => {
    expect(
      draftProgress({ currentStep: 1, validatedSteps: ["vin", "photos", "vehicle"] }),
    ).toEqual({ filled: 3, total: 7, percent: 43 });
  });

  it("reads nothing filled for a draft that was only opened", () => {
    expect(draftProgress({ currentStep: 1 })).toEqual({ filled: 0, total: 7, percent: 0 });
  });

  it("ignores Review and step names the wizard no longer has", () => {
    expect(draftProgress({ validatedSteps: ["vehicle", "review", "gone"] })).toEqual({
      filled: 1,
      total: 7,
      percent: 14,
    });
  });

  it("reads full once every data step is filled", () => {
    expect(
      draftProgress({
        validatedSteps: ["vin", "photos", "vehicle", "specs", "price", "location", "contact"],
      }),
    ).toEqual({ filled: 7, total: 7, percent: 100 });
  });
});
