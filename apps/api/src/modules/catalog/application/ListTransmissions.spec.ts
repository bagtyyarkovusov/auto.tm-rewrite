import { describe, it, expect, beforeEach } from "vitest";

import type { Transmission } from "../domain/Transmission";
import type { TransmissionRepository } from "../domain/ports/TransmissionRepository";
import { ListTransmissions } from "./ListTransmissions";

function makeTransmission(overrides: Partial<Transmission> = {}): Transmission {
  return {
    id: "tr-1",
    nameRu: "Автомат",
    nameTk: "Awtomat",
    nameEn: "Automatic",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeTransmissionRepository implements TransmissionRepository {
  transmissions: Transmission[] = [];

  async listTransmissions(_opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<Transmission[]> {
    return this.transmissions;
  }

  async getTransmissionById(_id: string): Promise<Transmission | null> {
    return this.transmissions[0] ?? null;
  }
}

function makeUseCase(repo?: FakeTransmissionRepository) {
  return new ListTransmissions(repo ?? new FakeTransmissionRepository());
}

describe("ListTransmissions", () => {
  let repo: FakeTransmissionRepository;

  beforeEach(() => {
    repo = new FakeTransmissionRepository();
  });

  it("returns transmission summaries for the requested locale", async () => {
    repo.transmissions = [makeTransmission()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "ru" });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Автомат");
    expect(item?.id).toBe("tr-1");
    expect(item?.localeFallback).toBeUndefined();
  });

  it("returns tk names when locale is tk", async () => {
    repo.transmissions = [makeTransmission()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Awtomat");
  });

  it("returns en names when locale is en", async () => {
    repo.transmissions = [makeTransmission()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "en" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Automatic");
  });
});
