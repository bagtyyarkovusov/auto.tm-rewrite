import { describe, it, expect, beforeEach } from "vitest";
import { ConflictException } from "@nestjs/common";

import type { Brand } from "../domain/Brand";
import type { BrandRepository } from "../domain/ports/BrandRepository";

import { CreateBrand } from "./CreateBrand";

class FakeBrandRepository implements BrandRepository {
  brands: Brand[] = [];
  nextId = 1;

  async listBrands(): Promise<{ items: Brand[]; nextCursor?: { name: string; id: string } }> {
    return { items: this.brands };
  }

  async getBrandById(id: string): Promise<Brand | null> {
    return this.brands.find((b) => b.id === id) ?? null;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    return this.brands.find((b) => b.slug === slug) ?? null;
  }

  async create(data: { slug: string; nameRu: string; nameTk: string; nameEn: string }): Promise<Brand> {
    const brand: Brand = {
      id: `brand-${this.nextId++}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.brands.push(brand);
    return brand;
  }

  async update(): Promise<Brand> {
    throw new Error("not implemented");
  }

  async delete(): Promise<void> {
    throw new Error("not implemented");
  }
}

class FakePrisma {
  auditLogs: Array<{
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    details: unknown;
  }> = [];

  auditLog = {
    create: async ({ data }: { data: unknown }) => {
      this.auditLogs.push(data as FakePrisma["auditLogs"][number]);
    },
  };
}

function makeUseCase(brandRepo?: FakeBrandRepository, prisma?: FakePrisma) {
  return new CreateBrand(
    brandRepo ?? new FakeBrandRepository(),
    (prisma ?? new FakePrisma()) as unknown as ConstructorParameters<typeof CreateBrand>[1],
  );
}

describe("CreateBrand", () => {
  let brandRepo: FakeBrandRepository;
  let prisma: FakePrisma;

  beforeEach(() => {
    brandRepo = new FakeBrandRepository();
    prisma = new FakePrisma();
  });

  it("creates a brand when slug is unique", async () => {
    const uc = makeUseCase(brandRepo, prisma);
    const result = await uc.execute(
      { slug: "toyota", nameRu: "Тойота", nameTk: "Toýota", nameEn: "Toyota" },
      "admin-1",
    );

    expect(result.slug).toBe("toyota");
    expect(result.nameRu).toBe("Тойота");
    expect(brandRepo.brands).toHaveLength(1);
  });

  it("throws ConflictException when slug already exists", async () => {
    brandRepo.brands.push({
      id: "b1",
      slug: "toyota",
      nameRu: "Тойота",
      nameTk: "Toýota",
      nameEn: "Toyota",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const uc = makeUseCase(brandRepo, prisma);
    await expect(
      uc.execute(
        { slug: "toyota", nameRu: "Тойота", nameTk: "Toýota", nameEn: "Toyota" },
        "admin-1",
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("writes an audit log entry", async () => {
    const uc = makeUseCase(brandRepo, prisma);
    const result = await uc.execute(
      { slug: "toyota", nameRu: "Тойота", nameTk: "Toýota", nameEn: "Toyota" },
      "admin-1",
    );

    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      actorId: "admin-1",
      action: "CATALOG_BRAND_CREATE",
      targetType: "Brand",
      targetId: result.id,
    });
  });
});
