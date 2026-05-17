import { describe, it, expect, beforeEach } from "vitest";
import type { Generation } from "../domain/Generation";
import type { GenerationRepository } from "../domain/ports/GenerationRepository";
import { ListGenerationsForModel } from "./ListGenerationsForModel";

function makeGeneration(overrides: Partial<Generation> = {}): Generation {
  return {
    id: "gen-1",
    modelId: "model-1",
    nameRu: "XV70",
    nameTk: "XV70",
    nameEn: "XV70",
    yearStart: 2021,
    yearEnd: null,
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeGenerationRepository implements GenerationRepository {
  generations: Generation[] = [];

  async listGenerationsByModel(opts: {
    modelId: string;
    locale: "tk" | "ru" | "en";
  }): Promise<Generation[]> {
    return this.generations.filter((g) => g.modelId === opts.modelId);
  }

  async getGenerationById(_id: string): Promise<Generation | null> {
    return this.generations[0] ?? null;
  }
}

function makeUseCase(genRepo?: FakeGenerationRepository) {
  return new ListGenerationsForModel(genRepo ?? new FakeGenerationRepository());
}

describe("ListGenerationsForModel", () => {
  let genRepo: FakeGenerationRepository;

  beforeEach(() => {
    genRepo = new FakeGenerationRepository();
  });

  it("returns generation summaries for the requested locale", async () => {
    genRepo.generations = [makeGeneration()];
    const uc = makeUseCase(genRepo);
    const result = await uc.execute({ modelId: "model-1", locale: "ru" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("XV70");
    expect(result.items[0]!.modelId).toBe("model-1");
    expect(result.items[0]!.yearStart).toBe(2021);
    expect(result.items[0]!.localeFallback).toBeUndefined();
  });

  it("filters by modelId", async () => {
    genRepo.generations = [
      makeGeneration({ modelId: "model-1", nameRu: "XV70" }),
      makeGeneration({ modelId: "model-2", nameRu: "XV80" }),
    ];
    const uc = makeUseCase(genRepo);
    const result = await uc.execute({ modelId: "model-1", locale: "ru" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("XV70");
  });

  it("falls back to another locale when the requested locale is empty", async () => {
    genRepo.generations = [
      makeGeneration({ nameTk: "", nameRu: "XV70", nameEn: "" }),
    ];
    const uc = makeUseCase(genRepo);
    const result = await uc.execute({ modelId: "model-1", locale: "tk" });

    expect(result.items[0]!.name).toBe("XV70");
    expect(result.items[0]!.localeFallback).toBe("ru");
  });

  it("returns empty list when no generations exist", async () => {
    const uc = makeUseCase(genRepo);
    const result = await uc.execute({ modelId: "model-1", locale: "ru" });

    expect(result.items).toHaveLength(0);
  });
});
