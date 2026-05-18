import { describe, it, expect, beforeEach } from "vitest";

import type { EngineType } from "../domain/EngineType";
import type { EngineTypeRepository } from "../domain/ports/EngineTypeRepository";
import { ListEngineTypes } from "./ListEngineTypes";

function makeEngineType(overrides: Partial<EngineType> = {}): EngineType {
  return {
    id: "et-1",
    nameRu: "Бензин",
    nameTk: "Benzin",
    nameEn: "Gasoline",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeEngineTypeRepository implements EngineTypeRepository {
  engineTypes: EngineType[] = [];

  async listEngineTypes(_opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<EngineType[]> {
    return this.engineTypes;
  }

  async getEngineTypeById(_id: string): Promise<EngineType | null> {
    return this.engineTypes[0] ?? null;
  }
}

function makeUseCase(repo?: FakeEngineTypeRepository) {
  return new ListEngineTypes(repo ?? new FakeEngineTypeRepository());
}

describe("ListEngineTypes", () => {
  let repo: FakeEngineTypeRepository;

  beforeEach(() => {
    repo = new FakeEngineTypeRepository();
  });

  it("returns engine type summaries for the requested locale", async () => {
    repo.engineTypes = [makeEngineType()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "ru" });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Бензин");
    expect(item?.id).toBe("et-1");
    expect(item?.localeFallback).toBeUndefined();
  });

  it("returns tk names when locale is tk", async () => {
    repo.engineTypes = [makeEngineType()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Benzin");
  });

  it("returns en names when locale is en", async () => {
    repo.engineTypes = [makeEngineType()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "en" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Gasoline");
  });
});
