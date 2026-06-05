// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/msw";

import {
  useSaveListingEdit,
  computeOps,
  buildFieldsPatch,
  EditSessionError,
} from "./useSaveListingEdit";
import type { StagedPhoto } from "../uploadStaging/types";
import type { ListingsSchemas } from "@auto-tm/contracts";

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() =>
    Promise.resolve({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: {
        id: "u1",
        phone: "+99361000000",
        displayName: null,
        role: "buyer",
      },
      storedAt: new Date().toISOString(),
    }),
  ),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LISTING_ID = "550e8400-e29b-41d4-a716-446655440000";

const seedMedia: ListingsSchemas.ListingMedia[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    kind: "image",
    key: "listings/l1/m1/original.jpg",
    variants: {
      thumbnail: "t.jpg",
      list: "l.jpg",
      detail: "d.jpg",
      fullscreen: "f.jpg",
    },
    sortOrder: 0,
    width: 1920,
    height: 1080,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    kind: "image",
    key: "listings/l1/m2/original.jpg",
    variants: {
      thumbnail: "t.jpg",
      list: "l.jpg",
      detail: "d.jpg",
      fullscreen: "f.jpg",
    },
    sortOrder: 1,
    width: 1920,
    height: 1080,
  },
];

const basePayload = {
  priceAmount: 15000,
  priceCurrency: "USD" as const,
  description: "Great car",
  condition: "used" as const,
  mileageKm: 50000,
  allowCalls: true,
  allowChat: true,
};

function photo(p: Partial<StagedPhoto> & { photoId: string }): StagedPhoto {
  return {
    state: "uploaded",
    sortOrder: 0,
    retryCount: 0,
    ...p,
  };
}

describe("computeOps", () => {
  it("includes fields op when editable fields are present", () => {
    const ops = computeOps(basePayload, [], []);
    expect(ops.some((o) => o.id === "fields")).toBe(true);
  });

  it("excludes fields op when payload has no editable fields", () => {
    const ops = computeOps({}, [], []);
    expect(ops.some((o) => o.id === "fields")).toBe(false);
  });

  it("identifies new photos to attach", () => {
    const photos = [
      photo({ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "k1" }),
      photo({ photoId: "new1", key: "k2" }),
    ];
    const ops = computeOps(basePayload, photos, seedMedia);
    expect(ops.some((o) => o.id === "attach:new1")).toBe(true);
    expect(ops.some((o) => o.id === "attach:550e8400-e29b-41d4-a716-446655440001")).toBe(false);
  });

  it("identifies removed photos", () => {
    const photos = [photo({ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "k1" })];
    const ops = computeOps(basePayload, photos, seedMedia);
    expect(ops.some((o) => o.id === "remove:550e8400-e29b-41d4-a716-446655440002")).toBe(true);
    expect(ops.some((o) => o.id === "remove:550e8400-e29b-41d4-a716-446655440001")).toBe(false);
  });

  it("includes reorder when photos exist", () => {
    const ops = computeOps(basePayload, [photo({ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "k1" })], seedMedia);
    expect(ops.some((o) => o.id === "reorder")).toBe(true);
  });

  it("excludes reorder when no photos exist", () => {
    const ops = computeOps(basePayload, [], seedMedia);
    expect(ops.some((o) => o.id === "reorder")).toBe(false);
  });
});

describe("buildFieldsPatch", () => {
  it("omits locked fields", () => {
    const patch = buildFieldsPatch({
      ...basePayload,
      brandId: "b1",
      modelId: "md1",
      generationId: "g1",
      year: 2020,
      vin: "VIN123",
    });
    expect(patch).not.toHaveProperty("brandId");
    expect(patch).not.toHaveProperty("modelId");
    expect(patch).not.toHaveProperty("generationId");
    expect(patch).not.toHaveProperty("year");
    expect(patch).not.toHaveProperty("vin");
    expect(patch.priceAmount).toBe(15000);
  });

  it("omits undefined fields", () => {
    const patch = buildFieldsPatch({
      priceAmount: 15000,
    });
    expect(patch).toHaveProperty("priceAmount");
    expect(patch).not.toHaveProperty("description");
  });
});

