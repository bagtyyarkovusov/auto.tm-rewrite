import { forwardRef, useImperativeHandle, useState } from "react";
import { Enums } from "@auto-tm/contracts";
import type { WizardSchemas } from "@auto-tm/contracts";
import { TextInput } from "react-native";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../../../test/msw";
import { fireEvent, renderMobile } from "../../../test/render";

import Step5Price from "./Step5Price";

// The test renderer has no native text input to focus, so the Input records focus requests.
const focusRequests = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/components/ui/input", () => ({
  Input: forwardRef<{ focus: () => void }, React.ComponentProps<typeof TextInput>>(function Input(props, ref) {
    useImperativeHandle(ref, () => ({ focus: () => { focusRequests.count += 1; } }));
    return <TextInput {...props} />;
  }),
}));

vi.mock("@/components/ui/switch", async () => {
  const { Pressable } = await import("react-native");
  return {
    Switch: ({ checked, onCheckedChange, disabled }: {
      checked: boolean; onCheckedChange: (value: boolean) => void; disabled?: boolean;
    }) => (
      <Pressable accessibilityRole="switch" accessibilityState={{ checked, disabled }}
        disabled={disabled} onPress={() => onCheckedChange(!checked)} />
    ),
  };
});

const updatedAt ="2026-10-01T00:00:00.000Z";
let rates: { fromCurrency: string; toCurrency: string; rate: number; updatedAt: string }[] = [];

beforeEach(() => {
  focusRequests.count = 0;
  rates = [{ fromCurrency: "USD", toCurrency: "TMT", rate: 3.5, updatedAt }];
  server.resetHandlers();
  server.use(http.get("*/exchange-rates", () => HttpResponse.json({ rates })));
});

function PriceStep({
  initial = {},
  onChange,
}: {
  initial?: WizardSchemas.WizardDraftPayload;
  onChange?: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
}) {
  const [payload, setPayload] = useState(initial);
  return (
    <Step5Price
      payload={payload}
      onChange={(updates) => {
        onChange?.(updates);
        setPayload((previous) => ({ ...previous, ...updates }));
      }}
    />
  );
}

describe("Price step currency", () => {
  it("offers TMT, USD and AED as three radio buttons with TMT selected by default", () => {
    const screen = renderMobile(<PriceStep />);

    expect(screen.getByRole("radiogroup", { name: "Currency" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "TMT", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "USD", checked: false })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "AED", checked: false })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByText("Select currency")).toBeNull();
  });

  it("clears the amount and keeps focus on it when the seller picks another currency", () => {
    const onChange = vi.fn();
    const screen = renderMobile(
      <PriceStep initial={{ priceAmount: 185000, priceCurrency: Enums.Currency.TMT }} onChange={onChange} />,
    );
    expect(screen.getByDisplayValue("185000")).toBeTruthy();

    fireEvent.press(screen.getByRole("radio", { name: "USD" }));

    expect(onChange).toHaveBeenLastCalledWith({ priceCurrency: Enums.Currency.USD, priceAmount: undefined });
    expect(screen.getByRole("radio", { name: "USD", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "TMT", checked: false })).toBeTruthy();
    expect(screen.queryByDisplayValue("185000")).toBeNull();
    expect(focusRequests.count).toBe(1);
  });

  it("keeps the amount when the seller taps the currency already selected", () => {
    const onChange = vi.fn();
    const screen = renderMobile(<PriceStep initial={{ priceAmount: 9000 }} onChange={onChange} />);

    fireEvent.press(screen.getByRole("radio", { name: "TMT" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("9000")).toBeTruthy();
  });

  it("shows the TMT equivalent for a foreign currency when the rate is known", async () => {
    const screen = renderMobile(<PriceStep initial={{ priceCurrency: Enums.Currency.USD }} />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter amount"), "10000");

    expect(await screen.findByText(`≈ ${(35000).toLocaleString()} TMT`)).toBeTruthy();
  });

  it("shows no missing-rate helper when AED has no rate", async () => {
    const screen = renderMobile(<PriceStep initial={{ priceCurrency: Enums.Currency.AED, priceAmount: 5000 }} />);
    await screen.findByRole("radio", { name: "AED", checked: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText(/≈/)).toBeNull();
    expect(screen.queryByText(/rate/i)).toBeNull();
  });

  it("disables every currency when the step is read-only", () => {
    const screen = renderMobile(<Step5Price payload={{}} onChange={() => {}} disabled />);
    for (const name of ["TMT", "USD", "AED"]) {
      expect(screen.getByRole("radio", { name }).props.accessibilityState.disabled).toBe(true);
    }
  });
});
