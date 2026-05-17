import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ConflictException } from "@nestjs/common";

import type { Brand } from "../domain/Brand";
import type { BrandRepository } from "../domain/ports/BrandRepository";

import { DeleteBrand } from "./DeleteBrand";

class FakeBrandRepository implements BrandRepository {
  brands: Brand[] = [];
  shouldThrowFkOnDelete = false;

  async listBrands(): Promise<{ items: Brand[]; nextCursor?: { name: string; id: string } }> {
    return { items: this.brands };
  }

  async getBrandById(id: string): Promise<Brand | null> {
    return this.brands.find((b) => b.id === id) ?? null;
  }

  async getBySlug(): Promise<Brand | null> {
    throw new Error("not implemented");
  }

  async create(): Promise<Brand> {
    throw new Error("not implemented");
  }

  async update(): Promise<Brand> {
    throw new Error("not implemented");
  }

  async delete(): Promise<void> {
    if (this.shouldThrowFkOnDelete) {
      throw new Error("foreign key constraint violated");
    }
    // no-op for fake
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
  return new DeleteBrand(
    brandRepo ?? new FakeBrandRepository(),
    (prisma ?? new FakePrisma()) as unknown as ConstructorParameters<typeof DeleteBrand>[1],
  );
}

describe("DeleteBrand", () => {
  let brandRepo: FakeBrandRepository;
  let prisma: FakePrisma;

  beforeEach(() => {
    brandRepo = new FakeBrandRepository();
    prisma = new FakePrisma();
  });

  it("deletes a brand when it exists", async () => {
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
    await uc.execute({ id: "b1" }, "admin-1");

    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      actorId: "admin-1",
      action: "CATALOG_BRAND_DELETE",
      targetType: "Brand",
      targetId: "b1",
    });
  });

  it("throws NotFoundException when brand does not exist", async () => {
    const uc = makeUseCase(brandRepo, prisma);
    await expect(uc.execute({ id: "b1" }, "admin-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("throws ConflictException when FK constraint prevents deletion", async () => {
    brandRepo.brands.push({
      id: "b1",
      slug: "toyota",
      nameRu: "Тойота",
      nameTk: "Toýota",
      nameEn: "Toyota",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    brandRepo.shouldThrowFkOnDelete = true;

    const uc = makeUseCase(brandRepo, prisma);
    await expect(uc.execute({ id: "b1" }, "admin-1")).rejects.toThrow(
      ConflictException,
    );
  });
});
