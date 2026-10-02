// @vitest-environment happy-dom

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../queryKeys";
import { useArchiveListing } from "./useArchiveListing";
import { useCreateDraft } from "./useCreateDraft";
import { useDeleteListing } from "./useDeleteListing";
import { useDiscardDraft } from "./useDiscardDraft";
import { useMarkSold } from "./useMarkSold";
import { useMyListingCounts } from "./useMyListingCounts";
import { usePublishDraft } from "./usePublishDraft";
import { useRepublishListing } from "./useRepublishListing";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../client", () => ({
  apiClient: { get: api.get, post: api.post, patch: vi.fn(), delete: api.delete },
}));

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";

const counts = (total: number) => ({ active: 0, sold: 0, archived: 0, banned: 0, drafts: 0, total });

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  api.get.mockReset();
  api.post.mockReset().mockResolvedValue({});
  api.delete.mockReset().mockResolvedValue(undefined);
});

describe("useMyListingCounts", () => {
  it("reads the signed-in User's counts, validated with the contract schema", async () => {
    api.get.mockResolvedValue(counts(5));
    const { result } = renderHook(() => useMyListingCounts(USER_A), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(5));
    expect(api.get).toHaveBeenCalledWith(
      "/me/listings/counts",
      ListingsSchemas.MyListingCountsResponseSchema,
    );
  });

  it("makes no request while signed out", async () => {
    api.get.mockResolvedValue(counts(5));
    const { result } = renderHook(() => useMyListingCounts(null), { wrapper });
    await act(async () => { await Promise.resolve(); });
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("never shows the previous User's number after another User signs in", async () => {
    api.get.mockResolvedValueOnce(counts(5));
    const { result, rerender } = renderHook(({ userId }) => useMyListingCounts(userId), {
      wrapper,
      initialProps: { userId: USER_A as string | null },
    });
    await waitFor(() => expect(result.current.data?.total).toBe(5));

    let resolveB: (value: unknown) => void = () => {};
    api.get.mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve; }));
    rerender({ userId: USER_B });
    expect(result.current.data).toBeUndefined();

    await act(async () => { resolveB(counts(2)); });
    await waitFor(() => expect(result.current.data?.total).toBe(2));
  });
});

describe("the counts stay current after a Listing or draft mutation", () => {
  const mutations = [
    ["publishing a draft", () => usePublishDraft(), "draft-1"],
    ["creating a draft", () => useCreateDraft(), undefined],
    ["discarding a draft", () => useDiscardDraft(), "draft-1"],
    ["marking sold", () => useMarkSold(), "listing-1"],
    ["removing from sale", () => useArchiveListing(), "listing-1"],
    ["relisting", () => useRepublishListing(), "listing-1"],
    ["deleting a Listing", () => useDeleteListing(), "listing-1"],
  ] as const;

  it.each(mutations)("refetches the total after %s", async (_name, useMutationHook, variables) => {
    api.get.mockResolvedValueOnce(counts(5)).mockResolvedValueOnce(counts(6));
    const { result } = renderHook(
      () => ({ counts: useMyListingCounts(USER_A), mutation: useMutationHook() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.counts.data?.total).toBe(5));

    await act(async () => {
      await (result.current.mutation.mutateAsync as (v: unknown) => Promise<unknown>)(variables);
    });

    await waitFor(() => expect(result.current.counts.data?.total).toBe(6));
    expect(client.getQueryState(queryKeys.listings.myCounts(USER_A))?.isInvalidated).toBe(false);
  });
});
