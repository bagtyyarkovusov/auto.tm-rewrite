import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Brand } from "../domain/Brand";
import type { BrandRepository } from "../domain/ports/BrandRepository";

@Injectable()
export class PrismaBrandRepository implements BrandRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listBrands(opts: {
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: Brand[]; nextCursor?: { name: string; id: string } | undefined }> {
    const take = (opts.limit ?? 50) + 1;
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.brand.findMany({
      take,
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
      ...(opts.cursor
        ? {
            skip: 1,
            cursor: { id: opts.cursor.id },
          }
        : {}),
    });

    const hasMore = rows.length === take;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last
      ? {
          name: getName(last, opts.locale),
          id: last.id,
        }
      : undefined;

    return { items: items.map((r) => this.toDomain(r)), nextCursor };
  }

  async getBrandById(id: string): Promise<Brand | null> {
    const row = await this.prisma.brand.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    const row = await this.prisma.brand.findUnique({ where: { slug } });
    return row ? this.toDomain(row) : null;
  }

  async create(data: {
    slug: string;
    nameRu: string;
    nameTk: string;
    nameEn: string;
  }): Promise<Brand> {
    const row = await this.prisma.brand.create({ data });
    return this.toDomain(row);
  }

  async update(
    id: string,
    data: Partial<{
      slug: string;
      nameRu: string;
      nameTk: string;
      nameEn: string;
    }>,
  ): Promise<Brand> {
    const row = await this.prisma.brand.update({ where: { id }, data });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.brand.delete({ where: { id } });
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["brand"]["findUnique"]>> &
      NonNullable<unknown>,
  ): Brand {
    return {
      id: row.id,
      slug: row.slug,
      nameRu: row.nameRu,
      nameTk: row.nameTk,
      nameEn: row.nameEn,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

function nameFieldForLocale(locale: "tk" | "ru" | "en"): string {
  switch (locale) {
    case "tk":
      return "nameTk";
    case "ru":
      return "nameRu";
    case "en":
      return "nameEn";
  }
}

function getName(
  row: { nameTk: string; nameRu: string; nameEn: string },
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return row.nameTk;
    case "ru":
      return row.nameRu;
    case "en":
      return row.nameEn;
  }
}
