import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderMobile, fireEvent, routeParams, routerMock } from "../render";
import ResultsScreen from "../../app/(tabs)/(search)/results";

const state = vi.hoisted(() => ({
  feed: vi.fn(), count: vi.fn(), pending: false, error: false, empty: false,
}));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
vi.mock("react-native", async (original) => {
  const native = await original<typeof import("react-native")>();
  const React = await import("react");
  return { ...native, RefreshControl: native.View,
    FlatList: ({ data = [], renderItem, ListHeaderComponent, ListEmptyComponent, ...props }: Record<string, any>) => React.createElement(native.ScrollView, props,
      ListHeaderComponent, data.map((item: any, index: number) => React.createElement(React.Fragment, { key: item.id }, renderItem({ item, index }))), data.length ? null : ListEmptyComponent),
  };
});
vi.mock("react-native-reanimated", async () => {
  const native = await import("react-native");
  return { default: { View: native.View }, useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(), withTiming: (value: number) => value };
});
vi.mock("../../src/api/client", () => ({ apiClient: { get: vi.fn() }, ApiError: class ApiError extends Error {} }));
vi.mock("../../src/listings/search/FilterSheet", () => ({ FilterSheet: () => null }));
vi.mock("../../src/auth/useViewer", () => ({ useViewer: () => null }));
vi.mock("../../src/listings/feed/useFeedFavoriteReplay", () => ({ useFeedFavoriteReplay: vi.fn() }));
vi.mock("../../src/listings/useListingFavorite", () => ({ useListingFavorite: () => ({ favorited: false, pending: false, toggle: vi.fn() }) }));
vi.mock("../../src/listings/feed/useFeedCatalogMaps", () => ({ useFeedCatalogMaps: () => ({ brandName: () => "Toyota", modelName: (id: string) => ({ camry: "Camry", corolla: "Corolla", rav4: "RAV4" })[id], cityName: () => "Ashgabat" }) }));
vi.mock("../../src/api/catalog/useModels", () => ({ useModels: () => ({ data: { items: [{ id: "camry", name: "Camry" }, { id: "corolla", name: "Corolla" }, { id: "rav4", name: "RAV4" }] } }) }));
vi.mock("../../src/api/catalog/useTransmissions", () => ({ useTransmissions: () => ({ data: { items: [{ id: "auto", name: "Automatic" }] } }) }));
vi.mock("../../src/api/catalog/useEngineTypes", () => ({ useEngineTypes: () => ({ data: { items: [{ id: "petrol", name: "Petrol" }] } }) }));
const listing = {
  id: "listing-1", sellerId: "seller", status: "active", brandId: "toyota", modelId: "camry", year: 2018,
  priceAmount: 1, priceCurrency: "USD", displayPriceTmt: 70000, photoKeys: ["one.jpg", "two.jpg"], photoCount: 7,
  mileageKm: 80000, transmissionId: "auto", engineTypeId: "petrol", cityId: "ashgabat", publishedAt: "2026-09-30T04:00:00.000Z",
};
vi.mock("../../src/api/listings/useListings", () => ({ useListings: (options: unknown) => {
  state.feed(options); return { data: { pages: [{ items: state.empty ? [] : [listing] }] }, isPending: state.pending,
    isError: state.error, error: new Error("Network request failed"), refetch: vi.fn(), isRefetching: false,
    fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false };
} }));
vi.mock("../../src/api/listings/useListingCount", () => ({ useListingCount: (options: unknown) => {
  state.count(options); return { data: { totalMatching: state.empty ? 0 : 12, priceMinTmt: state.empty ? null : 70000, priceMaxTmt: state.empty ? null : 120000 }, isPending: false };
} }));

