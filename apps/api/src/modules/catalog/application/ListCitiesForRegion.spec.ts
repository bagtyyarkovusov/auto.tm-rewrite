import { describe, it, expect, beforeEach } from "vitest";

import type { City } from "../domain/City";
import type { CityRepository } from "../domain/ports/CityRepository";
import { ListCitiesForRegion } from "./ListCitiesForRegion";

function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: "city-1",
    regionId: "region-1",
    slug: "ashgabat",
    nameRu: "Ашхабад",
    nameTk: "Aşgabat",
    nameEn: "Ashgabat",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeCityRepository implements CityRepository {
  cities: City[] = [];

  async listCitiesByRegion(opts: {
    regionId: string;
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: City[]; nextCursor?: { name: string; id: string } | undefined }> {
    const limit = opts.limit ?? 50;
    let items = this.cities.filter((c) => c.regionId === opts.regionId);
    if (opts.cursor) {
      const cursorId = opts.cursor.id;
      const idx = items.findIndex((c) => c.id === cursorId);
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

  async getCityById(_id: string): Promise<City | null> {
    return this.cities[0] ?? null;
  }
}

function makeUseCase(cityRepo?: FakeCityRepository) {
  return new ListCitiesForRegion(cityRepo ?? new FakeCityRepository());
}

describe("ListCitiesForRegion", () => {
  let cityRepo: FakeCityRepository;

  beforeEach(() => {
    cityRepo = new FakeCityRepository();
  });

  it("returns city summaries for the requested locale", async () => {
    cityRepo.cities = [makeCity()];
    const uc = makeUseCase(cityRepo);
    const result = await uc.execute({ regionId: "region-1", locale: "ru" });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Ашхабад");
    expect(item?.slug).toBe("ashgabat");
    expect(item?.regionId).toBe("region-1");
    expect(item?.localeFallback).toBeUndefined();
  });

  it("falls back to another locale when the requested locale is empty", async () => {
    cityRepo.cities = [
      makeCity({ nameTk: "", nameRu: "Ашхабад", nameEn: "" }),
    ];
    const uc = makeUseCase(cityRepo);
    const result = await uc.execute({ regionId: "region-1", locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Ашхабад");
    expect(item?.localeFallback).toBe("ru");
  });

  it("returns pagination cursor when more items exist", async () => {
    cityRepo.cities = [
      makeCity({ id: "city-1", slug: "a-city", regionId: "region-1" }),
      makeCity({ id: "city-2", slug: "b-city", regionId: "region-1" }),
    ];
    const uc = makeUseCase(cityRepo);
    const result = await uc.execute({ regionId: "region-1", locale: "ru", limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();
    expect(result.nextCursor?.id).toBe("city-1");
  });

  it("returns no nextCursor when all items fit in limit", async () => {
    cityRepo.cities = [makeCity()];
    const uc = makeUseCase(cityRepo);
    const result = await uc.execute({ regionId: "region-1", locale: "ru", limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });
});
