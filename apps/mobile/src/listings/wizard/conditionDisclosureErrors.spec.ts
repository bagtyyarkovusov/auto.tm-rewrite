import { WizardSchemas } from "@auto-tm/contracts";
import { describe, expect, it } from "vitest";

import { conditionDisclosureFieldErrors } from "./conditionDisclosureErrors";

describe("conditionDisclosureFieldErrors", () => {
  it.each([undefined, { knownIssuesText: "Rust on the sill" }])("routes the required answer error for %j under Damaged", (disclosure) => {
    const { fieldErrors } = WizardSchemas.validateStep("specs", { condition: "new", conditionDisclosure: disclosure });
    expect(conditionDisclosureFieldErrors(fieldErrors, disclosure)).toEqual({ damaged: "wizardErrors.damagedRequired" });
  });
  it("routes invalid Known issues under its input after the answer", () => {
    const disclosure = { damaged: true, knownIssuesText: "x".repeat(1001) };
    const { fieldErrors } = WizardSchemas.validateStep("specs", { condition: "new", conditionDisclosure: disclosure });
    expect(conditionDisclosureFieldErrors(fieldErrors, disclosure)).toEqual({ knownIssuesText: "wizardErrors.invalidValue" });
  });
  it("has no error after a valid answer", () => {
    const disclosure = { damaged: false };
    const { fieldErrors } = WizardSchemas.validateStep("specs", { condition: "new", conditionDisclosure: disclosure });
    expect(conditionDisclosureFieldErrors(fieldErrors, disclosure)).toEqual({});
  });
});
