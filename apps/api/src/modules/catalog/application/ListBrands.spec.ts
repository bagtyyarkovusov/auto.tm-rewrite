import { describe, it, expect, beforeEach } from "vitest";
import type { Brand } from "../domain/Brand";
import type { BrandRepository } from "../domain/ports/BrandRepository";
import { ListBrands } from "./ListBrands";

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: "brand-1",
    slug: "toyota",
    nameRu: "Тойота",
    nameTk: "Toýota",
    nameEn: "Toyota",
    createdAt: new Date("2026-05-14T12:00:00Z"),
    updatedAt: new Date("2026-05-14T12:00:00Z"),
    ...overrides,
  };
}

class FakeBrandRepository implements BrandRepository {
  brands: Brand[] = [];

  async listBrands(opts: {
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: Brand[]; nextCursor?: { name: string; id: string } | undefined }> {
    const limit = opts.limit ?? 50;
    let items = this.brands;
    if (opts.cursor) {
      const idx = items.findIndex((b) => b.id === opts.cursor!.id);
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

  async getBrandById(_id: string): Promise<Brand | null> {
    return this.brands[0] ?? null;
  }

  async getBySlug(_slug: string): Promise<Brand | null> {
    return this.brands.find((b) => b.slug === _slug) ?? null;
  }

  async create(data: { slug: string; nameRu: string; nameTk: string; nameEn: string }): Promise<Brand> {
    const brand: Brand = {
      id: `brand-${this.brands.length + 1}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.brands.push(brand);
    return brand;
  }

  async update(): Promise<Brand> {
    throw new Error("not implemented");
  }

  async delete(): Promise<void> {
    throw new Error("not implemented");
  }
}

function makeUseCase(brandRepo?: FakeBrandRepository) {
  return new ListBrands(brandRepo ?? new FakeBrandRepository());
}

describe("ListBrands", () => {
  let brandRepo: FakeBrandRepository;

  beforeEach(() => {
    brandRepo = new FakeBrandRepository();
  });

  it("returns brand summaries for the requested locale", async () => {
    brandRepo.brands = [makeBrand()];
    const uc = makeUseCase(brandRepo);
    const result = await uc.execute({ locale: "ru" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("Тойота");
    expect(result.items[0]!.slug).toBe("toyota");
    expect(result.items[0]!.id).toBe("brand-1");
    expect(result.items[0]!.localeFallback).toBeUndefined();
  });

  it("falls back to another locale when the requested locale is empty", async () => {
    brandRepo.brands = [
      makeBrand({ nameTk: "", nameRu: "Тойота", nameEn: "" }),
    ];
    const uc = makeUseCase(brandRepo);
    const result = await uc.execute({ locale: "tk" });

    expect(result.items[0]!.name).toBe("Тойота");
    expect(result.items[0]!.localeFallback).toBe("ru");
  });

  it("falls back to en before ru before tk", async () => {
    brandRepo.brands = [
      makeBrand({ nameTk: "", nameRu: "", nameEn: "Toyota" }),
    ];
    const uc = makeUseCase(brandRepo);
    const result = await uc.execute({ locale: "tk" });

    expect(result.items[0]!.name).toBe("Toyota");
    expect(result.items[0]!.localeFallback).toBe("en");
  });

  it("returns pagination cursor when more items exist", async () => {
    brandRepo.brands = [
      makeBrand({ id: "brand-1", slug: "a-brand" }),
      makeBrand({ id: "brand-2", slug: "b-brand" }),
    ];
    const uc = makeUseCase(brandRepo);
    const result = await uc.execute({ locale: "ru", limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();
    expect(result.nextCursor).toBeDefined();
    expect(result.nextCursor!.id).toBe("brand-1");
  });

  it("returns no nextCursor when all items fit in limit", async () => {
    brandRepo.brands = [makeBrand()];
    const uc = makeUseCase(brandRepo);
    const result = await uc.execute({ locale: "ru", limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });
});
