// @vitest-environment happy-dom

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useModelPicker } from "./useModelPicker";

const mockGet = vi.fn();

vi.mock("../../api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const MODELS = {
  items: [
    { id: "camry", name: "Camry", slug: "camry", brandId: "toyota" },
    { id: "rav4", name: "RAV4", slug: "rav4", brandId: "toyota" },
    { id: "supra", name: "Supra", slug: "supra", brandId: "toyota" },
  ],
  nextCursor: null,
  hasMore: false,
};

/** The count for a selection: 100 for the whole brand, 10 per ticked model. */
function countFor(url: string): number {
  const params = new URLSearchParams(url.split("?")[1]);
  const models = params.getAll("modelIds");
  return models.length === 0 ? 100 : models.length * 10;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const countUrls = () =>
  mockGet.mock.calls
    .map(([url]) => url as string)
    .filter((url) => url.startsWith("/listings/count"));

describe("useModelPicker", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("/catalog/brands?")) {
        return Promise.resolve({
          items: [{ id: "toyota", name: "Toyota", slug: "toyota" }],
          nextCursor: null,
          hasMore: false,
        });
      }
      if (url.startsWith("/catalog/brands/toyota/models")) return Promise.resolve(MODELS);
      if (url.startsWith("/listings/filter-options/models")) {
        return Promise.resolve({
          items: [
            { modelId: "camry", totalMatching: 60 },
            { modelId: "rav4", totalMatching: 40 },
          ],
        });
      }
      if (url.startsWith("/listings/count")) {
        return Promise.resolve({
          totalMatching: countFor(url),
          priceMinTmt: null,
          priceMaxTmt: null,
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });
  });

  it("starts with no model ticked, which counts every model of the brand", async () => {
    const { result } = renderHook(
      () => useModelPicker({ brandId: "toyota", filters: { cityId: "c1" } }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.count).toBe(100));
    expect(result.current.selected).toEqual([]);
    expect(countUrls()[0]).toBe("/listings/count?cityId=c1&brandId=toyota");
    expect(result.current.choice()).toEqual({
      brandId: "toyota",
      brandName: "Toyota",
      modelIds: [],
      modelNames: [],
    });
  });

  it("lists popular models with counts, then the rest", async () => {
    const { result } = renderHook(() => useModelPicker({ brandId: "toyota" }), { wrapper });

    await waitFor(() => {
      const c = result.current.content;
      expect(c.kind === "ready" && c.rows.popular.length).toBe(2);
    });
    const content = result.current.content;
    if (content.kind !== "ready") throw new Error(content.kind);
    expect(content.rows.popular.map((m) => [m.name, m.count])).toEqual([
      ["Camry", 60],
      ["RAV4", 40],
    ]);
    expect(content.rows.others.map((m) => m.name)).toEqual(["Supra"]);
  });

  it("ticks several models and updates Show N for the selection", async () => {
    const { result } = renderHook(
      () => useModelPicker({ brandId: "toyota", brandName: "Toyota" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.content.kind).toBe("ready"));

    act(() => result.current.toggle("rav4"));
    act(() => result.current.toggle("camry"));

    await waitFor(() => expect(result.current.count).toBe(20));
    expect(countUrls().at(-1)).toBe("/listings/count?brandId=toyota&modelIds=rav4&modelIds=camry");
    expect(result.current.choice()).toEqual({
      brandId: "toyota",
      brandName: "Toyota",
      modelIds: ["rav4", "camry"],
      modelNames: ["RAV4", "Camry"],
    });
  });

  it("'All models' unticks everything, back to the whole brand", async () => {
    const { result } = renderHook(
      () => useModelPicker({ brandId: "toyota", initialModelIds: ["camry"] }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.count).toBe(10));
    expect(result.current.selected).toEqual(["camry"]);

    act(() => result.current.selectAll());

    await waitFor(() => expect(result.current.count).toBe(100));
    expect(result.current.selected).toEqual([]);
  });

  it("filters the list by the search field", async () => {
    const { result } = renderHook(() => useModelPicker({ brandId: "toyota" }), { wrapper });
    await waitFor(() => expect(result.current.content.kind).toBe("ready"));

    act(() => result.current.setQuery("rav"));

    const content = result.current.content;
    if (content.kind !== "ready") throw new Error(content.kind);
    expect([...content.rows.popular, ...content.rows.others].map((m) => m.id)).toEqual(["rav4"]);
  });

  it("shows an error when models fail to load, and retries", async () => {
    const ok = mockGet.getMockImplementation();
    mockGet.mockImplementation((url: string) =>
      url.startsWith("/catalog/brands/toyota/models")
        ? Promise.reject(new Error("offline"))
        : ok?.(url),
    );
    const { result } = renderHook(() => useModelPicker({ brandId: "toyota" }), { wrapper });

    await waitFor(() => expect(result.current.content.kind).toBe("error"));

    mockGet.mockImplementation((url: string) => ok?.(url));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.content.kind).toBe("ready"));
  });
  it("keeps models usable after count failure and retries the total for Show and Done", async () => {
    const ok = mockGet.getMockImplementation();
    mockGet.mockImplementation((url: string) => url.startsWith("/listings/count")
      ? Promise.reject(new Error("count offline")) : ok?.(url));
    const { result } = renderHook(() => useModelPicker({ brandId: "toyota" }), { wrapper });
    await waitFor(() => expect(result.current.content.kind).toBe("ready"));
    await waitFor(() => expect(result.current.countError).toBeInstanceOf(Error));
    expect(result.current.countPending).toBe(false);
    expect(result.current.count).toBeUndefined();
    const requestsBefore = countUrls().length;
    mockGet.mockImplementation((url: string) => ok?.(url));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.count).toBe(100));
    expect(countUrls().length).toBeGreaterThan(requestsBefore);
    expect(result.current.countError).toBeNull();
  });

});
