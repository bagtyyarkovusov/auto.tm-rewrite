import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { City } from "../domain/City";
import type { CityRepository } from "../domain/ports/CityRepository";

@Injectable()
export class PrismaCityRepository implements CityRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCitiesByRegion(opts: {
    regionId: string;
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: City[]; nextCursor?: { name: string; id: string } | undefined }> {
    const take = (opts.limit ?? 50) + 1;
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.city.findMany({
      where: { regionId: opts.regionId },
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

  async getCityById(id: string): Promise<City | null> {
    const row = await this.prisma.city.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["city"]["findUnique"]>> &
      NonNullable<unknown>,
  ): City {
    return {
      id: row.id,
      regionId: row.regionId,
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
