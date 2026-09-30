import { expect, it } from "vitest";

import { renderMobile } from "../../../test/render";
import { fixture } from "../../../test/fixtures/listing";

import { SellerBlock } from "./SellerBlock";

it("shows real seller identity and city/place without contact-phone badges", () => {
  const screen = renderMobile(
    <SellerBlock
      seller={fixture().seller}
      cityName="Ashgabat"
      locationText="Parahat 7"
    />,
  );
  expect(screen.getByText("Merdan")).toBeTruthy();
  expect(screen.getByText("Private seller")).toBeTruthy();
  expect(screen.getByText("On AutoTM since January 2024")).toBeTruthy();
  expect(screen.getByText("Ashgabat · Parahat 7")).toBeTruthy();
  expect(screen.queryByText(/verified|inspection|dealer/i)).toBeNull();
  screen.rerender(
    <SellerBlock seller={{ ...fixture().seller, displayName: " " }} />,
  );
  expect(screen.getByText("Private seller")).toBeTruthy();
  expect(screen.queryByText("Ashgabat · Parahat 7")).toBeNull();
});
