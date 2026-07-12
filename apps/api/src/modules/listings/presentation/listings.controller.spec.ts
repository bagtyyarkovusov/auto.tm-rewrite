import { BadRequestException } from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { ListingsController } from "./listings.controller";
import type { IdentityCheckPort } from "../../identity/domain/ports/IdentityCheckPort";
import type { CountListings } from "../application/CountListings";
import type { CountListingModels } from "../application/CountListingModels";
import type { ListFeed } from "../application/ListFeed";
import type { GetListingDetail } from "../application/GetListingDetail";
import type { PublishListing } from "../application/PublishListing";
import type { MarkSold } from "../application/MarkSold";
import type { ArchiveListing } from "../application/ArchiveListing";
import type { RepublishListing } from "../application/RepublishListing";
import type { DeleteListing } from "../application/DeleteListing";
import type { EditListing } from "../application/EditListing";
import type { AttachMedia } from "../application/AttachMedia";
import type { RemoveMedia } from "../application/RemoveMedia";
import type { ReorderMedia } from "../application/ReorderMedia";

function buildController(overrides: {
  countListings?: CountListings;
  countListingModels?: CountListingModels;
  listFeed?: ListFeed;
} = {}) {
  const identityCheck: IdentityCheckPort = {
    isSuspended: vi.fn().mockResolvedValue(false),
    isAdmin: vi.fn().mockResolvedValue(false),
    isInDealership: vi.fn().mockResolvedValue(false),
  };

  return new ListingsController(
    {} as PublishListing,
    {} as MarkSold,
    {} as ArchiveListing,
    {} as RepublishListing,
    {} as DeleteListing,
    {} as EditListing,
    {} as AttachMedia,
    {} as RemoveMedia,
    {} as ReorderMedia,
    {} as GetListingDetail,
    overrides.listFeed ?? ({ execute: vi.fn() } as unknown as ListFeed),
    overrides.countListings ??
      ({ execute: vi.fn().mockResolvedValue({ totalMatching: 0 }) } as unknown as CountListings),
    overrides.countListingModels ??
      ({ execute: vi.fn().mockResolvedValue({ items: [] }) } as unknown as CountListingModels),
    identityCheck,
  );
}

describe("ListingsController filter validation", () => {
  it("accepts modelIds with brandId", async () => {
    const countListings = {
      execute: vi.fn().mockResolvedValue({ totalMatching: 7 }),
    } as unknown as CountListings;
    const controller = buildController({ countListings });

    const result = await controller.countListings({
      brandId: "550e8400-e29b-41d4-a716-446655440000",
      modelIds: [
        "550e8400-e29b-41d4-a716-446655440001",
        "550e8400-e29b-41d4-a716-446655440002",
      ],
    });

    expect(result.totalMatching).toBe(7);
    expect(countListings.execute).toHaveBeenCalledWith({
      filters: {
        brandId: "550e8400-e29b-41d4-a716-446655440000",
        modelIds: [
          "550e8400-e29b-41d4-a716-446655440001",
          "550e8400-e29b-41d4-a716-446655440002",
        ],
      },
    });
  });

  it("rejects modelIds without brandId", async () => {
    const controller = buildController();

    await expect(
      controller.countListings({
        modelIds: ["550e8400-e29b-41d4-a716-446655440001"],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects both modelId and modelIds", async () => {
    const controller = buildController();

    await expect(
      controller.countListings({
        brandId: "550e8400-e29b-41d4-a716-446655440000",
        modelId: "550e8400-e29b-41d4-a716-446655440001",
        modelIds: ["550e8400-e29b-41d4-a716-446655440002"],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("forwards modelIds to the feed use-case", async () => {
    const listFeed = {
      execute: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    } as unknown as ListFeed;
    const controller = buildController({ listFeed });

    await controller.listFeed({
      brandId: "550e8400-e29b-41d4-a716-446655440000",
      modelIds: ["550e8400-e29b-41d4-a716-446655440001"],
    });

    expect(listFeed.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          brandId: "550e8400-e29b-41d4-a716-446655440000",
          modelIds: ["550e8400-e29b-41d4-a716-446655440001"],
        },
      }),
    );
  });
});

describe("ListingsController filter-options/models", () => {
  it("calls CountListingModels with brandId and scalar filters", async () => {
    const countListingModels = {
      execute: vi.fn().mockResolvedValue({ items: [{ modelId: "m1", totalMatching: 3 }] }),
    } as unknown as CountListingModels;
    const controller = buildController({ countListingModels });

    const result = await controller.countModels({
      brandId: "550e8400-e29b-41d4-a716-446655440000",
      cityId: "550e8400-e29b-41d4-a716-446655440010",
      priceMin: "50000",
    });

    expect(result).toEqual({ items: [{ modelId: "m1", totalMatching: 3 }] });
    expect(countListingModels.execute).toHaveBeenCalledWith({
      brandId: "550e8400-e29b-41d4-a716-446655440000",
      filters: {
        brandId: "550e8400-e29b-41d4-a716-446655440000",
        cityId: "550e8400-e29b-41d4-a716-446655440010",
        priceMin: 50000,
      },
    });
  });

  it("rejects modelId in model-count query", async () => {
    const controller = buildController();

    await expect(
      controller.countModels({
        brandId: "550e8400-e29b-41d4-a716-446655440000",
        modelId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
