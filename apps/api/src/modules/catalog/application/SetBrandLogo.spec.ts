import { beforeEach, describe, expect, it } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { Brand } from "../domain/Brand";
import type { BrandLogoRepository } from "../domain/ports/BrandLogoRepository";
import type { BrandLogoStorage } from "../domain/ports/BrandLogoStorage";
import type { LogoImageProbe } from "../domain/ports/LogoImageProbe";

import { SetBrandLogo } from "./SetBrandLogo";

class FakeBrands implements BrandLogoRepository {
  brands = new Map<string, Brand>();
  failNextSet = false;

  async getBrandById(id: string): Promise<Brand | null> {
    return this.brands.get(id) ?? null;
  }

  async setLogoKey(id: string, logoKey: string | null): Promise<Brand> {
    if (this.failNextSet) throw new Error("db down");
    const brand = this.brands.get(id);
    if (!brand) throw new Error("not found");
    brand.logoKey = logoKey;
    return brand;
  }
}

class FakeStorage implements BrandLogoStorage {
  objects = new Map<string, string>();
  failDelete = false;

  async put(key: string, _bytes: Uint8Array, contentType: string): Promise<void> {
    this.objects.set(key, contentType);
  }

  async delete(key: string): Promise<void> {
    if (this.failDelete) throw new Error("storage down");
    this.objects.delete(key);
  }

  publicUrl(key: string): string {
    return `https://media.example/catalog-assets/${key}`;
  }
}

class FakeProbe implements LogoImageProbe {
  result: { format: string; width: number; height: number } | null = {
    format: "png",
    width: 90,
    height: 90,
  };

  async probe(): Promise<{ format: string; width: number; height: number } | null> {
    return this.result;
  }
}

class FakePrisma {
  auditLogs: Array<{ action: string; targetId: string; details: unknown }> = [];
  auditLog = {
    create: async ({ data }: { data: FakePrisma["auditLogs"][number] }) => {
      this.auditLogs.push(data);
    },
  };
}

const bytes = (n = 100) => new Uint8Array(n).fill(1);

describe("SetBrandLogo", () => {
  let brands: FakeBrands;
  let storage: FakeStorage;
  let probe: FakeProbe;
  let prisma: FakePrisma;
  let useCase: SetBrandLogo;

  beforeEach(() => {
    brands = new FakeBrands();
    storage = new FakeStorage();
    probe = new FakeProbe();
    prisma = new FakePrisma();
    brands.brands.set("b1", {
      id: "b1",
      slug: "toyota",
      nameRu: "Тойота",
      nameTk: "Toýota",
      nameEn: "Toyota",
      logoKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    useCase = new SetBrandLogo(
      brands,
      storage,
      probe,
      prisma as unknown as ConstructorParameters<typeof SetBrandLogo>[3],
    );
  });

  it("stores the file under a versioned key, points the brand at it, and audits", async () => {
    const result = await useCase.execute(
      { brandId: "b1", contentType: "image/png", bytes: bytes() },
      "admin-1",
    );

    const key = brands.brands.get("b1")!.logoKey!;
    expect(key).toMatch(/^brands\/toyota\/v\d+\/logo\.png$/);
    expect(storage.objects.get(key)).toBe("image/png");
    expect(result).toEqual({ id: "b1", logoUrl: `https://media.example/catalog-assets/${key}` });
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "CATALOG_BRAND_LOGO_SET",
      targetId: "b1",
    });
  });

  it("deletes the previous object when replacing a logo", async () => {
    brands.brands.get("b1")!.logoKey = "brands/toyota/v1/logo.svg";
    storage.objects.set("brands/toyota/v1/logo.svg", "image/svg+xml");

    await useCase.execute({ brandId: "b1", contentType: "image/png", bytes: bytes() }, "admin-1");

    expect(storage.objects.has("brands/toyota/v1/logo.svg")).toBe(false);
    expect(storage.objects.size).toBe(1);
  });

  it("keeps the new logo when deleting the previous object fails", async () => {
    brands.brands.get("b1")!.logoKey = "brands/toyota/v1/logo.svg";
    storage.failDelete = true;

    await useCase.execute({ brandId: "b1", contentType: "image/png", bytes: bytes() }, "admin-1");

    expect(brands.brands.get("b1")!.logoKey).toMatch(/logo\.png$/);
  });

  it("removes the uploaded object when the brand update fails", async () => {
    brands.failNextSet = true;

    await expect(
      useCase.execute({ brandId: "b1", contentType: "image/png", bytes: bytes() }, "admin-1"),
    ).rejects.toThrow("db down");
    expect(storage.objects.size).toBe(0);
  });

  it("throws NotFoundException for an unknown brand", async () => {
    await expect(
      useCase.execute({ brandId: "nope", contentType: "image/png", bytes: bytes() }, "admin-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it.each([
    ["image/jpeg", bytes(), null, "LOGO_UNSUPPORTED_TYPE"],
    ["image/png", bytes(200 * 1024 + 1), null, "LOGO_TOO_LARGE"],
    ["image/png", bytes(0), null, "LOGO_EMPTY"],
    ["image/webp", bytes(), { format: "png", width: 90, height: 90 }, "LOGO_TYPE_MISMATCH"],
    ["image/png", bytes(), { format: "png", width: 300, height: 90 }, "LOGO_NOT_SQUARE"],
    [
      "image/svg+xml",
      new TextEncoder().encode('<svg><script>alert(1)</script></svg>'),
      { format: "svg", width: 24, height: 24 },
      "LOGO_UNSAFE_SVG",
    ],
  ] as const)("rejects %s with %s", async (contentType, input, probed, reason) => {
    if (probed) probe.result = { ...probed };
    const error = await useCase
      .execute({ brandId: "b1", contentType, bytes: input }, "admin-1")
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: "VALIDATION_FAILED",
      details: { reason },
    });
    expect(storage.objects.size).toBe(0);
    expect(brands.brands.get("b1")!.logoKey).toBeNull();
  });

  it("rejects bytes that do not decode as an image", async () => {
    probe.result = null;
    const error = await useCase
      .execute({ brandId: "b1", contentType: "image/png", bytes: bytes() }, "admin-1")
      .catch((err: unknown) => err);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      details: { reason: "LOGO_UNREADABLE" },
    });
  });
});
