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

describe("Listing adoption cannot take a profile or retired upload (#721)", () => {
  it.each([
    { label: "profile photo", avatar: { id: "user-1" }, retiredAt: null, code: "UPLOAD_ALREADY_ATTACHED" },
    { label: "retired upload", avatar: null, retiredAt: new Date("2026-10-07T00:00:00Z"), code: "UPLOAD_NOT_AVAILABLE" },
  ])("refuses a $label without creating Listing media", async ({ avatar, retiredAt, code }) => {
    const key = "pending/21b0b4e0-4d4a-4d2c-8bd6-705555cb7585/original.jpg";
    const upload = { id: "upload-1", key, userId: "user-1", media: null, avatar, retiredAt };
    const rows: unknown[] = [];
    const database = {
      mediaUpload: {
        findUnique: async () => upload,
        findMany: async () => [upload],
      },
      user: {
        findFirst: async () => avatar,
        count: async () => avatar === null ? 0 : 1,
      },
      listingMedia: {
        findUnique: async () => null,
        count: async () => 0,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          rows.push(data);
          return {
            ...data, width: null, height: null, durationMs: null, posterKey: null,
            createdAt: new Date("2026-10-07T00:00:00Z"),
          };
        },
      },
      $queryRaw: async () => [upload],
      $executeRaw: async () => 0,
    };
    const prisma = {
      ...database,
      $transaction: async <T>(run: (tx: typeof database) => Promise<T>) => run(database),
    };
    const repository = new PrismaListingMediaRepository(
      prisma as unknown as ConstructorParameters<typeof PrismaListingMediaRepository>[0],
    );
    const media = ListingMedia.create({
      id: "media-1", listingId: "listing-1", kind: "image", key,
      uploadId: "upload-1", sortOrder: 0,
    });

    await expect(repository.save(media)).rejects.toMatchObject({ code });
    expect(rows).toEqual([]);
  });
});
