import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ConflictException } from "@nestjs/common";

import type { Model } from "../domain/Model";
import type { ModelRepository } from "../domain/ports/ModelRepository";

import { DeleteModel } from "./DeleteModel";

class FakeModelRepository implements ModelRepository {
  models: Model[] = [];
  shouldThrowFkOnDelete = false;

  async listModelsByBrand(): Promise<{ items: Model[]; nextCursor?: { name: string; id: string } }> {
    return { items: this.models };
  }

  async getModelById(id: string): Promise<Model | null> {
    return this.models.find((m) => m.id === id) ?? null;
  }

  async getBySlug(): Promise<Model | null> {
    throw new Error("not implemented");
  }

  async getByBrandIdAndSlug(): Promise<Model | null> {
    throw new Error("not implemented");
  }

  async create(): Promise<Model> {
    throw new Error("not implemented");
  }

  async update(): Promise<Model> {
    throw new Error("not implemented");
  }

  async delete(): Promise<void> {
    if (this.shouldThrowFkOnDelete) {
      throw new Error("foreign key constraint violated");
    }
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

function makeUseCase(modelRepo?: FakeModelRepository, prisma?: FakePrisma) {
  return new DeleteModel(
    modelRepo ?? new FakeModelRepository(),
    (prisma ?? new FakePrisma()) as unknown as ConstructorParameters<typeof DeleteModel>[1],
  );
}

describe("DeleteModel", () => {
  let modelRepo: FakeModelRepository;
  let prisma: FakePrisma;

  beforeEach(() => {
    modelRepo = new FakeModelRepository();
    prisma = new FakePrisma();
  });

  it("deletes a model when it exists", async () => {
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

    const uc = makeUseCase(modelRepo, prisma);
    await uc.execute({ id: "m1" }, "admin-1");

    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      actorId: "admin-1",
      action: "CATALOG_MODEL_DELETE",
      targetType: "Model",
      targetId: "m1",
    });
  });

  it("throws NotFoundException when model does not exist", async () => {
    const uc = makeUseCase(modelRepo, prisma);
    await expect(uc.execute({ id: "m1" }, "admin-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("throws ConflictException when FK constraint prevents deletion", async () => {
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
    modelRepo.shouldThrowFkOnDelete = true;

    const uc = makeUseCase(modelRepo, prisma);
    await expect(uc.execute({ id: "m1" }, "admin-1")).rejects.toThrow(
      ConflictException,
    );
  });
});
