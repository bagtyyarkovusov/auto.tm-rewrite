import { describe, expect, it } from "vitest";
import { StepVehicleSchema, validateStep } from "./wizard";
const vehicle = { brandId: "00000000-0000-4000-8000-000000000001", modelId: "00000000-0000-4000-8000-000000000002", year: 2018 };
describe("Optional VIN", () => {
  it.each(["Corolla", "A".repeat(16), "A".repeat(18), "WBA1234567890ABCI", "WBA1234567890ABCO", "WBA1234567890ABCQ", "WBA1234567890ABC!", " WBA1234567890ABC", "А".repeat(17)])("rejects invalid VIN %s in the vehicle contract", (vin) => {
    expect(StepVehicleSchema.safeParse({ ...vehicle, vin }).success).toBe(false);
    expect(validateStep("vehicle", { ...vehicle, vin }).valid).toBe(false);
  });
  it.each([undefined, "", "WBA1234567890ABCD", "wba1234567890abcd"])("accepts optional or valid VIN %s", (vin) => {
    expect(StepVehicleSchema.safeParse({ ...vehicle, vin }).success).toBe(true);
  });
});
