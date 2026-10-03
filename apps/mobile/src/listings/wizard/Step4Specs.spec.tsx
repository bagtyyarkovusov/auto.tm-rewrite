import { useState } from "react";
import { WizardSchemas } from "@auto-tm/contracts";
import { describe, expect, it, vi } from "vitest";
import { useTranslation } from "react-i18next";

import { renderMobile, fireEvent } from "../../../test/render";

import { translateWizardFieldErrors } from "./wizardErrors";
import Step4Specs from "./Step4Specs";

vi.mock("../../api/catalog/useColors", () => ({ useColors: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useBodyTypes", () => ({ useBodyTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useTransmissions", () => ({ useTransmissions: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useDriveTypes", () => ({ useDriveTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useEngineTypes", () => ({ useEngineTypes: () => ({ data: { items: [] } }) }));

function ValidatedSpecs({ initial = { condition: "used", mileageKm: 1000 }, disabled = false, onPayload }: {
  initial?: WizardSchemas.WizardDraftPayload; disabled?: boolean;
  onPayload?: (payload: WizardSchemas.WizardDraftPayload) => void;
}) {
  const { t } = useTranslation();
  const [payload, setPayload] = useState(initial);
  onPayload?.(payload);
  const { fieldErrors } = WizardSchemas.validateStep("specs", payload);
  return <Step4Specs payload={payload} disabled={disabled}
    onChange={(updates) => setPayload((previous) => ({ ...previous, ...updates }))}
    fieldErrors={translateWizardFieldErrors(t, fieldErrors)} />;
}

describe("Step4Specs condition disclosure", () => {
  it("shows the required Damaged error even without a disclosure object and neither radio is checked", () => {
    const screen = renderMobile(<ValidatedSpecs />);
    expect(screen.getByText("Answer whether the car is damaged or needs repair")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Damaged / needs repair: Yes", checked: false })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Damaged / needs repair: No", checked: false })).toBeTruthy();
  });

  it.each(["Yes", "No"])("selects %s, preserves Known issues, and removes the required error", (answer) => {
    const screen = renderMobile(<ValidatedSpecs initial={{ condition: "used", mileageKm: 1000, conditionDisclosure: { knownIssuesText: "Rust on the sill" } }} />);
    fireEvent.press(screen.getByRole("radio", { name: `Damaged / needs repair: ${answer}` }));
    expect(screen.getByRole("radio", { name: `Damaged / needs repair: ${answer}`, checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: `Damaged / needs repair: ${answer === "Yes" ? "No" : "Yes"}`, checked: false })).toBeTruthy();
    expect(screen.queryByText("Answer whether the car is damaged or needs repair")).toBeNull();
    expect(screen.getByDisplayValue("Rust on the sill")).toBeTruthy();
  });

  it("shows Known issues validation after Damaged is answered", () => {
    const screen = renderMobile(<ValidatedSpecs initial={{ condition: "used", mileageKm: 1000, conditionDisclosure: { damaged: true, knownIssuesText: "x".repeat(1001) } }} />);
    expect(screen.getByText("Invalid value")).toBeTruthy();
    expect(screen.queryByText("Answer whether the car is damaged or needs repair")).toBeNull();
    const input = screen.getByDisplayValue("x".repeat(1001));
    expect(input.props.maxLength).toBe(1000);
    fireEvent.changeText(input, "Rust");
    expect(screen.queryByText("Invalid value")).toBeNull();
    expect(screen.getByRole("radio", { name: "Damaged / needs repair: Yes", checked: true })).toBeTruthy();
  });

  it("does not change a disabled answer", () => {
    const onChange = vi.fn();
    const screen = renderMobile(<Step4Specs payload={{ condition: "used" }} onChange={onChange} disabled />);
    fireEvent.press(screen.getByRole("radio", { name: "Damaged / needs repair: Yes" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ADR-0080: a New car is not asked Damaged and stores not damaged.
describe("Step4Specs for a New car", () => {
  const damagedRadios = /Damaged \/ needs repair/;

  function renderTracked(initial: WizardSchemas.WizardDraftPayload) {
    let latest = initial;
    const screen = renderMobile(<ValidatedSpecs initial={initial} onPayload={(p) => { latest = p; }} />);
    return { screen, payload: () => latest };
  }

  it("hides the Damaged question, stores not damaged, and keeps Known issues optional", () => {
    const { screen, payload } = renderTracked({ condition: "used", mileageKm: 1000 });
    fireEvent.press(screen.getByRole("button", { name: "New" }));

    expect(screen.queryAllByRole("radio", { name: damagedRadios })).toHaveLength(0);
    expect(screen.queryByText("Damaged / needs repair")).toBeNull();
    expect(screen.queryByText("Answer whether the car is damaged or needs repair")).toBeNull();
    expect(payload().conditionDisclosure).toEqual({ damaged: false });
    expect(WizardSchemas.validateStep("specs", payload()).valid).toBe(true);
    expect(screen.getByText("Known issues")).toBeTruthy();
  });

  it("keeps not damaged when the seller writes Known issues", () => {
    const { screen, payload } = renderTracked({ condition: "new" });
    fireEvent.changeText(screen.getByPlaceholderText("Describe known problems or damage..."), "Paint chip");

    expect(payload().conditionDisclosure).toEqual({ damaged: false, knownIssuesText: "Paint chip" });
    expect(WizardSchemas.validateStep("specs", payload()).valid).toBe(true);
  });

  it("stores not damaged when a Used car answered Yes switches to New", () => {
    const { screen, payload } = renderTracked({
      condition: "used", mileageKm: 1000, conditionDisclosure: { damaged: true, knownIssuesText: "Dent" },
    });
    fireEvent.press(screen.getByRole("button", { name: "New" }));

    expect(payload().conditionDisclosure).toEqual({ damaged: false, knownIssuesText: "Dent" });
  });

  it("clears the answer on New to Used and asks the question again", () => {
    const { screen, payload } = renderTracked({ condition: "new", conditionDisclosure: { damaged: false, knownIssuesText: "Dent" } });
    fireEvent.press(screen.getByRole("button", { name: "Used" }));

    expect(payload().conditionDisclosure).toEqual({ knownIssuesText: "Dent" });
    expect(screen.getByRole("radio", { name: "Damaged / needs repair: Yes", checked: false })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Damaged / needs repair: No", checked: false })).toBeTruthy();
    expect(screen.getByText("Answer whether the car is damaged or needs repair")).toBeTruthy();
    expect(screen.getByDisplayValue("Dent")).toBeTruthy();
  });

  it("keeps an existing Used answer when Used is tapped again", () => {
    const { screen, payload } = renderTracked({ condition: "used", mileageKm: 1000, conditionDisclosure: { damaged: true } });
    fireEvent.press(screen.getByRole("button", { name: "Used" }));

    expect(payload().conditionDisclosure).toEqual({ damaged: true });
  });

  it("explains a damaged New draft under Condition and lets New clear it", () => {
    const { screen, payload } = renderTracked({ condition: "new", conditionDisclosure: { damaged: true } });

    expect(screen.getByText("A new car can't be damaged. Choose Used.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "New" }));
    expect(payload().conditionDisclosure).toEqual({ damaged: false });
    expect(screen.queryByText("A new car can't be damaged. Choose Used.")).toBeNull();
  });

  it("announces New as selected and has no Damaged control in the accessibility tree", () => {
    const { screen } = renderTracked({ condition: "new", conditionDisclosure: { damaged: false } });

    expect(screen.getByRole("button", { name: "New", selected: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Used", selected: false })).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});
