import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Model } from "../domain/Model";
import type { ModelRepository } from "../domain/ports/ModelRepository";

@Injectable()
export class PrismaModelRepository implements ModelRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listModelsByBrand(opts: {
    brandId: string;
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: Model[]; nextCursor?: { name: string; id: string } | undefined }> {
    const take = (opts.limit ?? 50) + 1;
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.model.findMany({
      where: { brandId: opts.brandId },
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

  async getModelById(id: string): Promise<Model | null> {
    const row = await this.prisma.model.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async getBySlug(slug: string): Promise<Model | null> {
    const row = await this.prisma.model.findFirst({ where: { slug } });
    return row ? this.toDomain(row) : null;
  }

  async getByBrandIdAndSlug(brandId: string, slug: string): Promise<Model | null> {
    const row = await this.prisma.model.findUnique({
      where: { brandId_slug: { brandId, slug } },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(data: {
    brandId: string;
    slug: string;
    nameRu: string;
    nameTk: string;
    nameEn: string;
  }): Promise<Model> {
    const row = await this.prisma.model.create({ data });
    return this.toDomain(row);
  }

  async update(
    id: string,
    data: Partial<{
      brandId: string;
      slug: string;
      nameRu: string;
      nameTk: string;
      nameEn: string;
    }>,
  ): Promise<Model> {
    const row = await this.prisma.model.update({ where: { id }, data });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.model.delete({ where: { id } });
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["model"]["findUnique"]>> &
      NonNullable<unknown>,
  ): Model {
    return {
      id: row.id,
      brandId: row.brandId,
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
