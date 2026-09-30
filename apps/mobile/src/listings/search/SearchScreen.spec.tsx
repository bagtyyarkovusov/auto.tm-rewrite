import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react-native";

import SearchRoute from "../../../app/(tabs)/(search)/search";
import { fireEvent, renderMobile, routerMock } from "../../../test/render";

import { useRecentChoicesStore } from "./recentSearches";

const get = vi.fn();
vi.mock("../../api/client", () => ({ apiClient: { get: (...args: unknown[]) => get(...args) }, ApiError: class extends Error {} }));
vi.mock("@react-navigation/native", () => ({ DefaultTheme: { colors: {} }, DarkTheme: { colors: {} } }));
vi.mock("react-native", async (importOriginal) => {
  const native = await importOriginal<typeof import("react-native")>();
  return { ...native, KeyboardAvoidingView: native.View, Keyboard: { dismiss: vi.fn() } };
});
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined),
} }));

const choice = { brandId: "toyota", brandName: "Toyota", modelIds: ["camry"], modelNames: ["Camry"] };
const camry = { kind: "model", brandId: "toyota", modelId: "camry", label: "Camry", brandLabel: "Toyota" };
let searchResponse: unknown;
let searchError = false;
let waitSearch = false;

function setup() {
  return renderMobile(<SearchRoute />);
}
function type(screen: ReturnType<typeof setup>, text: string) {
  fireEvent.changeText(screen.getByLabelText("Search brand or model"), text);
}
async function search(screen: ReturnType<typeof setup>, text: string) {
  type(screen, text);
  await waitFor(() => expect(get.mock.calls.some(([url]) => String(url).includes(`q=${encodeURIComponent(text)}`))).toBe(true));
}

