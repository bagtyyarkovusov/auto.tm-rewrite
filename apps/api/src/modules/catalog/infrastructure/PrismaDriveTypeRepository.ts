import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { DriveType } from "../domain/DriveType";
import type { DriveTypeRepository } from "../domain/ports/DriveTypeRepository";

@Injectable()
export class PrismaDriveTypeRepository implements DriveTypeRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listDriveTypes(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<DriveType[]> {
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.driveType.findMany({
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
    });

    return rows.map((r) => this.toDomain(r));
  }

  async getDriveTypeById(id: string): Promise<DriveType | null> {
    const row = await this.prisma.driveType.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["driveType"]["findUnique"]>> &
      NonNullable<unknown>,
  ): DriveType {
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
