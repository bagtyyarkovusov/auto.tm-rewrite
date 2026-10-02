import type { ListingsSchemas } from "@auto-tm/contracts";
import { useFocusEffect } from "expo-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderMobile, act, fireEvent, routerMock, within } from "../render";
import FavoritesScreen from "../../app/(tabs)/favorites";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { useHideSoldStore } from "../../src/listings/favorites/useFavoritesView";
import { HOME_HREF } from "../../src/navigation/homeHref";

import { ToastProvider } from "@/components/ui/toast";

type Favorite = ListingsSchemas.FavoriteListingSummary;
type Response = ListingsSchemas.MyFavoritesResponse;

const api = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
const state = vi.hoisted(() => ({ auth: true as boolean | null }));
vi.mock("../../src/api/client", () => ({
  apiClient: { get: api.get, delete: api.delete, post: vi.fn() },
  ApiError: class ApiError extends Error { constructor(public code: string, public status: number) { super(code); } },
}));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: state.auth, phone: "" }) }));
vi.mock("../../src/auth/useViewer", () => ({ useViewer: () => ({ userId: "me" }) }));
vi.mock("../../src/conversations/useOpenListingConversation", () => ({
  useOpenListingConversation: () => ({ open: vi.fn(), retry: vi.fn(), isPending: false, error: null }),
}));
vi.mock("../../src/listings/feed/useFeedCatalogMaps", () => ({ useFeedCatalogMaps: () => ({
  brandName: () => "Toyota", brandLogoUrl: () => undefined, cityName: () => "Ashgabat",
  modelName: (id: string) => ({ camry: "Camry", prado: "Prado", rav4: "RAV4", corolla: "Corolla" })[id],
}) }));
vi.mock("../../src/api/catalog/useTransmissions", () => ({ useTransmissions: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useEngineTypes", () => ({ useEngineTypes: () => ({ data: { items: [] } }) }));

function favorite(id: string, modelId: string, status: Favorite["status"] = "active"): Favorite {
  return {
    id, sellerId: "seller", status, brandId: "toyota", modelId, year: 2018, priceAmount: 1, priceCurrency: "TMT",
    displayPriceTmt: 100000, photoKeys: [], photoCount: 0, cityId: "city", publishedAt: "2026-09-30T04:00:00.000Z",
    contactPhone: "+99365000000", allowCalls: true, allowChat: true, isFavorited: true,
  };
}
const camry = favorite("camry-1", "camry");
const prado = favorite("prado-1", "prado", "sold");
const rav4 = favorite("rav4-1", "rav4");
const corolla = favorite("corolla-1", "corolla", "archived");

/** Server answers by `activeOnly`; each entry is the list of pages for that position. */
let server: { active: Response[]; all: Response[] };
function page(items: Favorite[], counts: Response["counts"], nextCursor: string | null = null): Response {
  return { items, nextCursor, counts };
}
function serve(url: string): Promise<Response> {
  const query = new URLSearchParams(url.split("?")[1]);
  const pages = query.get("activeOnly") === "true" ? server.active : server.all;
  const index = query.get("cursor") ? Number(query.get("cursor")) : 0;
  const found = pages[index];
  return found ? Promise.resolve(found) : Promise.reject(new Error(`No page for ${url}`));
}

/** Lets queries, mutations and their batched notifications finish. */
async function settle() {
  for (let i = 0; i < 5; i += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}
async function renderFavorites({ locale = "en" } = {}) {
  const view = renderMobile(<ToastProvider><FavoritesScreen /></ToastProvider>, { locale });
  await settle();
  return view;
}
/** The server forgets a deleted Favorite, as the API does. */
async function deleteOnServer(url: string) {
  const id = url.split("/")[2];
  for (const key of ["active", "all"] as const) {
    server[key] = server[key].map((entry) => {
      const removed = entry.items.find((item) => item.id === id);
      if (!removed) return entry;
      return { ...entry, items: entry.items.filter((item) => item.id !== id),
        counts: { total: entry.counts.total - 1, inactive: entry.counts.inactive - (removed.status === "active" ? 0 : 1) } };
    });
  }
  return { success: true };
}
const cardTitles = (view: Awaited<ReturnType<typeof renderFavorites>>) =>
  view.queryAllByText(/^Toyota \w+, 2018$/).map((node) => node.props.children as string);
/** The ♥ of the card at `index`. */
function heart(view: Awaited<ReturnType<typeof renderFavorites>>, index: number) {
  const found = view.getAllByRole("button", { name: "Remove from Favorites" }).at(index);
  if (!found) throw new Error(`No ♥ at index ${index}`);
  return found;
}
const lastUrl = () => api.get.mock.calls.at(-1)?.[0] as string;

beforeEach(() => {
  state.auth = true;
  useHideSoldStore.setState({ hideSold: true });
  useAuthIntentStore.setState({ intent: null, replayAction: null, replayReturnTo: null });
  server = {
    active: [page([camry, rav4], { total: 4, inactive: 2 })],
    all: [page([camry, prado, rav4, corolla], { total: 4, inactive: 2 })],
  };
  api.get.mockReset().mockImplementation(serve);
  api.delete.mockReset().mockImplementation(deleteOnServer);
  vi.mocked(useFocusEffect).mockReset();
});
afterEach(() => vi.useRealTimers());

describe("Favorites screen", () => {
  it("starts with Hide sold on, lists only active Listings and says how many are hidden", async () => {
    const view = await renderFavorites();
    expect(lastUrl()).toBe("/favorites?limit=20&activeOnly=true");
    const toggle = view.getByRole("switch", { name: "Hide sold" });
    expect(toggle.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    expect(view.getByText("2 sold or removed from sale hidden")).toBeTruthy();
    expect(cardTitles(view)).toEqual(["Toyota Camry, 2018", "Toyota RAV4, 2018"]);
    expect(view.getByTestId("favorites-count").props.children).toBe(4);
    expect(view.getAllByRole("button", { name: "Call" })).toHaveLength(2);
  });

  it("leaves out the hidden line when nothing is hidden", async () => {
    server.active = [page([camry], { total: 1, inactive: 0 })];
    const view = await renderFavorites();
    expect(view.queryByText(/hidden/)).toBeNull();
  });

  it("lists every visible Favorite newest first, sold and removed ones dimmed without contact buttons, when Hide sold is off", async () => {
    const view = await renderFavorites();
    fireEvent.press(view.getByRole("switch", { name: "Hide sold" }));
    await settle();
    expect(lastUrl()).toBe("/favorites?limit=20&activeOnly=false");
    expect(view.getByRole("switch", { name: "Hide sold" }).props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));
    expect(cardTitles(view)).toEqual(["Toyota Camry, 2018", "Toyota Prado, 2018", "Toyota RAV4, 2018", "Toyota Corolla, 2018"]);
    expect(view.getByText("Sold")).toBeTruthy();
    expect(view.getByText("Removed from sale")).toBeTruthy();
    expect(view.getAllByRole("button", { name: "Call" })).toHaveLength(2);
    expect(view.queryByText(/hidden/)).toBeNull();
  });

  it("keeps the Hide sold choice while the app runs", async () => {
    const first = await renderFavorites();
    fireEvent.press(first.getByRole("switch", { name: "Hide sold" }));
    await settle();
    first.unmount();
    const again = await renderFavorites();
    expect(again.getByRole("switch", { name: "Hide sold" }).props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));
  });

  it("says No active listings when every Favorite is sold or removed, keeping the switch", async () => {
    server.active = [page([], { total: 2, inactive: 2 })];
    const view = await renderFavorites();
    expect(view.getByText("No active listings")).toBeTruthy();
    expect(view.getByText("Sold Listings are hidden. Turn off “Hide sold” to see them.")).toBeTruthy();
    expect(view.getByRole("switch", { name: "Hide sold" })).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Browse listings" }));
    expect(routerMock.navigate).toHaveBeenCalledWith(HOME_HREF);
  });

  it("shows the empty state with Browse listings when there are no Favorites", async () => {
    server.active = [page([], { total: 0, inactive: 0 })];
    const view = await renderFavorites();
    expect(view.getByText("No favorites yet")).toBeTruthy();
    expect(view.getByText("Save listings to find them later")).toBeTruthy();
    expect(view.queryByRole("switch")).toBeNull();
    expect(view.queryByTestId("favorites-count")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Browse listings" }));
    expect(routerMock.navigate).toHaveBeenCalledWith(HOME_HREF);
  });

  it("shows large-card skeletons with their buttons while loading", async () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const view = await renderFavorites();
    const loading = view.getByLabelText("Please wait...");
    expect(within(loading).getAllByTestId("listing-photo-skeleton").length).toBeGreaterThan(0);
    expect(within(loading).getAllByTestId("skeleton-button").length).toBeGreaterThan(0);
  });

  it("shows the shared error state and retries", async () => {
    api.get.mockRejectedValueOnce(new Error("Network request failed"));
    const view = await renderFavorites();
    expect(view.getByText("Something went wrong")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Retry" }));
    await settle();
    expect(cardTitles(view)).toEqual(["Toyota Camry, 2018", "Toyota RAV4, 2018"]);
  });

  it("asks a signed-out User to sign in and returns to Favorites", async () => {
    state.auth = false;
    const view = await renderFavorites();
    expect(view.getByText("Sign in to see your Favorites")).toBeTruthy();
    expect(view.getByText("Tap ♡ on a Listing to save it here.")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Sign in" }));
    expect(useAuthIntentStore.getState().intent).toEqual(expect.objectContaining({ returnTo: "/(tabs)/favorites" }));
    expect(api.get).not.toHaveBeenCalled();
  });

  it("removes the card at once and Undo puts it back in place without a request", async () => {
    const view = await renderFavorites();
    fireEvent.press(heart(view, 0));
    expect(cardTitles(view)).toEqual(["Toyota RAV4, 2018"]);
    expect(view.getByTestId("favorites-count").props.children).toBe(3);
    const toast = view.getByTestId("toast-viewport-above-tab-bar");
    expect(within(toast).getByText("Removed from Favorites")).toBeTruthy();
    fireEvent.press(within(toast).getByRole("button", { name: "Undo" }));
    expect(cardTitles(view)).toEqual(["Toyota Camry, 2018", "Toyota RAV4, 2018"]);
    expect(view.getByTestId("favorites-count").props.children).toBe(4);
    expect(view.queryByText("Removed from Favorites")).toBeNull();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("lowers the hidden count when a removed-from-sale card is removed with Hide sold off", async () => {
    const view = await renderFavorites();
    fireEvent.press(view.getByRole("switch", { name: "Hide sold" }));
    await settle();
    fireEvent.press(heart(view, 3));
    expect(cardTitles(view)).toEqual(["Toyota Camry, 2018", "Toyota Prado, 2018", "Toyota RAV4, 2018"]);
    fireEvent.press(view.getByRole("switch", { name: "Hide sold" }));
    await settle();
    expect(view.getByText("1 sold or removed from sale hidden")).toBeTruthy();
  });

  it("deletes the Favorite on the server when the toast ends", async () => {
    const view = await renderFavorites();
    vi.useFakeTimers();
    fireEvent.press(heart(view, 0));
    await act(async () => { await vi.advanceTimersByTimeAsync(2900); });
    expect(api.delete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(api.delete).toHaveBeenCalledWith("/listings/camry-1/favorite", expect.any(Object));
    expect(view.queryByText("Removed from Favorites")).toBeNull();
    expect(cardTitles(view)).toEqual(["Toyota RAV4, 2018"]);
  });

  it("deletes the earlier Favorite at once when another card is removed", async () => {
    const view = await renderFavorites();
    fireEvent.press(heart(view, 0));
    fireEvent.press(heart(view, 0));
    await settle();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith("/listings/camry-1/favorite", expect.any(Object));
    expect(view.getAllByText("Removed from Favorites")).toHaveLength(1);
  });

  it("deletes a pending removal when the screen loses focus", async () => {
    const view = await renderFavorites();
    fireEvent.press(heart(view, 0));
    const effect = vi.mocked(useFocusEffect).mock.calls.at(-1)?.[0];
    const blur = effect?.();
    act(() => { if (typeof blur === "function") blur(); });
    await settle();
    expect(api.delete).toHaveBeenCalledWith("/listings/camry-1/favorite", expect.any(Object));
  });

  it("brings the card back and shows an error toast when the delete fails", async () => {
    api.delete.mockRejectedValue(new Error("Network request failed"));
    const view = await renderFavorites();
    fireEvent.press(heart(view, 0));
    const effect = vi.mocked(useFocusEffect).mock.calls.at(-1)?.[0];
    const blur = effect?.();
    act(() => { if (typeof blur === "function") blur(); });
    await settle();
    expect(cardTitles(view)).toEqual(["Toyota Camry, 2018", "Toyota RAV4, 2018"]);
    expect(view.getByText("Could not remove from Favorites. Try again.")).toBeTruthy();
  });

  it.each([true, false])("refreshes and pages with Hide sold %s", async (hideSold) => {
    useHideSoldStore.setState({ hideSold });
    const key = hideSold ? "active" : "all";
    server[key] = [page([camry], { total: 4, inactive: 2 }, "1"), page([rav4], { total: 4, inactive: 2 })];
    const view = await renderFavorites();
    const list = view.getByTestId("favorites-list");
    act(() => { list.props.onEndReached(); });
    await settle();
    expect(lastUrl()).toBe(`/favorites?limit=20&activeOnly=${hideSold}&cursor=1`);
    expect(cardTitles(view)).toEqual(["Toyota Camry, 2018", "Toyota RAV4, 2018"]);
    api.get.mockClear();
    act(() => { view.getByTestId("favorites-list").props.refreshControl.props.onRefresh(); });
    await settle();
    expect(api.get).toHaveBeenCalledWith(`/favorites?limit=20&activeOnly=${hideSold}`, expect.any(Object));
  });

  it("opens Listing detail from a card", async () => {
    const view = await renderFavorites();
    fireEvent.press(view.getByRole("button", { name: /Toyota Camry, 2018/ }));
    expect(routerMock.push).toHaveBeenCalledWith("/(public)/listings/camry-1");
  });

  it("has no Need help link and no recommendations", async () => {
    const view = await renderFavorites();
    expect(view.queryByText(/Need help|support|Recommended/i)).toBeNull();
  });

  it.each([
    ["ru", "Скрыть проданные", "Скрыто проданных и снятых с продажи: 2"],
    ["tk", "Satylanlary gizle", "Satylan we aýrylan 2 gizlendi"],
  ])("speaks %s", async (locale, toggle, hidden) => {
    const view = await renderFavorites({ locale });
    expect(view.getByRole("switch", { name: toggle })).toBeTruthy();
    expect(view.getByText(hidden)).toBeTruthy();
  });
});
