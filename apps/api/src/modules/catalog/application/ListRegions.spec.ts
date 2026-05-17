import { describe, it, expect, beforeEach } from "vitest";

import type { Region } from "../domain/Region";
import type { RegionRepository } from "../domain/ports/RegionRepository";
import { ListRegions } from "./ListRegions";

function makeRegion(overrides: Partial<Region> = {}): Region {
  return {
    id: "region-1",
    slug: "ashgabat",
    nameRu: "Ашхабад",
    nameTk: "Aşgabat",
    nameEn: "Ashgabat",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeRegionRepository implements RegionRepository {
  regions: Region[] = [];

  async listRegions(_opts: { locale: "tk" | "ru" | "en" }): Promise<Region[]> {
    return this.regions;
  }

  async getRegionById(_id: string): Promise<Region | null> {
    return this.regions[0] ?? null;
  }
}

function makeUseCase(regionRepo?: FakeRegionRepository) {
  return new ListRegions(regionRepo ?? new FakeRegionRepository());
}

describe("ListRegions", () => {
  let regionRepo: FakeRegionRepository;

  beforeEach(() => {
    regionRepo = new FakeRegionRepository();
  });

  it("returns region summaries for the requested locale", async () => {
    regionRepo.regions = [makeRegion()];
    const uc = makeUseCase(regionRepo);
    const result = await uc.execute({ locale: "ru" });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Ашхабад");
    expect(item?.slug).toBe("ashgabat");
    expect(item?.id).toBe("region-1");
    expect(item?.localeFallback).toBeUndefined();
  });

  it("falls back to another locale when the requested locale is empty", async () => {
    regionRepo.regions = [
      makeRegion({ nameTk: "", nameRu: "Ашхабад", nameEn: "" }),
    ];
    const uc = makeUseCase(regionRepo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Ашхабад");
    expect(item?.localeFallback).toBe("ru");
  });

  it("falls back to en before ru before tk", async () => {
    regionRepo.regions = [
      makeRegion({ nameTk: "", nameRu: "", nameEn: "Ashgabat" }),
    ];
    const uc = makeUseCase(regionRepo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Ashgabat");
    expect(item?.localeFallback).toBe("en");
  });
});
