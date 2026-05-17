import { describe, it, expect, beforeEach } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";

import type { Brand } from "../domain/Brand";
import type { Model } from "../domain/Model";
import type { BrandRepository } from "../domain/ports/BrandRepository";
import type { ModelRepository } from "../domain/ports/ModelRepository";

import { CreateModel } from "./CreateModel";

class FakeBrandRepository implements BrandRepository {
  brands: Brand[] = [];

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
    throw new Error("not implemented");
  }
}

class FakeModelRepository implements ModelRepository {
  models: Model[] = [];
  nextId = 1;

  async listModelsByBrand(): Promise<{ items: Model[]; nextCursor?: { name: string; id: string } }> {
    return { items: this.models };
  }

  async getModelById(id: string): Promise<Model | null> {
    return this.models.find((m) => m.id === id) ?? null;
  }

  async getBySlug(): Promise<Model | null> {
    throw new Error("not implemented");
  }

  async getByBrandIdAndSlug(brandId: string, slug: string): Promise<Model | null> {
    return this.models.find((m) => m.brandId === brandId && m.slug === slug) ?? null;
  }

  async create(data: { brandId: string; slug: string; nameRu: string; nameTk: string; nameEn: string }): Promise<Model> {
    const model: Model = {
      id: `model-${this.nextId++}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.models.push(model);
    return model;
  }

  async update(): Promise<Model> {
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

function makeUseCase(
  modelRepo?: FakeModelRepository,
  brandRepo?: FakeBrandRepository,
  prisma?: FakePrisma,
) {
  return new CreateModel(
    modelRepo ?? new FakeModelRepository(),
    brandRepo ?? new FakeBrandRepository(),
    (prisma ?? new FakePrisma()) as unknown as ConstructorParameters<typeof CreateModel>[2],
  );
}

describe("CreateModel", () => {
  let modelRepo: FakeModelRepository;
  let brandRepo: FakeBrandRepository;
  let prisma: FakePrisma;

  beforeEach(() => {
    modelRepo = new FakeModelRepository();
    brandRepo = new FakeBrandRepository();
    prisma = new FakePrisma();
  });

  it("creates a model when brand exists and slug is unique", async () => {
    brandRepo.brands.push({
      id: "b1",
      slug: "toyota",
      nameRu: "Тойота",
      nameTk: "Toýota",
      nameEn: "Toyota",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const uc = makeUseCase(modelRepo, brandRepo, prisma);
    const result = await uc.execute(
      { brandId: "b1", slug: "camry", nameRu: "Камри", nameTk: "Kamri", nameEn: "Camry" },
      "admin-1",
    );

    expect(result.slug).toBe("camry");
    expect(result.brandId).toBe("b1");
    expect(modelRepo.models).toHaveLength(1);
  });

  it("throws NotFoundException when brand does not exist", async () => {
    const uc = makeUseCase(modelRepo, brandRepo, prisma);
    await expect(
      uc.execute(
        { brandId: "b1", slug: "camry", nameRu: "Камри", nameTk: "Kamri", nameEn: "Camry" },
        "admin-1",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ConflictException when slug already exists for this brand", async () => {
    brandRepo.brands.push({
      id: "b1",
      slug: "toyota",
      nameRu: "Тойота",
      nameTk: "Toýota",
      nameEn: "Toyota",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    modelRepo.models.push({
      id: "m1",
      brandId: "b1",
      slug: "camry",
      nameRu: "Камри",
      nameTk: "Kamri",
      nameEn: "Camry",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const uc = makeUseCase(modelRepo, brandRepo, prisma);
    await expect(
      uc.execute(
        { brandId: "b1", slug: "camry", nameRu: "Камри", nameTk: "Kamri", nameEn: "Camry" },
        "admin-1",
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("writes an audit log entry", async () => {
    brandRepo.brands.push({
      id: "b1",
      slug: "toyota",
      nameRu: "Тойота",
      nameTk: "Toýota",
      nameEn: "Toyota",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const uc = makeUseCase(modelRepo, brandRepo, prisma);
    const result = await uc.execute(
      { brandId: "b1", slug: "camry", nameRu: "Камри", nameTk: "Kamri", nameEn: "Camry" },
      "admin-1",
    );

    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      actorId: "admin-1",
      action: "CATALOG_MODEL_CREATE",
      targetType: "Model",
      targetId: result.id,
    });
  });
});
