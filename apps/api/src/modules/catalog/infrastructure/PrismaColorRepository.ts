import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Color } from "../domain/Color";
import type { ColorRepository } from "../domain/ports/ColorRepository";

@Injectable()
export class PrismaColorRepository implements ColorRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listColors(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<Color[]> {
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.color.findMany({
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
    });

    return rows.map((r) => this.toDomain(r));
  }

  async getColorById(id: string): Promise<Color | null> {
    const row = await this.prisma.color.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["color"]["findUnique"]>> &
      NonNullable<unknown>,
  ): Color {
    return {
      id: row.id,
      nameRu: row.nameRu,
      nameTk: row.nameTk,
      nameEn: row.nameEn,
      hex: row.hex,
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
