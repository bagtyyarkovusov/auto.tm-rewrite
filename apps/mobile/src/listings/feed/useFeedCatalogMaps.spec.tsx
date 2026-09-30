// @vitest-environment happy-dom

import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFeedCatalogMaps } from "./useFeedCatalogMaps";

const mockGet = vi.fn();

vi.mock("../../api/client", () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

vi.mock("../../api/catalog/useCatalogLocale", () => ({
  useCatalogLocale: () => "ru",
}));

const listings = [
  { id: "listing-1", brandId: "brand-1", modelId: "model-1" },
] as unknown as ListingsSchemas.ListingSummary[];

const brandsPage = {
  items: [{ id: "brand-1", name: "Toyota", logoUrl: "https://files.test/toyota.png" }],
  nextCursor: null,
  hasMore: false,
};
const modelsPage = {
  items: [{ id: "model-1", name: "Camry" }],
  nextCursor: null,
  hasMore: false,
};
const regionsPage = { items: [], nextCursor: null, hasMore: false };

function respond({ brandsFail = false, modelsFail = false } = {}) {
  mockGet.mockImplementation(async (path: string) => {
    if (path.startsWith("/catalog/brands?")) {
      if (brandsFail) throw new Error("brands unavailable");
      return brandsPage;
    }
    if (path.startsWith("/catalog/brands/")) {
      if (modelsFail) throw new Error("models unavailable");
      return modelsPage;
    }
    if (path.startsWith("/catalog/regions")) return regionsPage;
    throw new Error(`unexpected ${path}`);
  });
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useFeedCatalogMaps(listings), { wrapper });
}

describe("useFeedCatalogMaps namesPending", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("is pending until brand and model names arrive, then resolves the names", async () => {
    respond();

    const { result } = setup();
    expect(result.current.namesPending).toBe(true);

    await waitFor(() => expect(result.current.namesPending).toBe(false));
    expect(result.current.brandName("brand-1")).toBe("Toyota");
    expect(result.current.modelName("model-1")).toBe("Camry");
    expect(result.current.brandLogoUrl("brand-1")).toBe("https://files.test/toyota.png");
    expect(result.current.brandLogoUrl("unknown")).toBeUndefined();
  });

  it("stops pending when the brands query fails, leaving the brand unnamed", async () => {
    respond({ brandsFail: true });

    const { result } = setup();

    await waitFor(() => expect(result.current.namesPending).toBe(false));
    expect(result.current.brandName("brand-1")).toBeUndefined();
  });

  it("stops pending when a models query fails, leaving the model unnamed", async () => {
    respond({ modelsFail: true });

    const { result } = setup();

    await waitFor(() => expect(result.current.namesPending).toBe(false));
    expect(result.current.modelName("model-1")).toBeUndefined();
  });
});
