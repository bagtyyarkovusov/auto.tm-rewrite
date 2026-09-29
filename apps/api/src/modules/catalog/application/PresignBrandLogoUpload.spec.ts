import { describe, expect, it } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { Brand } from "../domain/Brand";
import type { BrandLogoRepository } from "../domain/ports/BrandLogoRepository";
import type { BrandLogoStorage } from "../domain/ports/BrandLogoStorage";

import { PresignBrandLogoUpload } from "./PresignBrandLogoUpload";

const toyota: Brand = {
  id: "b1",
  slug: "toyota",
  nameRu: "Тойота",
  nameTk: "Toýota",
  nameEn: "Toyota",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const brands: BrandLogoRepository = {
  getBrandById: async (id) => (id === "b1" ? toyota : null),
  setLogoKey: async () => toyota,
};

class FakeStorage implements BrandLogoStorage {
  presigned: Array<{ key: string; contentType: string; expirySeconds: number }> = [];
  async presignUpload(key: string, contentType: string, expirySeconds: number) {
    this.presigned.push({ key, contentType, expirySeconds });
    return { url: `https://media.example/catalog-assets/${key}?sig`, headers: { "Content-Type": contentType } };
  }
  async get(): Promise<null> {
    return null;
  }
  async put(): Promise<void> {}
  async delete(): Promise<void> {}
  publicUrl(key: string): string {
    return key;
  }
}

describe("PresignBrandLogoUpload", () => {
  it("presigns a PUT into the brand's pending area", async () => {
    const storage = new FakeStorage();
    const result = await new PresignBrandLogoUpload(brands, storage).execute({
      brandId: "b1",
      contentType: "image/svg+xml",
      sizeBytes: 1200,
    });

    expect(result.key).toMatch(/^pending\/brands\/toyota\/[0-9a-f-]{36}$/);
    expect(result.expiresIn).toBe(600);
    expect(result.headers).toEqual({ "Content-Type": "image/svg+xml" });
    expect(storage.presigned[0]).toMatchObject({ key: result.key, contentType: "image/svg+xml" });
  });

  it.each([
    ["image/gif", 10, "LOGO_UNSUPPORTED_TYPE"],
    ["image/png", 200 * 1024 + 1, "LOGO_TOO_LARGE"],
    ["image/png", 0, "LOGO_EMPTY"],
  ])("rejects %s of %i bytes with %s", async (contentType, sizeBytes, reason) => {
    const storage = new FakeStorage();
    const error = await new PresignBrandLogoUpload(brands, storage)
      .execute({ brandId: "b1", contentType, sizeBytes })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({ details: { reason } });
    expect(storage.presigned).toEqual([]);
  });

  it("throws NotFoundException for an unknown brand", async () => {
    await expect(
      new PresignBrandLogoUpload(brands, new FakeStorage()).execute({
        brandId: "nope",
        contentType: "image/png",
        sizeBytes: 10,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
