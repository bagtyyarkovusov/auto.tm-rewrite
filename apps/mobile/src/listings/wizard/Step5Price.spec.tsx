import { forwardRef, useImperativeHandle, useState } from "react";
import { Enums } from "@auto-tm/contracts";
import type { WizardSchemas } from "@auto-tm/contracts";
import { TextInput } from "react-native";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../../../test/msw";
import { fireEvent, renderMobile, within } from "../../../test/render";

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

    expect(screen.getByText("Currency")).toBeTruthy();
    // getByRole only matches accessibility elements, and the group is a plain
    // View: marking it `accessible` would make iOS read it as one element and
    // hide its three radios. So the role and name are read from its props.
    const group = screen.UNSAFE_getByProps({
      accessibilityRole: "radiogroup",
      accessibilityLabel: "Currency",
    });
    expect(group.props.accessible).toBeUndefined();
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
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

  it("keeps each currency button's class shape the same whether or not it is selected", () => {
    const screen = renderMobile(<PriceStep />);
    // A class that sets a CSS variable (shadow-sm) and appears only when
    // selected crashes the dev app when it lands on a mounted Pressable.
    const shape = (name: string) =>
      String(screen.getByRole("radio", { name }).props.className)
        .split(/\s+/)
        .filter(Boolean)
        .map((utility) => utility.replace(/-(border|background|transparent)$/, ""))
        .sort();

    expect(shape("TMT")).toEqual(shape("USD"));
    expect(shape("TMT")).toContain("border");
    expect(String(screen.getByRole("radio", { name: "TMT" }).props.className)).not.toMatch(/shadow/);

    fireEvent.press(screen.getByRole("radio", { name: "USD" }));

    expect(shape("USD")).toEqual(shape("TMT"));
    expect(String(screen.getByRole("radio", { name: "USD" }).props.className)).toContain("bg-background");
    expect(String(screen.getByRole("radio", { name: "TMT" }).props.className)).toContain("bg-transparent");
  });

  it("disables every currency when the step is read-only", () => {
    const screen = renderMobile(<Step5Price payload={{}} onChange={() => {}} disabled />);
    for (const name of ["TMT", "USD", "AED"]) {
      expect(screen.getByRole("radio", { name }).props.accessibilityState.disabled).toBe(true);
    }
  });
});

describe("Price step amount label", () => {
  it.each([
    ["en", "Amount *", "Price *"],
    ["ru", "Сумма *", "Цена *"],
    ["tk", "Mukdary *", "Bahasy *"],
  ])("labels the amount field once in %s", (locale, kept, dropped) => {
    const screen = renderMobile(<PriceStep />, { locale });

    expect(screen.getAllByText(kept)).toHaveLength(1);
    expect(screen.queryByText(dropped)).toBeNull();
  });
});

describe("Price step errors", () => {
  const required = { priceAmount: "Price is required" };
  function ErrorsStep({ showErrors }: { showErrors?: boolean }) {
    const [payload, setPayload] = useState<WizardSchemas.WizardDraftPayload>({});
    return (
      <Step5Price
        payload={payload}
        onChange={(updates) => setPayload((previous) => ({ ...previous, ...updates }))}
        fieldErrors={payload.priceAmount ? {} : required}
        showErrors={showErrors}
      />
    );
  }

  it("says nothing about the empty amount when the seller arrives on the step", () => {
    const screen = renderMobile(<ErrorsStep />);

    expect(screen.getByPlaceholderText("Enter amount")).toBeTruthy();
    expect(screen.queryByText("Price is required")).toBeNull();
  });

  it("says nothing when a currency switch clears the amount", () => {
    const screen = renderMobile(<ErrorsStep />);

    fireEvent.press(screen.getByRole("radio", { name: "USD" }));

    expect(screen.queryByText("Price is required")).toBeNull();
  });

  it("says the amount is required once the seller clears it", () => {
    const screen = renderMobile(<ErrorsStep />);
    const amount = screen.getByPlaceholderText("Enter amount");

    fireEvent.changeText(amount, "5");
    fireEvent.changeText(amount, "");

    expect(screen.getByText("Price is required")).toBeTruthy();
  });

  it("says the amount is required once the seller leaves it empty", () => {
    const screen = renderMobile(<ErrorsStep />);

    fireEvent(screen.getByPlaceholderText("Enter amount"), "blur");

    expect(screen.getByText("Price is required")).toBeTruthy();
  });

  it("says the amount is required when the wizard asks the step to show its errors", () => {
    const screen = renderMobile(<ErrorsStep showErrors />);

    expect(screen.getByText("Price is required")).toBeTruthy();
  });
});
