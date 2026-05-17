import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Region } from "../domain/Region";
import type { RegionRepository } from "../domain/ports/RegionRepository";

@Injectable()
export class PrismaRegionRepository implements RegionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listRegions(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<Region[]> {
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.region.findMany({
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
    });

    return rows.map((r) => this.toDomain(r));
  }

  async getRegionById(id: string): Promise<Region | null> {
    const row = await this.prisma.region.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["region"]["findUnique"]>> &
      NonNullable<unknown>,
  ): Region {
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
