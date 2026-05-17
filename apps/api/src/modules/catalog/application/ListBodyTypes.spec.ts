import { describe, it, expect, beforeEach } from "vitest";

import type { BodyType } from "../domain/BodyType";
import type { BodyTypeRepository } from "../domain/ports/BodyTypeRepository";
import { ListBodyTypes } from "./ListBodyTypes";

function makeBodyType(overrides: Partial<BodyType> = {}): BodyType {
  return {
    id: "bt-1",
    nameRu: "Седан",
    nameTk: "Sedan",
    nameEn: "Sedan",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeBodyTypeRepository implements BodyTypeRepository {
  bodyTypes: BodyType[] = [];

  async listBodyTypes(_opts: { locale: "tk" | "ru" | "en" }): Promise<BodyType[]> {
    return this.bodyTypes;
  }

  async getBodyTypeById(_id: string): Promise<BodyType | null> {
    return this.bodyTypes[0] ?? null;
  }
}

function makeUseCase(bodyTypeRepo?: FakeBodyTypeRepository) {
  return new ListBodyTypes(bodyTypeRepo ?? new FakeBodyTypeRepository());
}

describe("ListBodyTypes", () => {
  let bodyTypeRepo: FakeBodyTypeRepository;

  beforeEach(() => {
    bodyTypeRepo = new FakeBodyTypeRepository();
  });

  it("returns body type summaries for the requested locale", async () => {
    bodyTypeRepo.bodyTypes = [makeBodyType()];
    const uc = makeUseCase(bodyTypeRepo);
    const result = await uc.execute({ locale: "ru" });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Седан");
    expect(item?.id).toBe("bt-1");
    expect(item?.localeFallback).toBeUndefined();
  });

  it("falls back to another locale when the requested locale is empty", async () => {
    bodyTypeRepo.bodyTypes = [
      makeBodyType({ nameTk: "", nameRu: "Седан", nameEn: "" }),
    ];
    const uc = makeUseCase(bodyTypeRepo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Седан");
    expect(item?.localeFallback).toBe("ru");
  });

  it("falls back to en before ru before tk", async () => {
    bodyTypeRepo.bodyTypes = [
      makeBodyType({ nameTk: "", nameRu: "", nameEn: "Sedan" }),
    ];
    const uc = makeUseCase(bodyTypeRepo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Sedan");
    expect(item?.localeFallback).toBe("en");
  });
});
