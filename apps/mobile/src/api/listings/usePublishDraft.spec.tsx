// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

import { usePublishDraft } from "./usePublishDraft";

vi.mock("../client", () => ({ apiClient: { post: vi.fn() } }));

const id = "550e8400-e29b-41d4-a716-446655440000";
const published = {
  id, sellerId: id, status: "active", brandId: id, modelId: id,
  priceAmount: 100000, priceCurrency: "TMT", publishedAt: "2026-10-05T08:00:00.000Z",
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(() => usePublishDraft(), { wrapper }) };
}

describe("usePublishDraft", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset().mockResolvedValue(published);
  });
  afterEach(() => onlineManager.setOnline(true));

  it("takes the published draft out of the Sell tab and Drafts, and puts the Listing in My listings", async () => {
    const { queryClient, result } = setup();
    const invalidated: unknown[] = [];
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation(async (filters) => {
      invalidated.push(filters?.queryKey);
    });

    await act(async () => { await result.current.mutateAsync(id); });

    expect(apiClient.post).toHaveBeenCalledWith(`/listings/drafts/${id}/publish`, {}, expect.anything());
    expect(invalidated).toEqual(
      expect.arrayContaining([
        queryKeys.listings.myDrafts(),
        queryKeys.listings.myDraftsInfinite(),
        queryKeys.listings.myListings(),
        queryKeys.listings.myListingsInfinite(),
      ]),
    );
  });

  // The root layout tells TanStack Query when the device is offline. In the default
  // network mode the publish would pause and never settle, and Check would read
  // "Publishing..." until the network came back.
  it("fails at once when the device is offline, instead of waiting for the network", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      Object.assign(new Error("Network request failed"), { code: "NETWORK_ERROR", status: 0 }),
    );
    onlineManager.setOnline(false);
    const { result } = setup();

    let outcome: unknown = "paused";
    act(() => {
      result.current.mutateAsync(id).then(
        () => { outcome = "published"; },
        (error: { code?: string }) => { outcome = error.code; },
      );
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });

    expect(outcome).toBe("NETWORK_ERROR");
    expect(apiClient.post).toHaveBeenCalledOnce();
  });
});
