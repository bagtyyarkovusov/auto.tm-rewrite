import { describe, it, expect, beforeEach } from "vitest";

import type { Color } from "../domain/Color";
import type { ColorRepository } from "../domain/ports/ColorRepository";
import { ListColors } from "./ListColors";

function makeColor(overrides: Partial<Color> = {}): Color {
  return {
    id: "color-1",
    nameRu: "Черный",
    nameTk: "Gara",
    nameEn: "Black",
    hex: "#000000",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeColorRepository implements ColorRepository {
  colors: Color[] = [];

  async listColors(_opts: { locale: "tk" | "ru" | "en" }): Promise<Color[]> {
    return this.colors;
  }

  async getColorById(_id: string): Promise<Color | null> {
    return this.colors[0] ?? null;
  }
}

function makeUseCase(colorRepo?: FakeColorRepository) {
  return new ListColors(colorRepo ?? new FakeColorRepository());
}

describe("ListColors", () => {
  let colorRepo: FakeColorRepository;

  beforeEach(() => {
    colorRepo = new FakeColorRepository();
  });

  it("returns color summaries for the requested locale with hex", async () => {
    colorRepo.colors = [makeColor()];
    const uc = makeUseCase(colorRepo);
    const result = await uc.execute({ locale: "ru" });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Черный");
    expect(item?.hex).toBe("#000000");
    expect(item?.id).toBe("color-1");
    expect(item?.localeFallback).toBeUndefined();
  });

  it("returns color summary without hex when hex is null", async () => {
    colorRepo.colors = [makeColor({ hex: null })];
    const uc = makeUseCase(colorRepo);
    const result = await uc.execute({ locale: "ru" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.hex).toBeUndefined();
  });

  it("falls back to another locale when the requested locale is empty", async () => {
    colorRepo.colors = [
      makeColor({ nameTk: "", nameRu: "Черный", nameEn: "" }),
    ];
    const uc = makeUseCase(colorRepo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Черный");
    expect(item?.localeFallback).toBe("ru");
  });

  it("falls back to en before ru before tk", async () => {
    colorRepo.colors = [
      makeColor({ nameTk: "", nameRu: "", nameEn: "Black" }),
    ];
    const uc = makeUseCase(colorRepo);
    const result = await uc.execute({ locale: "tk" });

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.name).toBe("Black");
    expect(item?.localeFallback).toBe("en");
  });
});
