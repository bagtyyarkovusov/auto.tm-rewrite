import { beforeEach, expect, it, vi } from "vitest";

import type * as ClientModule from "../../api/client";
import { ApiError } from "../../api/client";
import { renderMobile, fireEvent, act, routerMock } from "../../../test/render";

import { OwnerActions } from "./OwnerActions";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof ClientModule>()),
  apiClient: api,
}));
beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.delete.mockReset();
});

it("keeps Edit and Mark sold in the sticky bar and navigates Edit", () => {
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="active" mode="bar" />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Edit" }));
  expect(routerMock.push).toHaveBeenCalledWith("/listings/listing-373/edit");
  expect(screen.getByRole("button", { name: "Mark as sold" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Archive listing" })).toBeNull();
  screen.rerender(
    <OwnerActions listingId="listing-373" status="sold" mode="bar" />,
  );
  expect(screen.queryByRole("button", { name: "Mark as sold" })).toBeNull();
});
it.each([
  ["active", ["Remove from sale", "Delete"]],
  ["archived", ["Relist", "Delete"]],
  ["sold", ["Delete"]],
] as const)(
  "puts the shared My listings action names, and no Share, in overflow for %s",
  (status, expected) => {
    const screen = renderMobile(
      <OwnerActions listingId="listing-373" status={status} mode="menu" />,
    );
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "More options" }));
    for (const name of ["Remove from sale", "Relist", "Delete"]) {
      expect(screen.queryByRole("button", { name }) !== null).toBe((expected as readonly string[]).includes(name));
    }
    for (const old of ["Archive listing", "Republish listing", "Share"]) {
      expect(screen.queryByRole("button", { name: old })).toBeNull();
    }
  },
);
it("shows no overflow for a blocked Listing, which allows no owner action", () => {
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="banned" mode="menu" />,
  );
  expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
});
it("asks with the shared copy, without the buyer question", () => {
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="active" mode="bar" />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Mark as sold" }));
  expect(screen.getByText("Mark as sold?")).toBeTruthy();
  expect(screen.getByText("Buyers will see it as Sold. A sold Listing cannot be put back on sale.")).toBeTruthy();
  expect(screen.queryByText(/buyer from AutoTM/)).toBeNull();
});
it("names the overflow actions in Russian", () => {
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="archived" mode="menu" />,
    { locale: "ru" },
  );
  fireEvent.press(screen.getByRole("button", { name: "Другие действия" }));
  expect(screen.getByRole("button", { name: "Вернуть в продажу" })).toBeTruthy();
});
it("requires confirmation before Mark sold, supports cancel and exposes failure", async () => {
  api.post.mockRejectedValue(new Error("offline"));
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="active" mode="bar" />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Mark as sold" }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Cancel"));
  expect(screen.queryByText("Confirm")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Mark as sold" }));
  await act(async () => {
    fireEvent.press(screen.getByText("Confirm"));
  });
  expect(api.post).toHaveBeenCalledWith(
    "/listings/listing-373/sold",
    {},
    expect.anything(),
  );
  expect(
    await screen.findByText(
      "Action failed. Pull down to refresh or try again.",
    ),
  ).toBeTruthy();
});

it("opens the confirm sheet when a relist answer says the number needs a new code", async () => {
  api.post.mockRejectedValue(new ApiError("CONTACT_PHONE_NOT_CONFIRMED", 409));
  api.get.mockResolvedValue({ contactPhone: "+99362000002" });
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="archived" mode="menu" />,
  );
  fireEvent.press(screen.getByRole("button", { name: "More options" }));
  fireEvent.press(screen.getByRole("button", { name: "Relist" }));
  await act(async () => {
    fireEvent.press(screen.getByText("Confirm"));
  });
  expect(await screen.findByText("Confirm the contact phone")).toBeTruthy();
  expect(
    await screen.findByText(
      "+99362000002 was confirmed more than 7 days ago. Confirm it again to relist.",
    ),
  ).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Send code" }));
  expect(routerMock.push).toHaveBeenCalledWith({
    pathname: "/listings/contact-phone",
    params: {
      phone: "+99362000002",
      reconfirm: "1",
      purpose: "relist",
      listingId: "listing-373",
      returnPathname: "/(public)/listings/listing-373",
    },
  });
});
it("tells the seller to add a phone through Edit when a relist answer says one is required", async () => {
  api.post.mockRejectedValue(new ApiError("CONTACT_PHONE_REQUIRED", 409));
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="archived" mode="menu" />,
  );
  fireEvent.press(screen.getByRole("button", { name: "More options" }));
  fireEvent.press(screen.getByRole("button", { name: "Relist" }));
  await act(async () => {
    fireEvent.press(screen.getByText("Confirm"));
  });
  expect(
    await screen.findByText(
      "This Listing has no contact phone. Add one through Edit, then relist.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Confirm the contact phone")).toBeNull();
});
it("clears the add-a-phone hint when the next action starts", async () => {
  api.post.mockRejectedValueOnce(new ApiError("CONTACT_PHONE_REQUIRED", 409));
  const screen = renderMobile(
    <OwnerActions listingId="listing-373" status="archived" mode="menu" />,
  );
  fireEvent.press(screen.getByRole("button", { name: "More options" }));
  fireEvent.press(screen.getByRole("button", { name: "Relist" }));
  await act(async () => {
    fireEvent.press(screen.getByText("Confirm"));
  });
  const hint = "This Listing has no contact phone. Add one through Edit, then relist.";
  expect(await screen.findByText(hint)).toBeTruthy();

  // The seller added a phone through Edit and relists again; this time it works.
  api.post.mockResolvedValueOnce({
    id: "550e8400-e29b-41d4-a716-446655440000",
    status: "active",
    publishedAt: "2026-10-05T12:00:00.000Z",
  });
  fireEvent.press(screen.getByRole("button", { name: "Relist" }));
  await act(async () => {
    fireEvent.press(screen.getByText("Confirm"));
  });

  expect(screen.queryByText(hint)).toBeNull();
});

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
