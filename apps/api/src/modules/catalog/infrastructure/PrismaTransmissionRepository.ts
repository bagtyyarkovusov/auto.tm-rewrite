import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Transmission } from "../domain/Transmission";
import type { TransmissionRepository } from "../domain/ports/TransmissionRepository";

@Injectable()
export class PrismaTransmissionRepository implements TransmissionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listTransmissions(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<Transmission[]> {
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.transmission.findMany({
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
    });

    return rows.map((r) => this.toDomain(r));
  }

  async getTransmissionById(id: string): Promise<Transmission | null> {
    const row = await this.prisma.transmission.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["transmission"]["findUnique"]>> &
      NonNullable<unknown>,
  ): Transmission {
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
