import type { ListingsSchemas } from "@auto-tm/contracts";
import { StyleSheet } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderMobile, fireEvent } from "../../../test/render";
import { useAuthIntentStore } from "../../auth/intentStore";

import { ListingLargeCard, ListingLargeCardSkeleton, formatListingDate } from "./ListingLargeCard";
vi.mock("../../api/client", () => ({ apiClient: { post: vi.fn(), delete: vi.fn() }, ApiError: class ApiError extends Error {} }));
const listing: ListingsSchemas.ListingSummary = { id: "listing", sellerId: "seller", status: "active", brandId: "brand", modelId: "model", year: 2018, priceAmount: 2, priceCurrency: "USD", displayPriceTmt: 70000, photoKeys: ["one.jpg", "two.jpg"], photoCount: 7, cityId: "city", publishedAt: "2026-09-30T04:00:00.000Z" };
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T12:00:00Z")); useAuthIntentStore.setState({ intent: null, replayAction: null, replayReturnTo: null }); });
afterEach(() => vi.useRealTimers());
describe("Large Listing card", () => {
  it("shows the approved two-photo grid, TMT price, one-line title and city/date", () => {
    const onPress = vi.fn();
    const view = renderMobile(<ListingLargeCard listing={{ ...listing, mileageKm: 0 }} brandName="Toyota" modelName="Camry" cityName="Ashgabat" transmissionName="Automatic" engineTypeName="Petrol" isAuthenticated={false} returnTo="/(tabs)/(search)/results" onPress={onPress} />);
    expect(view.getAllByTestId("listing-photo")).toHaveLength(2); expect(view.getByLabelText("Photos: 7")).toBeTruthy();
    expect(view.getAllByTestId("listing-photo").map((frame) => StyleSheet.flatten(frame.props.style).flex)).toEqual([62, 38]);
    expect(view.getByText("70,000 TMT")).toBeTruthy(); expect(view.queryByText(/USD/)).toBeNull();
    expect(view.getByText("Toyota Camry, 2018").props.numberOfLines).toBe(1);
    expect(view.getByText("0 km · Automatic · Petrol")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: /Toyota Camry, 2018/ })); expect(onPress).toHaveBeenCalledWith("listing");
    fireEvent.press(view.getByRole("button", { name: "Favorite" })); expect(useAuthIntentStore.getState().intent).toEqual({ returnTo: "/(tabs)/(search)/results", action: { kind: "favorite", listingId: "listing" } });
  });
  it.each([["en", "Photos: 2"], ["ru", "Фото: 2"], ["tk", "Suratlar: 2"]])("names the photo count without plural-dependent words in %s", (locale, label) => {
    const view = renderMobile(<ListingLargeCard listing={{ ...listing, photoCount: 2 }} isAuthenticated={false} returnTo="/(tabs)/(search)/results" onPress={vi.fn()} />, { locale });
    expect(view.getByLabelText(label)).toBeTruthy();
  });
  it("drops absent spec parts without separators or UUID placeholders", () => {
    const view = renderMobile(<ListingLargeCard listing={listing} brandName="Toyota" modelName="Camry" engineTypeName="Petrol" isAuthenticated={null} returnTo="/(tabs)/(search)/results" onPress={vi.fn()} />);
    expect(view.getByText("Petrol")).toBeTruthy(); expect(view.queryByText(/undefined|null| · Petrol/)).toBeNull();
    expect(view.queryByText(/Phone verified/)).toBeNull();
  });
  it("shows a single wide photo, with no second frame and no count, for a one-photo Listing", () => {
    const view = renderMobile(<ListingLargeCard listing={{ ...listing, photoKeys: ["one.jpg"], photoCount: 1 }} isAuthenticated={false} returnTo="/(tabs)/(search)/results" onPress={vi.fn()} />);
    const frames = view.getAllByTestId("listing-photo");
    expect(frames).toHaveLength(1); expect(StyleSheet.flatten(frames[0]?.props.style).flex).toBe(1);
    expect(view.queryByText(/No photo/)).toBeNull(); expect(view.queryByLabelText(/Photos:/)).toBeNull();
  });
  it("shows one No photos frame and no count when the Listing has no photos", () => {
    const view = renderMobile(<ListingLargeCard listing={{ ...listing, photoKeys: [], photoCount: 0 }} isAuthenticated={false} returnTo="/(tabs)/(search)/results" onPress={vi.fn()} />);
    expect(view.getAllByTestId("listing-photo")).toHaveLength(1); expect(view.getByText("No photos")).toBeTruthy();
    expect(view.queryByLabelText(/Photos:/)).toBeNull();
  });
  it("shows a single photo skeleton that matches the wide frame", () => {
    const view = renderMobile(<ListingLargeCardSkeleton />);
    expect(view.getAllByTestId("listing-photo-skeleton")).toHaveLength(1);
  });
  it.each([["2026-09-30T12:00:00Z", "Today"], ["2026-09-29T12:00:00Z", "Yesterday"], ["2026-09-12T12:00:00Z", "12 Sep"], ["2025-03-03T12:00:00Z", "3 Mar 2025"]])("formats publication %s as %s", (date, expected) => {
    const view = renderMobile(<ListingLargeCard listing={{ ...listing, publishedAt: date }} cityName="Ashgabat" isAuthenticated={false} returnTo="/(tabs)/(search)/results" onPress={vi.fn()} />);
    expect(view.getByText(`Ashgabat · ${expected}`)).toBeTruthy();
    expect(formatListingDate(date, "en", (key) => ({ resultsToday: "Today", resultsYesterday: "Yesterday" })[key] ?? key, new Date("2026-09-30T12:00:00Z"))).toBe(expected);
  });
});
