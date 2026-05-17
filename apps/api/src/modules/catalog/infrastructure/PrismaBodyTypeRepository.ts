import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { BodyType } from "../domain/BodyType";
import type { BodyTypeRepository } from "../domain/ports/BodyTypeRepository";

@Injectable()
export class PrismaBodyTypeRepository implements BodyTypeRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listBodyTypes(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<BodyType[]> {
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.bodyType.findMany({
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
    });

    return rows.map((r) => this.toDomain(r));
  }

  async getBodyTypeById(id: string): Promise<BodyType | null> {
    const row = await this.prisma.bodyType.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["bodyType"]["findUnique"]>> &
      NonNullable<unknown>,
  ): BodyType {
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
