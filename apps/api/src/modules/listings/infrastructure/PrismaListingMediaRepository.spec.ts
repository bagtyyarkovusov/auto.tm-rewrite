import { describe, it, expect, vi } from "vitest";

import { ListingMedia } from "../domain/ListingMedia";
import { PrismaListingMediaRepository } from "./PrismaListingMediaRepository";

describe("PrismaListingMediaRepository constraint errors", () => {
  it.each([true, false])("maps a foreign-key failure only when the upload is missing: %s", async (missing) => {
    const failure = Object.assign(new Error("Foreign key constraint failed"), { code: "P2003" });
    const prisma = {
      listingMedia: { create: vi.fn().mockRejectedValue(failure) },
      mediaUpload: { findUnique: vi.fn().mockResolvedValue(missing ? null : { id: "upload-1" }) },
    };
    const repository = new PrismaListingMediaRepository(
      prisma as unknown as ConstructorParameters<typeof PrismaListingMediaRepository>[0],
    );
    const media = ListingMedia.create({
      id: "media-1", listingId: "listing-1", kind: "image",
      key: "pending/upload-1/original.jpg", uploadId: "upload-1", sortOrder: 0,
    });

    const error = await repository.save(media).catch((err: unknown) => err);

    if (missing) expect(error).toMatchObject({ code: "UPLOAD_NOT_AVAILABLE" });
    else expect(error).toBe(failure);
  });
});
