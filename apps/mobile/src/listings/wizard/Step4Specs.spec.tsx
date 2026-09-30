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

function ValidatedSpecs({ initial = { condition: "new" }, disabled = false }: {
  initial?: WizardSchemas.WizardDraftPayload; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [payload, setPayload] = useState(initial);
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
    const screen = renderMobile(<ValidatedSpecs initial={{ condition: "new", conditionDisclosure: { knownIssuesText: "Rust on the sill" } }} />);
    fireEvent.press(screen.getByRole("radio", { name: `Damaged / needs repair: ${answer}` }));
    expect(screen.getByRole("radio", { name: `Damaged / needs repair: ${answer}`, checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: `Damaged / needs repair: ${answer === "Yes" ? "No" : "Yes"}`, checked: false })).toBeTruthy();
    expect(screen.queryByText("Answer whether the car is damaged or needs repair")).toBeNull();
    expect(screen.getByDisplayValue("Rust on the sill")).toBeTruthy();
  });

  it("shows Known issues validation after Damaged is answered", () => {
    const screen = renderMobile(<ValidatedSpecs initial={{ condition: "new", conditionDisclosure: { damaged: true, knownIssuesText: "x".repeat(1001) } }} />);
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
    const screen = renderMobile(<Step4Specs payload={{ condition: "new" }} onChange={onChange} disabled />);
    fireEvent.press(screen.getByRole("radio", { name: "Damaged / needs repair: Yes" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
