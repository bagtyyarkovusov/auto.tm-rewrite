import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundException } from "@nestjs/common";

import type { Brand } from "../domain/Brand";
import type { BrandLogoRepository } from "../domain/ports/BrandLogoRepository";
import type { BrandLogoStorage } from "../domain/ports/BrandLogoStorage";

import { RemoveBrandLogo } from "./RemoveBrandLogo";

class FakeBrands implements BrandLogoRepository {
  brands = new Map<string, Brand>();

  async getBrandById(id: string): Promise<Brand | null> {
    return this.brands.get(id) ?? null;
  }

  async setLogoKey(id: string, logoKey: string | null): Promise<Brand> {
    const brand = this.brands.get(id)!;
    brand.logoKey = logoKey;
    return brand;
  }
}

class FakeStorage implements BrandLogoStorage {
  deleted: string[] = [];
  async put(): Promise<void> {}
  async delete(key: string): Promise<void> {
    this.deleted.push(key);
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

  it("clears the key, deletes the object, and audits", async () => {
    await useCase.execute({ brandId: "b1" }, "admin-1");

    expect(brands.brands.get("b1")!.logoKey).toBeNull();
    expect(storage.deleted).toEqual(["brands/toyota/v1/logo.png"]);
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "CATALOG_BRAND_LOGO_REMOVE",
      targetId: "b1",
    });
  });

  it("does nothing when the brand has no logo", async () => {
    brands.brands.get("b1")!.logoKey = null;
    await useCase.execute({ brandId: "b1" }, "admin-1");

    expect(storage.deleted).toEqual([]);
    expect(prisma.auditLogs).toEqual([]);
  });

  it("throws NotFoundException for an unknown brand", async () => {
    await expect(useCase.execute({ brandId: "nope" }, "admin-1")).rejects.toThrow(
      NotFoundException,
    );
  });
});
