import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { Generation } from "../domain/Generation";
import type { GenerationRepository } from "../domain/ports/GenerationRepository";

@Injectable()
export class PrismaGenerationRepository implements GenerationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listGenerationsByModel(opts: {
    modelId: string;
    locale: "tk" | "ru" | "en";
  }): Promise<Generation[]> {
    const nameField = nameFieldForLocale(opts.locale);

    const rows = await this.prisma.generation.findMany({
      where: { modelId: opts.modelId },
      orderBy: [{ [nameField]: "asc" }, { id: "asc" }],
    });

    return rows.map((r) => this.toDomain(r));
  }

  async getGenerationById(id: string): Promise<Generation | null> {
    const row = await this.prisma.generation.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["generation"]["findUnique"]>> &
      NonNullable<unknown>,
  ): Generation {
    return {
      id: row.id,
      modelId: row.modelId,
      nameRu: row.nameRu,
      nameTk: row.nameTk,
      nameEn: row.nameEn,
      yearStart: row.yearStart,
      yearEnd: row.yearEnd,
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
