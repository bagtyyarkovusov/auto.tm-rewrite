// @vitest-environment happy-dom

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RECENT_STORAGE_KEY, useRecentChoicesStore } from "./recentSearches";
import { useBrandPicker } from "./useBrandPicker";

const mockGet = vi.fn();
let mockStorage: Record<string, string> = {};

vi.mock("../../api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

const BRANDS = {
  items: [
    { id: "toyota", name: "Toyota", slug: "toyota", logoUrl: "https://cdn.test/toyota.png" },
    { id: "lexus", name: "Lexus", slug: "lexus" },
    { id: "bmw", name: "BMW", slug: "bmw" },
  ],
  nextCursor: null,
  hasMore: false,
};

function respond(routes: Record<string, unknown>) {
  mockGet.mockImplementation((url: string) => {
    const match = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    if (!match) return Promise.reject(new Error(`unexpected ${url}`));
    const body = routes[match];
    return body instanceof Error ? Promise.reject(body) : Promise.resolve(body);
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const toyotaCamry = {
  brandId: "toyota",
  brandName: "Toyota",
  modelIds: ["camry"],
  modelNames: ["Camry"],
};

describe("useBrandPicker", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockStorage = {};
    useRecentChoicesStore.getState().resetForTests();
    respond({
      "/catalog/brands": BRANDS,
      "/listings/filter-options/brands": {
        items: [
          { brandId: "toyota", totalMatching: 40 },
          { brandId: "bmw", totalMatching: 3 },
        ],
      },
      "/catalog/search": {
        results: [
          { kind: "brand", brandId: "toyota", label: "Toyota" },
          { kind: "model", brandId: "toyota", modelId: "camry", label: "Camry" },
        ],
      },
    });
  });

  it("shows Recent from the device, Popular with counts, and every brand A to Z", async () => {
    mockStorage[RECENT_STORAGE_KEY] = JSON.stringify([toyotaCamry]);

    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });

    await waitFor(() => {
      const c = result.current.content;
      expect(c.kind === "browse" && c.recent.length === 1 && c.popular.length === 2).toBe(true);
    });
    const content = result.current.content;
    if (content.kind !== "browse") throw new Error(content.kind);

    expect(content.recent[0]).toEqual({
      choice: toyotaCamry,
      brandName: "Toyota",
      logoUrl: "https://cdn.test/toyota.png",
    });
    expect(content.popular.map((b) => [b.id, b.count])).toEqual([
      ["toyota", 40],
      ["bmw", 3],
    ]);
    expect(content.alphabet.map((s) => s.letter)).toEqual(["B", "L", "T"]);
    // Every row carries its logo when one is uploaded; Lexus falls back to its letter.
    expect(content.alphabet.flatMap((s) => s.rows).find((r) => r.id === "lexus")?.logoUrl)
      .toBeUndefined();
  });

  it("hides Recent when it is empty", async () => {
    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });

    await waitFor(() => expect(result.current.content.kind).toBe("browse"));
    await waitFor(() => expect(useRecentChoicesStore.getState().hydrated).toBe(true));
    const content = result.current.content;
    expect(content.kind === "browse" && content.recent).toEqual([]);
  });

  it("has no Recent in Done mode, where the form is already open", async () => {
    mockStorage[RECENT_STORAGE_KEY] = JSON.stringify([toyotaCamry]);

    const { result } = renderHook(() => useBrandPicker({ showRecent: false }), { wrapper });

    await waitFor(() => expect(useRecentChoicesStore.getState().items).toHaveLength(1));
    await waitFor(() => expect(result.current.content.kind).toBe("browse"));
    const content = result.current.content;
    expect(content.kind === "browse" && content.recent).toEqual([]);
  });

  it("counts brands with the buyer's other filters, never a brand or model", async () => {
    renderHook(
      () =>
        useBrandPicker({
          showRecent: false,
          filters: { brandId: "lexus", modelIds: ["rx"], cityId: "c1", yearMin: 2015 },
        }),
      { wrapper },
    );

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        "/listings/filter-options/brands?cityId=c1&yearMin=2015",
        expect.any(Object),
        { auth: false },
      ),
    );
  });

  it("finds Toyota for 'тойота' through the catalog search and lists only brands", async () => {
    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });
    await waitFor(() => expect(result.current.content.kind).toBe("browse"));

    act(() => result.current.setQuery("тойота"));

    await waitFor(() => {
      const c = result.current.content;
      expect(c.kind === "matches" && c.rows.length > 0).toBe(true);
    });
    const content = result.current.content;
    expect(content.kind === "matches" && content.rows).toEqual([
      { id: "toyota", name: "Toyota", logoUrl: "https://cdn.test/toyota.png", count: 40 },
    ]);
    expect(mockGet).toHaveBeenCalledWith(
      `/catalog/search?q=${encodeURIComponent("тойота")}&locale=ru`,
      expect.any(Object),
      { auth: false },
    );
  });

  it("says no brand matches only after the search answered with none", async () => {
    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });
    await waitFor(() => expect(result.current.content.kind).toBe("browse"));
    mockGet.mockImplementation((url: string) =>
      url.startsWith("/catalog/search")
        ? Promise.resolve({ results: [] })
        : Promise.reject(new Error(url)),
    );

    act(() => result.current.setQuery("zzz"));
    expect(result.current.content).toMatchObject({ kind: "matches", rows: [], searching: true });

    await waitFor(() =>
      expect(result.current.content).toMatchObject({
        kind: "matches",
        rows: [],
        searching: false,
        failed: false,
      }),
    );
  });

  it("reports a failed search instead of 'no match'", async () => {
    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });
    await waitFor(() => expect(result.current.content.kind).toBe("browse"));
    mockGet.mockImplementation(() => Promise.reject(new Error("offline")));

    act(() => result.current.setQuery("toy"));

    await waitFor(() =>
      expect(result.current.content).toMatchObject({ kind: "matches", failed: true }),
    );
  });

  it("shows an error with retry when brands fail to load", async () => {
    respond({
      "/catalog/brands": new Error("offline"),
      "/listings/filter-options/brands": { items: [] },
    });
    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });

    await waitFor(() => expect(result.current.content.kind).toBe("error"));

    respond({ "/catalog/brands": BRANDS, "/listings/filter-options/brands": { items: [] } });
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.content.kind).toBe("browse"));
  });

  it("still lists A to Z when the counts fail", async () => {
    respond({
      "/catalog/brands": BRANDS,
      "/listings/filter-options/brands": new Error("offline"),
    });
    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });

    await waitFor(() => expect(result.current.content.kind).toBe("browse"));
    const content = result.current.content;
    if (content.kind !== "browse") throw new Error(content.kind);
    expect(content.popular).toEqual([]);
    expect(content.alphabet.flatMap((s) => s.rows)).toHaveLength(3);
  });

  it("clears Recent on the device", async () => {
    mockStorage[RECENT_STORAGE_KEY] = JSON.stringify([toyotaCamry]);
    const { result } = renderHook(() => useBrandPicker({ showRecent: true }), { wrapper });
    await waitFor(() => {
      const c = result.current.content;
      expect(c.kind === "browse" && c.recent.length).toBe(1);
    });

    act(() => result.current.clearRecent());

    await waitFor(() => {
      const c = result.current.content;
      expect(c.kind === "browse" && c.recent.length).toBe(0);
    });
    expect(mockStorage[RECENT_STORAGE_KEY]).toBeUndefined();
    expect(mockGet.mock.calls.map(([url]) => url as string).some((u) => u.includes("recent")))
      .toBe(false);
  });
});
