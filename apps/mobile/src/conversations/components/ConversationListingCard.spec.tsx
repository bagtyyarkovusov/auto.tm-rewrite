import { describe, expect, it } from "vitest";

import { fireEvent, renderMobile, routerMock } from "../../../test/render";

import { ConversationListingCard } from "./ConversationListingCard";

const listing = {
  id: "00000000-0000-4000-8000-0000000000a1",
  brandId: "00000000-0000-4000-8000-0000000000d1",
  modelId: "00000000-0000-4000-8000-0000000000d2",
  year: 2018,
  displayPriceTmt: 285000,
  priceCurrency: "USD" as const,
  coverMediaKey: "listings/a.jpg",
  status: "active" as const,
};

describe("ConversationListingCard", () => {
  it("shows a 56 pt thumbnail, year Brand Model and the price in TMT, and opens the Listing", () => {
    const screen = renderMobile(
      <ConversationListingCard listing={listing} brandName="Toyota" modelName="Camry" />,
    );

    expect(screen.getByText("2018 Toyota Camry")).toBeTruthy();
    expect(screen.getByText("285,000 TMT")).toBeTruthy();
    expect(screen.getByTestId("conversation-listing-thumbnail").props.className).toContain("h-14 w-14");
    expect(screen.getByTestId("conversation-listing-chevron")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Open: 2018 Toyota Camry, 285,000 TMT" }));
    expect(routerMock.push).toHaveBeenCalledWith(`/(public)/listings/${listing.id}`);
  });

  it("never shows raw catalog IDs while names load", () => {
    const screen = renderMobile(<ConversationListingCard listing={listing} />);

    expect(screen.getByText("2018")).toBeTruthy();
    expect(screen.queryByText(new RegExp(listing.brandId))).toBeNull();
  });

  it("keeps today's status text for a non-active Listing", () => {
    const screen = renderMobile(
      <ConversationListingCard listing={{ ...listing, status: "sold" }} brandName="Toyota" modelName="Camry" />,
    );
    expect(screen.getByText("Sold")).toBeTruthy();
  });

  it("shows the unavailable label and is not tappable without a Listing", () => {
    const screen = renderMobile(<ConversationListingCard listing={null} />);

    expect(screen.getByText("Listing unavailable")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is localized when unavailable", () => {
    const screen = renderMobile(<ConversationListingCard listing={null} />, { locale: "tk" });
    expect(screen.getByText("Bildiriş elýeterli däl")).toBeTruthy();
  });

  it("shows a skeleton while loading", () => {
    const screen = renderMobile(<ConversationListingCard loading />);
    expect(screen.getByTestId("conversation-listing-skeleton")).toBeTruthy();
  });
});
