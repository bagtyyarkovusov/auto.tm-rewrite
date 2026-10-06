import { describe, expect, it } from "vitest";

import { contactPhoneReturnHref } from "./contactPhoneReturn";

const phone = { confirmedContactPhone: "+99361000001" };

describe("contactPhoneReturnHref", () => {
  it("returns to the Sell wizard with the confirmed number", () => {
    expect(contactPhoneReturnHref("/(tabs)/sell", "listing", phone)).toEqual({
      pathname: "/(tabs)/sell",
      params: phone,
    });
  });

  it("returns to the Listing's edit screen with the confirmed number", () => {
    expect(
      contactPhoneReturnHref("/listings/abc-1/edit", "listing", phone),
    ).toEqual({
      pathname: "/listings/[id]/edit",
      params: { id: "abc-1", ...phone },
    });
  });

  it("returns a relist to My listings or to Listing detail", () => {
    expect(contactPhoneReturnHref("/listings/manage", "relist")).toBe(
      "/listings/manage",
    );
    expect(contactPhoneReturnHref("/(public)/listings/abc-1", "relist")).toEqual({
      pathname: "/(public)/listings/[id]",
      params: { id: "abc-1" },
    });
  });

  it("falls back by purpose when the param is missing or names another screen", () => {
    expect(contactPhoneReturnHref(undefined, "relist")).toBe("/listings/manage");
    expect(contactPhoneReturnHref(undefined, "listing")).toBe("/(tabs)/sell");
    expect(contactPhoneReturnHref("/profile", "listing", phone)).toEqual({
      pathname: "/(tabs)/sell",
      params: phone,
    });
    expect(contactPhoneReturnHref("https://example.com", "relist")).toBe(
      "/listings/manage",
    );
  });
});