describe("Search route", () => {
  beforeEach(() => {
    useRecentChoicesStore.getState().resetForTests();
    searchResponse = { results: [camry] };
    searchError = false;
    waitSearch = false;
    get.mockReset();
    get.mockImplementation((url: string) => {
      if (url.startsWith("/catalog/brands")) return Promise.resolve({ items: [
        { id: "toyota", name: "Toyota", slug: "toyota" }, { id: "lexus", name: "Lexus", slug: "lexus" },
      ], nextCursor: null, hasMore: false });
      if (url.startsWith("/listings/filter-options/brands")) return Promise.resolve({ items: [
        { brandId: "toyota", totalMatching: 40 }, { brandId: "lexus", totalMatching: 5 },
      ] });
      if (url.startsWith("/catalog/search")) {
        if (waitSearch) return new Promise(() => undefined);
        return searchError ? Promise.reject(new Error("offline")) : Promise.resolve(searchResponse);
      }
      throw new Error(`unexpected ${url}`);
    });
  });

  it("shows Popular before typing, and omits empty Recent", async () => {
    const screen = setup();
    expect(await screen.findByText("Popular")).toBeTruthy();
    expect(screen.getByText("Toyota")).toBeTruthy();
    expect(screen.queryByText("Recent")).toBeNull();
    expect(get.mock.calls.some(([url]) => String(url).includes("/catalog/search"))).toBe(false);
  });

  it("shows saved Recent, opens its confirmed choice, and clears it", async () => {
    await useRecentChoicesStore.getState().record(choice);
    const screen = setup();
    expect(await screen.findByText("Recent")).toBeTruthy();
    fireEvent.press(screen.getByText("Toyota Camry"));
    expect(routerMock.replace).toHaveBeenCalledWith({ pathname: "/(tabs)/(search)/results", params: { brandId: "toyota", modelIds: "camry" } });
    fireEvent.press(screen.getByLabelText("Clear recent"));
    await waitFor(() => expect(screen.queryByText("Recent")).toBeNull());
  });

  it("renders combined brand/model catalog matches for Cyrillic and records a confirmed model", async () => {
    searchResponse = { results: [{ kind: "brand", brandId: "toyota", label: "Toyota" }, camry] };
    const screen = setup();
    await search(screen, "камри");
    expect(await screen.findByText("Toyota Camry")).toBeTruthy();
    expect(screen.getByText("Toyota")).toBeTruthy();
    fireEvent.press(screen.getByText("Toyota Camry"));
    expect(routerMock.replace).toHaveBeenCalledWith({ pathname: "/(tabs)/(search)/results", params: { brandId: "toyota", modelIds: "camry" } });
    await waitFor(() => expect(useRecentChoicesStore.getState().items).toEqual([choice]));
  });

  it.each([
    ["camry 2018", { results: [camry], yearFrom: 2018, yearTo: 2018 }, "Toyota Camry", { brandId: "toyota", modelIds: "camry", yearMin: "2018", yearMax: "2018" }],
    ["2018", { results: [], yearFrom: 2018, yearTo: 2018 }, "All cars, 2018", { yearMin: "2018", yearMax: "2018" }],
    ["лексус 2014-2019", { results: [{ kind: "brand", brandId: "lexus", label: "Lexus" }], yearFrom: 2014, yearTo: 2019 }, "Lexus", { brandId: "lexus", yearMin: "2014", yearMax: "2019" }],
  ])("passes API years for %s without parsing in the screen", async (text, response, label, params) => {
    searchResponse = response;
    const screen = setup();
    await search(screen, text);
    fireEvent.press(await screen.findByText(label));
    expect(routerMock.replace).toHaveBeenCalledWith({ pathname: "/(tabs)/(search)/results", params });
    if (text === "2018") expect(useRecentChoicesStore.getState().items).toEqual([]);
  });

  it("opens the whole brand and records brand-only Recent", async () => {
    searchResponse = { results: [{ kind: "brand", brandId: "lexus", label: "Lexus" }] };
    const screen = setup();
    await search(screen, "lexus");
    fireEvent.press(await screen.findByText("Lexus"));
    expect(routerMock.replace).toHaveBeenCalledWith({ pathname: "/(tabs)/(search)/results", params: { brandId: "lexus" } });
    await waitFor(() => expect(useRecentChoicesStore.getState().items[0]).toEqual({ brandId: "lexus", brandName: "Lexus", modelIds: [], modelNames: [] }));
  });

  it("shows no match only after response and keeps the query editable and clearable", async () => {
    searchResponse = { results: [] };
    const screen = setup();
    await search(screen, "zzz");
    expect(await screen.findByText('No brand or model matches "zzz"')).toBeTruthy();
    expect(screen.getByLabelText("Search brand or model").props.value).toBe("zzz");
    type(screen, "камри");
    expect(screen.getByLabelText("Search brand or model").props.value).toBe("камри");
    fireEvent.press(screen.getByLabelText("Clear search"));
    expect(await screen.findByText("Popular")).toBeTruthy();
  });

  it("renders loading while the response is pending, without a false no match", async () => {
    waitSearch = true;
    const screen = setup();
    await search(screen, "camry");
    expect(screen.getByLabelText("Loading...")).toBeTruthy();
    expect(screen.queryByText('No brand or model matches "camry"')).toBeNull();
  });

  it("shows offline retry and recovers without losing the query", async () => {
    searchError = true;
    const screen = setup();
    await search(screen, "camry");
    const retry = await screen.findByText("Retry");
    searchError = false;
    fireEvent.press(retry);
    expect(await screen.findByText("Toyota Camry")).toBeTruthy();
    expect(screen.getByLabelText("Search brand or model").props.value).toBe("camry");
  });

  it("debounces typing and blocks old result/year taps before and during a new request", async () => {
    searchResponse = { results: [camry], yearFrom: 2018, yearTo: 2018 };
    const screen = setup();
    await search(screen, "camry 2018");
    const oldRow = await screen.findByText("Toyota Camry");
    const calls = get.mock.calls.length;
    waitSearch = true;
    type(screen, "lexus 2019");
    fireEvent.press(oldRow);
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(get.mock.calls.length).toBe(calls);
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(calls));
    const stale = screen.queryByText("Toyota Camry");
    if (stale) fireEvent.press(stale);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("opens all filters through Results until Search parameters lands", () => {
    const screen = setup();
    fireEvent.press(screen.getByText("All filters"));
    expect(routerMock.replace).toHaveBeenCalledWith({ pathname: "/(tabs)/(search)/results", params: { openFilters: "1" } });
  });

  it("requests keyboard focus on entry and Back returns to Home", () => {
    const screen = setup();
    expect(screen.getByLabelText("Search brand or model").props.autoFocus).toBe(true);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(routerMock.replace).toHaveBeenCalledWith("/(tabs)/(search)");
  });
});
