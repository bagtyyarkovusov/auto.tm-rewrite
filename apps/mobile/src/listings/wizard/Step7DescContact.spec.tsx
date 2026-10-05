import { describe, expect, it, vi } from "vitest";

import { fireEvent, renderMobile } from "../../../test/render";

import Step7DescContact from "./Step7DescContact";

vi.mock("../../api/catalog/useBrands", () => ({ useBrands: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useModels", () => ({ useModels: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useCities", () => ({ useCities: () => ({ data: { items: [] } }) }));
// The real switch is an @rn-primitives component the test host cannot load.
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

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const confirmedPhones = [
  {
    phone: "+99361000001",
    source: "confirmed" as const,
    confirmedAt: "2026-09-29T12:00:00.000Z",
    reusableUntil: inDays(3.4),
  },
  {
    phone: "+99361000002",
    source: "confirmed" as const,
    confirmedAt: "2026-10-04T12:00:00.000Z",
    reusableUntil: inDays(6.2),
  },
];

function renderStep(props: Partial<Parameters<typeof Step7DescContact>[0]> = {}) {
  const onChange = vi.fn();
  const screen = renderMobile(
    <Step7DescContact
      payload={{ allowCalls: true, allowChat: true }}
      onChange={onChange}
      {...props}
    />,
  );
  return { screen, onChange };
}

describe("Contact step", () => {
  it("preselects the sign-in phone, which needs no code", () => {
    const { screen, onChange } = renderStep({
      accountPhone: "+99365000000",
      confirmedPhones: [],
    });

    expect(screen.getByText("+99365000000")).toBeTruthy();
    expect(screen.getByText("Your sign-in phone. No code needed.")).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith({ contactPhone: "+99365000000" });
  });

  it("lists confirmed numbers with the days left", () => {
    const { screen } = renderStep({
      payload: { contactPhone: "+99365000000", allowCalls: true, allowChat: true },
      accountPhone: "+99365000000",
      confirmedPhones,
    });

    expect(
      screen.getByText("Confirmed. 4 days left without a new code."),
    ).toBeTruthy();
    expect(
      screen.getByText("Confirmed. 7 days left without a new code."),
    ).toBeTruthy();
    expect(screen.getByText("Another number")).toBeTruthy();
  });

  it("selects a quick pick on tap", () => {
    const { screen, onChange } = renderStep({
      payload: { contactPhone: "+99365000000", allowCalls: true, allowChat: true },
      accountPhone: "+99365000000",
      confirmedPhones,
    });

    fireEvent.press(screen.getByLabelText("+99361000001"));
    expect(onChange).toHaveBeenCalledWith({ contactPhone: "+99361000001" });
  });

  it("marks a saved number past its 7 days and offers to confirm it again", () => {
    const onConfirmExpired = vi.fn();
    const { screen } = renderStep({
      payload: { contactPhone: "+99362999999", allowCalls: true, allowChat: true },
      accountPhone: "+99365000000",
      confirmedPhones,
      onConfirmExpired,
    });

    expect(
      screen.getByText("Confirmation expired. Tap to confirm again."),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("+99362999999"));
    expect(onConfirmExpired).toHaveBeenCalledWith("+99362999999");
  });

  it("tells an email-only User to confirm a phone and preselects nothing", () => {
    const { screen, onChange } = renderStep({
      accountPhone: null,
      confirmedPhones: [],
    });

    expect(
      screen.getByText(
        "You signed in with email. Confirm a phone for this Listing. It will not become a way to sign in.",
      ),
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the publish rejection above the picker", () => {
    const { screen } = renderStep({
      payload: { contactPhone: "+99365000000", allowCalls: true, allowChat: true },
      accountPhone: "+99365000000",
      publishPhoneError: true,
    });

    expect(
      screen.getByText("Confirm the contact phone again to publish."),
    ).toBeTruthy();
  });

  it("shows the Continue error under the picker", () => {
    const { screen } = renderStep({
      accountPhone: null,
      confirmedPhones: [],
      selectionError: "Choose or confirm a contact phone",
    });

    expect(screen.getByText("Choose or confirm a contact phone")).toBeTruthy();
  });

  it("offers the Listing's current number without a code in edit mode", () => {
    const { screen } = renderStep({
      payload: { contactPhone: "+99362000002", allowCalls: true, allowChat: true },
      accountPhone: "+99365000000",
      currentListingPhone: "+99362000002",
      confirmedPhones: [],
    });

    expect(screen.getByText("Current number of this Listing")).toBeTruthy();
    expect(
      screen.queryByText("Confirmation expired. Tap to confirm again."),
    ).toBeNull();
  });

  it("keeps the calls and chat switches", () => {
    const { screen, onChange } = renderStep({
      accountPhone: "+99365000000",
      confirmedPhones: [],
    });

    expect(screen.getByText("Phone calls")).toBeTruthy();
    expect(screen.getByText("In-app chat")).toBeTruthy();
    fireEvent.press(screen.getAllByRole("switch", { checked: true })[0]);
    expect(onChange).toHaveBeenCalledWith({ allowCalls: false });
  });

  it("opens the number screen from Another number", () => {
    const onAnotherNumber = vi.fn();
    const { screen } = renderStep({
      payload: { contactPhone: "+99365000000", allowCalls: true, allowChat: true },
      accountPhone: "+99365000000",
      confirmedPhones: [],
      onAnotherNumber,
    });

    fireEvent.press(screen.getByLabelText("Another number"));
    expect(onAnotherNumber).toHaveBeenCalled();
  });
});
