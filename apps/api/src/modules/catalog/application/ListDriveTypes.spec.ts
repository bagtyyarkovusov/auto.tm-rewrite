import { describe, it, expect, beforeEach } from "vitest";

import type { DriveType } from "../domain/DriveType";
import type { DriveTypeRepository } from "../domain/ports/DriveTypeRepository";
import { ListDriveTypes } from "./ListDriveTypes";

function makeDriveType(overrides: Partial<DriveType> = {}): DriveType {
  return {
    id: "dt-1",
    nameRu: "Передний",
    nameTk: "Öňki",
    nameEn: "FWD",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeDriveTypeRepository implements DriveTypeRepository {
  driveTypes: DriveType[] = [];

  async listDriveTypes(_opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<DriveType[]> {
    return this.driveTypes;
  }

  async getDriveTypeById(_id: string): Promise<DriveType | null> {
    return this.driveTypes[0] ?? null;
  }
}

function makeUseCase(repo?: FakeDriveTypeRepository) {
  return new ListDriveTypes(repo ?? new FakeDriveTypeRepository());
}

describe("ListDriveTypes", () => {
  let repo: FakeDriveTypeRepository;

  beforeEach(() => {
    repo = new FakeDriveTypeRepository();
  });

  it("returns drive type summaries for the requested locale", async () => {
    repo.driveTypes = [makeDriveType()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "ru" });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Передний");
    expect(item?.id).toBe("dt-1");
    expect(item?.localeFallback).toBeUndefined();
  });

  it("returns tk names when locale is tk", async () => {
    repo.driveTypes = [makeDriveType()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Öňki");
  });

  it("returns en names when locale is en", async () => {
    repo.driveTypes = [makeDriveType()];
    const uc = makeUseCase(repo);
    const result = await uc.execute({ locale: "en" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("FWD");
  });
});
