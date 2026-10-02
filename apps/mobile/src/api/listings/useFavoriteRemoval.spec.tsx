// @vitest-environment happy-dom

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../queryKeys";

import { useFavoriteRemoval } from "./useFavoriteRemoval";

const mockDelete = vi.fn();
vi.mock("../client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: (...args: unknown[]) => mockDelete(...args) },
  ApiError: class ApiError extends Error {},
}));

type Favorite = ListingsSchemas.FavoriteListingSummary;
type Pages = InfiniteData<ListingsSchemas.MyFavoritesResponse>;

function favorite(id: string, status: Favorite["status"] = "active"): Favorite {
  return {
    id, sellerId: "seller", status, brandId: "brand", modelId: "model", priceAmount: 1, priceCurrency: "TMT",
    displayPriceTmt: 1, photoKeys: [], photoCount: 0, cityId: "city", publishedAt: "2026-09-30T00:00:00.000Z",
    allowCalls: true, allowChat: true, isFavorited: true,
  };
}

const DELAY = 30;
let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  mockDelete.mockReset();
  mockDelete.mockResolvedValue({ success: true });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const all: Pages = { pageParams: [null], pages: [{ items: [favorite("a"), favorite("sold", "sold"), favorite("b")], nextCursor: null, counts: { total: 3, inactive: 1 } }] };
  const active: Pages = { pageParams: [null], pages: [{ items: [favorite("a"), favorite("b")], nextCursor: null, counts: { total: 3, inactive: 1 } }] };
  client.setQueryData(queryKeys.favorites.list(false), all);
  client.setQueryData(queryKeys.favorites.list(true), active);
  client.setQueryData(queryKeys.listings.list({ sort: "newest" }, "viewer"), {
    pageParams: [null], pages: [{ items: [{ ...favorite("a"), isFavorited: true }], nextCursor: null }],
  });
});

describe("Favorites removal with Undo", () => {
  it("hides the card at once and sends nothing when Undo comes first", async () => {
    const { result } = renderHook(() => useFavoriteRemoval({ delayMs: DELAY }), { wrapper });
    act(() => result.current.remove(favorite("a")));
    expect(result.current.hiddenIds.has("a")).toBe(true);
    expect(result.current.pendingId).toBe("a");

    act(() => { expect(result.current.undo()).toBe(true); });
    expect(result.current.hiddenIds.has("a")).toBe(false);
    expect(result.current.pendingId).toBeNull();
    await act(async () => { await sleep(DELAY * 3); });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes on the server when the delay ends, then drops the Listing from every Favorites cache and shows ♡ elsewhere", async () => {
    const { result } = renderHook(() => useFavoriteRemoval({ delayMs: DELAY }), { wrapper });
    act(() => result.current.remove(favorite("a")));
    expect(mockDelete).not.toHaveBeenCalled();

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("/listings/a/favorite", expect.any(Object)));
    await waitFor(() => expect(result.current.hiddenIds.has("a")).toBe(false));
    for (const activeOnly of [false, true]) {
      const page = client.getQueryData<Pages>(queryKeys.favorites.list(activeOnly))?.pages[0];
      expect(page?.items.map((item) => item.id)).not.toContain("a");
      expect(page?.counts).toEqual({ total: 2, inactive: 1 });
    }
    const feed = client.getQueryData<InfiniteData<{ items: Favorite[] }>>(queryKeys.listings.list({ sort: "newest" }, "viewer"));
    expect(feed?.pages[0]?.items[0]?.isFavorited).toBe(false);
  });

  it("lowers the inactive count too when a sold Listing is removed", async () => {
    const { result } = renderHook(() => useFavoriteRemoval({ delayMs: DELAY }), { wrapper });
    act(() => result.current.remove(favorite("sold", "sold")));
    act(() => result.current.flush());
    await waitFor(() => expect(client.getQueryData<Pages>(queryKeys.favorites.list(false))?.pages[0]?.counts).toEqual({ total: 2, inactive: 0 }));
  });

  it("deletes the earlier Favorite at once when another card is removed, and keeps both hidden", async () => {
    const { result } = renderHook(() => useFavoriteRemoval({ delayMs: 10_000 }), { wrapper });
    act(() => result.current.remove(favorite("a")));
    act(() => result.current.remove(favorite("b")));
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith("/listings/a/favorite", expect.any(Object));
    expect(result.current.hiddenIds.has("b")).toBe(true);
    expect(result.current.pendingId).toBe("b");

    act(() => { result.current.undo(); });
    expect(result.current.hiddenIds.has("b")).toBe(false);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("deletes at once on flush, used when the screen loses focus", async () => {
    const { result } = renderHook(() => useFavoriteRemoval({ delayMs: 10_000 }), { wrapper });
    act(() => result.current.remove(favorite("a")));
    act(() => result.current.flush());
    expect(mockDelete).toHaveBeenCalledWith("/listings/a/favorite", expect.any(Object));
    expect(result.current.pendingId).toBeNull();
    act(() => { expect(result.current.undo()).toBe(false); });
    expect(result.current.hiddenIds.has("a")).toBe(true);
  });

  it("deletes a pending removal when the screen unmounts", () => {
    const { result, unmount } = renderHook(() => useFavoriteRemoval({ delayMs: 10_000 }), { wrapper });
    act(() => result.current.remove(favorite("a")));
    unmount();
    expect(mockDelete).toHaveBeenCalledWith("/listings/a/favorite", expect.any(Object));
  });

  it("brings the card back and reports the failure when the delete fails", async () => {
    mockDelete.mockRejectedValue(new Error("Network request failed"));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useFavoriteRemoval({ delayMs: DELAY, onFailed }), { wrapper });
    act(() => result.current.remove(favorite("a")));
    await waitFor(() => expect(onFailed).toHaveBeenCalledWith(expect.objectContaining({ id: "a" })));
    expect(result.current.hiddenIds.has("a")).toBe(false);
    expect(client.getQueryData<Pages>(queryKeys.favorites.list(false))?.pages[0]?.items.map((item) => item.id)).toContain("a");
  });
});
