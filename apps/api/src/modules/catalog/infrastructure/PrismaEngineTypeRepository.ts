import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { EngineType } from "../domain/EngineType";
import type { EngineTypeRepository } from "../domain/ports/EngineTypeRepository";

@Injectable()
export class PrismaEngineTypeRepository implements EngineTypeRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listEngineTypes(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<EngineType[]> {
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.engineType.findMany({
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
    });

    return rows.map((r) => this.toDomain(r));
  }

  async getEngineTypeById(id: string): Promise<EngineType | null> {
    const row = await this.prisma.engineType.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["engineType"]["findUnique"]>> &
      NonNullable<unknown>,
  ): EngineType {
    return {
      id: row.id,
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
