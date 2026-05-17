import { describe, it, expect, beforeEach } from "vitest";
import type { Model } from "../domain/Model";
import type { ModelRepository } from "../domain/ports/ModelRepository";
import { ListModelsForBrand } from "./ListModelsForBrand";

function makeModel(overrides: Partial<Model> = {}): Model {
  return {
    id: "model-1",
    brandId: "brand-1",
    slug: "camry",
    nameRu: "Камри",
    nameTk: "Kamri",
    nameEn: "Camry",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeModelRepository implements ModelRepository {
  models: Model[] = [];

  async listModelsByBrand(opts: {
    brandId: string;
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: Model[]; nextCursor?: { name: string; id: string } | undefined }> {
    const limit = opts.limit ?? 50;
    let items = this.models.filter((m) => m.brandId === opts.brandId);
    if (opts.cursor) {
      const idx = items.findIndex((m) => m.id === opts.cursor!.id);
      items = items.slice(idx + 1);
    }
    const sliced = items.slice(0, limit);
    const last = sliced[sliced.length - 1];
    const nextCursor =
      items.length > limit && last
        ? { name: last.slug, id: last.id }
        : undefined;
    return { items: sliced, nextCursor };
  }

  async getModelById(_id: string): Promise<Model | null> {
    return this.models[0] ?? null;
  }
}

function makeUseCase(modelRepo?: FakeModelRepository) {
  return new ListModelsForBrand(modelRepo ?? new FakeModelRepository());
}

describe("ListModelsForBrand", () => {
  let modelRepo: FakeModelRepository;

  beforeEach(() => {
    modelRepo = new FakeModelRepository();
  });

  it("returns model summaries for the requested locale", async () => {
    modelRepo.models = [makeModel()];
    const uc = makeUseCase(modelRepo);
    const result = await uc.execute({ brandId: "brand-1", locale: "ru" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("Камри");
    expect(result.items[0]!.slug).toBe("camry");
    expect(result.items[0]!.brandId).toBe("brand-1");
    expect(result.items[0]!.localeFallback).toBeUndefined();
  });

  it("filters by brandId", async () => {
    modelRepo.models = [
      makeModel({ brandId: "brand-1", slug: "camry" }),
      makeModel({ brandId: "brand-2", slug: "corolla" }),
    ];
    const uc = makeUseCase(modelRepo);
    const result = await uc.execute({ brandId: "brand-1", locale: "ru" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.slug).toBe("camry");
  });

  it("falls back to another locale when the requested locale is empty", async () => {
    modelRepo.models = [
      makeModel({ nameTk: "", nameRu: "Камри", nameEn: "" }),
    ];
    const uc = makeUseCase(modelRepo);
    const result = await uc.execute({ brandId: "brand-1", locale: "tk" });

    expect(result.items[0]!.name).toBe("Камри");
    expect(result.items[0]!.localeFallback).toBe("ru");
  });

  it("returns pagination cursor when more items exist", async () => {
    modelRepo.models = [
      makeModel({ id: "model-1", slug: "a-model" }),
      makeModel({ id: "model-2", slug: "b-model" }),
    ];
    const uc = makeUseCase(modelRepo);
    const result = await uc.execute({
      brandId: "brand-1",
      locale: "ru",
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();
    expect(result.nextCursor).toBeDefined();
    expect(result.nextCursor!.id).toBe("model-1");
  });
});