describe("useSaveListingEdit", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("happy path: runs all ops in sequence", async () => {
    const callLog: string[] = [];

    server.use(
      http.patch("*/listings/:id", async ({ request }) => {
        callLog.push("fields");
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: LISTING_ID,
          sellerId: "550e8400-e29b-41d4-a716-446655440003",
          status: "active",
          brandId: "550e8400-e29b-41d4-a716-446655440004",
          modelId: "550e8400-e29b-41d4-a716-446655440005",
          year: 2020,
          priceAmount: body.priceAmount ?? 15000,
          priceCurrency: body.priceCurrency ?? "USD",
          displayPriceTmt: 52500,
          description: body.description ?? "Great car",
          regionId: "550e8400-e29b-41d4-a716-446655440006",
          cityId: "550e8400-e29b-41d4-a716-446655440007",
          allowCalls: true,
          allowChat: true,
          acceptsExchange: false,
          installmentAvailable: false,
          media: seedMedia,
          viewCount: 0,
          favoriteCount: 0,
          publishedAt: "2026-05-21T12:00:00.000Z",
          soldAt: undefined,
          createdAt: "2026-05-21T12:00:00.000Z",
          updatedAt: "2026-05-21T12:00:00.000Z",
        });
      }),
      http.post("*/listings/:id/media/attach", () => {
        callLog.push("attach");
        return HttpResponse.json({
          id: "550e8400-e29b-41d4-a716-446655440008",
          listingId: LISTING_ID,
          kind: "image",
          key: "listings/l1/new1/original.jpg",
          sortOrder: 2,
          createdAt: "2026-05-21T12:00:00.000Z",
        });
      }),
      http.delete("*/listings/:id/media/:mediaId", () => {
        callLog.push("remove");
        return HttpResponse.json({ success: true });
      }),
      http.put("*/listings/:id/media/order", () => {
        callLog.push("reorder");
        return HttpResponse.json({ success: true });
      }),
    );

    const photos: StagedPhoto[] = [
      photo({ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "k1", sortOrder: 0 }),
      photo({ photoId: "new1", key: "k-new", sortOrder: 1 }),
    ];

    const { result } = renderHook(
      () => useSaveListingEdit(LISTING_ID, basePayload, photos, seedMedia),
      { wrapper },
    );

    await result.current.save();

    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(callLog).toEqual(["fields", "attach", "remove", "reorder"]);
    expect(result.current.opStates["fields"]).toBe("succeeded");
    expect(result.current.opStates["attach:new1"]).toBe("succeeded");
    expect(result.current.opStates["remove:550e8400-e29b-41d4-a716-446655440002"]).toBe("succeeded");
    expect(result.current.opStates["reorder"]).toBe("succeeded");
  });

  it("mid-sequence failure: stops and exposes per-op state; retry resumes from failed op", async () => {
    let attachAttempts = 0;
    const callLog: string[] = [];

    server.use(
      http.patch("*/listings/:id", async ({ request }) => {
        callLog.push("fields");
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: LISTING_ID,
          sellerId: "550e8400-e29b-41d4-a716-446655440003",
          status: "active",
          brandId: "550e8400-e29b-41d4-a716-446655440004",
          modelId: "550e8400-e29b-41d4-a716-446655440005",
          year: 2020,
          priceAmount: body.priceAmount ?? 15000,
          priceCurrency: body.priceCurrency ?? "USD",
          displayPriceTmt: 52500,
          description: body.description ?? "Great car",
          regionId: "550e8400-e29b-41d4-a716-446655440006",
          cityId: "550e8400-e29b-41d4-a716-446655440007",
          allowCalls: true,
          allowChat: true,
          acceptsExchange: false,
          installmentAvailable: false,
          media: seedMedia,
          viewCount: 0,
          favoriteCount: 0,
          publishedAt: "2026-05-21T12:00:00.000Z",
          soldAt: undefined,
          createdAt: "2026-05-21T12:00:00.000Z",
          updatedAt: "2026-05-21T12:00:00.000Z",
        });
      }),
      http.post("*/listings/:id/media/attach", () => {
        attachAttempts++;
        callLog.push(`attach-${attachAttempts}`);
        if (attachAttempts === 1) {
          return HttpResponse.json({ error: "fail" }, { status: 500 });
        }
        return HttpResponse.json({
          id: "550e8400-e29b-41d4-a716-446655440008",
          listingId: LISTING_ID,
          kind: "image",
          key: "listings/l1/new1/original.jpg",
          sortOrder: 2,
          createdAt: "2026-05-21T12:00:00.000Z",
        });
      }),
      http.delete("*/listings/:id/media/:mediaId", () => {
        callLog.push("remove");
        return HttpResponse.json({ success: true });
      }),
      http.put("*/listings/:id/media/order", () => {
        callLog.push("reorder");
        return HttpResponse.json({ success: true });
      }),
    );

    const photos: StagedPhoto[] = [
      photo({ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "k1", sortOrder: 0 }),
      photo({ photoId: "new1", key: "k-new", sortOrder: 1 }),
    ];

    const { result } = renderHook(
      () => useSaveListingEdit(LISTING_ID, basePayload, photos, seedMedia),
      { wrapper },
    );

    await expect(result.current.save()).rejects.toBeInstanceOf(
      EditSessionError,
    );

    await waitFor(() => expect(result.current.status).toBe("failed"));

    expect(result.current.opStates["fields"]).toBe("succeeded");
    expect(result.current.opStates["attach:new1"]).toBe("failed");
    expect(result.current.opStates["remove:550e8400-e29b-41d4-a716-446655440002"]).toBe("pending");
    expect(result.current.opStates["reorder"]).toBe("pending");
    expect(result.current.error?.failedOpId).toBe("attach:new1");

    // Retry
    await result.current.retry();

    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(callLog).toEqual([
      "fields",
      "attach-1", // first attempt fails
      "attach-2", // retry succeeds
      "remove",
      "reorder",
    ]);
    expect(result.current.opStates["fields"]).toBe("succeeded");
    expect(result.current.opStates["attach:new1"]).toBe("succeeded");
    expect(result.current.opStates["remove:550e8400-e29b-41d4-a716-446655440002"]).toBe("succeeded");
    expect(result.current.opStates["reorder"]).toBe("succeeded");
  });

  it("skips empty attach and remove ops", async () => {
    const callLog: string[] = [];

    server.use(
      http.patch("*/listings/:id", async ({ request }) => {
        callLog.push("fields");
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: LISTING_ID,
          sellerId: "550e8400-e29b-41d4-a716-446655440003",
          status: "active",
          brandId: "550e8400-e29b-41d4-a716-446655440004",
          modelId: "550e8400-e29b-41d4-a716-446655440005",
          year: 2020,
          priceAmount: body.priceAmount ?? 15000,
          priceCurrency: body.priceCurrency ?? "USD",
          displayPriceTmt: 52500,
          description: body.description ?? "Great car",
          regionId: "550e8400-e29b-41d4-a716-446655440006",
          cityId: "550e8400-e29b-41d4-a716-446655440007",
          allowCalls: true,
          allowChat: true,
          acceptsExchange: false,
          installmentAvailable: false,
          media: seedMedia,
          viewCount: 0,
          favoriteCount: 0,
          publishedAt: "2026-05-21T12:00:00.000Z",
          soldAt: undefined,
          createdAt: "2026-05-21T12:00:00.000Z",
          updatedAt: "2026-05-21T12:00:00.000Z",
        });
      }),
      http.put("*/listings/:id/media/order", () => {
        callLog.push("reorder");
        return HttpResponse.json({ success: true });
      }),
    );

    // Same photos as seed — no attach, no remove
    const photos: StagedPhoto[] = [
      photo({ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "k1", sortOrder: 0 }),
      photo({ photoId: "550e8400-e29b-41d4-a716-446655440002", key: "k2", sortOrder: 1 }),
    ];

    const { result } = renderHook(
      () => useSaveListingEdit(LISTING_ID, basePayload, photos, seedMedia),
      { wrapper },
    );

    await result.current.save();

    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(callLog).toEqual(["fields", "reorder"]);
    expect(Object.keys(result.current.opStates)).toEqual(["fields", "reorder"]);
  });

  it("always sends reorder when photos exist", async () => {
    let reorderCount = 0;

    server.use(
      http.patch("*/listings/:id", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: LISTING_ID,
          sellerId: "550e8400-e29b-41d4-a716-446655440003",
          status: "active",
          brandId: "550e8400-e29b-41d4-a716-446655440004",
          modelId: "550e8400-e29b-41d4-a716-446655440005",
          year: 2020,
          priceAmount: body.priceAmount ?? 15000,
          priceCurrency: body.priceCurrency ?? "USD",
          displayPriceTmt: 52500,
          description: body.description ?? "Great car",
          regionId: "550e8400-e29b-41d4-a716-446655440006",
          cityId: "550e8400-e29b-41d4-a716-446655440007",
          allowCalls: true,
          allowChat: true,
          acceptsExchange: false,
          installmentAvailable: false,
          media: seedMedia,
          viewCount: 0,
          favoriteCount: 0,
          publishedAt: "2026-05-21T12:00:00.000Z",
          soldAt: undefined,
          createdAt: "2026-05-21T12:00:00.000Z",
          updatedAt: "2026-05-21T12:00:00.000Z",
        });
      }),
      http.put("*/listings/:id/media/order", () => {
        reorderCount++;
        return HttpResponse.json({ success: true });
      }),
    );

    const photos: StagedPhoto[] = [
      photo({ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "k1", sortOrder: 0 }),
      photo({ photoId: "550e8400-e29b-41d4-a716-446655440002", key: "k2", sortOrder: 1 }),
    ];

    const { result } = renderHook(
      () => useSaveListingEdit(LISTING_ID, basePayload, photos, seedMedia),
      { wrapper },
    );

    await result.current.save();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));
    expect(reorderCount).toBe(1);

    // Save again — reorder should fire again (idempotent)
    await result.current.save();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));
    expect(reorderCount).toBe(2);
  });
});
