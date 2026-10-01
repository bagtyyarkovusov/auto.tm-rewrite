import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundException } from "@nestjs/common";

import type { Brand } from "../domain/Brand";
import type {
  BrandLogoRepository,
  LogoKeyReplacement,
} from "../domain/ports/BrandLogoRepository";
import type { BrandLogoStorage } from "../domain/ports/BrandLogoStorage";

import { RemoveBrandLogo } from "./RemoveBrandLogo";

class FakeBrands implements BrandLogoRepository {
  brands = new Map<string, Brand>();
  /** Models a concurrent activation: the key the atomic swap actually finds. */
  actualPreviousKey: string | null | undefined;
  vanishOnSwap = false;
  failNextSwap = false;

  async getBrandById(id: string): Promise<Brand | null> {
    return this.brands.get(id) ?? null;
  }

  async replaceLogoKey(id: string, logoKey: string | null): Promise<LogoKeyReplacement> {
    if (this.failNextSwap) throw new Error("db timeout");
    const brand = this.brands.get(id);
    if (!brand || this.vanishOnSwap) return { replaced: false, reason: "not-found" };
    const previousKey =
      this.actualPreviousKey === undefined ? (brand.logoKey ?? null) : this.actualPreviousKey;
    brand.logoKey = logoKey;
    return { replaced: true, previousKey };
  }
}

class FakeStorage implements BrandLogoStorage {
  deleted: string[] = [];
  deletedVersions: string[] = [];
  failDeleteVersion = false;
  async presignUpload(): Promise<{ url: string; headers: Record<string, string> }> {
    throw new Error("not used");
  }
  async get(): Promise<null> {
    return null;
  }
  async put(): Promise<void> {}
  async delete(key: string): Promise<void> {
    this.deleted.push(key);
  }
  async deleteLogoVersion(key: string): Promise<void> {
    this.deletedVersions.push(key);
    if (this.failDeleteVersion) throw new Error("storage down");
  }
  publicUrl(key: string): string {
    return key;
  }
}

class FakePrisma {
  auditLogs: Array<{ action: string; targetId: string }> = [];
  auditLog = {
    create: async ({ data }: { data: FakePrisma["auditLogs"][number] }) => {
      this.auditLogs.push(data);
    },
  };
}

describe("RemoveBrandLogo", () => {
  let brands: FakeBrands;
  let storage: FakeStorage;
  let prisma: FakePrisma;
  let useCase: RemoveBrandLogo;

  beforeEach(() => {
    brands = new FakeBrands();
    storage = new FakeStorage();
    prisma = new FakePrisma();
    brands.brands.set("b1", {
      id: "b1",
      slug: "toyota",
      nameRu: "Тойота",
      nameTk: "Toýota",
      nameEn: "Toyota",
      logoKey: "brands/toyota/v1/logo.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    useCase = new RemoveBrandLogo(
      brands,
      storage,
      prisma as unknown as ConstructorParameters<typeof RemoveBrandLogo>[2],
    );
  });

  it("clears the key, deletes the version directory, and audits", async () => {
    await useCase.execute({ brandId: "b1" }, "admin-1");

    expect(brands.brands.get("b1")!.logoKey).toBeNull();
    expect(storage.deletedVersions).toEqual(["brands/toyota/v1/logo.png"]);
    expect(storage.deleted).toEqual([]);
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "CATALOG_BRAND_LOGO_REMOVE",
      targetId: "b1",
    });
  });

  it("cleans the imported version directory the atomic swap returned", async () => {
    const imported = "brands/toyota/imp-0123456789ab-0f8fad5b-d9cb-469f-a165-70867728950e/logo.png";
    brands.actualPreviousKey = imported;

    await useCase.execute({ brandId: "b1" }, "admin-1");

    expect(storage.deletedVersions).toEqual([imported]);
    expect(prisma.auditLogs[0]).toMatchObject({
      details: { previousLogoKey: imported },
    });
  });

  it("does nothing when a concurrent removal already cleared the logo", async () => {
    brands.actualPreviousKey = null;

    await useCase.execute({ brandId: "b1" }, "admin-1");

    expect(storage.deletedVersions).toEqual([]);
    expect(prisma.auditLogs).toEqual([]);
  });

  it("keeps the removal when storage cleanup fails", async () => {
    storage.failDeleteVersion = true;

    await useCase.execute({ brandId: "b1" }, "admin-1");

    expect(brands.brands.get("b1")!.logoKey).toBeNull();
    expect(prisma.auditLogs).toHaveLength(1);
  });

  it("deletes nothing when the swap outcome is unknown", async () => {
    brands.failNextSwap = true;

    await expect(useCase.execute({ brandId: "b1" }, "admin-1")).rejects.toThrow("db timeout");

    expect(storage.deletedVersions).toEqual([]);
    expect(storage.deleted).toEqual([]);
  });

  it("throws NotFoundException when the brand disappears before the swap", async () => {
    brands.vanishOnSwap = true;

    await expect(useCase.execute({ brandId: "b1" }, "admin-1")).rejects.toThrow(NotFoundException);
    expect(storage.deletedVersions).toEqual([]);
  });

  it("does nothing when the brand has no logo", async () => {
    brands.brands.get("b1")!.logoKey = null;
    await useCase.execute({ brandId: "b1" }, "admin-1");

    expect(storage.deleted).toEqual([]);
    expect(storage.deletedVersions).toEqual([]);
    expect(prisma.auditLogs).toEqual([]);
  });

  it("throws NotFoundException for an unknown brand", async () => {
    await expect(useCase.execute({ brandId: "nope" }, "admin-1")).rejects.toThrow(
      NotFoundException,
    );
  });
});
