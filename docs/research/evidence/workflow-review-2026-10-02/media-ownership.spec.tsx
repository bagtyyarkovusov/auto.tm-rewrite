import { describe, it, expect, beforeEach, vi } from "vitest";


import { Listing } from "../../../../apps/api/src/modules/listings/domain/Listing";
import { ListingMedia } from "../../../../apps/api/src/modules/listings/domain/ListingMedia";
import type { ListingRepository } from "../../../../apps/api/src/modules/listings/domain/ports/ListingRepository";
import type { ListingMediaRepository } from "../../../../apps/api/src/modules/listings/domain/ports/ListingMediaRepository";
import type { MediaContentClassifierPort } from "../../../../apps/api/src/modules/listings/domain/ports/MediaContentClassifierPort";
import type { ImageVariantGenerator } from "../../../../apps/api/src/modules/listings/domain/ports/ImageVariantGenerator";

import { AttachMedia } from "../../../../apps/api/src/modules/listings/application/AttachMedia";

class FakeListingRepository implements ListingRepository {
  listings: Listing[] = [];

  async save(listing: Listing): Promise<Listing> {
    this.listings.push(listing);
    return listing;
  }

  async findById(id: string): Promise<Listing | null> {
    return this.listings.find((l) => l.id === id) ?? null;
  }

  async findBySellerId(
    _sellerId: string,
    _opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Listing[]; nextCursor?: { timestamp: string; id: string } }> {
    return { items: this.listings };
  }

  async update(listing: Listing): Promise<Listing> {
    const idx = this.listings.findIndex((l) => l.id === listing.id);
    if (idx >= 0) this.listings[idx] = listing;
    return listing;
  }

  async recomputePriceTmt(): Promise<number> {
    return 0;
  }

  async softDelete(_id: string, _at: Date): Promise<void> {
    const existing = this.listings.find((l) => l.id === _id);
    if (existing) {
      this.listings = this.listings.map((l) => (l.id === _id ? l.softDelete(_at) : l));
    }
  }
}

class FakeListingMediaRepository implements ListingMediaRepository {
  media: ListingMedia[] = [];

  async save(m: ListingMedia): Promise<ListingMedia> {
    this.media.push(m);
    return m;
  }

  async findById(id: string): Promise<ListingMedia | null> {
    return this.media.find((m) => m.id === id) ?? null;
  }

  async findByListingId(listingId: string): Promise<ListingMedia[]> {
    return this.media.filter((m) => m.listingId === listingId);
  }

  async delete(id: string): Promise<void> {
    this.media = this.media.filter((m) => m.id !== id);
  }

  async updateSortOrder(
    _listingId: string,
    orders: { mediaId: string; sortOrder: number }[],
  ): Promise<void> {
    for (const o of orders) {
      const idx = this.media.findIndex((m) => m.id === o.mediaId);
      if (idx >= 0) {
        const old = this.media[idx]!;
        this.media[idx] = ListingMedia.create({
          id: old.id,
          listingId: old.listingId,
          kind: old.kind,
          key: old.key,
          sortOrder: o.sortOrder,
          ...(old.width !== undefined ? { width: old.width } : {}),
          ...(old.height !== undefined ? { height: old.height } : {}),
          ...(old.durationMs !== undefined ? { durationMs: old.durationMs } : {}),
          ...(old.posterKey !== undefined ? { posterKey: old.posterKey } : {}),
          createdAt: old.createdAt,
        });
      }
    }
  }
}

class FakeContentClassifier implements MediaContentClassifierPort {
  result: { isAcceptable: boolean; confidence: number; reason?: "nsfw" | "not-a-car" | "duplicate" | "unknown" } = {
    isAcceptable: true,
    confidence: 1.0,
  };

  async classify(_key: string) {
    return this.result;
  }
}

class FakeVariantGenerator implements ImageVariantGenerator {
  called = false;

  async generate(originalKey: string) {
    this.called = true;
    return {
      variants: {
        thumbnail: `${originalKey}/thumbnail.jpg`,
        list: `${originalKey}/list.jpg`,
        detail: `${originalKey}/detail.jpg`,
        fullscreen: `${originalKey}/fullscreen.jpg`,
      },
    };
  }
}

function seedActiveListing(repo: FakeListingRepository) {
  const listing = Listing.create({
    id: "listing-1",
    publicNumber: 1,
    sellerId: "user-1",
    status: "active",
    brandId: "brand-1",
    modelId: "model-1",
    cityId: "city-1",
    priceAmount: 100000,
    priceCurrency: "TMT",
    allowCalls: true,
    allowChat: true,
    publishedAt: new Date("2026-05-01T00:00:00Z"),
  });
  repo.listings.push(listing);
  return listing;
}

function makeUseCase(
  repo?: FakeListingRepository,
  mediaRepo?: FakeListingMediaRepository,
  classifier?: FakeContentClassifier,
  variantGen?: FakeVariantGenerator,
) {
  return new AttachMedia(
    repo ?? new FakeListingRepository(),
    mediaRepo ?? new FakeListingMediaRepository(),
    classifier ?? new FakeContentClassifier(),
    variantGen ?? new FakeVariantGenerator(),
  );
}


import { RemoveMedia } from "../../../../apps/api/src/modules/listings/application/RemoveMedia";
describe("listing storage ownership boundary", () => {
 it("does not schedule removal of another listing's original and variants", async () => {
  const repo = new FakeListingRepository(); seedActiveListing(repo);
  const mediaRepo = new FakeListingMediaRepository();
  const victimKey = "pending/victim-upload/original.jpg";
  mediaRepo.media.push(ListingMedia.create({ id: "victim-media", listingId: "victim-listing", kind: "image", key: victimKey, sortOrder: 0 }));
  const attach = makeUseCase(repo, mediaRepo, new FakeContentClassifier(), new FakeVariantGenerator());
  const attached = await attach.execute({ listingId: "listing-1", userId: "user-1", key: victimKey, kind: "image", sortOrder: 0 });
  const storage = { deleteObject: vi.fn(async () => undefined), presignUpload: vi.fn(), resolvePublicUrl: vi.fn() };
  await new RemoveMedia(repo, mediaRepo, storage).execute({ listingId: "listing-1", userId: "user-1", mediaId: attached.media.id });
  expect(storage.deleteObject.mock.calls.some(([key]) => key.startsWith("pending/victim-upload/"))).toBe(false);
 });
});
