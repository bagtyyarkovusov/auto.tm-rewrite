import { beforeEach, describe, expect, it, vi } from "vitest";

import { RelistContactPhoneSheet } from "./RelistContactPhoneSheet";

import { fireEvent, renderMobile, routerMock } from "../../../test/render";

const detail = vi.hoisted(
  () => ({ data: undefined as { contactPhone?: string } | undefined }),
);
vi.mock("../../api/listings/useListingDetail", () => ({
  useListingDetail: () => ({ data: detail.data }),
}));

function renderSheet(open = true, onOpenChange = vi.fn()) {
  const screen = renderMobile(
    <RelistContactPhoneSheet
      open={open}
      listingId="listing-1"
      returnPathname="/listings/manage"
      onOpenChange={onOpenChange}
    />,
  );
  return { screen, onOpenChange };
}

describe("RelistContactPhoneSheet", () => {
  beforeEach(() => {
    detail.data = { contactPhone: "+99362000002" };
  });

  it("offers Send code and Cancel for the Listing's own number, and no other number", () => {
    const { screen } = renderSheet();

    expect(screen.getByText("Confirm the contact phone")).toBeTruthy();
    expect(
      screen.getByText(
        "+99362000002 was confirmed more than 7 days ago. Confirm it again to relist.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send code" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.queryByText("Another number")).toBeNull();
  });

  it("opens the number screen prefilled with the Listing's number for a relist", () => {
    const { screen, onOpenChange } = renderSheet();

    fireEvent.press(screen.getByRole("button", { name: "Send code" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: "/listings/contact-phone",
      params: {
        phone: "+99362000002",
        reconfirm: "1",
        purpose: "relist",
        listingId: "listing-1",
        returnPathname: "/listings/manage",
      },
    });
  });

  it("closes on Cancel without navigating", () => {
    const { screen, onOpenChange } = renderSheet();

    fireEvent.press(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("keeps Send code shut until the Listing's number loads", () => {
    detail.data = undefined;
    const { screen } = renderSheet();

    const sendCode = screen.getByRole("button", { name: "Send code" });
    expect(sendCode.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(sendCode);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("stays closed when nothing was refused", () => {
    const { screen } = renderSheet(false);

    expect(screen.queryByText("Confirm the contact phone")).toBeNull();
  });
});