beforeEach(() => { state.feed.mockClear(); state.count.mockClear(); state.pending = false; state.error = false; state.empty = false; });
const sorts = [
  ["Newest first", "newest"], ["Cheapest first", "price_asc"], ["Most expensive first", "price_desc"],
  ["Newest year first", "year_desc"], ["Oldest year first", "year_asc"], ["Lowest mileage first", "mileage_asc"],
];
describe("Results approved behavior", () => {
  it("shows the full feed, count, TMT price range and current sort without a brand", () => {
    const view = renderMobile(<ResultsScreen />);
    expect(view.getByText("12 listings")).toBeTruthy();
    expect(view.getByText("70,000 – 120,000 TMT")).toBeTruthy();
    expect(view.getByText("Newest first")).toBeTruthy();
    expect(state.feed).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { sort: "newest" } }));
  });
  it.each(sorts)("choosing %s reloads Results in place", (label, sort) => {
    const view = renderMobile(<ResultsScreen />);
    fireEvent.press(view.getByLabelText("Sort"));
    expect(view.getAllByRole("radio")).toHaveLength(6);
    fireEvent.press(view.getByRole("radio", { name: label }));
    expect(state.feed).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { sort } }));
    expect(state.count).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { sort } }));
    expect(routerMock.setParams).toHaveBeenLastCalledWith(expect.objectContaining({ sort }));
    expect(routerMock.push).not.toHaveBeenCalled();
  });
  it("All / New / Used commits condition in place and keeps it in the route", () => {
    const view = renderMobile(<ResultsScreen />);
    for (const [label, condition] of [["New", "new"], ["Used", "used"], ["All", undefined]] as const) {
      fireEvent.press(view.getByRole("button", { name: `${label} Condition` }));
      expect(state.feed.mock.lastCall?.[0].filters.condition).toBe(condition);
      expect(routerMock.push).not.toHaveBeenCalled();
    }
  });
  it("opens the selected models and clears brand plus models while keeping other filters", () => {
    Object.assign(routeParams, { brandId: "toyota", modelIds: "camry,corolla,rav4", cityId: "ashgabat" });
    const view = renderMobile(<ResultsScreen />);
    fireEvent.press(view.getByRole("button", { name: "Toyota Camry, +2, Change models" }));
    expect(routerMock.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/(tabs)/(search)/models", params: expect.objectContaining({ brandId: "toyota", modelIds: "camry,corolla,rav4" }) }));
    fireEvent.press(view.getByLabelText("Clear brand and models"));
    expect(state.feed).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { sort: "newest", cityId: "ashgabat" } }));
  });
  it("retains route filters and sort on entry for deep links and Back", () => {
    Object.assign(routeParams, { brandId: "toyota", modelIds: "camry,corolla", condition: "used", priceMin: "70000", yearMax: "2020", sort: "year_asc" });
    renderMobile(<ResultsScreen />);
    expect(state.feed).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { brandId: "toyota", modelIds: ["camry", "corolla"], condition: "used", priceMin: 70000, yearMax: 2020, sort: "year_asc" } }));
    expect(routerMock.setParams).not.toHaveBeenCalledWith(expect.objectContaining({ brandId: undefined }));
  });
  it("keeps city, price and year chips in no-match and removes complete ranges", () => {
    state.empty = true;
    Object.assign(routeParams, { cityId: "ashgabat", priceMin: "70000", priceMax: "120000", yearMin: "2018", yearMax: "2020" });
    const view = renderMobile(<ResultsScreen />);
    expect(view.getByText("No listings match")).toBeTruthy();
    expect(view.getByLabelText("Filters, 3 active filters")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Remove price filter"));
    expect(state.feed).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { sort: "newest", cityId: "ashgabat", yearMin: 2018, yearMax: 2020 } }));
    fireEvent.press(view.getByLabelText("Remove year filter"));
    fireEvent.press(view.getByLabelText("Remove city filter"));
    expect(state.feed).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { sort: "newest" } }));
  });
  it("shows large-card loading and retains filters on an offline error", () => {
    state.pending = true;
    const view = renderMobile(<ResultsScreen />);
    expect(view.getByLabelText("Loading listings")).toBeTruthy();
    state.pending = false; state.error = true;
    view.rerender(<ResultsScreen />);
    expect(view.getByLabelText("Filters, 0 active filters")).toBeTruthy();
    expect(view.getByText("Retry")).toBeTruthy();
  });
  it("shows brand-only selection and the approved large-card content", () => {
    Object.assign(routeParams, { brandId: "toyota" });
    const view = renderMobile(<ResultsScreen />);
    expect(view.getByText("All models · choose models")).toBeTruthy();
    expect(view.getByText("Toyota Camry, 2018")).toBeTruthy();
    expect(view.getByText("80,000 km · Automatic · Petrol")).toBeTruthy();
    expect(view.getByText("Ashgabat · Today")).toBeTruthy();
    expect(view.getByLabelText("7 photos")).toBeTruthy();
    expect(view.getAllByTestId("listing-photo")).toHaveLength(2);
    fireEvent.press(view.getByRole("button", { name: /Toyota Camry, 2018/ }));
    expect(routerMock.push).toHaveBeenCalledWith("/(public)/listings/listing-1");
  });
});

describe("Results large card replacement", () => {
  it("renders title and specs in the approved order", () => {
    const view = renderMobile(<ResultsScreen />);
    expect(view.getByText("Toyota Camry, 2018")).toBeTruthy();
    expect(view.getByText("80,000 km · Automatic · Petrol")).toBeTruthy();
  });
  it("shows two fixed photos and total photo count", () => {
    const view = renderMobile(<ResultsScreen />);
    expect(view.getAllByTestId("listing-photo")).toHaveLength(2);
    expect(view.getByLabelText("7 photos")).toBeTruthy();
  });
  it("shows city and a relative publication date", () => {
    const view = renderMobile(<ResultsScreen />);
    expect(view.getByText("Ashgabat · Today")).toBeTruthy();
  });
  it("offers an accessible favorite button on the card", () => {
    const view = renderMobile(<ResultsScreen />);
    expect(view.getByRole("button", { name: "Favorite" })).toBeTruthy();
  });
});
